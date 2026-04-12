/**
 * TagsService - Servicio para gestión de etiquetas
 * MindVoice - Conexión al backend Flask
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 🐛 BUG CORREGIDO: Los tags no se mostraban en la vista
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * DIAGNÓSTICO:
 * El backend Flask devuelve los tags envueltos: { tags: [...] }
 * El ResourceApiService.list() esperaba directamente un array T[]
 * Por lo tanto, el componente recibía { tags: [...] } e iteraba sobre un objeto,
 * no sobre el array, resultando en 0 elementos visibles.
 * 
 * FIX APLICADO:
 * 1. Se creó este TagsService dedicado que extrae .tags de la respuesta
 * 2. Se usa map(response => response.tags) en el pipe de RxJS
 * 3. Se agregó manejo de errores robusto y estado con BehaviorSubject
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */
import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, map, tap, throwError, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

/**
 * Entidad Tag del backend Flask
 */
export interface Tag {
  _id: string;
  name: string;
  color?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Respuesta envuelta del backend para GET /tags
 * ⚠️ El backend Flask devuelve { tags: [...] }, NO un array directo
 */
export interface TagsApiResponse {
  tags: Tag[];
}

/**
 * Respuesta para operaciones individuales de tag
 */
export interface TagApiResponse {
  tag: Tag;
}

/**
 * Payload para crear un tag
 */
export interface CreateTagPayload {
  name: string;
  color?: string;
}

/**
 * Payload para actualizar un tag
 */
export interface UpdateTagPayload {
  name?: string;
  color?: string;
}

/**
 * Estado del servicio de tags
 */
export interface TagsState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class TagsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly platformId = inject(PLATFORM_ID);

  // Estado reactivo con BehaviorSubject para compatibilidad con async pipe
  private readonly stateSubject = new BehaviorSubject<TagsState>({
    tags: [],
    loading: false,
    error: null
  });

  // Signals para acceso moderno (Angular 21)
  private readonly _tags = signal<Tag[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Selectores públicos como signals
  readonly tags = this._tags.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isEmpty = computed(() => this._tags().length === 0);

  // Observable del estado completo para componentes que prefieren RxJS
  readonly state$ = this.stateSubject.asObservable();

  /**
   * Obtiene la URL completa del endpoint
   * IMPORTANTE: El backend Flask requiere trailing slash en las rutas
   */
  private getUrl(path: string = ''): string {
    const base = this.baseUrl.replace(/\/$/, '');
    // Flask requiere trailing slash: /tags/ no /tags
    return path ? `${base}/tags/${path}` : `${base}/tags/`;
  }

  /**
   * Actualiza el estado interno y emite a los suscriptores
   */
  private updateState(partial: Partial<TagsState>): void {
    const current = this.stateSubject.value;
    const newState = { ...current, ...partial };
    
    this.stateSubject.next(newState);
    this._tags.set(newState.tags);
    this._loading.set(newState.loading);
    this._error.set(newState.error);
  }

  /**
   * Carga todos los tags del usuario autenticado
   * 
   * Según OpenAPI: GET /tags/ devuelve directamente un array Tag[]
   */
  loadTags(): Observable<Tag[]> {
    // Guard SSR
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    this.updateState({ loading: true, error: null });

    return this.http.get<Tag[] | TagsApiResponse>(this.getUrl()).pipe(
      // Manejar ambos formatos: array directo o { tags: [...] }
      map(response => {
        if (Array.isArray(response)) {
          return response;
        }
        // Fallback por si el backend envuelve la respuesta
        return (response as TagsApiResponse).tags ?? [];
      }),
      tap(tags => {
        console.log('[TagsService] Tags loaded successfully:', tags.length);
        this.updateState({ tags, loading: false });
      }),
      catchError((error: HttpErrorResponse) => {
        const message = this.extractErrorMessage(error);
        console.error('[TagsService] Failed to load tags:', error.status, message);
        this.updateState({ loading: false, error: message });
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea un nuevo tag
   * Según OpenAPI: POST /tags/ devuelve directamente un Tag
   */
  createTag(payload: CreateTagPayload): Observable<Tag> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('Cannot create tag in SSR'));
    }

    this.updateState({ loading: true, error: null });

    return this.http.post<Tag | TagApiResponse>(this.getUrl(), payload).pipe(
      map(response => {
        // Manejar ambos formatos: objeto directo o { tag: {...} }
        if ('_id' in response && 'name' in response) {
          return response as Tag;
        }
        return (response as TagApiResponse).tag;
      }),
      tap(tag => {
        console.log('[TagsService] Tag created:', tag.name);
        const currentTags = this._tags();
        this.updateState({ 
          tags: [tag, ...currentTags], 
          loading: false 
        });
      }),
      catchError((error: HttpErrorResponse) => {
        const message = this.extractErrorMessage(error);
        console.error('[TagsService] Failed to create tag:', error.status, message);
        this.updateState({ loading: false, error: message });
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza un tag existente
   * @param id - MongoDB ObjectId (24 caracteres hex)
   */
  updateTag(id: string, payload: UpdateTagPayload): Observable<Tag> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('Cannot update tag in SSR'));
    }

    return this.http.put<TagApiResponse>(this.getUrl(id), payload).pipe(
      map(response => {
        if ('tag' in response) {
          return response.tag;
        }
        return response as unknown as Tag;
      }),
      tap(updatedTag => {
        console.log('[TagsService] Tag updated:', updatedTag.name);
        const currentTags = this._tags();
        const updatedTags = currentTags.map(t => 
          t._id === id ? updatedTag : t
        );
        this.updateState({ tags: updatedTags });
      }),
      catchError((error: HttpErrorResponse) => {
        const message = this.extractErrorMessage(error);
        console.error('[TagsService] Failed to update tag:', error.status, message);
        this.updateState({ error: message });
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un tag
   * @param id - MongoDB ObjectId (24 caracteres hex)
   */
  deleteTag(id: string): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(() => new Error('Cannot delete tag in SSR'));
    }

    return this.http.delete<void>(this.getUrl(id)).pipe(
      tap(() => {
        console.log('[TagsService] Tag deleted:', id);
        const currentTags = this._tags();
        const filteredTags = currentTags.filter(t => t._id !== id);
        this.updateState({ tags: filteredTags });
      }),
      catchError((error: HttpErrorResponse) => {
        const message = this.extractErrorMessage(error);
        console.error('[TagsService] Failed to delete tag:', error.status, message);
        this.updateState({ error: message });
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene un tag por ID
   */
  getTagById(id: string): Tag | undefined {
    return this._tags().find(t => t._id === id);
  }

  /**
   * Limpia el error actual
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Extrae mensaje de error legible del HttpErrorResponse
   * Maneja el formato de errores del backend Flask-smorest
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    // Formato Flask-smorest: { "errors": { "json": { "campo": ["mensaje"] } } }
    const flaskErrors = error.error?.errors?.json;
    if (flaskErrors && typeof flaskErrors === 'object') {
      const firstField = Object.keys(flaskErrors)[0];
      const messages = flaskErrors[firstField];
      if (Array.isArray(messages) && messages.length > 0) {
        return `${firstField}: ${messages[0]}`;
      }
    }

    // Formato simple: { "message": "..." }
    if (error.error?.message) {
      return error.error.message;
    }

    // Errores HTTP estándar
    switch (error.status) {
      case 0:
        return 'No hay conexión con el servidor. Verifica tu conexión a internet.';
      case 401:
        return 'Sesión expirada. Por favor inicia sesión de nuevo.';
      case 403:
        return 'No tienes permiso para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 422:
        return 'Datos inválidos. Revisa los campos del formulario.';
      case 500:
        return 'Error interno del servidor. Intenta de nuevo más tarde.';
      default:
        return `Error ${error.status}: ${error.statusText || 'Ocurrió un error inesperado.'}`;
    }
  }
}
