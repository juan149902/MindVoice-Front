/**
 * TagsComponent - Componente para gestión de etiquetas
 * MindVoice - Angular 21 standalone component
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 🐛 BUG CORREGIDO: Los tags no se mostraban en la vista
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * DIAGNÓSTICO DEL PROBLEMA:
 * 1. El backend Flask devuelve { tags: [...] } pero el código anterior usaba
 *    ResourceApiService.list() que esperaba un array directo T[]
 * 2. Por lo tanto, this.tags contenía el objeto { tags: [...] } en vez del array
 * 3. El *ngFor iteraba sobre las propiedades del objeto (ninguna), mostrando 0 items
 * 
 * SOLUCIÓN APLICADA:
 * 1. Se creó TagsService dedicado que extrae .tags de la respuesta
 * 2. Se usa state reactivo con signals para mejor integración con Angular 21
 * 3. Se agregó skeleton loading y mensaje de estado vacío
 * 4. Se usa cdr.markForCheck() correctamente con OnPush
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { TagsService, Tag } from '../../core/services/tags.service';

type SortMode = 'newest' | 'oldest' | 'name';

@Component({
  selector: 'app-tags',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6 premium-page-shell">
      <!-- Header y formulario de creación -->
      <section class="premium-page-hero rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/16 via-surface-dark/88 to-violet-900/16 p-6 shadow-2xl">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-black text-white tracking-tight">Mis Etiquetas</h1>
            <p class="text-sm text-gray-400 mt-1">Crea y organiza tus etiquetas personalizadas.</p>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Orden</label>
            <select
              [(ngModel)]="sortMode"
              (ngModelChange)="applySort()"
              class="h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-200">
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="name">Nombre A-Z</option>
            </select>
            <button
              type="button"
              class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-300 hover:bg-border-dark/70 transition-colors"
              (click)="loadTags()"
              [disabled]="tagsService.loading()">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg" [class.animate-spin]="tagsService.loading()">refresh</mat-icon>
                Recargar
              </span>
            </button>
          </div>
        </div>

        <form class="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-3" (submit)="$event.preventDefault(); createTag()">
          <div class="lg:col-span-3">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</label>
            <input
              [(ngModel)]="newTagName"
              name="newTagName"
              type="text"
              maxlength="50"
              class="mt-1 w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
              placeholder="Ej. importante" />
          </div>
          <div class="lg:col-span-1 flex items-end">
            <button
              type="submit"
              class="w-full h-10 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors disabled:opacity-70"
              [disabled]="submitting || tagsService.loading()">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg">add</mat-icon>
                Crear
              </span>
            </button>
          </div>
        </form>

        <!-- Mensajes de error y éxito -->
        @if (errorMessage) {
          <p class="mt-4 text-sm text-rose-400">{{ errorMessage }}</p>
        }
        @if (successMessage) {
          <p class="mt-4 text-sm text-emerald-400">{{ successMessage }}</p>
        }
      </section>

      <!-- Lista de tags -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/60 p-4 md:p-6 min-h-[280px]">
        
        <!-- Loading skeleton -->
        @if (tagsService.loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="rounded-xl border border-border-dark bg-background-dark/70 p-4 animate-pulse">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Estado vacío -->
        @if (!tagsService.loading() && sortedTags.length === 0) {
          <div class="h-48 flex items-center justify-center text-center text-gray-400">
            <div>
              <mat-icon class="text-4xl text-primary mb-2">local_offer</mat-icon>
              <p class="text-base font-semibold text-gray-300">No hay etiquetas creadas</p>
              <p class="text-sm">Crea tu primera etiqueta para empezar.</p>
            </div>
          </div>
        }

        <!-- Lista de tags -->
        @if (!tagsService.loading() && sortedTags.length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (tag of sortedTags; track tag._id) {
              <article
                class="rounded-xl border border-border-dark bg-background-dark/70 p-4 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 transition-all">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <mat-icon 
                      class="text-2xl shrink-0"
                      [style.color]="tag.color || '#7c3aed'">local_offer</mat-icon>
                    <div class="min-w-0">
                      <h3 class="text-white font-bold text-base leading-tight break-words">{{ tag.name || 'Sin nombre' }}</h3>
                      <p class="text-xs text-gray-500 mt-1">#{{ tag.name?.toLowerCase() || 'etiqueta' }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      class="p-1.5 rounded-md text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      (click)="deleteTag(tag)"
                      [disabled]="deletingId === tag._id">
                      @if (deletingId === tag._id) {
                        <mat-icon class="text-lg animate-spin">autorenew</mat-icon>
                      } @else {
                        <mat-icon class="text-lg">delete</mat-icon>
                      }
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `
})
export class TagsComponent implements OnInit, OnDestroy {
  readonly tagsService = inject(TagsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  sortedTags: Tag[] = [];
  sortMode: SortMode = 'newest';
  submitting = false;
  deletingId = '';

  newTagName = '';

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    // Guard SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadTags();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTags(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.tagsService.loadTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tags) => {
          // ✅ FIX: Ahora tags es correctamente un array gracias a TagsService
          this.sortedTags = [...tags];
          this.applySort();
          console.log('[TagsComponent] Tags loaded and displayed:', this.sortedTags.length);
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = this.tagsService.error() || 'No se pudieron cargar las etiquetas.';
          this.cdr.markForCheck();
        }
      });
  }

  applySort(): void {
    this.sortedTags = [...this.sortedTags].sort((a, b) => {
      if (this.sortMode === 'name') {
        return (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' });
      }

      const first = this.getTagTimestamp(a);
      const second = this.getTagTimestamp(b);
      return this.sortMode === 'oldest' ? first - second : second - first;
    });
    this.cdr.markForCheck();
  }

  createTag(): void {
    const name = this.newTagName.trim();
    if (!name) {
      this.errorMessage = 'El nombre de la etiqueta es obligatorio.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tagsService.createTag({ name })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.submitting = false;
          this.newTagName = '';
          this.successMessage = 'Etiqueta creada correctamente.';
          // Refrescar la lista desde el servicio
          this.sortedTags = [...this.tagsService.tags()];
          this.applySort();
          this.cdr.markForCheck();
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = this.tagsService.error() || 'No se pudo crear la etiqueta.';
          this.cdr.markForCheck();
        }
      });
  }

  deleteTag(tag: Tag): void {
    const id = tag._id;
    if (!id) {
      this.errorMessage = 'La etiqueta seleccionada no tiene identificador válido.';
      return;
    }

    const name = tag.name ?? 'esta etiqueta';
    if (!globalThis.confirm(`¿Eliminar #${name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tagsService.deleteTag(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId = '';
          this.successMessage = 'Etiqueta eliminada correctamente.';
          // Refrescar la lista desde el servicio
          this.sortedTags = [...this.tagsService.tags()];
          this.cdr.markForCheck();
        },
        error: () => {
          this.deletingId = '';
          this.errorMessage = this.tagsService.error() || 'No se pudo eliminar la etiqueta.';
          this.cdr.markForCheck();
        }
      });
  }

  private getTagTimestamp(tag: Tag): number {
    const source = tag.created_at ?? tag.updated_at;
    if (!source) {
      return 0;
    }

    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
