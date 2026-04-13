import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil, map, combineLatest, debounceTime } from 'rxjs';
import {
  AiAnalysisEntity,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { ResourceApiService } from '../../core/services/resource-api.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface FolderEntity {
  _id?: string;
}

interface DocumentEntity {
  _id?: string;
}

interface TagEntity {
  _id?: string;
}

interface DashboardMetrics {
  audios: number;
  transcriptions: number;
  analyses: number;
  folders: number;
  documents: number;
  tags: number;
}

interface StatCard {
  key: keyof DashboardMetrics;
  label: string;
  icon: string;
  bgColor: string;
  bgColorHover: string;
  iconBgColor: string;
  iconBgColorHover: string;
  iconColor: string;
  iconColorHover: string;
  borderColor: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  progressFrom: string;
  progressTo: string;
  dotColor: string;
}

const STAT_CARDS: StatCard[] = [
  {
    key: 'audios',
    label: 'Audios',
    icon: 'audio_file',
    bgColor: 'bg-violet-500/10',
    bgColorHover: 'hover:bg-violet-500/20',
    iconBgColor: 'bg-violet-500/20',
    iconBgColorHover: 'group-hover:bg-violet-500/30',
    iconColor: 'text-violet-400',
    iconColorHover: 'group-hover:text-violet-300',
    borderColor: 'hover:border-violet-500/50',
    glowColor: '139, 92, 246',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-violet-600/10',
    progressFrom: 'from-violet-500',
    progressTo: 'to-violet-400',
    dotColor: 'bg-violet-400'
  },
  {
    key: 'transcriptions',
    label: 'Transcripciones',
    icon: 'text_snippet',
    bgColor: 'bg-emerald-500/10',
    bgColorHover: 'hover:bg-emerald-500/20',
    iconBgColor: 'bg-emerald-500/20',
    iconBgColorHover: 'group-hover:bg-emerald-500/30',
    iconColor: 'text-emerald-400',
    iconColorHover: 'group-hover:text-emerald-300',
    borderColor: 'hover:border-emerald-500/50',
    glowColor: '52, 211, 153',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-emerald-600/10',
    progressFrom: 'from-emerald-500',
    progressTo: 'to-emerald-400',
    dotColor: 'bg-emerald-400'
  },
  {
    key: 'analyses',
    label: 'Análisis IA',
    icon: 'psychology',
    bgColor: 'bg-amber-500/10',
    bgColorHover: 'hover:bg-amber-500/20',
    iconBgColor: 'bg-amber-500/20',
    iconBgColorHover: 'group-hover:bg-amber-500/30',
    iconColor: 'text-amber-400',
    iconColorHover: 'group-hover:text-amber-300',
    borderColor: 'hover:border-amber-500/50',
    glowColor: '251, 191, 36',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-amber-600/10',
    progressFrom: 'from-amber-500',
    progressTo: 'to-amber-400',
    dotColor: 'bg-amber-400'
  },
  {
    key: 'folders',
    label: 'Carpetas',
    icon: 'folder',
    bgColor: 'bg-blue-500/10',
    bgColorHover: 'hover:bg-blue-500/20',
    iconBgColor: 'bg-blue-500/20',
    iconBgColorHover: 'group-hover:bg-blue-500/30',
    iconColor: 'text-blue-400',
    iconColorHover: 'group-hover:text-blue-300',
    borderColor: 'hover:border-blue-500/50',
    glowColor: '59, 130, 246',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-blue-600/10',
    progressFrom: 'from-blue-500',
    progressTo: 'to-blue-400',
    dotColor: 'bg-blue-400'
  },
  {
    key: 'documents',
    label: 'Documentos',
    icon: 'description',
    bgColor: 'bg-rose-500/10',
    bgColorHover: 'hover:bg-rose-500/20',
    iconBgColor: 'bg-rose-500/20',
    iconBgColorHover: 'group-hover:bg-rose-500/30',
    iconColor: 'text-rose-400',
    iconColorHover: 'group-hover:text-rose-300',
    borderColor: 'hover:border-rose-500/50',
    glowColor: '251, 113, 133',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-rose-600/10',
    progressFrom: 'from-rose-500',
    progressTo: 'to-rose-400',
    dotColor: 'bg-rose-400'
  },
  {
    key: 'tags',
    label: 'Etiquetas',
    icon: 'label',
    bgColor: 'bg-cyan-500/10',
    bgColorHover: 'hover:bg-cyan-500/20',
    iconBgColor: 'bg-cyan-500/20',
    iconBgColorHover: 'group-hover:bg-cyan-500/30',
    iconColor: 'text-cyan-400',
    iconColorHover: 'group-hover:text-cyan-300',
    borderColor: 'hover:border-cyan-500/50',
    glowColor: '34, 211, 238',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-cyan-600/10',
    progressFrom: 'from-cyan-500',
    progressTo: 'to-cyan-400',
    dotColor: 'bg-cyan-400'
  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen w-full p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <!-- Header Section -->
      <section class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-900/40 via-slate-900/40 to-cyan-900/40 p-6 md:p-8">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQwIDBIMFY0MHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50"></div>
        <div class="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>

        <div class="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <mat-icon class="text-white text-2xl">dashboard</mat-icon>
                </div>
                <div class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-900"></div>
              </div>
              <div>
                <h2 class="text-3xl md:text-4xl font-black text-white tracking-tight">
                  <span class="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Hola, {{ username }}</span>
                </h2>
                <p class="text-gray-400 text-sm md:text-base flex items-center gap-2">
                  <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  Panel operativo conectado en tiempo real
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="group relative h-12 px-6 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all duration-300 cursor-pointer overflow-hidden"
            (click)="refreshData()"
            [disabled]="(loading$ | async)"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/10 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span class="relative inline-flex items-center gap-2 text-sm font-semibold text-violet-300 group-hover:text-violet-200">
              <mat-icon class="text-lg transition-transform duration-500" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
              {{ (loading$ | async) ? 'Actualizando...' : 'Actualizar' }}
            </span>
          </button>
        </div>
      </section>

      <!-- Error Message -->
      @if (error$ | async) {
        <section class="relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 animate-pulse">
          <div class="absolute inset-y-0 left-0 w-1 bg-rose-500"></div>
          <div class="flex items-center gap-3">
            <mat-icon class="text-lg">error_outline</mat-icon>
            {{ error$ | async }}
          </div>
        </section>
      }

      <!-- Stats Grid -->
      <section class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        @for (card of statCards; track card.key; let i = $index) {
          <article
            class="group relative rounded-2xl border border-white/10 bg-slate-900/50 p-5 overflow-hidden transition-all duration-500 hover:scale-105 hover:-translate-y-1"
            [class]="card.borderColor"
            [style.animationDelay]="i * 100 + 'ms'"
          >
            <!-- Glow effect -->
            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br"
              [class]="card.gradientFrom + ' ' + card.gradientTo"
            ></div>

            <!-- Border glow -->
            <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              [style.boxShadow]="'0 0 30px rgba(' + card.glowColor + ', 0.3)'">
            </div>

            <div class="relative">
              <div class="flex items-center justify-between mb-3">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  [class]="card.iconBgColor + ' ' + card.iconBgColorHover"
                >
                  <mat-icon
                    class="text-xl transition-all duration-300"
                    [class]="card.iconColor + ' ' + card.iconColorHover"
                  >{{ card.icon }}</mat-icon>
                </div>
                <div class="flex items-center gap-1 text-xs text-gray-500">
                  <span class="w-1.5 h-1.5 rounded-full" [class]="card.dotColor + ' animate-pulse'"></span>
                  <span>En vivo</span>
                </div>
              </div>

              <div class="space-y-1">
                <p class="text-4xl font-black text-white tabular-nums tracking-tight">
                  {{ animatedMetrics[card.key] }}
                </p>
                <p class="text-sm text-gray-400">{{ card.label }}</p>
              </div>

              <!-- Progress bar -->
              <div class="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r"
                  [class]="card.progressFrom + ' ' + card.progressTo"
                  [style.width]="getPercentage(metrics[card.key]) + '%'">
                </div>
              </div>
            </div>
          </article>
        }
      </section>

      <!-- Charts Section -->
      <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Doughnut Chart -->
        <article class="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-violet-500 to-cyan-500"></span>
                Distribución de Contenido
              </h3>
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="px-2 py-1 rounded-full bg-white/5 border border-white/10">Total: {{ getTotalMetrics() }}</span>
              </div>
            </div>
            <div class="relative h-[280px]">
            @if (loading && !chartsInitialized) {
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                  <div class="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <mat-icon class="text-violet-400 text-xl">pie_chart</mat-icon>
                  </div>
                </div>
              </div>
            }
              <canvas #doughnutChart></canvas>
            </div>
          </div>
        </article>

        <!-- Bar Chart -->
        <article class="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>
                Resumen de Métricas
              </h3>
            </div>
            <div class="relative h-[280px]">
              @if (loading && !chartsInitialized) {
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative">
                    <div class="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <mat-icon class="text-emerald-400 text-xl">bar_chart</mat-icon>
                    </div>
                  </div>
                </div>
              }
              <canvas #barChart></canvas>
            </div>
          </div>
        </article>
      </section>

      <!-- Recent Items Section -->
      <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Recent Transcriptions -->
        <article class="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500"></span>
                Transcripciones Recientes
              </h3>
              <span class="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                Últimas 5
              </span>
            </div>

            @if ((loading) && (recentTranscriptions$ | async)?.length === 0) {
              <div class="flex items-center justify-center py-12">
                <div class="flex flex-col items-center gap-3">
                  <div class="relative">
                    <div class="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <mat-icon class="absolute inset-0 m-auto text-cyan-400 text-xl">text_snippet</mat-icon>
                  </div>
                  <p class="text-gray-400 text-sm">Cargando transcripciones...</p>
                </div>
              </div>
            } @else if ((recentTranscriptions$ | async)?.length === 0) {
              <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <mat-icon class="text-3xl text-gray-600">text_snippet</mat-icon>
                </div>
                <p class="text-gray-400">No hay transcripciones registradas.</p>
                <p class="text-gray-500 text-sm mt-1">Sube un audio para comenzar</p>
              </div>
            } @else {
              <div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                @for (transcription of (recentTranscriptions$ | async); track transcription._id || $index; let last = $last) {
                  <div
                    class="group rounded-xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer"
                    [class.border-b-white/10]="!last"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/30 transition-colors">
                        <mat-icon class="text-cyan-400 text-sm">text_fields</mat-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-300 line-clamp-2 leading-relaxed">{{ transcription.text }}</p>
                        <div class="flex items-center gap-3 mt-2">
                          <span class="text-xs text-gray-500 flex items-center gap-1">
                            <mat-icon class="text-xs">schedule</mat-icon>
                            {{ transcription.createdAt ? (transcription.createdAt | date: 'dd/MM HH:mm') : 'Sin fecha' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </article>

        <!-- Recent Analyses -->
        <article class="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-orange-500"></span>
                Análisis IA Recientes
              </h3>
              <span class="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                Últimos 5
              </span>
            </div>

            @if ((loading) && (recentAnalyses$ | async)?.length === 0) {
              <div class="flex items-center justify-center py-12">
                <div class="flex flex-col items-center gap-3">
                  <div class="relative">
                    <div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <mat-icon class="absolute inset-0 m-auto text-amber-400 text-xl">psychology</mat-icon>
                  </div>
                  <p class="text-gray-400 text-sm">Cargando análisis...</p>
                </div>
              </div>
            } @else if ((recentAnalyses$ | async)?.length === 0) {
              <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <mat-icon class="text-3xl text-gray-600">psychology</mat-icon>
                </div>
                <p class="text-gray-400">No hay análisis guardados.</p>
                <p class="text-gray-500 text-sm mt-1">Genera análisis con IA para verlos aquí</p>
              </div>
            } @else {
              <div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                @for (analysis of (recentAnalyses$ | async); track analysis._id || $index; let last = $last) {
                  <div
                    class="group rounded-xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
                    [class.border-b-white/10]="!last"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/30 transition-colors">
                        <mat-icon class="text-amber-400 text-sm">auto_awesome</mat-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-300 line-clamp-2 leading-relaxed">{{ analysis.result.resumen }}</p>
                        <div class="flex items-center gap-3 mt-2 flex-wrap">
                          @if (analysis.result.acciones?.length) {
                            <span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <mat-icon class="text-xs">task_alt</mat-icon>
                              {{ analysis.result.acciones.length }} acciones
                            </span>
                          }
                          @if (analysis.result.sentimiento) {
                            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {{ analysis.result.sentimiento }}
                            </span>
                          }
                          <span class="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                            <mat-icon class="text-xs">schedule</mat-icon>
                            {{ analysis.createdAt ? (analysis.createdAt | date: 'dd/MM HH:mm') : 'Sin fecha' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </article>
      </section>

      <!-- Trend Line Chart -->
      <section class="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-purple-500/5"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-1 h-6 rounded-full bg-gradient-to-b from-rose-500 to-purple-500"></span>
              Tendencias de Contenido
            </h3>
            <div class="flex items-center gap-2">
              <span class="flex items-center gap-1 text-xs text-violet-400">
                <span class="w-2 h-2 rounded-full bg-violet-500"></span> Audios
              </span>
              <span class="flex items-center gap-1 text-xs text-emerald-400">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Transcripciones
              </span>
              <span class="flex items-center gap-1 text-xs text-amber-400">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span> Análisis
              </span>
            </div>
          </div>
          <div class="relative h-[250px]">
            @if (loading && !chartsInitialized) {
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                  <div class="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                  <mat-icon class="absolute inset-0 m-auto text-rose-400 text-xl">trending_up</mat-icon>
                </div>
              </div>
            }
            <canvas #lineChart></canvas>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      transition: background 0.3s;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    article {
      animation: fadeInUp 0.5s ease-out forwards;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly state = inject(StateManagementService);
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();

  private doughnutChart: Chart | null = null;
  private barChart: Chart | null = null;
  private lineChart: Chart | null = null;

  username = 'Usuario';
  loading$ = this.state.loading$;
  error$ = this.state.error$;
  
  loading = false;
  private loadingFolders = false;
  private loadingDocuments = false;
  private loadingTags = false;

  metrics: DashboardMetrics = {
    audios: 0,
    transcriptions: 0,
    analyses: 0,
    folders: 0,
    documents: 0,
    tags: 0,
  };

  animatedMetrics: DashboardMetrics = {
    audios: 0,
    transcriptions: 0,
    analyses: 0,
    folders: 0,
    documents: 0,
    tags: 0,
  };

  recentTranscriptions$: Observable<TranscriptionEntity[]> = this.state.transcriptions$.pipe(
    map((trans) => trans.slice(0, 5))
  );
  
  recentAnalyses$: Observable<AiAnalysisEntity[]> = this.state.analyses$.pipe(
    map((analyses) => analyses.slice(0, 5))
  );

  chartsInitialized = false;
  statCards = STAT_CARDS;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedUsername = this.tokenStorage.getUsername();
    this.username = storedUsername ?? 'Usuario';

    // Ensure state is initialized once
    this.state.ensureInitialized();

    this.state.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.loading = isLoading;
      });

    combineLatest([
      this.state.audios$,
      this.state.transcriptions$,
      this.state.analyses$,
    ])
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(([audios, transcriptions, analyses]) => {
        this.metrics = { ...this.metrics, audios: audios.length, transcriptions: transcriptions.length, analyses: analyses.length };
        this.animateCounters(this.metrics);
        this.refreshCharts();
      });

    this.loadFoldersDocumentsAndTags();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Charts will be initialized on demand when data loads
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  refreshData(): void {
    this.state.refreshAllData();
    this.loadFoldersDocumentsAndTags();
  }

  private loadFoldersDocumentsAndTags(): void {
    this.loadingFolders = true;
    this.loadingDocuments = true;
    this.loadingTags = true;
    this.refreshLoadingState();

    this.resourceApi.list<any>('folders')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (folders) => {
          this.metrics = { ...this.metrics, folders: folders.length };
          this.animateCounters(this.metrics);
          this.refreshCharts();
          this.loadingFolders = false;
          this.refreshLoadingState();
        },
        error: () => {
          this.loadingFolders = false;
          this.refreshLoadingState();
        },
      });

    this.resourceApi.list<any>('documents')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          this.metrics = { ...this.metrics, documents: documents.length };
          this.animateCounters(this.metrics);
          this.refreshCharts();
          this.loadingDocuments = false;
          this.refreshLoadingState();
        },
        error: () => {
          this.loadingDocuments = false;
          this.refreshLoadingState();
        },
      });

    this.resourceApi.list<any>('tags')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tags) => {
          this.metrics = { ...this.metrics, tags: tags.length };
          this.animateCounters(this.metrics);
          this.refreshCharts();
          this.loadingTags = false;
          this.refreshLoadingState();
        },
        error: () => {
          this.loadingTags = false;
          this.refreshLoadingState();
        },
      });
  }

  private animateCounters(newMetrics: DashboardMetrics): void {
    const duration = 1000;
    const steps = 30;
    const interval = duration / steps;

    const startValues = { ...this.animatedMetrics };
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = this.easeOutQuart(progress);

      for (const key of Object.keys(newMetrics) as (keyof DashboardMetrics)[]) {
        const start = startValues[key];
        const end = newMetrics[key];
        this.animatedMetrics[key] = Math.round(start + (end - start) * easeProgress);
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        this.animatedMetrics = { ...newMetrics };
      }
    }, interval);
  }

  private easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  getPercentage(value: number): number {
    const total = this.getTotalMetrics();
    if (total === 0) return 0;
    return Math.min(100, (value / total) * 100);
  }

  getTotalMetrics(): number {
    return Object.values(this.metrics).reduce((sum, val) => sum + val, 0);
  }

  private updateCharts(): void {
    if (!this.chartsInitialized) {
      this.initCharts();
      this.chartsInitialized = true;
    } else {
      this.updateChartData();
    }
  }

  private refreshLoadingState(): void {
    this.loading = this.loadingFolders || this.loadingDocuments || this.loadingTags;
  }

  private refreshCharts(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    setTimeout(() => {
      this.updateCharts();
    }, 50);
  }

  private initCharts(): void {
    this.createDoughnutChart();
    this.createBarChart();
    this.createLineChart();
  }

  private createDoughnutChart(): void {
    if (!this.doughnutChartRef?.nativeElement) return;

    this.doughnutChart = new Chart(this.doughnutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Audios', 'Transcripciones', 'Análisis IA', 'Carpetas', 'Documentos', 'Etiquetas'],
        datasets: [{
          data: [
            this.metrics.audios,
            this.metrics.transcriptions,
            this.metrics.analyses,
            this.metrics.folders,
            this.metrics.documents,
            this.metrics.tags
          ],
          backgroundColor: [
            'rgba(139, 92, 246, 0.9)',
            'rgba(52, 211, 153, 0.9)',
            'rgba(251, 191, 36, 0.9)',
            'rgba(59, 130, 246, 0.9)',
            'rgba(251, 113, 133, 0.9)',
            'rgba(34, 211, 238, 0.9)'
          ],
          borderColor: [
            'rgba(139, 92, 246, 1)',
            'rgba(52, 211, 153, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(251, 113, 133, 1)',
            'rgba(34, 211, 238, 1)'
          ],
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: 500 as any },
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              generateLabels: (chart) => {
                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                const labels = original?.call(this, chart);
                return labels?.map((label) => {
                  label.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  return label;
                });
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            titleFont: { size: 13, weight: 600 as any },
            bodyFont: { size: 12 }
          }
        }
      }
    });
  }

  private createBarChart(): void {
    if (!this.barChartRef?.nativeElement) return;

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Audios', 'Transcripciones', 'Análisis', 'Documentos'],
        datasets: [{
          label: 'Cantidad',
          data: [
            this.metrics.audios,
            this.metrics.transcriptions,
            this.metrics.analyses,
            this.metrics.documents
          ],
          backgroundColor: [
            'rgba(139, 92, 246, 0.7)',
            'rgba(52, 211, 153, 0.7)',
            'rgba(251, 191, 36, 0.7)',
            'rgba(251, 113, 133, 0.7)'
          ],
          borderColor: [
            'rgba(139, 92, 246, 1)',
            'rgba(52, 211, 153, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(251, 113, 133, 1)'
          ],
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
          barThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 13, weight: 600 as any },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.6)',
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
              precision: 0
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 500 as any }
            }
          }
        }
      }
    });
  }

  private createLineChart(): void {
    if (!this.lineChartRef?.nativeElement) return;

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const audioData = this.generateTrendData(this.metrics.audios);
    const transcriptionData = this.generateTrendData(this.metrics.transcriptions);
    const analysisData = this.generateTrendData(this.metrics.analyses);

    this.lineChart = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Audios',
            data: audioData,
            borderColor: 'rgba(139, 92, 246, 1)',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(139, 92, 246, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
          },
          {
            label: 'Transcripciones',
            data: transcriptionData,
            borderColor: 'rgba(52, 211, 153, 1)',
            backgroundColor: 'rgba(52, 211, 153, 0.15)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(52, 211, 153, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
          },
          {
            label: 'Análisis IA',
            data: analysisData,
            borderColor: 'rgba(251, 191, 36, 1)',
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(251, 191, 36, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            mode: 'index',
            intersect: false,
            titleFont: { size: 13, weight: 600 as any },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.6)',
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
              precision: 0
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 500 as any }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  private generateTrendData(baseValue: number): number[] {
    const data: number[] = [];
    const seed = baseValue % 10;
    for (let i = 0; i < 6; i++) {
      const variation = 0.5 + (seed * (i + 1)) % 10 / 20;
      data.push(Math.round(baseValue * variation * (i + 1) / 4));
    }
    return data;
  }

  private updateChartData(): void {
    if (this.doughnutChart) {
      this.doughnutChart.data.datasets[0].data = [
        this.metrics.audios,
        this.metrics.transcriptions,
        this.metrics.analyses,
        this.metrics.folders,
        this.metrics.documents,
        this.metrics.tags
      ];
      this.doughnutChart.update('active');
    }

    if (this.barChart) {
      this.barChart.data.datasets[0].data = [
        this.metrics.audios,
        this.metrics.transcriptions,
        this.metrics.analyses,
        this.metrics.documents
      ];
      this.barChart.update('active');
    }

    if (this.lineChart) {
      const audioData = this.generateTrendData(this.metrics.audios);
      const transcriptionData = this.generateTrendData(this.metrics.transcriptions);
      const analysisData = this.generateTrendData(this.metrics.analyses);

      this.lineChart.data.datasets[0].data = audioData;
      this.lineChart.data.datasets[1].data = transcriptionData;
      this.lineChart.data.datasets[2].data = analysisData;
      this.lineChart.update('active');
    }
  }

  private destroyCharts(): void {
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = null;
    }
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }
    if (this.lineChart) {
      this.lineChart.destroy();
      this.lineChart = null;
    }
    this.chartsInitialized = false;
  }
}
