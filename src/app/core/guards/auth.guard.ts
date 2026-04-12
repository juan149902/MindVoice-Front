/**
 * AuthGuard - Guard funcional para proteger rutas autenticadas
 * MindVoice - Angular 21 con JWT del backend Flask
 * 
 * Verifica que exista un token JWT válido antes de permitir
 * el acceso a rutas protegidas. Redirige a /auth si no autenticado.
 */
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Verifica si un token JWT ha expirado
 * @param token - JWT en formato string
 * @returns true si el token ha expirado o es inválido
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    const exp = payload['exp'] as number | undefined;

    if (!exp) {
      // Si no hay exp, asumimos que es válido (algunos JWTs no expiran)
      return false;
    }

    // exp está en segundos, Date.now() en milisegundos
    const expirationTime = exp * 1000;
    const now = Date.now();

    // Agregamos 10 segundos de margen para evitar race conditions
    return now >= (expirationTime - 10000);
  } catch {
    // Si no podemos parsear el token, lo consideramos expirado
    return true;
  }
}

/**
 * Guard funcional para rutas que requieren autenticación
 * 
 * Uso en app.routes.ts:
 * ```typescript
 * {
 *   path: 'dashboard',
 *   loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
 *   canActivate: [authGuard]
 * }
 * ```
 */
export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  // En SSR, permitir acceso para que se renderice el componente
  // El componente debe manejar la autenticación en el cliente
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = tokenStorage.getToken();

  // Si no hay token, redirigir a login
  if (!token) {
    console.log('[AuthGuard] No token found, redirecting to /auth');
    return router.createUrlTree(['/auth'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // Verificar si el token ha expirado
  if (isTokenExpired(token)) {
    console.log('[AuthGuard] Token expired, clearing and redirecting to /auth');
    tokenStorage.clearToken();
    tokenStorage.clearUsername();
    return router.createUrlTree(['/auth'], {
      queryParams: { 
        returnUrl: state.url,
        expired: 'true'
      }
    });
  }

  // Token válido, permitir acceso
  return true;
};

/**
 * Guard funcional para rutas públicas que NO deben ser accesibles si autenticado
 * Por ejemplo, la página de login/registro
 * 
 * Uso en app.routes.ts:
 * ```typescript
 * {
 *   path: 'auth',
 *   loadComponent: () => import('./pages/auth/auth').then(m => m.AuthComponent),
 *   canActivate: [publicOnlyGuard]
 * }
 * ```
 */
export const publicOnlyGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  // En SSR, permitir acceso
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = tokenStorage.getToken();

  // Si hay token válido, redirigir al dashboard
  if (token && !isTokenExpired(token)) {
    console.log('[PublicOnlyGuard] User already authenticated, redirecting to /dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  // No autenticado, permitir acceso a ruta pública
  return true;
};
