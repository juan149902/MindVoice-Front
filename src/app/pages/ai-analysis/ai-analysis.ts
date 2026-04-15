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

        @if ((loading$ | async)) {
          <p class="text-sm text-gray-400">{{ t('aiAnalysis.loadingAnalyses') }}</p>
        } @else if (filteredRows.length === 0) {
          <p class="text-sm text-gray-400">{{ t('aiAnalysis.noResults') }}</p>
        } @else {
          <div class="space-y-3 max-h-[560px] overflow-auto pr-1">
            @for (row of filteredRows; track row.analysisId) {
              <article class="rounded-lg border border-border-dark bg-background-dark/45 p-4 space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-white">{{ row.audioName }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      AID: {{ row.analysisId }} · TID: {{ row.transcriptionId }} · Audio: {{ row.audioId }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="h-8 px-3 rounded-md bg-gradient-to-r from-rose-600 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all inline-flex items-center gap-1 disabled:opacity-50"
                      [disabled]="generatingDocId === row.analysisId"
                      (click)="generateDocument(row)">
                      <mat-icon class="text-sm" [class.animate-spin]="generatingDocId === row.analysisId">
                        {{ generatingDocId === row.analysisId ? 'sync' : 'picture_as_pdf' }}
                      </mat-icon>
                      {{ generatingDocId === row.analysisId ? t('common.loading') : t('modal.generateDoc') }}
                    </button>
                    <button
                      type="button"
                      class="h-8 px-3 rounded-md border border-border-dark text-xs text-gray-200 hover:bg-border-dark/70"
                      (click)="goToSummaries(row.audioId)"
                    >
                      {{ t('aiAnalysis.goToSummaries') }}
                    </button>
                    <button
                      type="button"
                      class="h-8 px-3 rounded-md border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10"
                      (click)="goToMindmaps(row.audioId)"
                    >
                      {{ t('aiAnalysis.viewMaps') }}
                    </button>
                  </div>
                </div>

                <p class="text-sm text-gray-200 whitespace-pre-line">{{ row.resumen }}</p>

                <div class="flex flex-wrap gap-2">
                  <span class="px-2 py-1 rounded-full text-[11px] border border-sky-400/35 bg-sky-500/10 text-sky-200">
                    {{ t('aiAnalysis.sentiment') }}: {{ row.sentimiento }}
                  </span>
                  <span class="px-2 py-1 rounded-full text-[11px] border border-violet-400/35 bg-violet-500/10 text-violet-200">
                    {{ t('aiAnalysis.actions') }}: {{ row.actionsCount }}
                  </span>
                  @for (tag of row.tags; track tag) {
                    <span class="px-2 py-1 rounded-full text-[11px] border border-emerald-400/35 bg-emerald-500/10 text-emerald-200">
                      #{{ tag }}
                    </span>
                  }
                </div>
              </article>
            }
          </div>
        }
      </section>

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

        return {
          analysisId: analysis._id,
          audioId: transcription?.audioId ?? 'sin-audio',
          transcriptionId: analysis.transcriptionId,
          audioName: audio?.filePath ?? this.t('aiAnalysis.audioNotFound'),
          resumen: analysis.result.resumen ?? this.t('aiAnalysis.noSummary'),
          sentimiento: analysis.result.sentimiento?.trim() || this.t('aiAnalysis.unidentified'),
          tags: (analysis.result.temas ?? []).filter((tag) => tag.trim().length > 0),
          actionsCount: analysis.result.acciones?.length ?? 0,
          createdAt: analysis.createdAt ?? '',
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

  private parseDate(value: string): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

