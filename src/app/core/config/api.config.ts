import { InjectionToken } from '@angular/core';

const DEFAULT_API_BASE_URL = '/api';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => DEFAULT_API_BASE_URL,
});
