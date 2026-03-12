import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners, isDevMode,
} from '@angular/core';
import {provideRouter} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import {routes} from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes), provideHttpClient(withFetch(), withInterceptors([authTokenInterceptor])), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })],
};
