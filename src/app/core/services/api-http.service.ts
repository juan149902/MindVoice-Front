import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, timeout, retry } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ApiHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly LONG_REQUEST_TIMEOUT = 180000; // 3 minutes for IA audio analysis
  private readonly MEDIUM_REQUEST_TIMEOUT = 60000; // 1 minute for IA text analysis
  private readonly RETRY_ATTEMPTS = 1;
  private readonly RETRY_DELAY = 100;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), {
      params: this.buildParams(params),
    }).pipe(
      timeout(this.resolveTimeout(path)),
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: this.RETRY_DELAY,
      })
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    // FormData: let browser handle headers
    if (body instanceof FormData) {
      return this.http.post<T>(this.buildUrl(path), body).pipe(
        timeout(this.resolveTimeout(path)),
      );
    }
    return this.http.post<T>(this.buildUrl(path), body).pipe(
      timeout(this.resolveTimeout(path)),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body).pipe(
      timeout(this.resolveTimeout(path)),
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path)).pipe(
      timeout(this.resolveTimeout(path)),
    );
  }

  private buildUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${this.baseUrl}/${cleanPath}`;
  }

  private buildParams(params?: Record<string, string | number | boolean>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private resolveTimeout(path: string): number {
    const normalizedPath = path.trim().toLowerCase();

    if (normalizedPath.includes('mindvoice-api/analyze/audio')) {
      return this.LONG_REQUEST_TIMEOUT;
    }

    if (normalizedPath.includes('mindvoice-api/analyze/text')) {
      return this.MEDIUM_REQUEST_TIMEOUT;
    }

    return this.REQUEST_TIMEOUT;
  }
}
