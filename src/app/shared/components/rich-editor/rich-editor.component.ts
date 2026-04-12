import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, MatIconModule],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-white">{{ title }}</h3>
        <div class="flex items-center gap-2">
          <span *ngIf="saveStatus" class="text-xs" [ngClass]="saveStatus === 'saving' ? 'text-yellow-400' : 'text-emerald-400'">
            {{ saveStatus === 'saving' ? 'Guardando...' : 'Guardado' }}
          </span>
          <button
            type="button"
            class="h-8 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            (click)="onSave()"
            [disabled]="saveStatus === 'saving'"
          >
            <mat-icon class="text-base">save</mat-icon>
          </button>
        </div>
      </div>

      <quill-editor
        [(ngModel)]="content"
        (ngModelChange)="onContentChange($event)"
        [modules]="editorModules"
        [styles]="{ height: '300px' }"
        class="rounded-lg border border-border-dark bg-background-dark/40"
      ></quill-editor>
    </div>
  `,
})
export class RichEditorComponent implements OnInit {
  @Input() title = 'Editor';
  @Input() initialContent = '';
  @Output() contentChanged = new EventEmitter<string>();
  @Output() contentSaved = new EventEmitter<string>();

  content = '';
  saveStatus: 'idle' | 'saving' | 'saved' | null = null;

  private saveSubject$ = new Subject<string>();

  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['clean'],
    ],
  };

  ngOnInit(): void {
    this.content = this.initialContent;

    this.saveSubject$
      .pipe(debounceTime(500))
      .subscribe((text) => {
        this.onSave();
      });
  }

  onContentChange(text: string): void {
    this.content = text;
    this.contentChanged.emit(text);
    this.saveSubject$.next(text);
  }

  onSave(): void {
    this.saveStatus = 'saving';
    setTimeout(() => {
      this.contentSaved.emit(this.content);
      this.saveStatus = 'saved';
      setTimeout(() => {
        this.saveStatus = null;
      }, 2000);
    }, 300);
  }
}
