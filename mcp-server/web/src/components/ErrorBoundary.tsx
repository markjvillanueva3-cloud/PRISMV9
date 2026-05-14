import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
            <p className="max-w-md text-center text-sm text-slate-500">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
