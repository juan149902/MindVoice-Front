import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap,
  takeUntil,
} from 'rxjs';
import { AudioEntity, TranscriptionEntity, AiAnalysisEntity, CreateAudioPayload, CreateTranscriptionPayload, CreateAiAnalysisPayload, UpdateAudioPayload } from './audio-workflow.service';
import { AudioWorkflowService } from './audio-workflow.service';
import { MindmapWorkflowService, MindmapWorkspaceItem } from './mindmap-workflow.service';
import { WorkflowEventsService } from './workflow-events.service';
import { ResourceApiService } from './resource-api.service';
import { TagsService, Tag } from './tags.service';
import { ApiEntity } from '../models/api.models';
import { TokenStorageService } from './token-storage.service';
import { NotificationService } from './notification.service';

export interface AppState {
  audios: AudioEntity[];
  transcriptions: TranscriptionEntity[];
  analyses: AiAnalysisEntity[];
  mindmaps: MindmapWorkspaceItem[];
  folders: (ApiEntity & { _id?: string })[];
  documents: (ApiEntity & { _id?: string })[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const initialState: AppState = {
  audios: [],
  transcriptions: [],
  analyses: [],
  mindmaps: [],
  folders: [],
  documents: [],
  tags: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

@Injectable({ providedIn: 'root' })
export class StateManagementService {
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly mindmapWorkflow = inject(MindmapWorkflowService);
  private readonly workflowEvents = inject(WorkflowEventsService);
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tagsService = inject(TagsService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notifications = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  private readonly stateSubject = new BehaviorSubject<AppState>(initialState);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly state$ = this.stateSubject.asObservable().pipe(shareReplay(1));
  readonly loading$ = this.loadingSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );
  readonly error$ = this.errorSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );

  readonly audios$: Observable<AudioEntity[]> = this.state$.pipe(
    map((state) => state.audios),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly transcriptions$: Observable<TranscriptionEntity[]> = this.state$.pipe(
    map((state) => state.transcriptions),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly analyses$: Observable<AiAnalysisEntity[]> = this.state$.pipe(
    map((state) => state.analyses),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly mindmaps$: Observable<MindmapWorkspaceItem[]> = this.state$.pipe(
    map((state) => state.mindmaps),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly folders$: Observable<(ApiEntity & { _id?: string })[]> = this.state$.pipe(
    map((state) => state.folders),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly documents$: Observable<(ApiEntity & { _id?: string })[]> = this.state$.pipe(
    map((state) => state.documents),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly tags$: Observable<Tag[]> = this.state$.pipe(
    map((state) => state.tags),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay(1),
  );

  readonly combined$ = combineLatest([
    this.audios$,
    this.transcriptions$,
    this.analyses$,
    this.mindmaps$,
    this.folders$,
    this.documents$,
    this.tags$,
    this.loading$,
  ]).pipe(
    map(([audios, transcriptions, analyses, mindmaps, folders, documents, tags, loading]) => ({
      audios,
      transcriptions,
      analyses,
      mindmaps,
      folders,
      documents,
      tags,
      loading,
    })),
    shareReplay(1),
  );

  private initialized = false;

  constructor() {
    this.initializeDataSync();
  }

  private initializeDataSync(): void {
    // Listen to workflow events and refresh all data on actual changes
    this.workflowEvents.changed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.initialized && this.tokenStorage.getToken()) {
          this.refreshAllData();
        }
      });

    // Trigger initial load automatically for authenticated sessions
    if (isPlatformBrowser(this.platformId) && this.tokenStorage.getToken()) {
      this.initialized = true;
      this.refreshAllData();
    }
  }

  ensureInitialized(): void {
    // Only initialize in browser context, not during SSR
    if (isPlatformBrowser(this.platformId) && !this.initialized && this.tokenStorage.getToken()) {
      this.initialized = true;
      this.refreshAllData();
    }
  }

  refreshAllData(): void {
    // Skip refresh during SSR to avoid 401 errors
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Skip refresh when user is not authenticated
    if (!this.tokenStorage.getToken()) {
      this.loadingSubject.next(false);
      return;
    }

    // Invalidate all caches before fetching fresh data
    this.audioWorkflow.invalidateAllCaches();

    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    let pendingRequests = 7;

    const markCompleted = (label: string): void => {
      pendingRequests -= 1;
      console.log(`[StateManagement] ✅ ${label} completed (${pendingRequests} remaining)`);
      if (pendingRequests <= 0) {
        this.loadingSubject.next(false);
      }
    };

    // Safety timeout: if loading takes >25s, force it to false
    setTimeout(() => {
      if (this.loadingSubject.getValue()) {
        console.warn('[StateManagement] ⚠️ Loading timeout — forcing loading=false');
        this.loadingSubject.next(false);
      }
    }, 25000);

    // Load all data in parallel with progressive updates
    // Each source emits independently so UI updates as data arrives
    this.audioWorkflow.listAudios()
      .pipe(
        tap(audios => {
          console.log(`[StateManagement] Audios loaded: ${audios?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, audios: audios || [] });
        }),
        finalize(() => markCompleted('audios')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading audios:', err);
        }
      });

    this.audioWorkflow.listTranscriptions()
      .pipe(
        tap(transcriptions => {
          console.log(`[StateManagement] Transcriptions loaded: ${transcriptions?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, transcriptions: transcriptions || [] });
        }),
        finalize(() => markCompleted('transcriptions')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading transcriptions:', err);
        }
      });

    this.audioWorkflow.listAnalyses()
      .pipe(
        tap(analyses => {
          console.log(`[StateManagement] Analyses loaded: ${analyses?.length ?? 0}`, analyses?.map(a => a._id));
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, analyses: analyses || [] });
        }),
        finalize(() => markCompleted('analyses')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading analyses:', err);
        }
      });

    this.mindmapWorkflow.listWorkspaceItemsProgressive()
      .pipe(
        tap(mindmaps => {
          console.log(`[StateManagement] Mindmaps loaded: ${mindmaps?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, mindmaps: mindmaps || [] });
        }),
        finalize(() => markCompleted('mindmaps')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading mindmaps:', err);
        }
      });

    this.resourceApi.list('folders')
      .pipe(
        tap(folders => {
          console.log(`[StateManagement] Folders loaded: ${folders?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, folders: folders || [] });
        }),
        finalize(() => markCompleted('folders')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading folders:', err);
        }
      });

    this.resourceApi.list('documents')
      .pipe(
        tap(documents => {
          console.log(`[StateManagement] Documents loaded: ${documents?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, documents: documents || [] });
        }),
        finalize(() => markCompleted('documents')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading documents:', err);
        }
      });

    this.tagsService.loadTags()
      .pipe(
        tap(tags => {
          console.log(`[StateManagement] Tags loaded: ${tags?.length ?? 0}`);
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ 
            ...currentState, 
            tags: tags || [],
            lastUpdated: new Date(),
          });
        }),
        finalize(() => markCompleted('tags')),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('[StateManagement] ❌ Error loading tags:', err);
        }
      });
  }

  // Audio actions
  createAudio(payload: CreateAudioPayload): Observable<AudioEntity> {
    return this.audioWorkflow.createAudio(payload).pipe(
      tap((newAudio) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          audios: [newAudio, ...currentState.audios],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Audio creado correctamente');
      }),
    );
  }

  deleteAudio(id: string): Observable<void> {
    return this.audioWorkflow.deleteAudio(id).pipe(
      tap(() => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          audios: currentState.audios.filter((a) => a._id !== id),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Audio eliminado correctamente');
      }),
    );
  }

  updateAudio(audioId: string, payload: UpdateAudioPayload): Observable<AudioEntity> {
    return this.audioWorkflow.updateAudio(audioId, payload).pipe(
      tap((updated) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          audios: currentState.audios.map((a) => a._id === audioId ? { ...a, ...updated } : a),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Audio actualizado');
      }),
    );
  }

  // Transcription actions
  createTranscription(payload: CreateTranscriptionPayload): Observable<TranscriptionEntity> {
    return this.audioWorkflow.createTranscription(payload).pipe(
      tap((newTranscription) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          transcriptions: [newTranscription, ...currentState.transcriptions],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Transcripción creada');
      }),
    );
  }

  deleteTranscription(id: string): Observable<void> {
    return this.audioWorkflow.deleteTranscription(id).pipe(
      tap(() => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          transcriptions: currentState.transcriptions.filter((t) => t._id !== id),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Transcripción eliminada');
      }),
    );
  }

  // Analysis actions
  createAnalysis(payload: CreateAiAnalysisPayload): Observable<AiAnalysisEntity> {
    return this.audioWorkflow.createAnalysis(payload).pipe(
      tap((newAnalysis) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          analyses: [newAnalysis, ...currentState.analyses],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Análisis IA generado correctamente');
      }),
    );
  }

  deleteAnalysis(id: string): Observable<void> {
    return this.audioWorkflow.deleteAnalysis(id).pipe(
      tap(() => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          analyses: currentState.analyses.filter((a) => a._id !== id),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Análisis eliminado');
      }),
    );
  }

  // Replace operations (DELETE old + CREATE new) — backend has no PUT for these resources
  replaceTranscription(oldId: string, audioId: string, newText: string): Observable<TranscriptionEntity> {
    return this.audioWorkflow.deleteTranscription(oldId).pipe(
      switchMap(() => this.audioWorkflow.createTranscription({ audioId, text: newText })),
      tap((newTranscription) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          transcriptions: [newTranscription, ...currentState.transcriptions.filter((t) => t._id !== oldId)],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Transcripción actualizada');
      }),
    );
  }

  replaceAnalysis(oldId: string, transcriptionId: string, newResult: Record<string, any>): Observable<AiAnalysisEntity> {
    return this.audioWorkflow.deleteAnalysis(oldId).pipe(
      switchMap(() => this.audioWorkflow.createAnalysis({
        transcriptionId,
        result: newResult as any,
      })),
      tap((newAnalysis) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          analyses: [newAnalysis, ...currentState.analyses.filter((a) => a._id !== oldId)],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Análisis actualizado');
      }),
    );
  }

  // Tag actions
  createTag(payload: { name: string }): Observable<Tag> {
    return this.tagsService.createTag(payload).pipe(
      tap((newTag) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          tags: [newTag, ...currentState.tags],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Etiqueta creada');
      }),
    );
  }

  deleteTag(tagId: string): Observable<void> {
    return this.tagsService.deleteTag(tagId).pipe(
      tap(() => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          tags: currentState.tags.filter((t) => t._id !== tagId),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Etiqueta eliminada');
      }),
    );
  }

  // Folder actions
  createFolder(payload: { name: string; parentFolderId?: string | null }): Observable<ApiEntity> {
    return this.resourceApi.create<ApiEntity, Record<string, unknown>>('folders', payload).pipe(
      tap((newFolder) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          folders: [newFolder, ...currentState.folders],
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Carpeta creada');
      }),
    );
  }

  updateFolder(folderId: string, payload: { name?: string; parentFolderId?: string | null }): Observable<ApiEntity> {
    return this.resourceApi.update<ApiEntity, Record<string, unknown>>('folders', folderId, payload).pipe(
      tap((updated) => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          folders: currentState.folders.map((f) => (f._id === folderId ? { ...f, ...updated } : f)),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Carpeta actualizada');
      }),
    );
  }

  deleteFolder(folderId: string): Observable<void> {
    return this.resourceApi.remove('folders', folderId).pipe(
      tap(() => {
        const currentState = this.stateSubject.getValue();
        this.stateSubject.next({
          ...currentState,
          folders: currentState.folders.filter((f) => f._id !== folderId),
          lastUpdated: new Date(),
        });
        this.workflowEvents.notifyChanged();
        this.notifications.success('Carpeta eliminada');
      }),
    );
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

