import { Link } from 'react-router-dom';
import { FileText, Languages, Menu, Moon, Settings, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useToolsStore } from '../../store';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import ApiKeySettings from '../settings/ApiKeySettings';
import SkinPicker from './SkinPicker';
import { isTauri } from '../../lib/native';
import { useI18n } from '../../i18n/useI18n';
import { LOCALES, otherLocale, type MessageKey } from '../../i18n';

const NAV_LINKS: ReadonlyArray<{ to: string; key: MessageKey }> = [
  { to: '/tools/merge-pdf', key: 'shell.nav.mergePdf' },
  { to: '/tools/split-pdf', key: 'shell.nav.splitPdf' },
  { to: '/tools/pdf-to-jpg', key: 'shell.nav.pdfToJpg' },
  { to: '/tools/jpg-to-pdf', key: 'shell.nav.jpgToPdf' },
];

export default function Header() {
  const darkMode = useToolsStore((s) => s.darkMode);
  const toggleDarkMode = useToolsStore((s) => s.toggleDarkMode);
  const { t, locale, setLocale } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const drawerRef = useFocusTrap<HTMLDivElement>(mobileOpen);

  const closeMobile = () => setMobileOpen(false);
  const showSettingsButton = isTauri();
  const nextLocale = otherLocale(locale);

  const languageButton = (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      className="flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 transition-colors"
      style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
      aria-label={t('shell.language.switch')}
      lang={nextLocale}
      dir={LOCALES[nextLocale].dir}
    >
      <Languages size={18} aria-hidden="true" />
      <span className="text-xs font-semibold">{LOCALES[nextLocale].nativeName}</span>
    </button>
  );

  return (
    <>
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 mt-6 mx-auto rounded-full backdrop-blur-xl bg-[var(--surface)]/10 border border-white/20 shadow-2xl">
        <nav className="flex items-center gap-5 px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--accent)' }}>
              <FileText size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:inline" style={{ color: 'var(--text)', fontFamily: 'sans-serif' }}>
              {t('shell.brand')}
            </span>
          </Link>
          <Link
            to="/editor"
            className="hidden md:inline-block text-sm font-semibold px-3.5 py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--accent-text)', background: 'var(--accent-dim)' }}
          >
            {t('shell.visualEditor')}
          </Link>
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-2)' }}>
                {t(link.key)}
              </Link>
            ))}
            <Link to="/" className="text-sm font-medium transition-colors" style={{ color: 'var(--accent-text)' }}>
              {t('shell.allTools')}
            </Link>
          </div>
          <button
            onClick={toggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
            aria-label={t(darkMode ? 'shell.theme.toLight' : 'shell.theme.toDark')}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {languageButton}
          <SkinPicker />
          {showSettingsButton && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
              aria-label={t('shell.settings.open')}
            >
              <Settings size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
            aria-label={t('shell.menu.open')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu size={18} />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          ref={drawerRef}
          id="mobile-nav"
          className="fixed inset-0 z-[60] md:hidden flex flex-col"
          style={{ background: 'var(--surface)', color: 'var(--text)' }}
          role="dialog"
          aria-modal="true"
          aria-label={t('shell.nav.site')}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-base font-bold tracking-tight" style={{ fontFamily: 'sans-serif' }}>
              {t('shell.brand')}
            </span>
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
              aria-label={t('shell.menu.close')}
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-2">
            <Link
              to="/editor"
              onClick={closeMobile}
              className="text-base font-semibold px-4 py-3 rounded-lg"
              style={{ color: 'var(--accent-text)', background: 'var(--accent-dim)' }}
            >
              {t('shell.visualEditor')}
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMobile}
                className="text-base font-medium px-4 py-3 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-2)' }}
              >
                {t(link.key)}
              </Link>
            ))}
            <Link
              to="/"
              onClick={closeMobile}
              className="text-base font-medium px-4 py-3 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--accent-text)' }}
            >
              {t('shell.allTools')}
            </Link>
            <div className="pt-2">{languageButton}</div>
          </div>
        </div>
      )}
      <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
