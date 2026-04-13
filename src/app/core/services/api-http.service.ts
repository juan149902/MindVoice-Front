import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, timeout, retry, catchError, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class ApiHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly RETRY_ATTEMPTS = 1;
  private readonly RETRY_DELAY = 100;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), {
      params: this.buildParams(params),
    }).pipe(
      timeout(this.REQUEST_TIMEOUT),
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
        timeout(this.REQUEST_TIMEOUT),
        retry({
          count: this.RETRY_ATTEMPTS,
          delay: this.RETRY_DELAY,
        })
      );
    }
    return this.http.post<T>(this.buildUrl(path), body).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: this.RETRY_DELAY,
      })
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: this.RETRY_DELAY,
      })
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path)).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: this.RETRY_DELAY,
      })
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
}
