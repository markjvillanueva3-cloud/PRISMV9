/** Loading state — R5 mandatory: no blank screens for async data */
export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-gray-500" role="status">
      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

/** Error state — R5 mandatory: actionable errors, not generic */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800" role="alert">
      <p className="font-medium">Data unavailable</p>
      <p className="text-sm mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
