import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil } from 'rxjs';
import {
  AudioEntity,
  TranscriptionEntity,
  AiAnalysisEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';

interface SummaryDisplay {
  audio?: AudioEntity;
  transcription?: TranscriptionEntity;
  analysis?: AiAnalysisEntity;
}

type SearchFilter = 'all' | 'audio' | 'transcription' | 'analysis';

@Component({
  selector: 'app-summaries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1400px] mx-auto w-full space-y-6">
      <!-- Header -->
      <section class="rounded-2xl bg-gradient-to-br from-blue-500/20 via-surface-dark/90 to-cyan-900/20 border border-blue-500/30 p-6 space-y-4 backdrop-blur-sm">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-4xl font-black text-white">Resúmenes Ejecutivos</h1>
            <p class="text-gray-300 text-sm">Ingesta de audio, transcripciones, análisis IA y generación de documentos estructurados.</p>
          </div>
          <button
            type="button"
            class="h-11 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 border border-blue-400/40 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300"
            (click)="refreshData()"
            [disabled]="(loading$ | async)"
          >
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
              {{ (loading$ | async) ? 'Cargando...' : 'Recargar' }}
            </span>
          </button>
        </div>
      </section>

      @if (error$ | async) {
        <section class="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-rose-500/10 p-4 text-sm text-rose-200 backdrop-blur-sm">
          {{ error$ | async }}
        </section>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Sidebar: Audio Upload & Recording -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Audio Upload Card -->
          <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <mat-icon class="text-blue-400">upload_file</mat-icon>
              Cargar Audio
            </h2>
            
            <div class="space-y-3">
              <div 
                class="border-2 border-dashed border-blue-500/30 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500/60 transition-colors"
                (click)="audioFileInput.click()"
              >
                <mat-icon class="text-4xl text-blue-400 mx-auto mb-2">audio_file</mat-icon>
                <p class="text-sm text-gray-300">Arrastra aquí o haz clic para seleccionar</p>
                <p class="text-xs text-gray-500 mt-1">MP3, WAV, M4A (máx. 100MB)</p>
              </div>
              <input 
                #audioFileInput 
                type="file" 
                accept="audio/*" 
                style="display: none"
                (change)="onAudioSelected($event)"
              />
              @if (selectedAudioFile) {
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p class="text-sm text-blue-300 truncate">✓ {{ selectedAudioFile.name }}</p>
                </div>
              }
              <button
                type="button"
                class="w-full h-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50"
                (click)="uploadAudio()"
                [disabled]="!selectedAudioFile || (loading$ | async)"
              >
                Subir Audio
              </button>
            </div>
          </section>

          <!-- Recording Card -->
          <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <mat-icon class="text-red-400">mic</mat-icon>
              Grabar Pensamiento
            </h2>
            
            <div class="space-y-3">
              @if (!isRecording) {
                <button
                  type="button"
                  class="w-full h-10 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-sm font-semibold text-white hover:shadow-lg transition-all"
                  (click)="startRecording()"
                >
                  Iniciar Grabación
                </button>
              } @else {
                <div class="space-y-2">
                  <button
                    type="button"
                    class="w-full h-10 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 text-sm font-semibold text-white hover:shadow-lg transition-all"
                    (click)="stopRecording()"
                  >
                    Detener ({{ recordingTime }}s)
                  </button>
                  <button
                    type="button"
                    class="w-full h-10 rounded-lg bg-gray-700 text-sm font-semibold text-gray-300 hover:bg-gray-600 transition-all"
                    (click)="cancelRecording()"
                  >
                    Cancelar
                  </button>
                </div>
              }
              @if (recordedBlobUrl) {
                <audio [src]="recordedBlobUrl" controls class="w-full rounded-lg"></audio>
                <button
                  type="button"
                  class="w-full h-10 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-sm font-semibold text-white hover:shadow-lg transition-all"
                  (click)="uploadRecordedAudio()"
                  [disabled]="(loading$ | async)"
                >
                  Subir Grabación
                </button>
              }
            </div>
          </section>

          <!-- Stats Card -->
          <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
            <h2 class="text-lg font-bold text-white">Estadísticas</h2>
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-lg border border-white/10 bg-background-dark p-3">
                <p class="text-xs text-gray-400">Audios</p>
                <p class="text-xl font-bold text-white">{{ (audios$ | async)?.length || 0 }}</p>
              </div>
              <div class="rounded-lg border border-white/10 bg-background-dark p-3">
                <p class="text-xs text-gray-400">Transcripciones</p>
                <p class="text-xl font-bold text-white">{{ (transcriptions$ | async)?.length || 0 }}</p>
              </div>
              <div class="rounded-lg border border-white/10 bg-background-dark p-3">
                <p class="text-xs text-gray-400">Análisis</p>
                <p class="text-xl font-bold text-white">{{ (analyses$ | async)?.length || 0 }}</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Main Content: Summaries List -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Search & Filters -->
          <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
            <h2 class="text-lg font-bold text-white">Filtros y Búsqueda</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label for="summary-search" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buscar</label>
                <input
                  id="summary-search"
                  type="text"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="onFiltersChanged()"
                  class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
                  placeholder="Título, etiqueta o ID..."
                />
              </div>

              <div class="space-y-1">
                <label for="summary-filter" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tipo
                </label>
                <select
                  id="summary-filter"
                  [(ngModel)]="typeFilter"
                  (ngModelChange)="onFiltersChanged()"
                  class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
                >
                  <option value="all">Todos</option>
                  <option value="audio">Solo Audios</option>
                  <option value="transcription">Solo Transcripciones</option>
                  <option value="analysis">Solo Análisis</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Summaries Grid -->
          <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
            @if ((loading$ | async)) {
              <p class="text-sm text-gray-400 text-center py-12">Cargando resúmenes...</p>
            } @else if (pagedSummaries.length === 0) {
              <p class="text-sm text-gray-400 text-center py-12">No hay resúmenes disponibles. Comienza cargando un audio.</p>
            } @else {
              <div class="space-y-4">
                @for (summary of pagedSummaries; track getSummaryId(summary)) {
                  <div class="rounded-lg border border-border-dark bg-background-dark/50 p-5 hover:border-primary/40 transition-all space-y-4">
                    <!-- Summary Header -->
                    <div class="flex justify-between items-start gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                          @if (summary.analysis && summary.analysis.result.resumen) {
                            <mat-icon class="text-lg text-blue-400">auto_awesome</mat-icon>
                            <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Análisis IA</span>
                          } @else if (summary.transcription) {
                            <mat-icon class="text-lg text-cyan-400">description</mat-icon>
                            <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Transcripción</span>
                          } @else {
                            <mat-icon class="text-lg text-purple-400">graphic_eq</mat-icon>
                            <span class="text-xs font-bold text-purple-400 uppercase tracking-wider">Audio</span>
                          }
                        </div>
                        <h3 class="text-lg font-semibold text-white truncate">
                          {{ getSummaryTitle(summary) }}
                        </h3>
                        <p class="text-xs text-gray-500 mt-1">
                          {{ getSummaryDetails(summary) }}
                        </p>
                      </div>

                      <div class="flex gap-2">
                        @if (summary.audio) {
                          <button
                            type="button"
                            class="p-2 rounded-md text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                            (click)="playAudio(summary.audio!)"
                            title="Reproducir audio"
                          >
                            <mat-icon>play_circle</mat-icon>
                          </button>
                        }
                        @if (summary.transcription && !summary.analysis) {
                          <button
                            type="button"
                            class="p-2 rounded-md text-blue-300 hover:bg-blue-500/10 transition-colors"
                            (click)="generateAnalysis(summary.transcription!)"
                            title="Generar análisis IA"
                          >
                            <mat-icon>psychology</mat-icon>
                          </button>
                        }
                        @if (summary.analysis) {
                          <button
                            type="button"
                            class="p-2 rounded-md text-green-300 hover:bg-green-500/10 transition-colors"
                            (click)="exportToDocument(summary)"
                            title="Exportar documento"
                          >
                            <mat-icon>download</mat-icon>
                          </button>
                        }
                        <button
                          type="button"
                          class="p-2 rounded-md text-rose-300 hover:bg-rose-500/10 transition-colors"
                          (click)="deleteSummary(summary)"
                          title="Eliminar"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Summary Content Preview -->
                    @if (summary.analysis && summary.analysis.result.resumen) {
                      <div class="space-y-3">
                        <p class="text-sm text-gray-300 leading-relaxed line-clamp-3">{{ summary.analysis.result.resumen }}</p>
                        
                        @if (summary.analysis.result.temas && summary.analysis.result.temas.length > 0) {
                          <div class="flex flex-wrap gap-2">
                            @for (tema of summary.analysis.result.temas.slice(0, 3); track tema) {
                              <span class="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full font-medium border border-blue-500/20">
                                #{{ tema }}
                              </span>
                            }
                            @if (summary.analysis.result.temas.length > 3) {
                              <span class="text-xs text-gray-500">+{{ summary.analysis.result.temas.length - 3 }} más</span>
                            }
                          </div>
                        }

                        @if (summary.analysis.result.acciones && summary.analysis.result.acciones.length > 0) {
                          <div class="bg-white/5 rounded-lg p-3 border border-white/5">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Acciones Detectadas</p>
                            <ul class="space-y-1">
                              @for (accion of summary.analysis.result.acciones.slice(0, 2); track accion.accion) {
                                <li class="flex items-start gap-2 text-xs text-gray-300">
                                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                                  <span class="line-clamp-1">{{ accion.accion }} ({{ accion.prioridad }})</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }
                      </div>
                    } @else if (summary.transcription) {
                      <p class="text-sm text-gray-400 line-clamp-2">{{ summary.transcription.text }}</p>
                    } @else if (summary.audio) {
                      <p class="text-sm text-gray-500">Audio: {{ summary.audio.duration }}s</p>
                    }
                  </div>
                }
              </div>

              <!-- Pagination -->
              <div class="pt-4 flex items-center justify-between text-sm text-gray-400 border-t border-white/5">
                <span>Página {{ currentPage }} de {{ totalPages }}</span>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="h-9 px-3 rounded-lg border border-border-dark hover:bg-border-dark/70 disabled:opacity-40"
                    (click)="previousPage()"
                    [disabled]="currentPage <= 1"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    class="h-9 px-3 rounded-lg border border-border-dark hover:bg-border-dark/70 disabled:opacity-40"
                    (click)="nextPage()"
                    [disabled]="currentPage >= totalPages"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            }
          </section>
        </div>
      </div>

      <!-- Audio Player (hidden) -->
      <audio #audioPlayer style="display: none;"></audio>
    </div>
  `,
})
export class SummariesComponent implements OnInit, OnDestroy {
  @ViewChild('audioPlayer') audioPlayer?: ElementRef<HTMLAudioElement>;

  private readonly state = inject(StateManagementService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  loading$: Observable<boolean> = this.state.loading$;
  error$: Observable<string | null> = this.state.error$;

  audios$: Observable<AudioEntity[]> = this.state.audios$;
  transcriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$;
  analyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$;

  searchTerm = '';
  typeFilter: SearchFilter = 'all';
  currentPage = 1;
  readonly pageSize = 6;

  selectedAudioFile: File | null = null;
  isRecording = false;
  recordingTime = 0;
  recordedBlobUrl: string | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingInterval: any;
  private allAudios: AudioEntity[] = [];
  private allTranscriptions: TranscriptionEntity[] = [];
  private allAnalyses: AiAnalysisEntity[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.audios$.pipe(takeUntil(this.destroy$)).subscribe((audios) => {
      this.allAudios = audios;
      this.currentPage = 1;
      this.cdr.markForCheck();
    });

    this.transcriptions$.pipe(takeUntil(this.destroy$)).subscribe((transcriptions) => {
      this.allTranscriptions = transcriptions;
      this.cdr.markForCheck();
    });

    this.analyses$.pipe(takeUntil(this.destroy$)).subscribe((analyses) => {
      this.allAnalyses = analyses;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.isRecording) {
      this.cancelRecording();
    }
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.selectedAudioFile = files[0];
    }
  }

  uploadAudio(): void {
    if (!this.selectedAudioFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.state.createAudio({
        filePath: this.selectedAudioFile!.name,
        duration: 0,
        format: this.selectedAudioFile!.type,
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.selectedAudioFile = null;
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Error uploading audio:', err),
        });
    };
    reader.readAsDataURL(this.selectedAudioFile);
  }

  startRecording(): void {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingChunks = [];
      this.recordingTime = 0;
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        this.recordingChunks.push(event.data);
      };

      this.mediaRecorder.start();

      this.recordingInterval = setInterval(() => {
        this.recordingTime++;
      }, 1000);
    });
  }

  stopRecording(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
      this.recordedBlobUrl = URL.createObjectURL(blob);
      this.isRecording = false;
      clearInterval(this.recordingInterval);
      this.cdr.markForCheck();
    };

    this.mediaRecorder.stop();
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    this.isRecording = false;
    this.recordingTime = 0;
    this.recordedBlobUrl = null;
    clearInterval(this.recordingInterval);
  }

  uploadRecordedAudio(): void {
    if (!this.recordedBlobUrl) return;

    this.state.createAudio({
      filePath: `recording-${Date.now()}.webm`,
      duration: this.recordingTime,
      format: 'audio/webm',
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recordedBlobUrl = null;
          this.recordingTime = 0;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Error uploading recording:', err),
      });
  }

  playAudio(audio: AudioEntity): void {
    if (this.audioPlayer && audio.filePath) {
      this.audioPlayer.nativeElement.src = audio.filePath;
      this.audioPlayer.nativeElement.play();
    }
  }

  generateAnalysis(transcription: TranscriptionEntity): void {
    this.state.createAnalysis({
      transcriptionId: transcription._id || '',
      result: {
        resumen: 'Análisis en progreso...',
        temas: [],
        acciones: [],
      },
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cdr.markForCheck(),
        error: (err) => console.error('Error generating analysis:', err),
      });
  }

  exportToDocument(summary: SummaryDisplay): void {
    if (!summary.analysis) return;

    const content = `
RESUMEN EJECUTIVO
=================
${summary.analysis.result.resumen}

TEMAS IDENTIFICADOS
===================
${(summary.analysis.result.temas || []).map((t) => `- ${t}`).join('\n')}

ACCIONES RECOMENDADAS
====================
${(summary.analysis.result.acciones || []).map((a) => `- ${a.accion} (${a.prioridad})`).join('\n')}

SENTIMIENTO
===========
${summary.analysis.result.sentimiento || 'No clasificado'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${summary.analysis._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteSummary(summary: SummaryDisplay): void {
    if (summary.analysis && summary.analysis._id) {
      if (confirm('¿Eliminar este análisis?')) {
        this.state.deleteAnalysis(summary.analysis._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    } else if (summary.transcription && summary.transcription._id) {
      if (confirm('¿Eliminar esta transcripción?')) {
        this.state.deleteTranscription(summary.transcription._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    } else if (summary.audio && summary.audio._id) {
      if (confirm('¿Eliminar este audio?')) {
        this.state.deleteAudio(summary.audio._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    }
  }

  get summaries(): SummaryDisplay[] {
    const items: SummaryDisplay[] = [];

    for (const analysis of this.allAnalyses) {
      const transcription = this.allTranscriptions.find((t) => t._id === analysis.transcriptionId);
      const audio = transcription
        ? this.allAudios.find((a) => a._id === transcription.audioId)
        : undefined;

      items.push({
        audio,
        transcription,
        analysis,
      });
    }

    for (const transcription of this.allTranscriptions) {
      if (!this.allAnalyses.some((a) => a.transcriptionId === transcription._id)) {
        const audio = this.allAudios.find((a) => a._id === transcription.audioId);
        items.push({
          audio,
          transcription,
        });
      }
    }

    for (const audio of this.allAudios) {
      if (!this.allTranscriptions.some((t) => t.audioId === audio._id)) {
        items.push({
          audio,
        });
      }
    }

    return items;
  }

  get filteredSummaries(): SummaryDisplay[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.summaries.filter((item) => {
      if (this.typeFilter === 'analysis' && !item.analysis) return false;
      if (this.typeFilter === 'transcription' && !item.transcription) return false;
      if (this.typeFilter === 'audio' && !item.audio) return false;

      if (!term) return true;

      const title = this.getSummaryTitle(item).toLowerCase();
      const details = this.getSummaryDetails(item).toLowerCase();

      return title.includes(term) || details.includes(term);
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSummaries.length / this.pageSize));
  }

  get pagedSummaries(): SummaryDisplay[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSummaries.slice(start, start + this.pageSize);
  }

  getSummaryId(summary: SummaryDisplay): string {
    return summary.analysis?._id || summary.transcription?._id || summary.audio?._id || '';
  }

  getSummaryTitle(summary: SummaryDisplay): string {
    if (summary.analysis) {
      return `Análisis: ${summary.analysis.result.resumen.substring(0, 50)}...`;
    }
    if (summary.transcription) {
      return `Transcripción: ${summary.transcription.text.substring(0, 50)}...`;
    }
    if (summary.audio) {
      return `Audio: ${summary.audio.filePath}`;
    }
    return 'Sin título';
  }

  getSummaryDetails(summary: SummaryDisplay): string {
    const parts: string[] = [];

    if (summary.audio) {
      parts.push(`Audio: ${summary.audio.filePath}`);
    }
    if (summary.transcription) {
      parts.push(`Transcripción: ${summary.transcription._id || ''}`);
    }
    if (summary.analysis) {
      parts.push(`Análisis: ${summary.analysis._id || ''}`);
      if (summary.analysis.result.temas?.length) {
        parts.push(`Temas: ${summary.analysis.result.temas.join(', ')}`);
      }
    }

    return parts.join(' · ');
  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.ensurePaginationBounds();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  private ensurePaginationBounds(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }
}
