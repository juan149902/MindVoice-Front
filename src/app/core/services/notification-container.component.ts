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
          class="notification-toast pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-sm animate-slide-in"
          [ngClass]="getClasses(notification.type)"
          (click)="notificationService.dismiss(notification.id)"
        >
          <mat-icon class="text-xl shrink-0">{{ getIcon(notification.type) }}</mat-icon>
          <p class="text-sm font-medium leading-relaxed flex-1">{{ notification.message }}</p>
          <button 
            type="button" 
            class="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
            (click)="notificationService.dismiss(notification.id); $event.stopPropagation()"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out forwards;
    }
    .notification-toast {
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }
    .notification-toast:hover {
      transform: scale(1.02);
    }
  `]
})
export class NotificationContainerComponent {
  notificationService = inject(NotificationService);

  getClasses(type: string): string {
    const base = 'bg-surface-dark/95 border ';
    switch (type) {
      case 'success':
        return base + 'border-emerald-500/50 shadow-emerald-500/20';
      case 'error':
        return base + 'border-rose-500/50 shadow-rose-500/20';
      case 'warning':
        return base + 'border-amber-500/50 shadow-amber-500/20';
      default:
        return base + 'border-sky-500/50 shadow-sky-500/20';
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