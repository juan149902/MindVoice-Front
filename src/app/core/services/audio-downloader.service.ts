import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AudioDownloaderService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL);

  downloadAudioBlob(filePath: string): Observable<Blob> {
    // Si filePath es una URL completa, usarla directamente
    if (filePath.startsWith('http')) {
      return this.http.get(filePath, { responseType: 'blob' });
    }

    // Asegurarse de que hay un slash entre base URL y el path
    const baseUrl = this.apiBaseUrl.replace(/\/$/, '');
    const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const url = `${baseUrl}${path}`;

    return this.http.get(url, { responseType: 'blob' });
  }

  async downloadAudioBlobPromise(filePath: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.downloadAudioBlob(filePath).subscribe({
        next: (blob) => resolve(blob),
        error: (err) => reject(err),
      });
    });
  }
}
