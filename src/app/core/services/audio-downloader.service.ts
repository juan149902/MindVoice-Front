import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AudioDownloaderService {
  private http = inject(HttpClient);

  downloadAudioBlob(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob',
    });
  }

  async downloadAudioBlobPromise(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.downloadAudioBlob(url).subscribe({
        next: (blob) => resolve(blob),
        error: (err) => reject(err),
      });
    });
  }
}
