import { useMemo } from "react";
import { Card } from "../ui";
import type { MachineMode } from "../../data/machineModes";
import { getFixturesForMode } from "../../data/fixtures";

interface Props {
  mode: MachineMode;
  value: string | null;
  onChange: (fixtureId: string | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  vise: "Vises",
  chuck: "Chucks",
  collet: "Collets",
  plate: "Fixture Plates",
  vacuum: "Vacuum",
  magnetic: "Magnetic",
};

export default function FixtureSelector({ mode, value, onChange }: Props) {
  const fixtures = useMemo(() => getFixturesForMode(mode), [mode]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof fixtures>();
    for (const f of fixtures) {
      const list = map.get(f.category) || [];
      list.push(f);
      map.set(f.category, list);
    }
    return map;
  }, [fixtures]);

  if (fixtures.length === 0) {
    return (
      <Card title="Workholding">
        <p className="text-sm text-slate-400">Not applicable for this mode</p>
      </Card>
    );
  }

  return (
    <Card title="Workholding / Fixture">
      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat}>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {CATEGORY_LABELS[cat] || cat}
            </h4>
            <div className="grid gap-1">
              {items.map((fixture) => {
                const isActive = value === fixture.id;
                return (
                  <button
                    key={fixture.id}
                    type="button"
                    onClick={() => onChange(isActive ? null : fixture.id)}
                    className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left text-sm transition-all ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <span>{fixture.label}</span>
                    <span className={`text-[10px] ${isActive ? "text-primary-200" : "text-slate-500"}`}>
                      {(fixture.maxForceN / 1000).toFixed(0)} kN
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
