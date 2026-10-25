import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useI18n } from './useI18n';
import {
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
  directionFor,
  isLocale,
  messageKeys,
  otherLocale,
  translate,
} from './index';
import { en } from './locales/en';
import { ar } from './locales/ar';
import { useToolsStore } from '../store/toolsStore';

/** Values that are deliberately identical in both languages. */
const SAME_IN_BOTH = new Set([
  'shell.brand',
  'shell.sidebar.brandMark',
  'shell.sidebar.quick.pdfJpg',
]);

describe('i18n', () => {
  afterEach(() => {
    useToolsStore.setState({ locale: DEFAULT_LOCALE });
  });

  it('ships English and Arabic only, each with a direction', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ar']);
    expect(LOCALES.en.dir).toBe('ltr');
    expect(LOCALES.ar.dir).toBe('rtl');
    expect(LOCALES.ar.nativeName).toBe('العربية');
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('validates locale identifiers before they reach the store', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it('maps a locale to its writing direction', () => {
    expect(directionFor('en')).toBe('ltr');
    expect(directionFor('ar')).toBe('rtl');
    expect(otherLocale('en')).toBe('ar');
    expect(otherLocale('ar')).toBe('en');
  });

  it('returns the English text for the English locale', () => {
    expect(translate('en', 'shell.allTools')).toBe('All PDF Tools');
  });

  it('returns the Arabic text for the Arabic locale', () => {
    expect(translate('ar', 'shell.allTools')).toBe('كل أدوات PDF');
  });

  it('interpolates named variables', () => {
    expect(translate('en', 'shell.footer.copyright', { year: 2026 })).toContain('2026');
    expect(translate('ar', 'chrome.upload.tooLarge', { name: 'scan.pdf', max: 100 })).toContain('scan.pdf');
    expect(translate('ar', 'chrome.upload.tooLarge', { name: 'scan.pdf', max: 100 })).toContain('100');
  });

  it('leaves placeholders without a value visible instead of printing undefined', () => {
    const text = translate('en', 'chrome.upload.tooLarge', { name: 'scan.pdf' });
    expect(text).toContain('{max}');
    expect(text).not.toContain('undefined');
  });

  it('falls back to the key itself when a message is missing', () => {
    expect(translate('en', 'missing.key' as never)).toBe('missing.key');
  });

  it('keeps the Arabic catalog key-for-key complete and non-empty', () => {
    expect(Object.keys(ar).sort()).toEqual(messageKeys().sort());
    for (const key of messageKeys()) {
      expect(ar[key].trim().length, key).toBeGreaterThan(0);
    }
    expect(Object.keys(en).sort()).toEqual(messageKeys().sort());
  });

  it('actually translates every message except deliberate proper nouns', () => {
    for (const key of messageKeys()) {
      if (SAME_IN_BOTH.has(key)) continue;
      expect(ar[key], key).not.toBe(en[key]);
    }
  });

  it('renders the active locale and re-renders when the locale changes', () => {
    function Probe() {
      const { dir, t, locale } = useI18n();
      return (
        <p>
          {locale}:{dir}:{t('shell.allTools')}
        </p>
      );
    }

    render(<Probe />);
    expect(screen.getByText('en:ltr:All PDF Tools')).toBeInTheDocument();

    act(() => {
      useToolsStore.getState().setLocale('ar');
    });

    expect(screen.getByText('ar:rtl:كل أدوات PDF')).toBeInTheDocument();
  });
});
