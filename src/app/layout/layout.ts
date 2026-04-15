import { Component, HostListener, OnDestroy, OnInit, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser, NgClass, NgIf } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';
import { TokenStorageService } from '../core/services/token-storage.service';
import { AppPreferencesService } from '../core/services/app-preferences.service';
import { NotificationContainerComponent } from '../core/services/notification-container.component';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, NgIf, NgClass, NotificationContainerComponent],
  template: `
    <app-notification-container></app-notification-container>
    <div class="relative flex h-screen overflow-hidden text-white app-futuristic-shell" [ngClass]="{ 'theme-light': theme() === 'light', 'theme-dark': theme() !== 'light' }">
      <button
        *ngIf="isMobile() && isSidebarOpen()"
        type="button"
        class="fixed inset-0 z-40 bg-black/70 lg:hidden"
        aria-label="Cerrar menú"
        (click)="closeSidebar()"
      ></button>

      <aside
        class="app-premium-sidebar flex flex-col shrink-0 transition-all duration-300 ease-out"
        [ngClass]="getSidebarClasses()"
      >
        <div class="flex h-full flex-col overflow-y-auto p-6">
          <div class="mb-8 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3" [class.opacity-0]="!isMobile() && !isSidebarOpen()" [class.pointer-events-none]="!isMobile() && !isSidebarOpen()">
            <div class="size-15 shrink-0 flex items-center justify-center">
              <img
                [src]="theme() === 'light' ? 'icons/Logo2.png' : 'icons/Logo1.png'"
                alt="Logo MindVoice"
                class="object-contain"
                [ngClass]="theme() === 'light' ? 'h-full w-full scale-[2.25]' : 'size-full'"
              />
            </div>
            <div>
              <h1 class="text-white text-lg font-bold leading-tight tracking-tight">MindVoice</h1>
              <p class="text-gray-500 text-xs">{{ t('layout.tagline', 'Segundo Cerebro Digital') }}</p>
            </div>
            </div>

            <button
              *ngIf="isMobile()"
              type="button"
              class="app-premium-icon-btn flex size-11 items-center justify-center rounded-xl text-white"
              aria-label="Cerrar menú"
              (click)="closeSidebar()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <nav class="flex flex-col gap-1 flex-1">
            <a routerLink="/dashboard" routerLinkActive="app-premium-nav-link-active" [routerLinkActiveOptions]="{exact: true}" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>dashboard</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.dashboard', 'Panel Principal') }}</p>
            </a>
            <a routerLink="/recordings" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>mic</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.recordings', 'Grabaciones') }}</p>
            </a>
            <a routerLink="/ai-analysis" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>auto_awesome</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.aiAnalysis', 'Análisis IA') }}</p>
            </a>
            <a routerLink="/tasks" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>check_box</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.tasks', 'Tareas de Voz') }}</p>
            </a>
            <a routerLink="/mind-maps" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>account_tree</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.mindmaps', 'Mapas Mentales') }}</p>
            </a>
            <a routerLink="/tags" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>local_offer</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.tags', 'Etiquetas') }}</p>
            </a>
            <a routerLink="/settings" routerLinkActive="app-premium-nav-link-active" class="app-premium-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent group" (click)="handleNavClick()">
              <mat-icon>settings</mat-icon>
              <p class="text-sm font-medium">{{ t('nav.settings', 'Configuración') }}</p>
            </a>
          </nav>

          <div class="mt-auto border-t border-border-dark pt-6" [class.hidden]="!isMobile() && !isSidebarOpen()">
            <button
              type="button"
              class="flex items-center gap-3 min-w-0 w-full hover:opacity-80 transition-opacity cursor-pointer"
              (click)="goToProfile()"
              [title]="t('nav.profile', 'Ver perfil')"
            >
              <div class="size-9 rounded-full bg-cover ring-2 ring-primary/20 shrink-0" [style.background-image]="'url(https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayName() + ')'"></div>
              <div class="overflow-hidden text-left">
                <p class="text-sm font-bold text-white truncate">{{ displayName() }}</p>
                <p class="text-[10px] text-primary font-bold uppercase tracking-wider">{{ t('layout.proBadge', 'Cuenta Pro') }}</p>
              </div>
              <mat-icon class="ml-auto text-gray-500 text-sm shrink-0">chevron_right</mat-icon>
            </button>

            <button
              type="button"
              class="app-premium-secondary-btn mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              (click)="logout()"
            >
              <mat-icon>logout</mat-icon>
              <span>{{ t('nav.logout', 'Cerrar sesión') }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header class="app-premium-header h-16 shrink-0 px-4 md:px-6 xl:px-8">
          <div class="flex h-full items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <button
              type="button"
              class="app-premium-icon-btn flex size-10 items-center justify-center rounded-lg text-gray-300 transition-colors"
              aria-label="Abrir o cerrar menú"
              (click)="toggleSidebar()"
            >
              <mat-icon>{{ isSidebarOpen() ? 'menu_open' : 'menu' }}</mat-icon>
            </button>
            <div class="relative w-full max-w-md">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
              <input class="app-premium-search w-full rounded-lg pl-10 pr-4 h-10 text-sm text-gray-200 placeholder:text-gray-500 outline-none" [placeholder]="t('layout.search', 'Buscar ideas, tareas o grabaciones...')" type="text"/>
            </div>
          </div>
          <div class="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              class="app-premium-icon-btn flex size-10 items-center justify-center rounded-lg transition-colors"
              [ngClass]="theme() === 'light'
                ? 'border-amber-300/60 bg-amber-400/10 text-amber-500 hover:bg-amber-400/20'
                : 'border-border-dark text-violet-300 hover:bg-white/5 hover:text-violet-200'"
              [attr.aria-label]="theme() === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'"
              (click)="toggleTheme()"
            >
              <mat-icon>{{ theme() === 'light' ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <button class="app-premium-primary-btn hidden h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white transition-all sm:flex">
              <mat-icon class="text-[20px]">sync</mat-icon>
              <span>{{ t('layout.sync', 'Sincronizar') }}</span>
            </button>
            <!-- User avatar — navega al perfil -->
            <button
              type="button"
              class="app-premium-icon-btn size-10 flex items-center justify-center rounded-lg overflow-hidden p-0 transition-all hover:ring-2 hover:ring-primary/60"
              [title]="displayName()"
              (click)="goToProfile()"
              aria-label="Ver perfil"
            >
              <div class="size-full rounded-lg bg-cover"
                   [style.background-image]="'url(https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayName() + ')'">
              </div>
            </button>
          </div>
          </div>
        </header>
        
        <div class="flex-1 overflow-y-auto app-content-shell">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly isMobile = signal(false);
  readonly isSidebarOpen = signal(true);
  readonly currentUsername = signal<string>('');
  private readonly botpressInjectScriptId = 'botpress-webchat-inject';
  private readonly botpressConfigScriptId = 'botpress-webchat-config';
  private destroyed = false;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly preferences = inject(AppPreferencesService);
  private readonly tokenStorage = inject(TokenStorageService);
  readonly userService = inject(UserService);
  readonly theme = this.preferences.theme;

  /** Nombre a mostrar: del backend si ya cargó, si no del token */
  readonly displayName = computed(() =>
    this.userService.user()?.name ||
    this.userService.user()?.username ||
    this.currentUsername() ||
    'Usuario'
  );

  ngOnInit(): void {
    this.destroyed = false;
    this.preferences.hydrate();
    this.syncViewportState();
    this.currentUsername.set(this.tokenStorage.getUsername() ?? 'Usuario');

    if (isPlatformBrowser(this.platformId)) {
      this.loadBotpressChat();
      // Carga el perfil del backend en background
      this.userService.getProfile().subscribe({ error: () => {} });
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.destroyed = true;
    this.unloadBotpressChat();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncViewportState();
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  toggleTheme(): void {
    this.preferences.toggleTheme();
  }

  handleNavClick(): void {
    if (this.isMobile()) {
      this.closeSidebar();
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
    void this.router.navigate(['/auth']);
  }

  goToProfile(): void {
    void this.router.navigate(['/profile']);
    if (this.isMobile()) this.closeSidebar();
  }

  getSidebarClasses(): Record<string, boolean> {
    const mobile = this.isMobile();
    const open = this.isSidebarOpen();

    return {
      'fixed inset-0 z-50 w-full': mobile,
      'relative z-20': !mobile,
      'translate-x-0': mobile && open,
      '-translate-x-full pointer-events-none': mobile && !open,
      'w-64': !mobile && open,
      'w-0 overflow-hidden': !mobile && !open,
    };
  }

  private syncViewportState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const mobile = window.innerWidth < 1024;
    const previousValue = this.isMobile();
    this.isMobile.set(mobile);

    if (mobile !== previousValue) {
      this.isSidebarOpen.set(!mobile);
    }
  }

  t(key: string, fallback: string): string {
    return this.preferences.t(key) || fallback;
  }

  private loadBotpressChat(): void {
    if (document.getElementById(this.botpressInjectScriptId)) return;

    const injectScript = document.createElement('script');
    injectScript.id = this.botpressInjectScriptId;
    injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js';

    injectScript.onload = () => {
      if (this.destroyed) {
        return;
      }

      if (document.getElementById(this.botpressConfigScriptId)) return;

      const configScript = document.createElement('script');
      configScript.id = this.botpressConfigScriptId;
      configScript.src = 'https://files.bpcontent.cloud/2026/03/19/03/20260319032156-J2CWLMTK.js';
      configScript.defer = true;
      document.body.appendChild(configScript);
    };

    document.body.appendChild(injectScript);
  }

  private unloadBotpressChat(): void {
    const botpressGlobal = (globalThis as any).botpress;
    botpressGlobal?.destroy?.();
    botpressGlobal?.shutdown?.();
    botpressGlobal?.webchat?.hide?.();
    botpressGlobal?.webchat?.close?.();

    document.getElementById(this.botpressConfigScriptId)?.remove();
    document.getElementById(this.botpressInjectScriptId)?.remove();

    document.querySelectorAll([
      'iframe[src*="botpress"]',
      'iframe[src*="bpcontent.cloud"]',
      'div[id*="bp-web-widget"]',
      'div[id*="botpress"]',
      'div[class*="bpWebchat"]',
      'div[class*="bp-widget"]',
      'div[class*="botpress"]',
      'button[class*="bp"]',
      'button[class*="botpress"]',
      'bp-web-widget',
      'bp-widget',
      'style[data-botpress]',
      'style[id*="botpress"]',
    ].join(',')).forEach((node) => node.remove());
  }
}
