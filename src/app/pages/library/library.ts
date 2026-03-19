import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ApiEntity } from '../../core/models/api.models';
import { ResourceApiService } from '../../core/services/resource-api.service';
import { TokenStorageService } from '../../core/services/token-storage.service';

interface FolderEntity extends ApiEntity {
  _id?: string;
  userId?: string;
  parentFolderId?: string;
  name?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type SortMode = 'newest' | 'oldest' | 'name';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-6 shadow-2xl">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-black text-white tracking-tight">Biblioteca de Carpetas</h1>
            <p class="text-sm text-gray-400 mt-1">Solo muestra datos guardados por la API.</p>
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
              (click)="loadFolders()"
              [disabled]="loading || submitting">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg">refresh</mat-icon>
                Recargar
              </span>
            </button>
          </div>
        </div>

        <form class="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-3" (submit)="$event.preventDefault(); createFolder()">
          <div class="lg:col-span-3">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</label>
            <input
              [(ngModel)]="newFolderName"
              name="newFolderName"
              type="text"
              maxlength="120"
              class="mt-1 w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
              placeholder="Ej. Reuniones del equipo" />
          </div>
          <div class="lg:col-span-1 flex items-end">
            <button
              type="submit"
              class="w-full h-10 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors disabled:opacity-70"
              [disabled]="submitting || loading">
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg">create_new_folder</mat-icon>
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
            Cargando carpetas...
          </span>
        </div>

        <div *ngIf="!loading && folders.length === 0" class="h-48 flex items-center justify-center text-center text-gray-400">
          <div>
            <mat-icon class="text-4xl text-primary mb-2">folder_open</mat-icon>
            <p class="text-base font-semibold text-gray-300">No hay carpetas registradas</p>
            <p class="text-sm">Crea tu primera carpeta para empezar.</p>
          </div>
        </div>

        <div *ngIf="!loading && folders.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <article
            *ngFor="let folder of folders; let idx = index; trackBy: trackByFolder"
            class="rounded-xl border border-border-dark bg-background-dark/70 p-4 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 transition-all">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <mat-icon class="text-primary">folder</mat-icon>
                <h3 class="text-white font-bold text-base leading-tight break-words truncate">{{ folder.name || 'Sin nombre' }}</h3>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  (click)="startEdit(folder)">
                  <mat-icon class="text-lg">edit</mat-icon>
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-md text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  (click)="deleteFolder(folder)"
                  [disabled]="deletingId === getFolderId(folder)">
                  <mat-icon class="text-lg">delete</mat-icon>
                </button>
              </div>
            </div>

            <form *ngIf="editingId === getFolderId(folder)" class="mt-3 space-y-3" (submit)="$event.preventDefault(); saveEdit(folder)">
              <input
                [(ngModel)]="editName"
                name="editName-{{idx}}"
                type="text"
                maxlength="120"
                class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
                placeholder="Nombre de carpeta" />
              <div class="flex gap-2 justify-end">
                <button type="button" class="h-9 px-3 rounded-md border border-border-dark text-sm text-gray-300 hover:bg-border-dark/70" (click)="cancelEdit()">Cancelar</button>
                <button
                  type="submit"
                  class="h-9 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-70"
                  [disabled]="savingId === getFolderId(folder)">
                  Guardar
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </div>
  `
})
export class LibraryComponent implements OnInit {
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  folders: FolderEntity[] = [];
  sortMode: SortMode = 'newest';
  loading = false;
  submitting = false;
  savingId = '';
  deletingId = '';

  newFolderName = '';
  editingId = '';
  editName = '';

  errorMessage = '';
  successMessage = '';
  currentUserId = '';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadFolders();
  }

  loadFolders(): void {
    this.loading = true;
    this.errorMessage = '';

    this.resourceApi.list<FolderEntity>('folders').subscribe({
      next: (folders) => {
        this.folders = folders.slice();
        if (!this.currentUserId) {
          this.currentUserId = this.folders.find((folder) => !!folder.userId)?.userId ?? '';
        }
        this.applySort();
        this.loading = false;
        this.cdr.markForCheck();
        console.log('[LIBRARY] Folders loaded successfully:', this.folders.length);
      },
      error: (error: HttpErrorResponse) => {
        console.error('[LIBRARY] Failed to load folders:', error.status, error.error);
        this.loading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Sesión expirada. Por favor inicia sesión de nuevo.';
        } else if (error.status === 0) {
          this.errorMessage = 'No hay conexión con la API. Verifica la conexión a internet.';
        } else {
          this.errorMessage = this.mapError(error, 'No se pudieron cargar las carpetas.');
        }
      },
    });
  }

  applySort(): void {
    this.folders = this.folders.slice().sort((a, b) => {
      if (this.sortMode === 'name') {
        return (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' });
      }

      const first = this.getFolderTimestamp(a);
      const second = this.getFolderTimestamp(b);
      return this.sortMode === 'oldest' ? first - second : second - first;
    });
  }

  createFolder(): void {
    if (!this.ensureCurrentUserId()) {
      return;
    }

    const name = this.newFolderName.trim();
    if (!name) {
      this.errorMessage = 'El nombre de la carpeta es obligatorio.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: { userId: string; name: string } = {
      userId: this.currentUserId,
      name,
    };

    this.resourceApi.create<FolderEntity, { userId: string; name: string }>('folders', payload).subscribe({
      next: (created) => {
        this.submitting = false;
        this.newFolderName = '';
        this.successMessage = 'Carpeta creada correctamente.';
        this.folders = [created, ...this.folders];
        this.applySort();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting = false;
        this.errorMessage = this.mapError(error, 'No se pudo crear la carpeta.');
      },
    });
  }

  startEdit(folder: FolderEntity): void {
    this.editingId = this.getFolderId(folder);
    this.editName = (folder.name ?? '').trim();
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.editName = '';
  }

  saveEdit(folder: FolderEntity): void {
    if (!this.ensureCurrentUserId()) {
      return;
    }

    const id = this.getFolderId(folder);
    if (!id) {
      this.errorMessage = 'La carpeta seleccionada no tiene identificador valido.';
      return;
    }

    const name = this.editName.trim();
    if (!name) {
      this.errorMessage = 'El nombre de la carpeta no puede quedar vacio.';
      return;
    }

    this.savingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: { userId: string; name: string; parentFolderId?: string } = {
      userId: folder.userId ?? this.currentUserId,
      name,
    };
    if (folder.parentFolderId && typeof folder.parentFolderId === 'string') {
      payload.parentFolderId = folder.parentFolderId;
    }

    this.resourceApi.update<FolderEntity, { userId: string; name: string; parentFolderId?: string }>('folders', id, payload).subscribe({
      next: (updated) => {
        this.folders = this.folders.map((item) => (this.getFolderId(item) === id ? { ...item, ...updated } : item));
        this.savingId = '';
        this.cancelEdit();
        this.applySort();
        this.successMessage = 'Carpeta actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.savingId = '';
        this.errorMessage = this.mapError(error, 'No se pudo actualizar la carpeta.');
      },
    });
  }

  deleteFolder(folder: FolderEntity): void {
    const id = this.getFolderId(folder);
    if (!id) {
      this.errorMessage = 'La carpeta seleccionada no tiene identificador valido.';
      return;
    }

    const name = folder.name ?? 'esta carpeta';
    if (!globalThis.confirm(`Eliminar ${name}? Esta accion no se puede deshacer.`)) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';
    this.successMessage = '';

    this.resourceApi.remove('folders', id).subscribe({
      next: () => {
        this.folders = this.folders.filter((item) => this.getFolderId(item) !== id);
        this.deletingId = '';
        this.successMessage = 'Carpeta eliminada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.deletingId = '';
        this.errorMessage = this.mapError(error, 'No se pudo eliminar la carpeta.');
      },
    });
  }

  trackByFolder(index: number, folder: FolderEntity): string {
    return folder._id ?? `${folder.name ?? 'folder'}-${index}`;
  }

  getFolderId(folder: FolderEntity): string {
    return folder._id ?? '';
  }

  private ensureCurrentUserId(): boolean {
    if (this.currentUserId) {
      return true;
    }

    this.resolveCurrentUserId();
    if (this.currentUserId) {
      return true;
    }

    this.currentUserId = this.folders.find((folder) => !!folder.userId)?.userId ?? '';
    if (this.currentUserId) {
      return true;
    }

    this.errorMessage = 'No se pudo determinar el userId de la sesion. Vuelve a iniciar sesion.';
    return false;
  }

  private resolveCurrentUserId(): void {
    if (this.currentUserId) {
      return;
    }

    const token = this.tokenStorage.getToken();
    if (!token) {
      return;
    }

    const fromToken = this.extractUserIdFromToken(token);
    if (fromToken) {
      this.currentUserId = fromToken;
    }
  }

  private extractUserIdFromToken(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const candidates = [payload['userId'], payload['user_id'], payload['id'], payload['_id'], payload['sub']];
      const userId = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
      return userId?.trim() ?? '';
    } catch {
      return '';
    }
  }

  private getFolderTimestamp(folder: FolderEntity): number {
    const source = folder.createdAt ?? folder.created_at ?? folder.updatedAt ?? folder.updated_at;
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
}
