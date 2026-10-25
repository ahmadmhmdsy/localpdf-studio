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

/**
 * Category identifiers. Display names live in the locale catalogs
 * (`src/i18n/locales/catalog.*.ts`), so the same structure serves every language.
 */
export type ToolCategoryId =
  | 'organize'
  | 'optimize'
  | 'convert-to'
  | 'convert-from'
  | 'edit'
  | 'security'
  | 'intelligence';

export type ToolCategory = {
  id: ToolCategoryId;
  tools: Tool[];
};

/**
 * A catalog entry: identity and presentation only. The user-facing name and
 * description are locale data (`toolCopyEn`/`toolCopyAr`), read through
 * `useI18n()` so the catalog itself stays language-neutral (B1.2).
 */
export type Tool = {
  id: ToolId;
  icon: LucideIcon;
  color: string;
  isMVP: boolean;
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'organize',
    tools: [
      { id: "merge-pdf", icon: Combine, color: "text-red-500", isMVP: true },
      { id: "split-pdf", icon: Split, color: "text-red-500", isMVP: true },
      { id: "remove-pages", icon: FileMinus, color: "text-red-500", isMVP: true },
      { id: "extract-pages", icon: FileOutput, color: "text-red-500", isMVP: true },
      { id: "organize-pdf", icon: LayoutGrid, color: "text-red-500", isMVP: true },
      { id: "scan-to-pdf", icon: Scan, color: "text-red-500", isMVP: true },
    ]
  },
  {
    id: 'optimize',
    tools: [
      { id: "compress-pdf", icon: Minimize, color: "text-green-500", isMVP: true },
      { id: "repair-pdf", icon: Wrench, color: "text-green-500", isMVP: true },
      { id: "ocr-pdf", icon: ScanText, color: "text-green-500", isMVP: true },
    ]
  },
  {
    id: 'convert-to',
    tools: [
      { id: "jpg-to-pdf", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "html-to-pdf", icon: Globe, color: "text-blue-400", isMVP: true },
      { id: "word-to-pdf", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "excel-to-pdf", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "powerpoint-to-pdf", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    id: 'convert-from',
    tools: [
      { id: "pdf-to-jpg", icon: Image, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-pdfa", icon: FileBadge, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-word", icon: FileText, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-excel", icon: FileSpreadsheet, color: "text-yellow-500", isMVP: true },
      { id: "pdf-to-powerpoint", icon: Presentation, color: "text-yellow-500", isMVP: true },
    ]
  },
  {
    id: 'edit',
    tools: [
      { id: "rotate-pdf", icon: RotateCw, color: "text-purple-500", isMVP: true },
      { id: "add-page-numbers", icon: ListOrdered, color: "text-purple-500", isMVP: true },
      { id: "add-watermark", icon: Stamp, color: "text-purple-500", isMVP: true },
      { id: "crop-pdf", icon: Crop, color: "text-purple-500", isMVP: true },
      { id: "edit-pdf", icon: Edit, color: "text-purple-500", isMVP: true },
    ]
  },
  {
    id: 'security',
    tools: [
      { id: "sign-pdf", icon: PenTool, color: "text-blue-500", isMVP: true },
      { id: "blackout-pdf", icon: Square, color: "text-blue-500", isMVP: true },
      { id: "compare-pdf", icon: GitCompare, color: "text-blue-500", isMVP: true },
      { id: "decrypt-pdf", icon: KeyRound, color: "text-blue-500", isMVP: true },
      { id: "protect-pdf", icon: Shield, color: "text-blue-500", isMVP: true },
    ]
  },
  {
    id: 'intelligence',
    tools: [
      { id: "ai-summarizer", icon: Sparkles, color: "text-purple-600", isMVP: true },
      { id: "translate-pdf", icon: Languages, color: "text-purple-600", isMVP: true },
    ]
  }
];
