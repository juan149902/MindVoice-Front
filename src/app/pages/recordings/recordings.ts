import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {
  AiAnalysisEntity,
  AudioEntity,
  AudioWorkflowService,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { WorkflowEventsService } from '../../core/services/workflow-events.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { AudioDownloaderService } from '../../core/services/audio-downloader.service';

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
        <section class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {{ error$ | async }}
        </section>
      }

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
  private readonly state = inject(StateManagementService);
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly audioDownloader = inject(AudioDownloaderService);
  private readonly workflowEvents = inject(WorkflowEventsService);
  private readonly router = inject(Router);

  private analyzingAudioIds$ = new BehaviorSubject<Set<string>>(new Set());

  loading$ = this.state.loading$;
  error$ = this.state.error$;
  rows$!: Observable<RecordingRow[]>;

  ngOnInit(): void {
    // ✅ IMPORTANTE: Cargar datos ANTES de configurar observables
    this.state.refreshAllData();

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

    // Recargar cuando haya cambios
    this.workflowEvents.changed$
      .subscribe(() => this.state.refreshAllData());
  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  async analyzeAudio(audio: AudioEntity): Promise<void> {
    if (!audio._id || !audio.filePath) return;

    const audioId = audio._id;
    const current = this.analyzingAudioIds$.value;
    current.add(audioId);
    this.analyzingAudioIds$.next(new Set(current));

    try {
      // Download audio file as Blob
      const audioBlob = await this.audioDownloader.downloadAudioBlobPromise(audio.filePath);
      const fileName = audio.filePath.split('/').pop() || 'audio.wav';

      // Send to backend's /mindvoice-api/analyze/audio endpoint
      this.audioWorkflow.analyzeAudio(audioBlob, fileName).subscribe({
        next: (aiResult) => {
          const transcriptionText = this.audioWorkflow.extractTranscriptionText(aiResult);

          this.state.createTranscription({
            audioId,
            text: transcriptionText,
            timestamps: [],
          }).subscribe({
            next: (transcription) => {
              this.state.createAnalysis({
                transcriptionId: transcription._id || '',
                result: {
                  resumen: aiResult.executive_summary?.join('\n\n') || 'Análisis generado',
                  temas: aiResult.tags || [],
                  acciones: (aiResult.task_list || []).map(t => ({
                    accion: t.task || '',
                    prioridad: t.priority || 'media',
                  })),
                  sentimiento: aiResult.sentiment,
                },
              }).subscribe({
                next: () => {
                  const updated = this.analyzingAudioIds$.value;
                  updated.delete(audioId);
                  this.analyzingAudioIds$.next(new Set(updated));
                },
                error: () => {
                  const updated = this.analyzingAudioIds$.value;
                  updated.delete(audioId);
                  this.analyzingAudioIds$.next(new Set(updated));
                }
              });
            }
          });
        },
        error: (err) => {
          console.error('Error analyzing audio:', err);
          const updated = this.analyzingAudioIds$.value;
          updated.delete(audioId);
          this.analyzingAudioIds$.next(new Set(updated));
        }
      });
    } catch (error) {
      console.error('Error downloading audio:', error);
      const updated = this.analyzingAudioIds$.value;
      updated.delete(audioId);
      this.analyzingAudioIds$.next(new Set(updated));
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
}
