/**
 * HealthCheckService - Verifica conexión con el backend
 * MindVoice - Conexión al backend Flask
 */
import { Injectable, inject } from '@angular/core';
import { Observable, of, timeout, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiHttpService } from './api-http.service';

export interface HealthStatus {
  connected: boolean;
  apiUrl: string;
  responseTime?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class HealthCheckService {
  private readonly api = inject(ApiHttpService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Verifica si el backend está disponible
   * Hace un request a /api/health o endpoint base
   */
  check(): Observable<HealthStatus> {
    const startTime = Date.now();
    const apiUrl = this.apiBaseUrl;

    return this.api.get<unknown>('').pipe(
      timeout(5000),
      map(() => ({
        connected: true,
        apiUrl,
        responseTime: Date.now() - startTime
      })),
      catchError((error) => {
        return of({
          connected: false,
          apiUrl,
          error: error.message || 'Error de conexión'
        });
      })
    );
  }

  /**
   * Verifica conexión simple (solo ping)
   */
  ping(): Observable<boolean> {
    return this.check().pipe(
      map(status => status.connected)
    );
  }
}
