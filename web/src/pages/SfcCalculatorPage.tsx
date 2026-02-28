import { useState, useCallback } from "react";
import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
import OperationSelector from "../components/sfc/OperationSelector";
import SmartToolSelector from "../components/sfc/SmartToolSelector";
import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
import ParameterPanel, { type SfcParams } from "../components/sfc/ParameterPanel";
import ResultsDisplay from "../components/sfc/ResultsDisplay";
import CompatibilityValidator, {
  type Suggestion,
} from "../components/sfc/CompatibilityValidator";
import { Button } from "../components/ui";
import { useSfcCalculate } from "../hooks/useSfc";
import type { MaterialEntry } from "../data/materials";
import type { OperationType } from "../data/operations";
import type { CuttingToolEntry } from "../data/tools";
import type { MachineEntry } from "../data/machines";

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
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
}

export default function SfcCalculatorPage() {
  const [material, setMaterial] = useState<MaterialEntry | null>(null);
  const [operation, setOperation] = useState<OperationType | null>(null);
  const [tool, setTool] = useState<CuttingToolEntry | null>(null);
  const [machine, setMachine] = useState<MachineEntry | null>(null);
  const [params, setParams] = useState<SfcParams>(DEFAULT_PARAMS);
  const [imperial, setImperial] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const calc = useSfcCalculate();

  const handleOperationChange = useCallback((op: OperationType) => {
    setOperation(op);
    setTool(null); // Reset tool when operation changes
    setParams({
      tool_diameter: op.defaults.tool_diameter,
      number_of_teeth: op.defaults.number_of_teeth,
      depth: op.defaults.depth,
      width: op.defaults.width,
      tool_material: op.defaults.tool_material,
      coolant: op.defaults.coolant,
    });
  }, []);

  const handleMaterialChange = useCallback((mat: MaterialEntry) => {
    setMaterial(mat);
    setTool(null); // Reset tool when material changes (compatibility may shift)
  }, []);

  const handleToolChange = useCallback((t: CuttingToolEntry) => {
    setTool(t);
    // Sync tool params into the parameter panel
    setParams((prev) => ({
      ...prev,
      tool_diameter: t.diameter,
      number_of_teeth: t.fluteCount,
      tool_material: t.substrate,
    }));
  }, []);

  const handleSuggestion = useCallback((suggestion: Suggestion) => {
    switch (suggestion.type) {
      case "params":
        // Reduce aggressiveness
        setParams((prev) => ({
          ...prev,
          depth: +(prev.depth * 0.7).toFixed(2),
        }));
        break;
      case "tool":
        // Reset tool so user picks a better one
        setTool(null);
        break;
      case "coating":
        // Reset tool — user needs a different coating
        setTool(null);
        break;
      case "machine":
        // Reset machine so user picks a capable one
        setMachine(null);
        break;
    }
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

  // Derived values for machine validation
  const requiredRpm = calc.data?.spindle_speed ?? 0;
  // Power comes from a separate power-torque calculation; use meta if available
  const requiredPowerKw = (calc.data?.meta?.power_kw as number) ?? 0;
  const requiredAxes = operation?.category === "milling" ? 3 : 2;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Compatibility banner */}
      <div className="mb-4">
        <CompatibilityValidator
          material={material}
          tool={tool}
          machine={machine}
          operationId={operation?.id ?? null}
          requiredRpm={requiredRpm}
          requiredPowerKw={requiredPowerKw}
          onSuggest={handleSuggestion}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left column — inputs */}
        <div className="space-y-4">
          <SmartMaterialSelector
            value={material}
            onChange={handleMaterialChange}
            operationId={operation?.id}
          />
          <OperationSelector
            value={operation}
            onChange={handleOperationChange}
          />
          <SmartToolSelector
            materialGroup={material?.group ?? null}
            operationId={operation?.id ?? null}
            value={tool}
            onChange={handleToolChange}
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
          {(!material || !operation) && (
            <p className="text-center text-xs text-slate-400">
              Select a material and operation to enable calculation
            </p>
          )}
        </div>

        {/* Right column — results + machine + history */}
        <div className="space-y-4" aria-live="polite">
          <ResultsDisplay
            result={calc.data}
            loading={calc.loading}
            error={calc.error}
            imperial={imperial}
          />

          <SmartMachineSelector
            requiredRpm={requiredRpm}
            requiredPowerKw={requiredPowerKw}
            requiredAxes={requiredAxes}
            value={machine}
            onChange={setMachine}
          />

          {/* Calculation history */}
          {history.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Recent Calculations
              </h3>
              <div className="space-y-1">
                {history.map((h, idx) => (
                  <div
                    key={`${h.ts}-${idx}`}
                    className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span>{h.material} / {h.operation}</span>
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
