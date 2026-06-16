import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import { pdfjsLib } from './pdfjs';
import { logError } from './logger';

export interface OcrProgress {
  page: number;
  totalPages: number;
  status: 'rendering' | 'recognizing' | 'embedding';
}

export async function ocrPdf(
  file: File,
  onProgress?: (progress: OcrProgress) => void
): Promise<Uint8Array> {
  // Dynamic import to avoid loading tesseract.js unless needed
  const Tesseract = await import('tesseract.js');
  const { createWorker } = Tesseract;
  
  let worker: any = null;
  
  try {
    worker = await createWorker('eng');
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pages = pdf.getPages();
    const totalPages = pages.length;
    
    for (let i = 0; i < totalPages; i++) {
      onProgress?.({ page: i + 1, totalPages, status: 'rendering' });
      
      // Render page to canvas at high resolution
      const page = await pdfJsDoc.getPage(i + 1);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      
      // Use 2x scale for better OCR accuracy
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Fill white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      await (page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      } as any).promise);
      
      onProgress?.({ page: i + 1, totalPages, status: 'recognizing' });
      
      // Run OCR on the canvas
      const imageData = canvas.toDataURL('image/png');
      const { data } = await worker.recognize(imageData);
      
      onProgress?.({ page: i + 1, totalPages, status: 'embedding' });
      
      // Get recognized text with word-level data for positioning
      if (data.words && data.words.length > 0) {
        const pdfPage = pages[i];
        const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
        
        // Embed invisible text layer for searchability
        // We draw text with opacity 0 so it's searchable but not visible
        // Position is calculated from OCR coordinates
        for (const word of data.words) {
          if (word.text.trim()) {
            // Convert canvas coordinates to PDF coordinates
            const x = (word.bbox.x0 / canvas.width) * pdfWidth;
            const y = pdfHeight - ((word.bbox.y1 / canvas.height) * pdfHeight); // Flip Y
            
            // Estimate font size from bbox height
            const fontSize = Math.max(8, ((word.bbox.y1 - word.bbox.y0) / canvas.height) * pdfHeight * 0.75);
            
            pdfPage.drawText(word.text, {
              x,
              y,
              size: fontSize,
              opacity: 0.01, // Nearly invisible but searchable
              color: rgb(0, 0, 0),
            });
          }
        }
      }
    }
    
    return await pdf.save();
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termError) {
        logError('Failed to terminate OCR worker:', termError);
      }
    }
  }
}
