import { InjectionToken } from '@angular/core';

const DEFAULT_API_BASE_URL = '/api';
const LOCAL_API_BASE_URL = 'http://18.223.30.63:5000';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => {
    const host = globalThis.location?.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return LOCAL_API_BASE_URL;
    }

    return DEFAULT_API_BASE_URL;
  },
});
