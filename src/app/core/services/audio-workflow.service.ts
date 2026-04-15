import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, forkJoin, from, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEntity } from '../models/api.models';
import { ApiHttpService } from './api-http.service';
import { ResourceApiService } from './resource-api.service';
import { TokenStorageService } from './token-storage.service';

export interface AudioEntity extends ApiEntity {
  _id?: string;
  userId: string;
  title?: string;
  filePath: string;
  duration: number;
  format?: string;
  transcription?: string | null;
  folderId?: string | null;
  tagIds?: string[];
  recordedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranscriptionTimestamp {
  t: number;
  w: string;
}

export interface TranscriptionEntity extends ApiEntity {
  _id?: string;
  audioId: string;
  text: string;
  timestamps?: TranscriptionTimestamp[];
  createdAt?: string;
}

export interface AnalysisAction {
  accion: string;
  prioridad: string;
}

export interface AnalysisResult {
  resumen: string;
  temas: string[];
  acciones: AnalysisAction[];
  sentimiento?: string;
  // Backend rich fields (preserved from MindvoiceAnalyzeResponse)
  title?: string;
  _originalTranscription?: string;
  edited_text?: string;
  executive_summary?: string[];
  key_insights?: string[];
  task_list?: { task: string; priority: string }[];
  mind_map_nodes?: { id: string; label: string; parentId: string | null }[];
  transcription_with_timestamps?: { start: string; end: string; text: string }[];
  _tags?: string[];
  semantic_keywords?: string[];
  report_ready_text?: string;
  [key: string]: unknown;
}

export interface AiAnalysisEntity extends ApiEntity {
  _id?: string;
  transcriptionId: string;
  result: AnalysisResult;
  createdAt?: string;
}

export interface CreateAudioPayload {
  filePath: string;
  duration: number;
  format?: string;
  title?: string;
  folderId?: string | null;
  tagIds?: string[];
}

export interface UpdateAudioPayload {
  title?: string;
  folderId?: string | null;
  tagIds?: string[];
  filePath?: string;
  duration?: number;
  format?: string;
}

export interface CreateTranscriptionPayload {
  audioId: string;
  text: string;
  timestamps?: TranscriptionTimestamp[];
}

export interface CreateAiAnalysisPayload {
  transcriptionId: string;
  result: AnalysisResult;
}

export interface MindvoiceTask {
  task?: string;
  priority?: string;
}

export interface MindvoiceTimestampBlock {
  start?: string;
  end?: string;
  text?: string;
}

export interface MindvoiceAnalyzeResponse {
  title?: string;
  transcription?: string;
  transcription_with_timestamps?: MindvoiceTimestampBlock[];
  executive_summary?: string[];
  edited_text?: string;
  key_insights?: string[];
  task_list?: MindvoiceTask[];
  tags?: string[];
  semantic_keywords?: string[];
  report_ready_text?: string;
  sentiment?: string;
}

export interface AudioWorkflowSnapshot {
  audios: AudioEntity[];
  transcriptions: TranscriptionEntity[];
  analyses: AiAnalysisEntity[];
}

@Injectable({ providedIn: 'root' })
export class AudioWorkflowService {
  private readonly resourceApi = inject(ResourceApiService);
  private readonly api = inject(ApiHttpService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly openRouterCreditsCache = new Map<string, { checkedAt: number; hasCredits: boolean }>();
  private readonly openRouterCreditsTtlMs = 5 * 60 * 1000;

  // Cache observables with shareReplay for instant subsequent requests
  private audioCache$ = new BehaviorSubject<Observable<AudioEntity[]> | null>(null);
  private transcriptionCache$ = new BehaviorSubject<Observable<TranscriptionEntity[]> | null>(null);
  private analysisCache$ = new BehaviorSubject<Observable<AiAnalysisEntity[]> | null>(null);

  // Backend Audio schema now supports folderId and tagIds natively

  getCurrentUserId(): string {
    const userId = this.tokenStorage.getUserId();
    if (!userId) {
      throw new Error('No se encontró userId en el token JWT.');
    }
    return userId;
  }

  listAudios(): Observable<AudioEntity[]> {
    const cached = this.audioCache$.getValue();
    if (cached) {
      return cached;
    }

    const request$ = this.resourceApi
      .list<AudioEntity>('audios')
      .pipe(
        map((audios) => this.sortByDateDesc(audios)),
        shareReplay(1)
      );

    this.audioCache$.next(request$);
    return request$;
  }

  // Backend Audio schema supports folderId and tagIds
  createAudio(payload: CreateAudioPayload): Observable<AudioEntity> {
    this.audioCache$.next(null);
    const body: Record<string, unknown> = {
      userId: this.getCurrentUserId(),
      filePath: payload.filePath,
      duration: payload.duration,
      format: payload.format?.trim() || 'wav',
    };
    if (payload.title) body['title'] = payload.title;
    if (payload.folderId) body['folderId'] = payload.folderId;
    if (payload.tagIds?.length) body['tagIds'] = payload.tagIds;
    return this.resourceApi.create<AudioEntity, Record<string, unknown>>('audios', body);
  }

  updateAudio(audioId: string, payload: UpdateAudioPayload): Observable<AudioEntity> {
    this.audioCache$.next(null);

    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body['title'] = payload.title;
    if (payload.folderId !== undefined) body['folderId'] = payload.folderId;
    if (payload.tagIds !== undefined) body['tagIds'] = payload.tagIds;
    if (payload.filePath !== undefined) body['filePath'] = payload.filePath;
    if (payload.duration !== undefined) body['duration'] = payload.duration;
    if (payload.format !== undefined) body['format'] = payload.format;

    if (Object.keys(body).length > 0) {
      return this.resourceApi.update<AudioEntity, Record<string, unknown>>('audios', audioId, body);
    }

    return this.resourceApi.getById<AudioEntity>('audios', audioId);
  }

  deleteAudio(audioId: string): Observable<void> {
    return this.resourceApi.remove('audios', audioId);
  }

  listTranscriptions(): Observable<TranscriptionEntity[]> {
    const cached = this.transcriptionCache$.getValue();
    if (cached) {
      return cached;
    }

    const request$ = this.resourceApi
      .list<TranscriptionEntity>('transcriptions')
      .pipe(
        map((transcriptions) => this.sortByDateDesc(transcriptions)),
        shareReplay(1)
      );

    this.transcriptionCache$.next(request$);
    return request$;
  }

  createTranscription(payload: CreateTranscriptionPayload): Observable<TranscriptionEntity> {
    this.transcriptionCache$.next(null); // Invalidate cache
    return this.resourceApi.create<TranscriptionEntity, CreateTranscriptionPayload>(
      'transcriptions',
      {
        audioId: payload.audioId,
        text: payload.text,
        timestamps: payload.timestamps ?? [],
      },
    );
  }

  deleteTranscription(transcriptionId: string): Observable<void> {
    this.transcriptionCache$.next(null); // Invalidate cache
    return this.resourceApi.remove('transcriptions', transcriptionId);
  }

  listAnalyses(): Observable<AiAnalysisEntity[]> {
    const cached = this.analysisCache$.getValue();
    if (cached) {
      return cached;
    }

    const request$ = this.resourceApi
      .list<AiAnalysisEntity>('ai-analyses')
      .pipe(
        map((analyses) => this.sortByDateDesc(analyses).map(a => this.normalizeAnalysisEntity(a))),
        shareReplay(1)
      );

    this.analysisCache$.next(request$);
    return request$;
  }

  /**
   * Normalizes the analysis result to always have { resumen, temas, acciones, sentimiento }
   * while preserving ALL original backend fields (title, executive_summary, key_insights,
   * mind_map_nodes, transcription_with_timestamps, etc.) for rich document display.
   */
  private normalizeAnalysisEntity(analysis: AiAnalysisEntity): AiAnalysisEntity {
    const raw = analysis.result as unknown as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') {
      console.warn('[AudioWorkflow] Analysis result is not an object:', analysis._id);
      return analysis;
    }

    // Already in the expected format — still merge original fields
    if (raw['resumen'] && typeof raw['resumen'] === 'string' && !raw['executive_summary']) {
      return analysis;
    }

    console.log(`[AudioWorkflow] Normalizing analysis ${analysis._id}: has executive_summary=${!!raw['executive_summary']}, report_ready_text=${!!raw['report_ready_text']}`);

    // Convert from MindvoiceAnalyzeResponse format to AnalysisResult format
    const execSummary = Array.isArray(raw['executive_summary'])
      ? (raw['executive_summary'] as string[]).filter(s => typeof s === 'string' && s.trim()).join('\n\n')
      : '';
    const reportText = typeof raw['report_ready_text'] === 'string' ? raw['report_ready_text'].trim() : '';
    const transcription = typeof raw['transcription'] === 'string' ? raw['transcription'].trim() : '';

    const resumen = reportText || execSummary || transcription || (raw['resumen'] as string) || 'Sin resumen';

    const tags = Array.isArray(raw['tags']) ? raw['tags'].filter((t): t is string => typeof t === 'string') : [];
    const keywords = Array.isArray(raw['semantic_keywords']) ? raw['semantic_keywords'].filter((t): t is string => typeof t === 'string') : [];
    const insights = Array.isArray(raw['key_insights']) ? raw['key_insights'].filter((t): t is string => typeof t === 'string') : [];
    const existingTemas = Array.isArray(raw['temas']) ? raw['temas'].filter((t): t is string => typeof t === 'string') : [];
    const temas = existingTemas.length > 0
      ? existingTemas
      : [...new Set([...tags, ...keywords, ...insights])].slice(0, 10);

    const taskList = Array.isArray(raw['task_list']) ? raw['task_list'] as { task?: string; priority?: string }[] : [];
    const existingAcciones = Array.isArray(raw['acciones']) ? raw['acciones'] as { accion: string; prioridad: string }[] : [];
    const acciones = existingAcciones.length > 0
      ? existingAcciones
      : taskList.map(t => ({
          accion: (t.task || '').trim(),
          prioridad: this.normalizePriority(t.priority),
        })).filter(a => a.accion.length > 0);

    const sentimiento = typeof raw['sentiment'] === 'string'
      ? raw['sentiment'].trim()
      : (typeof raw['sentimiento'] === 'string' ? raw['sentimiento'].trim() : undefined);

    return {
      ...analysis,
      result: {
        // Standard frontend fields
        resumen,
        temas,
        acciones,
        ...(sentimiento ? { sentimiento } : {}),
        // Preserve ALL original backend fields for rich document display
        ...(typeof raw['title'] === 'string' ? { title: raw['title'] } : {}),
        ...(typeof raw['transcription'] === 'string' ? { _originalTranscription: raw['transcription'] } : {}),
        ...(typeof raw['edited_text'] === 'string' ? { edited_text: raw['edited_text'] } : {}),
        ...(Array.isArray(raw['executive_summary']) ? { executive_summary: raw['executive_summary'] as string[] } : {}),
        ...(Array.isArray(raw['key_insights']) ? { key_insights: raw['key_insights'] as string[] } : {}),
        ...(Array.isArray(raw['task_list']) ? { task_list: raw['task_list'] as { task: string; priority: string }[] } : {}),
        ...(Array.isArray(raw['mind_map_nodes']) ? { mind_map_nodes: raw['mind_map_nodes'] as { id: string; label: string; parentId: string | null }[] } : {}),
        ...(Array.isArray(raw['transcription_with_timestamps']) ? { transcription_with_timestamps: raw['transcription_with_timestamps'] as { start: string; end: string; text: string }[] } : {}),
        ...(Array.isArray(raw['tags']) ? { _tags: raw['tags'] as string[] } : {}),
        ...(Array.isArray(raw['semantic_keywords']) ? { semantic_keywords: raw['semantic_keywords'] as string[] } : {}),
        ...(typeof raw['report_ready_text'] === 'string' ? { report_ready_text: raw['report_ready_text'] } : {}),
      } satisfies AnalysisResult,
    };
  }

  createAnalysis(payload: CreateAiAnalysisPayload): Observable<AiAnalysisEntity> {
    this.analysisCache$.next(null); // Invalidate cache
    return this.resourceApi.create<AiAnalysisEntity, CreateAiAnalysisPayload>('ai-analyses', payload);
  }

  deleteAnalysis(analysisId: string): Observable<void> {
    this.analysisCache$.next(null); // Invalidate cache
    return this.resourceApi.remove('ai-analyses', analysisId);
  }

  // Invalidate all caches
  invalidateAllCaches(): void {
    this.audioCache$.next(null);
    this.transcriptionCache$.next(null);
    this.analysisCache$.next(null);
  }

  analyzeText(text: string): Observable<MindvoiceAnalyzeResponse> {
    return this.api.post<MindvoiceAnalyzeResponse>('mindvoice-api/analyze/text', { text });
  }

  analyzeAudio(audio: Blob, fileName: string, apiKey?: string): Observable<MindvoiceAnalyzeResponse> {
    const normalizedFileName = this.ensureAudioFileName(fileName, audio.type);

    return this.prepareCompatibilityAudio(audio, normalizedFileName).pipe(
      switchMap(({ blob: compatibilityBlob, fileName: compatFileName }) => {
        // Try backend /mindvoice-api/analyze/audio first (uses JWT auth, saves tokens)
        return this.requestAudioAnalysis(compatibilityBlob, compatFileName, '', { queryMode: false }).pipe(
          catchError(() => {
            // Backend failed — fallback to OpenRouter direct call
            const explicitApiKey = this.normalizeApiKey(apiKey);
            const openRouterApiKey = this.resolveOpenRouterApiKey(explicitApiKey);
            if (!openRouterApiKey) {
              return throwError(() => new Error('AI_API_KEY_MISSING'));
            }
            return from(this.openRouterAudioAnalyzeRequest(compatibilityBlob, openRouterApiKey));
          }),
        );
      }),
    );
  }

  buildProfessionalAnalysisPrompt(transcriptionText: string): string {
    const cleanText = this.normalizeText(transcriptionText);

    return [
      'Eres un analista profesional para reportes ejecutivos de voz.',
      'Analiza el contenido y devuelve una respuesta estructurada y accionable.',
      '',
      'Requisitos estrictos de formato:',
      '1) executive_summary: arreglo de 3 a 6 bullets claros.',
      '2) key_insights: arreglo de hallazgos concretos.',
      '3) task_list: arreglo con { task, priority } usando prioridad alta, media o baja.',
      '4) tags: arreglo de etiquetas de negocio.',
      '5) semantic_keywords: arreglo de palabras clave.',
      '6) report_ready_text: texto final profesional con secciones.',
      '7) sentiment: una palabra (positivo, neutral o negativo).',
      '',
      'Contenido a analizar:',
      cleanText || 'Sin contenido disponible.',
    ].join('\n');
  }

  extractTranscriptionText(aiResult: MindvoiceAnalyzeResponse): string {
    const direct = this.normalizeText(aiResult.transcription);
    if (direct) {
      return direct;
    }

    const edited = this.normalizeText(aiResult.edited_text);
    if (edited) {
      return edited;
    }

    const fromTimestampBlocks = Array.isArray(aiResult.transcription_with_timestamps)
      ? aiResult.transcription_with_timestamps
          .map((block) => this.normalizeText(block.text))
          .filter((line) => line.length > 0)
          .join(' ')
      : '';
    if (fromTimestampBlocks) {
      return fromTimestampBlocks;
    }

    const reportReady = this.normalizeText(aiResult.report_ready_text);
    if (reportReady) {
      return reportReady;
    }

    const summary = Array.isArray(aiResult.executive_summary)
      ? aiResult.executive_summary
          .map((line) => this.normalizeText(line))
          .filter((line) => line.length > 0)
          .join('\n\n')
      : '';

    return summary;
  }

  createAnalysisFromMindvoice(
    transcriptionId: string,
    aiResult: MindvoiceAnalyzeResponse,
    fallbackText: string,
  ): Observable<AiAnalysisEntity> {
    return this.createAnalysis({
      transcriptionId,
      result: this.mapMindvoiceToAnalysis(aiResult, fallbackText),
    });
  }

  generateAndSaveAnalysis(transcription: Pick<TranscriptionEntity, '_id' | 'text'>): Observable<AiAnalysisEntity> {
    if (!transcription._id) {
      return throwError(() => new Error('La transcripción no tiene _id válido.'));
    }

    return this.analyzeText(transcription.text).pipe(
      switchMap((aiResult) => this.createAnalysisFromMindvoice(transcription._id as string, aiResult, transcription.text)),
    );
  }

  createBasicAnalysis(transcription: Pick<TranscriptionEntity, '_id' | 'text'>): Observable<AiAnalysisEntity> {
    if (!transcription._id) {
      return throwError(() => new Error('La transcripción no tiene _id válido.'));
    }

    return this.createAnalysis({
      transcriptionId: transcription._id,
      result: this.buildFallbackAnalysis(transcription.text),
    });
  }

  loadWorkflowData(): Observable<AudioWorkflowSnapshot> {
    return forkJoin({
      audios: this.listAudios(),
      transcriptions: this.listTranscriptions(),
      analyses: this.listAnalyses(),
    });
  }

  private mapMindvoiceToAnalysis(
    aiResult: MindvoiceAnalyzeResponse,
    fallbackText: string,
  ): AnalysisResult {
    const summaryBlocks = Array.isArray(aiResult.executive_summary)
      ? aiResult.executive_summary
          .filter((block): block is string => typeof block === 'string' && block.trim().length > 0)
          .join('\n\n')
      : '';

    const resumen =
      this.normalizeText(aiResult.report_ready_text) ||
      this.normalizeText(summaryBlocks) ||
      this.extractTranscriptionText(aiResult) ||
      this.normalizeText(fallbackText) ||
      'Sin resumen generado.';

    const acciones = Array.isArray(aiResult.task_list)
      ? aiResult.task_list
          .map((task) => ({
            accion: this.normalizeText(task.task),
            prioridad: this.normalizePriority(task.priority),
          }))
          .filter((item) => item.accion.length > 0)
      : [];

    const temas = this.uniqueStrings([
      ...(Array.isArray(aiResult.tags) ? aiResult.tags : []),
      ...(Array.isArray(aiResult.semantic_keywords) ? aiResult.semantic_keywords : []),
      ...(Array.isArray(aiResult.key_insights) ? aiResult.key_insights : []),
    ]);

    const sentimiento = this.normalizeText(aiResult.sentiment);

    return {
      resumen,
      temas,
      acciones,
      ...(sentimiento ? { sentimiento } : {}),
    };
  }

  private buildFallbackAnalysis(text: string): AnalysisResult {
    const cleanText = this.normalizeText(text);
    const resumen = cleanText.length > 320
      ? `${cleanText.slice(0, 320)}...`
      : cleanText;

    return {
      resumen: resumen || 'Análisis básico generado sin contenido.',
      temas: [],
      acciones: [],
    };
  }

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizePriority(value: unknown): string {
    const normalized = this.normalizeText(value).toLowerCase();
    if (normalized === 'alta' || normalized === 'media' || normalized === 'baja') {
      return normalized;
    }
    return 'media';
  }

  private uniqueStrings(values: unknown[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }

      const normalized = value.trim();
      if (!normalized) {
        continue;
      }

      const key = normalized.toLocaleLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(normalized);
    }

    return unique;
  }

  private normalizeApiKey(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const key = value.trim();
    if (!key) {
      return '';
    }

    const placeholder = key.toUpperCase();
    if (
      placeholder.includes('YOUR_GEMINI_API_KEY')
      || placeholder.includes('MY_GEMINI_API_KEY')
      || placeholder.includes('GEMINI_API_KEY')
      || placeholder.includes('YOUR_OPENROUTER_API_KEY')
      || placeholder.includes('MY_OPENROUTER_API_KEY')
      || placeholder.includes('OPENROUTER_API_KEY')
    ) {
      return '';
    }

    return key;
  }

  private resolveOpenRouterApiKey(explicitApiKey: string): string {
    if (explicitApiKey) {
      return this.looksLikeGeminiApiKey(explicitApiKey) ? '' : explicitApiKey;
    }

    return this.resolveRuntimeOpenRouterApiKey()
      || this.normalizeApiKey(environment.openRouterApiKey);
  }

  private resolveGeminiApiKey(explicitApiKey: string): string {
    if (explicitApiKey && this.looksLikeGeminiApiKey(explicitApiKey)) {
      return explicitApiKey;
    }

    return this.resolveRuntimeGeminiApiKey()
      || this.normalizeApiKey(environment.geminiApiKey);
  }

  private resolveRuntimeOpenRouterApiKey(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const localConfig = window.__MINDVOICE_LOCAL_CONFIG__;
    const openRouterFromConfig = this.normalizeApiKey(localConfig?.openRouterApiKey);
    if (openRouterFromConfig) {
      return openRouterFromConfig;
    }

    if (!window.localStorage) {
      return '';
    }

    return this.normalizeApiKey(window.localStorage.getItem('OPENROUTER_API_KEY'));
  }

  private resolveRuntimeGeminiApiKey(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const localConfig = window.__MINDVOICE_LOCAL_CONFIG__;
    const geminiFromConfig = this.normalizeApiKey(localConfig?.geminiApiKey);
    if (geminiFromConfig) {
      return geminiFromConfig;
    }

    if (!window.localStorage) {
      return '';
    }

    return this.normalizeApiKey(window.localStorage.getItem('GEMINI_API_KEY'));
  }

  private looksLikeGeminiApiKey(apiKey: string): boolean {
    return /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey.trim());
  }

  private requestAudioAnalysis(
    audio: Blob,
    fileName: string,
    apiKey: string,
    options: { queryMode: boolean },
  ): Observable<MindvoiceAnalyzeResponse> {
    const formData = new FormData();
    formData.append('audio', audio, fileName);

    const endpoint = options.queryMode && apiKey
      ? `mindvoice-api/analyze/audio?api_key=${encodeURIComponent(apiKey)}`
      : 'mindvoice-api/analyze/audio';

    if (!options.queryMode && apiKey) {
      formData.append('api_key', apiKey);
    }

    return this.api.post<MindvoiceAnalyzeResponse>(endpoint, formData);
  }

  private shouldRetryAnalyzeAudio(error: unknown): boolean {
    const status = this.resolveHttpStatus(error);
    return status === 500 || status === 422 || status === 415 || status === 400 || status === 429;
  }

  private isOpenRouterCreditsError(error: unknown): boolean {
    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

    const message = rawMessage.toLowerCase();
    return message.includes('openrouter_credits_required')
      || message.includes('insufficient credits')
      || message.includes('credits');
  }

  private isGeminiQuotaError(error: unknown): boolean {
    const status = this.resolveHttpStatus(error);
    if (status === 429 || status === 402) {
      return true;
    }

    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

    const message = rawMessage.toLowerCase();
    return message.includes('quota')
      || message.includes('resource_exhausted')
      || message.includes('rate limit')
      || message.includes('billing')
      || message.includes('insufficient credits')
      || message.includes('payment required');
  }

  private runAudioAnalyzeAttempts(
    attempts: Array<() => Observable<MindvoiceAnalyzeResponse>>,
    index = 0,
    lastError: unknown = null,
  ): Observable<MindvoiceAnalyzeResponse> {
    if (index >= attempts.length) {
      return throwError(() => (lastError instanceof Error ? lastError : new Error('No se pudo analizar el audio.')));
    }

    return attempts[index]().pipe(
      catchError((error) => {
        if (!this.shouldRetryAnalyzeAudio(error)) {
          return throwError(() => error);
        }
        return this.runAudioAnalyzeAttempts(attempts, index + 1, error);
      }),
    );
  }

  private ensureAudioFileName(fileName: string, mimeType: string): string {
    const trimmed = fileName.trim();
    if (trimmed.length > 0 && /\.[a-zA-Z0-9]+$/.test(trimmed)) {
      return trimmed;
    }

    const extension = this.extensionFromMime(mimeType);
    return `${trimmed || `audio-${Date.now()}`}.${extension}`;
  }

  private withCompatibilityAudioType(audio: Blob): Blob {
    if (audio.type === 'audio/wav' || audio.type === 'audio/x-wav') {
      return audio;
    }
    return new Blob([audio], { type: 'audio/wav' });
  }

  private prepareCompatibilityAudio(
    audio: Blob,
    normalizedFileName: string,
  ): Observable<{ blob: Blob; fileName: string }> {
    if (audio.type === 'audio/wav' || audio.type === 'audio/x-wav') {
      return of({ blob: audio, fileName: this.swapFileExtension(normalizedFileName, 'audio/wav') });
    }

    return from(this.convertAudioToWav(audio)).pipe(
      map((wavBlob) => ({ blob: wavBlob, fileName: this.swapFileExtension(normalizedFileName, wavBlob.type) })),
      catchError(() => {
        const fallback = this.withCompatibilityAudioType(audio);
        return of({ blob: fallback, fileName: this.swapFileExtension(normalizedFileName, fallback.type) });
      }),
    );
  }

  private async convertAudioToWav(audio: Blob): Promise<Blob> {
    const audioData = await audio.arrayBuffer();
    const AudioContextCtor = (globalThis as {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    }).AudioContext || (globalThis as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error('AudioContext no está disponible para convertir audio.');
    }

    const context = new AudioContextCtor();
    try {
      const decoded = await context.decodeAudioData(audioData.slice(0));
      const wavBuffer = this.encodeAudioBufferToWav(decoded);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } finally {
      await context.close();
    }
  }

  private encodeAudioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const channelCount = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = channelCount * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = frameCount * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    this.writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeAscii(view, 8, 'WAVE');
    this.writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    this.writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const channels = Array.from({ length: channelCount }, (_, index) => audioBuffer.getChannelData(index));

    for (let i = 0; i < frameCount; i += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return buffer;
  }

  private writeAscii(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  private swapFileExtension(fileName: string, mimeType: string): string {
    const baseName = fileName.replace(/\.[^./\\]+$/, '');
    return `${baseName}.${this.extensionFromMime(mimeType)}`;
  }

  private extensionFromMime(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('wav')) return 'wav';
    if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
    if (normalized.includes('m4a') || normalized.includes('mp4')) return 'm4a';
    if (normalized.includes('ogg')) return 'ogg';
    return 'wav';
  }

  // ANALYZER: Solo usa OpenRouter - Gemini deshabilitado por rate limit
  // private analyzeAudioWithDirectProvider(
  //   audio: Blob,
  //   credentials: { openRouterApiKey: string; geminiApiKey: string },
  // ): Observable<MindvoiceAnalyzeResponse> {
  //   const { openRouterApiKey, geminiApiKey } = credentials;

  //   if (openRouterApiKey) {
  //     return from(this.openRouterAudioAnalyzeRequest(audio, openRouterApiKey)).pipe(
  //       catchError((directError) => {
  //         if (this.isOpenRouterCreditsError(directError)) {
  //           if (geminiApiKey) {
  //             return from(this.geminiAudioAnalyzeRequest(audio, geminiApiKey));
  //           }
  //           return throwError(() => new Error('OPENROUTER_CREDITS_REQUIRED'));
  //         }

  //         if (this.isOpenRouterAuthError(directError)) {
  //           if (geminiApiKey) {
  //             return from(this.geminiAudioAnalyzeRequest(audio, geminiApiKey));
  //           }
  //           return throwError(() => new Error('OPENROUTER_API_KEY_INVALID'));
  //         }

  //         return throwError(() => directError);
  //       }),
  //     );
  //   }

  //   if (geminiApiKey) {
  //     return from(this.geminiAudioAnalyzeRequest(audio, geminiApiKey)).pipe(
  //       catchError((geminiError) => {
  //         if (this.isRateLimitError(geminiError) && openRouterApiKey) {
  //           console.warn('Gemini rate limit. Falling back to OpenRouter.');
  //           return from(this.openRouterAudioAnalyzeRequest(audio, openRouterApiKey));
  //         }
  //         return throwError(() => geminiError);
  //       }),
  //     );
  //   }

  //   return throwError(() => new Error('AI_API_KEY_MISSING'));
  // }

  // DESHABILITADO: Gemini deshabilitado por rate limit (429)
  // private async geminiAudioAnalyzeRequest(audio: Blob, apiKey: string): Promise<MindvoiceAnalyzeResponse> {
  //   const base64Audio = await this.blobToBase64(audio);
  //   const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  //   const payload = {
  //     generationConfig: {
  //       temperature: 0.2,
  //     },
  //     contents: [
  //       {
  //         parts: [
  //           {
  //             text: [
  //               'Transcribe y analiza este audio en español.',
  //               'Responde SOLO JSON válido con esta estructura exacta:',
  //               '{',
  //               '  "transcription": "string",',
  //               '  "executive_summary": ["string"],',
  //               '  "key_insights": ["string"],',
  //               '  "task_list": [{"task":"string","priority":"alta|media|baja"}],',
  //               '  "tags": ["string"],',
  //               '  "semantic_keywords": ["string"],',
  //               '  "report_ready_text": "string",',
  //               '  "sentiment": "positivo|neutral|negativo"',
  //               '}',
  //             ].join('\n'),
  //           },
  //           {
  //             inlineData: {
  //               mimeType: audio.type || 'audio/wav',
  //               data: base64Audio,
  //             },
  //           },
  //         ],
  //       },
  //     ],
  //   };

  //   const maxRetries = 3;
  //   let lastError: Error | null = null;

  //   for (let attempt = 0; attempt <= maxRetries; attempt++) {
  //     try {
  //       const response = await fetch(endpoint, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(payload),
  //       });

  //       if (!response.ok) {
  //         const errorPayload = await response.text();
  //         const error = new Error(`Gemini direct error ${response.status}: ${errorPayload}`);

  //         if (response.status === 429 && attempt < maxRetries) {
  //           const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
  //           console.warn(`Gemini rate limit (429). Reintento ${attempt + 1}/${maxRetries} en ${delayMs}ms`);
  //           await this.delay(delayMs);
  //           continue;
  //         }

  //         throw error;
  //       }

  //       const data = await response.json() as Record<string, unknown>;
  //       const text = this.extractGeminiText(data);
  //       const parsed = this.parseGeminiJson(text);

  //       if (parsed) {
  //         return parsed;
  //       }

  //       const normalizedText = this.normalizeText(text);
  //       return {
  //         transcription: normalizedText,
  //         executive_summary: normalizedText ? [normalizedText.slice(0, 320)] : ['Análisis generado por Gemini.'],
  //         report_ready_text: normalizedText || 'Análisis generado por Gemini.',
  //         key_insights: [],
  //         task_list: [],
  //         tags: [],
  //         semantic_keywords: [],
  //         sentiment: 'neutral',
  //       };
  //     } catch (error) {
  //       lastError = error instanceof Error ? error : new Error(String(error));

  //       if (this.isRateLimitError(lastError) && attempt < maxRetries) {
  //         const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
  //         console.warn(`Gemini rate limit. Reintento ${attempt + 1}/${maxRetries} en ${delayMs}ms`);
  //         await this.delay(delayMs);
  //         continue;
  //       }

  //       throw lastError;
  //     }
  //   }

  //   throw lastError || new Error('Gemini: máximo de reintentos alcanzado');
  // }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('429') || message.includes('quota') || message.includes('rate limit');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async openRouterAudioAnalyzeRequest(audio: Blob, apiKey: string): Promise<MindvoiceAnalyzeResponse> {
    await this.ensureOpenRouterCredits(apiKey);

    const base64Audio = await this.blobToBase64(audio);
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const runtimeModel = typeof window !== 'undefined'
      ? this.normalizeText(window.__MINDVOICE_LOCAL_CONFIG__?.openRouterModel)
      : '';
    const model = runtimeModel
      || this.normalizeText(environment.openRouterModel)
      || 'google/gemini-2.5-flash';

    const payload = {
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Transcribe y analiza este audio en español.',
                'Responde SOLO JSON válido con esta estructura exacta:',
                '{',
                '  "transcription": "string",',
                '  "executive_summary": ["string"],',
                '  "key_insights": ["string"],',
                '  "task_list": [{"task":"string","priority":"alta|media|baja"}],',
                '  "tags": ["string"],',
                '  "semantic_keywords": ["string"],',
                '  "report_ready_text": "string",',
                '  "sentiment": "positivo|neutral|negativo"',
                '}',
              ].join('\n'),
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: this.resolveAudioFormat(audio.type),
              },
            },
          ],
        },
      ],
    };

    // Reintentos controlados con backoff exponencial para errores transitorios
    const maxRetries = 4;
    const baseDelayMs = 1500;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mindvoice.app',
            'X-Title': 'MindVoice',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('OPENROUTER_API_KEY_INVALID');
          }

          if (response.status === 402) {
            throw new Error('OPENROUTER_CREDITS_REQUIRED');
          }

          const errorPayload = await response.text();
          const error = new Error(`OpenRouter error ${response.status}: ${errorPayload}`);

          // Reintentar solo errores transitorios (429, 500, 502, 503, 504)
          if (this.isRetryableOpenRouterError(response.status) && attempt < maxRetries) {
            const delayMs = baseDelayMs * Math.pow(2, attempt);
            const jitterMs = Math.random() * 1000;
            const totalDelayMs = Math.min(delayMs + jitterMs, 15000);
            console.warn(`OpenRouter error ${response.status}. Reintento ${attempt + 1}/${maxRetries} en ${Math.round(totalDelayMs)}ms`);
            await this.delay(totalDelayMs);
            continue;
          }

          throw error;
        }

        const data = await response.json() as Record<string, unknown>;
        const text = this.extractOpenRouterText(data);
        const parsed = this.parseGeminiJson(text);

        if (parsed) {
          return parsed;
        }

        const normalizedText = this.normalizeText(text);
        return {
          transcription: normalizedText,
          executive_summary: normalizedText ? [normalizedText.slice(0, 320)] : ['Análisis generado por IA.'],
          report_ready_text: normalizedText || 'Análisis generado por IA.',
          key_insights: [],
          task_list: [],
          tags: [],
          semantic_keywords: [],
          sentiment: 'neutral',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isOpenRouterRetryableError(lastError) && attempt < maxRetries) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          const jitterMs = Math.random() * 1000;
          const totalDelayMs = Math.min(delayMs + jitterMs, 15000);
          console.warn(`OpenRouter error. Reintento ${attempt + 1}/${maxRetries} en ${Math.round(totalDelayMs)}ms`);
          await this.delay(totalDelayMs);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('OpenRouter: máximo de reintentos alcanzado');
  }

  private isRetryableOpenRouterError(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private isOpenRouterRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('429')
      || message.includes('500')
      || message.includes('502')
      || message.includes('503')
      || message.includes('504')
      || message.includes('rate limit')
      || message.includes('timeout');
  }

  private isOpenRouterAuthError(error: unknown): boolean {
    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

    const message = rawMessage.toLowerCase();
    return message.includes('openrouter_api_key_invalid')
      || message.includes('openrouter error 401')
      || message.includes('openrouter error 403')
      || message.includes('unauthorized')
      || message.includes('invalid api key')
      || message.includes('invalid_api_key');
  }

  private async ensureOpenRouterCredits(apiKey: string): Promise<void> {
    const now = Date.now();
    const cached = this.openRouterCreditsCache.get(apiKey);
    if (cached && (now - cached.checkedAt) < this.openRouterCreditsTtlMs) {
      if (!cached.hasCredits) {
        throw new Error('OPENROUTER_CREDITS_REQUIRED');
      }
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/credits', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('OPENROUTER_API_KEY_INVALID');
        }
        return;
      }

      const payload = await response.json() as { data?: { total_credits?: number; total_usage?: number } };
      const totalCredits = Number(payload?.data?.total_credits ?? 0);
      const totalUsage = Number(payload?.data?.total_usage ?? 0);
      const hasCredits = Number.isFinite(totalCredits) && Number.isFinite(totalUsage) && totalCredits > totalUsage;

      this.openRouterCreditsCache.set(apiKey, { checkedAt: now, hasCredits });
      if (!hasCredits) {
        throw new Error('OPENROUTER_CREDITS_REQUIRED');
      }
    } catch (error) {
      if (
        error instanceof Error
        && (
          error.message === 'OPENROUTER_CREDITS_REQUIRED'
          || error.message === 'OPENROUTER_API_KEY_INVALID'
        )
      ) {
        throw error;
      }
    }
  }

  private resolveAudioFormat(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('mpeg') || normalized.includes('mp3')) {
      return 'mp3';
    }
    if (normalized.includes('ogg')) {
      return 'ogg';
    }
    if (normalized.includes('m4a') || normalized.includes('mp4')) {
      return 'm4a';
    }
    return 'wav';
  }

  private extractOpenRouterText(payload: Record<string, unknown>): string {
    const choices = payload['choices'];
    if (!Array.isArray(choices) || choices.length === 0) {
      return '';
    }

    const firstChoice = choices[0] as Record<string, unknown>;
    const message = firstChoice['message'] as Record<string, unknown> | undefined;
    const content = message?.['content'];
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return '';
    }

    const texts = content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }
        const record = part as Record<string, unknown>;
        if (typeof record['text'] === 'string') {
          return record['text'];
        }
        if (
          record['type'] === 'text'
          && typeof record['content'] === 'string'
        ) {
          return record['content'];
        }
        return '';
      })
      .filter((value) => value.length > 0);

    return texts.join('\n').trim();
  }

  private extractGeminiText(payload: Record<string, unknown>): string {
    const candidates = payload['candidates'];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return '';
    }

    const firstCandidate = candidates[0] as Record<string, unknown>;
    const content = firstCandidate['content'] as Record<string, unknown> | undefined;
    const parts = content?.['parts'];
    if (!Array.isArray(parts)) {
      return '';
    }

    const textPart = parts.find((part) => typeof (part as Record<string, unknown>)['text'] === 'string') as Record<string, unknown> | undefined;
    return typeof textPart?.['text'] === 'string' ? textPart['text'] : '';
  }

  private parseGeminiJson(text: string): MindvoiceAnalyzeResponse | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const direct = this.tryParseJson(trimmed);
    if (direct) {
      return direct;
    }

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return this.tryParseJson(fencedMatch[1].trim());
    }

    return null;
  }

  private tryParseJson(raw: string): MindvoiceAnalyzeResponse | null {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        transcription: this.normalizeText(parsed['transcription']),
        executive_summary: this.uniqueStrings(Array.isArray(parsed['executive_summary']) ? parsed['executive_summary'] : []),
        key_insights: this.uniqueStrings(Array.isArray(parsed['key_insights']) ? parsed['key_insights'] : []),
        task_list: Array.isArray(parsed['task_list'])
          ? parsed['task_list']
              .filter((item) => item && typeof item === 'object')
              .map((item) => ({
                task: this.normalizeText((item as Record<string, unknown>)['task']),
                priority: this.normalizePriority((item as Record<string, unknown>)['priority']),
              }))
              .filter((item) => item.task)
          : [],
        tags: this.uniqueStrings(Array.isArray(parsed['tags']) ? parsed['tags'] : []),
        semantic_keywords: this.uniqueStrings(Array.isArray(parsed['semantic_keywords']) ? parsed['semantic_keywords'] : []),
        report_ready_text: this.normalizeText(parsed['report_ready_text']),
        sentiment: this.normalizeText(parsed['sentiment']) || 'neutral',
      };
    } catch {
      return null;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  private resolveHttpStatus(error: unknown): number {
    if (error instanceof HttpErrorResponse) {
      return Number(error.status) || 0;
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      return Number((error as { status?: number }).status) || 0;
    }

    return 0;
  }

  private sortByDateDesc<T extends ApiEntity>(items: T[]): T[] {
    return [...items].sort((first, second) => this.extractDate(second) - this.extractDate(first));
  }

  private extractDate(entity: ApiEntity): number {
    const candidates = [
      entity['recordedAt'],
      entity['createdAt'],
      entity['updatedAt'],
      entity['created_at'],
      entity['updated_at'],
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const parsed = new Date(candidate).getTime();
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return 0;
  }
}
