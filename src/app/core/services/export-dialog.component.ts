import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type ExportFormat = 'png' | 'pdf' | 'docx';

export interface ExportFormatOption {
  value: ExportFormat;
  label: string;
  subtitle: string;
  icon: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
}

const DEFAULT_FORMATS: ExportFormatOption[] = [
  { value: 'png', label: 'PNG', subtitle: 'Imagen', icon: 'image', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
  { value: 'pdf', label: 'PDF', subtitle: 'Documento', icon: 'picture_as_pdf', gradient: 'from-rose-500/20 to-orange-500/20', iconColor: 'text-rose-400', borderColor: 'border-rose-500/30' },
  { value: 'docx', label: 'DOCX', subtitle: 'Word', icon: 'description', gradient: 'from-sky-500/20 to-indigo-500/20', iconColor: 'text-sky-400', borderColor: 'border-sky-500/30' },
];

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
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
        
        <div class="grid gap-3 mb-6" [style.grid-template-columns]="'repeat(' + activeFormats.length + ', 1fr)'">
          @for (fmt of activeFormats; track fmt.value) {
            <button 
              type="button"
              class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105"
              [class.border-primary]="selectedFormat() === fmt.value"
              [class.bg-primary/10]="selectedFormat() === fmt.value"
              [class.border-border-dark]="selectedFormat() !== fmt.value"
              [class.hover:border-primary/50]="selectedFormat() !== fmt.value"
              (click)="selectFormat(fmt.value)"
            >
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center border"
                [ngClass]="[fmt.gradient, fmt.borderColor]">
                <mat-icon [ngClass]="fmt.iconColor">{{ fmt.icon }}</mat-icon>
              </div>
              <span class="text-sm font-semibold text-gray-200">{{ fmt.label }}</span>
              <span class="text-xs text-gray-500">{{ fmt.subtitle }}</span>
            </button>
          }
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
export class ExportDialogComponent implements OnInit {
  @Input() title = '';
  @Input() formats: ExportFormatOption[] | null = null;
  @Output() formatSelected = new EventEmitter<ExportFormat>();
  @Output() cancelled = new EventEmitter<void>();

  activeFormats: ExportFormatOption[] = DEFAULT_FORMATS;
  selectedFormat = signal<ExportFormat>('png');

  ngOnInit(): void {
    this.activeFormats = this.formats ?? DEFAULT_FORMATS;
    if (this.activeFormats.length > 0) {
      this.selectedFormat.set(this.activeFormats[0].value);
    }
  }

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