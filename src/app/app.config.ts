import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners, isDevMode,
} from '@angular/core';
import {provideRouter} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {routes} from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { GlobalErrorHandlerService } from './core/services/global-error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), 
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideRouter(routes), 
    provideHttpClient(
      withFetch(), 
      // jwtInterceptor adjunta JWT y redirige a auth cuando la API responde 401
      withInterceptors([jwtInterceptor])
    ),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
};
