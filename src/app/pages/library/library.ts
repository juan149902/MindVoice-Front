import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="flex h-full">
      <div class="flex-1 flex flex-col bg-background-dark overflow-hidden">
        <div class="px-8 py-6 shrink-0">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-6">
              <h1 class="text-2xl font-bold text-white">Mi Biblioteca</h1>
            </div>
            <div class="flex gap-3">
              <button class="flex items-center gap-2 px-4 h-10 border border-border-dark bg-surface-dark rounded-lg text-sm font-semibold hover:bg-border-dark/80 transition-colors">
                <mat-icon class="text-lg">sort</mat-icon>
                <span>Ordenar por Fecha</span>
              </button>
              <button class="flex items-center justify-center rounded-lg h-10 bg-primary text-white gap-2 text-sm font-bold px-5 shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">
                <mat-icon>add</mat-icon>
                <span>Nueva Grabación</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-8 pb-8">
          <div class="bg-surface-dark rounded-xl border border-border-dark shadow-2xl overflow-hidden">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-border-dark/30 border-b border-border-dark">
                  <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-24">Onda</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Detalles</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duración</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Etiquetas</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado IA</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-dark/50">
                <tr class="bg-primary/10 hover:bg-primary/15 cursor-pointer transition-colors group">
                  <td class="px-6 py-5">
                    <div class="w-16 h-8 flex items-end gap-1">
                      <div class="w-1 bg-primary h-2 rounded-full"></div>
                      <div class="w-1 bg-primary h-5 rounded-full"></div>
                      <div class="w-1 bg-primary h-3 rounded-full"></div>
                      <div class="w-1 bg-primary h-7 rounded-full"></div>
                      <div class="w-1 bg-primary h-4 rounded-full"></div>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <div class="flex flex-col">
                      <span class="font-semibold text-white">Estrategia Lanzamiento Q4</span>
                      <span class="text-xs text-gray-500">28 Oct, 2023 • 10:45 AM</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-sm font-medium text-gray-400">08:12</td>
                  <td class="px-6 py-5">
                    <div class="flex gap-2">
                      <span class="px-2 py-0.5 bg-border-dark rounded text-[10px] font-bold text-gray-400">ESTRATEGIA</span>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      <span class="size-1.5 rounded-full bg-green-400"></span>
                      PROCESADO
                    </span>
                  </td>
                </tr>
                <tr class="hover:bg-border-dark/40 cursor-pointer transition-colors group">
                  <td class="px-6 py-5">
                    <div class="w-16 h-8 flex items-end gap-1">
                      <div class="w-1 bg-gray-600 h-4 rounded-full group-hover:bg-primary/50 transition-colors"></div>
                      <div class="w-1 bg-gray-600 h-6 rounded-full group-hover:bg-primary/50 transition-colors"></div>
                      <div class="w-1 bg-gray-600 h-5 rounded-full group-hover:bg-primary/50 transition-colors"></div>
                      <div class="w-1 bg-gray-600 h-3 rounded-full group-hover:bg-primary/50 transition-colors"></div>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <div class="flex flex-col">
                      <span class="font-semibold text-white">Brainstorming App UI</span>
                      <span class="text-xs text-gray-500">27 Oct, 2023 • 15:20 PM</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-sm font-medium text-gray-400">15:20</td>
                  <td class="px-6 py-5">
                    <div class="flex gap-2">
                      <span class="px-2 py-0.5 bg-border-dark rounded text-[10px] font-bold text-gray-400">DISEÑO</span>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary animate-pulse border border-primary/20">
                      <span class="size-1.5 rounded-full bg-primary"></span>
                      EN PROCESO...
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail Sidebar (Simulated open) -->
      <aside class="w-[450px] border-l border-border-dark bg-surface-dark flex flex-col z-20 shadow-2xl shrink-0">
        <div class="p-6 border-b border-border-dark">
          <div class="flex justify-between items-start mb-4">
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-bold text-white leading-tight">Estrategia Lanzamiento Q4</h2>
              <p class="text-xs text-gray-500">Grabado el 28 de Oct, 2023 • 10:45 AM</p>
            </div>
            <button class="text-gray-500 hover:text-white transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="bg-background-dark/80 rounded-xl p-4 flex flex-col gap-3 border border-border-dark">
            <div class="flex items-center gap-4">
              <button class="size-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 transition-transform">
                <mat-icon>play_arrow</mat-icon>
              </button>
              <div class="flex-1 h-1.5 bg-border-dark rounded-full relative">
                <div class="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full"></div>
                <div class="absolute top-1/2 left-1/3 size-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"></div>
              </div>
              <span class="text-[10px] font-mono font-medium text-gray-400">02:14 / 08:12</span>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div class="flex gap-4 border-b border-border-dark pb-0.5">
            <button class="text-xs font-bold border-b-2 border-primary pb-2 text-primary">Transcripción</button>
            <button class="text-xs font-medium text-gray-500 pb-2 hover:text-white transition-colors">Resumen</button>
            <button class="text-xs font-medium text-gray-500 pb-2 hover:text-white transition-colors">Tareas</button>
          </div>

          <div class="space-y-6">
            <div class="group relative">
              <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Editor de Transcripción</span>
                <button class="text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
                  <mat-icon class="text-xs">edit</mat-icon>
                  <span class="text-[10px] font-bold">EDITAR</span>
                </button>
              </div>
              <div class="p-4 bg-background-dark rounded-lg border border-border-dark text-gray-300 text-sm leading-relaxed min-h-[200px] focus-within:border-primary/50 transition-all">
                <p class="mb-4">
                  "Entonces, pensando en el lanzamiento del cuarto trimestre, realmente necesitamos redoblar esfuerzos en la comunidad de creadores. He notado que nuestro proceso de incorporación actual es demasiado complejo para usuarios no técnicos."
                </p>
                <p>
                  "Quizás deberíamos implementar un botón de 'resumen por IA con un solo clic' justo después de que termine la grabación. Esto daría valor inmediato sin que el usuario tenga que navegar por menús."
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acciones de IA</p>
              <div class="grid grid-cols-2 gap-2">
                <button class="flex items-center gap-2 p-3 bg-border-dark/30 border border-border-dark rounded-lg text-xs font-semibold hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <mat-icon class="text-primary text-lg group-hover:scale-110 transition-transform">auto_awesome</mat-icon>
                  <span>Ver Resumen</span>
                </button>
                <button class="flex items-center gap-2 p-3 bg-border-dark/30 border border-border-dark rounded-lg text-xs font-semibold hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <mat-icon class="text-primary text-lg group-hover:scale-110 transition-transform">task_alt</mat-icon>
                  <span>Tareas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `
})
export class LibraryComponent {}
