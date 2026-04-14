import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  
  readonly notifications = computed(() => this.notificationsSignal());

  private counter = 0;

  show(message: string, type: NotificationType = 'info', duration = 4000): void {
    const id = `notification-${++this.counter}`;
    const notification: Notification = { id, message, type, duration };

    this.notificationsSignal.update(list => [...list, notification]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 4000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4500): void {
    this.show(message, 'warning', duration);
  }

  dismiss(id: string): void {
    this.notificationsSignal.update(list => list.filter(n => n.id !== id));
  }

  dismissAll(): void {
    this.notificationsSignal.set([]);
  }
}