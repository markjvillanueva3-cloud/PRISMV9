import { Component, type ErrorInfo, type ReactNode } from 'react';

type WorkspaceErrorBoundaryProps = {
  title: string;
  detail: string;
  resetKey?: string | number;
  children: ReactNode;
};

type WorkspaceErrorBoundaryState = {
  hasError: boolean;
};

export class WorkspaceErrorBoundary extends Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  state: WorkspaceErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WorkspaceErrorBoundary caught an error', error, errorInfo);
  }

  componentDidUpdate(prevProps: WorkspaceErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 rounded-[32px] border border-rose-300/14 bg-[linear-gradient(180deg,rgba(20,8,12,0.96)_0%,rgba(10,5,8,0.98)_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-rose-300/16 bg-rose-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100">
              Workspace recovery
            </span>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{this.props.title} unavailable</h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                {this.props.detail} PRISM caught a loading or rendering failure before it could drop the route into a blank state.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-2xl bg-rose-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.05]"
              >
                Reload app
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recovery posture</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <p>Route shell and navigation are still intact.</p>
              <p>Use retry first for transient chunk or render issues. Reload the app if the workspace asset needs a clean restart.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
