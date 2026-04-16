import { usePpgOptimize } from "../../hooks/usePpg";
import type { PostController } from "../../types/ppg";
import Spinner from "../ui/Spinner";

const CONTROLLER_EXTENSIONS: Record<string, string> = {
  fanuc: ".nc",
  haas: ".nc",
  siemens: ".mpf",
  heidenhain: ".h",
  mazak: ".nc",
  okuma: ".nc",
  generic: ".gcode",
};

interface OptimizeDownloadProps {
  gcode: string;
  controller?: PostController;
  onOptimized: (gcode: string) => void;
}

export default function OptimizeDownload({
  gcode,
  controller,
  onOptimized,
}: OptimizeDownloadProps) {
  const { data, loading, error, execute, reset } = usePpgOptimize();

  const handleOptimize = () => {
    if (!gcode.trim()) return;
    execute({ gcode, controller });
  };

  const handleApply = () => {
    const code = data?.optimized_gcode ?? data?.gcode;
    if (code) onOptimized(code);
  };

  const handleDownload = () => {
    const content = data?.optimized_gcode ?? gcode;
    const ext = CONTROLLER_EXTENSIONS[controller ?? "generic"]
      ?? ".gcode";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `program${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!gcode.trim() || loading}
          onClick={handleOptimize}
          className="rounded bg-primary-600 px-3 py-1 text-[11px]
            font-medium text-white hover:bg-primary-700
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Optimizing..." : "Optimize"}
        </button>
        <button
          type="button"
          disabled={!gcode.trim()}
          onClick={handleDownload}
          className="rounded border border-slate-300 px-3 py-1
            text-[11px] font-medium text-slate-700
            hover:bg-slate-100
            dark:border-slate-600 dark:text-slate-300
            dark:hover:bg-slate-700
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download {controller
            ? (CONTROLLER_EXTENSIONS[controller] ?? ".gcode")
            : ".gcode"}
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
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Optimizing...</span>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Optimization report */}
      {data && !loading && (
        <div className="rounded border border-slate-200 bg-white
          p-3 dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-2 text-xs font-semibold text-slate-700
            dark:text-slate-300">
            Optimization Report
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">Original:</span>{" "}
              <span className="font-medium">{data.original_lines} lines</span>
            </div>
            <div>
              <span className="text-slate-500">Optimized:</span>{" "}
              <span className="font-medium">{data.optimized_lines} lines</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Saved:</span>{" "}
              <span className="font-medium text-green-600">
                {data.original_lines - data.optimized_lines} lines
                ({(data.estimated_time_saved_sec ?? 0).toFixed(1)}s est.)
              </span>
            </div>
          </div>
          {(data.savings?.length ?? 0) > 0 && (
            <ul className="mt-2 space-y-0.5">
              {data.savings!.map((s: string) => (
                <li key={s} className="text-[10px] text-slate-500">
                  {s}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="mt-2 w-full rounded bg-green-600 px-2 py-1
              text-[11px] font-medium text-white
              hover:bg-green-700"
          >
            Apply Optimized Code to Editor
          </button>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <p className="py-2 text-center text-xs text-slate-400">
          Optimize to merge rapids, remove redundant codes
        </p>
      )}
    </div>
  );
}
