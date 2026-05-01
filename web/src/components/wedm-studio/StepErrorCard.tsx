/**
 * StepErrorCard — Reusable error display with retry for WEDM wizard steps.
 * WEDM-MS0 U-WEDM20
 *
 * Shows API/pipeline errors with optional retry button.
 * Matches existing step error styling (red-50/red-200 light, red-900/red-700 dark).
 * WCAG: role="alert", aria-live="assertive".
 */

import { Button } from "../ui";

interface StepErrorCardProps {
  /** Error message to display */
  error: string;
  /** Optional prefix (e.g., "Feasibility check failed: ") */
  prefix?: string;
  /** Retry callback — if provided, shows a Retry button */
  onRetry?: (() => void) | (() => Promise<unknown>);
}

export default function StepErrorCard({ error, prefix, onRetry }: StepErrorCardProps) {
  return (
    <div
      className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300 flex items-start justify-between gap-2"
      role="alert"
      aria-live="assertive"
    >
      <span>{prefix}{error}</span>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="flex-shrink-0"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
