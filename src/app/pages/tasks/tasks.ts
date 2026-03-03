import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="p-8 h-full flex flex-col">
      <div class="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 class="text-white text-3xl font-black tracking-tight">Gestor de Tareas</h2>
          <p class="text-gray-400 text-sm mt-1">Organiza las tareas extraídas de tus grabaciones de voz con IA</p>
        </div>
        <div class="flex gap-2">
          <button class="flex items-center gap-2 px-4 h-10 bg-surface-dark border border-border-dark rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors">
            <mat-icon class="text-[18px]">add</mat-icon>
            Nueva Tarea
          </button>
        </div>
      </div>

      <div class="flex border-b border-border-dark gap-8 shrink-0">
        <button class="flex items-center gap-2 border-b-2 border-primary text-primary pb-3 pt-2 font-bold text-sm">
          <mat-icon class="text-[18px]">view_kanban</mat-icon>
          Tablero Kanban
        </button>
        <button class="flex items-center gap-2 border-b-2 border-transparent text-gray-500 pb-3 pt-2 font-medium text-sm hover:text-gray-300 transition-colors">
          <mat-icon class="text-[18px]">list</mat-icon>
          Vista de Lista
        </button>
      </div>

      <div class="flex gap-3 py-4 flex-wrap shrink-0">
        <button class="flex h-8 items-center gap-2 rounded-lg bg-surface-dark border border-border-dark px-3 text-sm font-medium text-gray-300 hover:border-gray-500 transition-colors">
          <mat-icon class="text-[18px]">filter_list</mat-icon>
          Todas las fuentes
          <mat-icon class="text-[18px]">expand_more</mat-icon>
        </button>
        <button class="flex h-8 items-center gap-2 rounded-lg bg-orange-500/10 text-orange-400 px-3 text-sm font-bold border border-orange-500/20">
          Prioridad Alta
          <mat-icon class="text-[18px]">close</mat-icon>
        </button>
      </div>

      <div class="flex-1 overflow-x-auto pb-4 scrollbar-hide">
        <div class="flex gap-6 h-full min-w-[1000px]">
          
          <!-- Column 1 -->
          <div class="flex-1 flex flex-col gap-4 min-w-[320px]">
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-white">Pendientes</h3>
                <span class="bg-surface-dark border border-border-dark px-2 py-0.5 rounded text-xs font-bold text-gray-400">2</span>
              </div>
              <button class="text-gray-500 hover:text-gray-300"><mat-icon>more_horiz</mat-icon></button>
            </div>
            
            <div class="flex flex-col gap-3">
              <div class="bg-surface-dark p-4 rounded-xl border border-border-dark shadow-lg hover:border-primary/50 transition-all group cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Alta</span>
                  <input type="checkbox" class="rounded bg-background-dark border-border-dark text-primary focus:ring-primary size-4"/>
                </div>
                <p class="text-sm font-semibold text-gray-100 mb-3 group-hover:text-white">Esquematizar reporte de mercado basado en entrevista</p>
                <div class="flex flex-col gap-2">
                  <a href="#" class="flex items-center gap-1.5 text-[11px] text-primary font-semibold hover:text-primary/80">
                    <mat-icon class="text-[14px]">mic</mat-icon>
                    Extraída de: [Grabación - Cliente Mayo 12]
                  </a>
                  <div class="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <mat-icon class="text-[14px]">calendar_today</mat-icon>
                    Vence: 15 de Mayo, 2024
                  </div>
                </div>
              </div>

              <div class="bg-surface-dark p-4 rounded-xl border border-border-dark shadow-lg hover:border-primary/50 transition-all group cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Baja</span>
                  <input type="checkbox" class="rounded bg-background-dark border-border-dark text-primary focus:ring-primary size-4"/>
                </div>
                <p class="text-sm font-semibold text-gray-100 mb-3 group-hover:text-white">Enviar correo de seguimiento al equipo de diseño</p>
                <div class="flex flex-col gap-2">
                  <a href="#" class="flex items-center gap-1.5 text-[11px] text-primary font-semibold hover:text-primary/80">
                    <mat-icon class="text-[14px]">mic</mat-icon>
                    Extraída de: [Grabación - Ideas Mañana]
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2 -->
          <div class="flex-1 flex flex-col gap-4 min-w-[320px]">
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-white">En Progreso</h3>
                <span class="bg-surface-dark border border-border-dark px-2 py-0.5 rounded text-xs font-bold text-gray-400">1</span>
              </div>
              <button class="text-gray-500 hover:text-gray-300"><mat-icon>more_horiz</mat-icon></button>
            </div>
            
            <div class="flex flex-col gap-3">
              <div class="bg-surface-dark p-4 rounded-xl border-l-4 border-l-yellow-500 border border-border-dark shadow-lg hover:border-primary/50 transition-all group cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Media</span>
                  <input type="checkbox" class="rounded bg-background-dark border-border-dark text-primary focus:ring-primary size-4"/>
                </div>
                <p class="text-sm font-semibold text-gray-100 mb-3 group-hover:text-white">Finalizar documentación de librería de componentes</p>
                <div class="flex flex-col gap-2">
                  <a href="#" class="flex items-center gap-1.5 text-[11px] text-primary font-semibold hover:text-primary/80">
                    <mat-icon class="text-[14px]">mic</mat-icon>
                    Extraída de: [Grabación - Dev Update]
                  </a>
                </div>
                <div class="mt-4 w-full bg-background-dark h-1.5 rounded-full overflow-hidden">
                  <div class="bg-yellow-500 h-full w-[65%] shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 3 -->
          <div class="flex-1 flex flex-col gap-4 min-w-[320px]">
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-white">Completadas</h3>
                <span class="bg-surface-dark border border-border-dark px-2 py-0.5 rounded text-xs font-bold text-gray-400">12</span>
              </div>
              <button class="text-gray-500 hover:text-gray-300"><mat-icon>more_horiz</mat-icon></button>
            </div>
            
            <div class="flex flex-col gap-3 opacity-60 grayscale-[0.5]">
              <div class="bg-surface-dark p-4 rounded-xl border border-border-dark shadow-sm">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-border-dark">Finalizada</span>
                  <input type="checkbox" checked class="rounded bg-background-dark border-border-dark text-primary focus:ring-primary size-4"/>
                </div>
                <p class="text-sm font-semibold text-gray-400 mb-3 line-through">Preparar agenda de reunión para el martes</p>
              </div>
            </div>
          </div>

          <!-- Add Column -->
          <button class="w-[320px] border-2 border-dashed border-border-dark rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 hover:border-gray-600 transition-all h-24 group shrink-0">
            <mat-icon class="mr-2 group-hover:scale-110 transition-transform">add</mat-icon>
            <span class="font-bold">Añadir Columna</span>
          </button>

        </div>
      </div>
    </div>
  `
})
export class TasksComponent {}
