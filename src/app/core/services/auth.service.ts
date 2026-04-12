import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Request para login - El backend Flask usa 'username' (según OpenAPI spec)
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Respuesta del login del backend Flask
 */
export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

/**
 * Request para registro (UserCreate según OpenAPI)
 * Campos requeridos: username, email, password, name
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  roleId?: string;
}

/**
 * Respuesta del registro del backend Flask (User schema)
 */
export interface RegisterResponse {
  _id: string;
  username: string;
  email: string;
  name: string;
  status?: string;
  roleId?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiHttpService);
  private readonly tokenStorage = inject(TokenStorageService);

  /**
   * Inicia sesión con username y password
   * POST /auth/login → { username, password } → { access_token }
   */
  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', payload).pipe(
      tap((response) => {
        // Guardar access token
        this.tokenStorage.setToken(response.access_token);
        
        // Guardar refresh token si viene
        if (response.refresh_token) {
          this.tokenStorage.setRefreshToken(response.refresh_token);
        }
        
        // Guardar username
        this.tokenStorage.setUsername(payload.username);
      }),
    );
  }

  /**
   * Registra un nuevo usuario
   * POST /users/ → { username, email, password, name } → User
   * NOTA: Según OpenAPI, el registro es en /users/ no en /auth/register
   */
  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.api.post<RegisterResponse>('users/', payload);
  }

  /**
   * Cierra sesión (limpia tokens locales)
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Limpia la sesión local (tokens y datos del usuario)
   */
  clearSession(): void {
    this.tokenStorage.clearToken();
    this.tokenStorage.clearRefreshToken();
    this.tokenStorage.clearUsername();
  }

  /**
   * Verifica si hay una sesión activa (token presente)
   */
  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  /**
   * Obtiene el nombre del usuario actual
   */
  getCurrentUsername(): string | null {
    return this.tokenStorage.getUsername();
  }
}
