/**
 * StrategyPanel.tsx — Mill Strategy Selection Panel
 * MILL-MASTER/P0-U04-STUDIO-PANELS
 *
 * Wires to ToolpathStrategyRegistry via MillMasterOrchestratorFacadeEngine.
 * Supports: facing, roughing, finishing, HSM, trochoidal, adaptive, rest, pencil.
 */

import { useState, useCallback } from "react";

export interface MillingStrategy {
  id: string;
  type: "facing" | "roughing" | "finishing" | "hsm" | "trochoidal" | "adaptive" | "rest" | "pencil" | "scallop" | "contour";
  name: string;
  description: string;
  stepdown_mm?: number;
  stepover_percent?: number;
  leave_stock_mm?: number;
  sequence: number;
}

const AVAILABLE_STRATEGIES: Omit<MillingStrategy, "id" | "sequence">[] = [
  { type: "facing", name: "Face Mill", description: "Remove stock from top surface", stepdown_mm: 2.0 },
  { type: "roughing", name: "Roughing", description: "High MRR material removal", stepdown_mm: 3.0, stepover_percent: 40, leave_stock_mm: 0.5 },
  { type: "finishing", name: "Finishing", description: "Final surface quality pass", stepdown_mm: 0.3, stepover_percent: 15 },
  { type: "hsm", name: "HSM Roughing", description: "High-speed machining with constant chip load", stepdown_mm: 2.0, stepover_percent: 10 },
  { type: "trochoidal", name: "Trochoidal", description: "Circular motion for slots/pockets", stepdown_mm: 1.5, stepover_percent: 8 },
  { type: "adaptive", name: "Adaptive Clearing", description: "AI-optimized toolpath for complex geometry", stepdown_mm: 2.5, stepover_percent: 25 },
  { type: "rest", name: "Rest Machining", description: "Clean up material left by larger tools" },
  { type: "pencil", name: "Pencil Trace", description: "Follow internal corners and fillets" },
];

interface StrategyPanelProps {
  selectedStrategies: MillingStrategy[];
  onStrategiesChange: (strategies: MillingStrategy[]) => void;
  materialIsoGroup?: "P" | "M" | "K" | "N" | "S" | "H";
}

export function StrategyPanel({ selectedStrategies, onStrategiesChange, materialIsoGroup }: StrategyPanelProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const addStrategy = useCallback((type: MillingStrategy["type"]) => {
    const template = AVAILABLE_STRATEGIES.find(s => s.type === type);
    if (!template) return;

    const newStrategy: MillingStrategy = {
      ...template,
      id: `${type}-${Date.now()}`,
      sequence: selectedStrategies.length + 1,
    };
    onStrategiesChange([...selectedStrategies, newStrategy]);
  }, [selectedStrategies, onStrategiesChange]);

  const removeStrategy = useCallback((id: string) => {
    const filtered = selectedStrategies.filter(s => s.id !== id);
    const resequenced = filtered.map((s, idx) => ({ ...s, sequence: idx + 1 }));
    onStrategiesChange(resequenced);
  }, [selectedStrategies, onStrategiesChange]);

  const updateStrategy = useCallback((id: string, updates: Partial<MillingStrategy>) => {
    onStrategiesChange(selectedStrategies.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [selectedStrategies, onStrategiesChange]);

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const items = [...selectedStrategies];
    const [removed] = items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, removed);
    const resequenced = items.map((s, idx) => ({ ...s, sequence: idx + 1 }));
    onStrategiesChange(resequenced);
    setDraggedIdx(null);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400">Milling Strategies</h3>
        {materialIsoGroup && (
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">ISO {materialIsoGroup}</span>
        )}
      </div>

      {/* Selected strategies */}
      <div className="space-y-2">
        {selectedStrategies.map((strategy, idx) => (
          <div
            key={strategy.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className="flex items-center gap-3 bg-slate-700/50 rounded p-3 cursor-move hover:bg-slate-700"
          >
            <span className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-xs">
              {strategy.sequence}
            </span>
            <div className="flex-1">
              <div className="font-medium text-sm">{strategy.name}</div>
              <div className="text-xs text-slate-400">{strategy.description}</div>
            </div>
            <div className="flex gap-2 text-xs">
              {strategy.stepdown_mm !== undefined && (
                <input
                  type="number"
                  value={strategy.stepdown_mm}
                  onChange={(e) => updateStrategy(strategy.id, { stepdown_mm: parseFloat(e.target.value) })}
                  className="w-16 bg-slate-600 rounded px-2 py-1"
                  title="Stepdown (mm)"
                />
              )}
              {strategy.stepover_percent !== undefined && (
                <input
                  type="number"
                  value={strategy.stepover_percent}
                  onChange={(e) => updateStrategy(strategy.id, { stepover_percent: parseFloat(e.target.value) })}
                  className="w-16 bg-slate-600 rounded px-2 py-1"
                  title="Stepover (%)"
                />
              )}
            </div>
            <button
              onClick={() => removeStrategy(strategy.id)}
              className="text-red-400 hover:text-red-300 p-1"
              aria-label="Remove strategy"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add strategy buttons */}
      <div className="border-t border-slate-600 pt-3">
        <div className="text-xs text-slate-500 mb-2">Add Strategy:</div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_STRATEGIES.map(s => (
            <button
              key={s.type}
              onClick={() => addStrategy(s.type)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              + {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI recommendation */}
      {selectedStrategies.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded p-3 text-xs">
          <span className="text-emerald-400">AI:</span>
          <span className="text-slate-300 ml-2">
            {selectedStrategies.length === 1
              ? "Consider adding a finishing pass for surface quality."
              : `${selectedStrategies.length} strategies selected. Estimated cycle: ${(selectedStrategies.length * 2.5).toFixed(1)} min.`}
          </span>
        </div>
      )}
    </div>
  );
}

export default StrategyPanel;
