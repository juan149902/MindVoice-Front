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
  template: `
    <div class="p-8 max-w-[1300px] mx-auto w-full">
      <section class="mb-8 flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h2 class="text-white text-3xl font-black tracking-tight">Mapas Mentales</h2>
          <p class="text-gray-400 mt-1">Conecta ideas de tus notas, tareas y resúmenes en un solo lienzo visual.</p>
        </div>
        <div class="flex gap-2 flex-wrap justify-end">
          <button class="h-10 px-4 rounded-lg border border-border-dark bg-surface-dark text-sm font-semibold text-gray-200 hover:bg-white/5 transition-colors">
            Importar desde Resúmenes
          </button>
          <button (click)="addNode()" class="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors flex items-center gap-2">
            <mat-icon class="text-[18px]">add</mat-icon>
            Nuevo Cuadro
          </button>
          <button
            (click)="toggleLinkMode()"
            class="h-10 px-4 rounded-lg border text-sm font-semibold transition-colors flex items-center gap-2"
            [ngClass]="linkCreationMode ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-gray-200 bg-surface-dark hover:bg-white/5'"
          >
            <mat-icon class="text-[18px]">device_hub</mat-icon>
            {{ linkCreationMode ? 'Conectando...' : 'Agregar Linea' }}
          </button>
          <button
            (click)="deleteSelectedLink()"
            [disabled]="!selectedLinkId"
            class="h-10 px-4 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <mat-icon class="text-[18px]">delete_outline</mat-icon>
            Borrar Linea
          </button>
          <button
            (click)="deleteSelectedNode()"
            [disabled]="!selectedNodeId || selectedNodeId === 'root'"
            class="h-10 px-4 rounded-lg border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <mat-icon class="text-[18px]">delete</mat-icon>
            Borrar Cuadro
          </button>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
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
              <p class="text-xs text-gray-500 mt-1">Actualizado hace 3 dias</p>
            </button>
          </div>

          <div class="mt-6 pt-6 border-t border-border-dark">
            <h4 class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Filtros Rapidos</h4>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">Ideas</span>
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">Tareas</span>
              <span class="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold">Resumenes</span>
            </div>
          </div>
        </aside>

        <section class="xl:col-span-3 bg-surface-dark border border-white/5 rounded-2xl p-6 relative overflow-hidden min-h-[560px]">
          <div class="flex items-center justify-between mb-5">
            <div>
              <p class="text-xs text-primary font-bold uppercase tracking-wider">Mapa Activo</p>
              <h3 class="text-xl text-white font-bold">Estrategia Q2</h3>
            </div>
            <div class="flex gap-2">
              <button class="size-9 rounded-lg border border-border-dark text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-center">
                <mat-icon class="text-[18px]">zoom_in</mat-icon>
              </button>
              <button class="size-9 rounded-lg border border-border-dark text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-center">
                <mat-icon class="text-[18px]">zoom_out</mat-icon>
              </button>
              <button class="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-1">
                <mat-icon class="text-[18px]">save</mat-icon>
                Guardar
              </button>
            </div>
          </div>

          <div #canvasRef class="relative h-[460px] rounded-xl border border-border-dark bg-background-dark/60 overflow-hidden select-none" (click)="onCanvasClick()">
            <svg [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight" class="absolute inset-0 w-full h-full">
              <g *ngFor="let link of links; trackBy: trackLink">
                <path
                  [attr.d]="getLinkPath(link)"
                  [attr.stroke]="selectedLinkId === link.id ? '#c4b5fd' : '#7c3aed'"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  class="pointer-events-none"
                />
                <path
                  [attr.d]="getLinkPath(link)"
                  stroke="transparent"
                  stroke-width="14"
                  fill="none"
                  class="cursor-pointer"
                  (click)="selectLink($event, link.id)"
                />
                <circle
                  *ngIf="selectedLinkId === link.id"
                  [attr.cx]="getLinkControlPoint(link).x"
                  [attr.cy]="getLinkControlPoint(link).y"
                  r="6"
                  fill="#1f1533"
                  stroke="#a78bfa"
                  stroke-width="1.5"
                  class="cursor-move"
                  (pointerdown)="startLinkAdjust($event, link.id)"
                />
              </g>
            </svg>

            <div
              *ngFor="let node of nodes; trackBy: trackNode"
              class="absolute cursor-grab active:cursor-grabbing rounded-xl px-4 py-2.5 border font-semibold shadow-lg"
              [ngClass]="node.styleClass"
              [class.ring-2]="selectedNodeId === node.id"
              [class.ring-primary]="selectedNodeId === node.id"
              [style.width.px]="node.w"
              [style.height.px]="node.h"
              [style.transform]="'translate(' + node.x + 'px, ' + node.y + 'px)'"
              (pointerdown)="startDrag($event, node.id)"
              (click)="handleNodeClick($event, node.id)"
              (dblclick)="startNodeEdit($event, node.id)"
            >
              <span *ngIf="editingNodeId !== node.id">{{ node.label }}</span>
              <input
                *ngIf="editingNodeId === node.id"
                class="w-full bg-transparent border-none outline-none text-current text-sm"
                [value]="node.label"
                (input)="updateNodeLabel(node.id, $event)"
                (keydown.enter)="finishNodeEdit()"
                (blur)="finishNodeEdit()"
                (pointerdown)="$event.stopPropagation()"
                autofocus
              />
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-3">Tip: doble clic para editar texto. Usa "Agregar Linea" y luego clic en 2 cuadros para crear conexiones. Selecciona una linea para mover su curva o borrarla.</p>
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
      label: 'Investigacion de Mercado',
      x: 90,
      y: 80,
      w: 220,
      h: 52,
      styleClass: 'border-blue-400/40 bg-blue-500/10 text-blue-300'
    },
    {
      id: 'priority',
      label: 'Priorizacion de Features',
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
      label: 'Plan de Ejecucion',
      x: 590,
      y: 310,
      w: 190,
      h: 52,
      styleClass: 'border-pink-400/40 bg-pink-500/10 text-pink-300'
    }
  ];

  links: MindMapLink[] = [
    { id: 'l1', from: 'root', to: 'market', curveOffsetX: 0, curveOffsetY: 0 },
    { id: 'l2', from: 'root', to: 'priority', curveOffsetX: 0, curveOffsetY: 0 },
    { id: 'l3', from: 'root', to: 'brand', curveOffsetX: 0, curveOffsetY: 0 },
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

  trackNode = (_: number, node: MindMapNode): string => node.id;
  trackLink = (_: number, link: MindMapLink): string => link.id;

  startDrag(event: PointerEvent, nodeId: string): void {
    if (this.linkCreationMode) {
      return;
    }

    if (this.editingNodeId === nodeId) {
      return;
    }

    const node = this.findNode(nodeId);
    if (!node) {
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
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

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
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
    const maxX = this.canvasWidth - node.w;
    const maxY = this.canvasHeight - node.h;

    const nextX = event.clientX - rect.left - this.dragOffsetX;
    const nextY = event.clientY - rect.top - this.dragOffsetY;

    node.x = this.clamp(nextX, 0, maxX);
    node.y = this.clamp(nextY, 0, maxY);
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    this.draggingNodeId = null;
    this.adjustingLinkId = null;
  }

  addNode(): void {
    this.nodeCounter += 1;
    const nextId = `node-${this.nodeCounter}`;
    const newNode: MindMapNode = {
      id: nextId,
      label: `Idea ${this.nodeCounter - 4}`,
      x: 320 + (this.nodes.length % 3) * 60,
      y: 60 + (this.nodes.length % 4) * 70,
      w: 160,
      h: 52,
      styleClass: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
    };

    this.nodes = [...this.nodes, newNode];
    this.links = [
      ...this.links,
      {
        id: this.createLinkId(),
        from: 'root',
        to: nextId,
        curveOffsetX: 0,
        curveOffsetY: 0
      }
    ];
  }

  startNodeEdit(event: MouseEvent, nodeId: string): void {
    this.editingNodeId = nodeId;
    event.stopPropagation();
  }

  updateNodeLabel(nodeId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const node = this.findNode(nodeId);
    if (!node) {
      return;
    }

    node.label = input.value;
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

    const exists = this.links.some(
      link =>
        (link.from === this.pendingFromNodeId && link.to === nodeId) ||
        (link.from === nodeId && link.to === this.pendingFromNodeId)
    );

    if (!exists) {
      this.links = [
        ...this.links,
        {
          id: this.createLinkId(),
          from: this.pendingFromNodeId,
          to: nodeId,
          curveOffsetX: 0,
          curveOffsetY: 0
        }
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
    if (!this.selectedLinkId) {
      return;
    }

    this.links = this.links.filter(link => link.id !== this.selectedLinkId);
    this.selectedLinkId = null;
  }

  deleteSelectedNode(): void {
    if (!this.selectedNodeId || this.selectedNodeId === 'root') {
      return;
    }

    const nodeId = this.selectedNodeId;
    this.nodes = this.nodes.filter(node => node.id !== nodeId);
    this.links = this.links.filter(link => link.from !== nodeId && link.to !== nodeId);

    this.selectedNodeId = null;
    this.selectedLinkId = null;
    this.pendingFromNodeId = null;
  }

  onCanvasClick(): void {
    this.selectedNodeId = null;
    this.selectedLinkId = null;

    if (!this.linkCreationMode) {
      this.pendingFromNodeId = null;
    }
  }

  getLinkPath(link: MindMapLink): string {
    const { start, end, control } = this.getLinkGeometry(link);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }

  getLinkControlPoint(link: MindMapLink): Point {
    const { mid } = this.getLinkGeometry(link);
    return {
      x: mid.x + link.curveOffsetX,
      y: mid.y + link.curveOffsetY
    };
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
    const mid = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };

    return {
      start,
      end,
      mid,
      control: {
        x: mid.x + link.curveOffsetX,
        y: mid.y + link.curveOffsetY
      }
    };
  }

  private getNodeCenter(node: MindMapNode): Point {
    return {
      x: node.x + node.w / 2,
      y: node.y + node.h / 2
    };
  }

  private getEdgePoint(node: MindMapNode, toward: Point): Point {
    const center = this.getNodeCenter(node);
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;

    if (dx === 0 && dy === 0) {
      return center;
    }

    const halfW = node.w / 2;
    const halfH = node.h / 2;
    const tx = dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx);
    const ty = dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy);
    const t = Math.min(tx, ty);

    return {
      x: center.x + dx * t,
      y: center.y + dy * t
    };
  }

  private getCanvasPoint(event: PointerEvent): Point | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: this.clamp(event.clientX - rect.left, 0, this.canvasWidth),
      y: this.clamp(event.clientY - rect.top, 0, this.canvasHeight)
    };
  }

  private findLink(linkId: string): MindMapLink | undefined {
    return this.links.find(link => link.id === linkId);
  }

  private createLinkId(): string {
    this.linkCounter += 1;
    return `l${this.linkCounter}`;
  }

  private findNode(nodeId: string): MindMapNode | undefined {
    return this.nodes.find(node => node.id === nodeId);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
