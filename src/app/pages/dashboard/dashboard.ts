import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { ResourceApiService } from '../../core/services/resource-api.service';
import { ApiEntity } from '../../core/models/api.models';
import { TokenStorageService } from '../../core/services/token-storage.service';

interface DashboardUser extends ApiEntity {
  _id?: string;
  username?: string;
  email?: string;
  name?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="p-8 max-w-[1200px] mx-auto w-full">
      <section class="mb-10">
        <div class="flex flex-col gap-2">
          <h2 class="text-4xl font-black tracking-tight text-white">Bienvenido, {{ username }}</h2>
          <p class="text-gray-400 text-lg">Tu segundo cerebro digital está sincronizado y listo.</p>
        </div>

        
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-surface-dark border border-white/5 rounded-xl p-6 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <div>
              <p class="text-gray-400 text-sm font-medium">Horas grabadas</p>
              <p class="text-3xl font-bold mt-1 text-white">12.5h</p>
            </div>
            <div class="flex items-center gap-1 text-emerald-400 mt-4">
              <mat-icon class="text-sm">trending_up</mat-icon>
              <span class="text-xs font-bold">+15% desde la semana pasada</span>
            </div>
          </div>
          <div class="bg-surface-dark border border-white/5 rounded-xl p-6 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <div>
              <p class="text-gray-400 text-sm font-medium">Tareas completadas</p>
              <p class="text-3xl font-bold mt-1 text-white">{{ users.length }}</p>
            </div>
            <div class="flex items-center gap-1 text-emerald-400 mt-4">
              <mat-icon class="text-sm">trending_up</mat-icon>
              <span class="text-xs font-bold">Usuarios detectados en backend</span>
            </div>
          </div>
        </div>
        
        <div class="bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-primary/15 transition-all">
          <div class="z-10">
            <span class="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Última Nota</span>
            <h3 class="text-lg font-bold mt-3 leading-snug text-white">Sincronización de Estrategia: Q4</h3>
            <p class="text-sm text-gray-300 mt-2">Grabado hace 2 horas</p>
          </div>
          <div class="z-10 mt-6 flex items-center gap-3">
            <button class="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <mat-icon>play_arrow</mat-icon>
            </button>
            <div class="h-10 flex-1 bg-white/5 rounded-lg flex items-center px-3 border border-white/5">
              <div class="flex gap-0.5 items-end h-4 w-full">
                <div class="w-1 bg-primary/30 h-2"></div>
                <div class="w-1 bg-primary/30 h-3"></div>
                <div class="w-1 bg-primary/30 h-4"></div>
                <div class="w-1 bg-primary h-3"></div>
                <div class="w-1 bg-primary h-5"></div>
                <div class="w-1 bg-primary/30 h-2"></div>
              </div>
            </div>
          </div>
          <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      <section>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Grabaciones Recientes</h3>
          <button class="text-primary text-sm font-bold hover:underline">Ver toda la biblioteca</button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Card 1 -->
          <div class="group bg-surface-dark border border-white/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all cursor-pointer">
            <div class="p-5">
              <div class="flex justify-between items-start mb-4">
                <div class="flex gap-2">
                  <span class="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Trabajo</span>
                  <span class="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Diseño</span>
                </div>
                <button class="text-gray-500 hover:text-primary transition-colors">
                  <mat-icon class="text-xl">more_vert</mat-icon>
                </button>
              </div>
              <h4 class="font-bold text-base text-white group-hover:text-primary transition-colors">Sesión de Ideación: Nueva Interfaz</h4>
              <p class="text-xs text-gray-400 mt-1">Oct 24, 2023 • 12:45 PM</p>
              <div class="mt-6 flex items-center gap-1 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                <div class="flex-1 flex items-center gap-[2px]">
                  <div class="w-1 h-3 bg-primary/60 rounded-full"></div>
                  <div class="w-1 h-5 bg-primary rounded-full"></div>
                  <div class="w-1 h-2 bg-primary/60 rounded-full"></div>
                  <div class="w-1 h-6 bg-primary rounded-full"></div>
                </div>
                <span class="text-[10px] font-medium text-gray-400 ml-2">4:20</span>
              </div>
            </div>
          </div>
          
          <!-- Card 2 -->
          <div class="group bg-surface-dark border border-white/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all cursor-pointer">
            <div class="p-5">
              <div class="flex justify-between items-start mb-4">
                <div class="flex gap-2">
                  <span class="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Ideas</span>
                </div>
                <button class="text-gray-500 hover:text-primary transition-colors">
                  <mat-icon class="text-xl">more_vert</mat-icon>
                </button>
              </div>
              <h4 class="font-bold text-base text-white group-hover:text-primary transition-colors">Podcast: IA en el Futuro del UX</h4>
              <p class="text-xs text-gray-400 mt-1">Oct 23, 2023 • 09:15 AM</p>
              <div class="mt-6 flex items-center gap-1 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                <div class="flex-1 flex items-center gap-[2px]">
                  <div class="w-1 h-4 bg-primary/60 rounded-full"></div>
                  <div class="w-1 h-2 bg-primary rounded-full"></div>
                  <div class="w-1 h-6 bg-primary/60 rounded-full"></div>
                </div>
                <span class="text-[10px] font-medium text-gray-400 ml-2">12:05</span>
              </div>
            </div>
          </div>
          
          <!-- Card 3 -->
          <div class="group bg-surface-dark border border-white/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all cursor-pointer">
            <div class="p-5">
              <div class="flex justify-between items-start mb-4">
                <div class="flex gap-2">
                  <span class="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Reunión</span>
                  <span class="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Urgente</span>
                </div>
                <button class="text-gray-500 hover:text-primary transition-colors">
                  <mat-icon class="text-xl">more_vert</mat-icon>
                </button>
              </div>
              <h4 class="font-bold text-base text-white group-hover:text-primary transition-colors">Feedback del Cliente - Proyecto Studio</h4>
              <p class="text-xs text-gray-400 mt-1">Oct 22, 2023 • 04:30 PM</p>
              <div class="mt-6 flex items-center gap-1 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                <div class="flex-1 flex items-center gap-[2px]">
                  <div class="w-1 h-2 bg-primary/60 rounded-full"></div>
                  <div class="w-1 h-5 bg-primary rounded-full"></div>
                  <div class="w-1 h-3 bg-primary/60 rounded-full"></div>
                </div>
                <span class="text-[10px] font-medium text-gray-400 ml-2">3:50</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    <div class="fixed bottom-10 right-10 flex flex-col items-end gap-4 z-50">
      <div class="bg-surface-dark border border-white/10 px-4 py-2 rounded-lg shadow-2xl text-sm font-bold text-primary flex items-center gap-2">
        <span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
        Listo para grabar
      </div>
      <button class="group flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 hover:scale-110 transition-transform duration-300">
        <mat-icon class="text-3xl group-hover:rotate-12 transition-transform">mic</mat-icon>
      </button>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tokenStorage = inject(TokenStorageService);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  loadingUsers = false;
  loadError = '';
  users: DashboardUser[] = [];
  username = 'Usuario';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.username = this.tokenStorage.getUsername() ?? 'Usuario';

    this.fetchUsers();
  }

  private fetchUsers(): void {
    this.loadingUsers = true;
    this.loadError = '';

    this.resourceApi.list<DashboardUser>('users').subscribe({
      next: (users) => {
        this.users = users.slice(0, 8);
        this.loadingUsers = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loadingUsers = false;
        if (error.status === 401) {
          this.loadError = 'No autorizado: inicia sesión para ver datos protegidos.';
          return;
        }

        this.loadError = 'No se pudo cargar usuarios desde la API.';
      },
    });
  }
}
