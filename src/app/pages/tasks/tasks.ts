import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil } from 'rxjs';
import {
  AiAnalysisEntity,
  AudioEntity,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppPreferencesService } from '../../core/services/app-preferences.service';

type PriorityFilter = 'all' | 'alta' | 'media' | 'baja';

/**
 * Compatible with mobile task_list[{task, priority}] structure.
 * Uses same field names as Flutter app for cross-platform consistency.
 */
interface DerivedTask {
  id: string;
  analysisId: string;
  transcriptionId: string;
  task: string;
  priority: string;
  createdAt?: string;
  audioTitle?: string;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6 premium-page-shell">
      <!-- Header -->
      <section class="premium-page-hero rounded-2xl bg-gradient-to-br from-violet-600/20 via-surface-dark/90 to-indigo-900/20 border border-violet-500/30 p-6 space-y-4 backdrop-blur-sm">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <mat-icon class="text-3xl text-violet-400">auto_awesome</mat-icon>
            <div class="space-y-1">
              <h1 class="text-3xl font-black text-white tracking-tight">{{ t('tasks.title') }}</h1>
              <p class="text-gray-400 text-sm">{{ t('tasks.subtitle') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400">
                <span class="w-2 h-2 rounded-full bg-red-400"></span>
                {{ countByPriority('alta') }} {{ t('tasks.high') }}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400">
                <span class="w-2 h-2 rounded-full bg-orange-400"></span>
                {{ countByPriority('media') }} {{ t('tasks.medium') }}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400">
                <span class="w-2 h-2 rounded-full bg-green-400"></span>
                {{ countByPriority('baja') }} {{ t('tasks.low') }}
              </span>
            </div>
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-600/25"
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
        <section class="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 backdrop-blur-sm">
          {{ error$ | async }}
        </section>
      }

      <!-- Filters -->
      <section class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
          <input
            id="task-search"
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onFiltersChanged()"
            class="w-full h-9 rounded-xl bg-white/5 border border-white/10 pl-8 pr-3 text-xs text-gray-200 outline-none focus:border-violet-500/50 placeholder:text-gray-500"
            placeholder="Buscar tarea..."
          />
        </div>
        <select
          id="task-priority"
          [(ngModel)]="priorityFilter"
          (ngModelChange)="onFiltersChanged()"
          class="h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-gray-300 outline-none focus:border-violet-500/50"
        >
          <option value="all">{{ t('tasks.allPriorities') }}</option>
          <option value="alta">{{ t('tasks.high') }}</option>
          <option value="media">{{ t('tasks.medium') }}</option>
          <option value="baja">{{ t('tasks.low') }}</option>
        </select>
        <select
          id="task-audio"
          [(ngModel)]="audioFilter"
          (ngModelChange)="onFiltersChanged()"
          class="h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-gray-300 outline-none focus:border-violet-500/50 max-w-[220px] truncate"
        >
          <option value="all">Todos los audios</option>
          @for (name of uniqueAudioNames; track name) {
            <option [value]="name">{{ name }}</option>
          }
        </select>
        <span class="text-xs text-gray-500">{{ filteredTasks.length }} tarea{{ filteredTasks.length !== 1 ? 's' : '' }}</span>
      </section>

      <!-- Task List - matches mobile InsightsPage card style -->
      <section class="space-y-3">
        @if ((loading$ | async)) {
          <div class="rounded-2xl border border-white/10 bg-surface-dark/60 p-12 text-center backdrop-blur-sm">
            <mat-icon class="text-4xl text-gray-600 animate-spin mb-3">refresh</mat-icon>
            <p class="text-sm text-gray-400">{{ t('common.loading') }}</p>
          </div>
        } @else if (tasks.length === 0) {
          <div class="rounded-2xl border border-white/10 bg-surface-dark/60 p-12 text-center backdrop-blur-sm space-y-3">
            <mat-icon class="text-5xl text-violet-400/40">auto_awesome</mat-icon>
            <h3 class="text-lg font-semibold text-gray-300">{{ t('tasks.noTasks') }}</h3>
            <p class="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              {{ t('tasks.generateAnalysis') }}
            </p>
          </div>
        } @else if (pagedTasks.length === 0) {
          <div class="rounded-2xl border border-white/10 bg-surface-dark/60 p-8 text-center backdrop-blur-sm">
            <mat-icon class="text-4xl text-gray-600 mb-2">filter_list_off</mat-icon>
            <p class="text-sm text-gray-400">No hay tareas para el filtro actual.</p>
          </div>
        } @else {
          @for (task of pagedTasks; track task.id) {
            <article class="rounded-2xl border border-white/10 bg-surface-dark/70 p-4 flex items-center gap-3 hover:border-violet-500/30 transition-all backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-black/10">
              <!-- Check icon colored by priority (same as mobile) -->
              <mat-icon class="text-2xl shrink-0"
                [class.text-red-400]="task.priority === 'alta'"
                [class.text-orange-400]="task.priority === 'media'"
                [class.text-green-400]="task.priority === 'baja'"
              >check_circle_outline</mat-icon>

              <!-- Task text -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-white leading-snug">{{ task.task }}</p>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  @if (task.audioTitle) {
                    <span class="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <mat-icon class="text-xs">graphic_eq</mat-icon>
                      {{ t('tasks.fromAudio') }} {{ task.audioTitle }}
                    </span>
                  }
                  @if (task.createdAt) {
                    <span class="text-[11px] text-gray-600">{{ task.createdAt | date:'shortDate' }}</span>
                  }
                </div>
              </div>

              <!-- Priority badge (same as mobile) -->
              <span class="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                [class.bg-red-500/15]="task.priority === 'alta'"
                [class.text-red-400]="task.priority === 'alta'"
                [class.bg-orange-500/15]="task.priority === 'media'"
                [class.text-orange-400]="task.priority === 'media'"
                [class.bg-green-500/15]="task.priority === 'baja'"
                [class.text-green-400]="task.priority === 'baja'"
              >{{ task.priority === 'alta' ? t('tasks.high') : task.priority === 'media' ? t('tasks.medium') : t('tasks.low') }}</span>

              <!-- Delete button -->
              <button
                type="button"
                class="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                (click)="requestDeleteAnalysis(task.analysisId)"
                [disabled]="deletingAnalysisId === task.analysisId"
                title="Eliminar análisis"
              >
                <mat-icon class="text-lg">delete_outline</mat-icon>
              </button>
            </article>
          }

          <!-- Pagination -->
          @if (totalPages > 1) {
            <div class="pt-2 flex items-center justify-between text-sm text-gray-400">
              <span>Página {{ currentPage }} de {{ totalPages }}</span>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="h-9 px-3 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
                  (click)="previousPage()"
                  [disabled]="currentPage <= 1"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  class="h-9 px-3 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
                  (click)="nextPage()"
                  [disabled]="currentPage >= totalPages"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class TasksComponent implements OnInit, OnDestroy {
  private readonly state = inject(StateManagementService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notify = inject(NotificationService);
  private readonly preferences = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  t(key: string): string { return this.preferences.t(key); }

  loading$: Observable<boolean> = this.state.loading$;
  error$: Observable<string | null> = this.state.error$;
  
  analyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$;
  transcriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$;
  audios$: Observable<AudioEntity[]> = this.state.audios$;

  searchTerm = '';
  priorityFilter: PriorityFilter = 'all';
  audioFilter = 'all';
  currentPage = 1;
  readonly pageSize = 8;
  deletingAnalysisId: string | null = null;

  private transcriptionsById = new Map<string, TranscriptionEntity>();
  private audiosById = new Map<string, AudioEntity>();
  private currentAnalyses: AiAnalysisEntity[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.state.ensureInitialized();

    this.transcriptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe((transcriptions) => {
        this.transcriptionsById = new Map(
          transcriptions
            .filter((item): item is TranscriptionEntity & { _id: string } => typeof item._id === 'string')
            .map((item) => [item._id, item]),
        );
      });

    this.audios$
      .pipe(takeUntil(this.destroy$))
      .subscribe((audios) => {
        this.audiosById = new Map(
          audios
            .filter((item): item is AudioEntity & { _id: string } => typeof item._id === 'string')
            .map((item) => [item._id, item]),
        );
      });

    this.analyses$
      .pipe(takeUntil(this.destroy$))
      .subscribe((analyses) => {
        this.currentAnalyses = analyses;
        this.currentPage = 1;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reads from task_list[{task, priority}] first (same as mobile Flutter app),
   * then falls back to acciones[{accion, prioridad}] for backwards compatibility.
   */
  get tasks(): DerivedTask[] {
    const derived: DerivedTask[] = [];

    for (const analysis of this.currentAnalyses) {
      const analysisId = analysis._id || '';
      if (!analysisId) {
        continue;
      }

      const transcription = this.transcriptionsById.get(analysis.transcriptionId);
      const audio = transcription?.audioId ? this.audiosById.get(transcription.audioId) : undefined;
      const audioTitle = audio?.title || audio?.filePath || undefined;

      // Prefer task_list (mobile-compatible) over acciones (frontend-only normalization)
      const taskList = analysis.result.task_list;
      if (Array.isArray(taskList) && taskList.length > 0) {
        taskList.forEach((item, index) => {
          const task = (item.task || '').trim();
          if (!task) return;

          derived.push({
            id: `${analysisId}-${index}`,
            analysisId,
            transcriptionId: analysis.transcriptionId,
            task,
            priority: this.normalizePriority(item.priority || ''),
            createdAt: analysis.createdAt,
            audioTitle,
          });
        });
      } else {
        // Fallback to acciones (normalized field)
        const actions = analysis.result.acciones ?? [];
        actions.forEach((action, index) => {
          const task = action.accion?.trim();
          if (!task) return;

          derived.push({
            id: `${analysisId}-${index}`,
            analysisId,
            transcriptionId: analysis.transcriptionId,
            task,
            priority: this.normalizePriority(action.prioridad),
            createdAt: analysis.createdAt,
            audioTitle,
          });
        });
      }
    }

    return derived;
  }

  get uniqueAudioNames(): string[] {
    const names = new Set<string>();
    for (const task of this.tasks) {
      if (task.audioTitle) names.add(task.audioTitle);
    }
    return [...names].sort();
  }

  get filteredTasks(): DerivedTask[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.tasks.filter((task) => {
      if (this.priorityFilter !== 'all' && task.priority !== this.priorityFilter) {
        return false;
      }

      if (this.audioFilter !== 'all' && task.audioTitle !== this.audioFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const transcription = this.transcriptionsById.get(task.transcriptionId);
      const preview = transcription?.text.toLocaleLowerCase() || '';

      return (
        task.task.toLocaleLowerCase().includes(term) ||
        (task.audioTitle?.toLocaleLowerCase().includes(term) ?? false) ||
        preview.includes(term)
      );
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTasks.length / this.pageSize));
  }

  get pagedTasks(): DerivedTask[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTasks.slice(start, start + this.pageSize);
  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  requestDeleteAnalysis(analysisId: string): void {
    if (!analysisId || this.deletingAnalysisId) {
      return;
    }

    this.deletingAnalysisId = analysisId;
    this.state.deleteAnalysis(analysisId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('Análisis eliminado');
          this.deletingAnalysisId = null;
        },
        error: () => {
          this.notify.error('Error al eliminar el análisis');
          this.deletingAnalysisId = null;
        },
      });
  }

  countByPriority(priority: 'alta' | 'media' | 'baja'): number {
    return this.tasks.filter((task) => task.priority === priority).length;
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

  private normalizePriority(priority: string): string {
    const normalized = priority.trim().toLocaleLowerCase();
    if (normalized === 'alta' || normalized === 'media' || normalized === 'baja') {
      return normalized;
    }
    return 'media';
  }
}
