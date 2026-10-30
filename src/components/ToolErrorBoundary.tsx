import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { translate, type MessageKey } from '../i18n';
import { useToolsStore } from '../store/toolsStore';

// A class component cannot call useI18n, so it reads the locale when it renders.
const t = (key: MessageKey, vars?: Record<string, string | number>) =>
  translate(useToolsStore.getState().locale, key, vars);

interface Props {
  children: ReactNode;
  toolName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ToolErrorBoundaryInner extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.toolName || 'tool'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      const toolName = this.props.toolName || t('error.tool.fallbackName');
      
      return (
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[var(--surface)] rounded-2xl shadow-lg p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              {t('error.tool.title', { name: toolName })}
            </h2>
            
            <p className="text-[var(--text-2)] mb-4">
              {t('error.tool.body')}
            </p>

            {this.state.error && (
              <div className="bg-[var(--surface-2)] rounded-lg p-3 mb-6 text-start">
                <p className="text-xs font-mono text-red-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('error.tool.retry')}
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2)] text-[var(--text-2)] rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                {t('error.tool.allTools')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper to use navigate from react-router if needed
export default function ToolErrorBoundary(props: Props) {
  return <ToolErrorBoundaryInner {...props} />;
}
