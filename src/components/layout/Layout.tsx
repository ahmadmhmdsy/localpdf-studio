import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useToolsStore } from '../../store';
import { useI18n } from '../../i18n/useI18n';

export default function Layout() {
  const darkMode = useToolsStore((s) => s.darkMode);
  const skin = useToolsStore((s) => s.skin);
  const hydrated = useToolsStore((s) => s.hydrated);
  const hydrate = useToolsStore((s) => s.hydrate);
  const { t } = useI18n();

  // Persisted preferences (theme + skin) are read from IndexedDB on first mount.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    // Default skin is 'glass'; on first render before hydration we still set
    // the attribute so the CSS rules in [data-skin] can engage.
    document.documentElement.setAttribute('data-skin', skin);
  }, [skin]);

  // Bento skin renders a sidebar + flat main area; glass keeps the
  // floating-pill header + ambient orbs and grain.
  if (skin === 'bento') {
    return (
      <div className="relative min-h-screen" style={{ background: 'var(--bg)' }}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
        >
          {t('shell.skipToContent')}
        </a>
        <div className="bento-shell">
          <Sidebar />
          <main id="main-content" className="bento-main flex flex-col min-h-screen" data-hydrated={hydrated ? 'true' : 'false'}>
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        {t('shell.skipToContent')}
      </a>
      <div className="orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
