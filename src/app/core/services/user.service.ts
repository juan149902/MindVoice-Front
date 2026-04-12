import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { TokenStorageService } from './token-storage.service';

export interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  status?: string;
  roleId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  name?: string | null;
  status?: string;
  roleId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiHttpService);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  getProfile(): Observable<User> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this._error.set('No se encontró userId en la sesión actual.');
      return throwError(() => new Error('No se encontró userId en la sesión actual.'));
    }

    this._loading.set(true);
    this._error.set(null);

    return this.api.get<User>(`users/${userId}`).pipe(
      tap((user) => {
        this._user.set(user);
        this._loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this._loading.set(false);
        this._error.set(this.extractErrorMessage(error));
        return throwError(() => error);
      }),
    );
  }

  updateProfile(payload: UpdateUserPayload): Observable<User> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this._error.set('No se encontró userId en la sesión actual.');
      return throwError(() => new Error('No se encontró userId en la sesión actual.'));
    }

    this._loading.set(true);
    this._error.set(null);

    return this.api.put<User>(`users/${userId}`, payload).pipe(
      tap((user) => {
        this._user.set(user);
        this._loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this._loading.set(false);
        this._error.set(this.extractErrorMessage(error));
        return throwError(() => error);
      }),
    );
  }

  deleteAccount(): Observable<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this._error.set('No se encontró userId en la sesión actual.');
      return throwError(() => new Error('No se encontró userId en la sesión actual.'));
    }

    this._loading.set(true);
    this._error.set(null);

    return this.api.delete<void>(`users/${userId}`).pipe(
      tap(() => {
        this._user.set(null);
        this._loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this._loading.set(false);
        this._error.set(this.extractErrorMessage(error));
        return throwError(() => error);
      }),
    );
  }

  getInitials(): string {
    const user = this._user();
    if (!user?.name) {
      return '??';
    }

    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  clearError(): void {
    this._error.set(null);
  }

  private getCurrentUserId(): string | null {
    return this.tokenStorage.getUserId();
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const details = error.error?.errors;
    if (details && typeof details === 'object') {
      const firstKey = Object.keys(details)[0];
      const firstValue = details[firstKey];
      if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
        return firstValue[0];
      }

      if (firstValue && typeof firstValue === 'object') {
        const nestedKey = Object.keys(firstValue)[0];
        const nestedValue = firstValue[nestedKey];
        if (Array.isArray(nestedValue) && nestedValue.length > 0 && typeof nestedValue[0] === 'string') {
          return nestedValue[0];
        }
      }
    }

    const backendMessage = error.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    switch (error.status) {
      case 0:
        return 'No hay conexión con la API.';
      case 401:
        return 'Sesión expirada. Inicia sesión nuevamente.';
      case 403:
        return 'No tienes permiso para realizar esta acción.';
      case 404:
        return 'Usuario no encontrado.';
      case 422:
        return 'La API rechazó los datos enviados.';
      default:
        return `Error ${error.status}: ${error.statusText || 'Error inesperado.'}`;
    }
  }
}
