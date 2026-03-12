import { InjectionToken } from '@angular/core';

const DEFAULT_API_BASE_URL = 'http://18.223.30.63:5000';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => DEFAULT_API_BASE_URL,
});
