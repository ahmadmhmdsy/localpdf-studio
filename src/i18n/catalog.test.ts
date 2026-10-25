import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES } from '../constants/tools';
import { categoryName, toolCopy, toolDescription, toolName } from './catalog';
import { SUPPORTED_LOCALES } from './index';

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((category) => category.tools);
const CATEGORY_IDS = TOOL_CATEGORIES.map((category) => category.id);
const ARABIC_LETTER = /[\u0600-\u06FF]/;

describe('locale-bound catalog copy', () => {
  it('covers every catalog tool and category in every supported locale', () => {
    expect(ALL_TOOLS).toHaveLength(31);
    expect(CATEGORY_IDS).toHaveLength(7);

    for (const locale of SUPPORTED_LOCALES) {
      for (const tool of ALL_TOOLS) {
        const copy = toolCopy(locale, tool.id);
        expect(copy.name.trim(), `${locale}: ${tool.id} name`).not.toBe('');
        expect(copy.description.trim(), `${locale}: ${tool.id} description`).not.toBe('');
      }
      for (const categoryId of CATEGORY_IDS) {
        expect(categoryName(locale, categoryId).trim()).not.toBe('');
      }
    }
  });

  it('serves the source-locale wording unchanged', () => {
    expect(toolName('en', 'merge-pdf')).toBe('Merge PDF');
    expect(toolName('en', 'pdf-to-pdfa')).toBe('PDF to PDF/A-style');
    expect(toolDescription('en', 'merge-pdf')).toMatch(/combine PDFs in the order/i);
    expect(categoryName('en', 'organize')).toBe('ORGANIZE PDF');
  });

  it('translates every tool name and description into Arabic', () => {
    for (const tool of ALL_TOOLS) {
      expect(toolName('ar', tool.id), `${tool.id} name`).toMatch(ARABIC_LETTER);
      expect(toolDescription('ar', tool.id), `${tool.id} description`).toMatch(ARABIC_LETTER);
    }
    for (const categoryId of CATEGORY_IDS) {
      expect(categoryName('ar', categoryId), categoryId).toMatch(ARABIC_LETTER);
    }
  });

  it('keeps the release-facing limits in the Arabic copy', () => {
    expect(toolDescription('ar', 'blackout-pdf')).toMatch(/غير متاح/);
    expect(toolDescription('ar', 'blackout-pdf')).toMatch(/سرية/);
    expect(toolDescription('ar', 'pdf-to-pdfa')).toMatch(/PDF\/A/);
    expect(toolDescription('ar', 'pdf-to-pdfa')).toMatch(/غير مُتحقَّق|غير متحقق/);
    expect(toolDescription('ar', 'scan-to-pdf')).toMatch(/غير متاح/);
    expect(toolDescription('ar', 'ai-summarizer')).toMatch(/نسخة الويب/);
    // A disabled tool must not read as a promise in either language.
    for (const id of ['scan-to-pdf', 'blackout-pdf', 'decrypt-pdf', 'protect-pdf'] as const) {
      expect(toolDescription('ar', id)).toMatch(/غير متاح/);
    }
  });
});
