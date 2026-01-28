import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorCircleIcon } from './Icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Error display component
const ErrorDisplay: React.FC<{ error: Error; onReset: () => void }> = ({
  error,
  onReset,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <span className="font-semibold text-base">Something went wrong</span>
      </div>
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <ErrorCircleIcon className="w-12 h-12 text-red-500" />
        <span className="text-base">An error occurred while rendering this component.</span>
        <pre className="text-foreground-3 font-mono text-xs p-4 bg-background-3 rounded max-w-lg overflow-auto">
          {error.message}
        </pre>
        <button className="btn-primary" onClick={onReset}>
          Try Again
        </button>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorDisplay error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}
