import type { ToolId } from '../../config/featureRegistry';
import type { ToolCategoryId } from '../../constants/tools';

/** Display copy for one catalog tool. */
export type ToolCopy = {
  name: string;
  description: string;
};

/**
 * English display copy for every catalog tool (source locale, B1.2).
 *
 * The catalog itself (`src/constants/tools.ts`) carries identity and
 * presentation only; every user-facing tool name and description lives here so
 * other languages can translate the same set without touching the catalog.
 * Descriptions are release-facing: keep the containment limits ("not available",
 * "not validated as PDF/A-conformant", "do not use it as a confidentiality
 * boundary") when translating.
 */
export const toolCopyEn: Record<ToolId, ToolCopy> = {
  'merge-pdf': {
    name: 'Merge PDF',
    description: 'Combine PDFs in the order you choose into a single document.',
  },
  'split-pdf': {
    name: 'Split PDF',
    description: 'Split a PDF into separate files by page range, every N pages, or one page per file.',
  },
  'remove-pages': {
    name: 'Remove pages',
    description: 'Delete the pages you select and save a new PDF with the rest.',
  },
  'extract-pages': {
    name: 'Extract pages',
    description: 'Get a new document containing only the desired pages.',
  },
  'organize-pdf': {
    name: 'Organize PDF',
    description: 'Sort, add and delete PDF pages. Drag and drop the page thumbnails and sort them however you like.',
  },
  'scan-to-pdf': {
    name: 'Scan to PDF',
    description: 'Not available — disabled pending remediation. See the production inventory for details.',
  },
  'compress-pdf': {
    name: 'Compress PDF',
    description:
      'Reduce file size by re-packing PDF streams and, optionally, downsampling embedded images. Image re-encoding is lossy and irreversible.',
  },
  'repair-pdf': {
    name: 'Repair PDF',
    description:
      'Attempt to repair a damaged PDF by re-parsing and re-saving it. A file that cannot be repaired reports a clear failure instead of producing a placeholder.',
  },
  'ocr-pdf': {
    name: 'OCR PDF',
    description: 'Make scanned PDFs searchable. Text recognition runs on your device; your file is not uploaded.',
  },
  'jpg-to-pdf': {
    name: 'JPG to PDF',
    description: "Turn JPG and PNG images into one PDF, one image per page, with page sizes taken from each image's own DPI.",
  },
  'html-to-pdf': {
    name: 'HTML to PDF',
    description: 'Render pasted HTML into a paginated A4 PDF, portrait or landscape; external URLs are not fetched.',
  },
  'word-to-pdf': {
    name: 'WORD to PDF',
    description: 'Convert DOCX documents to PDF with approximate layout.',
  },
  'excel-to-pdf': {
    name: 'EXCEL to PDF',
    description: 'Convert XLSX spreadsheets to PDF with basic table layout.',
  },
  'powerpoint-to-pdf': {
    name: 'POWERPOINT to PDF',
    description: 'Convert PPTX slides to PDF with approximate layout.',
  },
  'pdf-to-jpg': {
    name: 'PDF to JPG',
    description: 'Render every PDF page as a JPG image and download them in a ZIP file.',
  },
  'pdf-to-pdfa': {
    name: 'PDF to PDF/A-style',
    description: 'Apply PDF/A-style metadata for archiving; the output is not validated as PDF/A-conformant.',
  },
  'pdf-to-word': {
    name: 'PDF to WORD',
    description: 'Convert PDF text into an editable Word document with approximate paragraphs.',
  },
  'pdf-to-excel': {
    name: 'PDF to EXCEL',
    description: 'Extract tabular text from a PDF into an Excel workbook using heuristic detection.',
  },
  'pdf-to-powerpoint': {
    name: 'PDF to POWERPOINT',
    description: 'Not available — disabled pending remediation. See the production inventory for details.',
  },
  'rotate-pdf': {
    name: 'Rotate PDF',
    description: "Rotate one PDF's pages by 90°, 180°, or 270°. All pages are rotated by the same angle.",
  },
  'add-page-numbers': {
    name: 'Add page numbers',
    description: 'Add page numbers to every page of your PDF. Choose from 9 positions (corners, edges, center).',
  },
  'add-watermark': {
    name: 'Add watermark',
    description: 'Stamp a text or PNG/JPEG image watermark over your PDF, with control over size, opacity, rotation and page range.',
  },
  'crop-pdf': {
    name: 'Crop PDF',
    description: 'Crop all pages of a PDF to the same selected area.',
  },
  'edit-pdf': {
    name: 'Edit PDF',
    description: 'Add text, images, shapes or freehand annotations to a PDF document.',
  },
  'sign-pdf': {
    name: 'Sign PDF',
    description: 'Draw, type, or upload a signature and stamp it onto your PDF pages. Signatures stay in your browser.',
  },
  'blackout-pdf': {
    name: 'Blackout PDF',
    description: 'Unavailable while the dedicated blackout/redaction workflow is remediated; do not use it as a confidentiality boundary.',
  },
  'compare-pdf': {
    name: 'Compare PDF',
    description: 'Show two PDFs side-by-side for visual comparison. Differences are not auto-detected.',
  },
  'decrypt-pdf': {
    name: 'Decrypt PDF',
    description: 'Not available — pdf-lib does not support PDF decryption. See the production inventory for details.',
  },
  'protect-pdf': {
    name: 'Protect PDF',
    description: 'Not available — pdf-lib does not support PDF encryption. See the production inventory for details.',
  },
  'ai-summarizer': {
    name: 'AI Summarizer',
    description: 'Not available in the web build — requires a Gemini API key. Desktop build only.',
  },
  'translate-pdf': {
    name: 'Translate PDF',
    description: 'Not available in the web build — requires a Gemini API key. Desktop build only.',
  },
};

/** English category headings, shown above each tool group. */
export const categoryCopyEn: Record<ToolCategoryId, string> = {
  organize: 'ORGANIZE PDF',
  optimize: 'OPTIMIZE PDF',
  'convert-to': 'CONVERT TO PDF',
  'convert-from': 'CONVERT FROM PDF',
  edit: 'EDIT PDF',
  security: 'PDF SECURITY',
  intelligence: 'PDF INTELLIGENCE',
};
