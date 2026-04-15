import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { TRANSLATIONS } from '../i18n/translations';

export type AppLanguage = 'es' | 'en';
export type AppTheme = 'dark' | 'light';
export type ExportFormat = 'pdf' | 'word';

interface PreferencesState {
  language: AppLanguage;
  theme: AppTheme;
  exportFormat: ExportFormat;
  notifications: boolean;
  privacyMode: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT);

  private readonly storageKey = 'mindvoice-preferences';
  private hydrated = false;

  private readonly state = signal<PreferencesState>({
    language: 'es',
    theme: 'dark',
    exportFormat: 'pdf',
    notifications: true,
    privacyMode: false,
  });

  readonly language = computed(() => this.state().language);
  readonly theme = computed(() => this.state().theme);
  readonly exportFormat = computed(() => this.state().exportFormat);
  readonly notifications = computed(() => this.state().notifications);
  readonly privacyMode = computed(() => this.state().privacyMode);

  readonly labels = computed(() => {
    return TRANSLATIONS[this.language()];
  });

  hydrate(): void {
    if (this.hydrated) {
      return;
    }

    this.hydrated = true;

    if (!isPlatformBrowser(this.platformId)) {
      this.applyDocumentState(this.state());
      return;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      this.applyDocumentState(this.state());
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<PreferencesState>;
      const next: PreferencesState = {
        language: parsed.language === 'en' ? 'en' : 'es',
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        exportFormat: this.parseExportFormat(parsed.exportFormat),
        notifications: parsed.notifications !== false,
        privacyMode: parsed.privacyMode === true,
      };
      this.state.set(next);
      this.applyDocumentState(next);
    } catch {
      this.applyDocumentState(this.state());
    }
  }

  setLanguage(language: AppLanguage): void {
    this.patchState({ language });
  }

  setTheme(theme: AppTheme): void {
    this.patchState({ theme });
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  setExportFormat(exportFormat: ExportFormat): void {
    this.patchState({ exportFormat });
  }

  setNotifications(enabled: boolean): void {
    this.patchState({ notifications: enabled });
  }

  setPrivacyMode(enabled: boolean): void {
    this.patchState({ privacyMode: enabled });
  }

  t(key: string): string {
    return this.labels()[key] ?? key;
  }

  private patchState(patch: Partial<PreferencesState>): void {
    const next = { ...this.state(), ...patch };
    this.state.set(next);
    this.persist(next);
    this.applyDocumentState(next);
  }

  private persist(state: PreferencesState): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(state));
    // Compatibilidad con estado previo del layout
    localStorage.setItem('mindvoice-theme', state.theme);
  }

  private applyDocumentState(state: PreferencesState): void {
    const doc = this.documentRef;
    doc.documentElement?.setAttribute('lang', state.language);

    const body = doc.body;
    if (!body) {
      return;
    }

    body.classList.toggle('theme-light', state.theme === 'light');
    body.classList.toggle('theme-dark', state.theme === 'dark');
    body.setAttribute('data-mindvoice-lang', state.language);
    body.setAttribute('data-mindvoice-theme', state.theme);
  }

  private parseExportFormat(value: unknown): ExportFormat {
    if (value === 'word' || value === 'pdf') {
      return value;
    }
    return 'pdf';
  }
}

