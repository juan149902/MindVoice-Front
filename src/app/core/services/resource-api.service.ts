import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
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
    return this.api
      .get<unknown>(`${resource}/`)
      .pipe(map((response) => this.normalizeListResponse<T>(resource, response)));
  }

  getById<T extends ApiEntity>(resource: ResourceName, id: string | number): Observable<T> {
    return this.api
      .get<unknown>(`${resource}/${id}`)
      .pipe(map((response) => this.normalizeEntityResponse<T>(resource, response)));
  }

  create<T extends ApiEntity, TPayload extends object>(resource: ResourceName, payload: TPayload): Observable<T> {
    return this.api
      .post<unknown>(`${resource}/`, payload)
      .pipe(map((response) => this.normalizeEntityResponse<T>(resource, response)));
  }

  update<T extends ApiEntity, TPayload extends object>(resource: ResourceName, id: string | number, payload: TPayload): Observable<T> {
    return this.api
      .put<unknown>(`${resource}/${id}`, payload)
      .pipe(map((response) => this.normalizeEntityResponse<T>(resource, response)));
  }

  remove(resource: ResourceName, id: string | number): Observable<void> {
    return this.api.delete<void>(`${resource}/${id}`);
  }

  private normalizeListResponse<T extends ApiEntity>(resource: ResourceName, response: unknown): T[] {
    if (Array.isArray(response)) {
      console.log(`[ResourceApi] ${resource}: response is array (${response.length} items)`);
      return response as T[];
    }

    if (!response || typeof response !== 'object') {
      console.warn(`[ResourceApi] ${resource}: response is not an object, returning []`);
      return [];
    }

    const record = response as Record<string, unknown>;
    const keys = this.getCandidateKeys(resource);
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        console.log(`[ResourceApi] ${resource}: found array under key '${key}' (${value.length} items)`);
        return value as T[];
      }
    }

    const firstArray = Object.values(record).find((value) => Array.isArray(value));
    if (Array.isArray(firstArray)) {
      console.log(`[ResourceApi] ${resource}: using first array found in response (${firstArray.length} items)`);
      return firstArray as T[];
    }

    console.warn(`[ResourceApi] ${resource}: no array found in response. Keys in response:`, Object.keys(record));
    return [];
  }

  private normalizeEntityResponse<T extends ApiEntity>(resource: ResourceName, response: unknown): T {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const record = response as Record<string, unknown>;
      if ('_id' in record || 'id' in record) {
        return record as T;
      }

      for (const key of this.getCandidateKeys(resource, true)) {
        const value = record[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return value as T;
        }
      }
    }

    return response as T;
  }

  private getCandidateKeys(resource: ResourceName, includeSingular = false): string[] {
    const singular = resource.endsWith('s') ? resource.slice(0, -1) : resource;
    const normalizedResource = resource.replace(/-/g, '_');
    const normalizedSingular = singular.replace(/-/g, '_');

    const keys = [
      resource,
      normalizedResource,
      this.toCamelCase(resource),
      this.toCamelCase(normalizedResource),
      'items',
      'data',
      'results',
      'rows',
    ];

    if (includeSingular) {
      keys.unshift(singular, normalizedSingular, this.toCamelCase(singular), this.toCamelCase(normalizedSingular));
    }

    return Array.from(new Set(keys));
  }

  private toCamelCase(value: string): string {
    return value.replace(/[-_](\w)/g, (_, char: string) => char.toUpperCase());
  }
}
