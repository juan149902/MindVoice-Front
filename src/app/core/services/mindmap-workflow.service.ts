import { Injectable, inject } from '@angular/core';
import { catchError, combineLatest, forkJoin, map, Observable, of, startWith, switchMap, throwError } from 'rxjs';
import { ApiEntity } from '../models/api.models';
import { ResourceApiService } from './resource-api.service';
import { TokenStorageService } from './token-storage.service';

export interface FolderEntity extends ApiEntity {
  _id?: string;
  userId: string;
  name: string;
  parentFolderId?: string | null;
}

export interface DocumentEntity extends ApiEntity {
  _id?: string;
  userId: string;
  folderId: string;
  title: string;
  type?: string;
  content?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MindmapEntity extends ApiEntity {
  _id?: string;
  documentId: string;
  nodes?: Record<string, unknown>;
  updatedAt?: string;
}

export interface MindmapCanvasNodePayload {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  styleClass?: string;
}

export interface MindmapCanvasLinkPayload {
  id: string;
  from: string;
  to: string;
  curveOffsetX: number;
  curveOffsetY: number;
}

export interface MindmapCanvasPayload {
  nodes: MindmapCanvasNodePayload[];
  edges: MindmapCanvasLinkPayload[];
}

export interface MindmapWorkspaceItem {
  mindmap: MindmapEntity;
  document: DocumentEntity | null;
  title: string;
}

interface CreateFolderPayload {
  userId: string;
  name: string;
  parentFolderId: string | null;
}

interface CreateDocumentPayload {
  userId: string;
  folderId: string;
  title: string;
  type: string;
  content: Record<string, unknown>;
}

interface UpdateDocumentPayload {
  userId: string;
  folderId: string;
  title: string;
  type: string;
  content: Record<string, unknown>;
}

interface SaveMindmapPayload {
  documentId: string;
  nodes: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class MindmapWorkflowService {
  private readonly resourceApi = inject(ResourceApiService);
  private readonly tokenStorage = inject(TokenStorageService);

  listWorkspaceItems(): Observable<MindmapWorkspaceItem[]> {
    return forkJoin({
      mindmaps: this.listMindmaps(),
      documents: this.listDocuments(),
    }).pipe(
      map(({ mindmaps, documents }) =>
        this.buildWorkspaceItemsForUser(mindmaps, documents),
      ),
    );
  }

  listWorkspaceItemsProgressive(): Observable<MindmapWorkspaceItem[]> {
    const userId = this.tokenStorage.getUserId();
    if (!userId) {
      return of([]);
    }

    // Each stream catches its own errors so one failure doesn't kill the other.
    const mindmaps$ = this.listMindmaps().pipe(
      catchError((err) => {
        console.error('[MindmapWorkflow] Error loading mindmaps:', err);
        return of([] as MindmapEntity[]);
      }),
      startWith([] as MindmapEntity[]),
    );
    const documents$ = this.listDocuments().pipe(
      catchError((err) => {
        console.error('[MindmapWorkflow] Error loading documents:', err);
        return of([] as DocumentEntity[]);
      }),
      startWith([] as DocumentEntity[]),
    );

    return combineLatest([mindmaps$, documents$]).pipe(
      map(([mindmaps, documents]) =>
        this.buildWorkspaceItemsForUser(mindmaps, documents),
      ),
    );
  }

  private buildWorkspaceItemsForUser(
    mindmaps: MindmapEntity[],
    documents: DocumentEntity[],
  ): MindmapWorkspaceItem[] {
    // The backend already auth-filters by JWT, so every mindmap returned
    // belongs to the current user.  No client-side userId filtering needed.
    return this.mergeWorkspaceItems(mindmaps, documents);
  }

  getWorkspaceItemByMindmapId(mindmapId: string): Observable<MindmapWorkspaceItem> {
    return this.resourceApi.getById<MindmapEntity>('mindmaps', mindmapId).pipe(
      switchMap((mindmap) => {
        if (!mindmap.documentId) {
          return of(this.buildWorkspaceItem(mindmap, null));
        }

        return this.resourceApi.getById<DocumentEntity>('documents', mindmap.documentId).pipe(
          map((document) => this.buildWorkspaceItem(mindmap, document)),
          catchError(() => of(this.buildWorkspaceItem(mindmap, null))),
        );
      }),
    );
  }

  createMindmap(
    title: string,
    initialCanvas: MindmapCanvasPayload,
    documentContent?: Record<string, unknown>,
  ): Observable<MindmapWorkspaceItem> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return throwError(() => new Error('El título del mapa es obligatorio.'));
    }

    const userId = this.requireUserId();

    return this.ensureFolderForUser(userId).pipe(
      switchMap((folder) => {
        if (!folder._id) {
          return throwError(() => new Error('No se pudo resolver un folder válido para crear el mapa.'));
        }

        const documentPayload: CreateDocumentPayload = {
          userId,
          folderId: folder._id,
          title: normalizedTitle,
          type: 'nota',
          content: documentContent ?? {
            source: 'mindmaps-ui',
            createdAt: new Date().toISOString(),
          },
        };

        return this.resourceApi.create<DocumentEntity, CreateDocumentPayload>('documents', documentPayload);
      }),
      switchMap((document) => {
        if (!document._id) {
          return throwError(() => new Error('El backend no devolvió _id del documento.'));
        }

        const mapPayload: SaveMindmapPayload = {
          documentId: document._id,
          nodes: this.toMindmapNodesPayload(initialCanvas),
        };

        return this.resourceApi.create<MindmapEntity, SaveMindmapPayload>('mindmaps', mapPayload).pipe(
          map((mindmap) => this.buildWorkspaceItem(mindmap, document)),
        );
      }),
    );
  }

  createStructuredDocument(
    title: string,
    content: Record<string, unknown>,
    type = 'nota',
  ): Observable<DocumentEntity> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return throwError(() => new Error('El título del documento es obligatorio.'));
    }

    const userId = this.requireUserId();
    const normalizedType = type.trim() || 'nota';

    return this.ensureFolderForUser(userId).pipe(
      switchMap((folder) => {
        if (!folder._id) {
          return throwError(() => new Error('No se pudo resolver un folder válido para crear el documento.'));
        }

        const payload: CreateDocumentPayload = {
          userId,
          folderId: folder._id,
          title: normalizedTitle,
          type: normalizedType,
          content,
        };

        return this.resourceApi.create<DocumentEntity, CreateDocumentPayload>('documents', payload);
      }),
    );
  }

  saveMindmapState(
    mindmapId: string,
    documentId: string,
    canvas: MindmapCanvasPayload,
  ): Observable<MindmapEntity> {
    if (!mindmapId || !documentId) {
      return throwError(() => new Error('MindmapId y documentId son obligatorios para guardar.'));
    }

    const payload: SaveMindmapPayload = {
      documentId,
      nodes: this.toMindmapNodesPayload(canvas),
    };

    return this.resourceApi.update<MindmapEntity, SaveMindmapPayload>('mindmaps', mindmapId, payload);
  }

  updateDocumentStructuredContent(
    documentId: string,
    title: string,
    content: Record<string, unknown>,
  ): Observable<DocumentEntity> {
    const normalizedDocumentId = documentId.trim();
    if (!normalizedDocumentId) {
      return throwError(() => new Error('DocumentId es obligatorio para guardar el documento estructurado.'));
    }

    const normalizedTitle = title.trim() || 'Documento IA';

    return this.resourceApi.getById<DocumentEntity>('documents', normalizedDocumentId).pipe(
      switchMap((document) => {
        if (!document.folderId) {
          return throwError(() => new Error('El documento no contiene folderId.'));
        }

        const payload: UpdateDocumentPayload = {
          userId: document.userId || this.requireUserId(),
          folderId: document.folderId,
          title: normalizedTitle,
          type: document.type?.trim() || 'nota',
          content,
        };

        return this.resourceApi.update<DocumentEntity, UpdateDocumentPayload>(
          'documents',
          normalizedDocumentId,
          payload,
        );
      }),
    );
  }

  deleteMindmap(mindmapId: string): Observable<void> {
    if (!mindmapId?.trim()) {
      return throwError(() => new Error('El ID del mapa mental es obligatorio para eliminar.'));
    }
    return this.resourceApi.remove('mindmaps', mindmapId);
  }

  parseCanvasPayload(raw: unknown): MindmapCanvasPayload {
    if (!raw || typeof raw !== 'object') {
      return { nodes: [], edges: [] };
    }

    const data = raw as Record<string, unknown>;
    const nodesSource = this.toArray(data['nodes']);
    const edgesSource = this.toArray(data['edges']);

    const nodes = nodesSource
      .map((item, index) => this.parseNode(item, index))
      .filter((node): node is MindmapCanvasNodePayload => node !== null);

    const edges = edgesSource
      .map((item, index) => this.parseEdge(item, index))
      .filter((edge): edge is MindmapCanvasLinkPayload => edge !== null);

    return { nodes, edges };
  }

  toMindmapNodesPayload(canvas: MindmapCanvasPayload): Record<string, unknown> {
    return {
      nodes: canvas.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        x: this.safeNumber(node.x, 0),
        y: this.safeNumber(node.y, 0),
        w: this.safeNumber(node.w, 160),
        h: this.safeNumber(node.h, 52),
        styleClass: node.styleClass ?? '',
      })),
      edges: canvas.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        curveOffsetX: this.safeNumber(edge.curveOffsetX, 0),
        curveOffsetY: this.safeNumber(edge.curveOffsetY, 0),
      })),
    };
  }

  private listMindmaps(): Observable<MindmapEntity[]> {
    return this.resourceApi.list<MindmapEntity>('mindmaps');
  }

  private listDocuments(): Observable<DocumentEntity[]> {
    return this.resourceApi.list<DocumentEntity>('documents');
  }

  private ensureFolderForUser(userId: string): Observable<FolderEntity> {
    return this.resourceApi.list<FolderEntity>('folders').pipe(
      map((folders) => folders.filter((folder) => folder.userId === userId)),
      switchMap((userFolders) => {
        if (userFolders.length > 0) {
          const preferred = userFolders.find((folder) =>
            folder.name.trim().toLocaleLowerCase().includes('mapa'),
          );
          return of(preferred ?? userFolders[0]);
        }

        const payload: CreateFolderPayload = {
          userId,
          name: 'Mapas Mentales',
          parentFolderId: null,
        };
        return this.resourceApi.create<FolderEntity, CreateFolderPayload>('folders', payload);
      }),
    );
  }

  private mergeWorkspaceItems(
    mindmaps: MindmapEntity[],
    documents: DocumentEntity[],
  ): MindmapWorkspaceItem[] {
    const documentsById = new Map(
      documents
        .filter((doc) => !!doc._id)
        .map((doc) => [doc._id as string, doc]),
    );

    return [...mindmaps]
      .map((mindmap) => {
        const document = documentsById.get(mindmap.documentId) ?? null;
        return this.buildWorkspaceItem(mindmap, document);
      })
      .sort((first, second) => this.parseDate(second.mindmap.updatedAt) - this.parseDate(first.mindmap.updatedAt));
  }

  private buildWorkspaceItem(
    mindmap: MindmapEntity,
    document: DocumentEntity | null,
  ): MindmapWorkspaceItem {
    return {
      mindmap,
      document,
      title: document?.title?.trim() || `Mapa ${mindmap._id ?? ''}`.trim(),
    };
  }

  private parseNode(value: unknown, index: number): MindmapCanvasNodePayload | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const id = this.safeString(source['id']) || `node-${index + 1}`;
    const label = this.safeString(source['label']) || 'Idea';

    return {
      id,
      label,
      x: this.safeNumber(source['x'], 100),
      y: this.safeNumber(source['y'], 100),
      w: this.safeNumber(source['w'], this.safeNumber(source['width'], 180)),
      h: this.safeNumber(source['h'], this.safeNumber(source['height'], 52)),
      styleClass: this.safeString(source['styleClass']) || undefined,
    };
  }

  private parseEdge(value: unknown, index: number): MindmapCanvasLinkPayload | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const from = this.safeString(source['from'])
      || this.safeString(source['source'])
      || this.safeString(source['fromId'])
      || this.safeString(source['sourceId'])
      || this.safeString(source['fromNodeId']);
    const to = this.safeString(source['to'])
      || this.safeString(source['target'])
      || this.safeString(source['toId'])
      || this.safeString(source['targetId'])
      || this.safeString(source['toNodeId']);
    if (!from || !to) {
      return null;
    }

    return {
      id: this.safeString(source['id']) || `edge-${index + 1}`,
      from,
      to,
      curveOffsetX: this.safeNumber(source['curveOffsetX'], 0),
      curveOffsetY: this.safeNumber(source['curveOffsetY'], 0),
    };
  }

  private toArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>);
    }
    return [];
  }

  private safeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private safeNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private parseDate(dateString: string | undefined): number {
    if (!dateString) {
      return 0;
    }

    const parsed = new Date(dateString).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private requireUserId(): string {
    const userId = this.tokenStorage.getUserId();
    if (!userId) {
      throw new Error('No se encontró userId en el token JWT.');
    }
    return userId;
  }
}
