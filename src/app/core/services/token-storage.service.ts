import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly tokenKey = 'mindvoice_access_token';
  private readonly usernameKey = 'mindvoice_username';

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.tokenKey, token);
  }

  clearToken(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(this.tokenKey);
  }

  getUsername(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const stored = localStorage.getItem(this.usernameKey);
    if (stored) {
      return stored;
    }

    return this.getUsernameFromToken();
  }

  private getUsernameFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      return (payload['username'] as string) ?? (payload['name'] as string) ?? null;
    } catch {
      return null;
    }
  }

  setUsername(username: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.usernameKey, username);
  }

  clearUsername(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(this.usernameKey);
  }
}
