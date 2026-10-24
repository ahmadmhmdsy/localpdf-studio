import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from 'pdf-lib';

/**
 * Convert a Word document (.docx) to PDF while preserving document structure.
 * 
 * This implementation:
 * 1. Uses mammoth to convert DOCX to HTML
 * 2. Parses the HTML to identify structural elements (headings, paragraphs, lists, etc.)
 * 3. Applies appropriate styles for each element type
 * 4. Preserves the document structure in the PDF
 */
export async function convertWordToPdf(file: File): Promise<Uint8Array> {
  // Dynamic import to avoid bundle bloat
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract HTML from DOCX
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  
  // Parse HTML into structured blocks
  const blocks = parseHtmlToBlocks(html);
  
  // Create PDF with pdf-lib
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([612, 792]); // Letter size in points
  let y = 792 - 72; // Top margin (1 inch)
  const margin = 72; // 1 inch margins
  const pageWidth = 612;
  const maxWidth = pageWidth - 2 * margin;
  
  for (const block of blocks) {
    // Check if we need a new page
    if (y < margin + 50) {
      page = pdfDoc.addPage([612, 792]);
      y = 792 - 72;
    }
    
    switch (block.type) {
      case 'heading1':
        y = drawText(page, block.text, margin, y, maxWidth, boldFont, 24);
        y += 12; // Extra space after heading
        break;
      case 'heading2':
        y = drawText(page, block.text, margin, y, maxWidth, boldFont, 18);
        y += 10;
        break;
      case 'heading3':
        y = drawText(page, block.text, margin, y, maxWidth, boldFont, 14);
        y += 8;
        break;
      case 'paragraph':
        y = drawText(page, block.text, margin, y, maxWidth, font, 11);
        y += 8;
        break;
      case 'list-item': {
        const bullet = '•  ';
        const bulletWidth = font.widthOfTextAtSize(bullet, 11);
        page.drawText(bullet, { x: margin, y, size: 11, font, color: rgb(0, 0, 0) });
        y = drawText(page, block.text, margin + bulletWidth, y, maxWidth - bulletWidth, font, 11);
        y += 4;
        break;
      }
      case 'spacer':
        y += 12;
        break;
    }
  }
  
  return pdfDoc.save();
}

interface Block {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'list-item' | 'spacer';
  text: string;
}

/**
 * Parse HTML into structured blocks.
 * This is a simple parser that handles common Word document elements.
 */
function parseHtmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  
  // Remove script and style elements
  const cleanHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Split into lines and process each line
  const lines = cleanHtml.split(/\n|<br\s*\/?>/i);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ type: 'spacer', text: '' });
      continue;
    }
    
    // Check for headings
    const headingMatch = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h[1-6]>$/i);
    if (headingMatch) {
      const level = parseInt(headingMatch[1]);
      const text = stripHtmlTags(headingMatch[2]);
      if (text) {
        blocks.push({ type: `heading${level}` as Block['type'], text });
      }
      continue;
    }
    
    // Check for list items
    const listMatch = trimmed.match(/^<li[^>]*>(.*?)<\/li>$/i);
    if (listMatch) {
      const text = stripHtmlTags(listMatch[1]);
      if (text) {
        blocks.push({ type: 'list-item', text });
      }
      continue;
    }
    
    // Check for paragraphs
    const paraMatch = trimmed.match(/^<p[^>]*>(.*?)<\/p>$/i);
    if (paraMatch) {
      const text = stripHtmlTags(paraMatch[1]);
      if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      continue;
    }
    
    // Fallback: treat as paragraph
    const text = stripHtmlTags(trimmed);
    if (text) {
      blocks.push({ type: 'paragraph', text });
    }
  }
  
  return blocks;
}

/**
 * Strip HTML tags from text, preserving basic formatting indicators.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Draw text on the page, handling line wrapping.
 * Returns the new Y position after drawing.
 */
function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number
): number {
  // Simple word wrap
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    // Approximate width calculation
    const approxWidth = testLine.length * size * 0.5;
    
    if (approxWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color: rgb(0, 0, 0) });
      line = word;
      currentY -= size * 1.4; // Line height
    } else {
      line = testLine;
    }
  }
  
  if (line) {
    page.drawText(line, { x, y: currentY, size, font, color: rgb(0, 0, 0) });
    currentY -= size * 1.4;
  }
  
  return currentY;
}
