import { Component, Input, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, PLATFORM_ID, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MindmapGeneratorService, MindmapGraph, MindmapNode } from '../../../core/services/mindmap-generator.service';
import { AiAnalysisEntity } from '../../../core/services/audio-workflow.service';
import * as d3 from 'd3';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  level: number;
  type: MindmapNode['type'];
  collapsed?: boolean;
  children?: string[];
  data?: Record<string, unknown>;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

@Component({
  selector: 'app-mindmap-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="w-full h-full space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-white flex items-center gap-2">
          <mat-icon class="text-primary text-lg">account_tree</mat-icon>
          Mapa Mental
        </h3>
        <div class="flex gap-1.5">
          <button type="button"
            class="size-8 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-all flex items-center justify-center"
            (click)="zoomIn()" title="Acercar">
            <mat-icon class="text-base">zoom_in</mat-icon>
          </button>
          <button type="button"
            class="size-8 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-all flex items-center justify-center"
            (click)="zoomOut()" title="Alejar">
            <mat-icon class="text-base">zoom_out</mat-icon>
          </button>
          <button type="button"
            class="size-8 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-all flex items-center justify-center"
            (click)="resetZoom()" title="Centrar">
            <mat-icon class="text-base">fit_screen</mat-icon>
          </button>
          <button type="button"
            class="size-8 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-all flex items-center justify-center"
            (click)="toggleCollapseAll()" [title]="allCollapsed ? 'Expandir todo' : 'Colapsar todo'">
            <mat-icon class="text-base">{{ allCollapsed ? 'unfold_more' : 'unfold_less' }}</mat-icon>
          </button>
        </div>
      </div>
      <div #svgContainer
        class="w-full rounded-xl border border-border-dark bg-background-dark/60 overflow-hidden"
        style="height: 520px; position: relative;">
        @if (!analysis) {
          <div class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            Sin datos de análisis para generar el mapa.
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class MindmapViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() analysis!: AiAnalysisEntity;
  @ViewChild('svgContainer') svgContainer!: ElementRef<HTMLDivElement>;

  private readonly generator = inject(MindmapGeneratorService);
  private readonly platformId = inject(PLATFORM_ID);
  private graph?: MindmapGraph;
  private svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private simulation?: d3.Simulation<D3Node, D3Link>;
  private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private nodes: D3Node[] = [];
  private links: D3Link[] = [];
  private hiddenNodeIds = new Set<string>();
  allCollapsed = false;
  private rendered = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.analysis) {
      this.generateAndRender();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analysis'] && !changes['analysis'].firstChange && this.analysis) {
      this.generateAndRender();
    }
  }

  ngOnDestroy(): void {
    this.simulation?.stop();
  }

  private generateAndRender(): void {
    if (!this.analysis || !this.svgContainer) return;
    this.graph = this.generator.generateGraphFromAnalysis(this.analysis);
    this.render();
  }

  private render(): void {
    if (!this.graph || !this.svgContainer) return;

    // Stop any running simulation before re-rendering
    this.simulation?.stop();

    const container = this.svgContainer.nativeElement;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 520;

    container.querySelectorAll('svg').forEach(s => s.remove());

    this.nodes = this.graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      level: n.level,
      type: n.type,
      data: n.data,
      collapsed: false,
      children: this.graph!.links
        .filter(l => l.source === n.id)
        .map(l => l.target),
    }));

    this.links = this.graph.links.map(l => ({ source: l.source, target: l.target }));
    this.hiddenNodeIds.clear();

    this.svg = d3.select<HTMLDivElement, unknown>(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent');

    // Gradient definitions
    const defs = this.svg.append('defs');
    this.addGradients(defs);

    this.g = this.svg.append('g');

    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => { this.g!.attr('transform', event.transform); });
    this.svg.call(this.zoomBehavior);

    this.simulation = d3.forceSimulation<D3Node, D3Link>(this.nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(this.links)
        .id(d => d.id)
        .distance(d => {
          const src = d.source as D3Node;
          return src.type === 'root' ? 200 : 150;
        }))
      .force('charge', d3.forceManyBody<D3Node>().strength(d => d.type === 'root' ? -1000 : -500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<D3Node>().radius(d => this.getNodeRadius(d) + 25))
      .force('y', d3.forceY<D3Node>(height / 2).strength(0.05))
      .force('x', d3.forceX<D3Node>(width / 2).strength(0.05));

    this.drawGraph();
    this.rendered = true;

    // Let simulation settle then auto-fit
    this.simulation.on('end', () => this.fitToView(width, height));
  }

  private addGradients(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>): void {
    const gradients = [
      { id: 'grad-root', colors: ['#7c3aed', '#6366f1'] },
      { id: 'grad-topic', colors: ['#8b5cf6', '#a78bfa'] },
      { id: 'grad-subtopic', colors: ['#ec4899', '#f472b6'] },
      { id: 'grad-action', colors: ['#f59e0b', '#fbbf24'] },
      { id: 'grad-insight', colors: ['#10b981', '#34d399'] },
    ];

    for (const g of gradients) {
      const grad = defs.append('linearGradient')
        .attr('id', g.id)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', g.colors[0]);
      grad.append('stop').attr('offset', '100%').attr('stop-color', g.colors[1]);
    }

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter()
      .append('feMergeNode').attr('in', d => d);
  }

  private drawGraph(): void {
    if (!this.g) return;
    this.g.selectAll('*').remove();

    const visibleLinks = this.links.filter(l => {
      const srcId = typeof l.source === 'string' ? l.source : (l.source as D3Node).id;
      const tgtId = typeof l.target === 'string' ? l.target : (l.target as D3Node).id;
      return !this.hiddenNodeIds.has(srcId) && !this.hiddenNodeIds.has(tgtId);
    });
    const visibleNodes = this.nodes.filter(n => !this.hiddenNodeIds.has(n.id));

    // Links
    const linkSel = this.g.append('g').attr('class', 'links')
      .selectAll<SVGPathElement, D3Link>('path')
      .data(visibleLinks)
      .enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', '#7c3aed')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round');

    // Node groups
    const nodeGroup = this.g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, D3Node>('g')
      .data(visibleNodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) this.simulation!.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) this.simulation!.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    // Rounded rect backgrounds
    nodeGroup.append('rect')
      .attr('rx', d => d.type === 'root' ? 16 : 12)
      .attr('ry', d => d.type === 'root' ? 16 : 12)
      .attr('width', d => this.getNodeWidth(d))
      .attr('height', d => this.getNodeHeight(d))
      .attr('x', d => -this.getNodeWidth(d) / 2)
      .attr('y', d => -this.getNodeHeight(d) / 2)
      .attr('fill', d => `url(#grad-${d.type})`)
      .attr('fill-opacity', d => d.type === 'root' ? 0.95 : 0.85)
      .attr('stroke', d => this.generator.getNodeColor(d.type))
      .attr('stroke-width', d => d.type === 'root' ? 2.5 : 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('filter', d => d.type === 'root' ? 'url(#glow)' : 'none');

    // Type icon
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => -this.getNodeHeight(d) / 2 + 18)
      .attr('font-size', '10px')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .text(d => this.getTypeIcon(d.type));

    // Label
    nodeGroup.each((d, i, nodes) => {
      const g = d3.select(nodes[i]);
      const maxWidth = this.getNodeWidth(d) - 16;
      const words = (d.label ?? '').split(/\s+/);
      const lineHeight = 14;
      let line = '';
      const lines: string[] = [];

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (test.length * 6.5 > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      const totalHeight = lines.length * lineHeight;
      const startY = -totalHeight / 2 + 6;

      for (let li = 0; li < lines.length; li++) {
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', startY + li * lineHeight)
          .attr('font-size', d.type === 'root' ? '13px' : '11px')
          .attr('font-weight', d.type === 'root' ? '700' : '600')
          .attr('fill', 'white')
          .attr('pointer-events', 'none')
          .text(lines[li]);
      }
    });

    // Expand/collapse indicator for parent nodes
    nodeGroup.filter(d => (d.children?.length ?? 0) > 0)
      .append('circle')
      .attr('cx', d => this.getNodeWidth(d) / 2 - 4)
      .attr('cy', d => -this.getNodeHeight(d) / 2 + 4)
      .attr('r', 8)
      .attr('fill', 'rgba(0,0,0,0.4)')
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer');

    nodeGroup.filter(d => (d.children?.length ?? 0) > 0)
      .append('text')
      .attr('x', d => this.getNodeWidth(d) / 2 - 4)
      .attr('y', d => -this.getNodeHeight(d) / 2 + 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .attr('cursor', 'pointer')
      .text(d => d.collapsed ? '+' : '−');

    // Click to expand/collapse
    nodeGroup.on('click', (event: MouseEvent, d: D3Node) => {
      event.stopPropagation();
      if (!d.children?.length) return;
      d.collapsed = !d.collapsed;
      this.updateVisibility();
      this.drawGraph();
      this.simulation!.alpha(0.3).restart();
    });

    // Hover effects
    nodeGroup.on('mouseenter', (event: MouseEvent) => {
      d3.select(event.currentTarget as SVGGElement).select('rect')
        .transition().duration(150)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1);
    }).on('mouseleave', (event: MouseEvent, d: D3Node) => {
      d3.select(event.currentTarget as SVGGElement).select('rect')
        .transition().duration(150)
        .attr('fill-opacity', d.type === 'root' ? 0.95 : 0.85)
        .attr('stroke-opacity', 0.6);
    });

    // Tick
    this.simulation!.on('tick', () => {
      linkSel.attr('d', (d: D3Link) => {
        const s = d.source as D3Node;
        const t = d.target as D3Node;
        const dx = (t.x ?? 0) - (s.x ?? 0);
        const dy = (t.y ?? 0) - (s.y ?? 0);
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
        return `M${s.x},${s.y}A${dr},${dr} 0 0,1 ${t.x},${t.y}`;
      });
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
  }

  private updateVisibility(): void {
    this.hiddenNodeIds.clear();
    const collectHidden = (parentId: string): void => {
      const parent = this.nodes.find(n => n.id === parentId);
      if (!parent?.collapsed || !parent.children?.length) return;
      for (const childId of parent.children) {
        this.hiddenNodeIds.add(childId);
        collectHidden(childId);
      }
    };
    for (const node of this.nodes) {
      collectHidden(node.id);
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'root': return '◉ Centro';
      case 'topic': return '◆ Tema';
      case 'subtopic': return '○ Subtema';
      case 'action': return '▶ Acción';
      case 'insight': return '★ Insight';
      default: return '';
    }
  }

  private getNodeRadius(d: D3Node): number {
    return d.type === 'root' ? 50 : d.type === 'topic' ? 40 : 30;
  }

  private getNodeWidth(d: D3Node): number {
    const maxWidth = d.type === 'root' ? 220 : d.type === 'topic' ? 200 : 180;
    const base = d.type === 'root' ? 160 : d.type === 'topic' ? 140 : 120;
    const textWidth = (d.label ?? '').length * 6 + 24;
    return Math.min(maxWidth, Math.max(base, textWidth));
  }

  private getNodeHeight(d: D3Node): number {
    const nodeWidth = this.getNodeWidth(d);
    const charWidth = 6.5;
    const maxCharsPerLine = Math.floor((nodeWidth - 16) / charWidth);
    const words = (d.label ?? '').split(/\s+/);
    let lines = 1;
    let currentLineLength = 0;
    for (const word of words) {
      if (currentLineLength > 0 && currentLineLength + 1 + word.length > maxCharsPerLine) {
        lines++;
        currentLineLength = word.length;
      } else {
        currentLineLength += (currentLineLength > 0 ? 1 : 0) + word.length;
      }
    }
    const base = d.type === 'root' ? 60 : 48;
    return Math.max(base, lines * 14 + 30);
  }

  private fitToView(width: number, height: number): void {
    if (!this.svg || !this.g || !this.zoomBehavior) return;
    const bounds = (this.g.node() as SVGGElement)?.getBBox();
    if (!bounds || bounds.width === 0) return;

    const padding = 40;
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
      1.5
    );
    const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
    const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;

    this.svg.transition().duration(500)
      .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  zoomIn(): void {
    if (!this.svg || !this.zoomBehavior) return;
    this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1.3);
  }

  zoomOut(): void {
    if (!this.svg || !this.zoomBehavior) return;
    this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 0.7);
  }

  resetZoom(): void {
    if (!this.svg || !this.svgContainer || !this.zoomBehavior) return;
    const container = this.svgContainer.nativeElement;
    this.fitToView(container.clientWidth || 600, container.clientHeight || 520);
  }

  toggleCollapseAll(): void {
    this.allCollapsed = !this.allCollapsed;
    for (const node of this.nodes) {
      if (node.children?.length) {
        node.collapsed = this.allCollapsed;
      }
    }
    this.updateVisibility();
    this.drawGraph();
    this.simulation?.alpha(0.3).restart();
  }
}
