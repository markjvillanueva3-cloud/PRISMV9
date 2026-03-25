import { useMemo } from "react";
import { Card, Select } from "../ui";
import type { MachineMode } from "../../data/machineModes";
import { getControllersForMode, SPINDLE_PRESETS, ATC_PRESETS } from "../../data/controllers";

export interface MachineConfig {
  controllerId: string;
  spindleId: string;
  atcId: string;
}

interface Props {
  mode: MachineMode;
  value: MachineConfig;
  onChange: (config: MachineConfig) => void;
}

export default function MachineConfigPanel({ mode, value, onChange }: Props) {
  const controllers = useMemo(() => getControllersForMode(mode), [mode]);

  const spindles = useMemo(() => {
    if (mode === "lathe") return SPINDLE_PRESETS.filter((s) => s.taper.startsWith("A2"));
    if (mode === "mill") return SPINDLE_PRESETS.filter((s) => !s.taper.startsWith("A2"));
    return [];
  }, [mode]);

  const atcOptions = useMemo(() => {
    if (mode === "lathe") return ATC_PRESETS.filter((a) => a.type === "turret");
    if (mode === "mill") return ATC_PRESETS.filter((a) => a.type !== "turret");
    return [];
  }, [mode]);

  const showMachineSpecs = mode === "mill" || mode === "lathe";
  const showEdmSpecs = mode === "wire_edm" || mode === "sinker_edm";
  const showLaserSpecs = mode === "laser";
  const showWaterjetSpecs = mode === "waterjet";

  const selectedSpindle = SPINDLE_PRESETS.find((s) => s.id === value.spindleId);

  return (
    <Card title="Machine Configuration">
      {/* Controller */}
      <div className="space-y-3">
        <Select
          label="Controller"
          value={value.controllerId}
          onChange={(e) => onChange({ ...value, controllerId: e.target.value })}
          options={[
            { value: "", label: "— Select Controller —" },
            ...controllers.map((c) => ({ value: c.id, label: `${c.brand} ${c.model}` })),
          ]}
        />

        {showMachineSpecs && (
          <>
            {/* Spindle */}
            <Select
              label="Spindle"
              value={value.spindleId}
              onChange={(e) => onChange({ ...value, spindleId: e.target.value })}
              options={[
                { value: "", label: "— Select Spindle —" },
                ...spindles.map((s) => ({ value: s.id, label: s.label })),
              ]}
            />

            {/* Spindle specs readout */}
            {selectedSpindle && (
              <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-800/40 p-2 text-xs">
                <div>
                  <span className="text-slate-500">Max RPM</span>
                  <div className="font-mono font-bold text-amber-400">{selectedSpindle.maxRpm.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500">Power</span>
                  <div className="font-mono font-bold text-green-400">{selectedSpindle.powerKw} kW</div>
                </div>
                <div>
                  <span className="text-slate-500">Taper</span>
                  <div className="font-mono font-bold text-blue-400">{selectedSpindle.taper}</div>
                </div>
              </div>
            )}

            {/* ATC */}
            <Select
              label={mode === "lathe" ? "Turret" : "ATC Magazine"}
              value={value.atcId}
              onChange={(e) => onChange({ ...value, atcId: e.target.value })}
              options={[
                { value: "", label: mode === "lathe" ? "— Select Turret —" : "— Select ATC —" },
                ...atcOptions.map((a) => ({ value: a.id, label: a.label })),
              ]}
            />
          </>
        )}

        {showEdmSpecs && (
          <div className="rounded-md border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">
              {mode === "wire_edm" ? "Wire EDM Configuration" : "Sinker EDM Configuration"}
            </p>
            <p className="mt-1">
              {mode === "wire_edm"
                ? "Wire material, diameter, dielectric, and flushing configured in parameters below."
                : "Electrode material, polarity, and dielectric configured in parameters below."}
            </p>
          </div>
        )}

        {showLaserSpecs && (
          <div className="rounded-md border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">Laser Configuration</p>
            <p className="mt-1">Laser type (Fiber/CO₂/Disk), power, and assist gas configured in parameters below.</p>
          </div>
        )}

        {showWaterjetSpecs && (
          <div className="rounded-md border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">Waterjet Configuration</p>
            <p className="mt-1">Pump pressure, nozzle, abrasive type, and flow rate configured in parameters below.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
