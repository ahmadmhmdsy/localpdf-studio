import { Link, useLocation } from 'react-router-dom';
import { useToolsStore } from '../../store/toolsStore';

/**
 * Bento sidebar — replaces the floating pill header when the user picks the
 * "bento" skin. Same nav model as the prototype (`design-preview/.../bento-full/home.html`)
 * but with live links into the real app routes.
 */
export default function Sidebar() {
  const darkMode = useToolsStore((s) => s.darkMode);
  const toggleDarkMode = useToolsStore((s) => s.toggleDarkMode);
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isEditor = location.pathname === '/editor';

  return (
    <aside className="bento-sidebar" aria-label="Primary">
      <Link to="/" className="bento-sidebar-logo" aria-label="LocalPDF Studio — home">
        <span className="mark" aria-hidden="true">L</span>
        LocalPDF
      </Link>

      <nav className="bento-side-group" aria-label="Workspace">
        <span className="bento-side-label">Workspace</span>
        <Link
          to="/"
          className="bento-side-link"
          aria-current={isHome ? 'page' : undefined}
        >
          <span aria-hidden="true">◇</span> All Tools
        </Link>
        <Link
          to="/editor"
          className="bento-side-link"
          aria-current={isEditor ? 'page' : undefined}
        >
          <span aria-hidden="true">▤</span> Visual Editor
        </Link>
        <a href="#recent" className="bento-side-link">
          <span aria-hidden="true">↻</span> Recent
        </a>
        <a href="#favorites" className="bento-side-link">
          <span aria-hidden="true">★</span> Favorites
        </a>
      </nav>

      <nav className="bento-side-group" aria-label="Quick tools">
        <span className="bento-side-label">Quick</span>
        <Link to="/tools/merge-pdf" className="bento-side-link">
          <span aria-hidden="true">⊕</span> Merge PDF
        </Link>
        <Link to="/tools/split-pdf" className="bento-side-link">
          <span aria-hidden="true">⎘</span> Split PDF
        </Link>
        <Link to="/tools/pdf-to-jpg" className="bento-side-link">
          <span aria-hidden="true">⇄</span> PDF ↔ JPG
        </Link>
        <Link to="/tools/sign-pdf" className="bento-side-link">
          <span aria-hidden="true">✍</span> Sign PDF
        </Link>
      </nav>

      <nav className="bento-side-group" aria-label="Help">
        <span className="bento-side-label">Help</span>
        <a href="#shortcuts" className="bento-side-link">
          <span aria-hidden="true">?</span> Shortcuts
        </a>
        <a href="#settings" className="bento-side-link">
          <span aria-hidden="true">⏷</span> Settings
        </a>
      </nav>

      <div className="bento-side-foot">
        <button
          type="button"
          className="bento-icon-btn"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
        >
          {darkMode ? '☀ Light' : '☾ Dark'}
        </button>
        <span><span className="dot" />v1.0 · local-only</span>
      </div>
    </aside>
  );
}
