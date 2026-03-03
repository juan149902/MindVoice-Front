import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-summaries',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="px-6 py-8 md:px-12 lg:px-16 max-w-6xl mx-auto">
      <div class="flex flex-wrap justify-between items-end gap-6 mb-10">
        <div class="flex flex-col gap-2">
          <h1 class="text-white text-4xl font-black leading-tight tracking-tight">Resúmenes Ejecutivos</h1>
          <p class="text-gray-400 text-lg font-medium">Insights sintetizados por IA de tus pensamientos grabados.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
        <!-- Featured Summary -->
        <div class="col-span-1 md:col-span-2 2xl:col-span-3 bg-surface-dark rounded-3xl border-2 border-primary/50 p-8 shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 right-0 p-6">
            <span class="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-primary/30">Revisión Abierta</span>
          </div>
          
          <div class="flex flex-col gap-8">
            <div>
              <div class="flex items-center gap-2 text-primary mb-2">
                <mat-icon class="text-sm">auto_awesome</mat-icon>
                <span class="text-[10px] font-bold uppercase tracking-widest">Título auto-generado</span>
              </div>
              <h3 class="text-3xl font-black text-white mb-4">Pivote Estratégico Q4: Enfoque Prioritario en Móvil</h3>
              
              <div class="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div class="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg">
                  <mat-icon class="text-base">graphic_eq</mat-icon>
                  <span class="font-medium">Fuente: Grab_2023_10_24.m4a</span>
                </div>
                <div class="flex gap-2">
                  <span class="bg-purple-900/30 text-purple-400 text-xs px-3 py-1 rounded-full font-bold border border-purple-500/20">#Estrategia</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div class="lg:col-span-2 space-y-6">
                <div class="space-y-4 text-gray-300 leading-relaxed text-lg">
                  <p>La grabación detalla un cambio fundamental en nuestra hoja de ruta, priorizando una estrategia móvil para captar a la base de usuarios de la Generación Z. El ecosistema actual de escritorio, aunque sólido, carece de la inmediatez necesaria para el segmento de mercado de 'captura de pensamiento' que estamos buscando.</p>
                  <p>Se identifican consideraciones técnicas críticas, incluyendo capacidades de procesamiento de audio nativo y una interfaz simplificada que reduzca la fricción desde el pensamiento hasta el almacenamiento digital.</p>
                </div>
              </div>
              
              <div class="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div class="flex items-center gap-2 mb-6">
                  <mat-icon class="text-primary">psychology</mat-icon>
                  <h4 class="text-sm font-black uppercase tracking-widest text-white">Insights Clave IA</h4>
                </div>
                <ul class="space-y-4">
                  <li class="flex gap-3 text-sm text-gray-300">
                    <div class="mt-1 size-1.5 rounded-full bg-primary shrink-0"></div>
                    <span>Priorizar la integración del SDK móvil para finales de noviembre.</span>
                  </li>
                  <li class="flex gap-3 text-sm text-gray-300">
                    <div class="mt-1 size-1.5 rounded-full bg-primary shrink-0"></div>
                    <span>Segmentar a la Gen Z mediante patrones de UX ambiental.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Smaller Cards -->
        <div class="bg-surface-dark rounded-3xl border border-white/5 p-6 hover:border-primary/40 transition-all group cursor-pointer shadow-lg hover:shadow-primary/5">
          <div class="flex flex-col h-full gap-5">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-1.5 text-primary/70 mb-1">
                  <mat-icon class="text-[14px]">auto_awesome</mat-icon>
                  <span class="text-[9px] font-bold uppercase tracking-wider">Título auto-generado</span>
                </div>
                <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors leading-snug">Desarrollo Personal: Log de Meditación</h3>
              </div>
            </div>
            <p class="text-gray-400 text-sm line-clamp-2 leading-relaxed">Análisis sobre el impacto de una sesión matutina de mindfulness de 20 minutos en el enfoque posterior para programar y resolver problemas técnicos...</p>
          </div>
        </div>
        
        <div class="bg-surface-dark rounded-3xl border border-white/5 p-6 hover:border-primary/40 transition-all group cursor-pointer shadow-lg hover:shadow-primary/5">
          <div class="flex flex-col h-full gap-5">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-1.5 text-primary/70 mb-1">
                  <mat-icon class="text-[14px]">auto_awesome</mat-icon>
                  <span class="text-[9px] font-bold uppercase tracking-wider">Título auto-generado</span>
                </div>
                <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors leading-snug">Refactorización de Arquitectura Frontend</h3>
              </div>
            </div>
            <p class="text-gray-400 text-sm line-clamp-2 leading-relaxed">Inmersión profunda en la migración de la librería de componentes a un patrón de UI 'headless' para mejorar la accesibilidad y consistencia...</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SummariesComponent {}
