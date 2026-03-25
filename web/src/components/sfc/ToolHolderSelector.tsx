import { useMemo } from "react";
import { Card, Select } from "../ui";
import type { MachineMode } from "../../data/machineModes";
import {
  getTapersForMode,
  HOLDER_TYPES,
  SHANK_DIAMETERS_MM,
  SHANK_DIAMETERS_IN,
  OVERHANG_OPTIONS,
  type OverhangClass,
} from "../../data/toolHolders";

export interface ToolHolderConfig {
  taperId: string;
  holderId: string;
  shankDiameter: number;
  overhang: OverhangClass;
}

interface Props {
  mode: MachineMode;
  value: ToolHolderConfig;
  onChange: (config: ToolHolderConfig) => void;
  imperial: boolean;
}

export default function ToolHolderSelector({ mode, value, onChange, imperial }: Props) {
  const tapers = useMemo(() => getTapersForMode(mode), [mode]);
  const holders = useMemo(() => {
    if (mode === "lathe") return HOLDER_TYPES.filter((h) => h.category.startsWith("lathe"));
    return HOLDER_TYPES.filter((h) => !h.category.startsWith("lathe"));
  }, [mode]);

  const shankOptions = imperial
    ? SHANK_DIAMETERS_IN.map((d) => ({ value: d.toString(), label: `${d}"` }))
    : SHANK_DIAMETERS_MM.map((d) => ({ value: d.toString(), label: `${d} mm` }));

  return (
    <Card title="Tool Holder">
      <div className="space-y-3">
        <Select
          label="Taper"
          value={value.taperId}
          onChange={(e) => onChange({ ...value, taperId: e.target.value })}
          options={[
            { value: "", label: "— Select Taper —" },
            ...tapers.map((t) => ({ value: t.id, label: t.label })),
          ]}
        />
        <Select
          label="Holder Type"
          value={value.holderId}
          onChange={(e) => onChange({ ...value, holderId: e.target.value })}
          options={[
            { value: "", label: "— Select Holder —" },
            ...holders.map((h) => ({ value: h.id, label: h.label })),
          ]}
        />
        <Select
          label="Shank Diameter"
          value={value.shankDiameter.toString()}
          onChange={(e) => onChange({ ...value, shankDiameter: parseFloat(e.target.value) })}
          options={shankOptions}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Overhang</label>
          <div className="grid grid-cols-4 gap-1">
            {OVERHANG_OPTIONS.map((opt) => {
              const isActive = value.overhang === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...value, overhang: opt.id })}
                  className={`rounded border px-2 py-1.5 text-center transition-all ${
                    isActive
                      ? "border-primary-500 bg-primary-600/15 text-white"
                      : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="text-[10px] font-semibold">{opt.label}</div>
                  <div className="text-[9px] text-slate-500">{opt.ratio}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
