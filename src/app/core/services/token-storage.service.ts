import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly tokenKey = 'mindvoice_access_token';
  private readonly refreshTokenKey = 'mindvoice_refresh_token';
  private readonly usernameKey = 'mindvoice_username';
  private readonly platformId = inject(PLATFORM_ID);

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

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.refreshTokenKey, token);
  }

  clearRefreshToken(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(this.refreshTokenKey);
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

  getUserId(): string | null {
    const payload = this.getTokenPayload();
    if (!payload) {
      return null;
    }

    const candidates = ['sub', 'userId', 'user_id', 'id', '_id'];
    for (const claim of candidates) {
      const value = payload[claim];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  getTokenPayload(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const json = this.decodeJwtPart(parts[1]);
      return JSON.parse(json) as Record<string, unknown>;
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

  private getUsernameFromToken(): string | null {
    const payload = this.getTokenPayload();
    if (!payload) {
      return null;
    }

    const username = payload['username'];
    if (typeof username === 'string' && username.trim().length > 0) {
      return username;
    }

    const name = payload['name'];
    return typeof name === 'string' && name.trim().length > 0 ? name : null;
  }

  private decodeJwtPart(part: string): string {
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding === 0
      ? normalized
      : `${normalized}${'='.repeat(4 - padding)}`;
    return atob(padded);
  }
}
