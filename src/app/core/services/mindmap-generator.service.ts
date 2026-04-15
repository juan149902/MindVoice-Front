import { Injectable } from '@angular/core';
import { AiAnalysisEntity } from './audio-workflow.service';

export interface MindmapNode {
  id: string;
  label: string;
  data?: Record<string, unknown>;
  level: number;
  type: 'root' | 'topic' | 'subtopic' | 'action' | 'insight';
}

export interface MindmapGraph {
  nodes: MindmapNode[];
  links: Array<{ source: string; target: string }>;
}

@Injectable({ providedIn: 'root' })
export class MindmapGeneratorService {
  generateGraphFromAnalysis(analysis: AiAnalysisEntity): MindmapGraph {
    const nodes: MindmapNode[] = [];
    const links: Array<{ source: string; target: string }> = [];
    const rootId = `root-${analysis._id}`;
    
    let nodeId = 0;

    // Root node
    nodes.push({
      id: rootId,
      label: 'Análisis',
      level: 0,
      type: 'root',
    });

    // Resumen
    if (analysis.result.resumen) {
      const resumenId = `resumen-${nodeId++}`;
      nodes.push({
        id: resumenId,
        label: analysis.result.resumen,
        level: 1,
        type: 'topic',
      });
      links.push({ source: rootId, target: resumenId });
    }

    // Temas
    if (analysis.result.temas && analysis.result.temas.length > 0) {
      const temasId = `temas-${nodeId++}`;
      nodes.push({
        id: temasId,
        label: 'Temas',
        level: 1,
        type: 'topic',
      });
      links.push({ source: rootId, target: temasId });

      analysis.result.temas.forEach((tema) => {
        if (!tema) return;
        const temaId = `tema-${nodeId++}`;
        nodes.push({
          id: temaId,
          label: tema,
          level: 2,
          type: 'subtopic',
        });
        links.push({ source: temasId, target: temaId });
      });
    }

    // Acciones
    if (analysis.result.acciones && analysis.result.acciones.length > 0) {
      const accionesId = `acciones-${nodeId++}`;
      nodes.push({
        id: accionesId,
        label: 'Acciones',
        level: 1,
        type: 'topic',
      });
      links.push({ source: rootId, target: accionesId });

      analysis.result.acciones.forEach((accion) => {
        const accionId = `accion-${nodeId++}`;
        const label = `${accion.accion} (${accion.prioridad || 'media'})`;
        nodes.push({
          id: accionId,
          label,
          level: 2,
          type: 'action',
        });
        links.push({ source: accionesId, target: accionId });
      });
    }

    // Sentimiento
    if (analysis.result.sentimiento) {
      const sentimentoId = `sentimiento-${nodeId++}`;
      nodes.push({
        id: sentimentoId,
        label: `Sentimiento: ${analysis.result.sentimiento}`,
        level: 1,
        type: 'insight',
      });
      links.push({ source: rootId, target: sentimentoId });
    }

    return { nodes, links };
  }

  getNodeColor(type: MindmapNode['type']): string {
    const colors: Record<string, string> = {
      root: '#3b82f6',      // blue-500
      topic: '#8b5cf6',     // violet-500
      subtopic: '#ec4899',  // pink-500
      action: '#f59e0b',    // amber-500
      insight: '#10b981',   // emerald-500
    };
    return colors[type] || '#6b7280';
  }

  getNodeSize(type: MindmapNode['type']): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      root: { width: 120, height: 60 },
      topic: { width: 100, height: 50 },
      subtopic: { width: 90, height: 45 },
      action: { width: 100, height: 50 },
      insight: { width: 100, height: 50 },
    };
    return sizes[type] || { width: 80, height: 40 };
  }
}
