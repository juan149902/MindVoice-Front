import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

function hasValidSessionToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    const exp = payload['exp'];

    if (typeof exp !== 'number') {
      return true;
    }

    return Date.now() < (exp * 1000) - 10000;
  } catch {
    return false;
  }
}

/**
 * Permite acceso a /mind-maps si:
 * 1) hay sesión JWT válida, o
 * 2) la URL trae ?session=<mindmapId> (modo invitado por link compartido), o
 * 3) la URL trae ?shared=true o ?shareToken=<token> (modo de vista compartida)
 */
export const mindmapAccessGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Verificar autenticación válida
  const token = tokenStorage.getToken();
  if (token && hasValidSessionToken(token)) {
    return true;
  }

  // Permitir acceso compartido por: ?session=id o ?shared=true o ?shareToken=token
  const sharedSession = route.queryParamMap.get('session');
  const isShared = route.queryParamMap.get('shared') === 'true';
  const shareToken = route.queryParamMap.get('shareToken');

  if (
    (typeof sharedSession === 'string' && sharedSession.trim().length > 0) ||
    isShared ||
    (typeof shareToken === 'string' && shareToken.trim().length > 0)
  ) {
    return true;
  }

  return router.createUrlTree(['/auth'], {
    queryParams: { returnUrl: state.url },
  });
};
