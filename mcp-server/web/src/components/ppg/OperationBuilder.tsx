import { useState } from "react";
import { usePpgOperations } from "../../hooks/usePpg";
import { ppgApi } from "../../api/ppg";
import type { PpgProgramOperation, PostController } from "../../types/ppg";
import Spinner from "../ui/Spinner";

interface OperationBuilderProps {
  controller?: PostController;
  onGenerate: (gcode: string) => void;
}

interface OpEntry {
  id: string;
  operation: string;
  tool_number: number;
  rpm: number;
  feed_rate: number;
  params: Record<string, string>;
}

function makeId() {
  return `op-${crypto.randomUUID()}`;
}

export default function OperationBuilder({
  controller,
  onGenerate,
}: OperationBuilderProps) {
  const { data: opsData, loading: opsLoading } = usePpgOperations();
  const [entries, setEntries] = useState<OpEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const addOperation = (opId: string) => {
    setEntries((prev) => [
      ...prev,
      {
        id: makeId(),
        operation: opId,
        tool_number: prev.length + 1,
        rpm: 3000,
        feed_rate: 500,
        params: {},
      },
    ]);
  };

  const removeOp = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const moveOp = (idx: number, dir: -1 | 1) => {
    setEntries((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateOp = (id: string, field: string, value: string | number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    );
  };

  const handleGenerate = async () => {
    if (!controller || entries.length === 0) return;
    setGenerating(true);
    setGenError(null);
    try {
      const operations: PpgProgramOperation[] = entries.map((e) => ({
        type: e.operation,
        operation: e.operation,
        tool_number: e.tool_number,
        rpm: e.rpm,
        feed_rate: e.feed_rate,
        params: {},
      }));
      const result = await ppgApi.program({ controller, operations });
      onGenerate(result.gcode);
    } catch (e) {
      setGenError((e as Error).message || "Program generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (opsLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Add operation dropdown */}
      <div className="flex items-center gap-2">
        <select
          onChange={(e) => {
            if (e.target.value) addOperation(e.target.value);
            e.target.value = "";
          }}
          className="flex-1 rounded border border-slate-300 px-2 py-1
            text-xs dark:border-slate-600 dark:bg-slate-800
            dark:text-slate-100"
          defaultValue=""
          aria-label="Add operation"
        >
          <option value="" disabled>
            + Add operation...
          </option>
          {opsData?.map((op) => (
            <option key={op.id} value={op.id}>{op.name}</option>
          ))}
        </select>
      </div>

      {/* Operation cards */}
      {entries.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">
          Add operations to build a multi-tool program
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="rounded border border-slate-200 bg-white
                p-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {idx + 1}
                </span>
                <span className="flex-1 text-xs font-medium
                  text-slate-700 dark:text-slate-300">
                  {entry.operation}
                </span>
                <button
                  type="button"
                  onClick={() => moveOp(idx, -1)}
                  disabled={idx === 0}
                  className="text-[10px] text-slate-400
                    disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveOp(idx, 1)}
                  disabled={idx === entries.length - 1}
                  className="text-[10px] text-slate-400
                    disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeOp(entry.id)}
                  className="text-[10px] text-red-400
                    hover:text-red-600"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-500">Tool</span>
                  <input
                    type="number"
                    value={entry.tool_number}
                    onChange={(e) =>
                      updateOp(entry.id, "tool_number", +e.target.value)
                    }
                    className="rounded border border-slate-300 px-1.5
                      py-0.5 text-[11px] dark:border-slate-600
                      dark:bg-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-500">RPM</span>
                  <input
                    type="number"
                    value={entry.rpm}
                    onChange={(e) =>
                      updateOp(entry.id, "rpm", +e.target.value)
                    }
                    className="rounded border border-slate-300 px-1.5
                      py-0.5 text-[11px] dark:border-slate-600
                      dark:bg-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-500">Feed</span>
                  <input
                    type="number"
                    value={entry.feed_rate}
                    onChange={(e) =>
                      updateOp(entry.id, "feed_rate", +e.target.value)
                    }
                    className="rounded border border-slate-300 px-1.5
                      py-0.5 text-[11px] dark:border-slate-600
                      dark:bg-slate-700 dark:text-slate-100"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate error */}
      {genError && (
        <p className="text-xs text-red-500">{genError}</p>
      )}

      {/* Generate program button */}
      {entries.length > 0 && (
        <button
          type="button"
          disabled={!controller || generating}
          onClick={handleGenerate}
          className="rounded bg-primary-600 px-3 py-1.5 text-xs
            font-medium text-white hover:bg-primary-700
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating
            ? "Generating..."
            : !controller
              ? "Select a controller"
              : `Generate Program (${entries.length} ops)`}
        </button>
      )}
    </div>
  );
}
