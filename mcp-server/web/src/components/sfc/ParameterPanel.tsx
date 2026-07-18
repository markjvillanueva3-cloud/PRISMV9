import { useCallback } from "react";
import { Card, Input, Select, Button } from "../ui";
import type { OperationType } from "../../data/operations";

export interface SfcParams {
  tool_diameter: number;
  number_of_teeth: number;
  depth: number;
  width: number;
  tool_material: string;
  coolant: string;
  /** Tool coating -- options limited to the keys ProductEngine.sfcCalculate recognizes so each
   *  drives a real derate. Empty / absent = uncoated (engine neutral 1.0). */
  coating?: string;
}

interface Props {
  operation: OperationType | null;
  params: SfcParams;
  onChange: (params: SfcParams) => void;
  imperial: boolean;
  onToggleUnits: () => void;
}

const TOOL_MATERIALS = ["Carbide", "HSS", "Ceramic", "CBN", "PCD"];
const COOLANTS = ["flood", "mist", "mql", "dry", "air_blast"];
// Coating options whose keys ProductEngine.sfcCalculate's normalizeCoatingKey recognizes -- each
// drives a real (material-specific) cutting-speed + tool-life derate. Empty = uncoated / catalog
// default (engine treats it as a neutral 1.0 no-op). Kept in sync with normalizeCoatingKey.
const COATINGS: { value: string; label: string }[] = [
  { value: "", label: "Uncoated / default" },
  { value: "TiAlN", label: "TiAlN" },
  { value: "AlTiN", label: "AlTiN" },
  { value: "AlCrN", label: "AlCrN" },
  { value: "DLC", label: "DLC" },
  { value: "diamond", label: "Diamond / PCD" },
];

const PRESETS: Record<string, Partial<SfcParams>> = {
  Conservative: { depth: 0.5, width: 2 },
  Standard: {},
  Aggressive: {},
};

function mmToIn(mm: number): number {
  return +(mm / 25.4).toFixed(4);
}
function inToMm(inch: number): number {
  return +(inch * 25.4).toFixed(3);
}

export default function ParameterPanel({
  operation,
  params,
  onChange,
  imperial,
  onToggleUnits,
}: Props) {
  const set = useCallback(
    (field: keyof SfcParams, value: string) => {
      const num = parseFloat(value);
      if (field === "tool_material" || field === "coolant" || field === "coating") {
        onChange({ ...params, [field]: value });
      } else if (!isNaN(num)) {
        const mmVal = imperial ? inToMm(num) : num;
        onChange({ ...params, [field]: mmVal });
      }
    },
    [params, onChange, imperial],
  );

  const displayVal = (mm: number) =>
    imperial ? mmToIn(mm).toString() : mm.toString();
  const unit = imperial ? "in" : "mm";

  const applyPreset = (name: string) => {
    if (!operation) return;
    const preset = PRESETS[name];
    const base = operation.defaults;
    const scale =
      name === "Conservative" ? 0.6 : name === "Aggressive" ? 1.4 : 1;
    onChange({
      ...params,
      depth: preset?.depth ?? +(base.depth * scale).toFixed(2),
      width: preset?.width ?? +(base.width * scale).toFixed(2),
      tool_diameter: base.tool_diameter,
      number_of_teeth: base.number_of_teeth,
    });
  };

  if (!operation) {
    return (
      <Card title="Parameters">
        <p className="text-sm text-slate-400">
          Select an operation first
        </p>
      </Card>
    );
  }

  return (
    <Card title="Parameters">
      {/* Unit toggle */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-pressed={!imperial}
          onClick={onToggleUnits}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            !imperial
              ? "bg-primary-600 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          Metric
        </button>
        <button
          type="button"
          aria-pressed={imperial}
          onClick={onToggleUnits}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            imperial
              ? "bg-primary-600 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          Imperial
        </button>

        {/* Presets */}
        <div className="ml-auto flex gap-1">
          {Object.keys(PRESETS).map((name) => (
            <Button
              key={name}
              variant="ghost"
              size="sm"
              onClick={() => applyPreset(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tool Diameter"
          unit={unit}
          type="number"
          step="0.1"
          min="0.1"
          value={displayVal(params.tool_diameter)}
          onChange={(e) => set("tool_diameter", e.target.value)}
        />
        <Input
          label="Number of Teeth"
          type="number"
          step="1"
          min="1"
          max="20"
          value={params.number_of_teeth.toString()}
          onChange={(e) => set("number_of_teeth", e.target.value)}
        />
        <Input
          label="Depth of Cut"
          unit={unit}
          type="number"
          step="0.1"
          min="0.01"
          value={displayVal(params.depth)}
          onChange={(e) => set("depth", e.target.value)}
        />
        <Input
          label="Width of Cut"
          unit={unit}
          type="number"
          step="0.1"
          min="0.01"
          value={displayVal(params.width)}
          onChange={(e) => set("width", e.target.value)}
        />
        <Select
          label="Tool Material"
          value={params.tool_material}
          onChange={(e) => set("tool_material", e.target.value)}
          options={TOOL_MATERIALS.map((tm) => ({ value: tm, label: tm }))}
        />
        <Select
          label="Coolant"
          value={params.coolant}
          onChange={(e) => set("coolant", e.target.value)}
          options={COOLANTS.map((c) => ({
            value: c,
            label: c.replace(/_/g, " ").toUpperCase(),
          }))}
        />
        <Select
          label="Coating"
          value={params.coating ?? ""}
          onChange={(e) => set("coating", e.target.value)}
          options={COATINGS}
        />
      </div>
    </Card>
  );
}
