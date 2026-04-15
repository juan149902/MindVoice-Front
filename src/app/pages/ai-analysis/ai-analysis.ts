import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil, map, firstValueFrom } from 'rxjs';
import {
  AiAnalysisEntity,
  AudioEntity,
  AudioWorkflowService,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { PdfReportService } from '../../core/services/pdf-report.service';
import { AppPreferencesService } from '../../core/services/app-preferences.service';
import { ResourceApiService } from '../../core/services/resource-api.service';

interface AnalysisRow {
  analysisId: string;
  audioId: string;
  transcriptionId: string;
  audioName: string;
  resumen: string;
  sentimiento: string;
  tags: string[];
  actionsCount: number;
  createdAt: string;
  // Rich document fields from backend
  title: string;
  executiveSummary: string[];
  keyInsights: string[];
  taskList: { task: string; priority: string }[];
  reportReadyText: string;
  transcriptionText: string;
  transcriptionWithTimestamps: { start: string; end: string; text: string }[];
  semanticKeywords: string[];
}

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1300px] mx-auto w-full space-y-6 premium-page-shell">
      <!-- Header with gradient background -->
      <section class="premium-page-hero rounded-2xl bg-gradient-to-br from-primary/20 via-surface-dark/90 to-violet-900/20 border border-primary/30 p-6 space-y-4 backdrop-blur-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-2">
            <h1 class="text-4xl font-black text-white">{{ t('aiAnalysis.title') }}</h1>
            <p class="text-gray-300 text-sm">{{ t('aiAnalysis.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="h-11 px-5 rounded-lg bg-gradient-to-r from-primary to-primary-hover border border-primary/40 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300"
            (click)="refreshData()"
            [disabled]="(loading$ | async) || processingTranscriptionId.length > 0"
          >
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
              {{ (loading$ | async) ? t('common.loading') : t('common.reload') }}
            </span>
          </button>
        </div>
      </section>

      @if (error$ | async) {
        <section class="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-rose-500/10 p-4 text-sm text-rose-200 backdrop-blur-sm">
          {{ error$ | async }}
        </section>
      }

      @if (successMessage) {
        <section class="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 p-4 text-sm text-emerald-200 backdrop-blur-sm">
          {{ successMessage }}
        </section>
      }

      <!-- Stats Cards -->
      <section class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <article class="rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/30 p-5 space-y-2 hover:border-sky-400/50 transition-all duration-300">
          <p class="text-xs text-sky-300 uppercase tracking-wider font-semibold">{{ t('aiAnalysis.statsAnalyses') }}</p>
          <p class="text-3xl font-black text-sky-100">{{ (analyses$ | async)?.length ?? 0 }}</p>
          <div class="h-1 w-16 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full"></div>
        </article>
        <article class="rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/30 p-5 space-y-2 hover:border-violet-400/50 transition-all duration-300">
          <p class="text-xs text-violet-300 uppercase tracking-wider font-semibold">{{ t('aiAnalysis.statsTranscriptions') }}</p>
          <p class="text-3xl font-black text-violet-100">{{ (transcriptions$ | async)?.length ?? 0 }}</p>
          <div class="h-1 w-16 bg-gradient-to-r from-violet-400 to-violet-500 rounded-full"></div>
        </article>
        <article class="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 p-5 space-y-2 hover:border-amber-400/50 transition-all duration-300">
          <p class="text-xs text-amber-300 uppercase tracking-wider font-semibold">{{ t('aiAnalysis.statsAudios') }}</p>
          <p class="text-3xl font-black text-amber-100">{{ (audios$ | async)?.length ?? 0 }}</p>
          <div class="h-1 w-16 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
        </article>
        <article class="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 p-5 space-y-2 hover:border-emerald-400/50 transition-all duration-300">
          <p class="text-xs text-emerald-300 uppercase tracking-wider font-semibold">{{ t('aiAnalysis.statsActions') }}</p>
          <p class="text-3xl font-black text-emerald-100">{{ totalActions$ | async }}</p>
          <div class="h-1 w-16 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"></div>
        </article>
      </section>

      <!-- Filters Section -->
      <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
        <h2 class="text-lg font-bold text-white">{{ t('aiAnalysis.filters') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="space-y-1">
            <label for="analysis-search" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('aiAnalysis.searchLabel') }}</label>
            <input
              id="analysis-search"
              type="text"
              [(ngModel)]="searchTerm"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
              [placeholder]="t('aiAnalysis.searchPlaceholder')"
            />
          </div>

          <div class="space-y-1">
            <label for="analysis-tag" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('aiAnalysis.tagLabel') }}</label>
            <select
              id="analysis-tag"
              [(ngModel)]="selectedTag"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
            >
              <option value="all">{{ t('aiAnalysis.allTags') }}</option>
              @for (tag of availableTags; track tag) {
                <option [value]="tag">{{ tag }}</option>
              }
            </select>
          </div>

          <div class="space-y-1">
            <label for="analysis-sentiment" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('aiAnalysis.sentimentLabel') }}</label>
            <select
              id="analysis-sentiment"
              [(ngModel)]="selectedSentiment"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
            >
              <option value="all">{{ t('aiAnalysis.allSentiments') }}</option>
              @for (sentiment of availableSentiments; track sentiment) {
                <option [value]="sentiment">{{ sentiment }}</option>
              }
            </select>
          </div>

          <div class="space-y-1">
            <label for="analysis-audio" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ t('aiAnalysis.audioLabel') }}</label>
            <select
              id="analysis-audio"
              [(ngModel)]="selectedAudioId"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
            >
              <option value="all">{{ t('aiAnalysis.allAudios') }}</option>
              @for (audio of availableAudioOptions; track audio.id) {
                <option [value]="audio.id">{{ audio.label }}</option>
              }
            </select>
          </div>
        </div>
      </section>

      <!-- Analysis Cards -->
      @if ((loading$ | async)) {
        <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-8 text-center backdrop-blur-sm">
          <mat-icon class="text-4xl text-primary animate-spin mb-3">autorenew</mat-icon>
          <p class="text-sm text-gray-400">{{ t('aiAnalysis.loadingAnalyses') }}</p>
        </section>
      } @else if (filteredRows.length === 0) {
        <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-8 text-center backdrop-blur-sm">
          <mat-icon class="text-4xl text-gray-600 mb-3">search_off</mat-icon>
          <p class="text-sm text-gray-400">{{ t('aiAnalysis.noResults') }}</p>
        </section>
      } @else {
        <div class="space-y-6">
          @for (row of filteredRows; track row.analysisId) {
            <article class="rounded-xl border border-white/10 bg-surface-dark/80 backdrop-blur-sm overflow-hidden">
              <!-- Card Header -->
              <div class="bg-gradient-to-r from-violet-900/40 to-primary/20 border-b border-white/10 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 space-y-1">
                    <h3 class="text-xl font-bold text-white">{{ row.title }}</h3>
                    <p class="text-xs text-gray-400">
                      {{ row.audioName }} · {{ formatDate(row.createdAt) }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="h-9 px-4 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                      [disabled]="generatingDocId === row.analysisId"
                      (click)="generateDocument(row)">
                      <mat-icon class="text-base" [class.animate-spin]="generatingDocId === row.analysisId">
                        {{ generatingDocId === row.analysisId ? 'sync' : 'picture_as_pdf' }}
                      </mat-icon>
                      {{ generatingDocId === row.analysisId ? t('common.loading') : t('modal.generateDoc') }}
                    </button>
                    <button
                      type="button"
                      class="h-9 px-3 rounded-lg border border-white/15 text-xs text-gray-200 hover:bg-white/5 transition-colors inline-flex items-center gap-1.5"
                      (click)="toggleExpand(row.analysisId)"
                    >
                      <mat-icon class="text-base">{{ expandedId === row.analysisId ? 'expand_less' : 'expand_more' }}</mat-icon>
                      {{ expandedId === row.analysisId ? t('aiAnalysis.collapse') : t('aiAnalysis.expand') }}
                    </button>
                  </div>
                </div>
                <!-- Tags row -->
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-400/35 bg-sky-500/15 text-sky-200">
                    {{ row.sentimiento }}
                  </span>
                  @if (row.actionsCount > 0) {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-400/35 bg-amber-500/15 text-amber-200">
                      {{ row.actionsCount }} {{ t('aiAnalysis.actions') }}
                    </span>
                  }
                  @for (tag of row.tags.slice(0, 6); track tag) {
                    <span class="px-2.5 py-1 rounded-full text-[11px] border border-emerald-400/35 bg-emerald-500/10 text-emerald-200">
                      #{{ tag }}
                    </span>
                  }
                </div>
              </div>

              <!-- Expanded Full Document View -->
              @if (expandedId === row.analysisId) {
                <div class="p-6 space-y-6">
                  <!-- RESUMEN EJECUTIVO -->
                  @if (row.executiveSummary.length > 0) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-violet-500"></div>
                        <h4 class="text-sm font-bold text-violet-300 uppercase tracking-wider">Resumen Ejecutivo</h4>
                      </div>
                      <div class="rounded-lg bg-violet-500/5 border border-violet-500/20 p-4 space-y-3">
                        @for (paragraph of row.executiveSummary; track $index) {
                          <p class="text-sm text-gray-200 leading-relaxed">{{ paragraph }}</p>
                        }
                      </div>
                    </section>
                  }

                  <!-- KEY INSIGHTS -->
                  @if (row.keyInsights.length > 0) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-amber-500"></div>
                        <h4 class="text-sm font-bold text-amber-300 uppercase tracking-wider">Hallazgos Clave</h4>
                      </div>
                      <div class="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                        <ul class="space-y-2">
                          @for (insight of row.keyInsights; track $index) {
                            <li class="flex items-start gap-2.5 text-sm text-gray-200">
                              <mat-icon class="text-amber-400 text-base mt-0.5 shrink-0">lightbulb</mat-icon>
                              <span>{{ insight }}</span>
                            </li>
                          }
                        </ul>
                      </div>
                    </section>
                  }

                  <!-- TASKS / ACCIONES -->
                  @if (row.taskList.length > 0) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-emerald-500"></div>
                        <h4 class="text-sm font-bold text-emerald-300 uppercase tracking-wider">Acciones y Tareas</h4>
                      </div>
                      <div class="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
                        <div class="space-y-2">
                          @for (task of row.taskList; track $index) {
                            <div class="flex items-start gap-3 text-sm">
                              <span class="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                [class]="task.priority === 'alta' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                          task.priority === 'baja' ? 'bg-green-500/20 text-green-300 border border-green-500/40' :
                                          'bg-amber-500/20 text-amber-300 border border-amber-500/40'">
                                {{ $index + 1 }}
                              </span>
                              <div class="flex-1 min-w-0">
                                <span class="text-gray-200">{{ task.task }}</span>
                              </div>
                              <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                [class]="task.priority === 'alta' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                          task.priority === 'baja' ? 'bg-green-500/20 text-green-300 border border-green-500/40' :
                                          'bg-amber-500/20 text-amber-300 border border-amber-500/40'">
                                {{ task.priority }}
                              </span>
                            </div>
                          }
                        </div>
                      </div>
                    </section>
                  }

                  <!-- REPORT READY TEXT -->
                  @if (row.reportReadyText) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-sky-500"></div>
                        <h4 class="text-sm font-bold text-sky-300 uppercase tracking-wider">Reporte Completo</h4>
                      </div>
                      <div class="rounded-lg bg-sky-500/5 border border-sky-500/20 p-5 prose-invert max-w-none">
                        <div class="text-sm text-gray-200 leading-relaxed whitespace-pre-line report-content" [innerHTML]="renderMarkdown(row.reportReadyText)"></div>
                      </div>
                    </section>
                  }

                  <!-- TRANSCRIPTION WITH TIMESTAMPS -->
                  @if (row.transcriptionWithTimestamps.length > 0) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-indigo-500"></div>
                        <h4 class="text-sm font-bold text-indigo-300 uppercase tracking-wider">Transcripción</h4>
                      </div>
                      <div class="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-4 space-y-1.5 max-h-[300px] overflow-y-auto">
                        @for (ts of row.transcriptionWithTimestamps; track $index) {
                          <div class="flex items-start gap-3 text-sm">
                            <span class="shrink-0 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{{ ts.start }} - {{ ts.end }}</span>
                            <span class="text-gray-300">{{ ts.text }}</span>
                          </div>
                        }
                      </div>
                    </section>
                  } @else if (row.transcriptionText) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-indigo-500"></div>
                        <h4 class="text-sm font-bold text-indigo-300 uppercase tracking-wider">Transcripción</h4>
                      </div>
                      <div class="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-4">
                        <p class="text-sm text-gray-300 leading-relaxed">{{ row.transcriptionText }}</p>
                      </div>
                    </section>
                  }

                  <!-- SEMANTIC KEYWORDS -->
                  @if (row.semanticKeywords.length > 0) {
                    <section class="space-y-3">
                      <div class="flex items-center gap-2">
                        <div class="w-1 h-6 rounded-full bg-pink-500"></div>
                        <h4 class="text-sm font-bold text-pink-300 uppercase tracking-wider">Palabras Clave</h4>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        @for (kw of row.semanticKeywords; track kw) {
                          <span class="px-3 py-1.5 rounded-lg text-xs border border-pink-500/30 bg-pink-500/10 text-pink-200">
                            {{ kw }}
                          </span>
                        }
                      </div>
                    </section>
                  }

                  <!-- Actions footer -->
                  <div class="flex flex-wrap gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      class="h-9 px-4 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                      [disabled]="generatingDocId === row.analysisId"
                      (click)="generateDocument(row)">
                      <mat-icon class="text-base" [class.animate-spin]="generatingDocId === row.analysisId">
                        {{ generatingDocId === row.analysisId ? 'sync' : 'picture_as_pdf' }}
                      </mat-icon>
                      {{ t('modal.generateDoc') }}
                    </button>
                    <button type="button" class="h-9 px-3 rounded-lg border border-white/15 text-xs text-gray-200 hover:bg-white/5" (click)="goToSummaries(row.audioId)">
                      {{ t('aiAnalysis.goToSummaries') }}
                    </button>
                    <button type="button" class="h-9 px-3 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10" (click)="goToMindmaps(row.audioId)">
                      {{ t('aiAnalysis.viewMaps') }}
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Collapsed preview -->
                <div class="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors" (click)="toggleExpand(row.analysisId)">
                  @if (row.executiveSummary.length > 0) {
                    <p class="text-sm text-gray-300 line-clamp-3">{{ row.executiveSummary[0] }}</p>
                  } @else {
                    <p class="text-sm text-gray-300 line-clamp-3">{{ row.resumen }}</p>
                  }
                  <p class="text-xs text-primary mt-2 flex items-center gap-1">
                    <mat-icon class="text-sm">expand_more</mat-icon>
                    {{ t('aiAnalysis.expand') }}
                  </p>
                </div>
              }
            </article>
          }
        </div>
      }

      <!-- Pending Transcriptions -->
      <section class="rounded-xl border border-white/10 bg-surface-dark p-5 space-y-4">
        <h2 class="text-xl font-bold text-white">{{ t('aiAnalysis.pendingTitle') }}</h2>
        @if (pendingTranscriptions.length === 0) {
          <p class="text-sm text-gray-400">{{ t('aiAnalysis.allCovered') }}</p>
        } @else {
          <div class="space-y-2">
            @for (item of pendingTranscriptions; track item._id) {
              <article class="rounded-lg border border-border-dark bg-background-dark/40 p-3 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-white">{{ t('aiAnalysis.transcription') }} {{ item._id }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ previewText(item.text) }}</p>
                </div>
                <button
                  type="button"
                  class="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                  [disabled]="processingTranscriptionId === (item._id || '')"
                  (click)="processTranscription(item)"
                >
                  @if (processingTranscriptionId === (item._id || '')) {
                    <span class="inline-flex items-center gap-1">
                      <mat-icon class="text-base animate-spin">autorenew</mat-icon>
                      {{ t('aiAnalysis.processing') }}
                    </span>
                  } @else {
                    {{ t('aiAnalysis.analyzeNow') }}
                  }
                </button>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .report-content :is(h2, h3, h4) {
      font-weight: 700;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      color: #e2e8f0;
    }
    .report-content h2 { font-size: 1.1rem; }
    .report-content h3 { font-size: 1rem; }
    .report-content p { margin-bottom: 0.5rem; }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `],
})
export class AiAnalysisComponent implements OnInit, OnDestroy {
  private readonly state = inject(StateManagementService);
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly resourceApi = inject(ResourceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly pdfService = inject(PdfReportService);
  private readonly preferences = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  t(key: string): string { return this.preferences.t(key); }

  loading$: Observable<boolean> = this.state.loading$;
  error$: Observable<string | null> = this.state.error$;
  
  audios$: Observable<AudioEntity[]> = this.state.audios$;
  transcriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$;
  analyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$;

  totalActions$: Observable<number> = this.analyses$.pipe(
    map((analyses) =>
      analyses.reduce((total, analysis) => total + (analysis.result.acciones?.length ?? 0), 0)
    ),
  );

  processingTranscriptionId = '';
  successMessage = '';
  expandedId = '';

  searchTerm = '';
  selectedTag = 'all';
  selectedSentiment = 'all';
  selectedAudioId = 'all';

  private currentAudios: AudioEntity[] = [];
  private currentTranscriptions: TranscriptionEntity[] = [];
  private currentAnalyses: AiAnalysisEntity[] = [];

  get availableTags(): string[] {
    const tags = new Set<string>();
    this.currentAnalyses.forEach((analysis) => {
      (analysis.result.temas ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .forEach((tag) => tags.add(tag));
    });
    return [...tags].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get availableSentiments(): string[] {
    const sentiments = new Set<string>();
    this.currentAnalyses.forEach((analysis) => {
      const sentiment = analysis.result.sentimiento?.trim();
      if (sentiment) {
        sentiments.add(sentiment);
      }
    });
    return [...sentiments].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get availableAudioOptions(): { id: string; label: string }[] {
    return this.currentAudios
      .filter((audio): audio is AudioEntity & { _id: string } => typeof audio._id === 'string' && audio._id.length > 0)
      .map((audio) => ({
        id: audio._id,
        label: audio.filePath,
      }));
  }

  get filteredRows(): AnalysisRow[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.analysisRows.filter((row) => {
      if (this.selectedTag !== 'all' && !row.tags.some((tag) => tag.toLocaleLowerCase() === this.selectedTag.toLocaleLowerCase())) {
        return false;
      }
      if (this.selectedSentiment !== 'all' && row.sentimiento.toLocaleLowerCase() !== this.selectedSentiment.toLocaleLowerCase()) {
        return false;
      }
      if (this.selectedAudioId !== 'all' && row.audioId !== this.selectedAudioId) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [
        row.analysisId,
        row.audioId,
        row.transcriptionId,
        row.audioName,
        row.resumen,
        row.tags.join(' '),
      ].join(' ').toLocaleLowerCase().includes(term);
    });
  }

  get pendingTranscriptions(): TranscriptionEntity[] {
    const covered = new Set(this.currentAnalyses.map((analysis) => analysis.transcriptionId));
    return this.currentTranscriptions.filter((transcription) => !covered.has(transcription._id ?? ''));
  }

  private get analysisRows(): AnalysisRow[] {
    const transcriptionById = new Map(
      this.currentTranscriptions
        .filter((transcription): transcription is TranscriptionEntity & { _id: string } => typeof transcription._id === 'string')
        .map((transcription) => [transcription._id, transcription]),
    );

    const audioById = new Map(
      this.currentAudios
        .filter((audio): audio is AudioEntity & { _id: string } => typeof audio._id === 'string')
        .map((audio) => [audio._id, audio]),
    );

    return this.currentAnalyses
      .filter((analysis): analysis is AiAnalysisEntity & { _id: string } => typeof analysis._id === 'string')
      .map((analysis) => {
        const transcription = transcriptionById.get(analysis.transcriptionId);
        const audio = transcription ? audioById.get(transcription.audioId) : undefined;
        const r = analysis.result;

        return {
          analysisId: analysis._id,
          audioId: transcription?.audioId ?? 'sin-audio',
          transcriptionId: analysis.transcriptionId,
          audioName: audio?.filePath ?? this.t('aiAnalysis.audioNotFound'),
          resumen: r.resumen ?? this.t('aiAnalysis.noSummary'),
          sentimiento: r.sentimiento?.trim() || this.t('aiAnalysis.unidentified'),
          tags: (r.temas ?? []).filter((tag) => tag.trim().length > 0),
          actionsCount: r.acciones?.length ?? 0,
          createdAt: analysis.createdAt ?? '',
          // Rich document fields
          title: r.title || audio?.title || audio?.filePath || 'Análisis MindVoice',
          executiveSummary: Array.isArray(r.executive_summary) ? r.executive_summary.filter(s => typeof s === 'string' && s.trim()) : [],
          keyInsights: Array.isArray(r.key_insights) ? r.key_insights.filter(s => typeof s === 'string' && s.trim()) : [],
          taskList: Array.isArray(r.task_list) && r.task_list.length > 0
            ? r.task_list.map(t => ({ task: t.task || '', priority: (t.priority || 'media').toLowerCase() })).filter(t => t.task.trim())
            : (r.acciones ?? []).map(a => ({ task: a.accion || '', priority: (a.prioridad || 'media').toLowerCase() })).filter(t => t.task.trim()),
          reportReadyText: typeof r.report_ready_text === 'string' ? r.report_ready_text.trim() : '',
          transcriptionText: typeof r._originalTranscription === 'string' ? r._originalTranscription : (transcription?.text || ''),
          transcriptionWithTimestamps: Array.isArray(r.transcription_with_timestamps) ? r.transcription_with_timestamps : [],
          semanticKeywords: Array.isArray(r.semantic_keywords) ? r.semantic_keywords.filter(s => typeof s === 'string' && s.trim()) : [],
        };
      })
      .sort((a, b) => this.parseDate(b.createdAt) - this.parseDate(a.createdAt));
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.state.ensureInitialized();

    this.audios$
      .pipe(takeUntil(this.destroy$))
      .subscribe((audios) => {
        this.currentAudios = audios;
        console.log(`[AI-Analysis] Audios updated: ${audios.length}`);
      });

    this.transcriptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe((transcriptions) => {
        this.currentTranscriptions = transcriptions;
        console.log(`[AI-Analysis] Transcriptions updated: ${transcriptions.length}`);
      });

    this.analyses$
      .pipe(takeUntil(this.destroy$))
      .subscribe((analyses) => {
        this.currentAnalyses = analyses;
        console.log(`[AI-Analysis] Analyses updated: ${analyses.length}`, analyses.map(a => ({ id: a._id, hasResumen: !!a.result?.resumen })));
      });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const audioId = params.get('audioId')?.trim() || '';
        this.selectedAudioId = audioId || 'all';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshData(): void {
    this.successMessage = '';
    this.state.refreshAllData();
  }

  processTranscription(transcription: TranscriptionEntity): void {
    if (!transcription._id) {
      return;
    }

    this.processingTranscriptionId = transcription._id;
    this.successMessage = '';

    this.audioWorkflow.generateAndSaveAnalysis(transcription)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingTranscriptionId = '';
          this.successMessage = this.t('aiAnalysis.success');
          this.state.refreshAllData();
        },
        error: () => {
          this.processingTranscriptionId = '';
        },
      });
  }

  generatingDocId = '';

  async generateDocument(row: AnalysisRow): Promise<void> {
    console.log('[AI-Analysis] generateDocument called for:', row.analysisId);
    this.generatingDocId = row.analysisId;
    this.successMessage = '';

    try {
      // Try to find analysis in memory first
      let analysis = this.currentAnalyses.find(a => a._id === row.analysisId);

      // If not in memory, fetch directly from API
      if (!analysis) {
        console.log('[AI-Analysis] Analysis not in memory, fetching from API...');
        try {
          analysis = await firstValueFrom(
            this.resourceApi.getById<AiAnalysisEntity>('ai-analyses', row.analysisId)
          );
          console.log('[AI-Analysis] Fetched analysis from API:', analysis?._id);
        } catch (fetchErr) {
          console.error('[AI-Analysis] Failed to fetch analysis from API:', fetchErr);
        }
      }

      if (!analysis) {
        console.error('[AI-Analysis] Analysis not found for id:', row.analysisId);
        this.successMessage = '❌ No se encontró el análisis';
        return;
      }

      const transcription = this.currentTranscriptions.find(t => t._id === row.transcriptionId);
      const audio = transcription
        ? this.currentAudios.find(a => a._id === transcription.audioId)
        : undefined;

      console.log('[AI-Analysis] Generating PDF with:', {
        analysisId: analysis._id,
        hasResult: !!analysis.result,
        hasResumen: !!analysis.result?.resumen,
        hasExecSummary: !!analysis.result?.executive_summary,
        hasReportText: !!analysis.result?.report_ready_text,
      });

      await this.pdfService.exportAnalysisReport(analysis, transcription, audio);
      this.successMessage = this.t('aiAnalysis.docGenerated') || '✅ Documento generado exitosamente';
      console.log('[AI-Analysis] PDF generated successfully!');
    } catch (err) {
      console.error('[AI-Analysis] Error generating document:', err);
      this.successMessage = `❌ Error al generar: ${err instanceof Error ? err.message : 'Error desconocido'}`;
    } finally {
      this.generatingDocId = '';
    }
  }

  goToSummaries(audioId: string): void {
    void this.router.navigate(['/summaries'], { queryParams: { audioId } });
  }

  goToMindmaps(audioId: string): void {
    void this.router.navigate(['/mind-maps'], { queryParams: { audioId } });
  }

  previewText(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length <= 160) {
      return trimmed;
    }
    return `${trimmed.slice(0, 160).trimEnd()}...`;
  }

  toggleExpand(analysisId: string): void {
    this.expandedId = this.expandedId === analysisId ? '' : analysisId;
  }

  formatDate(value: string): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return value; }
  }

  renderMarkdown(text: string): string {
    // Simple markdown → HTML for report_ready_text
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  private parseDate(value: string): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

