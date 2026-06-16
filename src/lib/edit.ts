import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropPdf(file: File, cropPercentages: CropRect): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Convert percentages to actual points
    // Note: PDF coordinate system starts from bottom-left
    const cropX = (cropPercentages.x / 100) * width;
    const cropY = height - ((cropPercentages.y + cropPercentages.height) / 100) * height;
    const cropWidth = (cropPercentages.width / 100) * width;
    const cropHeight = (cropPercentages.height / 100) * height;
    
    page.setCropBox(cropX, cropY, cropWidth, cropHeight);
  }
  
  return await pdf.save();
}

export interface TextAnnotation {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  pageIndex: number;
}

export async function editPdf(file: File, annotations: TextAnnotation[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  const pages = pdf.getPages();
  
  for (const ann of annotations) {
    if (ann.pageIndex >= 0 && ann.pageIndex < pages.length) {
      const page = pages[ann.pageIndex];
      const { width, height } = page.getSize();
      
      // Convert hex color to rgb
      const r = parseInt(ann.color.slice(1, 3), 16) / 255;
      const g = parseInt(ann.color.slice(3, 5), 16) / 255;
      const b = parseInt(ann.color.slice(5, 7), 16) / 255;
      
      // Convert percentage coordinates to points
      const x = (ann.x / 100) * width;
      const y = height - (ann.y / 100) * height; // PDF y is from bottom
      
      page.drawText(ann.text, {
        x,
        y,
        size: ann.size,
        font,
        color: rgb(r, g, b),
      });
    }
  }
  
  return await pdf.save();
}
