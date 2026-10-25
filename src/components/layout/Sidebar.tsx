import { Link, useLocation } from 'react-router-dom';
import { useToolsStore } from '../../store/toolsStore';
import { useI18n } from '../../i18n/useI18n';

/**
 * Bento sidebar — replaces the floating pill header when the user picks the
 * "bento" skin. Same nav model as the prototype (`design-preview/.../bento-full/home.html`)
 * but with live links into the real app routes.
 */
export default function Sidebar() {
  const darkMode = useToolsStore((s) => s.darkMode);
  const toggleDarkMode = useToolsStore((s) => s.toggleDarkMode);
  const { t } = useI18n();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isEditor = location.pathname === '/editor';

  return (
    <aside className="bento-sidebar" aria-label={t('shell.sidebar.primary')}>
      <Link to="/" className="bento-sidebar-logo" aria-label={t('shell.sidebar.home')}>
        <span className="mark" aria-hidden="true">L</span>
        {t('shell.sidebar.brandMark')}
      </Link>

      <nav className="bento-side-group" aria-label={t('shell.sidebar.workspace')}>
        <span className="bento-side-label">{t('shell.sidebar.workspace')}</span>
        <Link
          to="/"
          className="bento-side-link"
          aria-current={isHome ? 'page' : undefined}
        >
          <span aria-hidden="true">◇</span> {t('shell.sidebar.workspace.allTools')}
        </Link>
        <Link
          to="/editor"
          className="bento-side-link"
          aria-current={isEditor ? 'page' : undefined}
        >
          <span aria-hidden="true">▤</span> {t('shell.sidebar.workspace.visualEditor')}
        </Link>
        <Link to="/#quick-picks" className="bento-side-link">
          <span aria-hidden="true">↻</span> {t('shell.sidebar.workspace.quickPicks')}
        </Link>
      </nav>

      <nav className="bento-side-group" aria-label={t('shell.sidebar.quickTools')}>
        <span className="bento-side-label">{t('shell.sidebar.quick')}</span>
        <Link to="/tools/merge-pdf" className="bento-side-link">
          <span aria-hidden="true">⊕</span> {t('shell.sidebar.quick.mergePdf')}
        </Link>
        <Link to="/tools/split-pdf" className="bento-side-link">
          <span aria-hidden="true">⎘</span> {t('shell.sidebar.quick.splitPdf')}
        </Link>
        <Link to="/tools/pdf-to-jpg" className="bento-side-link">
          <span aria-hidden="true">⇄</span> {t('shell.sidebar.quick.pdfJpg')}
        </Link>
        <Link to="/tools/sign-pdf" className="bento-side-link">
          <span aria-hidden="true">✍</span> {t('shell.sidebar.quick.signPdf')}
        </Link>
      </nav>

      <nav className="bento-side-group" aria-label={t('shell.sidebar.help')}>
        <span className="bento-side-label">{t('shell.sidebar.help')}</span>
        <Link to="/#privacy" className="bento-side-link">
          <span aria-hidden="true">ⓘ</span> {t('shell.sidebar.help.dataHandling')}
        </Link>
      </nav>

      <div className="bento-side-foot">
        <button
          type="button"
          className="bento-icon-btn"
          onClick={toggleDarkMode}
          aria-label={t(darkMode ? 'shell.theme.toLight' : 'shell.theme.toDark')}
          style={{ width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
        >
          <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span> {t(darkMode ? 'shell.sidebar.light' : 'shell.sidebar.dark')}
        </button>
        <span><span className="dot" />{t('shell.sidebar.version')}</span>
      </div>
    </aside>
  );
}
