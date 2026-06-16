import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';

export async function convertWordToPdf(file: File): Promise<Uint8Array> {
  // Dynamic import to avoid bundle bloat
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract HTML from DOCX
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  
  // Convert HTML to PDF using jsPDF with autotable/htmlpdf2
  const doc = new jsPDF('p', 'pt', 'a4');
  
  // Simple text extraction approach for MVP
  // Remove HTML tags for basic text extraction
  const text = html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
  
  const lines = text.split('\n');
  let y = 40;
  const lineHeight = 14;
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 2 * margin;
  
  doc.setFontSize(11);
  
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 40;
    }
    
    if (line.trim()) {
      const splitLines = doc.splitTextToSize(line, maxWidth);
      for (const splitLine of splitLines) {
        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(splitLine, margin, y);
        y += lineHeight;
      }
    } else {
      y += lineHeight; // Empty line spacing
    }
  }
  
  return doc.output('arraybuffer') as Uint8Array;
}
