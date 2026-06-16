import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  toolName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ToolErrorBoundaryInner extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.toolName || 'tool'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const toolName = this.props.toolName || 'This tool';
      
      return (
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {toolName} encountered an error
            </h2>
            
            <p className="text-gray-600 mb-4">
              Something went wrong while processing your file. Your data is safe - try again or use a different tool.
            </p>

            {this.state.error && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left">
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
                Try Again
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                All Tools
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
