import { Component, HostListener, Inject, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgClass, NgIf } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';
import { TokenStorageService } from '../core/services/token-storage.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, NgIf, NgClass],
  template: `
    <div class="relative flex h-screen overflow-hidden bg-background-dark text-white" [ngClass]="{ 'theme-light': isLightMode(), 'theme-dark': !isLightMode() }">
      <button
        *ngIf="isMobile() && isSidebarOpen()"
        type="button"
        class="fixed inset-0 z-40 bg-black/70 lg:hidden"
        aria-label="Cerrar menú"
        (click)="closeSidebar()"
      ></button>

      <aside
        class="flex flex-col shrink-0 bg-surface-dark transition-all duration-300 ease-out"
        [ngClass]="getSidebarClasses()"
      >
        <div class="flex h-full flex-col overflow-y-auto p-6">
          <div class="mb-8 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3" [class.opacity-0]="!isMobile() && !isSidebarOpen()" [class.pointer-events-none]="!isMobile() && !isSidebarOpen()">
            <div class="size-15 shrink-0 flex items-center justify-center">
              <img
                [src]="isLightMode() ? 'icons/Logo2.png' : 'icons/Logo1.png'"
                alt="Logo MindVoice"
                class="object-contain"
                [ngClass]="isLightMode() ? 'h-full w-full scale-[2.25]' : 'size-full'"
              />
            </div>
            <div>
              <h1 class="text-white text-lg font-bold leading-tight tracking-tight">MindVoice</h1>
              <p class="text-gray-500 text-xs">Segundo Cerebro Digital</p>
            </div>
            </div>

            <button
              *ngIf="isMobile()"
              type="button"
              class="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
              aria-label="Cerrar menú"
              (click)="closeSidebar()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <nav class="flex flex-col gap-1 flex-1">
            <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">dashboard</mat-icon>
              <p class="text-sm font-medium">Panel Principal</p>
            </a>
            <a routerLink="/library" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">mic</mat-icon>
              <p class="text-sm font-medium">Grabaciones</p>
            </a>
            <a routerLink="/tags" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">local_offer</mat-icon>
              <p class="text-sm font-medium">Etiquetas</p>
            </a>
            <a routerLink="/tasks" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">check_box</mat-icon>
              <p class="text-sm font-medium">Tareas de Voz</p>
            </a>
            <a routerLink="/summaries" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">auto_awesome</mat-icon>
              <p class="text-sm font-medium">Resúmenes IA</p>
            </a>
            <a routerLink="/mind-maps" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">account_tree</mat-icon>
              <p class="text-sm font-medium">Mapas Mentales</p>
            </a>
            <a routerLink="/settings" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent" (click)="handleNavClick()">
              <mat-icon class="group-hover:text-primary">settings</mat-icon>
              <p class="text-sm font-medium">Configuración</p>
            </a>
          </nav>

          <div class="mt-auto border-t border-border-dark pt-6" [class.hidden]="!isMobile() && !isSidebarOpen()">
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-9 rounded-full bg-cover ring-2 ring-primary/20" [style.background-image]="'url(https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentUsername() + ')'"></div>
              <div class="overflow-hidden">
                <p class="text-sm font-bold text-white truncate">{{ currentUsername() }}</p>
                <p class="text-[10px] text-primary font-bold uppercase tracking-wider">Cuenta Pro</p>
              </div>
            </div>

            <button
              type="button"
              class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border-dark px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              (click)="logout()"
            >
              <mat-icon>logout</mat-icon>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="min-w-0 flex-1 flex flex-col overflow-hidden bg-background-dark">
        <header class="h-16 shrink-0 border-b border-border-dark bg-surface-dark/50 px-4 backdrop-blur-md md:px-6 xl:px-8">
          <div class="flex h-full items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-lg border border-border-dark text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="Abrir o cerrar menú"
              (click)="toggleSidebar()"
            >
              <mat-icon>{{ isSidebarOpen() ? 'menu_open' : 'menu' }}</mat-icon>
            </button>
            <div class="relative w-full max-w-md">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
              <input class="w-full bg-background-dark/50 border border-border-dark rounded-lg pl-10 pr-4 h-10 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-200 placeholder:text-gray-500 outline-none" placeholder="Buscar ideas, tareas o grabaciones..." type="text"/>
            </div>
          </div>
          <div class="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-lg border transition-colors"
              [ngClass]="isLightMode()
                ? 'border-amber-300/60 bg-amber-400/10 text-amber-500 hover:bg-amber-400/20'
                : 'border-border-dark text-sky-300 hover:bg-white/5 hover:text-sky-200'"
              [attr.aria-label]="isLightMode() ? 'Activar modo oscuro' : 'Activar modo claro'"
              (click)="toggleTheme()"
            >
              <mat-icon>{{ isLightMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <button class="hidden h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover sm:flex">
              <mat-icon class="text-[20px]">sync</mat-icon>
              <span>Sincronizar</span>
            </button>
            <button class="size-10 flex items-center justify-center text-gray-400 hover:bg-white/5 hover:text-white rounded-lg border border-border-dark transition-colors">
              <mat-icon>notifications</mat-icon>
            </button>
          </div>
          </div>
        </header>
        
        <div class="flex-1 overflow-y-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class LayoutComponent implements OnInit {
  readonly isMobile = signal(false);
  readonly isSidebarOpen = signal(true);
  readonly themeMode = signal<'dark' | 'light'>('dark');
  readonly currentUsername = signal<string>('');

  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.restoreTheme();
    this.syncViewportState();
    this.currentUsername.set(this.tokenStorage.getUsername() ?? 'Usuario');
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
    const nextTheme = this.isLightMode() ? 'dark' : 'light';
    this.themeMode.set(nextTheme);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('mindvoice-theme', nextTheme);
    }
  }

  handleNavClick(): void {
    if (this.isMobile()) {
      this.closeSidebar();
    }
  }

  isLightMode(): boolean {
    return this.themeMode() === 'light';
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
    void this.router.navigate(['/auth']);
  }

  getSidebarClasses(): Record<string, boolean> {
    const mobile = this.isMobile();
    const open = this.isSidebarOpen();

    return {
      'fixed inset-0 z-50 w-full': mobile,
      'relative z-20 border-r border-border-dark': !mobile,
      'translate-x-0': mobile && open,
      '-translate-x-full pointer-events-none': mobile && !open,
      'w-64': !mobile && open,
      'w-0 overflow-hidden border-r-0': !mobile && !open,
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

  private restoreTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedTheme = localStorage.getItem('mindvoice-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      this.themeMode.set(storedTheme);
    }
  }
}
