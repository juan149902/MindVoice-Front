import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, of } from 'rxjs';
import { AiAnalysisEntity, AudioWorkflowService } from './audio-workflow.service';
import {
  MindmapCanvasPayload,
  MindmapCanvasNodePayload,
  MindmapWorkflowService,
  MindmapWorkspaceItem,
} from './mindmap-workflow.service';

interface CreateArtifactsInput {
  audioId: string;
  audioFileName: string;
  transcriptionId: string;
  transcriptionText: string;
  analysis: AiAnalysisEntity;
}

@Injectable({ providedIn: 'root' })
export class AnalysisArtifactsService {
  private readonly mindmapWorkflow = inject(MindmapWorkflowService);
  private readonly audioWorkflow = inject(AudioWorkflowService);

  createProfessionalArtifacts(input: CreateArtifactsInput): Observable<MindmapWorkspaceItem> {
    const analysis = input.analysis;

    // Validate mindmap completeness before building
    if (this.isMindmapDataIncomplete(analysis)) {
      // Use backend AI to enrich analysis before building the mindmap
      return this.audioWorkflow.analyzeText(input.transcriptionText).pipe(
        switchMap((enrichedResult) => {
          const enrichedAnalysis: AiAnalysisEntity = {
            ...analysis,
            result: {
              resumen: analysis.result.resumen || enrichedResult.report_ready_text || enrichedResult.executive_summary?.join('\n\n') || 'Sin resumen',
              temas: analysis.result.temas?.length ? analysis.result.temas : [
                ...(enrichedResult.tags || []),
                ...(enrichedResult.semantic_keywords || []),
                ...(enrichedResult.key_insights || []),
              ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10),
              acciones: analysis.result.acciones?.length ? analysis.result.acciones : (enrichedResult.task_list || []).map(t => ({
                accion: t.task || '',
                prioridad: t.priority || 'media',
              })).filter(a => a.accion.trim().length > 0),
              sentimiento: analysis.result.sentimiento || enrichedResult.sentiment,
            },
          };
          return this.buildAndCreateMindmap({ ...input, analysis: enrichedAnalysis });
        }),
        // If enrichment fails, build mindmap with whatever data we have
        switchMap((result) => of(result)),
      );
    }

    return this.buildAndCreateMindmap(input);
  }

  private isMindmapDataIncomplete(analysis: AiAnalysisEntity): boolean {
    const hasResumen = !!analysis.result.resumen?.trim();
    const hasTemas = !!(analysis.result.temas?.length);
    const hasAcciones = !!(analysis.result.acciones?.length);
    // Incomplete if has summary but missing BOTH topics and actions (mindmap would be too sparse)
    return hasResumen && !hasTemas && !hasAcciones;
  }

  private buildAndCreateMindmap(input: CreateArtifactsInput): Observable<MindmapWorkspaceItem> {
    const title = this.buildTitle(input.audioFileName, input.analysis);
    const canvas = this.buildCanvas(title, input.analysis);
    const content = this.buildStructuredDocumentContent(input, title);

    return this.mindmapWorkflow.createMindmap(title, canvas, content);
  }

  private buildTitle(fileName: string, analysis: AiAnalysisEntity): string {
    // Use backend title if available
    const backendTitle = (analysis.result as Record<string, any>)['title'];
    if (typeof backendTitle === 'string' && backendTitle.trim()) {
      return `Informe IA - ${backendTitle.trim().slice(0, 60)}`;
    }
    const baseName = fileName.replace(/\.[^.]+$/, '').trim();
    const shortSummary = analysis.result.resumen?.trim().slice(0, 60) || '';
    if (shortSummary.length > 0) {
      return `Informe IA - ${shortSummary}`;
    }
    return `Informe IA - ${baseName || 'Audio'}`;
  }

  private buildStructuredDocumentContent(input: CreateArtifactsInput, title: string): Record<string, unknown> {
    const r = input.analysis.result as Record<string, any>;
    const actions = (input.analysis.result.acciones || []).map((item, index) => ({
      orden: index + 1,
      accion: item.accion,
      prioridad: item.prioridad || 'media',
    }));

    const topics = (input.analysis.result.temas || []).slice(0, 10);
    const sentiment = input.analysis.result.sentimiento || 'No clasificado';

    return {
      schema: 'mindvoice-professional-report-v1',
      title,
      source: {
        audioId: input.audioId,
        audioFileName: input.audioFileName,
        transcriptionId: input.transcriptionId,
        analysisId: input.analysis._id || null,
      },
      generatedAt: new Date().toISOString(),
      sections: {
        executiveSummary: Array.isArray(r['executive_summary'])
          ? r['executive_summary'].join('\n\n')
          : (input.analysis.result.resumen || 'Sin resumen disponible.'),
        reportReadyText: typeof r['report_ready_text'] === 'string' ? r['report_ready_text'] : '',
        keyInsights: Array.isArray(r['key_insights']) ? r['key_insights'] : [],
        keyTopics: topics,
        actionPlan: actions,
        sentiment,
        transcript: input.transcriptionText,
        semanticKeywords: Array.isArray(r['semantic_keywords']) ? r['semantic_keywords'] : [],
      },
      markdown: this.buildMarkdown(input, topics, actions, sentiment),
    };
  }

  private buildMarkdown(
    input: CreateArtifactsInput,
    topics: string[],
    actions: { orden: number; accion: string; prioridad: string }[],
    sentiment: string,
  ): string {
    const topicLines = topics.length
      ? topics.map((topic) => `- ${topic}`).join('\n')
      : '- Sin temas detectados';

    const actionLines = actions.length
      ? actions.map((action) => `${action.orden}. ${action.accion} (Prioridad: ${action.prioridad})`).join('\n')
      : '1. Sin acciones detectadas';

    return [
      `# Informe IA - ${input.audioFileName}`,
      '',
      '## Resumen Ejecutivo',
      input.analysis.result.resumen || 'Sin resumen disponible.',
      '',
      '## Temas Clave',
      topicLines,
      '',
      '## Plan de Acción',
      actionLines,
      '',
      `## Sentimiento\n${sentiment}`,
      '',
      '## Transcripción',
      input.transcriptionText || 'Sin transcripción disponible.',
    ].join('\n');
  }

  private buildCanvas(title: string, analysis: AiAnalysisEntity): MindmapCanvasPayload {
    // Use backend-generated mind_map_nodes if available
    const backendNodes = (analysis.result as Record<string, any>)['mind_map_nodes'];
    if (Array.isArray(backendNodes) && backendNodes.length > 0) {
      return this.buildCanvasFromBackendNodes(title, backendNodes);
    }
    return this.buildCanvasFromAnalysis(title, analysis);
  }

  private buildCanvasFromBackendNodes(
    title: string,
    backendNodes: { id: string; label: string; parentId: string | null }[],
  ): MindmapCanvasPayload {
    const nodes: MindmapCanvasNodePayload[] = [];
    const edges: MindmapCanvasPayload['edges'] = [];

    // Build tree levels for positioning
    const rootNodes = backendNodes.filter(n => !n.parentId);
    const childMap = new Map<string, typeof backendNodes>();
    backendNodes.forEach(n => {
      if (n.parentId) {
        const siblings = childMap.get(n.parentId) || [];
        siblings.push(n);
        childMap.set(n.parentId, siblings);
      }
    });

    // Position root(s) at top center
    rootNodes.forEach((root, ri) => {
      nodes.push({
        id: root.id,
        label: this.truncate(root.label, 70),
        x: 580 + ri * 300,
        y: 80,
        w: 260,
        h: 62,
        styleClass: 'node-root',
      });

      // Position level-1 children
      const l1Children = childMap.get(root.id) || [];
      const l1StartX = 580 + ri * 300 - (l1Children.length - 1) * 150;
      l1Children.forEach((child, ci) => {
        nodes.push({
          id: child.id,
          label: this.truncate(child.label, 60),
          x: l1StartX + ci * 300,
          y: 220,
          w: 200,
          h: 56,
          styleClass: 'node-topics',
        });
        edges.push({ id: `e-${root.id}-${child.id}`, from: root.id, to: child.id, curveOffsetX: 0, curveOffsetY: 0 });

        // Position level-2 children
        const l2Children = childMap.get(child.id) || [];
        l2Children.forEach((grandChild, gi) => {
          nodes.push({
            id: grandChild.id,
            label: this.truncate(grandChild.label, 55),
            x: l1StartX + ci * 300 - 60 + gi * 130,
            y: 360 + gi * 70,
            w: 190,
            h: 50,
            styleClass: 'node-topic-item',
          });
          edges.push({ id: `e-${child.id}-${grandChild.id}`, from: child.id, to: grandChild.id, curveOffsetX: 0, curveOffsetY: 0 });
        });
      });
    });

    return { nodes, edges };
  }

  private buildCanvasFromAnalysis(title: string, analysis: AiAnalysisEntity): MindmapCanvasPayload {
    const nodes: MindmapCanvasNodePayload[] = [];
    const edges: MindmapCanvasPayload['edges'] = [];

    nodes.push({
      id: 'root',
      label: title.slice(0, 70),
      x: 580,
      y: 120,
      w: 260,
      h: 62,
      styleClass: 'node-root',
    });

    nodes.push({
      id: 'summary',
      label: this.truncate(analysis.result.resumen || 'Sin resumen', 90),
      x: 580,
      y: 250,
      w: 320,
      h: 74,
      styleClass: 'node-summary',
    });
    edges.push({ id: 'edge-root-summary', from: 'root', to: 'summary', curveOffsetX: 0, curveOffsetY: 0 });

    const topics = (analysis.result.temas || []).slice(0, 5);
    if (topics.length > 0) {
      nodes.push({
        id: 'topics',
        label: 'Temas Clave',
        x: 290,
        y: 250,
        w: 180,
        h: 56,
        styleClass: 'node-topics',
      });
      edges.push({ id: 'edge-root-topics', from: 'root', to: 'topics', curveOffsetX: 0, curveOffsetY: 0 });

      topics.forEach((topic, index) => {
        const topicId = `topic-${index + 1}`;
        nodes.push({
          id: topicId,
          label: this.truncate(topic, 60),
          x: 90,
          y: 340 + index * 78,
          w: 200,
          h: 52,
          styleClass: 'node-topic-item',
        });
        edges.push({
          id: `edge-topics-${index + 1}`,
          from: 'topics',
          to: topicId,
          curveOffsetX: 0,
          curveOffsetY: 0,
        });
      });
    }

    const actions = (analysis.result.acciones || []).slice(0, 5);
    if (actions.length > 0) {
      nodes.push({
        id: 'actions',
        label: 'Acciones',
        x: 870,
        y: 250,
        w: 180,
        h: 56,
        styleClass: 'node-actions',
      });
      edges.push({ id: 'edge-root-actions', from: 'root', to: 'actions', curveOffsetX: 0, curveOffsetY: 0 });

      actions.forEach((action, index) => {
        const actionId = `action-${index + 1}`;
        nodes.push({
          id: actionId,
          label: this.truncate(`${action.accion} [${action.prioridad || 'media'}]`, 72),
          x: 980,
          y: 340 + index * 78,
          w: 250,
          h: 54,
          styleClass: 'node-action-item',
        });
        edges.push({
          id: `edge-actions-${index + 1}`,
          from: 'actions',
          to: actionId,
          curveOffsetX: 0,
          curveOffsetY: 0,
        });
      });
    }

    const sentiment = analysis.result.sentimiento?.trim();
    if (sentiment) {
      nodes.push({
        id: 'sentiment',
        label: `Sentimiento: ${this.truncate(sentiment, 50)}`,
        x: 580,
        y: 520,
        w: 260,
        h: 52,
        styleClass: 'node-sentiment',
      });
      edges.push({ id: 'edge-root-sentiment', from: 'root', to: 'sentiment', curveOffsetX: 0, curveOffsetY: 0 });
    }

    return { nodes, edges };
  }

  private truncate(value: string, max: number): string {
    const normalized = value.trim();
    if (normalized.length <= max) {
      return normalized;
    }
    return `${normalized.slice(0, max - 3).trimEnd()}...`;
  }
}
