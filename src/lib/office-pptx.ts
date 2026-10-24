import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Convert a PowerPoint presentation (.pptx) to PDF.
 * 
 * PPTX files are ZIP archives containing XML files. This implementation:
 * 1. Extracts slide XML files from the archive
 * 2. Parses the XML to extract text content and positions
 * 3. Creates a PDF page for each slide
 * 4. Preserves the slide layout as much as possible
 */
export async function convertPowerpointToPdf(file: File): Promise<Uint8Array> {
  // Parse PPTX using JSZip (it's a ZIP archive)
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Get slide files in order
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
  
  for (let slideIndex = 0; slideIndex < slideFiles.length; slideIndex++) {
    const slideFile = slideFiles[slideIndex];
    const slideXml = await zip.file(slideFile)!.async('text');
    
    // Create a new page for each slide
    const page = pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
    
    // Parse slide XML to extract text elements
    const textElements = parseSlideXml(slideXml, SLIDE_WIDTH, SLIDE_HEIGHT);
    
    // Draw text elements
    for (const elem of textElements) {
      // Ensure text stays within page bounds
      const x = Math.max(30, Math.min(elem.x, SLIDE_WIDTH - 30));
      const y = Math.max(30, Math.min(elem.y, SLIDE_HEIGHT - 30));
      
      // Truncate very long text
      const truncatedText = elem.text.substring(0, 200);
      
      page.drawText(truncatedText, {
        x,
        y,
        size: elem.size,
        font: elem.bold ? boldFont : font,
        color: rgb(0, 0, 0),
        maxWidth: SLIDE_WIDTH - x - 30,
      });
    }
    
    // Add slide number at bottom
    page.drawText(`Slide ${slideIndex + 1}`, {
      x: SLIDE_WIDTH - 100,
      y: 20,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  return await pdf.save();
}

interface TextElement {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
}

/**
 * Parse slide XML to extract text elements with positions.
 * Uses a more robust approach than simple regex matching.
 */
function parseSlideXml(xml: string, slideWidth: number, slideHeight: number): TextElement[] {
  const textElements: TextElement[] = [];
  
  // Extract all text runs with their positions
  // Look for <p:sp> (shape) elements which contain text
  const shapeRegex = /<p:sp[\s\S]*?<\/p:sp>/g;
  const shapes = xml.match(shapeRegex) || [];
  
  let shapeIndex = 0;
  for (const shape of shapes) {
    // Extract text content from <a:t> tags
    const textMatches = shape.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    const texts = textMatches.map(m => m.replace(/<\/?a:t>/g, '').trim()).filter(t => t);
    
    if (texts.length === 0) {
      shapeIndex++;
      continue;
    }
    
    // Extract position from <a:off> element (offset in EMUs)
    const xMatch = shape.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
    const x = xMatch ? (parseInt(xMatch[1]) / 914400) * slideWidth : 50;
    const y = xMatch ? slideHeight - (parseInt(xMatch[2]) / 914400) * slideHeight : slideHeight - 80 - (shapeIndex * 60);
    
    // Extract font size from <a:rPr> element
    const sizeMatch = shape.match(/<a:rPr sz="(\d+)"/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) / 100 : 18; // sz is in hundredths of a point
    
    // Check if bold
    const bold = /<a:rPr[^>]*b="1"/.test(shape);
    
    // Check if it's a title (usually first shape or has larger font)
    const isTitle = shapeIndex === 0 || size > 24;
    
    for (const text of texts) {
      if (text) {
        textElements.push({
          text,
          x,
          y,
          size: isTitle ? Math.max(size, 28) : size,
          bold: isTitle || bold,
        });
      }
    }
    shapeIndex++;
  }
  
  // Fallback: if no shapes found, extract all text directly
  if (textElements.length === 0) {
    const allTexts = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    const cleanTexts = allTexts.map(m => m.replace(/<\/?a:t>/g, '').trim()).filter(t => t);
    
    let y = slideHeight - 80;
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
  
  return textElements;
}
