import { useState, useCallback } from "react";
import MaterialSelector from "../components/sfc/MaterialSelector";
import OperationSelector from "../components/sfc/OperationSelector";
import ParameterPanel, {
  type SfcParams,
} from "../components/sfc/ParameterPanel";
import ResultsDisplay from "../components/sfc/ResultsDisplay";
import { Button } from "../components/ui";
import { useSfcCalculate } from "../hooks/useSfc";
import type { MaterialEntry } from "../data/materials";
import type { OperationType } from "../data/operations";

const DEFAULT_PARAMS: SfcParams = {
  tool_diameter: 12,
  number_of_teeth: 4,
  depth: 2,
  width: 6,
  tool_material: "Carbide",
  coolant: "flood",
};

interface HistoryEntry {
  material: string;
  operation: string;
  rpm: number;
  feedRate: number;
  ts: number;
}

const HISTORY_KEY = "prism-sfc-history";

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
}

export default function SfcCalculatorPage() {
  const [material, setMaterial] = useState<MaterialEntry | null>(null);
  const [operation, setOperation] = useState<OperationType | null>(null);
  const [params, setParams] = useState<SfcParams>(DEFAULT_PARAMS);
  const [imperial, setImperial] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const calc = useSfcCalculate();

  const handleOperationChange = useCallback((op: OperationType) => {
    setOperation(op);
    setParams({
      tool_diameter: op.defaults.tool_diameter,
      number_of_teeth: op.defaults.number_of_teeth,
      depth: op.defaults.depth,
      width: op.defaults.width,
      tool_material: op.defaults.tool_material,
      coolant: op.defaults.coolant,
    });
  }, []);

  const handleCalculate = async () => {
    if (!material || !operation) return;
    const result = await calc.execute({
      material: material.id,
      operation: operation.id,
      material_hardness: material.hardness,
      tool_material: params.tool_material,
      tool_diameter: params.tool_diameter,
      number_of_teeth: params.number_of_teeth,
      depth: params.depth,
      width: params.width,
      coolant: params.coolant,
    });
    if (result) {
      const entry: HistoryEntry = {
        material: material.name,
        operation: operation.label,
        rpm: result.spindle_speed,
        feedRate: result.feed_rate,
        ts: Date.now(),
      };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      saveHistory(updated);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left column — inputs */}
        <div className="space-y-4">
          <MaterialSelector value={material} onChange={setMaterial} />
          <OperationSelector
            value={operation}
            onChange={handleOperationChange}
          />
          <ParameterPanel
            operation={operation}
            params={params}
            onChange={setParams}
            imperial={imperial}
            onToggleUnits={() => setImperial((p) => !p)}
          />
          <Button
            onClick={handleCalculate}
            disabled={!material || !operation || calc.loading}
            className="w-full"
            size="lg"
          >
            {calc.loading ? "Calculating..." : "Calculate"}
          </Button>
        </div>

        {/* Right column — results + history */}
        <div className="space-y-4">
          <ResultsDisplay
            result={calc.data}
            loading={calc.loading}
            error={calc.error}
          />

          {/* Calculation history */}
          {history.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Recent Calculations
              </h3>
              <div className="space-y-1">
                {history.map((h) => (
                  <div
                    key={h.ts}
                    className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span>
                      {h.material} / {h.operation}
                    </span>
                    <span>
                      {h.rpm.toFixed(0)} RPM &middot;{" "}
                      {h.feedRate.toFixed(1)} mm/min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
