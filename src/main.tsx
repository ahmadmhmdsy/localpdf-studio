import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { useToolsStore } from './store/toolsStore';

// Initialize Sentry for error monitoring (only if DSN is configured)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}

// Block initial render until persisted UI preferences (theme, skin) are
// loaded from IndexedDB. This prevents a flash of the wrong theme on
// first paint.
// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const hydrated = useToolsStore((s) => s.hydrated);
  const darkMode = useToolsStore((s) => s.darkMode);

  // Apply theme immediately after hydration to prevent flash
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  if (!hydrated) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          background: 'var(--bg, #0f0f0f)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--surface-2, #333)',
            borderTopColor: 'var(--accent, #ff6b9d)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Kick off hydration before rendering
useToolsStore.getState().hydrate().then(() => {
  createRoot(document.getElementById('root')!).render(<Root />);
});