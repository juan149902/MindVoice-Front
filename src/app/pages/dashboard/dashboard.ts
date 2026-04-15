import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, takeUntil, map } from 'rxjs';
import {
  AiAnalysisEntity,
  TranscriptionEntity,
} from '../../core/services/audio-workflow.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { AppPreferencesService } from '../../core/services/app-preferences.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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

interface DashboardChartTheme {
  legendColor: string;
  axisColor: string;
  axisStrongColor: string;
  gridColor: string;
  tooltipBackground: string;
  tooltipTitle: string;
  tooltipBody: string;
  tooltipBorder: string;
}

const STAT_CARDS: StatCard[] = [
  {
    key: 'audios',
    label: 'dashboard.audios',
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
    label: 'dashboard.transcriptions',
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
    label: 'dashboard.aiAnalyses',
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
    label: 'dashboard.folders',
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
    label: 'dashboard.documents',
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
    label: 'dashboard.tags',
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
    <div class="dashboard-shell min-h-screen w-full p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 premium-page-shell">
      <!-- Header Section -->
      <section class="dashboard-hero premium-page-hero relative overflow-hidden rounded-2xl border border-white/10 p-6 md:p-8">
        <div class="dashboard-hero-grid absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQwIDBIMFY0MHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]"></div>
        <div class="dashboard-hero-glow-primary absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"></div>
        <div class="dashboard-hero-glow-secondary absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"></div>

        <div class="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <mat-icon class="text-white text-2xl">dashboard</mat-icon>
                </div>
                <div class="dashboard-status-dot absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2"></div>
              </div>
              <div>
                <h2 class="text-3xl md:text-4xl font-black text-white tracking-tight">
                  <span class="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Hola, {{ username }}</span>
                </h2>
                <p class="dashboard-subtitle text-sm md:text-base flex items-center gap-2">
                  <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  {{ t('dashboard.subtitle') }}
                </p>
                <p class="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <mat-icon class="text-[13px] text-violet-400">calendar_today</mat-icon>
                  {{ todayLabel }}
                </p>
              </div>
            </div>
          </div>

            <button
              type="button"
              class="dashboard-refresh-btn group relative h-12 px-6 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden"
              (click)="refreshData()"
              [disabled]="(loading$ | async)"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/10 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span class="dashboard-refresh-btn-label relative inline-flex items-center gap-2 text-sm font-semibold">
                <mat-icon class="text-lg transition-transform duration-500" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
                {{ (loading$ | async) ? t('common.updating') : t('common.update') }}
              </span>
            </button>
          </div>
      </section>

      <!-- Error Message -->
      @if (error$ | async) {
        <section class="dashboard-error-card relative overflow-hidden rounded-xl border p-4 text-sm animate-pulse">
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
            class="dashboard-stat-card group relative rounded-2xl p-5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
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
                  <span>{{ t('dashboard.live') }}</span>
                </div>
              </div>

              <div class="space-y-1">
                <p class="text-4xl font-black text-white tabular-nums tracking-tight">
                  {{ animatedMetrics[card.key] }}
                </p>
                <p class="text-sm text-gray-400">{{ t(card.label) }}</p>
              </div>

              <!-- Progress bar -->
              <div class="dashboard-progress-track mt-3 h-1 rounded-full overflow-hidden">
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
        <article class="dashboard-panel relative rounded-2xl border p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-violet-500 to-cyan-500"></span>
                {{ t('dashboard.contentDistribution') }}
              </h3>
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="dashboard-chip px-2 py-1 rounded-full border">{{ t('dashboard.total') }} {{ getTotalMetrics() }}</span>
              </div>
            </div>
            <div class="relative h-[320px] md:h-[340px] flex items-center justify-center">
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
              <div class="chart-canvas-shell chart-canvas-shell--doughnut">
                <canvas #doughnutChart class="chart-canvas"></canvas>
              </div>
            </div>
          </div>
        </article>

        <!-- Bar Chart -->
        <article class="dashboard-panel relative rounded-2xl border p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>
                {{ t('dashboard.metricsSummary') }}
              </h3>
            </div>
            <div class="relative h-[320px] md:h-[340px] flex items-center justify-center">
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
              <div class="chart-canvas-shell chart-canvas-shell--bar">
                <canvas #barChart class="chart-canvas"></canvas>
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- Recent Items Section -->
      <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Recent Transcriptions -->
        <article class="dashboard-panel relative rounded-2xl border p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500"></span>
                {{ t('dashboard.recentTranscriptions') }}
              </h3>
              <span class="dashboard-chip text-xs px-2 py-1 rounded-full border">
                {{ t('dashboard.last5') }}
              </span>
            </div>

            @if ((loading) && (recentTranscriptions$| async)?.length === 0) {
              <div class="flex items-center justify-center py-12">
                <div class="flex flex-col items-center gap-3">
                  <div class="relative">
                    <div class="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <mat-icon class="absolute inset-0 m-auto text-cyan-400 text-xl">text_snippet</mat-icon>
                  </div>
                  <p class="text-gray-400 text-sm">{{ t('dashboard.loadingTranscriptions') }}</p>
                </div>
              </div>
            } @else if ((recentTranscriptions$ | async)?.length === 0) {
              <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <mat-icon class="text-3xl text-gray-600">text_snippet</mat-icon>
                </div>
                <p class="text-gray-400">{{ t('dashboard.noTranscriptions') }}</p>
                <p class="text-gray-500 text-sm mt-1">{{ t('dashboard.uploadToStart') }}</p>
              </div>
            } @else {
              <div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                @for (transcription of (recentTranscriptions$ | async); track transcription._id || $index; let last = $last) {
                  <div
                    class="dashboard-list-item group rounded-xl border p-4 transition-all duration-300 cursor-pointer"
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
                            {{ dateFromEntity(transcription) ? (dateFromEntity(transcription) | date: 'dd/MM/yy HH:mm') : t('common.noDate') }}
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
        <article class="dashboard-panel relative rounded-2xl border p-6 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-orange-500"></span>
                {{ t('dashboard.recentAnalyses') }}
              </h3>
              <span class="dashboard-chip text-xs px-2 py-1 rounded-full border">
                {{ t('dashboard.last5') }}
              </span>
            </div>

            @if ((loading) && (recentAnalyses$| async)?.length === 0) {
              <div class="flex items-center justify-center py-12">
                <div class="flex flex-col items-center gap-3">
                  <div class="relative">
                    <div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <mat-icon class="absolute inset-0 m-auto text-amber-400 text-xl">psychology</mat-icon>
                  </div>
                  <p class="text-gray-400 text-sm">{{ t('dashboard.loadingAnalyses') }}</p>
                </div>
              </div>
            } @else if ((recentAnalyses$ | async)?.length === 0) {
              <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <mat-icon class="text-3xl text-gray-600">psychology</mat-icon>
                </div>
                <p class="text-gray-400">{{ t('dashboard.noAnalyses') }}</p>
                <p class="text-gray-500 text-sm mt-1">{{ t('dashboard.generateAnalyses') }}</p>
              </div>
            } @else {
              <div class="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                @for (analysis of (recentAnalyses$ | async); track analysis._id || $index; let last = $last) {
                  <div
                    class="dashboard-list-item group rounded-xl border p-4 transition-all duration-300 cursor-pointer"
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
                              {{ analysis.result.acciones.length }} {{ t('dashboard.actions') }}
                            </span>
                          }
                          @if (analysis.result.sentimiento) {
                            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {{ analysis.result.sentimiento }}
                            </span>
                          }
                          <span class="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                             <mat-icon class="text-xs">schedule</mat-icon>
                             {{ dateFromEntity(analysis) ? (dateFromEntity(analysis) | date: 'dd/MM/yy HH:mm') : t('common.noDate') }}
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
      <section class="dashboard-panel relative rounded-2xl border p-6 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-purple-500/5"></div>
        <div class="relative">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-1 h-6 rounded-full bg-gradient-to-b from-rose-500 to-purple-500"></span>
              {{ t('dashboard.contentTrends') }}
            </h3>
            <div class="flex items-center gap-2">
              <span class="flex items-center gap-1 text-xs text-violet-400">
                <span class="w-2 h-2 rounded-full bg-violet-500"></span> {{ t('dashboard.audios') }}
              </span>
              <span class="flex items-center gap-1 text-xs text-emerald-400">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> {{ t('dashboard.transcriptions') }}
              </span>
              <span class="flex items-center gap-1 text-xs text-amber-400">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span> {{ t('dashboard.analyses') }}
              </span>
            </div>
          </div>
          <div class="relative h-[300px] md:h-[320px] flex items-center justify-center">
            @if (loading && !chartsInitialized) {
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                  <div class="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                  <mat-icon class="absolute inset-0 m-auto text-rose-400 text-xl">trending_up</mat-icon>
                </div>
              </div>
            }
            <div class="chart-canvas-shell chart-canvas-shell--line">
              <canvas #lineChart class="chart-canvas"></canvas>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      --dashboard-panel-bg: linear-gradient(145deg, rgba(34, 21, 57, 0.78), rgba(18, 11, 33, 0.88));
      --dashboard-panel-border: rgba(167, 139, 250, 0.24);
      --dashboard-panel-shadow: 0 20px 42px rgba(12, 8, 22, 0.3);
      --dashboard-hero-bg: linear-gradient(125deg, rgba(76, 29, 149, 0.46), rgba(23, 14, 40, 0.84), rgba(14, 116, 144, 0.36));
      --dashboard-muted-text: #a1a1aa;
      --dashboard-chip-bg: rgba(255, 255, 255, 0.06);
      --dashboard-chip-border: rgba(255, 255, 255, 0.14);
      --dashboard-chip-text: #cbd5e1;
      --dashboard-list-bg: rgba(255, 255, 255, 0.05);
      --dashboard-list-border: rgba(255, 255, 255, 0.08);
      --dashboard-list-hover-bg: rgba(255, 255, 255, 0.1);
      --dashboard-list-hover-border: rgba(139, 92, 246, 0.36);
      --dashboard-progress-track: rgba(255, 255, 255, 0.08);
      --dashboard-refresh-bg: rgba(124, 58, 237, 0.14);
      --dashboard-refresh-border: rgba(167, 139, 250, 0.42);
      --dashboard-refresh-text: #c4b5fd;
      --dashboard-error-bg: rgba(244, 63, 94, 0.14);
      --dashboard-error-border: rgba(251, 113, 133, 0.38);
      --dashboard-error-text: #fecdd3;
      --dashboard-grid-opacity: 0.46;
      --dashboard-scroll-track: rgba(255, 255, 255, 0.05);
      --dashboard-scroll-thumb: rgba(255, 255, 255, 0.2);
      --dashboard-scroll-thumb-hover: rgba(255, 255, 255, 0.3);
    }

    :host-context(.theme-light) {
      --dashboard-panel-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 242, 255, 0.96));
      --dashboard-panel-border: rgba(124, 58, 237, 0.28);
      --dashboard-panel-shadow: 0 4px 20px rgba(76, 29, 149, 0.14), 0 1px 4px rgba(76, 29, 149, 0.08);
      --dashboard-hero-bg: linear-gradient(125deg, rgba(255, 255, 255, 0.98), rgba(246, 242, 255, 0.96), rgba(238, 248, 255, 0.94));
      --dashboard-muted-text: #64748b;
      --dashboard-chip-bg: rgba(124, 58, 237, 0.08);
      --dashboard-chip-border: rgba(124, 58, 237, 0.22);
      --dashboard-chip-text: #5b21b6;
      --dashboard-list-bg: rgba(124, 58, 237, 0.05);
      --dashboard-list-border: rgba(167, 139, 250, 0.2);
      --dashboard-list-hover-bg: rgba(124, 58, 237, 0.1);
      --dashboard-list-hover-border: rgba(124, 58, 237, 0.32);
      --dashboard-progress-track: rgba(124, 58, 237, 0.14);
      --dashboard-refresh-bg: rgba(124, 58, 237, 0.1);
      --dashboard-refresh-border: rgba(124, 58, 237, 0.3);
      --dashboard-refresh-text: #5b21b6;
      --dashboard-error-bg: rgba(244, 63, 94, 0.08);
      --dashboard-error-border: rgba(244, 63, 94, 0.24);
      --dashboard-error-text: #9f1239;
      --dashboard-grid-opacity: 0.18;
      --dashboard-scroll-track: rgba(124, 58, 237, 0.05);
      --dashboard-scroll-thumb: rgba(124, 58, 237, 0.28);
      --dashboard-scroll-thumb-hover: rgba(124, 58, 237, 0.42);
    }

    .dashboard-hero {
      background: var(--dashboard-hero-bg) !important;
      border-color: var(--dashboard-panel-border) !important;
      box-shadow: var(--dashboard-panel-shadow);
    }

    .dashboard-hero-grid {
      opacity: var(--dashboard-grid-opacity);
    }

    .dashboard-hero-glow-primary {
      background: radial-gradient(circle, rgba(139, 92, 246, 0.18), transparent 68%);
    }

    .dashboard-hero-glow-secondary {
      background: radial-gradient(circle, rgba(34, 211, 238, 0.15), transparent 68%);
    }

    :host-context(.theme-light) .dashboard-hero-glow-primary {
      background: radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 68%);
    }

    :host-context(.theme-light) .dashboard-hero-glow-secondary {
      background: radial-gradient(circle, rgba(56, 189, 248, 0.09), transparent 68%);
    }

    .dashboard-status-dot {
      border-color: rgba(15, 23, 42, 0.8);
    }

    :host-context(.theme-light) .dashboard-status-dot {
      border-color: rgba(255, 255, 255, 0.96);
    }

    .dashboard-subtitle {
      color: var(--dashboard-muted-text);
    }

    .dashboard-panel,
    .dashboard-stat-card {
      background: var(--dashboard-panel-bg);
      border-width: 1px;
      border-style: solid;
      border-color: var(--dashboard-panel-border) !important;
      box-shadow: var(--dashboard-panel-shadow);
    }

    .dashboard-stat-card {
      min-height: 150px;
    }

    .dashboard-refresh-btn {
      background: var(--dashboard-refresh-bg);
      border-color: var(--dashboard-refresh-border);
    }

    .dashboard-refresh-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.08);
    }

    .dashboard-refresh-btn-label {
      color: var(--dashboard-refresh-text);
    }

    .dashboard-error-card {
      background: var(--dashboard-error-bg);
      border-color: var(--dashboard-error-border);
      color: var(--dashboard-error-text);
    }

    .dashboard-chip {
      background: var(--dashboard-chip-bg);
      border-color: var(--dashboard-chip-border);
      color: var(--dashboard-chip-text);
    }

    .dashboard-list-item {
      background: var(--dashboard-list-bg);
      border-color: var(--dashboard-list-border);
    }

    .dashboard-list-item:hover {
      background: var(--dashboard-list-hover-bg);
      border-color: var(--dashboard-list-hover-border);
    }

    .dashboard-progress-track {
      background: var(--dashboard-progress-track);
    }

    :host-context(.theme-light) .dashboard-list-item p.text-gray-300 {
      color: #334155 !important;
    }

    :host-context(.theme-light) .dashboard-list-item .text-gray-500 {
      color: #64748b !important;
    }

    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: var(--dashboard-scroll-thumb) var(--dashboard-scroll-track);
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: var(--dashboard-scroll-track);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--dashboard-scroll-thumb);
      border-radius: 3px;
      transition: background 0.3s;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--dashboard-scroll-thumb-hover);
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

    .chart-canvas-shell {
      width: 100%;
      height: 100%;
      margin: 0 auto;
    }

    .chart-canvas-shell--doughnut {
      max-width: 520px;
    }

    .chart-canvas-shell--bar {
      max-width: 700px;
    }

    .chart-canvas-shell--line {
      max-width: 1080px;
    }

    .chart-canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
      margin: 0 auto;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly state = inject(StateManagementService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly preferences = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  private doughnutChart: Chart | null = null;
  private barChart: Chart | null = null;
  private lineChart: Chart | null = null;

  username = 'Usuario';
  readonly todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase());
  loading$ = this.state.loading$;
  error$ = this.state.error$;
  
  loading = false;
  private counterAnimationTimer: ReturnType<typeof setInterval> | null = null;
  private chartRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private themeObserver: MutationObserver | null = null;
  private readonly autoRefreshMs = 12000;

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

  recentTranscriptions$: Observable<TranscriptionEntity[]> = this.state.state$.pipe(
    map((state) => state.transcriptions.slice(0, 5))
  );
  
  recentAnalyses$: Observable<AiAnalysisEntity[]> = this.state.state$.pipe(
    map((state) => state.analyses.slice(0, 5))
  );

  chartsInitialized = false;
  statCards = STAT_CARDS;

  t(key: string): string {
    return this.preferences.t(key);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedUsername = this.tokenStorage.getUsername();
    this.username = storedUsername ?? 'Usuario';

    // Ensure state is initialized once
    this.state.ensureInitialized();
    this.state.refreshAllData();
    this.startAutoRefresh();
    this.attachWindowRefreshTriggers();
    this.attachThemeObserver();

    this.state.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.loading = isLoading;
      });

    this.state.state$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe((state) => {
        this.metrics = {
          audios: state.audios.length,
          transcriptions: state.transcriptions.length,
          analyses: state.analyses.length,
          folders: state.folders.length,
          documents: state.documents.length,
          tags: state.tags.length,
        };
        this.animateCounters(this.metrics);
        this.refreshCharts();
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
    this.detachWindowRefreshTriggers();
    this.detachThemeObserver();
    if (this.counterAnimationTimer) {
      clearInterval(this.counterAnimationTimer);
      this.counterAnimationTimer = null;
    }
    if (this.chartRefreshTimer) {
      clearTimeout(this.chartRefreshTimer);
      this.chartRefreshTimer = null;
    }
    this.destroyCharts();
  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  private startAutoRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }

    this.autoRefreshTimer = setInterval(() => {
      if (document.visibilityState !== 'visible' || this.loading) {
        return;
      }
      this.state.refreshAllData();
    }, this.autoRefreshMs);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  private readonly handleWindowFocus = (): void => {
    this.state.refreshAllData();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.state.refreshAllData();
    }
  };

  private attachWindowRefreshTriggers(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private detachWindowRefreshTriggers(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /** Extrae la fecha de un ObjectId de MongoDB o de un campo createdAt/created_at */
  dateFromEntity(entity: { _id?: string; createdAt?: string; created_at?: string }): Date | null {
    // Prefer explicit date fields first
    const explicit = entity.createdAt || entity.created_at;
    if (explicit) {
      const d = new Date(explicit);
      if (!isNaN(d.getTime())) return d;
    }
    // Fall back to MongoDB ObjectId timestamp (first 8 hex chars = Unix seconds)
    if (entity._id && /^[0-9a-f]{24}$/i.test(entity._id)) {
      return new Date(parseInt(entity._id.substring(0, 8), 16) * 1000);
    }
    return null;
  }

  private attachThemeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || typeof MutationObserver === 'undefined') {
      return;
    }

    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }

    this.themeObserver = new MutationObserver(() => {
      this.destroyCharts();
      this.refreshCharts();
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private detachThemeObserver(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
  }

  private getChartTheme(): DashboardChartTheme {
    const isLight = isPlatformBrowser(this.platformId) && document.body.classList.contains('theme-light');

    if (isLight) {
      return {
        legendColor: 'rgba(51, 65, 85, 0.88)',
        axisColor: 'rgba(71, 85, 105, 0.86)',
        axisStrongColor: 'rgba(30, 41, 59, 0.94)',
        gridColor: 'rgba(124, 58, 237, 0.12)',
        tooltipBackground: 'rgba(255, 255, 255, 0.96)',
        tooltipTitle: '#4c1d95',
        tooltipBody: '#1f2937',
        tooltipBorder: 'rgba(124, 58, 237, 0.24)'
      };
    }

    return {
      legendColor: 'rgba(248, 250, 252, 0.84)',
      axisColor: 'rgba(226, 232, 240, 0.72)',
      axisStrongColor: 'rgba(248, 250, 252, 0.88)',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      tooltipBackground: 'rgba(2, 6, 23, 0.92)',
      tooltipTitle: '#ffffff',
      tooltipBody: '#ffffff',
      tooltipBorder: 'rgba(167, 139, 250, 0.26)'
    };
  }

  private animateCounters(newMetrics: DashboardMetrics): void {
    if (this.counterAnimationTimer) {
      clearInterval(this.counterAnimationTimer);
      this.counterAnimationTimer = null;
    }

    const duration = 600;
    const steps = 24;
    const interval = duration / steps;

    const startValues = { ...this.animatedMetrics };
    let currentStep = 0;

    this.counterAnimationTimer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = this.easeOutQuart(progress);

      for (const key of Object.keys(newMetrics) as (keyof DashboardMetrics)[]) {
        const start = startValues[key];
        const end = newMetrics[key];
        this.animatedMetrics[key] = Math.round(start + (end - start) * easeProgress);
      }

      if (currentStep >= steps) {
        if (this.counterAnimationTimer) {
          clearInterval(this.counterAnimationTimer);
          this.counterAnimationTimer = null;
        }
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

  private refreshCharts(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.chartRefreshTimer) {
      clearTimeout(this.chartRefreshTimer);
      this.chartRefreshTimer = null;
    }
    this.chartRefreshTimer = setTimeout(() => {
      this.chartRefreshTimer = null;
      this.updateCharts();
    }, 16);
  }

  private initCharts(): void {
    this.createDoughnutChart();
    this.createBarChart();
    this.createLineChart();
  }

  private createDoughnutChart(): void {
    if (!this.doughnutChartRef?.nativeElement) return;
    const theme = this.getChartTheme();

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
        cutout: '68%',
        layout: {
          padding: { top: 8, right: 8, bottom: 8, left: 8 }
        },
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              color: theme.legendColor,
              font: { size: 12, family: 'Inter, system-ui, sans-serif', weight: 500 as any },
              padding: 14,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBackground,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
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
    const theme = this.getChartTheme();

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
          maxBarThickness: 52,
          categoryPercentage: 0.62,
          barPercentage: 0.82
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 6, right: 12, bottom: 6, left: 12 }
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBackground,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
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
              color: theme.gridColor
            },
            ticks: {
              color: theme.axisColor,
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
              precision: 0
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: theme.axisStrongColor,
              font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 500 as any },
              maxRotation: 0,
              minRotation: 0
            }
          }
        }
      }
    });
  }

  private createLineChart(): void {
    if (!this.lineChartRef?.nativeElement) return;
    const theme = this.getChartTheme();

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
        layout: {
          padding: { top: 6, right: 8, bottom: 6, left: 8 }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBackground,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
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
              color: theme.gridColor
            },
            ticks: {
              color: theme.axisColor,
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
              precision: 0
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: theme.axisStrongColor,
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
