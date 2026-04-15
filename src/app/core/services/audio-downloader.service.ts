import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AudioDownloaderService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  private platformId = inject(PLATFORM_ID);

  downloadAudioBlob(filePath: string): Observable<Blob> {
    const url = this.resolveAudioCandidates(filePath)[0] ?? this.resolveAudioUrl(filePath);
    return this.http.get(url, { responseType: 'blob' });
  }

  async downloadAudioBlobPromise(filePath: string): Promise<Blob> {
    const candidates = this.resolveAudioCandidates(filePath);
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        return await firstValueFrom(this.http.get(candidate, { responseType: 'blob' }));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error(`No se pudo descargar el audio para: ${filePath}`);
  }

  resolveAudioUrl(filePath: string): string {
    const trimmedPath = filePath.trim();
    if (!trimmedPath) {
      return trimmedPath;
    }

    if (trimmedPath.startsWith('blob:') || trimmedPath.startsWith('data:')) {
      return trimmedPath;
    }

    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      return this.toProxiedUrlIfPossible(trimmedPath);
    }

    const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
    return `${this.apiBaseUrl}${normalizedPath}`;
  }

  resolveAudioCandidates(filePath: string): string[] {
    const trimmedPath = filePath.trim();
    if (!trimmedPath) {
      return [];
    }

    if (trimmedPath.startsWith('blob:') || trimmedPath.startsWith('data:')) {
      return [trimmedPath];
    }

    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      return [this.toProxiedUrlIfPossible(trimmedPath)];
    }

    const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
    const fileName = normalizedPath.split('/').pop() ?? normalizedPath.replace(/^\//, '');
    const encodedName = encodeURIComponent(fileName);
    const isPlainFileName = !trimmedPath.includes('/') && /\.[a-z0-9]+$/i.test(trimmedPath);

    const candidates = isPlainFileName
      ? [
          `${this.apiBaseUrl}/audios/${encodedName}`,
          `${this.apiBaseUrl}/files/${encodedName}`,
          `${this.apiBaseUrl}/uploads/${encodedName}`,
          `${this.apiBaseUrl}${normalizedPath}`,
        ]
      : [
          `${this.apiBaseUrl}${normalizedPath}`,
          `${this.apiBaseUrl}/uploads/${encodedName}`,
          `${this.apiBaseUrl}/audios/${encodedName}`,
          `${this.apiBaseUrl}/files/${encodedName}`,
        ];

    return Array.from(new Set(candidates));
  }

  private toProxiedUrlIfPossible(url: string): string {
    if (!isPlatformBrowser(this.platformId)) {
      return url;
    }

    const currentHost = globalThis.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return url;
    }

    try {
      const parsed = new URL(url);
      const apiOrigin = this.apiBaseUrl.startsWith('http')
        ? new URL(this.apiBaseUrl).origin
        : '';
      const remoteOrigin = apiOrigin || 'https://mindvoice-ai.com';

      if (parsed.origin === remoteOrigin) {
        return `/api${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return url;
    }

    return url;
  }
}
