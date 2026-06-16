import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfjs';

export async function convertPowerpointToPdf(file: File): Promise<Uint8Array> {
  // Parse PPTX using JSZip (it's a ZIP archive)
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Get the number of slides
  const slideFiles: string[] = [];
  let slideNum = 1;
  while (zip.file(`ppt/slides/slide${slideNum}.xml`)) {
    slideFiles.push(`ppt/slides/slide${slideNum}.xml`);
    slideNum++;
  }
  
  if (slideFiles.length === 0) {
    throw new Error('No slides found in the PowerPoint file');
  }
  
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  
  // Standard 16:9 slide dimensions in points (960 x 540)
  const SLIDE_WIDTH = 960;
  const SLIDE_HEIGHT = 540;
  
  for (const slideFile of slideFiles) {
    const slideXml = await zip.file(slideFile)!.async('text');
    
    // Create a new page for each slide
    const page = pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
    
    // Extract text content from slide XML
    // This is a simplified extraction - real implementation would parse XML properly
    const textElements: Array<{ text: string; x: number; y: number; size: number; bold: boolean }> = [];
    
    // Simple regex-based text extraction (for MVP)
    // Match <a:t>text content</a:t> within shapes
    const shapeRegex = /<p:sp[\s\S]*?<\/p:sp>/g;
    const shapes = slideXml.match(shapeRegex) || [];
    
    let shapeIndex = 0;
    for (const shape of shapes) {
      // Extract text
      const textMatches = shape.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      const texts = textMatches.map(m => m.replace(/<\/?a:t>/g, ''));
      
      // Extract position from shape properties
      const xMatch = shape.match(/<a:x>(\d+)<\/a:x>/);
      const yMatch = shape.match(/<a:y>(\d+)<\/a:y>/);
      
      // Default positions - distribute vertically
      const baseX = 50;
      const baseY = SLIDE_HEIGHT - 80 - (shapeIndex * 60);
      
      // Check if it's a title (usually first shape or has larger font)
      const isTitle = shapeIndex === 0 || /ttl|title/i.test(shape);
      
      for (const text of texts) {
        if (text.trim()) {
          textElements.push({
            text: text.trim(),
            x: xMatch ? parseInt(xMatch[1]) / 914400 * SLIDE_WIDTH : baseX, // EMUs to points
            y: yMatch ? SLIDE_HEIGHT - (parseInt(yMatch[1]) / 914400 * SLIDE_HEIGHT) : baseY,
            size: isTitle ? 28 : 18,
            bold: isTitle,
          });
        }
      }
      shapeIndex++;
    }
    
    // If no text found, try direct extraction
    if (textElements.length === 0) {
      const allTexts = slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      const cleanTexts = allTexts.map(m => m.replace(/<\/?a:t>/g, '')).filter(t => t.trim());
      
      let y = SLIDE_HEIGHT - 80;
      for (const text of cleanTexts) {
        textElements.push({
          text,
          x: 50,
          y,
          size: 18,
          bold: false,
        });
        y -= 40;
      }
    }
    
    // Draw text elements
    for (const elem of textElements) {
      // Ensure text stays within page bounds
      const x = Math.max(30, Math.min(elem.x, SLIDE_WIDTH - 30));
      const y = Math.max(30, Math.min(elem.y, SLIDE_HEIGHT - 30));
      
      page.drawText(elem.text.substring(0, 100), { // Limit text length per element
        x,
        y,
        size: elem.size,
        font: elem.bold ? boldFont : font,
        color: rgb(0, 0, 0),
        maxWidth: SLIDE_WIDTH - x - 30,
      });
    }
    
    // Add slide number at bottom
    page.drawText(`Slide ${slideFiles.indexOf(slideFile) + 1}`, {
      x: SLIDE_WIDTH - 100,
      y: 20,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  return await pdf.save();
}
