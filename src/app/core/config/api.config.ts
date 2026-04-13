import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

const REMOTE_API_URL = 'http://18.223.30.63:5000';
const LOCAL_PROXY_API_URL = '/api';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (isLocalHost) {
      return LOCAL_PROXY_API_URL;
    }

    return environment.apiUrl?.trim() || REMOTE_API_URL;
  },
});
