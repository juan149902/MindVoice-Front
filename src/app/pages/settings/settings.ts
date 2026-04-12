import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AppLanguage, AppPreferencesService, AppTheme, ExportFormat } from '../../core/services/app-preferences.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="max-w-[1100px] mx-auto w-full px-6 py-8 space-y-6">
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
        <div class="flex items-center gap-4">
          <div class="size-11 rounded-xl border border-primary/30 bg-primary/15 flex items-center justify-center text-primary">
            <mat-icon>settings</mat-icon>
          </div>
          <div>
            <h2 class="text-white text-2xl font-black leading-tight">{{ t('settings.title') }}</h2>
            <p class="text-sm text-gray-400 mt-1">{{ t('settings.subtitle') }}</p>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article class="rounded-2xl border border-white/10 bg-surface-dark/80 p-5 space-y-4">
          <h3 class="text-white font-bold flex items-center gap-2">
            <mat-icon class="text-primary">language</mat-icon>
            {{ t('settings.language') }}
          </h3>
          <select
            [(ngModel)]="draftLanguage"
            class="w-full h-11 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          <p class="text-xs text-gray-500">Se aplica en toda la navegación y textos compatibles.</p>
        </article>

        <article class="rounded-2xl border border-white/10 bg-surface-dark/80 p-5 space-y-4">
          <h3 class="text-white font-bold flex items-center gap-2">
            <mat-icon class="text-primary">palette</mat-icon>
            {{ t('settings.theme') }}
          </h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="h-11 rounded-lg border text-sm font-semibold transition-colors"
              [ngClass]="draftTheme === 'dark'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border-dark text-gray-300 hover:bg-border-dark/60'"
              (click)="previewTheme('dark')"
            >
              Dark
            </button>
            <button
              type="button"
              class="h-11 rounded-lg border text-sm font-semibold transition-colors"
              [ngClass]="draftTheme === 'light'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border-dark text-gray-300 hover:bg-border-dark/60'"
              (click)="previewTheme('light')"
            >
              Light
            </button>
          </div>
        </article>

        <article class="rounded-2xl border border-white/10 bg-surface-dark/80 p-5 space-y-4">
          <h3 class="text-white font-bold flex items-center gap-2">
            <mat-icon class="text-primary">description</mat-icon>
            {{ t('settings.export') }}
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="h-10 rounded-lg border text-xs font-bold transition-colors"
              [ngClass]="draftExportFormat === 'pdf'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border-dark text-gray-300 hover:bg-border-dark/60'"
              (click)="draftExportFormat = 'pdf'"
            >
              PDF
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border text-xs font-bold transition-colors"
              [ngClass]="draftExportFormat === 'notion'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border-dark text-gray-300 hover:bg-border-dark/60'"
              (click)="draftExportFormat = 'notion'"
            >
              Notion
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border text-xs font-bold transition-colors"
              [ngClass]="draftExportFormat === 'obsidian'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border-dark text-gray-300 hover:bg-border-dark/60'"
              (click)="draftExportFormat = 'obsidian'"
            >
              Obsidian
            </button>
          </div>
        </article>

        <article class="rounded-2xl border border-white/10 bg-surface-dark/80 p-5 space-y-4">
          <div class="flex items-center justify-between rounded-xl border border-border-dark bg-background-dark/50 p-4">
            <div class="pr-3">
              <p class="text-sm font-semibold text-white">{{ t('settings.notifications') }}</p>
              <p class="text-xs text-gray-500">Controla avisos y recordatorios del sistema.</p>
            </div>
            <button
              type="button"
              class="relative w-11 h-6 rounded-full transition-colors"
              [ngClass]="draftNotifications ? 'bg-primary' : 'bg-gray-600'"
              (click)="draftNotifications = !draftNotifications"
            >
              <span
                class="absolute top-0.5 size-5 rounded-full bg-white transition-transform"
                [ngClass]="draftNotifications ? 'translate-x-5' : 'translate-x-0.5'"
              ></span>
            </button>
          </div>

          <div class="flex items-center justify-between rounded-xl border border-border-dark bg-background-dark/50 p-4">
            <div class="pr-3">
              <p class="text-sm font-semibold text-white">{{ t('settings.privacy') }}</p>
              <p class="text-xs text-gray-500">Reduce exposición de datos en procesos de IA.</p>
            </div>
            <button
              type="button"
              class="relative w-11 h-6 rounded-full transition-colors"
              [ngClass]="draftPrivacyMode ? 'bg-primary' : 'bg-gray-600'"
              (click)="draftPrivacyMode = !draftPrivacyMode"
            >
              <span
                class="absolute top-0.5 size-5 rounded-full bg-white transition-transform"
                [ngClass]="draftPrivacyMode ? 'translate-x-5' : 'translate-x-0.5'"
              ></span>
            </button>
          </div>
        </article>
      </section>

      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-4 flex flex-wrap items-center justify-end gap-3">
        @if (savedMessage()) {
          <p class="text-xs text-emerald-300 mr-auto">{{ savedMessage() }}</p>
        }
        <button
          type="button"
          class="h-10 px-4 rounded-lg border border-border-dark text-sm text-gray-300 hover:bg-border-dark/70 transition-colors"
          (click)="resetDraft()"
        >
          {{ t('settings.cancel') }}
        </button>
        <button
          type="button"
          class="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
          (click)="saveChanges()"
        >
          {{ t('settings.save') }}
        </button>
      </section>
    </div>
  `,
})
export class SettingsComponent {
  private readonly preferences = inject(AppPreferencesService);
  readonly savedMessage = signal('');
  private persistedTheme: AppTheme = 'dark';

  draftLanguage: AppLanguage = this.preferences.language();
  draftTheme: AppTheme = this.preferences.theme();
  draftExportFormat: ExportFormat = this.preferences.exportFormat();
  draftNotifications = this.preferences.notifications();
  draftPrivacyMode = this.preferences.privacyMode();

  private readonly labels = computed(() => this.preferences.labels());

  constructor() {
    this.preferences.hydrate();
    this.persistedTheme = this.preferences.theme();
    this.resetDraft();
  }

  saveChanges(): void {
    this.preferences.setLanguage(this.draftLanguage);
    this.preferences.setTheme(this.draftTheme);
    this.preferences.setExportFormat(this.draftExportFormat);
    this.preferences.setNotifications(this.draftNotifications);
    this.preferences.setPrivacyMode(this.draftPrivacyMode);
    this.persistedTheme = this.draftTheme;

    this.savedMessage.set(this.t('settings.saved'));
    window.setTimeout(() => this.savedMessage.set(''), 2200);
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

