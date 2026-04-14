import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ExportFormat = 'png' | 'pdf' | 'docx';

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [NgClass, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" (click)="cancel()"></div>
      <div class="relative bg-surface-dark border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Descargar {{ title }}</h2>
          <button 
            type="button" 
            class="p-2 rounded-lg hover:bg-white/10 transition-colors"
            (click)="cancel()"
          >
            <mat-icon class="text-gray-400">close</mat-icon>
          </button>
        </div>
        
        <div class="grid grid-cols-3 gap-3 mb-6">
          <button 
            type="button"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105"
            [class.border-primary]="selectedFormat() === 'png'"
            [class.bg-primary/10]="selectedFormat() === 'png'"
            [class.border-border-dark]="selectedFormat() !== 'png'"
            [class.hover:border-primary/50]="selectedFormat() !== 'png'"
            (click)="selectFormat('png')"
          >
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30">
              <mat-icon class="text-blue-400">image</mat-icon>
            </div>
            <span class="text-sm font-semibold text-gray-200">PNG</span>
            <span class="text-xs text-gray-500">Imagen</span>
          </button>

          <button 
            type="button"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105"
            [class.border-primary]="selectedFormat() === 'pdf'"
            [class.bg-primary/10]="selectedFormat() === 'pdf'"
            [class.border-border-dark]="selectedFormat() !== 'pdf'"
            [class.hover:border-primary/50]="selectedFormat() !== 'pdf'"
            (click)="selectFormat('pdf')"
          >
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center border border-rose-500/30">
              <mat-icon class="text-rose-400">picture_as_pdf</mat-icon>
            </div>
            <span class="text-sm font-semibold text-gray-200">PDF</span>
            <span class="text-xs text-gray-500">Documento</span>
          </button>

          <button 
            type="button"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105"
            [class.border-primary]="selectedFormat() === 'docx'"
            [class.bg-primary/10]="selectedFormat() === 'docx'"
            [class.border-border-dark]="selectedFormat() !== 'docx'"
            [class.hover:border-primary/50]="selectedFormat() !== 'docx'"
            (click)="selectFormat('docx')"
          >
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center border border-sky-500/30">
              <mat-icon class="text-sky-400">description</mat-icon>
            </div>
            <span class="text-sm font-semibold text-gray-200">DOCX</span>
            <span class="text-xs text-gray-500">Word</span>
          </button>
        </div>

        <div class="flex gap-3">
          <button 
            type="button"
            class="flex-1 h-12 rounded-xl border border-border-dark text-gray-300 font-semibold hover:bg-border-dark/50 transition-colors"
            (click)="cancel()"
          >
            Cancelar
          </button>
          <button 
            type="button"
            class="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white font-semibold hover:shadow-lg transition-all"
            (click)="confirm()"
          >
            <span class="flex items-center justify-center gap-2">
              <mat-icon class="text-lg">download</mat-icon>
              Descargar
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scale-in {
      from {
        transform: scale(0.95);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out forwards;
    }
  `]
})
export class ExportDialogComponent {
  @Input() title = '';
  @Output() formatSelected = new EventEmitter<ExportFormat>();
  @Output() cancelled = new EventEmitter<void>();

  selectedFormat = signal<ExportFormat>('png');

  selectFormat(format: ExportFormat): void {
    this.selectedFormat.set(format);
  }

  confirm(): void {
    this.formatSelected.emit(this.selectedFormat());
  }

  cancel(): void {
    this.cancelled.emit();
  }
}