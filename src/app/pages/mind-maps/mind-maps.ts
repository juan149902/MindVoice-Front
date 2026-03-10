import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, MatIconModule],
  styles: [`
    .node-enter {
      animation: nodeIn 0.2s ease-out forwards;
    }
    @keyframes nodeIn {
      from { opacity: 0; transform: translate(var(--nx), var(--ny)) scale(0.85); }
      to   { opacity: 1; transform: translate(var(--nx), var(--ny)) scale(1); }
    }
    .canvas-dot-grid {
      background-image: radial-gradient(circle, rgba(124,58,237,0.18) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .link-path-hover {
      transition: stroke 0.15s;
    }
    .node-pending-source {
      box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.7), 0 0 20px rgba(124,58,237,0.4);
    }
  `],
  template: `
    <div class="p-8 max-w-[1300px] mx-auto w-full">

      <!-- Header -->
      <section class="mb-8 flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h2 class="text-white text-3xl font-black tracking-tight">Mapas Mentales</h2>
          <p class="text-gray-400 mt-1">Conecta ideas de tus notas, tareas y resúmenes en un solo lienzo visual.</p>
        </div>
        <div class="flex gap-2 flex-wrap justify-end">
          <button class="h-10 px-4 rounded-lg border border-border-dark bg-surface-dark text-sm font-semibold text-gray-200 hover:bg-white/5 transition-colors">
            Importar desde Resúmenes
          </button>

          <button (click)="addNode()"
            class="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors flex items-center gap-2"
            title="Agregar nuevo cuadro al mapa">
            <mat-icon class="text-[18px]">add</mat-icon>
            Nuevo Cuadro
          </button>

          <button
            (click)="toggleLinkMode()"
            class="h-10 px-4 rounded-lg border text-sm font-semibold transition-all flex items-center gap-2 relative"
            [ngClass]="linkCreationMode
              ? 'border-primary text-primary bg-primary/10 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
              : 'border-border-dark text-gray-200 bg-surface-dark hover:bg-white/5'"
            [title]="linkCreationMode ? 'Haz clic en dos cuadros para conectarlos. ESC para cancelar.' : 'Modo conexión: une dos cuadros con una línea'"
          >
            <mat-icon class="text-[18px]">device_hub</mat-icon>
            <span *ngIf="!linkCreationMode">Agregar Línea</span>
            <span *ngIf="linkCreationMode && !pendingFromNodeId">Selecciona origen…</span>
            <span *ngIf="linkCreationMode && pendingFromNodeId">Selecciona destino…</span>
          </button>

          <button
            (click)="deleteSelectedLink()"
            [disabled]="!selectedLinkId"
            class="h-10 px-4 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 transition-colors flex items-center gap-2"
            title="Borra la línea seleccionada (clic en una línea para seleccionarla)">
            <mat-icon class="text-[18px]">delete_outline</mat-icon>
            Borrar Línea
          </button>

          <button
            (click)="deleteSelectedNode()"
            [disabled]="!selectedNodeId || selectedNodeId === 'root'"
            class="h-10 px-4 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 transition-colors flex items-center gap-2"
            [title]="selectedNodeId === 'root' ? 'El cuadro raíz no se puede borrar' : 'Borra el cuadro seleccionado y sus conexiones'">
            <mat-icon class="text-[18px]">delete</mat-icon>
            Borrar Cuadro
          </button>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

        <!-- Sidebar -->
        <aside class="xl:col-span-1 bg-surface-dark border border-white/5 rounded-2xl p-5 h-fit">
          <h3 class="text-white font-bold mb-4">Tus Mapas</h3>
          <div class="space-y-3">
            <button class="w-full text-left p-3 rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <p class="font-semibold">Estrategia Q2</p>
              <p class="text-xs text-gray-400 mt-1">Actualizado hace 1h</p>
            </button>
            <button class="w-full text-left p-3 rounded-xl border border-white/5 hover:border-primary/30 text-gray-200 hover:bg-white/5 transition-all">
              <p class="font-semibold">Lanzamiento de Producto</p>
              <p class="text-xs text-gray-500 mt-1">Actualizado ayer</p>
            </button>
            <button class="w-full text-left p-3 rounded-xl border border-white/5 hover:border-primary/30 text-gray-200 hover:bg-white/5 transition-all">
              <p class="font-semibold">Plan de Contenido</p>
              <p class="text-xs text-gray-500 mt-1">Actualizado hace 3 días</p>
            </button>
          </div>

          <div class="mt-6 pt-6 border-t border-border-dark">
            <h4 class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Filtros Rápidos</h4>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">Ideas</span>
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">Tareas</span>
              <span class="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold">Resúmenes</span>
            </div>
          </div>

          <!-- Stats del mapa activo -->
          <div class="mt-6 pt-6 border-t border-border-dark">
            <h4 class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Mapa Actual</h4>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-400">Cuadros</span>
                <span class="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">{{ nodes.length }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-400">Conexiones</span>
                <span class="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">{{ links.length }}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Canvas principal -->
        <section class="xl:col-span-3 bg-surface-dark border border-white/5 rounded-2xl p-6 relative overflow-hidden min-h-[560px]">

          <!-- Toolbar interna del canvas -->
          <div class="flex items-center justify-between mb-5">
            <div>
              <p class="text-xs text-primary font-bold uppercase tracking-wider">Mapa Activo</p>
              <h3 class="text-xl text-white font-bold">Estrategia Q2</h3>
            </div>
            <div class="flex gap-2 items-center">
              <!-- Indicador de modo activo -->
              <div *ngIf="linkCreationMode"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold animate-pulse">
                <mat-icon class="text-[14px]">radio_button_checked</mat-icon>
                {{ pendingFromNodeId ? 'Clic en destino' : 'Clic en origen' }}
              </div>
              <div *ngIf="selectedNodeId && !linkCreationMode"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs">
                <mat-icon class="text-[14px]">crop_square</mat-icon>
                {{ getNodeLabel(selectedNodeId) }}
              </div>
              <div *ngIf="selectedLinkId"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs">
                <mat-icon class="text-[14px]">linear_scale</mat-icon>
                Línea seleccionada
              </div>

              <button class="size-9 rounded-lg border border-border-dark text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-center" title="Zoom in">
                <mat-icon class="text-[18px]">zoom_in</mat-icon>
              </button>
              <button class="size-9 rounded-lg border border-border-dark text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-center" title="Zoom out">
                <mat-icon class="text-[18px]">zoom_out</mat-icon>
              </button>
              <button class="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1">
                <mat-icon class="text-[18px]">save</mat-icon>
                Guardar
              </button>
            </div>
          </div>

          <!-- Lienzo -->
          <div
            #canvasRef
            class="relative h-[460px] rounded-xl border border-border-dark bg-background-dark/60 canvas-dot-grid overflow-hidden select-none"
            [ngClass]="linkCreationMode ? 'cursor-crosshair' : 'cursor-default'"
            (click)="onCanvasClick()"
          >
            <!-- SVG para líneas -->
            <svg [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight"
              class="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <!-- Flecha para extremo de línea -->
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed" opacity="0.7"/>
                </marker>
                <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#c4b5fd"/>
                </marker>
                <!-- Glow filter para línea seleccionada -->
                <filter id="glow-link" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <g *ngFor="let link of links; trackBy: trackLink">
                <!-- Línea visible -->
                <path
                  [attr.d]="getLinkPath(link)"
                  [attr.stroke]="selectedLinkId === link.id ? '#c4b5fd' : '#7c3aed'"
                  [attr.stroke-width]="selectedLinkId === link.id ? 2.5 : 1.8"
                  [attr.filter]="selectedLinkId === link.id ? 'url(#glow-link)' : null"
                  [attr.marker-end]="selectedLinkId === link.id ? 'url(#arrow-selected)' : 'url(#arrow)'"
                  [attr.stroke-dasharray]="selectedLinkId === link.id ? '0' : '0'"
                  stroke-opacity="0.85"
                  fill="none"
                  stroke-linecap="round"
                  class="link-path-hover"
                />
                <!-- Zona de clic invisible (más ancha) -->
                <path
                  [attr.d]="getLinkPath(link)"
                  stroke="transparent"
                  stroke-width="16"
                  fill="none"
                  class="cursor-pointer pointer-events-all"
                  (click)="selectLink($event, link.id)"
                />
                <!-- Control point drag handle (solo visible cuando seleccionada) -->
                <g *ngIf="selectedLinkId === link.id" class="pointer-events-all">
                  <circle
                    [attr.cx]="getLinkControlPoint(link).x"
                    [attr.cy]="getLinkControlPoint(link).y"
                    r="8"
                    fill="rgba(31,21,51,0.9)"
                    stroke="#a78bfa"
                    stroke-width="1.5"
                    class="cursor-move"
                    (pointerdown)="startLinkAdjust($event, link.id)"
                  />
                  <circle
                    [attr.cx]="getLinkControlPoint(link).x"
                    [attr.cy]="getLinkControlPoint(link).y"
                    r="3"
                    fill="#a78bfa"
                    class="pointer-events-none"
                  />
                </g>
              </g>
            </svg>

            <!-- Nodos -->
            <div
              *ngFor="let node of nodes; trackBy: trackNode"
              class="absolute rounded-xl px-4 py-2.5 border font-semibold shadow-lg transition-shadow duration-150 node-enter"
              [ngClass]="[
                node.styleClass,
                selectedNodeId === node.id ? 'ring-2 ring-primary shadow-[0_0_16px_rgba(124,58,237,0.35)]' : '',
                pendingFromNodeId === node.id ? 'node-pending-source' : '',
                linkCreationMode && pendingFromNodeId && pendingFromNodeId !== node.id ? 'hover:ring-2 hover:ring-violet-400/60' : '',
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
            >
              <!-- Label o input de edición -->
              <span *ngIf="editingNodeId !== node.id" class="block truncate text-sm leading-tight">
                {{ node.label }}
              </span>
              <input
                *ngIf="editingNodeId === node.id"
                class="w-full bg-transparent border-none outline-none text-current text-sm"
                [value]="node.label"
                (input)="updateNodeLabel(node.id, $event)"
                (keydown.enter)="finishNodeEdit()"
                (keydown.escape)="finishNodeEdit()"
                (blur)="finishNodeEdit()"
                (pointerdown)="$event.stopPropagation()"
                autofocus
              />

              <!-- Indicador "origen" en modo conexión -->
              <span
                *ngIf="pendingFromNodeId === node.id"
                class="absolute -top-2 -right-2 size-4 rounded-full bg-primary border-2 border-background-dark flex items-center justify-center"
                title="Cuadro origen seleccionado">
                <mat-icon class="text-[10px] text-white">radio_button_checked</mat-icon>
              </span>
            </div>

            <!-- Overlay de instrucción cuando no hay nodos -->
            <div *ngIf="nodes.length === 0"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 pointer-events-none">
              <mat-icon class="text-5xl opacity-30">account_tree</mat-icon>
              <p class="text-sm">Haz clic en "Nuevo Cuadro" para comenzar</p>
            </div>
          </div>

          <!-- Footer de atajos -->
          <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3">
            <span class="text-xs text-gray-500 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">2× clic</kbd>
              Editar texto
            </span>
            <span class="text-xs text-gray-500 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">clic línea</kbd>
              Seleccionar / mover curva
            </span>
            <span class="text-xs text-gray-500 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">ESC</kbd>
              Cancelar modo
            </span>
            <span class="text-xs text-gray-500 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">arrastrar</kbd>
              Mover cuadros
            </span>
          </div>
        </section>
      </div>
    </div>
  `
})
export class MindMapsComponent {
  @ViewChild('canvasRef')
  private canvasRef?: ElementRef<HTMLDivElement>;

  readonly canvasWidth = 900;
  readonly canvasHeight = 460;

  nodes: MindMapNode[] = [
    {
      id: 'root',
      label: 'Objetivo Principal',
      x: 355,
      y: 190,
      w: 190,
      h: 52,
      styleClass: 'border-primary/40 bg-primary/20 text-white font-bold'
    },
    {
      id: 'market',
      label: 'Investigación de Mercado',
      x: 90,
      y: 80,
      w: 220,
      h: 52,
      styleClass: 'border-blue-400/40 bg-blue-500/10 text-blue-300'
    },
    {
      id: 'priority',
      label: 'Priorización de Features',
      x: 90,
      y: 310,
      w: 220,
      h: 52,
      styleClass: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
    },
    {
      id: 'brand',
      label: 'Narrativa de Marca',
      x: 590,
      y: 80,
      w: 200,
      h: 52,
      styleClass: 'border-orange-400/40 bg-orange-500/10 text-orange-300'
    },
    {
      id: 'execution',
      label: 'Plan de Ejecución',
      x: 590,
      y: 310,
      w: 190,
      h: 52,
      styleClass: 'border-pink-400/40 bg-pink-500/10 text-pink-300'
    }
  ];

  links: MindMapLink[] = [
    { id: 'l1', from: 'root', to: 'market',    curveOffsetX: 0, curveOffsetY: 0 },
    { id: 'l2', from: 'root', to: 'priority',  curveOffsetX: 0, curveOffsetY: 0 },
    { id: 'l3', from: 'root', to: 'brand',     curveOffsetX: 0, curveOffsetY: 0 },
    { id: 'l4', from: 'root', to: 'execution', curveOffsetX: 0, curveOffsetY: 0 }
  ];

  private draggingNodeId: string | null = null;
  private adjustingLinkId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private linkOffsetX = 0;
  private linkOffsetY = 0;
  selectedNodeId: string | null = null;
  selectedLinkId: string | null = null;
  linkCreationMode = false;
  pendingFromNodeId: string | null = null;
  private nodeCounter = this.nodes.length;
  private linkCounter = this.links.length;
  editingNodeId: string | null = null;

  // ─── ESC cancela modo conexión ───
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.linkCreationMode) {
        this.linkCreationMode = false;
        this.pendingFromNodeId = null;
      }
      if (this.editingNodeId) {
        this.finishNodeEdit();
      }
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !this.editingNodeId) {
      if (this.selectedLinkId) {
        this.deleteSelectedLink();
      } else if (this.selectedNodeId && this.selectedNodeId !== 'root') {
        this.deleteSelectedNode();
      }
    }
  }

  trackNode = (_: number, node: MindMapNode): string => node.id;
  trackLink = (_: number, link: MindMapLink): string => link.id;

  getNodeLabel(nodeId: string): string {
    return this.findNode(nodeId)?.label ?? '';
  }

  startDrag(event: PointerEvent, nodeId: string): void {
    if (this.linkCreationMode || this.editingNodeId === nodeId) return;

    const node = this.findNode(nodeId);
    const canvas = this.canvasRef?.nativeElement;
    if (!node || !canvas) return;

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
    if (!link || !canvasPoint) return;

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
      if (!link || !canvasPoint) return;

      const { mid } = this.getLinkGeometry(link);
      link.curveOffsetX = canvasPoint.x - this.linkOffsetX - mid.x;
      link.curveOffsetY = canvasPoint.y - this.linkOffsetY - mid.y;
      return;
    }

    if (!this.draggingNodeId) return;

    const canvas = this.canvasRef?.nativeElement;
    const node = this.findNode(this.draggingNodeId);
    if (!canvas || !node) return;

    const rect = canvas.getBoundingClientRect();
    node.x = this.clamp(event.clientX - rect.left - this.dragOffsetX, 0, this.canvasWidth - node.w);
    node.y = this.clamp(event.clientY - rect.top - this.dragOffsetY, 0, this.canvasHeight - node.h);
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    this.draggingNodeId = null;
    this.adjustingLinkId = null;
  }

  addNode(): void {
    this.nodeCounter += 1;
    const nextId = `node-${this.nodeCounter}`;
    const colors = [
      'border-indigo-400/40 bg-indigo-500/10 text-indigo-300',
      'border-cyan-400/40 bg-cyan-500/10 text-cyan-300',
      'border-yellow-400/40 bg-yellow-500/10 text-yellow-300',
      'border-rose-400/40 bg-rose-500/10 text-rose-300',
    ];
    const newNode: MindMapNode = {
      id: nextId,
      label: `Idea ${this.nodeCounter - 4}`,
      x: this.clamp(160 + (this.nodeCounter % 5) * 80, 0, this.canvasWidth - 160),
      y: this.clamp(40 + (this.nodeCounter % 4) * 90, 0, this.canvasHeight - 52),
      w: 160,
      h: 52,
      styleClass: colors[this.nodeCounter % colors.length]
    };

    this.nodes = [...this.nodes, newNode];
    this.links = [
      ...this.links,
      { id: this.createLinkId(), from: 'root', to: nextId, curveOffsetX: 0, curveOffsetY: 0 }
    ];

    // Seleccionar el nuevo nodo automáticamente
    this.selectedNodeId = nextId;
    this.selectedLinkId = null;
  }

  startNodeEdit(event: MouseEvent, nodeId: string): void {
    this.editingNodeId = nodeId;
    event.stopPropagation();
  }

  updateNodeLabel(nodeId: string, event: Event): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    node.label = (event.target as HTMLInputElement).value;
  }

  finishNodeEdit(): void {
    this.editingNodeId = null;
  }

  toggleLinkMode(): void {
    this.linkCreationMode = !this.linkCreationMode;
    this.pendingFromNodeId = null;
    this.selectedLinkId = null;
  }

  handleNodeClick(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.selectedNodeId = nodeId;
    this.selectedLinkId = null;

    if (!this.linkCreationMode) return;

    if (!this.pendingFromNodeId) {
      this.pendingFromNodeId = nodeId;
      return;
    }
    if (this.pendingFromNodeId === nodeId) return;

    const exists = this.links.some(
      l => (l.from === this.pendingFromNodeId && l.to === nodeId) ||
           (l.from === nodeId && l.to === this.pendingFromNodeId)
    );

    if (!exists) {
      this.links = [
        ...this.links,
        { id: this.createLinkId(), from: this.pendingFromNodeId, to: nodeId, curveOffsetX: 0, curveOffsetY: 0 }
      ];
    }

    this.pendingFromNodeId = null;
    this.linkCreationMode = false;
  }

  selectLink(event: MouseEvent, linkId: string): void {
    event.stopPropagation();
    this.selectedLinkId = linkId;
    this.selectedNodeId = null;
    this.pendingFromNodeId = null;
  }

  deleteSelectedLink(): void {
    if (!this.selectedLinkId) return;
    this.links = this.links.filter(l => l.id !== this.selectedLinkId);
    this.selectedLinkId = null;
  }

  deleteSelectedNode(): void {
    if (!this.selectedNodeId || this.selectedNodeId === 'root') return;
    const id = this.selectedNodeId;
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.links = this.links.filter(l => l.from !== id && l.to !== id);
    this.selectedNodeId = null;
    this.selectedLinkId = null;
    this.pendingFromNodeId = null;
  }

  onCanvasClick(): void {
    this.selectedNodeId = null;
    this.selectedLinkId = null;
    if (!this.linkCreationMode) this.pendingFromNodeId = null;
  }

  getLinkPath(link: MindMapLink): string {
    const { start, end, control } = this.getLinkGeometry(link);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }

  getLinkControlPoint(link: MindMapLink): Point {
    const { mid } = this.getLinkGeometry(link);
    return { x: mid.x + link.curveOffsetX, y: mid.y + link.curveOffsetY };
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

    return { start, end, mid, control: { x: mid.x + link.curveOffsetX, y: mid.y + link.curveOffsetY } };
  }

  private getNodeCenter(node: MindMapNode): Point {
    return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  }

  private getEdgePoint(node: MindMapNode, toward: Point): Point {
    const center = this.getNodeCenter(node);
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (dx === 0 && dy === 0) return center;

    const tx = dx === 0 ? Infinity : (node.w / 2) / Math.abs(dx);
    const ty = dy === 0 ? Infinity : (node.h / 2) / Math.abs(dy);
    const t = Math.min(tx, ty);

    return { x: center.x + dx * t, y: center.y + dy * t };
  }

  private getCanvasPoint(event: PointerEvent): Point | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: this.clamp(event.clientX - rect.left, 0, this.canvasWidth),
      y: this.clamp(event.clientY - rect.top, 0, this.canvasHeight)
    };
  }

  private findLink(id: string): MindMapLink | undefined {
    return this.links.find(l => l.id === id);
  }

  private createLinkId(): string {
    this.linkCounter += 1;
    return `l${this.linkCounter}`;
  }

  private findNode(id: string): MindMapNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}