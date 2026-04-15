import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface DocumentEditorData {
  documentType: 'transcription' | 'analysis-summary';
  title: string;
  content: string;
  entityId: string;
  audioId?: string;
  transcriptionId?: string;
  analysisResult?: Record<string, any>;
  readonly?: boolean;
}

export interface DocumentEditorSaveEvent {
  documentType: 'transcription' | 'analysis-summary';
  entityId: string;
  newContent: string;
  audioId?: string;
  transcriptionId?: string;
  analysisResult?: Record<string, any>;
}

@Component({
  selector: 'app-document-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    @if (visible && data) {
      <div class="fixed inset-0 z-[110] flex items-center justify-center p-4"
           (keydown.escape)="close()" tabindex="-1">
        <div class="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fadeIn" (click)="close()"></div>

        <div class="doc-editor-modal relative z-10 w-full max-w-5xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl shadow-purple-900/30 flex flex-col animate-scaleIn overflow-hidden">

          <!-- Title Bar -->
          <header class="doc-editor-header shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="size-9 flex items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
                <mat-icon>{{ data.readonly ? 'article' : (data.documentType === 'transcription' ? 'description' : 'psychology') }}</mat-icon>
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="doc-title text-base font-bold truncate">{{ data.title }}</h2>
                <p class="doc-subtitle text-[11px]">
                  {{ data.documentType === 'transcription' ? 'Transcripción' : 'Resumen del Análisis' }}
                  · {{ data.readonly ? 'Vista de lectura' : 'Editando documento' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (!data.readonly && saving()) {
                <span class="text-xs text-amber-400 flex items-center gap-1">
                  <mat-icon class="text-sm animate-spin">sync</mat-icon>
                  Guardando...
                </span>
              }
              @if (!data.readonly && saved()) {
                <span class="text-xs text-emerald-400 flex items-center gap-1">
                  <mat-icon class="text-sm">check_circle</mat-icon>
                  Guardado
                </span>
              }
              <button type="button"
                class="doc-close-btn size-9 flex items-center justify-center rounded-lg transition-colors"
                (click)="close()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </header>

          <!-- Toolbar (only in edit mode) — plain text only -->
          @if (!data.readonly) {
            <div class="doc-editor-toolbar shrink-0 flex items-center gap-1 px-4 py-2 border-b border-white/10 flex-wrap">
              <button type="button" class="toolbar-btn" title="Deshacer (Ctrl+Z)" (click)="execCommand('undo')">
                <mat-icon class="text-[18px]">undo</mat-icon>
              </button>
              <button type="button" class="toolbar-btn" title="Rehacer (Ctrl+Y)" (click)="execCommand('redo')">
                <mat-icon class="text-[18px]">redo</mat-icon>
              </button>

              <span class="toolbar-divider"></span>

              <button type="button" class="toolbar-btn" title="Seleccionar todo" (click)="selectAll()">
                <mat-icon class="text-[18px]">select_all</mat-icon>
              </button>

              <div class="flex-1"></div>

              <span class="text-[11px] text-gray-500">{{ wordCount() }} palabras · Texto plano</span>
            </div>
          }

          <!-- Document Canvas — paper stays fixed, content scrolls inside -->
          <div class="doc-editor-canvas flex-1 overflow-hidden flex justify-center p-6 min-h-0">
            <div class="doc-page w-full max-w-[800px]"
                 #editorArea
                 [attr.contenteditable]="data.readonly ? 'false' : 'true'"
                 (input)="onInput()"
                 (keydown)="onKeyDown($event)"
                 (keydown.control.s)="onCtrlS($event)"
                 (paste)="onPaste($event)"
                 [attr.spellcheck]="!data.readonly">
            </div>
          </div>

          <!-- Footer -->
          <footer class="doc-editor-footer shrink-0 border-t border-white/10 px-5 py-3 flex items-center justify-between">
            @if (data.readonly) {
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <mat-icon class="text-sm text-purple-400">visibility</mat-icon>
                <span>Vista de lectura</span>
              </div>
              <button type="button"
                class="h-9 px-5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                (click)="close()">
                Cerrar
              </button>
            } @else {
              <div class="flex items-center gap-3 text-xs text-gray-500">
                @if (hasChanges()) {
                  <span class="flex items-center gap-1 text-amber-400">
                    <span class="size-2 rounded-full bg-amber-400"></span>
                    Cambios sin guardar
                  </span>
                } @else {
                  <span class="flex items-center gap-1 text-emerald-500">
                    <span class="size-2 rounded-full bg-emerald-500"></span>
                    Sin cambios pendientes
                  </span>
                }
              </div>
              <div class="flex items-center gap-2">
                <button type="button"
                  class="h-9 px-4 rounded-lg border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors"
                  (click)="close()">
                  Cancelar
                </button>
                <button type="button"
                  class="h-9 px-5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                  [disabled]="saving() || !hasChanges()"
                  (click)="save()">
                  <span class="inline-flex items-center gap-1.5">
                    <mat-icon class="text-[16px]">save</mat-icon>
                    Guardar cambios
                  </span>
                </button>
              </div>
            }
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.25s ease-out; }

    .doc-editor-modal { background: #0f172a; }
    .doc-editor-header { background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); }
    .doc-editor-toolbar { background: rgba(30,41,59,0.8); }
    .doc-editor-canvas { background: #1a2236; }
    .doc-editor-footer { background: rgba(30,41,59,0.9); }

    .doc-title { color: #ffffff; }
    .doc-subtitle { color: #94a3b8; }
    .doc-close-btn { color: #94a3b8; }
    .doc-close-btn:hover { color: #ffffff; background: rgba(255,255,255,0.1); }

    .toolbar-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 6px;
      color: #94a3b8; transition: all 0.15s;
    }
    .toolbar-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
    .toolbar-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 4px; }

    .doc-page {
      overflow-y: auto;
      background: #ffffff;
      color: #1e293b;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.08);
      padding: 60px 60px;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 15px;
      line-height: 1.8;
      outline: none;
      caret-color: #7c3aed;
    }
    .doc-page:focus {
      box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 0 2px rgba(124,58,237,0.4);
    }
    .doc-page[contenteditable="false"] {
      cursor: default; user-select: text; caret-color: transparent;
    }
    .doc-page h1 { font-size: 28px; font-weight: 700; margin: 16px 0 8px; line-height: 1.3; color: #0f172a; }
    .doc-page h2 { font-size: 22px; font-weight: 600; margin: 14px 0 6px; line-height: 1.4; color: #1e293b; }
    .doc-page h3 { font-size: 18px; font-weight: 600; margin: 12px 0 4px; line-height: 1.4; color: #334155; }
    .doc-page p { margin: 0 0 12px; }
    .doc-page blockquote {
      border-left: 3px solid #7c3aed; padding-left: 16px;
      margin: 12px 0; color: #475569; font-style: italic;
    }
    .doc-page ul, .doc-page ol { padding-left: 24px; margin: 8px 0; }
    .doc-page li { margin: 4px 0; }
    .doc-page hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }

    :host-context(.theme-light) .doc-editor-modal { background: #f8fafc; }
    :host-context(.theme-light) .doc-editor-header { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); }
    :host-context(.theme-light) .doc-title { color: #1e293b !important; }
    :host-context(.theme-light) .doc-subtitle { color: #64748b !important; }
    :host-context(.theme-light) .doc-close-btn { color: #64748b; }
    :host-context(.theme-light) .doc-close-btn:hover { color: #1e293b; background: rgba(0,0,0,0.06); }
    :host-context(.theme-light) .doc-editor-toolbar { background: #f1f5f9; }
    :host-context(.theme-light) .toolbar-btn { color: #475569; }
    :host-context(.theme-light) .toolbar-btn:hover { background: rgba(0,0,0,0.06); color: #1e293b; }
    :host-context(.theme-light) .toolbar-divider { background: rgba(0,0,0,0.12); }
    :host-context(.theme-light) .doc-editor-canvas { background: #e2e8f0; }
    :host-context(.theme-light) .doc-editor-footer { background: #f1f5f9; }
    :host-context(.theme-light) .doc-editor-modal .border-white\\/10 { border-color: rgba(0,0,0,0.1) !important; }
    :host-context(.theme-light) .doc-editor-footer button.border-white\\/10 {
      border-color: rgba(0,0,0,0.12); color: #475569;
    }
  `],
})
export class DocumentEditorModalComponent implements OnChanges, AfterViewInit {
  @Input() data: DocumentEditorData | null = null;
  @Input() visible = false;
  @Output() saveDoc = new EventEmitter<DocumentEditorSaveEvent>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('editorArea') editorAreaRef!: ElementRef<HTMLDivElement>;

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly hasChanges = signal(false);
  readonly wordCount = signal(0);

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['visible']) && this.visible && this.data) {
      this.saving.set(false);
      this.saved.set(false);
      this.hasChanges.set(false);
      setTimeout(() => this.loadContent(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.visible && this.data) {
      this.loadContent();
    }
  }

  private loadContent(): void {
    const el = this.editorAreaRef?.nativeElement;
    if (!el || !this.data) return;
    const text = this.data.content || '';
    if (text.includes('<') && text.includes('>')) {
      el.innerHTML = text;
    } else {
      el.innerHTML = text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => `<p>${this.escapeHtml(line)}</p>`)
        .join('');
    }
    if (el.innerHTML.trim() === '') {
      el.innerHTML = '<p><br></p>';
    }
    this.updateWordCount();
    el.focus();
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  onInput(): void {
    this.hasChanges.set(true);
    this.saved.set(false);
    this.updateWordCount();
  }

  private updateWordCount(): void {
    const el = this.editorAreaRef?.nativeElement;
    if (!el) return;
    const text = el.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    this.wordCount.set(words);
  }

  execCommand(command: string, value?: string): void {
    document.execCommand(command, false, value);
    this.editorAreaRef?.nativeElement.focus();
    this.onInput();
  }

  selectAll(): void {
    this.editorAreaRef?.nativeElement.focus();
    document.execCommand('selectAll');
  }

  /** Block Ctrl+B/I/U so users don't apply unsaveable formatting */
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'b' || key === 'i' || key === 'u') {
        event.preventDefault();
      }
    }
  }

  /** Strip formatting on paste — insert plain text only */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  onCtrlS(event: Event): void {
    event.preventDefault();
    if (this.hasChanges()) this.save();
  }

  save(): void {
    if (!this.data || this.saving()) return;
    const el = this.editorAreaRef?.nativeElement;
    if (!el) return;

    this.saving.set(true);
    const newContent = el.innerText || '';

    this.saveDoc.emit({
      documentType: this.data.documentType,
      entityId: this.data.entityId,
      newContent,
      audioId: this.data.audioId,
      transcriptionId: this.data.transcriptionId,
      analysisResult: this.data.analysisResult,
    });
  }

  onSaveComplete(): void {
    this.saving.set(false);
    this.saved.set(true);
    this.hasChanges.set(false);
    setTimeout(() => this.saved.set(false), 3000);
  }

  onSaveError(): void {
    this.saving.set(false);
  }

  close(): void {
    if (!this.data?.readonly && this.hasChanges()) {
      if (!confirm('Tienes cambios sin guardar. ¿Deseas salir sin guardar?')) return;
    }
    this.closed.emit();
  }
}
