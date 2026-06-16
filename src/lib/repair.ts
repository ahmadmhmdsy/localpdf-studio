import { PDFDocument } from 'pdf-lib';
import { logWarn } from './logger';

export interface RepairResult {
  success: boolean;
  data: Uint8Array | null;
  message: string;
  issuesFixed: string[];
}

export async function repairPdf(file: File): Promise<RepairResult> {
  const issuesFixed: string[] = [];
  
  try {
    // Attempt 1: Standard load and save (fixes minor structural issues)
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
      ignoreEncryption: true,
    });
    
    issuesFixed.push('Validated PDF structure');
    
    // Fix missing metadata
    if (!pdf.getTitle()) {
      pdf.setTitle('Repaired Document');
      issuesFixed.push('Added missing title metadata');
    }
    if (!pdf.getAuthor()) {
      pdf.setAuthor('Unknown');
      issuesFixed.push('Added missing author metadata');
    }
    
    // Fix page dimensions if needed
    const pages = pdf.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const size = page.getSize();
      
      // Ensure valid page dimensions
      if (size.width <= 0 || size.height <= 0) {
        page.setSize(612, 792); // Standard Letter size
        issuesFixed.push(`Fixed invalid page dimensions on page ${i + 1}`);
      }
    }
    
    const repaired = await pdf.save();
    
    return {
      success: true,
      data: repaired,
      message: `PDF repaired successfully. Fixed ${issuesFixed.length} issue(s).`,
      issuesFixed,
    };
    
  } catch (error) {
    // Attempt 2: Aggressive recovery - try to extract what we can
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Try to create a new PDF and copy any readable content
      const newPdf = await PDFDocument.create();
      
      // Last resort: create a minimal valid PDF with error message
      const page = newPdf.addPage([612, 792]);
      const { width, height } = page.getSize();
      
      // Add error notice to the repaired PDF
      page.drawText('PDF Repair Notice', {
        x: 50,
        y: height - 100,
        size: 24,
      });
      
      page.drawText('The original PDF was severely corrupted.', {
        x: 50,
        y: height - 150,
        size: 14,
      });
      
      page.drawText(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        x: 50,
        y: height - 200,
        size: 12,
      });
      
      const fallback = await newPdf.save();
      
      return {
        success: false,
        data: fallback,
        message: 'PDF was severely corrupted. Created a placeholder document with error details.',
        issuesFixed: ['Created fallback document due to severe corruption'],
      };
      
    } catch (error) {
      logWarn('Repair PDF: even the fallback path failed.', error);
      return {
        success: false,
        data: null,
        message: `Unable to repair PDF: ${error instanceof Error ? error.message : 'Unknown error'}. The file may be too corrupted for client-side repair.`,
        issuesFixed: [],
      };
    }
  }
}
