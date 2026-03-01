import { useState, useMemo } from "react";
import { usePpgOperations } from "../../hooks/usePpg";
import { ppgApi } from "../../api/ppg";
import type { PpgOperationInfo, PostController } from "../../types/ppg";
import Spinner from "../ui/Spinner";

/** Category grouping for operations */
const CATEGORY_ORDER = [
  "Milling", "Drilling", "Threading", "Turning", "Structure", "Other",
];

interface TemplateBrowserProps {
  controller?: PostController;
  onGenerate: (gcode: string) => void;
}

export default function TemplateBrowser({ controller, onGenerate }: TemplateBrowserProps) {
  const { data, loading, error, refetch } = usePpgOperations();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PpgOperationInfo | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    if (!data?.length) return new Map<string, PpgOperationInfo[]>();

    const q = search.toLowerCase().trim();
    const filtered = q
      ? data.filter(
          (op) => op.name.toLowerCase().includes(q) || op.id.toLowerCase().includes(q),
        )
      : data;

    const groups = new Map<string, PpgOperationInfo[]>();
    for (const op of filtered) {
      const cat = CATEGORY_ORDER.find(
        (c) => c.toLowerCase() === (op.category || "other").toLowerCase(),
      ) ?? "Other";
      const list = groups.get(cat) ?? [];
      list.push(op);
      groups.set(cat, list);
    }

    const sorted = new Map<string, PpgOperationInfo[]>();
    for (const cat of CATEGORY_ORDER) {
      const list = groups.get(cat);
      if (list?.length) sorted.set(cat, list);
    }
    return sorted;
  }, [data, search]);

  const handleSelect = (op: PpgOperationInfo) => {
    if (selected?.id === op.id) {
      setSelected(null);
      setParamValues({});
    } else {
      setSelected(op);
      // Initialize params with defaults
      const defaults: Record<string, string> = {};
      for (const p of op.params) {
        defaults[p.name] = p.default != null ? String(p.default) : "";
      }
      setParamValues(defaults);
    }
  };

  const handleGenerate = async () => {
    if (!selected || !controller) return;
    setGenerating(true);
    setGenError(null);
    try {
      const params: Record<string, number | string> = {};
      for (const p of selected.params) {
        const val = paramValues[p.name];
        if (val !== undefined && val !== "") {
          params[p.name] = p.type === "number" ? Number(val) : val;
        }
      }
      const result = await ppgApi.template({
        controller,
        template: selected.id,
        params,
      });
      onGenerate(result.gcode);
      setSelected(null);
      setParamValues({});
    } catch (e) {
      setGenError((e as Error).message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-slate-500">Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-1 text-xs text-primary-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Search */}
      <div className="px-3 pt-2">
        <input
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-md border border-slate-300 px-2.5
            py-1.5 text-xs shadow-sm placeholder:text-slate-400
            focus:border-primary-500 focus:outline-none focus:ring-1
            focus:ring-primary-500 dark:border-slate-600
            dark:bg-slate-800 dark:text-slate-100"
          aria-label="Filter templates"
        />
      </div>

      {/* Generate error */}
      {genError && (
        <p className="mx-3 text-xs text-red-500">{genError}</p>
      )}

      {/* Template list */}
      <div className="overflow-y-auto px-1 pb-2">
        {grouped.size === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-400">
            {search ? "No templates match" : "No templates available"}
          </p>
        )}
        {[...grouped.entries()].map(([category, ops]) => (
          <div key={category} className="mb-1">
            <div className="sticky top-0 bg-slate-50 px-3 py-1 text-[10px]
              font-semibold uppercase tracking-wider text-slate-400
              dark:bg-slate-900/50">
              {category}
            </div>
            {ops.map((op) => (
              <div key={op.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(op)}
                  className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs transition-colors ${
                    selected?.id === op.id
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex-1 font-medium">{op.name}</span>
                  <span className="text-[10px] text-slate-400">{op.params.length}p</span>
                </button>

                {/* Parameter form — shown when selected */}
                {selected?.id === op.id && (
                  <div className="mx-3 mb-2 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    {op.params.length === 0 ? (
                      <p className="text-[10px] text-slate-400">No parameters</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {op.params.map((p) => (
                          <label key={p.name} className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500">
                              {p.name}
                              {p.required && <span className="text-red-400">*</span>}
                            </span>
                            <input
                              type={p.type === "number" ? "number" : "text"}
                              value={paramValues[p.name] ?? ""}
                              onChange={(e) =>
                                setParamValues((v) => ({ ...v, [p.name]: e.target.value }))
                              }
                              placeholder={p.default != null ? String(p.default) : ""}
                              className="rounded border border-slate-300
                                px-1.5 py-1 text-[11px]
                                focus:border-primary-500 focus:outline-none
                                focus:ring-1 focus:ring-primary-500
                                dark:border-slate-600 dark:bg-slate-700
                                dark:text-slate-100"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!controller || generating}
                      onClick={handleGenerate}
                      className="mt-2 w-full rounded bg-primary-600 px-2
                        py-1 text-[11px] font-medium text-white
                        transition-colors hover:bg-primary-700
                        disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {generating ? "Generating..." : !controller ? "Select a controller first" : "Generate G-Code"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
