import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, switchMap, throwError, shareReplay, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEntity } from '../models/api.models';
import { ApiHttpService } from './api-http.service';
import { ResourceApiService } from './resource-api.service';
import { TokenStorageService } from './token-storage.service';

export interface AudioEntity extends ApiEntity {
  _id?: string;
  userId: string;
  filePath: string;
  duration: number;
  format?: string;
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

  // Cache observables with shareReplay for instant subsequent requests
  private audioCache$ = new BehaviorSubject<Observable<AudioEntity[]> | null>(null);
  private transcriptionCache$ = new BehaviorSubject<Observable<TranscriptionEntity[]> | null>(null);
  private analysisCache$ = new BehaviorSubject<Observable<AiAnalysisEntity[]> | null>(null);

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

  createAudio(payload: CreateAudioPayload): Observable<AudioEntity> {
    return this.resourceApi.create<AudioEntity, AudioEntity>('audios', {
      userId: this.getCurrentUserId(),
      filePath: payload.filePath,
      duration: payload.duration,
      format: payload.format?.trim() || 'wav',
    });
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
        map((analyses) => this.sortByDateDesc(analyses)),
        shareReplay(1)
      );

    this.analysisCache$.next(request$);
    return request$;
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
    const formData = new FormData();
    formData.append('audio', audio, fileName);

    const resolvedApiKey = this.normalizeApiKey(apiKey) || this.normalizeApiKey(environment.geminiApiKey);
    if (resolvedApiKey) {
      formData.append('api_key', resolvedApiKey);
    }

    return this.api.post<MindvoiceAnalyzeResponse>('mindvoice-api/analyze/audio', formData);
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
    ) {
      return '';
    }

    return key;
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
