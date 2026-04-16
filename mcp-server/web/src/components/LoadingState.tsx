import { describeApiError } from '../api/requestCore';

type LoadingStateProps = {
  label?: string;
  detail?: string;
  variant?: 'inline' | 'panel';
};

type ErrorStateProps = {
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  hint?: string;
  actionLabel?: string;
};

/** Loading state — R5 mandatory: no blank screens for async data */
export function LoadingState({
  label = 'Loading...',
  detail,
  variant = 'inline',
}: LoadingStateProps) {
  if (variant === 'panel') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" role="status">
        <div className="flex items-start gap-4">
          <svg className="mt-0.5 h-5 w-5 animate-spin text-prism-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-slate-900">{label}</div>
            {detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-20 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 text-gray-500" role="status">
      <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <div>
        <div>{label}</div>
        {detail ? <div className="mt-1 text-sm text-gray-400">{detail}</div> : null}
      </div>
    </div>
  );
}

/** Error state — R5 mandatory: actionable errors, not generic */
export function ErrorState({
  message,
  error,
  onRetry,
  title,
  hint,
  actionLabel,
}: ErrorStateProps) {
  const presentation = describeApiError(error ?? message ?? 'Data unavailable', message ?? 'Data unavailable');
  const resolvedTitle = title ?? presentation.title;
  const resolvedMessage = message ?? presentation.message;
  const resolvedHint = hint ?? presentation.hint;
  const resolvedActionLabel = actionLabel ?? presentation.retryLabel;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" role="alert">
      <p className="font-medium">{resolvedTitle}</p>
      <p className="mt-1 text-sm">{resolvedMessage}</p>
      {resolvedHint ? <p className="mt-2 text-sm text-amber-900/80">{resolvedHint}</p> : null}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-amber-100 px-3 py-1 text-sm transition-colors hover:bg-amber-200"
        >
          {resolvedActionLabel}
        </button>
      )}
    </div>
  );
}
