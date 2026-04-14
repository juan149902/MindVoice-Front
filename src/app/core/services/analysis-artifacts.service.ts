import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AiAnalysisEntity } from './audio-workflow.service';
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

  createProfessionalArtifacts(input: CreateArtifactsInput): Observable<MindmapWorkspaceItem> {
    const title = this.buildTitle(input.audioFileName, input.analysis);
    const canvas = this.buildCanvas(title, input.analysis);
    const content = this.buildStructuredDocumentContent(input, title);

    return this.mindmapWorkflow.createMindmap(title, canvas, content);
  }

  private buildTitle(fileName: string, analysis: AiAnalysisEntity): string {
    const baseName = fileName.replace(/\.[^.]+$/, '').trim();
    const shortSummary = analysis.result.resumen?.trim().slice(0, 60) || '';
    if (shortSummary.length > 0) {
      return `Informe IA - ${shortSummary}`;
    }
    return `Informe IA - ${baseName || 'Audio'}`;
  }

  private buildStructuredDocumentContent(input: CreateArtifactsInput, title: string): Record<string, unknown> {
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
        executiveSummary: input.analysis.result.resumen || 'Sin resumen disponible.',
        keyTopics: topics,
        actionPlan: actions,
        sentiment,
        transcript: input.transcriptionText,
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
