import { usePpgValidate } from "../../hooks/usePpg";
import type { PpgIssue, PostController } from "../../types/ppg";
import Spinner from "../ui/Spinner";

interface ValidationPanelProps {
  gcode: string;
  controller?: PostController;
  onGoToLine?: (line: number) => void;
}

const severityConfig = {
  error: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
  },
} as const;

export default function ValidationPanel({
  gcode,
  controller,
  onGoToLine,
}: ValidationPanelProps) {
  const { data, loading, error, execute, reset } = usePpgValidate();

  const handleValidate = () => {
    if (!gcode.trim() || !controller) return;
    execute({ gcode, controller });
  };

  const allIssues: PpgIssue[] = [
    ...(data?.errors ?? []),
    ...(data?.warnings ?? []),
  ];

  const errorCount = data?.errors?.length ?? 0;
  const warnCount = data?.warnings?.length ?? 0;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Validate button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!gcode.trim() || !controller || loading}
          onClick={handleValidate}
          className="rounded bg-primary-600 px-3 py-1 text-[11px]
            font-medium text-white transition-colors
            hover:bg-primary-700
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Validating..." : "Validate"}
        </button>
        {data && (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
        {!controller && (
          <span className="text-[10px] text-slate-400">
            Select a controller first
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">
            Validating G-code...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Results summary */}
      {data && !loading && (
        <>
          <div className="flex items-center gap-3 text-[11px]">
            <span className={data.valid
              ? "font-medium text-green-600"
              : "font-medium text-red-600"}>
              {data.valid ? "Valid" : "Invalid"}
            </span>
            {errorCount > 0 && (
              <span className="text-red-600">
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-yellow-600">
                {warnCount} warning{warnCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Issue list */}
          {allIssues.length > 0 ? (
            <div className="flex flex-col gap-1">
              {allIssues.map((issue, i) => {
                const cfg = severityConfig[issue.severity] ?? severityConfig.info;
                return (
                  <button
                    key={`${issue.severity}-${issue.line ?? "x"}-${issue.code ?? i}`}
                    type="button"
                    onClick={() => issue.line && onGoToLine?.(issue.line)}
                    disabled={!issue.line}
                    className={`flex items-start gap-2 rounded border
                      px-2 py-1.5 text-left text-[11px]
                      ${cfg.bg} ${cfg.border}
                      ${issue.line ? "cursor-pointer hover:opacity-80" : ""}`}
                  >
                    <span className={`mt-1 h-1.5 w-1.5
                      shrink-0 rounded-full ${cfg.dot}`}
                    />
                    <span className={`flex-1 ${cfg.text}`}>
                      {issue.message}
                    </span>
                    {issue.line && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        L{issue.line}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-green-600">
              No issues found
            </p>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <p className="py-4 text-center text-xs text-slate-400">
          Click Validate to check G-code for controller compatibility
        </p>
      )}
    </div>
  );
}
