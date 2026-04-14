import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, firstValueFrom, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {
  AnalysisResult,
  AiAnalysisEntity,
  AudioEntity,
  AudioWorkflowService,
  MindvoiceAnalyzeResponse,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { AudioDownloaderService } from '../../core/services/audio-downloader.service';
import { AnalysisArtifactsService } from '../../core/services/analysis-artifacts.service';

interface RecordingRow {
  audio: AudioEntity;
  transcriptions: TranscriptionEntity[];
  analyses: AiAnalysisEntity[];
  isAnalyzing?: boolean;
}

@Component({
  selector: 'app-recordings',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1250px] mx-auto w-full space-y-6 premium-page-shell">
      <section class="premium-page-hero rounded-2xl bg-gradient-to-br from-fuchsia-500/18 via-surface-dark/90 to-blue-900/18 border border-fuchsia-500/30 p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-3xl font-black text-white">Grabaciones</h1>
          <p class="text-gray-300">Repositorio de audios conectados a transcripciones, análisis y resúmenes IA.</p>
        </div>
        <button
          type="button"
          class="h-10 px-4 rounded-lg bg-gradient-to-r from-fuchsia-600 to-blue-600 border border-fuchsia-400/40 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
          (click)="refreshData()"
          [disabled]="(loading$ | async)"
        >
          <span class="inline-flex items-center gap-2">
            <mat-icon class="text-lg" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
            Recargar
          </span>
        </button>
      </section>

      @if (error$ | async) {
        <section class="rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-500/15 to-rose-500/8 p-4 text-sm text-rose-300 backdrop-blur-sm">
          {{ error$ | async }}
        </section>
      }

      @if (manualSelectionMessage) {
        <section class="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/8 p-4 text-sm text-amber-200 backdrop-blur-sm">
          {{ manualSelectionMessage }}
        </section>
      }

      <input
        #manualAudioInput
        type="file"
        accept="audio/*"
        class="hidden"
        (change)="onManualAudioSelected($event)"
      />

      <section class="rounded-xl border border-white/10 bg-surface-dark p-5 space-y-4">
        @let loading = (loading$ | async);
        @let rows = (rows$ | async);
        
        @if (loading && (!rows || rows.length === 0)) {
          <p class="text-sm text-gray-400">Cargando grabaciones...</p>
        }

        @if (loading && rows && rows.length > 0) {
          <p class="text-xs text-gray-500">Actualizando datos...</p>
        }

        @if (!loading && (!rows || rows.length === 0)) {
          <p class="text-sm text-gray-400">No hay grabaciones disponibles.</p>
        }

        @if (rows && rows.length > 0) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            @for (row of rows; track row.audio._id || $index) {
              <article class="rounded-xl border border-border-dark bg-background-dark/45 p-4 space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="text-white font-semibold truncate">{{ row.audio.filePath }}</h3>
                    <p class="text-xs text-gray-500 mt-1">
                      ID {{ row.audio._id }} · {{ row.audio.duration }}s · {{ row.audio.format || 'wav' }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <span class="px-2 py-1 rounded-full text-[11px] border border-sky-400/35 bg-sky-500/10 text-sky-200">
                      {{ row.transcriptions.length }} transcripción(es)
                    </span>
                    <span class="px-2 py-1 rounded-full text-[11px] border border-violet-400/35 bg-violet-500/10 text-violet-200">
                      {{ row.analyses.length }} análisis
                    </span>
                  </div>
                </div>

                @if (isPlayableUrl(row.audio.filePath)) {
                  <audio [src]="getAudioUrl(row.audio.filePath)" controls class="w-full"></audio>
                } @else {
                  <p class="text-xs text-gray-400">
                    Vista previa no disponible para esta ruta de almacenamiento.
                  </p>
                }

                <div class="flex flex-wrap gap-2">
                  @if (!row.transcriptions || row.transcriptions.length === 0) {
                    <button
                      type="button"
                      class="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                      (click)="analyzeAudio(row.audio)"
                      [disabled]="row.isAnalyzing"
                    >
                      <span class="inline-flex items-center gap-1">
                        <mat-icon class="text-sm" [class.animate-spin]="row.isAnalyzing">psychology</mat-icon>
                        {{ row.isAnalyzing ? 'Analizando...' : 'Analizar Audio' }}
                      </span>
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
                      (click)="goToSummaries(row.audio)"
                    >
                      Usar en resúmenes IA
                    </button>
                    <button
                      type="button"
                      class="h-9 px-3 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                      (click)="goToAiAnalysis(row.audio)"
                    >
                      Ver análisis IA
                    </button>
                  }
                </div>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class RecordingsComponent implements OnInit {
  @ViewChild('manualAudioInput') manualAudioInput?: ElementRef<HTMLInputElement>;

  private readonly state = inject(StateManagementService);
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly audioDownloader = inject(AudioDownloaderService);
  private readonly analysisArtifacts = inject(AnalysisArtifactsService);
  private readonly router = inject(Router);

  private analyzingAudioIds$ = new BehaviorSubject<Set<string>>(new Set());
  private pendingManualAnalysis: { audioId: string; suggestedFileName: string } | null = null;

  loading$ = this.state.loading$;
  error$ = this.state.error$;
  rows$!: Observable<RecordingRow[]>;
  manualSelectionMessage = '';

  ngOnInit(): void {
    this.state.ensureInitialized();

    const combined$ = combineLatest([
      this.state.audios$,
      this.state.transcriptions$,
      this.state.analyses$,
      this.analyzingAudioIds$,
    ]);

    this.rows$ = combined$.pipe(
      map(([audios, transcriptions, analyses, analyzingIds]) => {
        return (audios || []).map((audio: AudioEntity) => ({
          audio,
          transcriptions: (transcriptions || []).filter((t: TranscriptionEntity) => t.audioId === audio._id),
          analyses: (analyses || []).filter((a: AiAnalysisEntity) => {
            const trans = (transcriptions || []).find((t: TranscriptionEntity) => t._id === a.transcriptionId);
            return trans?.audioId === audio._id;
          }),
          isAnalyzing: analyzingIds.has(audio._id || ''),
        }));
      }),
      startWith([])
    );

  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  async analyzeAudio(audio: AudioEntity): Promise<void> {
    if (!audio._id || !audio.filePath) return;

    const audioId = audio._id;
    this.setAnalyzingStatus(audioId, true);

    if (this.requiresLocalFileSelection(audio.filePath)) {
      const reused = await this.tryAnalyzeFromExistingTranscription(audioId);
      if (reused) {
        this.setAnalyzingStatus(audioId, false);
        return;
      }
      this.requestManualAudioSelection(audioId, audio.filePath);
      this.setAnalyzingStatus(audioId, false);
      return;
    }

    try {
      const audioBlob = await this.audioDownloader.downloadAudioBlobPromise(audio.filePath);
      const fileName = audio.filePath.split('/').pop() || 'audio.wav';
      this.manualSelectionMessage = '';
      await this.processAudioAnalysis(audioId, audioBlob, fileName);
    } catch (error) {
      if (this.isDownloadFailure(error)) {
        const reused = await this.tryAnalyzeFromExistingTranscription(audioId);
        if (!reused) {
          this.requestManualAudioSelection(audioId, audio.filePath);
        }
      } else {
        this.manualSelectionMessage = this.resolveAudioAnalyzeErrorMessage(error, false);
      }
    } finally {
      this.setAnalyzingStatus(audioId, false);
    }
  }

  async onManualAudioSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    const pending = this.pendingManualAnalysis;
    this.pendingManualAnalysis = null;

    if (!pending || !selectedFile) {
      this.manualSelectionMessage = '';
      return;
    }

    this.setAnalyzingStatus(pending.audioId, true);
    try {
      this.manualSelectionMessage = '';
      await this.processAudioAnalysis(pending.audioId, selectedFile, selectedFile.name || pending.suggestedFileName);
    } catch (error) {
      this.manualSelectionMessage = this.resolveAudioAnalyzeErrorMessage(error, true);
    } finally {
      this.setAnalyzingStatus(pending.audioId, false);
      input.value = '';
    }
  }

  goToSummaries(audio: AudioEntity): void {
    this.router.navigate(['/summaries'], { queryParams: { audioId: audio._id } });
  }

  goToAiAnalysis(audio: AudioEntity): void {
    this.router.navigate(['/ai-analysis'], { queryParams: { audioId: audio._id } });
  }

  isPlayableUrl(filePath: string): boolean {
    if (!filePath) return false;
    const trimmed = filePath.trim();
    return trimmed.startsWith('http://')
      || trimmed.startsWith('https://')
      || trimmed.startsWith('blob:')
      || trimmed.startsWith('data:')
      || trimmed.startsWith('/');
  }

  getAudioUrl(filePath: string): string {
    return this.audioDownloader.resolveAudioCandidates(filePath)[0] ?? this.audioDownloader.resolveAudioUrl(filePath);
  }

  private async processAudioAnalysis(audioId: string, audioBlob: Blob, fileName: string): Promise<void> {
    const rawAiResult = await firstValueFrom(this.audioWorkflow.analyzeAudio(audioBlob, fileName));
    const transcriptionText = this.audioWorkflow.extractTranscriptionText(rawAiResult) || `Transcripción automática de ${fileName}`;
    const structuredPrompt = this.audioWorkflow.buildProfessionalAnalysisPrompt(transcriptionText);
    const professionalAiResult = await firstValueFrom(
      this.audioWorkflow.analyzeText(structuredPrompt).pipe(
        catchError(() => of(rawAiResult)),
      ),
    );

    const transcription = await firstValueFrom(this.state.createTranscription({
      audioId,
      text: transcriptionText,
      timestamps: [],
    }));

    if (!transcription._id) {
      throw new Error('No se pudo crear la transcripción para el audio.');
    }

    const analysis = await firstValueFrom(this.state.createAnalysis({
      transcriptionId: transcription._id,
      result: this.buildAnalysisResult(professionalAiResult, rawAiResult),
    }));

    await firstValueFrom(this.analysisArtifacts.createProfessionalArtifacts({
      audioId,
      audioFileName: fileName,
      transcriptionId: transcription._id,
      transcriptionText,
      analysis,
    }));

    this.state.refreshAllData();
  }

  private buildAnalysisResult(aiResult: MindvoiceAnalyzeResponse, fallback: MindvoiceAnalyzeResponse): AnalysisResult {
    const summary = aiResult.executive_summary?.join('\n\n')
      || aiResult.report_ready_text
      || fallback.executive_summary?.join('\n\n')
      || fallback.report_ready_text
      || 'Analisis generado';
    const themes = (aiResult.tags && aiResult.tags.length > 0) ? aiResult.tags : (fallback.tags || []);
    const tasks = (aiResult.task_list && aiResult.task_list.length > 0) ? aiResult.task_list : (fallback.task_list || []);
    const sentiment = aiResult.sentiment || fallback.sentiment;

    return {
      resumen: summary,
      temas: themes,
      acciones: tasks.map((task) => ({
        accion: task.task || '',
        prioridad: task.priority || 'media',
      })).filter((item) => item.accion.trim().length > 0),
      sentimiento: sentiment,
    };
  }

  private setAnalyzingStatus(audioId: string, isAnalyzing: boolean): void {
    const current = new Set(this.analyzingAudioIds$.value);
    if (isAnalyzing) {
      current.add(audioId);
    } else {
      current.delete(audioId);
    }
    this.analyzingAudioIds$.next(current);
  }

  private requestManualAudioSelection(audioId: string, filePath: string): void {
    this.pendingManualAnalysis = {
      audioId,
      suggestedFileName: filePath.split('/').pop() || 'audio.wav',
    };
    this.manualSelectionMessage = 'No se encontró el archivo en el servidor. Selecciona el audio local para analizarlo.';
    const input = this.manualAudioInput?.nativeElement;
    if (!input) {
      return;
    }
    input.value = '';
    input.click();
  }

  private requiresLocalFileSelection(filePath: string): boolean {
    const trimmed = filePath.trim().toLowerCase();
    if (!trimmed) {
      return true;
    }
    return !trimmed.startsWith('http://')
      && !trimmed.startsWith('https://')
      && !trimmed.startsWith('/')
      && !trimmed.startsWith('blob:')
      && !trimmed.startsWith('data:');
  }

  private isDownloadFailure(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }
    return error.status === 404 || error.status === 401 || error.status === 0;
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.name === 'TimeoutError';
  }

  private isGeminiQuotaError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && (error.status === 429 || error.status === 402)) {
      return true;
    }

    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

    const message = rawMessage.toLowerCase();
    return message.includes('gemini_quota_exceeded')
      || message.includes('quota')
      || message.includes('resource_exhausted')
      || message.includes('rate limit')
      || message.includes('billing')
      || message.includes('insufficient credits')
      || message.includes('payment required');
  }

  private resolveAudioAnalyzeErrorMessage(error: unknown, fromManualSelection: boolean): string {
    if (this.isTimeoutError(error)) {
      return 'El análisis tardó demasiado. El servidor de IA sigue procesando; vuelve a intentar en un momento.';
    }

    if (this.isMissingAiApiKeyError(error)) {
      return 'Falta configurar la API key de IA. Define OPENROUTER_API_KEY (o GEMINI_API_KEY) para analizar audio.';
    }

    if (this.isInvalidOpenRouterApiKeyError(error)) {
      return 'La API key de OpenRouter es inválida o no tiene permisos. Actualiza OPENROUTER_API_KEY o usa GEMINI_API_KEY.';
    }

    if (this.isGeminiQuotaError(error)) {
      return 'Tu proveedor de IA no tiene cuota/crédito disponible. Activa facturación o usa otra API key.';
    }

    if (fromManualSelection) {
      return 'No se pudo analizar el archivo seleccionado. Verifica el formato e intenta de nuevo.';
    }

    return 'No se pudo analizar este audio en este momento. Intenta de nuevo en unos segundos.';
  }

  private isMissingAiApiKeyError(error: unknown): boolean {
    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
    return rawMessage.toLowerCase().includes('ai_api_key_missing');
  }

  private isInvalidOpenRouterApiKeyError(error: unknown): boolean {
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

  private async tryAnalyzeFromExistingTranscription(audioId: string): Promise<boolean> {
    const transcriptions = await firstValueFrom(this.state.transcriptions$);
    const analyses = await firstValueFrom(this.state.analyses$);

    const candidates = (transcriptions || [])
      .filter((item) => item.audioId === audioId && !!item._id && item.text.trim().length > 0)
      .sort((a, b) => {
        const first = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const second = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return second - first;
      });

    const latest = candidates[0];
    if (!latest?._id) {
      return false;
    }

    const alreadyAnalyzed = (analyses || []).some((analysis) => analysis.transcriptionId === latest._id);
    if (alreadyAnalyzed) {
      this.manualSelectionMessage = 'Ya existe un análisis IA para este audio. Se reutilizó directamente.';
      return true;
    }

    await firstValueFrom(this.audioWorkflow.generateAndSaveAnalysis({
      _id: latest._id,
      text: latest.text,
    }));
    this.state.refreshAllData();
    this.manualSelectionMessage = 'Se reutilizó la transcripción guardada para generar el análisis IA sin volver a subir audio.';
    return true;
  }
}
