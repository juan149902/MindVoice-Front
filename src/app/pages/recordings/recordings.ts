import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, OnInit, OnDestroy, signal, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, catchError, combineLatest, firstValueFrom, of, takeUntil } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {
  AnalysisResult,
  AiAnalysisEntity,
  AudioEntity,
  AudioWorkflowService,
  MindvoiceAnalyzeResponse,
  TranscriptionEntity,
  UpdateAudioPayload,
} from '../../core/services/audio-workflow.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { AudioDownloaderService } from '../../core/services/audio-downloader.service';
import { AnalysisArtifactsService } from '../../core/services/analysis-artifacts.service';
import { Tag } from '../../core/services/tags.service';
import { ApiEntity } from '../../core/models/api.models';
import {
  AudioDetailModalComponent,
  AudioDetailData,
  AudioModalAction,
} from '../../shared/components/audio-detail-modal/audio-detail-modal.component';
import {
  DocumentEditorModalComponent,
  DocumentEditorData,
  DocumentEditorSaveEvent,
} from '../../shared/components/document-editor-modal/document-editor-modal.component';
import { NotificationService } from '../../core/services/notification.service';
import { PdfReportService } from '../../core/services/pdf-report.service';
import { AppPreferencesService } from '../../core/services/app-preferences.service';

interface RecordingRow {
  audio: AudioEntity;
  transcriptions: TranscriptionEntity[];
  analyses: AiAnalysisEntity[];
  isAnalyzing?: boolean;
}

@Component({
  selector: 'app-recordings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AudioDetailModalComponent, DocumentEditorModalComponent],
  template: `
    <div class="flex h-full">
      <!-- Folder Sidebar -->
      <aside class="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/10 mv-recordings-sidebar overflow-y-auto">
        <div class="p-4 border-b border-white/10">
          <h3 class="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="text-indigo-400 text-lg">folder</mat-icon>
            {{ t('recordings.folders') }}
          </h3>
        </div>

        <!-- All audios -->
        <button type="button"
          class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
          [class]="!selectedFolderId() ? 'bg-indigo-500/15 text-indigo-200 border-r-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
          (click)="selectFolder(null)">
          <mat-icon class="text-base">all_inbox</mat-icon>
          <span>{{ t('recordings.allAudios') }}</span>
          <span class="ml-auto text-[10px] text-gray-500">{{ audioCount() }}</span>
        </button>

        <!-- Unassigned -->
        <button type="button"
          class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
          [class]="selectedFolderId() === '__none__' ? 'bg-indigo-500/15 text-indigo-200 border-r-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
          (click)="selectFolder('__none__')">
          <mat-icon class="text-base">folder_off</mat-icon>
          <span>{{ t('recordings.noFolder') }}</span>
          <span class="ml-auto text-[10px] text-gray-500">{{ unassignedCount() }}</span>
        </button>

        <!-- Folder list -->
        @for (folder of folders$ | async; track folder._id) {
          <button type="button"
            class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors group"
            [class]="selectedFolderId() === folder._id ? 'bg-indigo-500/15 text-indigo-200 border-r-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
            (click)="selectFolder(folder._id!)">
            <mat-icon class="text-base">folder</mat-icon>
            <span class="truncate flex-1">{{ folder['name'] || folder._id }}</span>
            <span class="text-[10px] text-gray-500">{{ folderAudioCount(folder._id!) }}</span>
          </button>
        }

        <!-- Create folder -->
        <div class="p-3 mt-auto border-t border-white/10">
          <div class="flex gap-2">
            <input type="text" class="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200 px-2 placeholder:text-gray-500 outline-none focus:border-indigo-500/50"
                   [placeholder]="t('recordings.newFolder')"
                   [(ngModel)]="newFolderName"
                   (keydown.enter)="createFolder()"/>
            <button type="button" class="size-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    (click)="createFolder()" [disabled]="!newFolderName.trim()">
              <mat-icon class="text-sm">add</mat-icon>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-6 lg:p-8 max-w-[1250px] mx-auto w-full space-y-5">
          <!-- Hero -->
          <section class="mv-recordings-hero rounded-2xl border border-blue-500/25 p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 class="text-2xl font-black text-white">{{ t('recordings.title') }}</h1>
                <p class="text-gray-400 text-sm">{{ t('recordings.subtitle') }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button type="button"
                  class="h-9 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 border border-emerald-400/30 text-xs font-semibold text-white hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all inline-flex items-center gap-1.5"
                  (click)="triggerUpload()" [disabled]="isUploading">
                  <mat-icon class="text-sm">upload_file</mat-icon>
                  {{ t('recordings.upload') }}
                </button>
                <input #uploadFileInput type="file" accept="audio/*" class="hidden" (change)="onUploadFileSelected($event)" />

                @if (!isRecording && !recordedBlobUrl) {
                  <button type="button"
                    class="h-9 px-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 border border-red-400/30 text-xs font-semibold text-white hover:shadow-[0_0_16px_rgba(239,68,68,0.3)] transition-all inline-flex items-center gap-1.5"
                    (click)="startRecording()">
                    <mat-icon class="text-sm">mic</mat-icon>
                    {{ t('recordings.record') }}
                  </button>
                }

                <button type="button"
                  class="h-9 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/30 text-xs font-semibold text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.3)] transition-all inline-flex items-center gap-1.5"
                  (click)="refreshData()" [disabled]="(loading$ | async)">
                  <mat-icon class="text-sm" [class.animate-spin]="(loading$ | async)">refresh</mat-icon>
                  {{ t('common.reload') }}
                </button>
              </div>
            </div>

            <!-- Recording widget -->
            @if (isRecording) {
              <div class="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 animate-pulse">
                <span class="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                <span class="text-sm text-red-300 font-semibold">{{ t('recordings.recording') }} {{ recordingTime }}s</span>
                <div class="ml-auto flex gap-2">
                  <button type="button"
                    class="h-8 px-3 rounded-lg bg-yellow-600 text-white text-xs font-semibold hover:bg-yellow-700 transition-colors"
                    (click)="stopRecording()">
                    {{ t('recordings.stop') }}
                  </button>
                  <button type="button"
                    class="h-8 px-3 rounded-lg bg-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-600 transition-colors"
                    (click)="cancelRecording()">
                    {{ t('common.cancel') }}
                  </button>
                </div>
              </div>
            }

            @if (recordedBlobUrl) {
              <div class="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <audio [src]="recordedBlobUrl" controls class="flex-1 h-8"></audio>
                <button type="button"
                  class="h-8 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  (click)="uploadRecordedAudio()" [disabled]="isUploading">
                  {{ isUploading ? t('recordings.processing') : t('recordings.analyzeRecording') }}
                </button>
                <button type="button"
                  class="h-8 px-3 rounded-lg border border-gray-600 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                  (click)="cancelRecording()">
                  {{ t('recordings.discard') }}
                </button>
              </div>
            }

            @if (uploadMessage) {
              <div class="p-2.5 rounded-lg text-xs font-medium"
                [class.bg-emerald-500/10]="uploadMessageType === 'success'"
                [class.text-emerald-300]="uploadMessageType === 'success'"
                [class.border-emerald-500/20]="uploadMessageType === 'success'"
                [class.bg-rose-500/10]="uploadMessageType === 'error'"
                [class.text-rose-300]="uploadMessageType === 'error'"
                [class.border-rose-500/20]="uploadMessageType === 'error'"
                class="border">
                {{ uploadMessage }}
              </div>
            }
          </section>

          @if (error$ | async) {
            <section class="rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-500/12 to-rose-500/6 p-3 text-sm text-rose-300">
              {{ error$ | async }}
            </section>
          }

          @if (manualSelectionMessage) {
            <section class="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/12 to-orange-500/6 p-3 text-sm text-amber-200">
              {{ manualSelectionMessage }}
            </section>
          }

          <input #manualAudioInput type="file" accept="audio/*" class="hidden" (change)="onManualAudioSelected($event)" />

          <!-- Filters -->
          <section class="flex flex-wrap items-center gap-3">
            <!-- Tag filter -->
            <div class="flex items-center gap-2">
              <mat-icon class="text-gray-500 text-base">local_offer</mat-icon>
              <select class="h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 px-2 outline-none focus:border-blue-500/50"
                      [(ngModel)]="filterTagId" (ngModelChange)="applyFilters()">
                <option value="">{{ t('recordings.allTags') }}</option>
                @for (tag of tags$ | async; track tag._id) {
                  <option [value]="tag._id">{{ tag.name }}</option>
                }
              </select>
            </div>

            <!-- Search -->
            <div class="relative flex-1 min-w-[180px] max-w-sm">
              <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</mat-icon>
              <input type="text" class="w-full h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200 pl-8 pr-3 outline-none focus:border-blue-500/50 placeholder:text-gray-500"
                     [placeholder]="t('recordings.searchByName')"
                     [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" />
            </div>

            <!-- Mobile folder selector -->
            <div class="lg:hidden flex items-center gap-2">
              <mat-icon class="text-gray-500 text-base">folder</mat-icon>
              <select class="h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 px-2 outline-none"
                      [ngModel]="selectedFolderId()"
                      (ngModelChange)="selectFolder($event)">
                <option value="">{{ t('recordings.allFolders') }}</option>
                <option value="__none__">{{ t('recordings.noFolder') }}</option>
                @for (folder of folders$ | async; track folder._id) {
                  <option [value]="folder._id">{{ folder['name'] || folder._id }}</option>
                }
              </select>
            </div>
          </section>

          <!-- Audio Grid -->
          <section class="space-y-3">
            @let loading = (loading$ | async);
            @let rows = (filteredRows$ | async);

            @if (loading && (!rows || rows.length === 0)) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (i of [1,2,3,4]; track i) {
                  <div class="h-44 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse"></div>
                }
              </div>
            }

            @if (!loading && (!rows || rows.length === 0)) {
              <div class="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <mat-icon class="text-5xl text-gray-600 mb-2">mic_none</mat-icon>
                <p class="text-sm text-gray-400">{{ t('recordings.noRecordings') }}</p>
              </div>
            }

            @if (rows && rows.length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (row of rows; track row.audio._id || $index) {
                  <article class="group mv-recordings-card rounded-xl border border-white/8 hover:border-blue-500/25 p-4 space-y-3 cursor-pointer transition-all duration-200 relative overflow-hidden"
                           (click)="openDetail(row)">
                    <!-- Analyzing overlay -->
                    @if (row.isAnalyzing) {
                      <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background-dark/85 backdrop-blur-sm rounded-xl">
                        <div class="size-10 rounded-full border-3 border-purple-500/30 border-t-purple-400 animate-spin mb-3"></div>
                        <p class="text-xs font-semibold text-purple-300">{{ t('recordings.analyzing') }}</p>
                        <p class="text-[10px] text-gray-500 mt-1">{{ t('recordings.analyzingWait') }}</p>
                      </div>
                    }
                    <!-- Header -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        @if (editingAudioId === row.audio._id) {
                          <input
                            type="text"
                            class="w-full text-sm font-semibold bg-white/5 border border-blue-500/40 rounded-md px-2 py-1 text-white outline-none focus:border-blue-400"
                            [value]="row.audio.title || row.audio.filePath"
                            (click)="$event.stopPropagation()"
                            (keydown.enter)="finishAudioRename(row.audio._id!, $event)"
                            (keydown.escape)="cancelAudioRename()"
                            (blur)="finishAudioRename(row.audio._id!, $event)"
                            #renameInput
                          />
                        } @else {
                          <div class="flex items-center gap-1.5 group/title">
                            <h3 class="text-white font-semibold text-sm truncate group-hover:text-blue-200 transition-colors">
                              {{ row.audio.title || row.audio.filePath }}
                            </h3>
                            <button type="button"
                              class="opacity-0 group-hover/title:opacity-100 size-5 rounded flex items-center justify-center text-gray-500 hover:text-blue-300 hover:bg-white/10 transition-all"
                              [attr.title]="t('recordings.rename')"
                              (click)="startAudioRename($event, row.audio)">
                              <mat-icon class="text-[13px]">edit</mat-icon>
                            </button>
                          </div>
                        }
                        <p class="text-[11px] text-gray-500 mt-0.5">
                          {{ row.audio.duration }}s · {{ row.audio.format || 'wav' }}
                          @if (row.audio.createdAt) {
                            · {{ row.audio.createdAt | date:'shortDate' }}
                          }
                        </p>
                      </div>
                      <div class="flex gap-1.5 shrink-0">
                        <span class="px-2 py-0.5 rounded-full text-[10px] border border-sky-400/25 bg-sky-500/8 text-sky-300">
                          {{ row.transcriptions.length || (row.audio.transcription ? 1 : 0) }} {{ t('recordings.trans') }}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] border border-violet-400/25 bg-violet-500/8 text-violet-300">
                          {{ row.analyses.length }} {{ t('recordings.analysis') }}
                        </span>
                      </div>
                    </div>

                    <!-- Tag chips -->
                    @if (getAudioTagNames(row.audio).length > 0) {
                      <div class="flex flex-wrap gap-1">
                        @for (tagName of getAudioTagNames(row.audio); track tagName) {
                          <span class="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/10 border border-indigo-400/20 text-indigo-300">
                            {{ tagName }}
                          </span>
                        }
                      </div>
                    }

                    <!-- Final Document Preview (Summary) -->
                    @if (getLatestAnalysis(row); as latestAn) {
                      <div class="rounded-lg border border-amber-500/15 bg-amber-950/15 p-3 space-y-2" (click)="$event.stopPropagation()">
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <mat-icon class="text-amber-400 text-sm shrink-0">article</mat-icon>
                            <span class="text-[11px] font-semibold text-amber-200 truncate">
                              {{ $any(latestAn.result)['title'] || t('recordings.finalDoc') }}
                            </span>
                          </div>
                          <div class="flex items-center gap-1 shrink-0">
                            <button type="button"
                              class="h-6 px-2 rounded-md bg-blue-600/80 text-white text-[10px] font-semibold hover:bg-blue-600 transition-colors inline-flex items-center gap-1"
                              (click)="openDocumentEditor(row)">
                              <mat-icon class="text-[12px]">edit</mat-icon>
                              {{ t('common.edit') }}
                            </button>
                            <button type="button"
                              class="h-6 px-2 rounded-md border border-rose-500/30 text-rose-300 text-[10px] font-medium hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1"
                              (click)="quickExportPdf(row)">
                              <mat-icon class="text-[12px]">picture_as_pdf</mat-icon>
                              PDF
                            </button>
                            <button type="button"
                              class="h-6 px-2 rounded-md border border-blue-500/30 text-blue-300 text-[10px] font-medium hover:bg-blue-500/10 transition-colors inline-flex items-center gap-1"
                              (click)="quickExportWord(row)">
                              <mat-icon class="text-[12px]">description</mat-icon>
                              Word
                            </button>
                          </div>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                          {{ $any(latestAn.result)['report_ready_text'] || latestAn.result.resumen || t('recordings.noSummary') }}
                        </p>
                        @if ($any(latestAn.result)['_tags']?.length || $any(latestAn.result)['semantic_keywords']?.length) {
                          <div class="flex flex-wrap gap-1 mt-1">
                            @for (tag of ($any(latestAn.result)['_tags'] || $any(latestAn.result)['semantic_keywords']).slice(0, 5); track tag) {
                              <span class="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/10 border border-violet-400/20 text-violet-300">{{ tag }}</span>
                            }
                          </div>
                        }
                      </div>
                    }

                    <!-- Audio player (click stops propagation) -->
                    @if (isPlayableUrl(row.audio.filePath)) {
                      <audio [src]="getAudioUrl(row.audio.filePath)" controls class="w-full h-8" (click)="$event.stopPropagation()"></audio>
                    }

                    <!-- Quick actions -->
                    <div class="flex flex-wrap gap-2" (click)="$event.stopPropagation()">
                      @if (getLatestAnalysis(row)) {
                        <button type="button"
                          class="h-8 px-3 rounded-lg bg-gradient-to-r from-amber-600/80 to-orange-600/80 text-white text-[11px] font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors"
                          (click)="openDocumentViewer(row)">
                          <span class="inline-flex items-center gap-1"><mat-icon class="text-sm">article</mat-icon>{{ t('recordings.viewDoc') }}</span>
                        </button>
                      } @else if (!row.transcriptions.length && !row.audio.transcription) {
                        <button type="button"
                          class="h-8 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                          (click)="analyzeAudio(row.audio)" [disabled]="row.isAnalyzing">
                          <span class="inline-flex items-center gap-1">
                            <mat-icon class="text-sm" [class.animate-spin]="row.isAnalyzing">psychology</mat-icon>
                            {{ row.isAnalyzing ? t('recordings.analyzingBtn') : t('recordings.analyzeAI') }}
                          </span>
                        </button>
                      } @else {
                        <button type="button"
                          class="h-8 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                          (click)="analyzeAudio(row.audio)" [disabled]="row.isAnalyzing">
                          <span class="inline-flex items-center gap-1">
                            <mat-icon class="text-sm" [class.animate-spin]="row.isAnalyzing">psychology</mat-icon>
                            {{ row.isAnalyzing ? t('recordings.analyzingBtn') : t('recordings.generateAI') }}
                          </span>
                        </button>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <app-audio-detail-modal
      [visible]="modalVisible()"
      [data]="modalData()"
      (action)="onModalAction($event)"
    ></app-audio-detail-modal>

    <!-- Document Editor Modal -->
    <app-document-editor-modal
      [visible]="editorVisible()"
      [data]="editorData()"
      (saveDoc)="onEditorSave($event)"
      (closed)="onEditorClosed()"
    ></app-document-editor-modal>
  `,
})
export class RecordingsComponent implements OnInit, OnDestroy {
  @ViewChild('manualAudioInput') manualAudioInput?: ElementRef<HTMLInputElement>;
  @ViewChild('uploadFileInput') uploadFileInput?: ElementRef<HTMLInputElement>;

  private readonly state = inject(StateManagementService);
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly audioDownloader = inject(AudioDownloaderService);
  private readonly analysisArtifacts = inject(AnalysisArtifactsService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly pdfReport = inject(PdfReportService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly preferences = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  private analyzingAudioIds$ = new BehaviorSubject<Set<string>>(new Set());
  private filterTrigger$ = new BehaviorSubject<void>(undefined);
  private pendingManualAnalysis: { audioId: string; suggestedFileName: string } | null = null;

  loading$ = this.state.loading$;
  error$ = this.state.error$;
  folders$ = this.state.folders$;
  tags$ = this.state.tags$;
  rows$!: Observable<RecordingRow[]>;
  filteredRows$!: Observable<RecordingRow[]>;
  manualSelectionMessage = '';

  // Recording state
  isRecording = false;
  recordingTime = 0;
  recordedBlobUrl: string | null = null;
  private recordedBlob: Blob | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // Upload state
  isUploading = false;
  uploadMessage = '';
  uploadMessageType: 'success' | 'error' | 'info' = 'info';

  // Inline rename state
  editingAudioId: string | null = null;

  // Filters
  readonly selectedFolderId = signal<string | null>(null);
  filterTagId = '';
  searchQuery = '';
  newFolderName = '';

  // Modal
  readonly modalVisible = signal(false);
  readonly modalData = signal<AudioDetailData | null>(null);

  // Document Editor
  @ViewChild(DocumentEditorModalComponent) editorRef?: DocumentEditorModalComponent;
  readonly editorVisible = signal(false);
  readonly editorData = signal<DocumentEditorData | null>(null);

  // Counts
  readonly audioCount = signal(0);
  readonly unassignedCount = signal(0);
  private allRows: RecordingRow[] = [];
  private allAudios: AudioEntity[] = [];
  private allTags: Tag[] = [];
  private allFolders: (ApiEntity & { _id?: string })[] = [];

  t(key: string): string { return this.preferences.t(key); }

  ngOnInit(): void {
    this.state.ensureInitialized();

    const combined$ = combineLatest([
      this.state.audios$,
      this.state.transcriptions$,
      this.state.analyses$,
      this.state.tags$,
      this.state.folders$,
      this.analyzingAudioIds$,
    ]);

    this.rows$ = combined$.pipe(
      map(([audios, transcriptions, analyses, tags, folders, analyzingIds]) => {
        this.allAudios = audios || [];
        this.allTags = tags || [];
        this.allFolders = folders || [];
        this.audioCount.set(this.allAudios.length);
        this.unassignedCount.set(this.allAudios.filter((a) => !a.folderId).length);

        const rows = (audios || []).map((audio: AudioEntity) => {
          const audioTranscriptions = (transcriptions || []).filter((t: TranscriptionEntity) => t.audioId === audio._id);
          const transcriptionIds = new Set(audioTranscriptions.map(t => t._id).filter(Boolean));

          // Link analyses through transcriptions, OR directly if they reference this audio's transcriptions
          const audioAnalyses = (analyses || []).filter((a: AiAnalysisEntity) => {
            // Primary: link through transcriptionId → transcription.audioId
            if (a.transcriptionId && transcriptionIds.has(a.transcriptionId)) {
              return true;
            }
            // Secondary: if analysis has transcriptionId, find that transcription and check its audioId
            if (a.transcriptionId) {
              const trans = (transcriptions || []).find((t: TranscriptionEntity) => t._id === a.transcriptionId);
              return trans?.audioId === audio._id;
            }
            // Tertiary: analysis has no transcriptionId — try matching by result.transcription text vs audio.transcription
            if (!a.transcriptionId && audio.transcription) {
              const raw = a.result as unknown as Record<string, unknown>;
              const resultTranscription = typeof raw?.['transcription'] === 'string'
                ? raw['transcription'].trim()
                : (typeof raw?.['_originalTranscription'] === 'string' ? raw['_originalTranscription'].trim() : '');
              if (resultTranscription && audio.transcription.trim() === resultTranscription) {
                return true;
              }
            }
            return false;
          });

          return {
            audio,
            transcriptions: audioTranscriptions,
            analyses: audioAnalyses,
            isAnalyzing: analyzingIds.has(audio._id || ''),
          };
        });
        this.allRows = rows;
        return rows;
      }),
      startWith([]),
    );

    this.filteredRows$ = combineLatest([
      this.rows$,
      this.filterTrigger$,
    ]).pipe(
      map(() => this.applyFilterLogic()),
    );
  }

  applyFilters(): void {
    this.filterTrigger$.next();
  }

  private applyFilterLogic(): RecordingRow[] {
    let rows = [...this.allRows];

    // Folder filter
    const folderId = this.selectedFolderId();
    if (folderId === '__none__') {
      rows = rows.filter((r) => !r.audio.folderId);
    } else if (folderId) {
      rows = rows.filter((r) => r.audio.folderId === folderId);
    }

    // Tag filter
    if (this.filterTagId) {
      rows = rows.filter((r) => (r.audio.tagIds || []).includes(this.filterTagId));
    }

    // Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      rows = rows.filter((r) =>
        (r.audio.title || '').toLowerCase().includes(q) ||
        (r.audio.filePath || '').toLowerCase().includes(q),
      );
    }

    return rows;
  }

  selectFolder(folderId: string | null): void {
    this.selectedFolderId.set(folderId);
    this.applyFilters();
  }

  folderAudioCount(folderId: string): number {
    return this.allAudios.filter((a) => a.folderId === folderId).length;
  }

  getAudioTagNames(audio: AudioEntity): string[] {
    if (!audio.tagIds || audio.tagIds.length === 0) return [];
    return audio.tagIds
      .map((id) => this.allTags.find((t) => t._id === id)?.name)
      .filter((name): name is string => !!name);
  }

  async createFolder(): Promise<void> {
    const name = this.newFolderName.trim();
    if (!name) return;
    try {
      await firstValueFrom(this.state.createFolder({ name }));
      this.newFolderName = '';
    } catch (e) {
      this.notify.error('Error al crear carpeta');
    }
  }

  // Inline rename
  startAudioRename(event: Event, audio: AudioEntity): void {
    event.stopPropagation();
    this.editingAudioId = audio._id || null;
    this.cdr.markForCheck();
  }

  async finishAudioRename(audioId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const newTitle = input.value.trim();
    this.editingAudioId = null;

    if (!newTitle || !audioId) return;
    try {
      await firstValueFrom(this.state.updateAudio(audioId, { title: newTitle }));
    } catch {
      this.notify.error('Error al renombrar el audio');
    }
  }

  cancelAudioRename(): void {
    this.editingAudioId = null;
  }

  // Modal
  openDetail(row: RecordingRow): void {
    this.modalData.set({
      audio: row.audio,
      transcriptions: row.transcriptions,
      analyses: row.analyses,
      allTags: this.allTags,
      allFolders: this.allFolders,
    });
    this.modalVisible.set(true);
  }

  async onModalAction(action: AudioModalAction): Promise<void> {
    switch (action.type) {
      case 'close':
        this.modalVisible.set(false);
        break;

      case 'assignFolder':
        try {
          await firstValueFrom(this.state.updateAudio(action.audioId, { folderId: action.folderId }));
        } catch (e) { this.notify.error('Error al asignar carpeta'); }
        break;

      case 'assignTags':
        try {
          await firstValueFrom(this.state.updateAudio(action.audioId, { tagIds: action.tagIds }));
        } catch (e) { this.notify.error('Error al asignar etiquetas'); }
        break;

      case 'generateSummary':
        try {
          this.notify.info('Generando resumen IA...');
          const aiResult = await firstValueFrom(
            this.audioWorkflow.analyzeText(
              this.audioWorkflow.buildProfessionalAnalysisPrompt(action.text),
            ).pipe(catchError(() => of({} as MindvoiceAnalyzeResponse))),
          );
          await firstValueFrom(this.state.createAnalysis({
            transcriptionId: action.transcriptionId,
            result: this.buildAnalysisResult(aiResult, {} as MindvoiceAnalyzeResponse),
          }));
          this.state.refreshAllData();
        } catch (e) { this.notify.error('Error al generar resumen'); }
        this.modalVisible.set(false);
        break;

      case 'generateMindmap':
        try {
          this.notify.info('Abriendo editor de mapas mentales...');
          this.router.navigate(['/mind-maps'], { queryParams: { text: action.text.substring(0, 500) } });
        } catch (e) { this.notify.error('Error al abrir mapas mentales'); }
        this.modalVisible.set(false);
        break;

      case 'exportPdf':
        this.exportToPdf(action.audio, action.transcription, action.analysis);
        break;

      case 'exportWord':
        this.exportToWord(action.audio, action.transcription, action.analysis);
        break;

      case 'deleteAudio':
        try {
          await firstValueFrom(this.state.deleteAudio(action.audioId));
          this.modalVisible.set(false);
        } catch (e) { this.notify.error('Error al eliminar audio'); }
        break;

      case 'editTranscription':
        this.editorData.set({
          title: 'Editar Transcripción',
          content: action.transcription.text || '',
          documentType: 'transcription',
          entityId: action.transcription._id!,
          audioId: action.audioId,
        });
        this.editorVisible.set(true);
        break;

      case 'editAnalysis': {
        const modalInfo = this.modalData();
        const transcriptionForEdit = modalInfo?.transcriptions?.length
          ? modalInfo.transcriptions[modalInfo.transcriptions.length - 1]
          : null;
        const structuredContent = this.buildStructuredDocumentHtml(
          action.analysis,
          transcriptionForEdit?.text || '',
        );
        this.editorData.set({
          title: modalInfo?.audio.title || modalInfo?.audio.filePath || 'Editar Resumen de Análisis',
          content: structuredContent,
          documentType: 'analysis-summary',
          entityId: action.analysis._id!,
          transcriptionId: action.analysis.transcriptionId,
          analysisResult: action.analysis.result,
          audioId: modalInfo?.audio._id,
        });
        this.editorVisible.set(true);
        break;
      }
    }
  }

  async onEditorSave(event: DocumentEditorSaveEvent): Promise<void> {
    try {
      if (event.documentType === 'transcription') {
        await firstValueFrom(
          this.state.replaceTranscription(event.entityId, event.audioId!, event.newContent),
        );
      } else if (event.documentType === 'analysis-summary') {
        const updatedResult = { ...(event.analysisResult || {}), resumen: event.newContent };
        await firstValueFrom(
          this.state.replaceAnalysis(event.entityId, event.transcriptionId!, updatedResult),
        );
      }
      this.editorRef?.onSaveComplete();
      this.state.refreshAllData();
    } catch (e) {
      this.editorRef?.onSaveError();
      this.notify.error('Error al guardar los cambios');
    }
  }

  onEditorClosed(): void {
    this.editorVisible.set(false);
    this.editorData.set(null);
  }

  getLatestAnalysis(row: RecordingRow): AiAnalysisEntity | null {
    return row.analyses.length > 0 ? row.analyses[row.analyses.length - 1] : null;
  }

  openDocumentEditor(row: RecordingRow): void {
    const analysis = this.getLatestAnalysis(row);
    if (!analysis) return;

    const transcription = row.transcriptions.length > 0 ? row.transcriptions[row.transcriptions.length - 1] : null;
    const transcriptionText = transcription?.text || row.audio.transcription || '';
    const content = this.buildStructuredDocumentHtml(analysis, transcriptionText);

    this.editorData.set({
      title: row.audio.title || row.audio.filePath || 'Documento',
      content,
      documentType: 'analysis-summary',
      entityId: analysis._id!,
      transcriptionId: analysis.transcriptionId,
      analysisResult: analysis.result,
      audioId: row.audio._id,
    });
    this.editorVisible.set(true);
    this.modalVisible.set(false);
  }

  openDocumentViewer(row: RecordingRow): void {
    const analysis = this.getLatestAnalysis(row);
    if (!analysis) return;

    const transcription = row.transcriptions.length > 0 ? row.transcriptions[row.transcriptions.length - 1] : null;
    const transcriptionText = transcription?.text || row.audio.transcription || '';
    const content = this.buildStructuredDocumentHtml(analysis, transcriptionText);

    this.editorData.set({
      title: row.audio.title || row.audio.filePath || 'Documento',
      content,
      documentType: 'analysis-summary',
      entityId: analysis._id!,
      transcriptionId: analysis.transcriptionId,
      analysisResult: analysis.result,
      audioId: row.audio._id,
      readonly: true,
    });
    this.editorVisible.set(true);
    this.modalVisible.set(false);
  }

  quickExportPdf(row: RecordingRow): void {
    const transcription = row.transcriptions.length > 0 ? row.transcriptions[row.transcriptions.length - 1] : undefined;
    const analysis = this.getLatestAnalysis(row) ?? undefined;
    this.exportToPdf(row.audio, transcription, analysis);
  }

  quickExportWord(row: RecordingRow): void {
    const transcription = row.transcriptions.length > 0 ? row.transcriptions[row.transcriptions.length - 1] : undefined;
    const analysis = this.getLatestAnalysis(row) ?? undefined;
    this.exportToWord(row.audio, transcription, analysis);
  }

  private async exportToPdf(audio: AudioEntity, transcription?: TranscriptionEntity, analysis?: AiAnalysisEntity): Promise<void> {
    if (!analysis) { this.notify.error('No hay análisis disponible para exportar'); return; }
    try {
      await this.pdfReport.exportAnalysisReport(analysis, transcription, audio);
    } catch {
      this.notify.error('Error al exportar PDF');
    }
  }

  private async exportToWord(audio: AudioEntity, transcription?: TranscriptionEntity, analysis?: AiAnalysisEntity): Promise<void> {
    try {
      const docx = await import('docx');
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Packer, ShadingType } = docx;

      const purple = '7C3AED';
      const purpleDark = '6D28D9';
      const slate700 = '334155';
      const slate500 = '64748B';

      const children: any[] = [];

      // Title with purple underline
      children.push(new Paragraph({
        children: [new TextRun({ text: audio.title || audio.filePath || 'Audio', bold: true, size: 36, color: purpleDark })],
        spacing: { after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: purple } },
      }));
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'MindVoice  |  ', size: 18, color: purple, bold: true }),
          new TextRun({ text: `Duracion: ${audio.duration || 0}s  |  Formato: ${(audio.format || 'wav').toUpperCase()}`, size: 18, color: slate500, italics: true }),
        ],
        spacing: { after: 300 },
      }));

      const addSectionHead = (title: string) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 26, color: purpleDark })],
          heading: HeadingLevel.HEADING_1,
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: purple } },
          indent: { left: 120 },
          spacing: { before: 280, after: 120 },
        }));
      };

      // Resumen Ejecutivo
      if (analysis?.result?.resumen) {
        addSectionHead('Resumen Ejecutivo');
        children.push(new Paragraph({
          children: [new TextRun({ text: analysis.result.resumen, size: 22, color: slate700 })],
          spacing: { after: 200 },
        }));
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }, spacing: { after: 200 } }));
      }

      // Temas Clave
      if (analysis?.result?.temas?.length) {
        addSectionHead('Temas Clave');
        for (const tema of analysis.result.temas) {
          children.push(new Paragraph({
            children: [new TextRun({ text: tema, size: 22, color: slate700 })],
            indent: { left: 360 },
            bullet: { level: 0 },
            shading: { type: ShadingType.SOLID, color: 'F3F0FF' },
            spacing: { before: 60, after: 60 },
          }));
        }
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }, spacing: { after: 200 } }));
      }

      // Plan de Accion
      if (analysis?.result?.acciones?.length) {
        addSectionHead('Plan de Accion');
        for (const accion of analysis.result.acciones) {
          const prio = (accion.prioridad || 'media').toLowerCase();
          const prioColor = prio === 'alta' ? 'DC2626' : prio === 'baja' ? '16A34A' : 'D97706';
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `[${(accion.prioridad || 'MEDIA').toUpperCase()}] `, bold: true, size: 20, color: prioColor }),
              new TextRun({ text: accion.accion || '', size: 22, color: slate700 }),
            ],
            indent: { left: 360 },
            spacing: { before: 80, after: 80 },
          }));
        }
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }, spacing: { after: 200 } }));
      }

      // Sentimiento
      if (analysis?.result?.sentimiento) {
        addSectionHead('Sentimiento Detectado');
        children.push(new Paragraph({
          children: [new TextRun({ text: analysis.result.sentimiento, italics: true, size: 22, color: '475569' })],
          shading: { type: ShadingType.SOLID, color: 'F3F0FF' },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: purple } },
          indent: { left: 240 },
          spacing: { after: 200 },
        }));
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }, spacing: { after: 200 } }));
      }

      // Transcripcion
      if (transcription?.text) {
        addSectionHead('Transcripcion Original');
        children.push(new Paragraph({
          children: [new TextRun({ text: transcription.text, italics: true, size: 20, color: slate500 })],
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8' } },
          indent: { left: 240 },
          spacing: { after: 200 },
        }));
      }

      // Footer
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Generado por MindVoice', size: 16, color: purple, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } },
      }));

      const wordDoc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(wordDoc);
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = `${audio.title || 'audio'}-reporte.docx`;
      a.click();
      URL.revokeObjectURL(url);
      this.notify.success('Word exportado correctamente');
    } catch (e) {
      this.notify.error('Error al exportar Word');
    }
  }

  refreshData(): void {
    this.state.refreshAllData();
  }

  ngOnDestroy(): void {
    if (this.isRecording) {
      this.cancelRecording();
    }
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Upload + Auto-Analyze ---

  triggerUpload(): void {
    this.uploadFileInput?.nativeElement.click();
  }

  async onUploadFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.isUploading = true;
    this.uploadMessage = '';
    this.notify.info(`Procesando: ${file.name}…`);
    this.cdr.markForCheck();

    try {
      const audio = await firstValueFrom(this.state.createAudio({
        filePath: file.name,
        duration: 0,
        format: file.type || 'audio/mpeg',
      }));
      if (!audio._id) throw new Error('Audio creado sin ID');
      const { analysis, transcriptionText } = await this.processAudioAnalysis(audio._id, file, file.name);
      this.uploadMessage = 'Audio analizado correctamente';
      this.uploadMessageType = 'success';
      this.notify.success('Audio analizado correctamente');
      this.openEditorForAnalysis(analysis, transcriptionText, audio.title || file.name);
    } catch (err) {
      this.uploadMessage = 'Error al procesar el audio. Intenta de nuevo.';
      this.uploadMessageType = 'error';
      this.notify.error('Error al procesar el audio');
    } finally {
      this.isUploading = false;
      this.cdr.markForCheck();
      setTimeout(() => { this.uploadMessage = ''; this.cdr.markForCheck(); }, 5000);
    }
  }

  // --- Microphone Recording ---

  startRecording(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingChunks = [];
      this.recordingTime = 0;
      this.isRecording = true;
      this.cdr.markForCheck();

      this.mediaRecorder.ondataavailable = (ev: BlobEvent) => {
        this.recordingChunks.push(ev.data);
      };
      this.mediaRecorder.start();

      this.recordingInterval = setInterval(() => {
        this.recordingTime++;
        this.cdr.markForCheck();
      }, 1000);
    }).catch(() => {
      this.notify.error('No se pudo acceder al micrófono');
    });
  }

  stopRecording(): void {
    if (!this.mediaRecorder) return;
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
      this.recordedBlob = blob;
      this.recordedBlobUrl = URL.createObjectURL(blob);
      this.isRecording = false;
      if (this.recordingInterval) clearInterval(this.recordingInterval);
      this.cdr.markForCheck();
    };
    this.mediaRecorder.stop();
    this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.recordedBlobUrl) {
      URL.revokeObjectURL(this.recordedBlobUrl);
    }
    this.isRecording = false;
    this.recordingTime = 0;
    this.recordedBlobUrl = null;
    this.recordedBlob = null;
    if (this.recordingInterval) clearInterval(this.recordingInterval);
  }

  async uploadRecordedAudio(): Promise<void> {
    if (!this.recordedBlob) return;

    const fileName = `grabacion-${Date.now()}.webm`;
    this.isUploading = true;
    this.notify.info('Procesando grabación…');
    this.cdr.markForCheck();

    try {
      const audio = await firstValueFrom(this.state.createAudio({
        filePath: fileName,
        duration: this.recordingTime,
        format: 'audio/webm',
      }));
      if (!audio._id) throw new Error('Audio creado sin ID');
      const { analysis, transcriptionText } = await this.processAudioAnalysis(audio._id, this.recordedBlob, fileName);
      this.notify.success('Grabación analizada correctamente');
      if (this.recordedBlobUrl) URL.revokeObjectURL(this.recordedBlobUrl);
      this.recordedBlobUrl = null;
      this.recordedBlob = null;
      this.recordingTime = 0;
      this.openEditorForAnalysis(analysis, transcriptionText, audio.title || fileName);
    } catch {
      this.notify.error('Error al procesar la grabación');
    } finally {
      this.isUploading = false;
      this.cdr.markForCheck();
    }
  }

  async analyzeAudio(audio: AudioEntity): Promise<void> {
    if (!audio._id || !audio.filePath) return;

    const audioId = audio._id;
    this.setAnalyzingStatus(audioId, true);

    if (this.requiresLocalFileSelection(audio.filePath)) {
      const reused = await this.tryAnalyzeFromExistingTranscription(audioId);
      if (reused) {
        this.setAnalyzingStatus(audioId, false);
        return;
      }
      this.requestManualAudioSelection(audioId, audio.filePath);
      this.setAnalyzingStatus(audioId, false);
      return;
    }

    try {
      const audioBlob = await this.audioDownloader.downloadAudioBlobPromise(audio.filePath);
      const fileName = audio.filePath.split('/').pop() || 'audio.wav';
      this.manualSelectionMessage = '';
      await this.processAudioAnalysis(audioId, audioBlob, fileName);
    } catch (error) {
      if (this.isDownloadFailure(error)) {
        const reused = await this.tryAnalyzeFromExistingTranscription(audioId);
        if (!reused) {
          this.requestManualAudioSelection(audioId, audio.filePath);
        }
      } else {
        this.manualSelectionMessage = this.resolveAudioAnalyzeErrorMessage(error, false);
      }
    } finally {
      this.setAnalyzingStatus(audioId, false);
    }
  }

  async onManualAudioSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    const pending = this.pendingManualAnalysis;
    this.pendingManualAnalysis = null;

    if (!pending || !selectedFile) {
      this.manualSelectionMessage = '';
      return;
    }

    this.setAnalyzingStatus(pending.audioId, true);
    try {
      this.manualSelectionMessage = '';
      await this.processAudioAnalysis(pending.audioId, selectedFile, selectedFile.name || pending.suggestedFileName);
    } catch (error) {
      this.manualSelectionMessage = this.resolveAudioAnalyzeErrorMessage(error, true);
    } finally {
      this.setAnalyzingStatus(pending.audioId, false);
      input.value = '';
    }
  }

  isPlayableUrl(filePath: string): boolean {
    if (!filePath) return false;
    const trimmed = filePath.trim();
    return trimmed.startsWith('http://')
      || trimmed.startsWith('https://')
      || trimmed.startsWith('blob:')
      || trimmed.startsWith('data:')
      || trimmed.startsWith('/');
  }

  getAudioUrl(filePath: string): string {
    return this.audioDownloader.resolveAudioCandidates(filePath)[0] ?? this.audioDownloader.resolveAudioUrl(filePath);
  }

  private async processAudioAnalysis(audioId: string, audioBlob: Blob, fileName: string): Promise<{ analysis: AiAnalysisEntity; transcriptionText: string }> {
    // Single AI call: backend transcribes + analyzes the audio
    const rawAiResult = await firstValueFrom(this.audioWorkflow.analyzeAudio(audioBlob, fileName));
    const transcriptionText = this.audioWorkflow.extractTranscriptionText(rawAiResult) || `Transcripción automática de ${fileName}`;

    // Only use a second AI call when the backend result is incomplete (saves tokens)
    let finalResult = rawAiResult;
    if (this.isAnalysisIncomplete(rawAiResult)) {
      const structuredPrompt = this.audioWorkflow.buildProfessionalAnalysisPrompt(transcriptionText);
      finalResult = await firstValueFrom(
        this.audioWorkflow.analyzeText(structuredPrompt).pipe(
          catchError(() => of(rawAiResult)),
        ),
      );
    }

    const transcription = await firstValueFrom(this.state.createTranscription({
      audioId,
      text: transcriptionText,
      timestamps: [],
    }));

    if (!transcription._id) {
      throw new Error('No se pudo crear la transcripción para el audio.');
    }

    const analysis = await firstValueFrom(this.state.createAnalysis({
      transcriptionId: transcription._id,
      result: this.buildAnalysisResult(finalResult, rawAiResult),
    }));

    await firstValueFrom(this.analysisArtifacts.createProfessionalArtifacts({
      audioId,
      audioFileName: fileName,
      transcriptionId: transcription._id,
      transcriptionText,
      analysis,
    }));

    this.state.refreshAllData();
    return { analysis, transcriptionText };
  }

  private isAnalysisIncomplete(result: MindvoiceAnalyzeResponse): boolean {
    const hasSummary = !!(result.executive_summary?.length || result.report_ready_text?.trim());
    const hasTasks = !!(result.task_list?.length);
    // Incomplete if missing both summary AND tasks
    return !hasSummary && !hasTasks;
  }

  private buildAnalysisResult(aiResult: MindvoiceAnalyzeResponse, fallback: MindvoiceAnalyzeResponse): AnalysisResult {
    const summary = aiResult.executive_summary?.join('\n\n')
      || aiResult.report_ready_text
      || fallback.executive_summary?.join('\n\n')
      || fallback.report_ready_text
      || 'Analisis generado';
    const themes = (aiResult.tags && aiResult.tags.length > 0) ? aiResult.tags : (fallback.tags || []);
    const tasks = (aiResult.task_list && aiResult.task_list.length > 0) ? aiResult.task_list : (fallback.task_list || []);
    const sentiment = aiResult.sentiment || fallback.sentiment;

    return {
      resumen: summary,
      temas: themes,
      acciones: tasks.map((task) => ({
        accion: task.task || '',
        prioridad: task.priority || 'media',
      })).filter((item) => item.accion.trim().length > 0),
      sentimiento: sentiment,
    };
  }

  private openEditorForAnalysis(analysis: AiAnalysisEntity, transcriptionText: string, title: string): void {
    const content = this.buildStructuredDocumentHtml(analysis, transcriptionText);

    this.editorData.set({
      title,
      content,
      documentType: 'analysis-summary',
      entityId: analysis._id!,
      transcriptionId: analysis.transcriptionId,
      analysisResult: analysis.result,
    });
    this.editorVisible.set(true);
    this.cdr.markForCheck();
  }

  private buildStructuredDocumentHtml(analysis: AiAnalysisEntity, transcriptionText: string): string {
    const sections: string[] = [];
    const r = analysis.result as Record<string, any>;

    // Title
    if (r?.['title']) {
      sections.push(
        `<h1 style="font-size:26px;font-weight:800;color:#0f172a;border-bottom:3px solid #6366f1;padding-bottom:10px;margin-bottom:16px;">${r['title']}</h1>`,
      );
    }

    // Report ready text (resumen ejecutivo conciso)
    if (r?.['report_ready_text']) {
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:20px 0 10px;">📋 Reporte</h2>`
        + `<p style="margin:0 0 16px;line-height:1.8;padding:12px 16px;background:#f0f9ff;border-left:4px solid #3b82f6;border-radius:4px;">${r['report_ready_text']}</p>`,
      );
    }

    // Executive summary (detailed paragraphs)
    if (Array.isArray(r?.['executive_summary']) && r['executive_summary'].length > 0) {
      const paragraphs = r['executive_summary']
        .filter((s: string) => typeof s === 'string' && s.trim())
        .map((s: string) => `<p style="margin:0 0 10px;line-height:1.8;">${s}</p>`)
        .join('');
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">📊 Resumen Ejecutivo</h2>`
        + paragraphs,
      );
    } else if (r?.['resumen'] && !r?.['report_ready_text']) {
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">📊 Resumen</h2>`
        + `<p style="margin:0 0 16px;line-height:1.8;">${r['resumen']}</p>`,
      );
    }

    // Key insights
    if (Array.isArray(r?.['key_insights']) && r['key_insights'].length > 0) {
      const items = r['key_insights']
        .filter((s: string) => typeof s === 'string' && s.trim())
        .map((s: string) => `<li style="margin:8px 0;padding:4px 0;line-height:1.6;">💡 ${s}</li>`)
        .join('');
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🔍 Ideas Clave</h2>`
        + `<ul style="padding-left:24px;margin:0 0 16px;list-style:none;">${items}</ul>`,
      );
    }

    // Task list (acciones)
    const taskList = Array.isArray(r?.['task_list']) ? r['task_list'] : [];
    const acciones = Array.isArray(r?.['acciones']) ? r['acciones'] : [];
    const tasks = taskList.length > 0 ? taskList : acciones;
    if (tasks.length > 0) {
      const items = tasks.map((a: any) => {
        const taskText = a.task || a.accion || '';
        const priority = (a.priority || a.prioridad || 'media').toLowerCase();
        const color = priority === 'alta' ? '#dc2626' : priority === 'baja' ? '#16a34a' : '#d97706';
        const emoji = priority === 'alta' ? '🔴' : priority === 'baja' ? '🟢' : '🟡';
        return `<li style="margin:8px 0;padding:8px 12px;background:#fefce8;border-radius:6px;border-left:4px solid ${color};">` +
          `${emoji} <strong style="color:${color};text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">[${priority}]</strong> ` +
          `${taskText}</li>`;
      }).filter((s: string) => s.includes(']</strong> ') && !s.endsWith(']</strong> </li>')).join('');
      if (items) {
        sections.push(
          `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">✅ Plan de Acción</h2>`
          + `<ul style="padding-left:0;margin:0 0 16px;list-style:none;">${items}</ul>`,
        );
      }
    }

    // Sentiment
    if (r?.['sentimiento']) {
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🎭 Sentimiento Detectado</h2>`
        + `<p style="margin:0 0 16px;padding:12px 16px;background:#f1f5f9;border-left:4px solid #6366f1;border-radius:4px;font-style:italic;">`
        + `${r['sentimiento']}</p>`,
      );
    }

    // Tags & semantic keywords
    const allTags = [...new Set([
      ...(Array.isArray(r?.['_tags']) ? r['_tags'] : []),
      ...(Array.isArray(r?.['semantic_keywords']) ? r['semantic_keywords'] : []),
    ])].filter((t: string) => typeof t === 'string' && t.trim());
    if (allTags.length > 0) {
      const chips = allTags.map((t: string) =>
        `<span style="display:inline-block;margin:3px 4px;padding:4px 12px;background:#eef2ff;color:#4338ca;border-radius:20px;font-size:12px;border:1px solid #c7d2fe;">${t}</span>`,
      ).join('');
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🏷️ Etiquetas y Palabras Clave</h2>`
        + `<div style="margin:0 0 16px;">${chips}</div>`,
      );
    }

    // Mind map nodes (as visual tree)
    if (Array.isArray(r?.['mind_map_nodes']) && r['mind_map_nodes'].length > 0) {
      const nodesHtml = this.buildMindMapTreeHtml(r['mind_map_nodes']);
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🧠 Mapa Mental</h2>`
        + nodesHtml,
      );
    }

    // Transcription with timestamps
    const timestamps = Array.isArray(r?.['transcription_with_timestamps']) ? r['transcription_with_timestamps'] : [];
    if (timestamps.length > 0) {
      const rows = timestamps.map((ts: any) =>
        `<tr>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#6366f1;font-family:monospace;font-size:12px;white-space:nowrap;">${ts.start || ''} → ${ts.end || ''}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${ts.text || ''}</td>` +
        `</tr>`,
      ).join('');
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🎙️ Transcripción con Tiempos</h2>`
        + `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">`
        + `<thead><tr><th style="text-align:left;padding:8px 10px;border-bottom:2px solid #cbd5e1;font-size:12px;color:#64748b;">Tiempo</th>`
        + `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #cbd5e1;font-size:12px;color:#64748b;">Texto</th></tr></thead>`
        + `<tbody>${rows}</tbody></table>`,
      );
    } else if (transcriptionText) {
      sections.push(
        `<h2 style="font-size:20px;font-weight:600;color:#1e293b;margin:24px 0 10px;">🎙️ Transcripción Original</h2>`
        + `<blockquote style="border-left:3px solid #94a3b8;padding-left:16px;color:#475569;font-style:italic;margin:0 0 16px;">`
        + `${transcriptionText}</blockquote>`,
      );
    }

    return sections.join('\n<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">\n');
  }

  private buildMindMapTreeHtml(nodes: { id: string; label: string; parentId: string | null }[]): string {
    const rootNodes = nodes.filter(n => !n.parentId);
    if (rootNodes.length === 0) return '';

    const buildChildren = (parentId: string, depth: number): string => {
      const children = nodes.filter(n => n.parentId === parentId);
      if (children.length === 0) return '';
      const items = children.map(child => {
        const indent = depth * 16;
        const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
        const color = colors[Math.min(depth, colors.length - 1)];
        const childContent = buildChildren(child.id, depth + 1);
        return `<div style="margin-left:${indent}px;padding:6px 0;">`
          + `<span style="display:inline-block;padding:4px 12px;background:${color}15;color:${color};border-radius:8px;font-size:13px;border:1px solid ${color}40;font-weight:500;">`
          + `${child.label}</span>`
          + childContent
          + `</div>`;
      }).join('');
      return items;
    };

    return rootNodes.map(root => {
      const childContent = buildChildren(root.id, 1);
      return `<div style="padding:12px 16px;background:#fafafa;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 16px;">`
        + `<div style="padding:6px 0;"><span style="display:inline-block;padding:6px 16px;background:#6366f115;color:#6366f1;border-radius:8px;font-size:14px;font-weight:700;border:2px solid #6366f140;">`
        + `🧠 ${root.label}</span></div>`
        + childContent
        + `</div>`;
    }).join('');
  }

  private setAnalyzingStatus(audioId: string, isAnalyzing: boolean): void {
    const current = new Set(this.analyzingAudioIds$.value);
    if (isAnalyzing) {
      current.add(audioId);
    } else {
      current.delete(audioId);
    }
    this.analyzingAudioIds$.next(current);
  }

  private requestManualAudioSelection(audioId: string, filePath: string): void {
    this.pendingManualAnalysis = {
      audioId,
      suggestedFileName: filePath.split('/').pop() || 'audio.wav',
    };
    this.manualSelectionMessage = 'No se encontró el archivo en el servidor. Selecciona el audio local para analizarlo.';
    const input = this.manualAudioInput?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  private requiresLocalFileSelection(filePath: string): boolean {
    const trimmed = filePath.trim().toLowerCase();
    if (!trimmed) return true;
    return !trimmed.startsWith('http://')
      && !trimmed.startsWith('https://')
      && !trimmed.startsWith('/')
      && !trimmed.startsWith('blob:')
      && !trimmed.startsWith('data:');
  }

  private isDownloadFailure(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    return error.status === 404 || error.status === 401 || error.status === 0;
  }

  private resolveAudioAnalyzeErrorMessage(error: unknown, fromManualSelection: boolean): string {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'El análisis tardó demasiado. El servidor de IA sigue procesando; vuelve a intentar en un momento.';
    }

    const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    const message = rawMessage.toLowerCase();

    if (message.includes('ai_api_key_missing')) {
      return 'Falta configurar la API key de IA.';
    }
    if (message.includes('openrouter_api_key_invalid') || message.includes('invalid api key')) {
      return 'La API key es inválida. Actualiza la configuración.';
    }
    if (message.includes('quota') || message.includes('rate limit') || message.includes('billing')) {
      return 'Sin cuota de IA disponible. Activa facturación o usa otra API key.';
    }
    if (fromManualSelection) {
      return 'No se pudo analizar el archivo seleccionado. Verifica el formato e intenta de nuevo.';
    }
    return 'No se pudo analizar este audio. Intenta de nuevo en unos segundos.';
  }

  private async tryAnalyzeFromExistingTranscription(audioId: string): Promise<boolean> {
    const transcriptions = await firstValueFrom(this.state.transcriptions$);
    const analyses = await firstValueFrom(this.state.analyses$);

    const candidates = (transcriptions || [])
      .filter((item) => item.audioId === audioId && !!item._id && item.text.trim().length > 0)
      .sort((a, b) => {
        const first = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const second = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return second - first;
      });

    const latest = candidates[0];
    if (!latest?._id) return false;

    const alreadyAnalyzed = (analyses || []).some((analysis) => analysis.transcriptionId === latest._id);
    if (alreadyAnalyzed) {
      this.manualSelectionMessage = 'Ya existe un análisis IA para este audio.';
      return true;
    }

    await firstValueFrom(this.audioWorkflow.generateAndSaveAnalysis({ _id: latest._id, text: latest.text }));
    this.state.refreshAllData();
    this.manualSelectionMessage = 'Se reutilizó la transcripción para generar el análisis IA.';
    return true;
  }
}
