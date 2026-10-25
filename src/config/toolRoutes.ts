/**
 * Generated tool route table (roadmap backlog #15, CLAUDE.md §6a).
 *
 * The catalog (`src/constants/tools.ts`) owns the tool list, display names and
 * order; the release registry (`./featureRegistry`) owns availability. This module
 * turns that data into the `/tools/<tool-id>` route table, so a tool is added by
 * adding it to the catalog + registry instead of hand-listing routes in `App.tsx`.
 *
 * The one thing that cannot come from data is the page itself: Vite needs a static
 * `import()` call per tool to keep one async chunk per tool. `TOOL_COMPONENTS` is
 * typed as `Record<ToolId, ...>`, so adding a tool to the registry without adding
 * its lazy component is a TypeScript error rather than a silently missing route.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { TOOL_CATEGORIES } from '../constants/tools';
import type { ToolId } from './featureRegistry';

/** A lazily loaded tool page; one entry per `ToolId`, one Vite chunk per entry. */
export type ToolComponent = LazyExoticComponent<ComponentType>;

export const TOOL_COMPONENTS: Record<ToolId, ToolComponent> = {
  'merge-pdf': lazy(() => import('../pages/tools/MergePdf')),
  'split-pdf': lazy(() => import('../pages/tools/SplitPdf')),
  'remove-pages': lazy(() => import('../pages/tools/RemovePages')),
  'extract-pages': lazy(() => import('../pages/tools/ExtractPages')),
  'organize-pdf': lazy(() => import('../pages/tools/OrganizePdf')),
  'scan-to-pdf': lazy(() => import('../pages/tools/ScanToPdf')),
  'compress-pdf': lazy(() => import('../pages/tools/CompressPdf')),
  'repair-pdf': lazy(() => import('../pages/tools/RepairPdf')),
  'ocr-pdf': lazy(() => import('../pages/tools/OcrPdf')),
  'jpg-to-pdf': lazy(() => import('../pages/tools/JpgToPdf')),
  'html-to-pdf': lazy(() => import('../pages/tools/HtmlToPdf')),
  'word-to-pdf': lazy(() => import('../pages/tools/WordToPdf')),
  'excel-to-pdf': lazy(() => import('../pages/tools/ExcelToPdf')),
  'powerpoint-to-pdf': lazy(() => import('../pages/tools/PowerpointToPdf')),
  'pdf-to-jpg': lazy(() => import('../pages/tools/PdfToJpg')),
  'pdf-to-pdfa': lazy(() => import('../pages/tools/PdfToPdfA')),
  'pdf-to-word': lazy(() => import('../pages/tools/PdfToWord')),
  'pdf-to-excel': lazy(() => import('../pages/tools/PdfToExcel')),
  'pdf-to-powerpoint': lazy(() => import('../pages/tools/PdfToPowerpoint')),
  'rotate-pdf': lazy(() => import('../pages/tools/RotatePdf')),
  'add-page-numbers': lazy(() => import('../pages/tools/AddPageNumbers')),
  'add-watermark': lazy(() => import('../pages/tools/AddWatermark')),
  'crop-pdf': lazy(() => import('../pages/tools/CropPdf')),
  'edit-pdf': lazy(() => import('../pages/tools/EditPdf')),
  'sign-pdf': lazy(() => import('../pages/tools/SignPdf')),
  'blackout-pdf': lazy(() => import('../pages/tools/BlackoutPdf')),
  'compare-pdf': lazy(() => import('../pages/tools/ComparePdf')),
  'decrypt-pdf': lazy(() => import('../pages/tools/DecryptPdf')),
  'protect-pdf': lazy(() => import('../pages/tools/ProtectPdf')),
  'ai-summarizer': lazy(() => import('../pages/tools/AiSummarizer')),
  'translate-pdf': lazy(() => import('../pages/tools/TranslatePdf')),
};

/** URL path segment shared by every tool route. */
export const TOOL_ROUTE_PREFIX = 'tools';

/** Relative route path for a tool, e.g. "tools/merge-pdf". */
export function toolRoutePath(toolId: ToolId): string {
  return `${TOOL_ROUTE_PREFIX}/${toolId}`;
}

export interface ToolRouteDefinition {
  toolId: ToolId;
  /** Display name from the catalog; used by the error boundary and the availability gate. */
  name: string;
  /** Relative path, nested under the layout route in `App.tsx`. */
  path: string;
  Component: ToolComponent;
}

/**
 * Built in catalog order so the route table mirrors the catalog exactly. A
 * catalog/registry mismatch is reported by `src/App.test.tsx`; it is never skipped.
 */
export const TOOL_ROUTES: readonly ToolRouteDefinition[] = TOOL_CATEGORIES.flatMap(
  (category) =>
    category.tools.map((tool) => ({
      toolId: tool.id,
      name: tool.name,
      path: toolRoutePath(tool.id),
      Component: TOOL_COMPONENTS[tool.id],
    })),
);

/**
 * Legacy URLs kept for backward compatibility, removed in the next major release.
 * `from` is a URL segment only (not a tool id); `to` must stay a real catalog tool.
 */
export interface ToolAliasRedirect {
  from: string;
  to: ToolId;
}

export const TOOL_ALIAS_REDIRECTS: readonly ToolAliasRedirect[] = [
  { from: 'redact-pdf', to: 'blackout-pdf' },
  { from: 'unlock-pdf', to: 'decrypt-pdf' },
];

/** Relative route path of a legacy alias, e.g. "tools/redact-pdf". */
export function toolAliasPath(alias: ToolAliasRedirect): string {
  return `${TOOL_ROUTE_PREFIX}/${alias.from}`;
}

/** Absolute redirect target of a legacy alias, e.g. "/tools/blackout-pdf". */
export function toolAliasTarget(alias: ToolAliasRedirect): string {
  return `/${toolRoutePath(alias.to)}`;
}
