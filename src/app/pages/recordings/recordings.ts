import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  AiAnalysisEntity,
  AudioEntity,
  AudioWorkflowService,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { WorkflowEventsService } from '../../core/services/workflow-events.service';
import { StateManagementService } from '../../core/services/state-management.service';

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
    <div class="p-8 max-w-[1250px] mx-auto w-full space-y-6">
      <section class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-3xl font-black text-white">Grabaciones</h1>
          <p class="text-gray-400">Repositorio de audios conectados a transcripciones, análisis y resúmenes IA.</p>
        </div>
        <button
          type="button"
          class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-300 hover:bg-border-dark/70 transition-colors"
          (click)="loadData()"
          [disabled]="loading"
        >
          <span class="inline-flex items-center gap-2">
            <mat-icon class="text-lg" [class.animate-spin]="loading">refresh</mat-icon>
            Recargar
          </span>
        </button>
      </section>

      @if (errorMessage) {
        <section class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {{ errorMessage }}
        </section>
      }

      @if (successMessage) {
        <section class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {{ successMessage }}
        </section>
      }

      <section class="rounded-xl border border-white/10 bg-surface-dark p-5 space-y-4">
        @if (loading && rows.length === 0) {
          <p class="text-sm text-gray-400">Cargando grabaciones...</p>
        }

        @if (loading && rows.length > 0) {
          <p class="text-xs text-gray-500">Actualizando datos...</p>
        }

        @if (!loading && rows.length === 0) {
          <p class="text-sm text-gray-400">No hay grabaciones disponibles.</p>
        }

        @if (rows.length > 0) {
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
                  <audio [src]="row.audio.filePath" controls class="w-full"></audio>
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
export class RecordingsComponent implements OnInit, OnDestroy {
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly workflowEvents = inject(WorkflowEventsService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly state = inject(StateManagementService);
  private readonly destroy$ = new Subject<void>();
  private loadRequestId = 0;

  loading = false;
  private loadingAudios = false;
  private loadingTranscriptions = false;
  private loadingAnalyses = false;
  errorMessage = '';
  successMessage = '';

  rows: RecordingRow[] = [];
  private analyzingAudioIds = new Set<string>();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadData();
    this.workflowEvents.changed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(resetMessages = true): void {
    const requestId = ++this.loadRequestId;

    if (resetMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
    this.loadingAudios = true;
    this.loadingTranscriptions = true;
    this.loadingAnalyses = true;
    this.refreshLoadingState();

    let audios: AudioEntity[] = [];
    let transcriptions: TranscriptionEntity[] = [];
    let analyses: AiAnalysisEntity[] = [];

    const updateRows = () => {
      this.rows = this.buildRows(audios, transcriptions, analyses);
    };

    this.audioWorkflow.listAudios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          audios = value;
          updateRows();
          this.loadingAudios = false;
          this.refreshLoadingState();
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.loadingAudios = false;
          this.refreshLoadingState();
          this.errorMessage = this.extractErrorMessage(error);
        },
      });

    this.audioWorkflow.listTranscriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          transcriptions = value;
          updateRows();
          this.loadingTranscriptions = false;
          this.refreshLoadingState();
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.loadingTranscriptions = false;
          this.refreshLoadingState();
          this.errorMessage = this.extractErrorMessage(error);
        },
      });

    this.audioWorkflow.listAnalyses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          analyses = value;
          updateRows();
          this.loadingAnalyses = false;
          this.refreshLoadingState();
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.loadingAnalyses = false;
          this.refreshLoadingState();
          this.errorMessage = this.extractErrorMessage(error);
        },
      });
  }

  analyzeAudio(audio: AudioEntity): void {
    if (!audio._id) return;

    const audioId = audio._id;
    this.analyzingAudioIds.add(audioId);
    this.updateRowAnalyzingState(audioId, true);

    const row = this.rows.find(r => r.audio._id === audioId);
    if (!row) return;

    this.audioWorkflow.analyzeAudio(new Blob(), audio.filePath)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (aiResult) => {
          const transcriptionText = this.audioWorkflow.extractTranscriptionText(aiResult);
          
          this.state.createTranscription({
            audioId,
            text: transcriptionText,
            timestamps: [],
          })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (transcription) => {
                this.state.createAnalysis({
                  transcriptionId: transcription._id || '',
                  result: {
                    resumen: aiResult.executive_summary?.join('\n\n') || 'Análisis generado',
                    temas: aiResult.tags || [],
                    acciones: (aiResult.task_list || []).map((t: any) => ({
                      accion: t.task || '',
                      prioridad: t.priority || 'media',
                    })),
                    sentimiento: aiResult.sentiment,
                  },
                })
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: () => {
                      this.successMessage = `Audio "${audio.filePath}" analizado exitosamente`;
                      this.analyzingAudioIds.delete(audioId);
                      this.updateRowAnalyzingState(audioId, false);
                      this.loadData(false);
                    },
                    error: (err: any) => {
                      this.errorMessage = 'Error al crear análisis: ' + this.extractErrorMessage(err);
                      this.analyzingAudioIds.delete(audioId);
                      this.updateRowAnalyzingState(audioId, false);
                    },
                  });
              },
              error: (err: any) => {
                this.errorMessage = 'Error al crear transcripción: ' + this.extractErrorMessage(err);
                this.analyzingAudioIds.delete(audioId);
                this.updateRowAnalyzingState(audioId, false);
              },
            });
        },
        error: (err: any) => {
          this.errorMessage = 'Error al analizar audio: ' + this.extractErrorMessage(err);
          this.analyzingAudioIds.delete(audioId);
          this.updateRowAnalyzingState(audioId, false);
        },
      });
  }

  private updateRowAnalyzingState(audioId: string, isAnalyzing: boolean): void {
    const row = this.rows.find(r => r.audio._id === audioId);
    if (row) {
      row.isAnalyzing = isAnalyzing;
      this.cdr.detectChanges();
    }
  }

  goToSummaries(audio: AudioEntity): void {
    const audioId = audio._id ?? '';
    void this.router.navigate(['/summaries'], { queryParams: { audioId } });
  }

  goToAiAnalysis(audio: AudioEntity): void {
    const audioId = audio._id ?? '';
    void this.router.navigate(['/ai-analysis'], { queryParams: { audioId } });
  }

  isPlayableUrl(filePath: string): boolean {
    const normalized = filePath.trim().toLocaleLowerCase();
    return normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/');
  }

  private buildRows(
    audios: AudioEntity[],
    transcriptions: TranscriptionEntity[],
    analyses: AiAnalysisEntity[],
  ): RecordingRow[] {
    const transcriptionsByAudio = new Map<string, TranscriptionEntity[]>();
    transcriptions.forEach((transcription) => {
      const current = transcriptionsByAudio.get(transcription.audioId) ?? [];
      transcriptionsByAudio.set(transcription.audioId, [...current, transcription]);
    });

    const analysesByTranscription = new Map<string, AiAnalysisEntity[]>();
    analyses.forEach((analysis) => {
      const current = analysesByTranscription.get(analysis.transcriptionId) ?? [];
      analysesByTranscription.set(analysis.transcriptionId, [...current, analysis]);
    });

    return audios.map((audio) => {
      const audioId = audio._id ?? '';
      const audioTranscriptions = audioId ? (transcriptionsByAudio.get(audioId) ?? []) : [];
      const audioAnalyses: AiAnalysisEntity[] = [];

      audioTranscriptions.forEach((transcription) => {
        const transcriptionId = transcription._id ?? '';
        if (!transcriptionId) {
          return;
        }
        const byTranscription = analysesByTranscription.get(transcriptionId) ?? [];
        audioAnalyses.push(...byTranscription);
      });

      return {
        audio,
        transcriptions: audioTranscriptions,
        analyses: audioAnalyses,
        isAnalyzing: this.analyzingAudioIds.has(audioId),
      };
    });
  }

  private extractErrorMessage(error: HttpErrorResponse | any): string {
    const message = error?.error?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (error.status === 401) {
      return 'Sesión expirada. Inicia sesión nuevamente.';
    }

    if (error.status === 0) {
      return 'No se pudo conectar con la API.';
    }

    return 'No se pudieron cargar las grabaciones.';
  }

  private refreshLoadingState(): void {
    this.loading = this.loadingAudios || this.loadingTranscriptions || this.loadingAnalyses;
    this.cdr.detectChanges();
  }
}
