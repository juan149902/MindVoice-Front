import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ApiEntity } from '../../core/models/api.models';
import { ResourceApiService } from '../../core/services/resource-api.service';
import { TokenStorageService } from '../../core/services/token-storage.service';

interface TagEntity extends ApiEntity {
  _id?: string;
  userId?: string;
  user_id?: string;
  username?: string;
  user?: { _id?: string; id?: string; username?: string; name?: string };
  name?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SortMode = 'newest' | 'oldest' | 'name';

@Component({
  selector: 'app-tags',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-6 shadow-2xl">
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
              <option value="newest">Mas recientes</option>
              <option value="oldest">Mas antiguas</option>
              <option value="name">Nombre A-Z</option>
            </select>
            <button
              type="button"
              class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-300 hover:bg-border-dark/70 transition-colors"
              (click)="loadTags()"
              [disabled]="loading || submitting">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg">refresh</mat-icon>
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
              [disabled]="submitting || loading">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg">add</mat-icon>
                Crear
              </span>
            </button>
          </div>
        </form>

        <p *ngIf="errorMessage" class="mt-4 text-sm text-rose-400">{{ errorMessage }}</p>
        <p *ngIf="successMessage" class="mt-4 text-sm text-emerald-400">{{ successMessage }}</p>
      </section>

      <section class="rounded-2xl border border-white/10 bg-surface-dark/60 p-4 md:p-6 min-h-[280px]">
        <div *ngIf="loading" class="h-48 flex items-center justify-center text-gray-400">
          <span class="inline-flex items-center gap-2">
            <mat-icon class="animate-spin">autorenew</mat-icon>
            Cargando etiquetas...
          </span>
        </div>

        <div *ngIf="!loading && tags.length === 0" class="h-48 flex items-center justify-center text-center text-gray-400">
          <div>
            <mat-icon class="text-4xl text-primary mb-2">local_offer</mat-icon>
            <p class="text-base font-semibold text-gray-300">No hay etiquetas creadas</p>
            <p class="text-sm">Crea tu primera etiqueta para empezar.</p>
          </div>
        </div>

        <div *ngIf="!loading && tags.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <article
            *ngFor="let tag of tags; let idx = index; trackBy: trackByTag"
            class="rounded-xl border border-border-dark bg-background-dark/70 p-4 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 transition-all">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <mat-icon class="text-primary text-2xl shrink-0">local_offer</mat-icon>
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
                  [disabled]="deletingId === getTagId(tag)">
                  <mat-icon class="text-lg">delete</mat-icon>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  `
})
export class TagsComponent implements OnInit {
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  tags: TagEntity[] = [];
  sortMode: SortMode = 'newest';
  loading = false;
  submitting = false;
  deletingId = '';

  newTagName = '';

  errorMessage = '';
  successMessage = '';
  currentUserId = '';
  currentUsername = '';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resolveCurrentIdentity();
    this.loadTags();
  }

  loadTags(): void {
    this.loading = true;
    this.errorMessage = '';

    this.resourceApi.list<TagEntity>('tags').subscribe({
      next: (tags) => {
        this.tags = this.filterTagsForCurrentUser(tags);

        this.applySort();
        this.loading = false;
        this.cdr.markForCheck();
        console.log('[TAGS] Tags loaded successfully:', this.tags.length, 'of', tags.length);
      },
      error: (error: HttpErrorResponse) => {
        console.error('[TAGS] Failed to load tags:', error.status, error.error);
        this.loading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Sesión expirada. Por favor inicia sesión de nuevo.';
        } else if (error.status === 0) {
          this.errorMessage = 'No hay conexión con la API. Verifica la conexión a internet.';
        } else {
          this.errorMessage = this.mapError(error, 'No se pudieron cargar las etiquetas.');
        }
      },
    });
  }

  applySort(): void {
    this.tags = this.tags.slice().sort((a, b) => {
      if (this.sortMode === 'name') {
        return (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' });
      }

      const first = this.getTagTimestamp(a);
      const second = this.getTagTimestamp(b);
      return this.sortMode === 'oldest' ? first - second : second - first;
    });
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

    const payload: { name: string } = { name };

    this.resourceApi.create<TagEntity, { name: string }>('tags', payload).subscribe({
      next: (created) => {
        this.submitting = false;
        this.newTagName = '';
        this.successMessage = 'Etiqueta creada correctamente.';
        this.tags = [created, ...this.tags];
        this.applySort();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting = false;
        this.errorMessage = this.mapError(error, 'No se pudo crear la etiqueta.');
      },
    });
  }

  deleteTag(tag: TagEntity): void {
    const id = this.getTagId(tag);
    if (!id) {
      this.errorMessage = 'La etiqueta seleccionada no tiene identificador valido.';
      return;
    }

    const name = tag.name ?? 'esta etiqueta';
    if (!globalThis.confirm(`Eliminar #${name}? Esta accion no se puede deshacer.`)) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.resourceApi.remove('tags', id).subscribe({
      next: () => {
        this.tags = this.tags.filter((item) => this.getTagId(item) !== id);
        this.deletingId = '';
        this.successMessage = 'Etiqueta eliminada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.deletingId = '';
        this.errorMessage = this.mapError(error, 'No se pudo eliminar la etiqueta.');
      },
    });
  }

  trackByTag(index: number, tag: TagEntity): string {
    return tag._id ?? `${tag.name ?? 'tag'}-${index}`;
  }

  getTagId(tag: TagEntity): string {
    return tag._id ?? '';
  }

  private getTagTimestamp(tag: TagEntity): number {
    const source = tag.createdAt ?? tag.created_at ?? tag.updatedAt ?? tag.updated_at;
    if (!source) {
      return 0;
    }

    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private mapError(error: HttpErrorResponse, fallback: string): string {
    const details = error.error?.detail;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0] as { msg?: string; loc?: unknown[] };
      const msg = typeof first?.msg === 'string' ? first.msg : 'Solicitud invalida.';
      const field = Array.isArray(first?.loc) ? first.loc.at(-1) : undefined;
      if (typeof field === 'string') {
        return `${msg} Campo: ${field}.`;
      }
      return msg;
    }

    const backendMessage = error.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    if (error.status === 0) {
      return 'No hay conexion con la API. Revisa la URL base y CORS.';
    }

    if (error.status === 422) {
      const fallbackDetails = typeof error.error === 'object' ? JSON.stringify(error.error) : String(error.error ?? '');
      return fallbackDetails ? `La API rechazo los datos (422): ${fallbackDetails}` : 'La API rechazo los datos enviados (422).';
    }

    return fallback;
  }

  private resolveCurrentIdentity(): void {
    this.currentUsername = (this.tokenStorage.getUsername() ?? '').trim().toLowerCase();

    const token = this.tokenStorage.getToken();
    if (!token) {
      this.currentUserId = '';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const candidates = [payload['userId'], payload['user_id'], payload['id'], payload['_id'], payload['sub']];
      const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
      this.currentUserId = found?.trim() ?? '';
    } catch {
      this.currentUserId = '';
    }
  }

  private filterTagsForCurrentUser(tags: TagEntity[]): TagEntity[] {
    if (tags.length === 0) {
      return [];
    }

    if (!this.currentUserId && !this.currentUsername) {
      this.resolveCurrentIdentity();
    }

    const hasOwnershipFields = tags.some((tag) => !!this.getTagOwnerId(tag) || !!this.getTagOwnerUsername(tag));
    const filtered = tags.filter((tag) => {
      const ownerId = this.getTagOwnerId(tag);
      if (this.currentUserId && ownerId) {
        return ownerId === this.currentUserId;
      }

      const ownerUsername = this.getTagOwnerUsername(tag);
      if (this.currentUsername && ownerUsername) {
        return ownerUsername === this.currentUsername;
      }

      return false;
    });

    // Privacy-first fallback: if backend sent mixed/global tags without ownership metadata,
    // do not render potentially foreign records.
    if (hasOwnershipFields) {
      return filtered;
    }

    this.errorMessage = 'La API de etiquetas no devolvió owner (userId/username). No se muestran datos por seguridad.';
    return [];
  }

  private getTagOwnerId(tag: TagEntity): string {
    const ownerFromUser = tag.user?._id ?? tag.user?.id;
    const owner = tag.userId ?? tag.user_id ?? ownerFromUser;
    return typeof owner === 'string' ? owner.trim() : '';
  }

  private getTagOwnerUsername(tag: TagEntity): string {
    const owner = tag.username ?? tag.user?.username ?? tag.user?.name;
    return typeof owner === 'string' ? owner.trim().toLowerCase() : '';
  }
}
