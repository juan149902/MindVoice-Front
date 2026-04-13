import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
  takeUntil,
  filter,
  startWith,
  merge,
} from 'rxjs';
import { AudioEntity, TranscriptionEntity, AiAnalysisEntity, CreateAudioPayload, CreateTranscriptionPayload, CreateAiAnalysisPayload } from './audio-workflow.service';
import { AudioWorkflowService } from './audio-workflow.service';
import { MindmapWorkflowService, MindmapWorkspaceItem } from './mindmap-workflow.service';
import { WorkflowEventsService } from './workflow-events.service';
import { ResourceApiService } from './resource-api.service';
import { TagsService, Tag } from './tags.service';
import { ApiEntity } from '../models/api.models';

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
  private readonly platformId = inject(PLATFORM_ID);
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
        if (this.initialized) {
          this.refreshAllData();
        }
      });
  }

  ensureInitialized(): void {
    // Only initialize in browser context, not during SSR
    if (isPlatformBrowser(this.platformId) && !this.initialized) {
      this.initialized = true;
      this.refreshAllData();
    }
  }

  refreshAllData(): void {
    // Skip refresh during SSR to avoid 401 errors
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Invalidate all caches before fetching fresh data
    this.audioWorkflow.invalidateAllCaches();

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Load all data in parallel with progressive updates
    // Each source emits independently so UI updates as data arrives
    this.audioWorkflow.listAudios()
      .pipe(
        tap(audios => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, audios: audios || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading audios:', err) });

    this.audioWorkflow.listTranscriptions()
      .pipe(
        tap(transcriptions => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, transcriptions: transcriptions || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading transcriptions:', err) });

    this.audioWorkflow.listAnalyses()
      .pipe(
        tap(analyses => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, analyses: analyses || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading analyses:', err) });

    this.mindmapWorkflow.listWorkspaceItemsProgressive()
      .pipe(
        tap(mindmaps => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, mindmaps: mindmaps || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading mindmaps:', err) });

    this.resourceApi.list('folders')
      .pipe(
        tap(folders => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, folders: folders || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading folders:', err) });

    this.resourceApi.list('documents')
      .pipe(
        tap(documents => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ ...currentState, documents: documents || [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading documents:', err) });

    this.tagsService.loadTags()
      .pipe(
        tap(tags => {
          const currentState = this.stateSubject.getValue();
          this.stateSubject.next({ 
            ...currentState, 
            tags: tags || [],
            lastUpdated: new Date(),
            loading: false,
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ error: (err) => console.error('Error loading tags:', err) });
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

