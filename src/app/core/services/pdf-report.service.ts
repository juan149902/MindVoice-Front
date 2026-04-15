import { Injectable } from '@angular/core';
import { MINDVOICE_LOGO_BASE64, BRAND } from '../constants/brand';
import { AiAnalysisEntity, AnalysisResult, TranscriptionEntity, AudioEntity } from './audio-workflow.service';

/**
 * Professional PDF report generator compatible with MindVoice mobile app
 * (Flutter PdfExportService). Uses same data source: task_list[{task, priority}],
 * executive_summary[], key_insights[], tags[], etc.
 */
@Injectable({ providedIn: 'root' })
export class PdfReportService {

  /**
   * Generates and downloads a professional MindVoice AI report PDF.
   * Structure mirrors the Flutter PdfExportService output:
   *   Header → Title → Executive Summary → Tasks → Key Insights → Tags → Transcription → Footer
   */
  async exportAnalysisReport(
    analysis: AiAnalysisEntity,
    transcription?: TranscriptionEntity,
    audio?: AudioEntity,
  ): Promise<void> {
    console.log('[PdfReport] Starting PDF generation for analysis:', analysis._id);
    const { jsPDF } = await import('jspdf');
    console.log('[PdfReport] jsPDF imported successfully');
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 0;

    const result = analysis.result ?? {} as AnalysisResult;

    // --- Helpers ---
    const checkPage = (need: number) => {
      if (y + need > pageH - 18) { doc.addPage(); y = 14; }
    };

    const drawDivider = (color = '#e2e8f0') => {
      checkPage(10);
      doc.setDrawColor(color);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
    };

    const sectionHeader = (title: string) => {
      checkPage(20);
      // Purple accent bar
      doc.setFillColor(BRAND.purple);
      doc.roundedRect(margin, y - 5, 3, 12, 1, 1, 'F');
      // Section title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND.purpleDark);
      doc.text(title, margin + 8, y + 3);
      // Underline
      doc.setDrawColor(BRAND.purple);
      doc.setLineWidth(0.5);
      doc.line(margin + 8, y + 6, margin + 8 + Math.min(doc.getTextWidth(title), 80), y + 6);
      y += 16;
    };

    const bodyText = (text: string, indent = 0) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.slate700);
      const lines = doc.splitTextToSize(text, contentW - indent);
      for (const line of lines) {
        checkPage(6);
        doc.text(line, margin + indent, y);
        y += 5.5;
      }
    };

    // ==================== HEADER BAR ====================
    doc.setFillColor(BRAND.purpleDark);
    doc.rect(0, 0, pageW, 34, 'F');
    // Logo
    try { doc.addImage(MINDVOICE_LOGO_BASE64, 'PNG', margin - 2, 5, 24, 24); } catch { /* optional */ }
    // Title text
    doc.setTextColor('#ffffff');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MINDVOICE AI', margin + 26, 17);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Inteligencia Artificial', margin + 26, 25);
    // Date
    const dateStr = analysis.createdAt
      ? new Date(analysis.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(9);
    doc.text(dateStr, pageW - margin, 15, { align: 'right' });
    // Audio metadata
    if (audio) {
      const meta = `${audio.title || audio.filePath || 'Audio'}  |  ${audio.duration || 0}s  |  ${(audio.format || 'wav').toUpperCase()}`;
      doc.setFontSize(7);
      doc.text(meta, pageW - margin, 23, { align: 'right' });
    }

    // Purple accent line below header
    doc.setFillColor(BRAND.purple);
    doc.rect(0, 34, pageW, 1.5, 'F');
    y = 46;

    // ==================== DOCUMENT TITLE ====================
    const title = result.title || audio?.title || 'Análisis de MindVoice AI';
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1e293b');
    const titleLines = doc.splitTextToSize(title.toUpperCase(), contentW);
    for (const line of titleLines) {
      checkPage(10);
      doc.text(line, pageW / 2, y, { align: 'center' });
      y += 9;
    }
    y += 8;

    // ==================== RESUMEN EJECUTIVO ====================
    const execSummary = Array.isArray(result.executive_summary) && result.executive_summary.length > 0
      ? result.executive_summary
      : null;
    const summaryText = execSummary
      ? execSummary.filter(s => typeof s === 'string' && s.trim()).join('\n\n')
      : (result.resumen || '');

    if (summaryText.trim()) {
      // Gradient-style summary box
      sectionHeader('RESUMEN EJECUTIVO');
      doc.setFillColor('#f5f3ff');
      const summaryLines = doc.splitTextToSize(summaryText, contentW - 16);
      const boxH = summaryLines.length * 5.5 + 12;
      checkPage(boxH + 4);
      doc.roundedRect(margin, y - 4, contentW, boxH, 3, 3, 'F');
      // Left accent bar
      doc.setFillColor(BRAND.purple);
      doc.roundedRect(margin, y - 4, 3, boxH, 1.5, 1.5, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND.slate700);
      for (const line of summaryLines) {
        doc.text(line, margin + 10, y + 2);
        y += 5.5;
      }
      y += 14;
      drawDivider();
    }

    // ==================== ACCIONES Y TAREAS ====================
    // Read from task_list first (mobile-compatible), fallback to acciones
    const taskList = Array.isArray(result.task_list) && result.task_list.length > 0
      ? result.task_list.map(t => ({ task: t.task || '', priority: (t.priority || 'media').toLowerCase() }))
      : null;
    const acciones = !taskList && Array.isArray(result.acciones) && result.acciones.length > 0
      ? result.acciones.map(a => ({ task: a.accion || '', priority: (a.prioridad || 'media').toLowerCase() }))
      : null;
    const tasks = taskList || acciones;

    if (tasks && tasks.length > 0) {
      sectionHeader('ACCIONES Y TAREAS');
      doc.setFontSize(10);
      for (const item of tasks) {
        if (!item.task.trim()) continue;
        checkPage(14);

        const prio = item.priority;
        const prioColor = prio === 'alta' ? '#dc2626' : prio === 'baja' ? '#16a34a' : '#d97706';
        const prioBg = prio === 'alta' ? '#fef2f2' : prio === 'baja' ? '#f0fdf4' : '#fffbeb';
        const prioLabel = prio.toUpperCase();

        // Check icon circle
        doc.setDrawColor(prioColor);
        doc.setLineWidth(0.8);
        doc.circle(margin + 5, y, 3);
        // Checkmark inside
        doc.setFontSize(8);
        doc.setTextColor(prioColor);
        doc.setFont('zapfdingbats', 'normal');
        doc.text('4', margin + 3.2, y + 1.8); // "4" in ZapfDingbats = checkmark

        // Task text
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(BRAND.slate700);
        doc.setFontSize(10);
        const taskLines = doc.splitTextToSize(item.task, contentW - 60);
        for (let i = 0; i < taskLines.length; i++) {
          checkPage(6);
          doc.text(taskLines[i], margin + 14, y + 1);
          if (i < taskLines.length - 1) y += 5.5;
        }

        // Priority badge
        doc.setFillColor(prioBg);
        const badgeW = doc.getTextWidth(prioLabel) + 8;
        const badgeX = pageW - margin - badgeW;
        doc.roundedRect(badgeX, y - 3.5, badgeW, 7, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(prioColor);
        doc.setFontSize(7);
        doc.text(prioLabel, badgeX + 4, y + 1);

        y += 10;
      }
      y += 4;
      drawDivider();
    }

    // ==================== HALLAZGOS CLAVE (KEY INSIGHTS) ====================
    const insights = Array.isArray(result.key_insights) && result.key_insights.length > 0
      ? result.key_insights.filter(s => typeof s === 'string' && s.trim())
      : null;

    if (insights && insights.length > 0) {
      sectionHeader('HALLAZGOS CLAVE');
      for (const insight of insights) {
        checkPage(12);
        // Lightbulb bullet
        doc.setFontSize(10);
        doc.setFont('zapfdingbats', 'normal');
        doc.setTextColor('#d97706');
        doc.text('*', margin + 3, y + 1); // star/bullet in ZapfDingbats
        doc.setFont('helvetica', 'italic');
        doc.setTextColor('#475569');
        const insightLines = doc.splitTextToSize(insight, contentW - 14);
        for (const line of insightLines) {
          checkPage(6);
          doc.text(line, margin + 12, y + 1);
          y += 5.5;
        }
        y += 4;
      }
      y += 4;
      drawDivider();
    }

    // ==================== TEMAS Y ETIQUETAS ====================
    const tags = Array.isArray(result._tags) && result._tags.length > 0
      ? result._tags
      : (Array.isArray(result.temas) && result.temas.length > 0 ? result.temas : null);
    const keywords = Array.isArray(result.semantic_keywords) && result.semantic_keywords.length > 0
      ? result.semantic_keywords
      : null;

    if (tags || keywords) {
      sectionHeader('TEMAS Y ETIQUETAS');
      const allTags = [...new Set([...(tags || []), ...(keywords || [])])];
      let tagX = margin;
      const tagY = y;
      let rowY = tagY;

      doc.setFontSize(8);
      for (const tag of allTags) {
        const tw = doc.getTextWidth(tag) + 10;
        if (tagX + tw > pageW - margin) {
          tagX = margin;
          rowY += 10;
          checkPage(10);
        }
        // Tag pill
        doc.setFillColor('#f3f0ff');
        doc.roundedRect(tagX, rowY - 3.5, tw, 7, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BRAND.purpleDark);
        doc.text(tag, tagX + 5, rowY + 1);
        tagX += tw + 4;
      }
      y = rowY + 14;
      drawDivider();
    }

    // ==================== SENTIMIENTO ====================
    if (result.sentimiento?.trim()) {
      sectionHeader('SENTIMIENTO DETECTADO');
      doc.setFillColor('#f3f0ff');
      doc.setDrawColor(BRAND.purple);
      const sentLines = doc.splitTextToSize(result.sentimiento, contentW - 16);
      const sentH = sentLines.length * 5.5 + 8;
      checkPage(sentH + 4);
      doc.roundedRect(margin, y - 4, contentW, sentH, 2, 2, 'F');
      doc.setLineWidth(0.8);
      doc.line(margin, y - 4, margin, y - 4 + sentH);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor('#475569');
      for (const line of sentLines) { doc.text(line, margin + 8, y + 2); y += 5.5; }
      y += 10;
      drawDivider();
    }

    // ==================== TRANSCRIPCION ====================
    const transcriptionText = transcription?.text
      || result._originalTranscription
      || result.edited_text
      || '';

    if (transcriptionText.trim()) {
      sectionHeader('TRANSCRIPCIÓN ORIGINAL');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(BRAND.slate500);
      const tLines = doc.splitTextToSize(transcriptionText, contentW - 8);
      for (const line of tLines) {
        checkPage(5);
        doc.text(line, margin + 4, y);
        y += 4.8;
      }
      y += 6;
    }

    // ==================== FOOTER ON EVERY PAGE ====================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(BRAND.purpleDark);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#ffffff');
      doc.text('Generado por MindVoice AI Assistant', margin, pageH - 4);
      doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
    }

    // ==================== SAVE ====================
    const fileName = `MindVoice_Report_${Date.now()}.pdf`;
    console.log('[PdfReport] Saving PDF:', fileName);
    try {
      doc.save(fileName);
      console.log('[PdfReport] doc.save() completed');
    } catch (saveErr) {
      console.warn('[PdfReport] doc.save() failed, using fallback:', saveErr);
      // Fallback: open as blob URL in new tab if save() fails
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
}
