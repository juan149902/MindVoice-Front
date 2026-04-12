/**
 * ConfirmDeleteDialogComponent - Diálogo de confirmación para eliminar cuenta
 * MindVoice - Angular Material Dialog
 */
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-6 bg-surface-dark text-white">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
          <mat-icon class="text-rose-400 text-2xl">warning</mat-icon>
        </div>
        <h2 class="text-xl font-bold">¿Eliminar tu cuenta?</h2>
      </div>
      
      <p class="text-gray-300 mb-6">
        Esta acción es <strong class="text-rose-400">permanente e irreversible</strong>. 
        Se eliminarán todos tus datos:
      </p>
      
      <ul class="text-sm text-gray-400 mb-6 space-y-2">
        <li class="flex items-center gap-2">
          <mat-icon class="text-rose-400 text-sm">remove</mat-icon>
          Todas tus notas y transcripciones
        </li>
        <li class="flex items-center gap-2">
          <mat-icon class="text-rose-400 text-sm">remove</mat-icon>
          Todas tus etiquetas
        </li>
        <li class="flex items-center gap-2">
          <mat-icon class="text-rose-400 text-sm">remove</mat-icon>
          Todos tus mapas mentales
        </li>
        <li class="flex items-center gap-2">
          <mat-icon class="text-rose-400 text-sm">remove</mat-icon>
          Tu información personal
        </li>
      </ul>
      
      <div class="flex justify-end gap-3">
        <button
          mat-button
          (click)="onCancel()"
          class="h-10 px-4 rounded-lg border border-border-dark text-gray-300 hover:bg-border-dark/70">
          Cancelar
        </button>
        <button
          mat-flat-button
          color="warn"
          (click)="onConfirm()"
          class="h-10 px-4 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700">
          Sí, Eliminar mi Cuenta
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(private dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
