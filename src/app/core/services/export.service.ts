import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Packer, Document, Paragraph, HeadingLevel, TextRun } from 'docx';

@Injectable({ providedIn: 'root' })
export class ExportService {
  exportToPDF(title: string, content: string, metadata?: Record<string, string>): void {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      doc.setFontSize(18);
      doc.text(title, margin, yPosition);
      yPosition += 15;

      if (metadata) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        Object.entries(metadata).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const contentLines = doc.splitTextToSize(content, pageWidth - 2 * margin);
      
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });

      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  }

  exportToDocX(title: string, content: string, metadata?: Record<string, string>): void {
    try {
      const paragraphs: Paragraph[] = [
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        }),
      ];

      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          paragraphs.push(
            new Paragraph({
              text: `${key}: ${value}`,
              spacing: { after: 100 },
            })
          );
        });
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      const contentParagraphs = content.split('\n').map(
        (line) => new Paragraph({
          text: line || '\u00a0',
          spacing: { line: 360, after: 200 },
        })
      );

      paragraphs.push(...contentParagraphs);

      const doc = new Document({
        sections: [
          {
            children: paragraphs,
          },
        ],
      });

      Packer.toBlob(doc).then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      throw error;
    }
  }
}
