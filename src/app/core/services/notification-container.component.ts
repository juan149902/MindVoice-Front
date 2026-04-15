import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, Notification } from './notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [NgClass, MatIconModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          class="notification-toast pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md"
          [ngClass]="getClasses(notification.type)"
          (click)="notificationService.dismiss(notification.id)"
        >
          <div class="size-8 shrink-0 rounded-lg flex items-center justify-center" [ngClass]="getIconBg(notification.type)">
            <mat-icon class="text-lg">{{ getIcon(notification.type) }}</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" [ngClass]="getTitleColor(notification.type)">
              {{ getTitle(notification.type) }}
            </p>
            <p class="text-sm font-medium leading-relaxed notification-text">{{ notification.message }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 size-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            (click)="notificationService.dismiss(notification.id); $event.stopPropagation()"
          >
            <mat-icon class="text-base text-gray-400">close</mat-icon>
          </button>
          <!-- Progress bar -->
          @if (notification.duration && notification.duration > 0) {
            <div class="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
              <div
                class="h-full rounded-b-xl"
                [ngClass]="getProgressColor(notification.type)"
                [style.animation]="'shrink ' + notification.duration + 'ms linear forwards'"
              ></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(120%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    .notification-toast {
      position: relative;
      animation: slide-in 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .notification-toast:hover {
      transform: translateX(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .notification-bg {
      background-color: rgba(26, 17, 40, 0.95);
    }
    .notification-text {
      color: #e5e7eb;
    }
    :host-context(.theme-light) .notification-bg {
      background-color: rgba(255, 255, 255, 0.97);
    }
    :host-context(.theme-light) .notification-text {
      color: #1e293b;
    }
    :host-context(.theme-light) .notification-toast:hover {
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class NotificationContainerComponent {
  notificationService = inject(NotificationService);

  getClasses(type: string): string {
    const base = 'notification-bg border ';
    switch (type) {
      case 'success':
        return base + 'border-emerald-500/40 shadow-emerald-500/15';
      case 'error':
        return base + 'border-rose-500/40 shadow-rose-500/15';
      case 'warning':
        return base + 'border-amber-500/40 shadow-amber-500/15';
      default:
        return base + 'border-sky-500/40 shadow-sky-500/15';
    }
  }

  getIconBg(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400';
      case 'error': return 'bg-rose-500/20 text-rose-400';
      case 'warning': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-sky-500/20 text-sky-400';
    }
  }

  getTitleColor(type: string): string {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-rose-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-sky-400';
    }
  }

  getTitle(type: string): string {
    switch (type) {
      case 'success': return 'Éxito';
      case 'error': return 'Error';
      case 'warning': return 'Advertencia';
      default: return 'Información';
    }
  }

  getProgressColor(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-sky-500';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}