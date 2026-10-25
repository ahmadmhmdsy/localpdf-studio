import { useCallback } from 'react';
import { useToolsStore } from '../store/toolsStore';
import { directionFor, translate, type Direction, type Locale, type MessageKey } from './index';

export type I18n = {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
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

  return { locale, dir: directionFor(locale), setLocale, t };
}
