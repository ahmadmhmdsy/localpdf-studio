import type { ToolCategoryId } from '../constants/tools';
import type { ToolId } from '../config/featureRegistry';
import { categoryCopyAr, toolCopyAr } from './locales/catalog.ar';
import { categoryCopyEn, toolCopyEn, type ToolCopy } from './locales/catalog.en';
import type { Locale } from './index';

export type { ToolCopy };

/**
 * Locale-bound catalog copy (B1.2). The catalog itself stays language-neutral;
 * every consumer reads display names and descriptions through these helpers or
 * `useI18n()`, so a translated catalog never changes the tool list itself.
 */
const TOOL_COPY: Record<Locale, Record<ToolId, ToolCopy>> = { en: toolCopyEn, ar: toolCopyAr };
const CATEGORY_COPY: Record<Locale, Record<ToolCategoryId, string>> = {
  en: categoryCopyEn,
  ar: categoryCopyAr,
};

/** Display copy for one tool in one locale; falls back to English on a gap. */
export function toolCopy(locale: Locale, toolId: ToolId): ToolCopy {
  return (TOOL_COPY[locale] ?? TOOL_COPY.en)[toolId] ?? toolCopyEn[toolId];
}

/** User-facing tool name in one locale. */
export function toolName(locale: Locale, toolId: ToolId): string {
  return toolCopy(locale, toolId).name;
}

/** User-facing tool description in one locale. */
export function toolDescription(locale: Locale, toolId: ToolId): string {
  return toolCopy(locale, toolId).description;
}

/** User-facing category heading in one locale. */
export function categoryName(locale: Locale, categoryId: ToolCategoryId): string {
  return (CATEGORY_COPY[locale] ?? CATEGORY_COPY.en)[categoryId] ?? categoryCopyEn[categoryId];
}
