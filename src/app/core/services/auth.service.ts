import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiEntity, LoginRequest, LoginResponse, RegisterRequest } from '../models/api.models';
import { ApiHttpService } from './api-http.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiHttpService);
  private readonly tokenStorage = inject(TokenStorageService);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', payload).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.access_token);
        this.tokenStorage.setUsername(payload.username);
      }),
    );
  }

  register(payload: RegisterRequest): Observable<ApiEntity> {
    return this.api.post<ApiEntity>('users/', payload);
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.tokenStorage.clearUsername();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }
}
