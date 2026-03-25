import { Card, Select } from "../ui";
import {
  INSERT_GRADES,
  COATING_TYPES,
  INSERT_GEOMETRIES,
} from "../../data/toolHolders";

export interface InsertConfig {
  gradeId: string;
  coatingId: string;
  geometryId: string;
}

interface Props {
  value: InsertConfig;
  onChange: (config: InsertConfig) => void;
}

export default function InsertSelector({ value, onChange }: Props) {
  const selectedCoating = COATING_TYPES.find((c) => c.id === value.coatingId);
  const selectedGeometry = INSERT_GEOMETRIES.find((g) => g.id === value.geometryId);

  return (
    <Card title="Insert / Cutting Edge">
      <div className="space-y-3">
        {/* Grade */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Grade</label>
          <div className="grid grid-cols-2 gap-1">
            {INSERT_GRADES.map((g) => {
              const isActive = value.gradeId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChange({ ...value, gradeId: g.id })}
                  className={`rounded border px-2 py-1.5 text-left transition-all ${
                    isActive
                      ? "border-primary-500 bg-primary-600/15 text-white"
                      : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="text-xs font-medium">{g.label}</div>
                  <div className="text-[9px] text-slate-500">{g.use}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coating */}
        <Select
          label="Coating"
          value={value.coatingId}
          onChange={(e) => onChange({ ...value, coatingId: e.target.value })}
          options={COATING_TYPES.map((c) => ({
            value: c.id,
            label: `${c.label} (≤${c.maxTemp}°C)`,
          }))}
        />
        {selectedCoating && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span
              className="inline-block h-3 w-3 rounded-full border border-slate-600"
              style={{ backgroundColor: selectedCoating.color === "dark" ? "#333" : selectedCoating.color }}
            />
            Max temp: {selectedCoating.maxTemp}°C
          </div>
        )}

        {/* Insert Geometry */}
        <Select
          label="Insert Geometry"
          value={value.geometryId}
          onChange={(e) => onChange({ ...value, geometryId: e.target.value })}
          options={[
            { value: "", label: "— Select Geometry —" },
            ...INSERT_GEOMETRIES.map((g) => ({
              value: g.id,
              label: `${g.label} — ${g.description}`,
            })),
          ]}
        />
        {selectedGeometry && (
          <div className="rounded bg-slate-800/40 px-2 py-1.5 text-[10px] text-slate-400">
            Nose radius: <span className="font-mono font-bold text-slate-200">{selectedGeometry.noseRadius} mm</span>
          </div>
        )}
      </div>
    </Card>
  );
}
