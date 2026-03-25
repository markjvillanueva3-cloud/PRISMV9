import { useMemo } from "react";
import { Card } from "../ui";
import {
  getStrategiesForCategory,
  type ToolpathStrategy,
} from "../../data/toolpathStrategies";

interface Props {
  operationCategory: string | null;
  value: ToolpathStrategy | null;
  onChange: (strategy: ToolpathStrategy | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  roughing: "Roughing",
  finishing: "Finishing",
  holemaking: "Hole Making",
  secondary: "Secondary",
};

const CATEGORY_COLORS: Record<string, string> = {
  roughing: "border-blue-500/30 bg-blue-500/5",
  finishing: "border-green-500/30 bg-green-500/5",
  holemaking: "border-amber-500/30 bg-amber-500/5",
  secondary: "border-slate-500/30 bg-slate-500/5",
};

export default function ToolpathStrategySelector({
  operationCategory,
  value,
  onChange,
}: Props) {
  const strategies = useMemo(
    () => (operationCategory ? getStrategiesForCategory(operationCategory) : []),
    [operationCategory],
  );

  // Group by strategy category
  const grouped = useMemo(() => {
    const map = new Map<string, ToolpathStrategy[]>();
    for (const s of strategies) {
      const list = map.get(s.category) || [];
      list.push(s);
      map.set(s.category, list);
    }
    return map;
  }, [strategies]);

  if (!operationCategory) {
    return (
      <Card title="Toolpath Strategy">
        <p className="text-sm text-slate-400">Select an operation first</p>
      </Card>
    );
  }

  if (strategies.length === 0) {
    return (
      <Card title="Toolpath Strategy">
        <p className="text-sm text-slate-400">
          No strategies available for this operation type
        </p>
      </Card>
    );
  }

  return (
    <Card title="Toolpath Strategy">
      <p className="mb-3 text-xs text-slate-400">
        Choose a toolpath strategy — DOC, WOC, and feed/speed adjust automatically
      </p>

      {/* Selected strategy summary */}
      {value && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-primary-500/40 bg-primary-600/10 px-3 py-2">
          <div>
            <span className="text-sm font-medium text-primary-400">{value.label}</span>
            <span className="ml-2 text-xs text-slate-400">{value.description}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat} className={`rounded-md border p-2 ${CATEGORY_COLORS[cat] || ""}`}>
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {CATEGORY_LABELS[cat] || cat}
            </h4>
            <div className="grid gap-1">
              {items.map((strategy) => {
                const isActive = value?.id === strategy.id;
                return (
                  <button
                    key={strategy.id}
                    type="button"
                    onClick={() => onChange(isActive ? null : strategy)}
                    className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left text-sm transition-all ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <span className="font-medium">{strategy.label}</span>
                    <span className={`text-[10px] ${isActive ? "text-primary-200" : "text-slate-500"}`}>
                      {strategy.docMultiplier !== 1.0 && `DOC×${strategy.docMultiplier}`}
                      {strategy.wocMultiplier !== 1.0 && ` WOC×${strategy.wocMultiplier}`}
                      {strategy.feedMultiplier !== 1.0 && ` F×${strategy.feedMultiplier}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
