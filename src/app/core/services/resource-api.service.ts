import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEntity } from '../models/api.models';
import { ApiHttpService } from './api-http.service';

export type ResourceName =
  | 'users'
  | 'roles'
  | 'profiles'
  | 'folders'
  | 'tags'
  | 'files'
  | 'audios'
  | 'transcriptions'
  | 'ai-analyses'
  | 'documents'
  | 'mindmaps'
  | 'sessions'
  | 'activity-logs';

@Injectable({ providedIn: 'root' })
export class ResourceApiService {
  private readonly api = inject(ApiHttpService);

  list<T extends ApiEntity>(resource: ResourceName): Observable<T[]> {
    return this.api.get<T[]>(`${resource}/`);
  }

  getById<T extends ApiEntity>(resource: ResourceName, id: string | number): Observable<T> {
    return this.api.get<T>(`${resource}/${id}`);
  }

  create<T extends ApiEntity, TPayload extends object>(resource: ResourceName, payload: TPayload): Observable<T> {
    return this.api.post<T>(`${resource}/`, payload);
  }

  update<T extends ApiEntity, TPayload extends object>(resource: ResourceName, id: string | number, payload: TPayload): Observable<T> {
    return this.api.put<T>(`${resource}/${id}`, payload);
  }

  remove(resource: ResourceName, id: string | number): Observable<void> {
    return this.api.delete<void>(`${resource}/${id}`);
  }
}
