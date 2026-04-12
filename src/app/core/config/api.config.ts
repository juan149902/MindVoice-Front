import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

const DEFAULT_API_URL = 'http://18.223.30.63:5000';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => environment.apiUrl?.trim() || DEFAULT_API_URL,
});
