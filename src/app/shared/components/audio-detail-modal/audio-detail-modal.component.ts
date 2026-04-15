import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  AudioEntity,
  TranscriptionEntity,
  AiAnalysisEntity,
} from '../../../core/services/audio-workflow.service';
import { Tag } from '../../../core/services/tags.service';
import { AppPreferencesService } from '../../../core/services/app-preferences.service';

export interface AudioDetailData {
  audio: AudioEntity;
  transcriptions: TranscriptionEntity[];
  analyses: AiAnalysisEntity[];
  allTags: Tag[];
  allFolders: { _id?: string; name?: string; [key: string]: unknown }[];
}

export type AudioModalAction =
  | { type: 'close' }
  | { type: 'generateSummary'; transcriptionId: string; text: string }
  | { type: 'generateMindmap'; transcriptionId: string; text: string }
  | { type: 'exportPdf'; audio: AudioEntity; transcription?: TranscriptionEntity; analysis?: AiAnalysisEntity }
  | { type: 'exportWord'; audio: AudioEntity; transcription?: TranscriptionEntity; analysis?: AiAnalysisEntity }
  | { type: 'assignFolder'; audioId: string; folderId: string | null }
  | { type: 'assignTags'; audioId: string; tagIds: string[] }
  | { type: 'deleteAudio'; audioId: string }
  | { type: 'editTranscription'; transcription: TranscriptionEntity; audioId: string }
  | { type: 'editAnalysis'; analysis: AiAnalysisEntity };

@Component({
  selector: 'app-audio-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    @if (visible) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4"
           (keydown.escape)="close()" tabindex="-1">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn" (click)="close()"></div>

        <!-- Modal -->
        <div class="relative z-10 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-white/10 mv-modal-bg shadow-2xl shadow-blue-900/20 flex flex-col animate-scaleIn overflow-hidden">

          <!-- Header -->
          <header class="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-indigo-900/20">
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-bold text-white truncate">
                {{ data?.audio?.title || data?.audio?.filePath || 'Audio' }}
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ data?.audio?.duration || 0 }}s · {{ data?.audio?.format || 'wav' }}
                @if (data?.audio?.createdAt) {
                  · {{ data!.audio.createdAt | date:'medium' }}
                }
              </p>
            </div>
            <button type="button" class="size-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" (click)="close()">
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">

            <!-- Audio Player -->
            @if (audioUrl()) {
              <section class="rounded-xl border border-blue-500/20 bg-blue-950/30 p-4">
                <div class="flex items-center gap-2 mb-2">
                  <mat-icon class="text-blue-400 text-lg">headphones</mat-icon>
                  <h3 class="text-sm font-semibold text-blue-200">{{ t('modal.player') }}</h3>
                </div>
                <audio [src]="audioUrl()" controls class="w-full"></audio>
              </section>
            }

            <!-- Folder & Tags -->
            <section class="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-indigo-400 text-lg">folder</mat-icon>
                <h3 class="text-sm font-semibold text-indigo-200">{{ t('modal.folderAndTags') }}</h3>
              </div>

              <!-- Folder selector -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-400 w-16 shrink-0">{{ t('modal.folder') }}</label>
                <select class="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 px-2 outline-none focus:border-blue-500/50"
                        [ngModel]="selectedFolderId()"
                        (ngModelChange)="onFolderChange($event)">
                  <option value="">{{ t('modal.noFolder') }}</option>
                  @for (folder of data?.allFolders || []; track folder._id) {
                    <option [value]="folder._id">{{ folder['name'] || folder._id }}</option>
                  }
                </select>
              </div>

              <!-- Tag chips -->
              <div class="flex items-center gap-2 flex-wrap">
                <label class="text-xs text-gray-400 w-16 shrink-0">{{ t('modal.tags') }}</label>
                @for (tag of selectedTags(); track tag._id) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/15 border border-indigo-400/30 text-indigo-200">
                    {{ tag.name }}
                    <button type="button" class="size-4 flex items-center justify-center rounded-full hover:bg-indigo-400/30 transition-colors" (click)="removeTag(tag._id!)">
                      <mat-icon class="text-[12px]">close</mat-icon>
                    </button>
                  </span>
                }
                @if (availableTags().length > 0) {
                  <select class="h-7 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 px-2 outline-none"
                          (change)="onAddTag($event)">
                    <option value="">+ {{ t('modal.addTag') }}</option>
                    @for (tag of availableTags(); track tag._id) {
                      <option [value]="tag._id">{{ tag.name }}</option>
                    }
                  </select>
                }
              </div>
            </section>

            <!-- Transcription -->
            @if (latestTranscription(); as tr) {
              <section class="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-emerald-400 text-lg">description</mat-icon>
                    <h3 class="text-sm font-semibold text-emerald-200">{{ t('modal.transcription') }}</h3>
                  </div>
                  <span class="text-[10px] text-gray-500">ID: {{ tr._id }}</span>
                </div>
                <div class="max-h-48 overflow-y-auto rounded-lg bg-black/20 p-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {{ tr.text }}
                </div>
              </section>
            }

            <!-- Analysis -->
            @if (latestAnalysis(); as a) {
              <section class="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-amber-400 text-lg">psychology</mat-icon>
                    <h3 class="text-sm font-semibold text-amber-200">{{ t('modal.aiAnalysis') }}</h3>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (a.result.sentimiento) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            [class]="sentimentClass(a.result.sentimiento || '')">
                        {{ a.result.sentimiento }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Summary -->
                @if (a.result.resumen) {
                  <div class="max-h-40overflow-y-auto rounded-lg bg-black/20 p-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {{ a.result.resumen }}
                  </div>
                }

                <!-- Themes -->
                @if (a.result.temas && a.result.temas.length > 0) {
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs text-gray-500 mr-1">{{ t('modal.themes') }}</span>
                    @for (tema of a.result.temas; track $index) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 border border-amber-400/25 text-amber-200">
                        {{ tema }}
                      </span>
                    }
                  </div>
                }

                <!-- Actions -->
                @if (a.result.acciones && a.result.acciones.length > 0) {
                  <div class="space-y-1.5">
                    <span class="text-xs text-gray-500">{{ t('modal.actionsCount') }} ({{ a.result.acciones.length }}):</span>
                    @for (accion of a.result.acciones.slice(0, 5); track $index) {
                      <div class="flex items-center gap-2 text-xs">
                        <span class="size-5 flex items-center justify-center rounded text-[9px] font-bold uppercase"
                              [class]="priorityClass(accion.prioridad)">
                          {{ accion.prioridad.charAt(0) || '?' }}
                        </span>
                        <span class="text-gray-300">{{ accion.accion }}</span>
                      </div>
                    }
                    @if (a.result.acciones.length > 5) {
                      <p class="text-[10px] text-gray-500">y {{ a.result.acciones.length - 5 }} más...</p>
                    }
                  </div>
                }
              </section>
            }

            <!-- No data yet -->
            @if (!latestTranscription() && !latestAnalysis()) {
              <div class="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                <mat-icon class="text-4xl text-gray-600 mb-2">mic_none</mat-icon>
                <p class="text-sm text-gray-400">{{ t('modal.noData') }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ t('modal.noDataHint') }}</p>
              </div>
            }
          </div>

          <!-- Footer Actions -->
          <footer class="shrink-0 border-t border-white/10 mv-modal-footer px-6 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <!-- Independent AI actions -->
              @if (latestTranscription(); as tr) {
                @if (!latestAnalysis()) {
                  <button type="button"
                    class="h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                    [disabled]="generatingSummary()"
                    (click)="generateSummary()">
                    <span class="inline-flex items-center gap-1.5">
                      <mat-icon class="text-sm" [class.animate-spin]="generatingSummary()">auto_awesome</mat-icon>
                      {{ generatingSummary() ? t('modal.generating') : t('modal.generateSummary') }}
                    </span>
                  </button>
                }

              }

              <!-- Generate Document (prominent) -->
              @if (latestAnalysis()) {
                <button type="button"
                  class="h-9 px-4 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all"
                  (click)="exportPdf()">
                  <span class="inline-flex items-center gap-1.5">
                    <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                    {{ t('modal.generateDoc') }}
                  </span>
                </button>
              }

              <!-- Spacer -->
              <div class="flex-1"></div>

              <button type="button"
                class="h-9 px-3 rounded-lg border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors"
                (click)="deleteAudio()">
                <span class="inline-flex items-center gap-1"><mat-icon class="text-sm">delete</mat-icon>{{ t('common.delete') }}</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
  `],
})
export class AudioDetailModalComponent implements OnChanges {
  @Input() data: AudioDetailData | null = null;
  @Input() visible = false;
  @Output() action = new EventEmitter<AudioModalAction>();

  private readonly preferences = inject(AppPreferencesService);

  readonly selectedFolderId = signal<string>('');
  readonly selectedTagIds = signal<string[]>([]);
  readonly generatingSummary = signal(false);
  readonly generatingMindmap = signal(false);
  readonly audioUrl = signal<string>('');

  t(key: string): string { return this.preferences.t(key); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.selectedFolderId.set(this.data.audio.folderId || '');
      this.selectedTagIds.set(this.data.audio.tagIds || []);
      this.audioUrl.set(this.resolveAudioUrl(this.data.audio.filePath));
    }
  }

  selectedTags(): Tag[] {
    const ids = this.selectedTagIds();
    return (this.data?.allTags || []).filter((t) => ids.includes(t._id!));
  }

  availableTags(): Tag[] {
    const ids = this.selectedTagIds();
    return (this.data?.allTags || []).filter((t) => t._id && !ids.includes(t._id));
  }

  latestTranscription(): TranscriptionEntity | null {
    const transcriptions = this.data?.transcriptions || [];
    return transcriptions.length > 0 ? transcriptions[0] : null;
  }

  latestAnalysis(): AiAnalysisEntity | null {
    const analyses = this.data?.analyses || [];
    return analyses.length > 0 ? analyses[0] : null;
  }

  close(): void {
    this.action.emit({ type: 'close' });
  }

  onFolderChange(folderId: string): void {
    this.selectedFolderId.set(folderId);
    if (this.data?.audio._id) {
      this.action.emit({ type: 'assignFolder', audioId: this.data.audio._id, folderId: folderId || null });
    }
  }

  onAddTag(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const tagId = select.value;
    if (!tagId) return;
    select.value = '';

    const current = [...this.selectedTagIds()];
    if (!current.includes(tagId)) {
      current.push(tagId);
      this.selectedTagIds.set(current);
      if (this.data?.audio._id) {
        this.action.emit({ type: 'assignTags', audioId: this.data.audio._id, tagIds: current });
      }
    }
  }

  removeTag(tagId: string): void {
    const current = this.selectedTagIds().filter((id) => id !== tagId);
    this.selectedTagIds.set(current);
    if (this.data?.audio._id) {
      this.action.emit({ type: 'assignTags', audioId: this.data.audio._id, tagIds: current });
    }
  }

  generateSummary(): void {
    const t = this.latestTranscription();
    if (!t?._id) return;
    this.generatingSummary.set(true);
    this.action.emit({ type: 'generateSummary', transcriptionId: t._id, text: t.text });
  }

  generateMindmap(): void {
    const t = this.latestTranscription();
    if (!t?._id) return;
    this.generatingMindmap.set(true);
    this.action.emit({ type: 'generateMindmap', transcriptionId: t._id, text: t.text });
  }

  exportPdf(): void {
    this.action.emit({
      type: 'exportPdf',
      audio: this.data!.audio,
      transcription: this.latestTranscription() ?? undefined,
      analysis: this.latestAnalysis() ?? undefined,
    });
  }

  exportWord(): void {
    this.action.emit({
      type: 'exportWord',
      audio: this.data!.audio,
      transcription: this.latestTranscription() ?? undefined,
      analysis: this.latestAnalysis() ?? undefined,
    });
  }

  deleteAudio(): void {
    if (this.data?.audio._id && confirm(this.t('modal.confirmDelete'))) {
      this.action.emit({ type: 'deleteAudio', audioId: this.data.audio._id });
    }
  }

  sentimentClass(sentiment: string): string {
    const s = (sentiment || '').toLowerCase();
    if (s.includes('positiv')) return 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300';
    if (s.includes('negativ')) return 'bg-rose-500/20 border border-rose-400/30 text-rose-300';
    return 'bg-gray-500/20 border border-gray-400/30 text-gray-300';
  }

  priorityClass(priority: string): string {
    const p = (priority || '').toLowerCase();
    if (p.includes('alta') || p === 'high') return 'bg-rose-500/20 text-rose-300';
    if (p.includes('baja') || p === 'low') return 'bg-blue-500/20 text-blue-300';
    return 'bg-amber-500/20 text-amber-300';
  }

  private resolveAudioUrl(filePath: string): string {
    if (!filePath) return '';
    const trimmed = filePath.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
      return trimmed;
    }
    return '';
  }
}
