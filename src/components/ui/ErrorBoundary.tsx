import React, { ErrorInfo, ReactNode } from 'react';
import { WrenchIcon } from '../../constants';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
// FIX: The ErrorBoundary class must extend React.Component to be a valid class component.
// This provides access to `this.setState` for managing state and `this.props` for
// accessing children, which resolves the component errors.
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  // Static method to update state when an error occurs
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Lifecycle method for logging errors
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  /**
   * Resets the error state to allow the UI to attempt a recovery.
   */
  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      // Fallback UI to be displayed when a crash occurs.
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 m-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 text-red-600 dark:text-red-400">
            <WrenchIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
            We encountered an unexpected error in this component. Our team has been notified.
          </p>
          <div className="flex gap-3">

            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
          {this.state.error && (
              <details className="mt-6 text-left w-full max-w-md bg-white dark:bg-neutral-950 p-4 rounded border border-neutral-200 dark:border-neutral-800">
                  <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-300">View Error Details</summary>
                  <pre className="mt-2 text-[10px] text-red-500 overflow-auto whitespace-pre-wrap font-mono max-h-32">
                      {this.state.error.toString()}
                  </pre>
              </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
