import { Component, Input, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MindmapGeneratorService, MindmapGraph, MindmapNode } from '../../../core/services/mindmap-generator.service';
import { AiAnalysisEntity } from '../../../core/services/audio-workflow.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-mindmap-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="w-full h-full space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-white">Mapa Mental</h3>
        <div class="flex gap-2">
          <button
            type="button"
            class="h-8 px-2 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors"
            (click)="zoomIn()"
          >
            <mat-icon class="text-base">zoom_in</mat-icon>
          </button>
          <button
            type="button"
            class="h-8 px-2 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors"
            (click)="zoomOut()"
          >
            <mat-icon class="text-base">zoom_out</mat-icon>
          </button>
          <button
            type="button"
            class="h-8 px-2 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors"
            (click)="resetZoom()"
          >
            <mat-icon class="text-base">fit_screen</mat-icon>
          </button>
        </div>
      </div>
      <div #svgContainer class="w-full rounded-lg border border-border-dark bg-background-dark/40 overflow-hidden" style="height: 500px;"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class MindmapViewerComponent implements OnInit {
  @Input() analysis!: AiAnalysisEntity;
  @ViewChild('svgContainer') svgContainer!: ElementRef;

  private generator = inject(MindmapGeneratorService);
  private graph?: MindmapGraph;
  private svg?: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
  private simulation?: d3.Simulation<any, undefined>;
  private zoomLevel = 1;

  ngOnInit(): void {
    this.generateAndRender();
  }

  private generateAndRender(): void {
    if (!this.analysis) return;

    this.graph = this.generator.generateGraphFromAnalysis(this.analysis);
    setTimeout(() => this.render(), 100);
  }

  private render(): void {
    if (!this.graph || !this.svgContainer) return;

    const container = this.svgContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    container.innerHTML = '';

    this.svg = d3
      .select<HTMLDivElement, unknown>(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'mindmap-svg')
      .on('wheel', (event: WheelEvent) => this.handleWheel(event)) as any;

    const g = (this.svg?.append('g').attr('class', 'mindmap-group')) as any;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        g?.attr('transform', event.transform);
      });

    this.svg?.call(zoom);

    this.simulation = d3
      .forceSimulation(this.graph.nodes as any)
      .force('link', d3.forceLink(this.graph.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50)) as any;

    const link = g
      ?.selectAll('line')
      .data(this.graph.links)
      .enter()
      .append('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    this.svg?.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#4b5563');

    const node = g
      ?.selectAll('circle')
      .data(this.graph.nodes)
      .enter()
      .append('circle')
      .attr('r', (d: MindmapNode) => this.generator.getNodeSize(d.type).width / 2)
      .attr('fill', (d: MindmapNode) => this.generator.getNodeColor(d.type))
      .attr('opacity', 0.8)
      .attr('class', 'mindmap-node')
      .on('mouseover', (event: any, d: any) => {
        d3.select(event.currentTarget).attr('opacity', 1).attr('r', 30);
      })
      .on('mouseout', (event: any, d: any) => {
        d3.select(event.currentTarget).attr('opacity', 0.8).attr('r', 25);
      });

    const label = g
      ?.selectAll('text')
      .data(this.graph.nodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('class', 'mindmap-label')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d: MindmapNode) => d.label);

    this.simulation?.on('tick', () => {
      link
        ?.attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node?.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      label?.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    node?.call(
      d3
        .drag<any, MindmapNode>()
        .on('start', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0.3).restart();
          (d as any).fx = (d as any).x;
          (d as any).fy = (d as any).y;
        })
        .on('drag', (event, d) => {
          (d as any).fx = event.x;
          (d as any).fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0);
          (d as any).fx = null;
          (d as any).fy = null;
        })
    );
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.2, 3);
    this.applyZoom();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.2, 0.5);
    this.applyZoom();
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.applyZoom();
  }

  private applyZoom(): void {
    if (!this.svg) return;
    const container = this.svgContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.svg.transition().duration(250).call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(this.zoomLevel)
        .translate(-width / 2, -height / 2)
    );
  }
}
