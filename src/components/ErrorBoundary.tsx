import { Component, createRef, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { translate, type MessageKey } from '../i18n';
import { useToolsStore } from '../store/toolsStore';

// A class component cannot call useI18n, so it reads the locale when it renders.
const t = (key: MessageKey, vars?: Record<string, string | number>) =>
  translate(useToolsStore.getState().locale, key, vars);

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  private errorRef = createRef<HTMLDivElement>();

  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    // Move focus to the alert container after re-render so screen readers
    // announce it and keyboard users land at the error UI.
    // Defer via microtask so the ref is attached before we focus.
    queueMicrotask(() => {
      this.errorRef.current?.focus();
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          ref={this.errorRef}
          role="alert"
          tabIndex={-1}
          className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4 outline-none"
        >
          <div className="max-w-md w-full bg-[var(--surface)] rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
              {t('error.app.title')}
            </h1>

            <p className="text-[var(--text-2)] mb-6">
              {t('error.app.body')}
            </p>

            {this.state.error && (
              <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6 text-start">
                <p className="text-sm font-mono text-red-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('error.app.reload')}
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2)] text-[var(--text-2)] rounded-lg font-medium transition-colors"
              >
                {t('error.app.home')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
