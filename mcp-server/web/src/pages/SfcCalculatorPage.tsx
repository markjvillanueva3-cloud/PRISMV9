import { useState, useCallback, useMemo } from "react";
import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
import OperationSelector from "../components/sfc/OperationSelector";
import SmartToolSelector from "../components/sfc/SmartToolSelector";
import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
import ParameterPanel, { type SfcParams } from "../components/sfc/ParameterPanel";
import ResultsDisplay from "../components/sfc/ResultsDisplay";
import CompatibilityValidator, {
  type Suggestion,
} from "../components/sfc/CompatibilityValidator";
import ComparisonView from "../components/sfc/ComparisonView";
import PresetManager from "../components/sfc/PresetManager";
import CalculationHistory from "../components/sfc/CalculationHistory";
import AdvancedCharts from "../components/sfc/AdvancedCharts";
import { Button } from "../components/ui";
import { useSfcCalculate } from "../hooks/useSfc";
import type { SfcCalculateResult } from "../types/sfc";
import { generateSfcReport } from "../utils/sfcReport";
import type { MaterialEntry } from "../data/materials";
import { MATERIALS } from "../data/materials";
import type { OperationType } from "../data/operations";
import { getOperationById } from "../data/operations";
import type { CuttingToolEntry } from "../data/tools";
import type { MachineEntry } from "../data/machines";
import {
  type CalcSnapshot,
  type SfcPreset,
  loadComparison, saveComparison,
  loadFullHistory, saveFullHistory,
} from "../components/sfc/comparison-types";

const DEFAULT_PARAMS: SfcParams = {
  tool_diameter: 12,
  number_of_teeth: 4,
  depth: 2,
  width: 6,
  tool_material: "Carbide",
  coolant: "flood",
};

type RightTab = "charts" | "compare" | "history";

export default function SfcCalculatorPage() {
  const [material, setMaterial] = useState<MaterialEntry | null>(null);
  const [operation, setOperation] = useState<OperationType | null>(null);
  const [tool, setTool] = useState<CuttingToolEntry | null>(null);
  const [machine, setMachine] = useState<MachineEntry | null>(null);
  const [params, setParams] = useState<SfcParams>(DEFAULT_PARAMS);
  const [imperial, setImperial] = useState(false);
  const [comparison, setComparison] = useState<CalcSnapshot[]>(loadComparison);
  const [fullHistory, setFullHistory] = useState<CalcSnapshot[]>(loadFullHistory);
  const [rightTab, setRightTab] = useState<RightTab>("charts");
  const calc = useSfcCalculate();

  const handleOperationChange = useCallback((op: OperationType) => {
    setOperation(op);
    setTool(null);
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
    setTool(null);
  }, []);

  const handleToolChange = useCallback((t: CuttingToolEntry) => {
    setTool(t);
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
        setParams((prev) => ({ ...prev, depth: +(prev.depth * 0.7).toFixed(2) }));
        break;
      case "tool":
      case "coating":
        setTool(null);
        break;
      case "machine":
        setMachine(null);
        break;
    }
  }, []);

  const makeSnapshot = useCallback((result: SfcCalculateResult | null): CalcSnapshot | null => {
    if (!result || !material || !operation) return null;
    return {
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      materialName: material.name,
      materialId: material.id,
      materialGroup: material.group,
      operationLabel: operation.label,
      operationId: operation.id,
      toolName: tool?.name,
      params: { ...params },
      result,
      ts: Date.now(),
    };
  }, [material, operation, tool, params]);

  const handleCalculate = async () => {
    if (!material || !operation) return;
    try {
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
        const snap = makeSnapshot(result);
        if (snap) {
          const updated = [snap, ...fullHistory].slice(0, 100);
          setFullHistory(updated);
          saveFullHistory(updated);
        }
      }
    } catch { /* error state handled by useSfcCalculate hook */ }
  };

  const handleAddToComparison = useCallback((entry: CalcSnapshot) => {
    if (comparison.length >= 4) return;
    if (comparison.some((c) => c.id === entry.id)) return;
    const updated = [...comparison, entry];
    setComparison(updated);
    saveComparison(updated);
    setRightTab("compare");
  }, [comparison]);

  const handleRemoveFromComparison = useCallback((id: string) => {
    const updated = comparison.filter((c) => c.id !== id);
    setComparison(updated);
    saveComparison(updated);
  }, [comparison]);

  const handleReloadFromHistory = useCallback((entry: CalcSnapshot) => {
    // Restore material
    const mat = MATERIALS.find((m) => m.id === entry.materialId);
    if (mat) setMaterial(mat);
    // Restore operation
    const op = getOperationById(entry.operationId);
    if (op) setOperation(op);
    // Restore params
    setParams(entry.params);
    setTool(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    setFullHistory([]);
    saveFullHistory([]);
  }, []);

  const handleLoadPreset = useCallback((preset: SfcPreset) => {
    const mat = MATERIALS.find((m) => m.id === preset.materialId);
    if (mat) setMaterial(mat);
    const op = getOperationById(preset.operationId);
    if (op) setOperation(op);
    setParams(preset.params);
    setTool(null);
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (!calc.data || !material || !operation) return;
    generateSfcReport({
      materialName: material.name,
      materialGroup: material.group,
      operationLabel: operation.label,
      toolName: tool?.name,
      params,
      result: calc.data,
      machineName: machine?.name,
      comparison: comparison.length > 0 ? comparison : undefined,
      imperial,
    });
  }, [calc.data, material, operation, tool, params, machine, comparison, imperial]);

  // Derived values for machine validation
  const requiredRpm = calc.data?.spindle_speed ?? 0;
  const requiredPowerKw = Number(calc.data?.meta?.power_kw) || 0;
  const requiredAxes = operation?.category === "milling" ? 3 : 2;

  const rightTabs = useMemo<{ id: RightTab; label: string; count?: number }[]>(() => [
    { id: "charts", label: "Charts" },
    { id: "compare", label: "Compare", count: comparison.length },
    { id: "history", label: "History", count: fullHistory.length },
  ], [comparison.length, fullHistory.length]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const ids = rightTabs.map((t) => t.id);
    const idx = ids.indexOf(rightTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setRightTab(ids[(idx + 1) % ids.length]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setRightTab(ids[(idx - 1 + ids.length) % ids.length]);
    }
  }, [rightTab, rightTabs]);

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
          <PresetManager
            materialId={material?.id ?? null}
            operationId={operation?.id ?? null}
            params={params}
            onLoad={handleLoadPreset}
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

        {/* Right column — results + tabs */}
        <div className="space-y-4">
          <ResultsDisplay
            result={calc.data}
            loading={calc.loading}
            error={calc.error}
            imperial={imperial}
          />

          {/* Action buttons */}
          {calc.data && material && operation && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const snap = makeSnapshot(calc.data);
                  if (snap) handleAddToComparison(snap);
                }}
                disabled={comparison.length >= 4}
              >
                + Compare {comparison.length > 0 ? `(${comparison.length}/4)` : ""}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadPdf}>
                Download PDF
              </Button>
            </div>
          )}

          <SmartMachineSelector
            requiredRpm={requiredRpm}
            requiredPowerKw={requiredPowerKw}
            requiredAxes={requiredAxes}
            value={machine}
            onChange={setMachine}
          />

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist" aria-label="Result views">
            {rightTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={rightTab === t.id}
                onClick={() => setRightTab(t.id)}
                onKeyDown={handleTabKeyDown}
                tabIndex={rightTab === t.id ? 0 : -1}
                className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  rightTab === t.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] dark:bg-slate-600">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {rightTab === "charts" && (
            <AdvancedCharts
              result={calc.data}
              params={params}
              machine={machine}
            />
          )}
          {rightTab === "compare" && (
            <ComparisonView
              entries={comparison}
              onRemove={handleRemoveFromComparison}
              imperial={imperial}
            />
          )}
          {rightTab === "history" && (
            <CalculationHistory
              entries={fullHistory}
              onReload={handleReloadFromHistory}
              onAddToComparison={handleAddToComparison}
              onClear={handleClearHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
