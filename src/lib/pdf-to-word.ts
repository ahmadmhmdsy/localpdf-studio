import { pdfjsLib } from './pdfjs';

export async function convertPdfToWord(file: File): Promise<Blob> {
  // Dynamic import for docx library
  const docx = await import('docx');
  const { Document, Paragraph, TextRun, Packer } = docx;
  
  // Extract text from PDF
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  type DocxParagraph = InstanceType<typeof import('docx').Paragraph>;
  const paragraphs: DocxParagraph[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items by y-position to form paragraphs
    const lines = new Map<number, string[]>();
    
    for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5] / 10) * 10; // Group by approximate y position
      if (!lines.has(y)) {
        lines.set(y, []);
      }
      lines.get(y)!.push(item.str);
    }
    
    // Sort by y position (top to bottom)
    const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
    
    for (const y of sortedY) {
      const lineText = lines.get(y)!.join(' ').trim();
      if (lineText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lineText,
                size: 22, // 11pt in half-points
              }),
            ],
            spacing: { after: 120 }, // 6pt spacing after
          })
        );
      }
    }
    
    // Add page break between pages (except last)
    if (i < pdf.numPages) {
      paragraphs.push(new Paragraph({ pageBreakBefore: true }));
    }
  }
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
  
  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}