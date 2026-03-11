import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="flex h-screen overflow-hidden bg-background-dark text-white">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-border-dark bg-surface-dark flex flex-col shrink-0">
        <div class="p-6 flex flex-col h-full">
          <div class="flex items-center gap-3 mb-8">
            <img src="icons/Logo1.png" alt="Logo MindVoice" class="size-15 object-cover " />
            <div>
              <h1 class="text-white text-lg font-bold leading-tight tracking-tight">MindVoice</h1>
              <p class="text-gray-500 text-xs">Segundo Cerebro Digital</p>
            </div>
          </div>
          
          <nav class="flex flex-col gap-1 flex-1">
            <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">dashboard</mat-icon>
              <p class="text-sm font-medium">Panel Principal</p>
            </a>
            <a routerLink="/library" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">mic</mat-icon>
              <p class="text-sm font-medium">Grabaciones</p>
            </a>
            <a routerLink="/tasks" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">check_box</mat-icon>
              <p class="text-sm font-medium">Tareas de Voz</p>
            </a>
            <a routerLink="/summaries" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">auto_awesome</mat-icon>
              <p class="text-sm font-medium">Resúmenes IA</p>
            </a>
            <a routerLink="/mind-maps" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">account_tree</mat-icon>
              <p class="text-sm font-medium">Mapas Mentales</p>
            </a>
            <a routerLink="/settings" routerLinkActive="bg-primary/10 text-primary border-primary/20 border" class="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-all group border border-transparent">
              <mat-icon class="group-hover:text-primary">settings</mat-icon>
              <p class="text-sm font-medium">Configuración</p>
            </a>
          </nav>

          <div class="mt-auto pt-6 border-t border-border-dark">
            <div class="flex items-center gap-3">
              <div class="size-9 rounded-full bg-cover ring-2 ring-primary/20" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=Alex')"></div>
              <div class="overflow-hidden">
                <p class="text-sm font-bold text-white truncate">Alex Chen</p>
                <p class="text-[10px] text-primary font-bold uppercase tracking-wider">Cuenta Pro</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden bg-background-dark">
        <header class="h-16 border-b border-border-dark bg-surface-dark/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          <div class="flex items-center gap-4 flex-1">
            <div class="relative w-full max-w-md">
              <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
              <input class="w-full bg-background-dark/50 border border-border-dark rounded-lg pl-10 pr-4 h-10 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-200 placeholder:text-gray-500 outline-none" placeholder="Buscar ideas, tareas o grabaciones..." type="text"/>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button class="flex items-center gap-2 px-4 h-10 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
              <mat-icon class="text-[20px]">sync</mat-icon>
              <span>Sincronizar</span>
            </button>
            <button class="size-10 flex items-center justify-center text-gray-400 hover:bg-white/5 hover:text-white rounded-lg border border-border-dark transition-colors">
              <mat-icon>notifications</mat-icon>
            </button>
          </div>
        </header>
        
        <div class="flex-1 overflow-y-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class LayoutComponent {}
