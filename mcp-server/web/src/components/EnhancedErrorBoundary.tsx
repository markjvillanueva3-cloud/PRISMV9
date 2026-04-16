/**
 * Enhanced Error Boundary — Improved Error UX
 * S4-MS1 P0-U04: Error Handling & Offline Support
 *
 * Features:
 * - Detailed error display with stack trace (dev mode)
 * - Copy error details to clipboard
 * - Retry button with cooldown
 * - Error reporting integration
 * - Offline detection
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Component/section name for error reporting */
  name?: string;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Show detailed error in development */
  showDetails?: boolean;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
  retryCount: number;
  lastRetry: number;
}

const RETRY_COOLDOWN_MS = 2000;
const MAX_RETRIES = 3;

export class EnhancedErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    errorInfo: null,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    retryCount: 0,
    lastRetry: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
      error,
      errorInfo.componentStack
    );

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service (if configured)
    this.reportError(error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    // Auto-retry on reconnect if there was an error
    if (this.state.error && this.state.retryCount < MAX_RETRIES) {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  reportError(error: Error, errorInfo: ErrorInfo) {
    // Integration point for error tracking (Sentry, etc.)
    // For now, we'll store in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        name: this.props.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      const logs = JSON.parse(localStorage.getItem('prism_error_log') || '[]');
      logs.push(errorLog);
      // Keep last 10 errors
      localStorage.setItem('prism_error_log', JSON.stringify(logs.slice(-10)));
    } catch {
      // Ignore localStorage errors
    }
  }

  handleRetry = () => {
    const now = Date.now();
    if (now - this.state.lastRetry < RETRY_COOLDOWN_MS) {
      return; // Still in cooldown
    }

    this.setState((prev) => ({
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
      lastRetry: now,
    }));
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorText = `
Error: ${error.message}

Stack:
${error.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}

URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Time: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard');
    } catch {
      console.error('Failed to copy error to clipboard');
    }
  };

  render() {
    const { error, errorInfo, isOffline, retryCount } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (!error) {
      return children;
    }

    // Custom fallback
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleRetry);
      }
      return fallback;
    }

    const canRetry = retryCount < MAX_RETRIES;

    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[200px]">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Message */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isOffline ? 'You are offline' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {isOffline
              ? 'Please check your internet connection and try again.'
              : error.message || 'An unexpected error occurred.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.handleRetry}
            disabled={!canRetry}
            className={`
              px-4 py-2 rounded-md text-sm font-medium
              ${canRetry
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {canRetry ? 'Try Again' : 'Max retries reached'}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Reload Page
          </button>
        </div>

        {/* Retry count */}
        {retryCount > 0 && (
          <p className="text-xs text-gray-500">
            Retry attempts: {retryCount}/{MAX_RETRIES}
          </p>
        )}

        {/* Details (dev mode) */}
        {showDetails && (
          <details className="mt-4 w-full max-w-2xl">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show error details
            </summary>
            <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto">
              <div className="flex justify-end mb-2">
                <button
                  onClick={this.handleCopyError}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Copy to clipboard
                </button>
              </div>
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {error.stack}
              </pre>
              {errorInfo?.componentStack && (
                <>
                  <hr className="my-2 border-gray-300" />
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    );
  }
}

export default EnhancedErrorBoundary;
