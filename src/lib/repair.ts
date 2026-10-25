import { PDFDocument } from 'pdf-lib';
import { logWarn } from './logger';

export interface RepairResult {
  success: boolean;
  data: Uint8Array | null;
  message: string;
  issuesFixed: string[];
}

/**
 * Re-save a PDF after normalizing its metadata and page dimensions.
 *
 * Repair is best-effort: when pdf-lib cannot parse the document there is no
 * repaired file to hand back. We deliberately never fabricate a placeholder
 * PDF, because the UI would present it as the user's repaired document
 * (roadmap A7.9). A failure only ever reports the failure.
 */
export async function repairPdf(file: File): Promise<RepairResult> {
  const issuesFixed: string[] = [];

  try {
    // Load and re-save, which rewrites the cross-reference table and fixes
    // minor structural issues.
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
    logWarn('Repair PDF: the document could not be parsed and re-saved.', error);
    return {
      success: false,
      data: null,
      message:
        'This PDF is too damaged to repair in the browser. No repaired file was produced; your original file is unchanged.',
      issuesFixed: [],
    };
  }
}
