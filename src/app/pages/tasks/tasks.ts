import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil } from 'rxjs';
import {
  AiAnalysisEntity,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';

type PriorityFilter = 'all' | 'alta' | 'media' | 'baja';

interface DerivedTask {
  id: string;
  analysisId: string;
  transcriptionId: string;
  accion: string;
  prioridad: string;
  createdAt?: string;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6 premium-page-shell">
      <!-- Header -->
      <section class="premium-page-hero rounded-2xl bg-gradient-to-br from-rose-500/20 via-surface-dark/90 to-orange-900/20 border border-rose-500/30 p-6 space-y-4 backdrop-blur-sm">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-4xl font-black text-white">Tareas Detectadas</h1>
            <p class="text-gray-300 text-sm">Listado operativo generado desde <code class="bg-black/30 px-2 py-1 rounded text-primary">ai-analyses.result.acciones</code>.</p>
          </div>
          <button
            type="button"
            class="h-11 px-5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 border border-rose-400/40 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all duration-300"
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

      <!-- Filters Card -->
      <section class="rounded-xl border border-white/10 bg-surface-dark/60 p-6 space-y-4 backdrop-blur-sm">
        <h2 class="text-lg font-bold text-white">Filtros activos</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-1">
            <label for="task-search" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buscar</label>
            <input
              id="task-search"
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onFiltersChanged()"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
              placeholder="Acción, ID o texto..."
            />
          </div>

          <div class="space-y-1">
            <label for="task-priority" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Prioridad
            </label>
            <select
              id="task-priority"
              [(ngModel)]="priorityFilter"
              (ngModelChange)="onFiltersChanged()"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
            >
              <option value="all">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-white/10 bg-background-dark p-3">
              <p class="text-xs text-gray-400">Alta</p>
              <p class="text-xl font-bold text-white">{{ countByPriority('alta') }}</p>
            </div>
            <div class="rounded-lg border border-white/10 bg-background-dark p-3">
              <p class="text-xs text-gray-400">Media</p>
              <p class="text-xl font-bold text-white">{{ countByPriority('media') }}</p>
            </div>
            <div class="rounded-lg border border-white/10 bg-background-dark p-3">
              <p class="text-xs text-gray-400">Baja</p>
              <p class="text-xl font-bold text-white">{{ countByPriority('baja') }}</p>
            </div>
          </div>
        </div>

        @if ((loading$ | async)) {
          <p class="text-sm text-gray-400">Cargando tareas...</p>
        } @else if (pagedTasks.length === 0) {
          <p class="text-sm text-gray-400">No hay tareas para el filtro actual.</p>
        } @else {
          <div class="space-y-3">
            @for (task of pagedTasks; track task.id) {
              <article class="rounded-lg border border-border-dark bg-background-dark/40 p-4 space-y-3 hover:border-primary/35 hover:bg-background-dark/60 transition-all">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-white">{{ task.accion }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      Prioridad: {{ task.prioridad.toUpperCase() }} ·
                      Análisis: {{ task.analysisId }} ·
                      Transcripción: {{ task.transcriptionId }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="p-2 rounded-md text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                    (click)="deleteAnalysis(task.analysisId)"
                    [disabled]="false"
                    title="Eliminar análisis origen"
                  >
                    <mat-icon class="text-lg">delete</mat-icon>
                  </button>
                </div>

                <p class="text-sm text-gray-300 line-clamp-3">
                  {{ getTranscriptionPreview(task.transcriptionId) }}
                </p>
              </article>
            }
          </div>

          <div class="pt-2 flex items-center justify-between text-sm text-gray-400">
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
  `,
})
export class TasksComponent implements OnInit, OnDestroy {
  private readonly state = inject(StateManagementService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();

  loading$: Observable<boolean> = this.state.loading$;
  error$: Observable<string | null> = this.state.error$;
  
  analyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$;
  transcriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$;

  searchTerm = '';
  priorityFilter: PriorityFilter = 'all';
  currentPage = 1;
  readonly pageSize = 8;

  private transcriptionsById = new Map<string, TranscriptionEntity>();
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

  get tasks(): DerivedTask[] {
    const derived: DerivedTask[] = [];

    for (const analysis of this.currentAnalyses) {
      const analysisId = analysis._id || '';
      if (!analysisId) {
        continue;
      }

      const actions = analysis.result.acciones ?? [];
      actions.forEach((action, index) => {
        const accion = action.accion?.trim();
        if (!accion) {
          return;
        }

        derived.push({
          id: `${analysisId}-${index}`,
          analysisId,
          transcriptionId: analysis.transcriptionId,
          accion,
          prioridad: this.normalizePriority(action.prioridad),
          createdAt: analysis.createdAt,
        });
      });
    }

    return derived;
  }

  get filteredTasks(): DerivedTask[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return this.tasks.filter((task) => {
      if (this.priorityFilter !== 'all' && task.prioridad !== this.priorityFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const transcription = this.transcriptionsById.get(task.transcriptionId);
      const preview = transcription?.text.toLocaleLowerCase() || '';

      return (
        task.accion.toLocaleLowerCase().includes(term) ||
        task.analysisId.toLocaleLowerCase().includes(term) ||
        task.transcriptionId.toLocaleLowerCase().includes(term) ||
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

  deleteAnalysis(analysisId: string): void {
    if (!analysisId) {
      return;
    }

    if (!globalThis.confirm('¿Eliminar el análisis origen de esta tarea?')) {
      return;
    }

    this.state.deleteAnalysis(analysisId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  getTranscriptionPreview(transcriptionId: string): string {
    const text = this.transcriptionsById.get(transcriptionId)?.text || '';
    if (!text) {
      return 'Sin texto de transcripción asociado.';
    }

    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  }

  countByPriority(priority: 'alta' | 'media' | 'baja'): number {
    return this.tasks.filter((task) => task.prioridad === priority).length;
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
