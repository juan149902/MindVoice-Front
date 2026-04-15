import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AppLanguage, AppPreferencesService, AppTheme, ExportFormat } from '../../core/services/app-preferences.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <div class="max-w-[860px] mx-auto w-full px-6 py-8 space-y-5 premium-page-shell">

      <!-- Header -->
      <section class="premium-page-hero rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 via-surface-dark/90 to-indigo-900/20 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
        <div class="flex items-center gap-4">
          <div class="size-11 rounded-xl border border-primary/30 bg-primary/15 flex items-center justify-center text-primary">
            <mat-icon>settings</mat-icon>
          </div>
          <div>
            <h2 class="text-white text-2xl font-black leading-tight">{{ t('settings.title') }}</h2>
            <p class="text-sm text-gray-400 mt-0.5">{{ t('settings.subtitle') }}</p>
          </div>
        </div>
      </section>

      <!-- Cuenta -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <mat-icon class="text-primary text-[18px]">person</mat-icon>
          <h3 class="text-sm font-bold text-white">{{ t('settings.account') }}</h3>
        </div>
        <div class="px-5 py-4 flex items-center gap-4">
          <div class="size-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-lg select-none">
            {{ initials() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white font-semibold truncate">{{ displayName() }}</p>
            <p class="text-xs text-gray-400 truncate">{{ displayEmail() }}</p>
          </div>
          <a
            routerLink="/profile"
            class="h-9 px-4 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1.5"
          >
            <mat-icon class="text-[16px]">edit</mat-icon>
            {{ t('settings.account.edit') }}
          </a>
        </div>
      </section>

      <!-- Apariencia -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <mat-icon class="text-primary text-[18px]">palette</mat-icon>
          <h3 class="text-sm font-bold text-white">{{ t('settings.appearance') }}</h3>
        </div>
        <div class="p-5 space-y-5">

          <!-- Idioma -->
          <div>
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <mat-icon class="text-[15px]">language</mat-icon>
              {{ t('settings.language') }}
            </label>
            <div class="grid grid-cols-2 gap-2 max-w-xs">
              <button
                type="button"
                class="h-11 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                [ngClass]="draftLanguage === 'es'
                  ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                  : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
                (click)="draftLanguage = 'es'"
              >
                <span class="text-base">🇲🇽</span> Español
              </button>
              <button
                type="button"
                class="h-11 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                [ngClass]="draftLanguage === 'en'
                  ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                  : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
                (click)="draftLanguage = 'en'"
              >
                <span class="text-base">🇺🇸</span> English
              </button>
            </div>
          </div>

          <!-- Tema -->
          <div>
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <mat-icon class="text-[15px]">brightness_6</mat-icon>
              {{ t('settings.theme') }}
            </label>
            <div class="grid grid-cols-2 gap-2 max-w-xs">
              <button
                type="button"
                class="h-11 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                [ngClass]="draftTheme === 'dark'
                  ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                  : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
                (click)="previewTheme('dark')"
              >
                <mat-icon class="text-[18px]">dark_mode</mat-icon> Dark
              </button>
              <button
                type="button"
                class="h-11 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                [ngClass]="draftTheme === 'light'
                  ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                  : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
                (click)="previewTheme('light')"
              >
                <mat-icon class="text-[18px]">light_mode</mat-icon> Light
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Exportación -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <mat-icon class="text-primary text-[18px]">file_download</mat-icon>
          <h3 class="text-sm font-bold text-white">{{ t('settings.export') }}</h3>
        </div>
        <div class="p-5 space-y-2">
          <p class="text-xs text-gray-500">{{ t('settings.export.desc') }}</p>
          <div class="grid grid-cols-2 gap-2 max-w-xs">
            <button
              type="button"
              class="h-11 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
              [ngClass]="draftExportFormat === 'pdf'
                ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
              (click)="draftExportFormat = 'pdf'"
            >
              <mat-icon class="text-[18px]">picture_as_pdf</mat-icon> PDF
            </button>
            <button
              type="button"
              class="h-11 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-2"
              [ngClass]="draftExportFormat === 'word'
                ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                : 'border-border-dark text-gray-400 hover:border-white/20 hover:text-white'"
              (click)="draftExportFormat = 'word'"
            >
              <mat-icon class="text-[18px]">description</mat-icon> Word
            </button>
          </div>
        </div>
      </section>

      <!-- Preferencias -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <mat-icon class="text-primary text-[18px]">tune</mat-icon>
          <h3 class="text-sm font-bold text-white">{{ t('settings.preferences') }}</h3>
        </div>

        <!-- Notificaciones -->
        <div class="flex items-center gap-4 px-5 py-4 border-b border-border-dark/40">
          <div class="size-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <mat-icon class="text-violet-400 text-[18px]">notifications</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ t('settings.notifications') }}</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ t('settings.notifications.desc') }}</p>
          </div>
          <div
            class="toggle-track shrink-0 cursor-pointer"
            [class.toggle-on]="draftNotifications"
            (click)="draftNotifications = !draftNotifications"
            [attr.aria-pressed]="draftNotifications"
            role="switch"
          >
            <div class="toggle-thumb"></div>
          </div>
        </div>

        <!-- Privacidad -->
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <mat-icon class="text-emerald-400 text-[18px]">shield</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ t('settings.privacy') }}</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ t('settings.privacy.desc') }}</p>
          </div>
          <div
            class="toggle-track shrink-0 cursor-pointer"
            [class.toggle-on]="draftPrivacyMode"
            (click)="draftPrivacyMode = !draftPrivacyMode"
            [attr.aria-pressed]="draftPrivacyMode"
            role="switch"
          >
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </section>

      <!-- Acerca de -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <mat-icon class="text-primary text-[18px]">info</mat-icon>
          <h3 class="text-sm font-bold text-white">{{ t('settings.about') }}</h3>
        </div>
        <div class="px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wider">App</p>
            <p class="text-sm text-white font-semibold mt-1">MindVoice</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wider">Versión</p>
            <p class="text-sm text-white font-semibold mt-1">1.0.0</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wider">Backend</p>
            <p class="text-sm text-white font-semibold mt-1 truncate">mindvoice-ai.com</p>
          </div>
        </div>
      </section>

      <!-- Barra de acción -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 px-5 py-4 flex flex-wrap items-center justify-end gap-3">
        @if (savedMessage()) {
          <p class="text-sm text-emerald-400 mr-auto font-medium">{{ savedMessage() }}</p>
        }
        <button
          type="button"
          class="h-10 px-4 rounded-lg border border-border-dark text-sm text-gray-300 hover:bg-white/5 transition-colors"
          (click)="resetDraft()"
        >
          {{ t('settings.cancel') }}
        </button>
        <button
          type="button"
          class="h-10 px-6 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-[0_0_18px_rgba(124,58,237,0.3)]"
          (click)="saveChanges()"
        >
          <span class="flex items-center gap-2">
            <mat-icon class="text-[18px]">save</mat-icon>
            {{ t('settings.save') }}
          </span>
        </button>
      </section>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly preferences = inject(AppPreferencesService);
  private readonly userService = inject(UserService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly savedMessage = signal('');
  private persistedTheme: AppTheme = 'dark';

  draftLanguage: AppLanguage = this.preferences.language();
  draftTheme: AppTheme = this.preferences.theme();
  draftExportFormat: ExportFormat = this.preferences.exportFormat();
  draftNotifications = this.preferences.notifications();
  draftPrivacyMode = this.preferences.privacyMode();

  private readonly labels = computed(() => this.preferences.labels());

  readonly initials = computed(() => {
    const user = this.userService.user();
    const name = user?.name || user?.username || '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  readonly displayName = computed(() => {
    const user = this.userService.user();
    return user?.name || user?.username || 'Usuario';
  });

  readonly displayEmail = computed(() => {
    return this.userService.user()?.email ?? '—';
  });

  constructor() {
    this.preferences.hydrate();
    this.persistedTheme = this.preferences.theme();
    this.resetDraft();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && !this.userService.user()) {
      this.userService.getProfile().subscribe();
    }
  }

  saveChanges(): void {
    this.preferences.setLanguage(this.draftLanguage);
    this.preferences.setTheme(this.draftTheme);
    this.preferences.setExportFormat(this.draftExportFormat);
    this.preferences.setNotifications(this.draftNotifications);
    this.preferences.setPrivacyMode(this.draftPrivacyMode);
    this.persistedTheme = this.draftTheme;

    this.savedMessage.set(this.t('settings.saved'));
    setTimeout(() => this.savedMessage.set(''), 2500);
  }

  resetDraft(): void {
    this.draftLanguage = this.preferences.language();
    this.draftTheme = this.preferences.theme();
    this.draftExportFormat = this.preferences.exportFormat();
    this.draftNotifications = this.preferences.notifications();
    this.draftPrivacyMode = this.preferences.privacyMode();
    this.previewTheme(this.persistedTheme);
  }

  previewTheme(theme: AppTheme): void {
    this.draftTheme = theme;
    this.preferences.setTheme(theme);
  }

  t(key: string): string {
    return this.labels()[key] ?? key;
  }
}

