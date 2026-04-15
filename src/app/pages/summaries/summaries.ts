import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { Document, Packer, Paragraph, AlignmentType, HeadingLevel, TextRun } from 'docx';
import { Observable, Subject, takeUntil } from 'rxjs';
import {
  AudioEntity,
  TranscriptionEntity,
  AiAnalysisEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { AudioDownloaderService } from '../../core/services/audio-downloader.service';
import { NotificationService } from '../../core/services/notification.service';
import { PdfReportService } from '../../core/services/pdf-report.service';
import { AppPreferencesService } from '../../core/services/app-preferences.service';
import { ExportDialogComponent, ExportFormatOption } from '../../core/services/export-dialog.component';

interface SummaryDisplay {
  audio?: AudioEntity;
  transcription?: TranscriptionEntity;
  analysis?: AiAnalysisEntity;
}

type SearchFilter = 'all' | 'audio' | 'transcription' | 'analysis';

@Component({
  selector: 'app-summaries',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ExportDialogComponent],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6 premium-page-shell">
      <!-- Header -->
      <section class="premium-page-hero rounded-2xl bg-gradient-to-br from-blue-500/20 via-surface-dark/90 to-cyan-900/20 border border-blue-500/30 p-6 space-y-4 backdrop-blur-sm">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-4xl font-black text-white">{{ t('summaries.title') }}</h1>
            <p class="text-gray-300 text-sm">{{ t('summaries.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-purple-400/30 bg-purple-500/15 text-purple-300">
                {{ (audios$ | async)?.length || 0 }} audios
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
                {{ (transcriptions$ | async)?.length || 0 }} transcripciones
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-400/30 bg-blue-500/15 text-blue-300">
                {{ (analyses$ | async)?.length || 0 }} análisis
              </span>
            </div>
            <button
              type="button"
              class="h-11 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 border border-blue-400/40 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300"
              (click)="refreshData()"
              [disabled]="(loading$ | async)"
            >
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
                {{ (loading$ | async) ? t('common.loading') : t('common.reload') }}
              </span>
            </button>
          </div>
        </div>
      </section>

      @if (error$ | async) {
        <section class="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-rose-500/10 p-4 text-sm text-rose-200 backdrop-blur-sm">
          {{ error$ | async }}
        </section>
      }

      <!-- Filters -->
      <section class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
          <input
            id="summary-search"
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onFiltersChanged()"
            class="w-full h-9 rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 text-xs text-gray-200 outline-none focus:border-blue-500/50 placeholder:text-gray-500"
            [placeholder]="t('summaries.searchPlaceholder')"
          />
        </div>
        <select
          id="summary-filter"
          [(ngModel)]="typeFilter"
          (ngModelChange)="onFiltersChanged()"
          class="h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-gray-300 outline-none focus:border-blue-500/50"
        >
          <option value="all">{{ t('summaries.allFolders') }}</option>
          <option value="analysis">Solo Análisis IA</option>
          <option value="transcription">Solo Transcripciones</option>
          <option value="audio">Solo Audios</option>
        </select>
        <span class="text-xs text-gray-500">{{ filteredSummaries.length }} resultado{{ filteredSummaries.length !== 1 ? 's' : '' }}</span>
      </section>

      <!-- Results -->
      <section class="space-y-4">
        @if ((loading$ | async)) {
          <div class="rounded-xl border border-white/10 bg-surface-dark/60 p-12 text-center backdrop-blur-sm">
            <mat-icon class="text-4xl text-gray-600 animate-spin mb-3">refresh</mat-icon>
            <p class="text-sm text-gray-400">{{ t('common.loading') }}</p>
          </div>
        } @else if (summaries.length === 0) {
          <div class="rounded-xl border border-white/10 bg-surface-dark/60 p-12 text-center backdrop-blur-sm space-y-3">
            <mat-icon class="text-5xl text-gray-600">auto_awesome</mat-icon>
            <h3 class="text-lg font-semibold text-gray-300">{{ t('summaries.noSummaries') }}</h3>
            <p class="text-sm text-gray-500 max-w-md mx-auto">
              {{ t('summaries.generateAnalysis') }}
            </p>
          </div>
        } @else if (pagedSummaries.length === 0) {
          <div class="rounded-xl border border-white/10 bg-surface-dark/60 p-8 text-center backdrop-blur-sm">
            <mat-icon class="text-4xl text-gray-600 mb-2">filter_list_off</mat-icon>
            <p class="text-sm text-gray-400">{{ t('summaries.noSummaries') }}</p>
          </div>
        } @else {
          @for (summary of pagedSummaries; track getSummaryId(summary)) {
            <article
              class="rounded-xl border bg-surface-dark/60 p-5 hover:border-primary/40 transition-all space-y-4 backdrop-blur-sm"
              [class.border-yellow-500/40]="highlightAudioId && summary.audio?._id === highlightAudioId"
              [class.shadow-lg]="highlightAudioId && summary.audio?._id === highlightAudioId"
              [class.shadow-yellow-500/20]="highlightAudioId && summary.audio?._id === highlightAudioId"
              [class.border-white/10]="!(highlightAudioId && summary.audio?._id === highlightAudioId)"
            >
              <!-- Card Header -->
              <div class="flex justify-between items-start gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1.5">
                    @if (summary.analysis && summary.analysis.result.resumen) {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                        <mat-icon class="text-sm">auto_awesome</mat-icon>
                        Análisis IA
                      </span>
                    } @else if (summary.transcription) {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                        <mat-icon class="text-sm">description</mat-icon>
                        {{ t('summaries.transcription') }}
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                        <mat-icon class="text-sm">graphic_eq</mat-icon>
                        Audio
                      </span>
                    }
                    @if (summary.analysis?.result?.sentimiento) {
                      <span class="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400">
                        {{ summary.analysis!.result.sentimiento }}
                      </span>
                    }
                  </div>
                  <h3 class="text-base font-semibold text-white truncate">
                    {{ getSummaryTitle(summary) }}
                  </h3>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    {{ getSummaryDetails(summary) }}
                  </p>
                </div>

                <div class="flex gap-1 shrink-0">
                  @if (summary.audio) {
                    <button type="button" class="p-2 rounded-md text-cyan-300/70 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                      (click)="playAudio(summary.audio!)" [title]="t('summaries.expand')">
                      <mat-icon class="text-lg">play_circle</mat-icon>
                    </button>
                  }
                  @if (summary.transcription && !summary.analysis) {
                    <button type="button" class="p-2 rounded-md text-blue-300/70 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                      (click)="generateAnalysis(summary.transcription!)" [title]="t('summaries.generateAnalysis')">
                      <mat-icon class="text-lg">psychology</mat-icon>
                    </button>
                  }
                  @if (summary.analysis) {
                    <button type="button" class="p-2 rounded-md text-green-300/70 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                      (click)="exportToDocument(summary)" [title]="t('summaries.exportPDF')">
                      <mat-icon class="text-lg">download</mat-icon>
                    </button>
                  }
                  <button type="button" class="p-2 rounded-md text-rose-400/50 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    (click)="deleteSummary(summary)" [title]="t('common.delete')">
                    <mat-icon class="text-lg">delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Analysis Content -->
              @if (summary.analysis && summary.analysis.result.resumen) {
                <div class="space-y-3">
                  <p class="text-sm text-gray-300 leading-relaxed line-clamp-3">{{ summary.analysis.result.resumen }}</p>
                  
                  @if (summary.analysis.result.temas && summary.analysis.result.temas.length > 0) {
                    <div class="flex flex-wrap gap-1.5">
                      @for (tema of summary.analysis.result.temas.slice(0, 4); track tema) {
                        <span class="bg-blue-900/30 text-blue-300 text-[11px] px-2 py-0.5 rounded-full font-medium border border-blue-500/20">
                          {{ tema }}
                        </span>
                      }
                      @if (summary.analysis.result.temas.length > 4) {
                        <span class="text-[11px] text-gray-500">+{{ summary.analysis.result.temas.length - 4 }} más</span>
                      }
                    </div>
                  }

                  @if (summary.analysis.result.acciones && summary.analysis.result.acciones.length > 0) {
                    <div class="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                      <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{{ t('summaries.extractedTasks') }}</p>
                      <div class="space-y-1.5">
                        @for (accion of summary.analysis.result.acciones.slice(0, 3); track accion.accion) {
                          <div class="flex items-center gap-2 text-xs">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0"
                              [class.bg-rose-400]="accion.prioridad === 'alta'"
                              [class.bg-amber-400]="accion.prioridad === 'media'"
                              [class.bg-emerald-400]="accion.prioridad !== 'alta' && accion.prioridad !== 'media'"
                            ></span>
                            <span class="text-gray-300 line-clamp-1 flex-1">{{ accion.accion }}</span>
                            <span class="text-[10px] text-gray-500 shrink-0">{{ accion.prioridad }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Generate Document button -->
                  <button type="button"
                    class="w-full h-9 mt-2 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all inline-flex items-center justify-center gap-1.5"
                    (click)="$event.stopPropagation(); exportToDocument(summary)">
                    <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                    {{ t('modal.generateDoc') }}
                  </button>
                </div>
              } @else if (summary.transcription) {
                <p class="text-sm text-gray-400 line-clamp-2">{{ summary.transcription.text }}</p>
              } @else if (summary.audio) {
                <p class="text-sm text-gray-500">Audio: {{ summary.audio.duration }}s · {{ summary.audio.format || 'audio' }}</p>
              }
            </article>
          }

          <!-- Pagination -->
          @if (totalPages > 1) {
            <div class="pt-2 flex items-center justify-between text-sm text-gray-400">
              <span>{{ t('common.page') }} {{ currentPage }} {{ t('common.of') }} {{ totalPages }}</span>
              <div class="flex gap-2">
                <button type="button" class="h-9 px-3 rounded-lg border border-border-dark hover:bg-border-dark/70 disabled:opacity-40"
                  (click)="previousPage()" [disabled]="currentPage <= 1">
                  {{ t('common.prev') }}
                </button>
                <button type="button" class="h-9 px-3 rounded-lg border border-border-dark hover:bg-border-dark/70 disabled:opacity-40"
                  (click)="nextPage()" [disabled]="currentPage >= totalPages">
                  {{ t('common.next') }}
                </button>
              </div>
            </div>
          }
        }
      </section>

      @if (showExportDialog) {
        <app-export-dialog
          [title]="exportDialogTitle"
          [formats]="summaryExportFormats"
          (formatSelected)="onExportFormatSelected($event)"
          (cancelled)="onExportDialogCancelled()"
        />
      }

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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly audioDownloader = inject(AudioDownloaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly pdfReport = inject(PdfReportService);
  private readonly preferences = inject(AppPreferencesService);

  protected highlightAudioId: string | null = null;

  loading$: Observable<boolean> = this.state.loading$;
  error$: Observable<string | null> = this.state.error$;

  audios$: Observable<AudioEntity[]> = this.state.audios$;
  transcriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$;
  analyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$;

  searchTerm = '';
  typeFilter: SearchFilter = 'all';
  currentPage = 1;
  readonly pageSize = 6;

  private allAudios: AudioEntity[] = [];
  private allTranscriptions: TranscriptionEntity[] = [];
  private allAnalyses: AiAnalysisEntity[] = [];

  showExportDialog = false;
  exportDialogTitle = '';
  selectedSummary: SummaryDisplay | null = null;

  readonly summaryExportFormats: ExportFormatOption[] = [
    { value: 'pdf', label: 'PDF', subtitle: 'Documento', icon: 'picture_as_pdf', gradient: 'from-rose-500/20 to-orange-500/20', iconColor: 'text-rose-400', borderColor: 'border-rose-500/30' },
    { value: 'docx', label: 'DOCX', subtitle: 'Word', icon: 'description', gradient: 'from-sky-500/20 to-indigo-500/20', iconColor: 'text-sky-400', borderColor: 'border-sky-500/30' },
    { value: 'png', label: 'TXT', subtitle: 'Texto plano', icon: 'text_snippet', gradient: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.state.ensureInitialized();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const audioId = params.get('audioId');
      if (audioId) {
        this.highlightAudioId = audioId;
        this.cdr.markForCheck();
      }
    });

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
    this.destroy$.next();
    this.destroy$.complete();
  }

  playAudio(audio: AudioEntity): void {
    if (this.audioPlayer && audio.filePath) {
      this.audioPlayer.nativeElement.src =
        this.audioDownloader.resolveAudioCandidates(audio.filePath)[0]
        ?? this.audioDownloader.resolveAudioUrl(audio.filePath);
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
        error: (err) => this.notifications.error('Error al generar análisis'),
      });
  }

  exportToDocument(summary: SummaryDisplay): void {
    if (!summary.analysis) return;

    this.selectedSummary = summary;
    this.exportDialogTitle = this.getSummaryTitle(summary);
    this.showExportDialog = true;
  }

  onExportFormatSelected(format: 'png' | 'pdf' | 'docx'): void {
    this.showExportDialog = false;
    
    if (!this.selectedSummary) return;

    switch (format) {
      case 'pdf':
        this.exportToPDF(this.selectedSummary);
        this.notifications.success('Resumen exportado en PDF');
        break;
      case 'docx':
        this.exportToDOCX(this.selectedSummary);
        this.notifications.success('Resumen exportado en Word');
        break;
      case 'png':
        this.exportToTXT(this.selectedSummary);
        this.notifications.success('Resumen exportado en texto plano');
        break;
    }
    
    this.selectedSummary = null;
  }

  onExportDialogCancelled(): void {
    this.showExportDialog = false;
    this.selectedSummary = null;
  }

  private exportToPDF(summary: SummaryDisplay): void {
    if (!summary.analysis) return;

    this.pdfReport.exportAnalysisReport(
      summary.analysis,
      summary.transcription,
      summary.audio,
    ).catch(() => this.notifications.error('Error al exportar PDF'));
  }

  private exportToDOCX(summary: SummaryDisplay): void {
    if (!summary.analysis) return;

    const sections = [
      new Paragraph({
        text: 'RESUMEN EJECUTIVO',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Resumen:', bold: true, size: 28 })],
        spacing: { before: 100, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: summary.analysis.result.resumen, size: 24 })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Temas Identificados:', bold: true, size: 28 })],
        spacing: { before: 100, after: 100 },
      }),
      ...((summary.analysis.result.temas || []).map((tema) =>
        new Paragraph({
          children: [new TextRun({ text: tema, size: 24 })],
          spacing: { after: 50 },
          indent: { left: 200 },
        })
      )),
      new Paragraph({
        children: [new TextRun({ text: 'Acciones Recomendadas:', bold: true, size: 28 })],
        spacing: { before: 100, after: 100 },
      }),
      ...((summary.analysis.result.acciones || []).map((accion) =>
        new Paragraph({
          children: [new TextRun({ text: `${accion.accion} (${accion.prioridad})`, size: 24 })],
          spacing: { after: 50 },
          indent: { left: 200 },
        })
      )),
      new Paragraph({
        children: [new TextRun({
          text: `Sentimiento: ${summary.analysis.result.sentimiento || 'No clasificado'}`,
          bold: true,
          size: 24,
        })],
        spacing: { before: 100 },
      }),
    ];

    const doc = new Document({ sections: [{ children: sections }] });
    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary-${summary.analysis?._id || 'export'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private exportToTXT(summary: SummaryDisplay): void {
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
      this.state.deleteAnalysis(summary.analysis._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.notifications.success('Análisis eliminado'),
          error: () => this.notifications.error('Error al eliminar análisis'),
        });
    } else if (summary.transcription && summary.transcription._id) {
      this.state.deleteTranscription(summary.transcription._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.notifications.success('Transcripción eliminada'),
          error: () => this.notifications.error('Error al eliminar transcripción'),
        });
    } else if (summary.audio && summary.audio._id) {
      this.state.deleteAudio(summary.audio._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.notifications.success('Audio eliminado'),
          error: () => this.notifications.error('Error al eliminar audio'),
        });
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

  t(key: string): string {
    return this.preferences.t(key);
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
