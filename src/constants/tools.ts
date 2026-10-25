import { type ToolId } from '../config/featureRegistry';

import {
  type LucideIcon,
  Combine, Split, FileMinus, FileOutput, LayoutGrid, Scan,
  Minimize, Wrench, ScanText,
  Image, FileText, Presentation, FileSpreadsheet, Globe,
  FileBadge, RotateCw, ListOrdered, Stamp, Crop, Edit,
  KeyRound, PenTool, Square, GitCompare, Languages,
  Sparkles, Shield
} from 'lucide-react';

export type ToolCategory = {
  name: string;
  tools: Tool[];
};

export type Tool = {
  id: ToolId;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  isMVP: boolean;
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "ORGANIZE PDF",
    tools: [
      { id: "merge-pdf", name: "Merge PDF", description: "Combine PDFs in the order you choose into a single document.", icon: Combine, color: "text-red-500", isMVP: true },
      { id: "split-pdf", name: "Split PDF", description: "Split a PDF into separate files by page range, every N pages, or one page per file.", icon: Split, color: "text-red-500", isMVP: true },
      { id: "remove-pages", name: "Remove pages", description: "Delete the pages you select and save a new PDF with the rest.", icon: FileMinus, color: "text-red-500", isMVP: true },
      { id: "extract-pages", name: "Extract pages", description: "Get a new document containing only the desired pages.", icon: FileOutput, color: "text-red-500", isMVP: true },
      { id: "organize-pdf", name: "Organize PDF", description: "Sort, add and delete PDF pages.", icon: LayoutGrid, color: "text-red-500", isMVP: true },
      { id: "scan-to-pdf", name: "Scan to PDF", description: "Not available — disabled pending remediation. See the production inventory for details.", icon: Scan, color: "text-red-500", isMVP: true },
    ]
  },
  {
    name: "OPTIMIZE PDF",
    tools: [
      { id: "compress-pdf", name: "Compress PDF", description: "Reduce file size by re-packing streams and, optionally, downsampling embedded images.", icon: Minimize, color: "text-green-500", isMVP: true },
      { id: "repair-pdf", name: "Repair PDF", description: "Attempt to repair a damaged PDF by re-parsing and re-saving it.", icon: Wrench, color: "text-green-500", isMVP: true },
      { id: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable, on your device.", icon: ScanText, color: "text-green-500", isMVP: true },
    ]
  },
  {
    name: "CONVERT TO PDF",
    tools: [
      { id: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG and PNG images into one PDF, one image per page, with page sizes taken from each image's own DPI.", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "html-to-pdf", name: "HTML to PDF", description: "Render pasted HTML into a paginated A4 PDF, portrait or landscape; external URLs are not fetched.", icon: Globe, color: "text-blue-400", isMVP: true },
      { id: "word-to-pdf", name: "WORD to PDF", description: "Convert DOCX documents to PDF with approximate layout.", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "excel-to-pdf", name: "EXCEL to PDF", description: "Convert XLSX spreadsheets to PDF with basic table layout.", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "powerpoint-to-pdf", name: "POWERPOINT to PDF", description: "Convert PPTX slides to PDF with approximate layout.", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    name: "CONVERT FROM PDF",
    tools: [
      { id: "pdf-to-jpg", name: "PDF to JPG", description: "Render every PDF page as a JPG image and download them in a ZIP file.", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-pdfa", name: "PDF to PDF/A-style", description: "Apply PDF/A-style metadata for archiving; the output is not validated as PDF/A-conformant.", icon: FileBadge, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-word", name: "PDF to WORD", description: "Convert PDF text into an editable Word document with approximate paragraphs.", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-excel", name: "PDF to EXCEL", description: "Extract tabular text from a PDF into an Excel workbook using heuristic detection.", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-powerpoint", name: "PDF to POWERPOINT", description: "Not available — disabled pending remediation. See the production inventory for details.", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    name: "EDIT PDF",
    tools: [
      { id: "rotate-pdf", name: "Rotate PDF", description: "Rotate one PDF's pages by 90°, 180°, or 270°. All pages are rotated by the same angle.", icon: RotateCw, color: "text-purple-500", isMVP: true },
      { id: "add-page-numbers", name: "Add page numbers", description: "Add page numbers to every page of your PDF. Choose from 9 positions (corners, edges, center).", icon: ListOrdered, color: "text-purple-500", isMVP: true },
      { id: "add-watermark", name: "Add watermark", description: "Stamp a text or PNG/JPEG image watermark over your PDF, with control over size, opacity, rotation and page range.", icon: Stamp, color: "text-purple-500", isMVP: true },
      { id: "crop-pdf", name: "Crop PDF", description: "Crop all pages of a PDF to the same selected area.", icon: Crop, color: "text-purple-500", isMVP: true },
      { id: "edit-pdf", name: "Edit PDF", description: "Add text, images, shapes or freehand annotations to a PDF document.", icon: Edit, color: "text-purple-500", isMVP: true },
    ]
  },
  {
    name: "PDF SECURITY",
    tools: [
      { id: "sign-pdf", name: "Sign PDF", description: "Draw, type, or upload a signature and stamp it onto your PDF pages. Signatures stay in your browser.", icon: PenTool, color: "text-blue-500", isMVP: true },
      { id: "blackout-pdf", name: "Blackout PDF", description: "Unavailable while the dedicated blackout/redaction workflow is remediated; do not use it as a confidentiality boundary.", icon: Square, color: "text-blue-500", isMVP: true },
      { id: "compare-pdf", name: "Compare PDF", description: "Show two PDFs side-by-side for visual comparison. Differences are not auto-detected.", icon: GitCompare, color: "text-blue-500", isMVP: true },
      { id: "decrypt-pdf", name: "Decrypt PDF", description: "Not available — pdf-lib does not support PDF decryption. See the production inventory for details.", icon: KeyRound, color: "text-blue-500", isMVP: true },
      { id: "protect-pdf", name: "Protect PDF", description: "Not available — pdf-lib does not support PDF encryption. See the production inventory for details.", icon: Shield, color: "text-blue-500", isMVP: true },
    ]
  },
  {
    name: "PDF INTELLIGENCE",
    tools: [
      { id: "ai-summarizer", name: "AI Summarizer", description: "Not available in the web build — requires a Gemini API key. Desktop build only.", icon: Sparkles, color: "text-purple-600", isMVP: true },
      { id: "translate-pdf", name: "Translate PDF", description: "Not available in the web build — requires a Gemini API key. Desktop build only.", icon: Languages, color: "text-purple-600", isMVP: true },
    ]
  }
];
