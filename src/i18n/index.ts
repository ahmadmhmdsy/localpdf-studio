import { en, type MessageKey } from './locales/en';
import { ar } from './locales/ar';

/** Locales the UI can be rendered in. Arabic is first-class, not an add-on. */
export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export type LocaleMeta = {
  /** Name in the language itself, for the language switcher. */
  nativeName: string;
  /** English name, for logs and tests. */
  englishName: string;
  dir: Direction;
};

export const LOCALES: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', englishName: 'English', dir: 'ltr' },
  ar: { nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl' },
};

export const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Locale[];

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ar };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value);
}

export function directionFor(locale: Locale): Direction {
  return LOCALES[locale].dir;
}

/** The locale that should be shown when the user asks to switch. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ar' : 'en';
}

/**
 * Look up a message and interpolate `{name}` placeholders. A key that is
 * missing from the active catalog falls back to English, then to the key
 * itself, so a bad key is visible instead of rendering "undefined".
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = MESSAGES[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** All message keys, for parity tests and lint-style guards. */
export function messageKeys(): MessageKey[] {
  return Object.keys(en) as MessageKey[];
}

export type { MessageKey };
