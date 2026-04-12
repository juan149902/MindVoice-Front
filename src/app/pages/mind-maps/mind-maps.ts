import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom, Subject, takeUntil, switchMap, of } from 'rxjs';
import {
  MindmapCanvasLinkPayload,
  MindmapCanvasNodePayload,
  MindmapCanvasPayload,
  MindmapWorkflowService,
  MindmapWorkspaceItem,
} from '../../core/services/mindmap-workflow.service';
import { MindmapSocketService, SocketConnectionStatus } from '../../core/services/mindmap-socket.service';
import { SocketMindmapUpdatedEvent } from '../../core/models/socket.models';
import { TokenStorageService } from '../../core/services/token-storage.service';

interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  styleClass: string;
}

interface MindMapLink {
  id: string;
  from: string;
  to: string;
  curveOffsetX: number;
  curveOffsetY: number;
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-mind-maps',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  styles: [`
    .node-enter {
      animation: nodeIn 0.18s ease-out forwards;
    }
    @keyframes nodeIn {
      from { opacity: 0; transform: translate(var(--nx), var(--ny)) scale(0.9); }
      to { opacity: 1; transform: translate(var(--nx), var(--ny)) scale(1); }
    }
    .canvas-dot-grid {
      background-image: radial-gradient(circle, rgba(124,58,237,0.16) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .canvas-glow::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 45%),
                  radial-gradient(circle at 80% 80%, rgba(14,165,233,0.14), transparent 42%);
    }
  `],
  template: `
    <div class="p-6 max-w-[1500px] mx-auto w-full space-y-4">
      <section class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">MindVoice Graph Studio</p>
          <h1 class="text-3xl font-black text-white">Mapas mentales premium</h1>
          <p class="text-gray-400">
            Estructura profesional, colaboración en tiempo real y guardado inteligente.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-200 hover:bg-border-dark/70 transition-colors disabled:opacity-50"
            (click)="reloadWorkspace()"
            [disabled]="workspaceLoading || creatingMap || saving"
          >
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg" [class.animate-spin]="workspaceLoading">refresh</mat-icon>
              Recargar
            </span>
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
            [disabled]="!currentMap || saving || guestSessionMode"
            (click)="saveNow()"
          >
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg" [class.animate-spin]="saving">save</mat-icon>
              Guardar ahora
            </span>
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-lg border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50"
            [disabled]="!shareUrl"
            (click)="copyShareLink()"
          >
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg">share</mat-icon>
              Copiar link
            </span>
          </button>
        </div>
      </section>

      @if (errorMessage) {
        <section class="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">
          {{ errorMessage }}
        </section>
      }

      @if (successMessage) {
        <section class="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {{ successMessage }}
        </section>
      }

      @if (infoMessage) {
        <section class="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4 text-sm text-sky-200">
          {{ infoMessage }}
        </section>
      }

      <div class="grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-4">
        <aside class="rounded-2xl border border-white/10 bg-surface-dark/85 backdrop-blur-sm p-4 space-y-4 h-fit shadow-[0_20px_50px_rgba(15,23,42,0.45)]">
          <div>
            <h2 class="text-white font-bold">Tus mapas</h2>
            <p class="text-xs text-gray-500 mt-1">Crea uno nuevo o abre un mapa compartido.</p>
          </div>

          <div class="space-y-2">
            <label for="new-map-title" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Nuevo mapa
            </label>
            <input
              id="new-map-title"
              type="text"
              [(ngModel)]="newMapTitle"
              [disabled]="creatingMap || workspaceLoading || !isAuthenticated"
              class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100"
              placeholder="Ej. Planeación semanal"
            />
            <button
              type="button"
              class="w-full h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-60"
              [disabled]="creatingMap || workspaceLoading || !isAuthenticated"
              (click)="createMap()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-icon class="text-lg" [class.animate-spin]="creatingMap">add_circle</mat-icon>
                {{ creatingMap ? 'Creando...' : 'Crear mapa' }}
              </span>
            </button>
          </div>

          <div class="space-y-2 max-h-[550px] overflow-auto pr-1">
            @if (workspaceLoading) {
              <p class="text-sm text-gray-400">Cargando mapas...</p>
            }
            @if (!workspaceLoading && workspaceMaps.length === 0) {
              <p class="text-sm text-gray-400">
                No hay mapas aún. Crea el primero.
              </p>
            }

            @for (item of workspaceMaps; track item.mindmap._id || item.mindmap.documentId) {
              <button
                type="button"
                (click)="openMap(item)"
                class="w-full text-left rounded-lg border px-3 py-2 transition-colors"
                [ngClass]="item.mindmap._id === currentMap?.mindmap?._id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border-dark text-gray-200 hover:bg-border-dark/50'"
              >
                <p class="text-sm font-semibold truncate">{{ item.title }}</p>
                <p class="text-xs mt-1 text-gray-500">
                  {{ shortId(item.mindmap._id) }} · {{ formatDate(item.mindmap.updatedAt) }}
                </p>
              </button>
            }
          </div>

          @if (!isAuthenticated) {
            <p class="text-xs text-amber-300">
              Modo invitado: puedes colaborar por link, pero crear/guardar en BD requiere cuenta.
            </p>
          }
        </aside>

        <section class="rounded-2xl border border-white/10 bg-surface-dark/85 backdrop-blur-sm p-4 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.45)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wider text-primary font-semibold">Sesión activa</p>
              <h2 class="text-white text-2xl font-black">{{ currentMap?.title || 'Sin mapa seleccionado' }}</h2>
              <p class="text-xs text-gray-500 mt-1">
                {{ currentMap?.mindmap?._id ? ('ID: ' + currentMap?.mindmap?._id) : 'Crea o selecciona un mapa.' }}
              </p>
              @if (currentSourceAudioId) {
                <p class="text-xs text-gray-400 mt-1">
                  Audio origen: {{ currentSourceAudioId }}
                </p>
              }
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold border"
                [ngClass]="{
                  'border-emerald-400/40 bg-emerald-500/10 text-emerald-300': socketStatus === 'connected',
                  'border-amber-400/40 bg-amber-500/10 text-amber-300': socketStatus === 'connecting',
                  'border-rose-400/40 bg-rose-500/10 text-rose-300': socketStatus === 'error',
                  'border-gray-500/40 bg-gray-500/10 text-gray-300': socketStatus === 'disconnected'
                }"
              >
                Socket: {{ getSocketLabel(socketStatus) }}
              </span>

              <span class="px-2.5 py-1 rounded-full text-xs font-semibold border"
                [ngClass]="hasUnsavedChanges
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'"
              >
                {{ hasUnsavedChanges ? 'Cambios pendientes' : 'Sincronizado' }}
              </span>

              @if (guestSessionMode) {
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold border border-sky-400/40 bg-sky-500/10 text-sky-200">
                  Invitado (sin guardado BD)
                </span>
              }
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
              [disabled]="!currentMap"
              (click)="addNode()"
            >
              <span class="inline-flex items-center gap-1">
                <mat-icon class="text-[18px]">add</mat-icon>
                Nuevo nodo
              </span>
            </button>

            <button
              type="button"
              class="h-9 px-3 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50"
              [disabled]="!currentMap"
              [ngClass]="linkCreationMode
                ? 'border-primary/40 text-primary bg-primary/10'
                : 'border-border-dark text-gray-200 hover:bg-border-dark/60'"
              (click)="toggleLinkMode()"
            >
              <span class="inline-flex items-center gap-1">
                <mat-icon class="text-[18px]">device_hub</mat-icon>
                {{ linkCreationMode ? 'Cancelar conexión' : 'Conectar nodos' }}
              </span>
            </button>

            <button
              type="button"
              class="h-9 px-3 rounded-lg border border-border-dark text-sm font-semibold text-gray-200 hover:bg-border-dark/60 transition-colors disabled:opacity-50"
              [disabled]="!currentMap || nodes.length < 2"
              (click)="autoArrangeCanvas()"
            >
              <span class="inline-flex items-center gap-1">
                <mat-icon class="text-[18px]">auto_fix_high</mat-icon>
                Auto ordenar
              </span>
            </button>

            <button
              type="button"
              class="h-9 px-3 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 transition-colors disabled:opacity-50"
              [disabled]="!selectedNodeId || selectedNodeId === ROOT_NODE_ID"
              (click)="deleteSelectedNode()"
            >
              <span class="inline-flex items-center gap-1">
                <mat-icon class="text-[18px]">delete</mat-icon>
                Borrar nodo
              </span>
            </button>

            <button
              type="button"
              class="h-9 px-3 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 transition-colors disabled:opacity-50"
              [disabled]="!selectedLinkId"
              (click)="deleteSelectedLink()"
            >
              <span class="inline-flex items-center gap-1">
                <mat-icon class="text-[18px]">linear_scale</mat-icon>
                Borrar línea
              </span>
            </button>
          </div>

          <div
            #canvasRef
            class="relative h-[520px] rounded-xl border border-border-dark bg-background-dark/70 canvas-dot-grid canvas-glow overflow-hidden select-none"
            [ngClass]="linkCreationMode ? 'cursor-crosshair' : 'cursor-default'"
            (click)="onCanvasClick()"
            (keydown.enter)="onCanvasClick()"
            (keydown.space)="onCanvasClick()"
            tabindex="0"
          >
            <svg [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight" class="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="mm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed" opacity="0.75"></path>
                </marker>
                <marker id="mm-arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#c4b5fd"></path>
                </marker>
              </defs>

              @for (link of links; track link.id) {
                <g>
                <path
                  [attr.d]="getLinkPath(link)"
                  [attr.stroke]="selectedLinkId === link.id ? '#c4b5fd' : '#7c3aed'"
                  [attr.stroke-width]="selectedLinkId === link.id ? 2.5 : 1.8"
                  [attr.marker-end]="selectedLinkId === link.id ? 'url(#mm-arrow-selected)' : 'url(#mm-arrow)'"
                  stroke-opacity="0.9"
                  fill="none"
                  stroke-linecap="round"
                ></path>

                <path
                  [attr.d]="getLinkPath(link)"
                  stroke="transparent"
                  stroke-width="16"
                  fill="none"
                  class="cursor-pointer pointer-events-all"
                  (pointerdown)="selectLink($event, link.id)"
                ></path>

                  @if (selectedLinkId === link.id) {
                    <circle
                      [attr.cx]="getLinkControlPoint(link).x"
                      [attr.cy]="getLinkControlPoint(link).y"
                      r="7"
                      fill="rgba(31,21,51,0.95)"
                      stroke="#a78bfa"
                      stroke-width="1.5"
                      class="cursor-move pointer-events-all"
                      (pointerdown)="startLinkAdjust($event, link.id)"
                    ></circle>
                  }
                </g>
              }
            </svg>

            @for (node of nodes; track node.id) {
              <div
                class="absolute rounded-xl px-4 py-2.5 border font-semibold shadow-lg transition-shadow duration-150 node-enter"
                [ngClass]="[
                  node.styleClass,
                  selectedNodeId === node.id ? 'ring-2 ring-primary shadow-[0_0_18px_rgba(124,58,237,0.45)]' : '',
                  pendingFromNodeId === node.id ? 'ring-2 ring-violet-400' : '',
                  editingNodeId === node.id ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'
                ]"
                [style.width.px]="node.w"
                [style.height.px]="node.h"
                [style.transform]="'translate(' + node.x + 'px, ' + node.y + 'px)'"
                [style.--nx]="node.x + 'px'"
                [style.--ny]="node.y + 'px'"
                (pointerdown)="startDrag($event, node.id)"
                (click)="handleNodeClick($event, node.id)"
                (dblclick)="startNodeEdit($event, node.id)"
                (keydown.enter)="selectNodeFromKeyboard(node.id)"
                (keydown.space)="selectNodeFromKeyboard(node.id)"
                tabindex="0"
              >
                @if (editingNodeId !== node.id) {
                  <span class="block truncate text-sm leading-tight">{{ node.label }}</span>
                } @else {
                  <input
                    class="w-full bg-transparent border-none outline-none text-current text-sm"
                    [value]="node.label"
                    (input)="updateNodeLabel(node.id, $event)"
                    (keydown.enter)="finishNodeEdit()"
                    (keydown.escape)="finishNodeEdit()"
                    (blur)="finishNodeEdit()"
                    (pointerdown)="$event.stopPropagation()"
                  />
                }
              </div>
            }

            @if (!currentMap) {
              <div class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                Selecciona o crea un mapa para empezar.
              </div>
            }
          </div>

          <div class="flex flex-wrap gap-4 text-xs text-gray-500">
            <span class="inline-flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Doble clic</kbd>
              editar texto
            </span>
            <span class="inline-flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">ESC</kbd>
              cancelar conexión
            </span>
            <span class="inline-flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Arrastrar</kbd>
              mover nodos
            </span>
          </div>
        </section>

        <aside class="rounded-xl border border-white/10 bg-surface-dark p-4 space-y-4 h-fit">
          <div>
            <h3 class="text-white font-bold">Asistente colaborativo</h3>
            <p class="text-xs text-gray-500 mt-1">Sugerencias en vivo para que el mapa se vea y funcione mejor.</p>
          </div>

          <div class="rounded-lg border border-border-dark bg-background-dark/40 p-3">
            <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Resumen del agente</p>
            <ul class="space-y-1 text-sm text-gray-200">
              @for (hint of agentHints; track hint) {
                <li>• {{ hint }}</li>
              }
            </ul>
          </div>

          <div class="rounded-lg border border-border-dark bg-background-dark/40 p-3 space-y-2">
            <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Link compartible</p>
            <input
              type="text"
              [value]="shareUrl"
              readonly
              class="w-full h-9 rounded-md bg-background-dark border border-border-dark px-2 text-xs text-gray-200"
            />
            <p class="text-[11px] text-gray-500">
              Cualquier usuario autenticado con este link entra directo a la misma sesión.
            </p>
          </div>

          <div class="rounded-lg border border-border-dark bg-background-dark/40 p-3">
            <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Colaboradores en sala</p>
            @if (participants.length === 0) {
              <p class="text-sm text-gray-500">Sin usuarios conectados.</p>
            }
            @for (participant of participants; track participant) {
              <div class="text-sm text-gray-200">
                • {{ participant }}
              </div>
            }
          </div>

          <div class="rounded-lg border border-border-dark bg-background-dark/40 p-3">
            <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Actividad reciente</p>
            @if (activityFeed.length === 0) {
              <p class="text-sm text-gray-500">Sin actividad todavía.</p>
            }
            @for (item of activityFeed; track item) {
              <div class="text-xs text-gray-300 mb-1">
                {{ item }}
              </div>
            }
          </div>

          <div class="text-xs text-gray-500">
            <p>Último guardado: {{ lastSavedAt ? formatDate(lastSavedAt.toISOString()) : 'Aún no guardado' }}</p>
          </div>
        </aside>
      </div>

      @if (toastMessage) {
        <div
          class="fixed bottom-6 right-6 z-[70] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-2xl backdrop-blur-sm"
          [ngClass]="{
            'border-emerald-400/45 bg-emerald-500/15 text-emerald-100': toastType === 'success',
            'border-rose-400/45 bg-rose-500/15 text-rose-100': toastType === 'error',
            'border-sky-400/45 bg-sky-500/15 text-sky-100': toastType === 'info'
          }"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="leading-relaxed">{{ toastMessage }}</p>
            <button
              type="button"
              class="text-xs opacity-80 hover:opacity-100"
              (click)="dismissToast()"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class MindMapsComponent implements OnInit, OnDestroy {
  private readonly workflow = inject(MindmapWorkflowService);
  private readonly mindmapSocket = inject(MindmapSocketService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('canvasRef') private canvasRef?: ElementRef<HTMLDivElement>;

  readonly ROOT_NODE_ID = 'root';
  readonly canvasWidth = 980;
  readonly canvasHeight = 520;

  workspaceLoading = false;
  creatingMap = false;
  saving = false;
  hasUnsavedChanges = false;
  isAuthenticated = false;
  guestSessionMode = false;

  socketStatus: SocketConnectionStatus = 'disconnected';

  errorMessage = '';
  successMessage = '';
  infoMessage = '';
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';

  currentUsername = 'Usuario';
  newMapTitle = 'Mapa colaborativo';
  shareUrl = '';

  workspaceMaps: MindmapWorkspaceItem[] = [];
  currentMap: MindmapWorkspaceItem | null = null;

  participants: string[] = [];
  private readonly participantSet = new Set<string>();
  activityFeed: string[] = [];
  lastSavedAt: Date | null = null;

  nodes: MindMapNode[] = [];
  links: MindMapLink[] = [];

  selectedNodeId: string | null = null;
  selectedLinkId: string | null = null;
  linkCreationMode = false;
  pendingFromNodeId: string | null = null;
  editingNodeId: string | null = null;
  private editingOriginalLabel = '';

  private draggingNodeId: string | null = null;
  private adjustingLinkId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private linkOffsetX = 0;
  private linkOffsetY = 0;

  private autosaveTimerId: number | null = null;
  private saveQueued = false;
  private toastTimerId: number | null = null;

  get agentHints(): string[] {
    const hints: string[] = [];
    hints.push(`Nodos: ${this.nodes.length} · Conexiones: ${this.links.length}.`);
    hints.push(this.linkCreationMode
      ? 'Modo conexión activo: selecciona origen y destino.'
      : 'Tip: usa doble clic para editar texto rápido.');
    hints.push(this.guestSessionMode
      ? 'Modo invitado: colaboración en vivo sin persistencia directa.'
      : this.hasUnsavedChanges
        ? 'Hay cambios pendientes, se guardarán automáticamente.'
        : 'Todo sincronizado en base de datos.');
    hints.push(this.socketStatus === 'connected'
      ? 'Colaboración en tiempo real activa.'
      : 'Socket no conectado; se trabajará localmente.');
    return hints;
  }

  get currentSourceAudioId(): string {
    const content = this.currentMap?.document?.content;
    if (!content || typeof content !== 'object') {
      return '';
    }

    const candidate = (content as Record<string, unknown>)['audioId'];
    return typeof candidate === 'string' ? candidate.trim() : '';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.currentUsername = this.tokenStorage.getUsername() || `Invitado-${Math.floor(Math.random() * 900 + 100)}`;
    this.isAuthenticated = this.hasValidAuthSession();
    this.bindSocket();
    this.mindmapSocket.connect();

    const requestedSession = this.route.snapshot.queryParamMap.get('session');
    if (!this.isAuthenticated) {
      if (requestedSession) {
        this.enterGuestSession(requestedSession);
      } else {
        this.infoMessage = 'Comparte o abre un link de sesión para colaborar sin cuenta.';
      }
      return;
    }

    void this.loadWorkspace();
  }

  ngOnDestroy(): void {
    if (this.currentMap?.mindmap._id) {
      this.mindmapSocket.leaveSession(this.currentMap.mindmap._id, this.currentUsername);
    }

    this.clearAutosaveTimer();
    this.clearToastTimer();
    this.destroy$.next();
    this.destroy$.complete();
    this.mindmapSocket.disconnect();
  }

  getSocketLabel(status: SocketConnectionStatus): string {
    if (status === 'connected') return 'Conectado';
    if (status === 'connecting') return 'Conectando';
    if (status === 'error') return 'Error';
    return 'Desconectado';
  }

  shortId(value: string | undefined): string {
    if (!value) {
      return 'sin-id';
    }
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return 'sin fecha';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'sin fecha';
    }

    return parsed.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  reloadWorkspace(): void {
    if (!this.isAuthenticated) {
      const requestedSession = this.route.snapshot.queryParamMap.get('session');
      if (requestedSession) {
        this.enterGuestSession(requestedSession);
      }
      return;
    }
    void this.loadWorkspace();
  }

  async createMap(): Promise<void> {
    if (!this.isAuthenticated) {
      this.errorMessage = 'Para crear un mapa en base de datos necesitas iniciar sesión.';
      return;
    }

    const title = this.newMapTitle.trim() || 'Mapa colaborativo';
    this.creatingMap = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const created = await firstValueFrom(
        this.workflow.createMindmap(title, this.buildInitialCanvas()),
      );
      this.workspaceMaps = [created, ...this.workspaceMaps];
      this.newMapTitle = '';
      this.openMap(created);
      this.successMessage = 'Mapa creado y listo para compartir.';
      this.showToast('Mapa creado y listo para compartir.', 'success');
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear el mapa.');
    } finally {
      this.creatingMap = false;
    }
  }

  async saveNow(): Promise<void> {
    if (this.guestSessionMode || !this.isAuthenticated) {
      this.infoMessage = 'Estás en modo invitado. El anfitrión autenticado es quien guarda en base de datos.';
      return;
    }
    await this.persistCurrentMap(true);
  }

  async copyShareLink(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.shareUrl) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.shareUrl);
      } else {
        this.fallbackCopyToClipboard(this.shareUrl);
      }
      this.successMessage = 'Link copiado al portapapeles.';
      this.errorMessage = '';
      this.showToast('Link copiado al portapapeles.', 'info');
    } catch {
      this.errorMessage = 'No se pudo copiar el link. Cópialo manualmente.';
    }
  }

  openMap(item: MindmapWorkspaceItem): void {
    const nextMapId = item.mindmap._id;
    if (!nextMapId) {
      this.errorMessage = 'El mapa seleccionado no tiene _id válido.';
      return;
    }

    if (this.currentMap?.mindmap._id && this.currentMap.mindmap._id !== nextMapId) {
      this.mindmapSocket.leaveSession(this.currentMap.mindmap._id, this.currentUsername);
    }

    this.clearAutosaveTimer();
    this.currentMap = item;
    this.applyCanvasPayload(this.workflow.parseCanvasPayload(item.mindmap.nodes), { center: true, resolveCollisions: true });
    this.selectedNodeId = null;
    this.selectedLinkId = null;
    this.pendingFromNodeId = null;
    this.linkCreationMode = false;
    this.editingNodeId = null;
    this.guestSessionMode = !this.isAuthenticated;
    this.hasUnsavedChanges = false;
    this.lastSavedAt = item.mindmap.updatedAt ? new Date(item.mindmap.updatedAt) : null;
    this.updateShareUrl(nextMapId);
    this.resetParticipants();
    this.mindmapSocket.joinSession(nextMapId, this.currentUsername);
    this.addActivity(`Mapa abierto: ${item.title}`);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { session: nextMapId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  addNode(): void {
    if (!this.currentMap) {
      return;
    }

    const anchor = this.nodes.find((node) => node.id === this.ROOT_NODE_ID) ?? this.nodes[0];
    const targetPosition = this.findFreeNodePosition(170, 55);
    const newNode: MindMapNode = {
      id: this.createLocalId('node'),
      label: `Idea ${this.nodes.length + 1}`,
      x: targetPosition.x,
      y: targetPosition.y,
      w: 170,
      h: 55,
      styleClass: this.pickNodeStyle(this.nodes.length + 1),
    };

    this.nodes = [...this.nodes, newNode];
    if (anchor) {
      this.links = [
        ...this.links,
        { id: this.createLocalId('edge'), from: anchor.id, to: newNode.id, curveOffsetX: 0, curveOffsetY: 0 },
      ];
    }
    this.selectedNodeId = newNode.id;
    this.publishCanvasChange('ADD_NODE');
  }

  autoArrangeCanvas(): void {
    if (!this.currentMap || this.nodes.length < 2) {
      return;
    }

    const arranged = this.resolveCollisions(this.fitNodesToCanvas(this.nodes, true));
    this.nodes = arranged;
    this.publishCanvasChange('AUTO_LAYOUT');
    this.showToast('Mapa reordenado correctamente.', 'info');
  }

  toggleLinkMode(): void {
    this.linkCreationMode = !this.linkCreationMode;
    this.pendingFromNodeId = null;
  }

  handleNodeClick(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.processNodeSelection(nodeId);
  }

  selectNodeFromKeyboard(nodeId: string): void {
    this.processNodeSelection(nodeId);
  }

  selectLink(event: MouseEvent, linkId: string): void {
    event.stopPropagation();
    this.selectedLinkId = linkId;
    this.selectedNodeId = null;
  }

  deleteSelectedNode(): void {
    if (!this.selectedNodeId || this.selectedNodeId === this.ROOT_NODE_ID) {
      return;
    }

    const nodeId = this.selectedNodeId;
    this.nodes = this.nodes.filter((node) => node.id !== nodeId);
    this.links = this.links.filter((link) => link.from !== nodeId && link.to !== nodeId);
    this.selectedNodeId = null;
    this.pendingFromNodeId = null;
    this.publishCanvasChange('DELETE_NODE');
  }

  deleteSelectedLink(): void {
    if (!this.selectedLinkId) {
      return;
    }

    const linkId = this.selectedLinkId;
    this.links = this.links.filter((link) => link.id !== linkId);
    this.selectedLinkId = null;
    this.publishCanvasChange('DELETE_EDGE');
  }

  onCanvasClick(): void {
    this.selectedNodeId = null;
    this.selectedLinkId = null;
    if (!this.linkCreationMode) {
      this.pendingFromNodeId = null;
    }
  }

  startNodeEdit(event: MouseEvent, nodeId: string): void {
    const node = this.findNode(nodeId);
    if (!node) {
      return;
    }
    this.editingOriginalLabel = node.label;
    this.editingNodeId = nodeId;
    event.stopPropagation();
  }

  updateNodeLabel(nodeId: string, event: Event): void {
    const node = this.findNode(nodeId);
    if (!node) {
      return;
    }

    node.label = (event.target as HTMLInputElement).value;
  }

  finishNodeEdit(): void {
    if (!this.editingNodeId) {
      return;
    }

    const node = this.findNode(this.editingNodeId);
    const edited = node ? node.label.trim() : '';
    if (node && !edited) {
      node.label = this.editingOriginalLabel || 'Idea';
    }

    if (node && node.label !== this.editingOriginalLabel) {
      this.publishCanvasChange('EDIT_NODE');
    }

    this.editingNodeId = null;
    this.editingOriginalLabel = '';
  }

  startDrag(event: PointerEvent, nodeId: string): void {
    if (this.linkCreationMode || this.editingNodeId === nodeId) {
      return;
    }

    const node = this.findNode(nodeId);
    const canvas = this.canvasRef?.nativeElement;
    if (!node || !canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    this.draggingNodeId = nodeId;
    this.adjustingLinkId = null;
    this.dragOffsetX = event.clientX - rect.left - node.x;
    this.dragOffsetY = event.clientY - rect.top - node.y;

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  startLinkAdjust(event: PointerEvent, linkId: string): void {
    const link = this.findLink(linkId);
    const canvasPoint = this.getCanvasPoint(event);
    if (!link || !canvasPoint) {
      return;
    }

    const control = this.getLinkControlPoint(link);
    this.adjustingLinkId = linkId;
    this.draggingNodeId = null;
    this.linkOffsetX = canvasPoint.x - control.x;
    this.linkOffsetY = canvasPoint.y - control.y;

    (event.target as SVGCircleElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.adjustingLinkId) {
      const link = this.findLink(this.adjustingLinkId);
      const canvasPoint = this.getCanvasPoint(event);
      if (!link || !canvasPoint) {
        return;
      }

      const { mid } = this.getLinkGeometry(link);
      link.curveOffsetX = canvasPoint.x - this.linkOffsetX - mid.x;
      link.curveOffsetY = canvasPoint.y - this.linkOffsetY - mid.y;
      return;
    }

    if (!this.draggingNodeId) {
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    const node = this.findNode(this.draggingNodeId);
    if (!canvas || !node) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    node.x = this.clamp(event.clientX - rect.left - this.dragOffsetX, 0, this.canvasWidth - node.w);
    node.y = this.clamp(event.clientY - rect.top - this.dragOffsetY, 0, this.canvasHeight - node.h);
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    const changedByPointer = !!this.draggingNodeId || !!this.adjustingLinkId;
    this.draggingNodeId = null;
    this.adjustingLinkId = null;

    if (changedByPointer) {
      this.publishCanvasChange('MOVE_NODE');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.linkCreationMode = false;
      this.pendingFromNodeId = null;
      this.finishNodeEdit();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && !this.editingNodeId) {
      if (this.selectedLinkId) {
        this.deleteSelectedLink();
      } else if (this.selectedNodeId && this.selectedNodeId !== this.ROOT_NODE_ID) {
        this.deleteSelectedNode();
      }
    }
  }

  getLinkPath(link: MindMapLink): string {
    const { start, end, control } = this.getLinkGeometry(link);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }

  getLinkControlPoint(link: MindMapLink): Point {
    const { mid } = this.getLinkGeometry(link);
    return { x: mid.x + link.curveOffsetX, y: mid.y + link.curveOffsetY };
  }

  private async loadWorkspace(): Promise<void> {
    this.workspaceLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.guestSessionMode = false;

    try {
      const requestedSession = this.route.snapshot.queryParamMap.get('session');
      
      // Use progressive loading - subscribe to updates as they arrive
      this.workflow.listWorkspaceItemsProgressive()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (progressiveItems) => {
            this.workspaceMaps = progressiveItems;
            this.workspaceLoading = false;
            
            // Auto-open first map or requested shared map
            if (progressiveItems.length === 0) {
              return;
            }

            if (requestedSession) {
              const fromList = progressiveItems.find((item) => item.mindmap._id === requestedSession);
              if (fromList) {
                this.openMap(fromList);
              } else {
                // Try to load shared map by ID
                this.workflow.getWorkspaceItemByMindmapId(requestedSession)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (shared) => {
                      this.workspaceMaps = [shared, ...this.workspaceMaps.filter((item) => item.mindmap._id !== shared.mindmap._id)];
                      this.openMap(shared);
                      this.infoMessage = 'Se abrió un mapa compartido por link.';
                    },
                    error: (error) => {
                      this.errorMessage = this.toErrorMessage(error, 'No se pudo abrir el mapa compartido.');
                      if (this.workspaceMaps.length > 0) {
                        this.openMap(this.workspaceMaps[0]);
                      }
                    },
                  });
              }
            } else {
              // Auto-open first map
              if (!this.currentMap) {
                this.openMap(progressiveItems[0]);
              }
            }
          },
          error: (error) => {
            this.workspaceLoading = false;
            this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar los mapas mentales.');
          },
        });
    } catch (error) {
      this.workspaceLoading = false;
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar los mapas mentales.');
    } finally {
      this.workspaceLoading = false;
    }
  }

  private enterGuestSession(sessionId: string): void {
    const normalizedSession = sessionId.trim();
    if (!normalizedSession) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.guestSessionMode = true;
    this.workspaceLoading = false;

    const initialCanvas = this.buildInitialCanvas();
    const guestMap: MindmapWorkspaceItem = {
      mindmap: {
        _id: normalizedSession,
        documentId: `guest-${normalizedSession}`,
        nodes: this.workflow.toMindmapNodesPayload(initialCanvas),
      },
      document: null,
      title: `Sesión compartida ${this.shortId(normalizedSession)}`,
    };

    this.workspaceMaps = [guestMap];
    this.currentMap = guestMap;
    this.applyCanvasPayload(initialCanvas, { center: true, resolveCollisions: true });
    this.selectedNodeId = null;
    this.selectedLinkId = null;
    this.pendingFromNodeId = null;
    this.linkCreationMode = false;
    this.hasUnsavedChanges = false;
    this.updateShareUrl(normalizedSession);
    this.resetParticipants();
    this.mindmapSocket.joinSession(normalizedSession, this.currentUsername);
    this.infoMessage = 'Modo invitado activado: colaboración en vivo por pestaña/link, sin login.';
    this.addActivity(`Sesión invitada abierta: ${normalizedSession}`);
  }

  private async openSharedMapById(mindmapId: string): Promise<void> {
    try {
      const shared = await firstValueFrom(this.workflow.getWorkspaceItemByMindmapId(mindmapId));
      this.workspaceMaps = [shared, ...this.workspaceMaps.filter((item) => item.mindmap._id !== shared.mindmap._id)];
      this.openMap(shared);
      this.infoMessage = 'Se abrió un mapa compartido por link.';
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo abrir el mapa compartido.');
      this.openMap(this.workspaceMaps[0]);
    }
  }

  private buildInitialCanvas(): MindmapCanvasPayload {
    return {
      nodes: [
        {
          id: this.ROOT_NODE_ID,
          label: 'Objetivo principal',
          x: 390,
          y: 220,
          w: 200,
          h: 58,
          styleClass: 'border-primary/40 bg-primary/20 text-white font-bold',
        },
      ],
      edges: [],
    };
  }

  private applyCanvasPayload(
    payload: MindmapCanvasPayload,
    options: { center: boolean; resolveCollisions: boolean } = { center: true, resolveCollisions: true },
  ): void {
    const parsedNodes = payload.nodes.map((node, index) => this.toLocalNode(node, index));
    const fallback = this.toLocalNode(this.buildInitialCanvas().nodes[0], 0);
    const baseNodes = parsedNodes.length > 0 ? parsedNodes : [fallback];

    const fitted = this.fitNodesToCanvas(baseNodes, options.center);
    this.nodes = options.resolveCollisions ? this.resolveCollisions(fitted) : fitted;

    const validNodeIds = new Set(this.nodes.map((node) => node.id));
    this.links = payload.edges
      .map((edge) => this.toLocalLink(edge))
      .filter((edge) => validNodeIds.has(edge.from) && validNodeIds.has(edge.to));
  }

  private toLocalNode(node: MindmapCanvasNodePayload, index: number): MindMapNode {
    const width = this.clamp(this.asFiniteNumber(node.w, 180), 140, 280);
    const height = this.clamp(this.asFiniteNumber(node.h, 56), 46, 120);
    const x = this.asFiniteNumber(node.x, 80);
    const y = this.asFiniteNumber(node.y, 80);

    return {
      id: node.id,
      label: node.label,
      x,
      y,
      w: width,
      h: height,
      styleClass: this.resolveNodeStyle(node.styleClass, index, node.id),
    };
  }

  private toLocalLink(link: MindmapCanvasLinkPayload): MindMapLink {
    return {
      id: link.id,
      from: link.from,
      to: link.to,
      curveOffsetX: link.curveOffsetX,
      curveOffsetY: link.curveOffsetY,
    };
  }

  private exportCanvasPayload(): MindmapCanvasPayload {
    return {
      nodes: this.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        styleClass: node.styleClass,
      })),
      edges: this.links.map((link) => ({
        id: link.id,
        from: link.from,
        to: link.to,
        curveOffsetX: link.curveOffsetX,
        curveOffsetY: link.curveOffsetY,
      })),
    };
  }

  private publishCanvasChange(action: string): void {
    if (!this.currentMap?.mindmap._id) {
      return;
    }

    this.hasUnsavedChanges = true;

    this.mindmapSocket.emitMindmapEdit({
      session_id: this.currentMap.mindmap._id,
      action,
      username: this.currentUsername,
      node_data: this.workflow.toMindmapNodesPayload(this.exportCanvasPayload()),
    });

    if (this.isAuthenticated && !this.guestSessionMode) {
      this.scheduleAutosave();
    }
  }

  private scheduleAutosave(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.clearAutosaveTimer();
    this.autosaveTimerId = window.setTimeout(() => {
      void this.persistCurrentMap(false);
    }, 1200);
  }

  private clearAutosaveTimer(): void {
    if (this.autosaveTimerId !== null) {
      window.clearTimeout(this.autosaveTimerId);
      this.autosaveTimerId = null;
    }
  }

  private async persistCurrentMap(manual: boolean): Promise<void> {
    if (!this.isAuthenticated || this.guestSessionMode) {
      return;
    }

    const mindmapId = this.currentMap?.mindmap._id;
    const documentId = this.currentMap?.mindmap.documentId;
    if (!mindmapId || !documentId) {
      return;
    }

    if (this.saving) {
      this.saveQueued = true;
      return;
    }

    this.saving = true;
    this.clearAutosaveTimer();

    try {
      const saved = await firstValueFrom(
        this.workflow.saveMindmapState(mindmapId, documentId, this.exportCanvasPayload()),
      );

      this.workspaceMaps = this.workspaceMaps.map((item) =>
        item.mindmap._id === saved._id
          ? { ...item, mindmap: saved }
          : item,
      );

      const activeMap = this.currentMap;
      if (activeMap && activeMap.mindmap._id === saved._id) {
        this.currentMap = {
          mindmap: saved,
          document: activeMap.document,
          title: activeMap.title,
        };
      }

      this.hasUnsavedChanges = false;
      this.lastSavedAt = new Date();
      if (manual) {
        this.showToast('Mapa guardado correctamente.', 'success');
      }
      this.infoMessage = '';
      this.addActivity('Estado guardado en base de datos.');
    } catch (error) {
      if (this.isAuthError(error)) {
        this.isAuthenticated = false;
        this.guestSessionMode = true;
        this.errorMessage = '';
        this.infoMessage = 'Tu sesión expiró. Sigues en modo colaborativo invitado; inicia sesión para guardar en base de datos.';
        this.showToast('Sesión vencida: ahora estás en modo invitado.', 'info');
        this.addActivity('Sesión vencida: persistencia deshabilitada hasta iniciar sesión.');
      } else {
        this.errorMessage = this.toErrorMessage(error, 'No se pudo guardar el mapa actual.');
        this.showToast(this.errorMessage, 'error');
      }
    } finally {
      this.saving = false;

      if (this.saveQueued) {
        this.saveQueued = false;
        void this.persistCurrentMap(false);
      }
    }
  }

  private bindSocket(): void {
    this.mindmapSocket.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.socketStatus = status;
      });

    this.mindmapSocket.onMindmapUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleRemoteMindmapUpdate(event));

    this.mindmapSocket.onUserJoined()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (!this.shouldApplyPresenceEvent(event.session_id)) {
          return;
        }

        const username = event.username?.trim() || 'Usuario';
        this.participantSet.add(username);
        this.syncParticipants();
        this.addActivity(`${username} se unió a la sesión.`);

        if (username !== this.currentUsername && this.currentMap?.mindmap._id) {
          this.mindmapSocket.emitMindmapEdit({
            session_id: this.currentMap.mindmap._id,
            action: 'SYNC_STATE',
            username: this.currentUsername,
            node_data: this.workflow.toMindmapNodesPayload(this.exportCanvasPayload()),
          });
        }
      });

    this.mindmapSocket.onUserLeft()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (!this.shouldApplyPresenceEvent(event.session_id)) {
          return;
        }

        const username = event.username?.trim() || 'Usuario';
        if (this.participantSet.has(username) && username !== this.currentUsername) {
          this.participantSet.delete(username);
          this.syncParticipants();
        }
        this.addActivity(`${username} salió de la sesión.`);
      });
  }

  private handleRemoteMindmapUpdate(event: SocketMindmapUpdatedEvent): void {
    const currentMindmapId = this.currentMap?.mindmap._id;
    if (!currentMindmapId || event.session_id !== currentMindmapId) {
      return;
    }

    const remoteCanvas = this.workflow.parseCanvasPayload(event.node_data);
    this.applyCanvasPayload(remoteCanvas, { center: false, resolveCollisions: false });
    this.hasUnsavedChanges = false;
    this.addActivity(`${event.username?.trim() || 'Colaborador'} actualizó: ${event.action}.`);
  }

  dismissToast(): void {
    this.toastMessage = '';
    this.clearToastTimer();
  }

  private shouldApplyPresenceEvent(sessionId: string | undefined): boolean {
    if (!this.currentMap?.mindmap._id) {
      return false;
    }
    if (!sessionId) {
      return true;
    }
    return sessionId === this.currentMap.mindmap._id;
  }

  private updateShareUrl(sessionId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.shareUrl = `${window.location.origin}/mind-maps?session=${sessionId}`;
  }

  private hasValidAuthSession(): boolean {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return false;
    }

    const payload = this.tokenStorage.getTokenPayload();
    if (!payload) {
      return false;
    }

    const expClaim = payload['exp'];
    if (typeof expClaim === 'number') {
      return Date.now() < (expClaim * 1000) - 10000;
    }

    if (typeof expClaim === 'string') {
      const exp = Number(expClaim);
      if (!Number.isFinite(exp)) {
        return false;
      }
      return Date.now() < (exp * 1000) - 10000;
    }

    return true;
  }

  private isAuthError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  private fallbackCopyToClipboard(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private resetParticipants(): void {
    this.participantSet.clear();
    this.participantSet.add(this.currentUsername);
    this.syncParticipants();
  }

  private syncParticipants(): void {
    this.participants = Array.from(this.participantSet.values()).sort((a, b) => a.localeCompare(b));
  }

  private addActivity(text: string): void {
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    this.activityFeed = [`${time} · ${text}`, ...this.activityFeed].slice(0, 14);
  }

  private processNodeSelection(nodeId: string): void {
    this.selectedNodeId = nodeId;
    this.selectedLinkId = null;

    if (!this.linkCreationMode) {
      return;
    }

    if (!this.pendingFromNodeId) {
      this.pendingFromNodeId = nodeId;
      return;
    }

    if (this.pendingFromNodeId === nodeId) {
      return;
    }

    const from = this.pendingFromNodeId;
    const exists = this.links.some((link) =>
      (link.from === from && link.to === nodeId) || (link.from === nodeId && link.to === from),
    );

    if (!exists) {
      this.links = [
        ...this.links,
        { id: this.createLocalId('edge'), from, to: nodeId, curveOffsetX: 0, curveOffsetY: 0 },
      ];
      this.publishCanvasChange('ADD_EDGE');
    }

    this.pendingFromNodeId = null;
    this.linkCreationMode = false;
  }

  private getLinkGeometry(link: MindMapLink): { start: Point; end: Point; mid: Point; control: Point } {
    const fromNode = this.findNode(link.from);
    const toNode = this.findNode(link.to);

    if (!fromNode || !toNode) {
      const zero = { x: 0, y: 0 };
      return { start: zero, end: zero, mid: zero, control: zero };
    }

    const fromCenter = this.getNodeCenter(fromNode);
    const toCenter = this.getNodeCenter(toNode);
    const start = this.getEdgePoint(fromNode, toCenter);
    const end = this.getEdgePoint(toNode, fromCenter);
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

    return {
      start,
      end,
      mid,
      control: { x: mid.x + link.curveOffsetX, y: mid.y + link.curveOffsetY },
    };
  }

  private getNodeCenter(node: MindMapNode): Point {
    return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  }

  private getEdgePoint(node: MindMapNode, toward: Point): Point {
    const center = this.getNodeCenter(node);
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (dx === 0 && dy === 0) {
      return center;
    }

    const tx = dx === 0 ? Infinity : (node.w / 2) / Math.abs(dx);
    const ty = dy === 0 ? Infinity : (node.h / 2) / Math.abs(dy);
    const t = Math.min(tx, ty);

    return { x: center.x + dx * t, y: center.y + dy * t };
  }

  private getCanvasPoint(event: PointerEvent): Point | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: this.clamp(event.clientX - rect.left, 0, this.canvasWidth),
      y: this.clamp(event.clientY - rect.top, 0, this.canvasHeight),
    };
  }

  private findNode(id: string): MindMapNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  private findLink(id: string): MindMapLink | undefined {
    return this.links.find((link) => link.id === id);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private findFreeNodePosition(width: number, height: number): Point {
    const stepX = 38;
    const stepY = 30;
    const minX = 16;
    const minY = 16;
    const maxX = Math.max(minX, this.canvasWidth - width - 16);
    const maxY = Math.max(minY, this.canvasHeight - height - 16);

    const root = this.findNode(this.ROOT_NODE_ID);
    const fallback = {
      x: root ? this.clamp(root.x + 210, minX, maxX) : minX,
      y: root ? this.clamp(root.y, minY, maxY) : minY,
    };

    for (let y = minY; y <= maxY; y += stepY) {
      for (let x = minX; x <= maxX; x += stepX) {
        const candidate: MindMapNode = {
          id: 'probe',
          label: '',
          x,
          y,
          w: width,
          h: height,
          styleClass: '',
        };
        const overlaps = this.nodes.some((node) => this.areNodesOverlapping(node, candidate, 20));
        if (!overlaps) {
          return { x, y };
        }
      }
    }

    return fallback;
  }

  private fitNodesToCanvas(nodes: MindMapNode[], center: boolean): MindMapNode[] {
    if (nodes.length === 0) {
      return nodes;
    }

    const minPadding = 8;
    const framePadding = 24;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.w);
      maxY = Math.max(maxY, node.y + node.h);
    });

    let shiftX = 0;
    let shiftY = 0;

    if (minX < minPadding) {
      shiftX += (minPadding - minX);
    }
    if (minY < minPadding) {
      shiftY += (minPadding - minY);
    }
    if (maxX + shiftX > this.canvasWidth - minPadding) {
      shiftX += (this.canvasWidth - minPadding) - (maxX + shiftX);
    }
    if (maxY + shiftY > this.canvasHeight - minPadding) {
      shiftY += (this.canvasHeight - minPadding) - (maxY + shiftY);
    }

    if (center) {
      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const targetMinX = framePadding + Math.max(0, (this.canvasWidth - (framePadding * 2) - contentWidth) / 2);
      const targetMinY = framePadding + Math.max(0, (this.canvasHeight - (framePadding * 2) - contentHeight) / 2);
      shiftX = targetMinX - minX;
      shiftY = targetMinY - minY;
    }

    return nodes.map((node) => {
      const x = this.clamp(node.x + shiftX, minPadding, this.canvasWidth - node.w - minPadding);
      const y = this.clamp(node.y + shiftY, minPadding, this.canvasHeight - node.h - minPadding);
      return { ...node, x, y };
    });
  }

  private resolveCollisions(nodes: MindMapNode[]): MindMapNode[] {
    const moved = nodes.map((node) => ({ ...node }));

    for (let iteration = 0; iteration < 12; iteration += 1) {
      let changed = false;

      for (let i = 0; i < moved.length; i += 1) {
        for (let j = i + 1; j < moved.length; j += 1) {
          const a = moved[i];
          const b = moved[j];
          if (!this.areNodesOverlapping(a, b, 12)) {
            continue;
          }

          changed = true;
          const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
          const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
          const pushX = Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 14 : -14) : 0;
          const pushY = Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 12 : -12) : 0;

          b.x = this.clamp(b.x + pushX, 8, this.canvasWidth - b.w - 8);
          b.y = this.clamp(b.y + pushY, 8, this.canvasHeight - b.h - 8);
        }
      }

      if (!changed) {
        break;
      }
    }

    return moved;
  }

  private areNodesOverlapping(first: MindMapNode, second: MindMapNode, gap: number): boolean {
    return !(
      first.x + first.w + gap <= second.x
      || second.x + second.w + gap <= first.x
      || first.y + first.h + gap <= second.y
      || second.y + second.h + gap <= first.y
    );
  }

  private createLocalId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private pickNodeStyle(index: number): string {
    const styles = [
      'border-primary/45 bg-gradient-to-br from-primary/30 to-indigo-500/20 text-white font-bold shadow-[0_12px_28px_rgba(59,130,246,0.28)]',
      'border-blue-400/45 bg-gradient-to-br from-blue-500/22 to-cyan-500/15 text-blue-100 shadow-[0_10px_24px_rgba(59,130,246,0.22)]',
      'border-emerald-400/45 bg-gradient-to-br from-emerald-500/22 to-teal-500/15 text-emerald-100 shadow-[0_10px_24px_rgba(16,185,129,0.20)]',
      'border-orange-400/45 bg-gradient-to-br from-orange-500/22 to-amber-500/15 text-orange-100 shadow-[0_10px_24px_rgba(249,115,22,0.20)]',
      'border-pink-400/45 bg-gradient-to-br from-pink-500/22 to-fuchsia-500/15 text-pink-100 shadow-[0_10px_24px_rgba(236,72,153,0.20)]',
      'border-indigo-400/45 bg-gradient-to-br from-indigo-500/22 to-violet-500/15 text-indigo-100 shadow-[0_10px_24px_rgba(99,102,241,0.20)]',
      'border-cyan-400/45 bg-gradient-to-br from-cyan-500/22 to-sky-500/15 text-cyan-100 shadow-[0_10px_24px_rgba(6,182,212,0.20)]',
    ];
    return styles[index % styles.length];
  }

  private resolveNodeStyle(styleClass: string | undefined, index: number, nodeId: string): string {
    const normalized = (styleClass ?? '').trim().toLocaleLowerCase();

    const semanticMap: Record<string, string> = {
      'node-primary': 'border-primary/50 bg-gradient-to-br from-primary/35 to-indigo-500/30 text-white font-black shadow-[0_14px_30px_rgba(59,130,246,0.30)]',
      'node-section-summary': 'border-sky-400/45 bg-gradient-to-br from-sky-500/22 to-blue-500/18 text-sky-100 font-bold',
      'node-section-insight': 'border-violet-400/45 bg-gradient-to-br from-violet-500/22 to-fuchsia-500/18 text-violet-100 font-bold',
      'node-section-task': 'border-emerald-400/45 bg-gradient-to-br from-emerald-500/22 to-teal-500/18 text-emerald-100 font-bold',
      'node-summary-item': 'border-blue-300/45 bg-blue-500/12 text-blue-100',
      'node-insight-item': 'border-purple-300/45 bg-purple-500/12 text-purple-100',
      'node-task-item': 'border-emerald-300/45 bg-emerald-500/12 text-emerald-100',
      'node-fallback': 'border-amber-300/45 bg-amber-500/12 text-amber-100',
    };

    if (normalized && semanticMap[normalized]) {
      return semanticMap[normalized];
    }

    if (normalized && (normalized.includes('border-') || normalized.includes('bg-') || normalized.includes('text-'))) {
      return styleClass?.trim() || this.pickNodeStyle(index);
    }

    if (nodeId === this.ROOT_NODE_ID) {
      return semanticMap['node-primary'];
    }

    return this.pickNodeStyle(index);
  }

  private asFiniteNumber(value: unknown, fallback: number): number {
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

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    return fallback;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    if (!message.trim()) {
      return;
    }

    this.toastMessage = message;
    this.toastType = type;
    this.clearToastTimer();

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.toastTimerId = window.setTimeout(() => {
      this.toastMessage = '';
      this.toastTimerId = null;
    }, 2600);
  }

  private clearToastTimer(): void {
    if (this.toastTimerId !== null) {
      window.clearTimeout(this.toastTimerId);
      this.toastTimerId = null;
    }
  }
}
