import { type ToolId } from '../config/featureRegistry';

import {
  type LucideIcon,
  Combine, Split, FileMinus, FileOutput, LayoutGrid, Scan,
  Minimize, Wrench, ScanText,
  Image, FileText, Presentation, FileSpreadsheet, Globe,
  FileBadge, RotateCw, ListOrdered, Stamp, Crop, Edit,
  KeyRound, Lock, PenTool, Square, GitCompare, Languages,
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
      { id: "merge-pdf", name: "Merge PDF", description: "Combine PDFs in the order you want with the easiest PDF merger available.", icon: Combine, color: "text-red-500", isMVP: true },
      { id: "split-pdf", name: "Split PDF", description: "Separate one page or a whole set for easy conversion into independent PDF files.", icon: Split, color: "text-red-500", isMVP: true },
      { id: "remove-pages", name: "Remove pages", description: "Remove pages from a PDF document in a flash.", icon: FileMinus, color: "text-red-500", isMVP: true },
      { id: "extract-pages", name: "Extract pages", description: "Get a new document containing only the desired pages.", icon: FileOutput, color: "text-red-500", isMVP: true },
      { id: "organize-pdf", name: "Organize PDF", description: "Sort, add and delete PDF pages.", icon: LayoutGrid, color: "text-red-500", isMVP: true },
      { id: "scan-to-pdf", name: "Scan to PDF", description: "Capture document scans from your camera and convert them instantly to PDF.", icon: Scan, color: "text-red-500", isMVP: true },
    ]
  },
  {
    name: "OPTIMIZE PDF",
    tools: [
      { id: "compress-pdf", name: "Compress PDF", description: "Re-pack PDF streams to reduce file size. pdf-lib cannot re-compress embedded images, so savings are limited.", icon: Minimize, color: "text-green-500", isMVP: true },
      { id: "repair-pdf", name: "Repair PDF", description: "Fix corrupted PDFs when possible with client-side repair.", icon: Wrench, color: "text-green-500", isMVP: true },
      { id: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable by recognizing text with on-device OCR (Tesseract.js).", icon: ScanText, color: "text-green-500", isMVP: true },
    ]
  },
  {
    name: "CONVERT TO PDF",
    tools: [
      { id: "jpg-to-pdf", name: "JPG to PDF", description: "Convert JPG images to PDF in seconds.", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "html-to-pdf", name: "HTML to PDF", description: "Convert webpages in HTML to PDF.", icon: Globe, color: "text-blue-400", isMVP: true },
      { id: "word-to-pdf", name: "WORD to PDF", description: "Convert Word documents to PDF format.", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "excel-to-pdf", name: "EXCEL to PDF", description: "Convert Excel spreadsheets to PDF format.", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "powerpoint-to-pdf", name: "POWERPOINT to PDF", description: "Convert PowerPoint presentations to PDF.", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    name: "CONVERT FROM PDF",
    tools: [
      { id: "pdf-to-jpg", name: "PDF to JPG", description: "Extract images from your PDF or save each page as a separate image.", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-pdfa", name: "PDF to PDF/A", description: "Convert PDF to PDF/A format for long-term archiving.", icon: FileBadge, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-word", name: "PDF to WORD", description: "Convert PDF files to editable Word documents.", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-excel", name: "PDF to EXCEL", description: "Extract tables from PDF to Excel format.", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-powerpoint", name: "PDF to POWERPOINT", description: "Convert PDF pages to PowerPoint slides.", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    name: "EDIT PDF",
    tools: [
      { id: "rotate-pdf", name: "Rotate PDF", description: "Rotate one PDF's pages by 90°, 180°, or 270°. All pages are rotated by the same angle.", icon: RotateCw, color: "text-purple-500", isMVP: true },
      { id: "add-page-numbers", name: "Add page numbers", description: "Add page numbers to every page of your PDF. Choose from 9 positions (corners, edges, center).", icon: ListOrdered, color: "text-purple-500", isMVP: true },
      { id: "add-watermark", name: "Add watermark", description: "Stamp a text watermark over every page of your PDF. The watermark is rendered in a fixed light-gray, diagonal style.", icon: Stamp, color: "text-purple-500", isMVP: true },
      { id: "crop-pdf", name: "Crop PDF", description: "Crop PDF online to a selected area, adjust margin size swiftly.", icon: Crop, color: "text-purple-500", isMVP: true },
      { id: "edit-pdf", name: "Edit PDF", description: "Add text, images, shapes or freehand annotations to a PDF document.", icon: Edit, color: "text-purple-500", isMVP: true },
    ]
  },
  {
    name: "PDF SECURITY",
    tools: [
      { id: "sign-pdf", name: "Sign PDF", description: "Draw, type, or upload a signature and stamp it onto your PDF pages. Signatures stay in your browser.", icon: PenTool, color: "text-blue-500", isMVP: true },
      { id: "blackout-pdf", name: "Blackout PDF", description: "Permanently remove text from a document by blacking out areas (text becomes un-extractable).", icon: Square, color: "text-blue-500", isMVP: true },
      { id: "compare-pdf", name: "Compare PDF", description: "Show two PDFs side-by-side for visual comparison. Differences are not auto-detected.", icon: GitCompare, color: "text-blue-500", isMVP: true },
      { id: "decrypt-pdf", name: "Decrypt PDF", description: "Remove the password from an encrypted PDF (you must know the password).", icon: KeyRound, color: "text-blue-500", isMVP: true },
      { id: "protect-pdf", name: "Protect PDF", description: "Add password protection and permissions to PDF files.", icon: Shield, color: "text-blue-500", isMVP: true },
    ]
  },
  {
    name: "PDF INTELLIGENCE",
    tools: [
      { id: "ai-summarizer", name: "AI Summarizer", description: "Get AI-generated summary of PDF content using Google Gemini.", icon: Sparkles, color: "text-purple-600", isMVP: true },
      { id: "translate-pdf", name: "Translate PDF", description: "Add AI translations as blue text below the original text on each page. The original text remains visible.", icon: Languages, color: "text-purple-600", isMVP: true },
    ]
  }
];