import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { TokenStorageService } from '../services/token-storage.service';

let isRedirectingToAuth = false;

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);
  const baseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  const isApiRequest = req.url.startsWith(baseUrl) || req.url.includes('18.223.30.63:5000');
  if (!isApiRequest) {
    return next(req);
  }

  const token = tokenStorage.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenStorage.clearToken();
        tokenStorage.clearRefreshToken();
        tokenStorage.clearUsername();

        if (!isRedirectingToAuth) {
          isRedirectingToAuth = true;
          void router.navigate(['/auth'], {
            queryParams: { expired: 'true' },
          }).finally(() => {
            isRedirectingToAuth = false;
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
