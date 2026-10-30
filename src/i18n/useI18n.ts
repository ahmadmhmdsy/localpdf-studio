import { useCallback } from 'react';
import { useToolsStore } from '../store/toolsStore';
import { categoryName, toolCopy, toolDescription, toolName, type ToolCopy } from './catalog';
import { availabilityCopy, privacyNotice, type AvailabilityCopy } from './registryCopy';
import type { ToolCategoryId } from '../constants/tools';
import type { ToolId } from '../config/featureRegistry';
import { directionFor, translate, type Direction, type Locale, type MessageKey } from './index';

export type I18n = {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  /** Tool name + description from the locale-bound catalog copy (B1.2). */
  tool: (toolId: ToolId) => ToolCopy;
  toolName: (toolId: ToolId) => string;
  toolDescription: (toolId: ToolId) => string;
  /** Category heading from the locale-bound catalog copy (B1.2). */
  categoryName: (categoryId: ToolCategoryId) => string;
  /** Registry support and limitation sentences in the active locale (B1.4c). */
  availability: (toolId: ToolId) => AvailabilityCopy;
  /** Registry data-handling sentence in the active locale (B1.4c). */
  privacyNotice: (toolId: ToolId) => string;
};

/**
 * Read the active locale and translate keys. The locale itself lives in the
 * persisted UI-preferences store, so a language choice survives a reload
 * without a second storage layer.
 */
export function useI18n(): I18n {
  const locale = useToolsStore((s) => s.locale);
  const setLocale = useToolsStore((s) => s.setLocale);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  const tool = useCallback((toolId: ToolId) => toolCopy(locale, toolId), [locale]);
  const name = useCallback((toolId: ToolId) => toolName(locale, toolId), [locale]);
  const description = useCallback((toolId: ToolId) => toolDescription(locale, toolId), [locale]);
  const category = useCallback(
    (categoryId: ToolCategoryId) => categoryName(locale, categoryId),
    [locale],
  );

  const availability = useCallback(
    (toolId: ToolId) => availabilityCopy(locale, toolId),
    [locale],
  );
  const notice = useCallback((toolId: ToolId) => privacyNotice(locale, toolId), [locale]);

  return {
    locale,
    dir: directionFor(locale),
    setLocale,
    t,
    tool,
    toolName: name,
    toolDescription: description,
    categoryName: category,
    availability,
    privacyNotice: notice,
  };
}
