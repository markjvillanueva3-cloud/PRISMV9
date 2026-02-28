import { useMemo } from "react";
import { validateMachines, type MachineEntry, type MachineValidation } from "../../data/machines";
import { Card, Badge } from "../ui";

interface Props {
  requiredRpm: number;
  requiredPowerKw: number;
  requiredAxes: number;
  value: MachineEntry | null;
  onChange: (machine: MachineEntry) => void;
}

function capabilityBadge(axes: number): { label: string; color: "green" | "blue" | "yellow" | "slate" } {
  if (axes >= 5) return { label: "5-Axis", color: "green" };
  if (axes >= 4) return { label: "4-Axis", color: "blue" };
  if (axes >= 3) return { label: "3-Axis", color: "yellow" };
  return { label: `${axes}-Axis`, color: "slate" };
}

export default function SmartMachineSelector({
  requiredRpm, requiredPowerKw, requiredAxes, value, onChange,
}: Props) {
  const validations = useMemo(
    () => validateMachines(requiredRpm, requiredPowerKw, requiredAxes),
    [requiredRpm, requiredPowerKw, requiredAxes],
  );

  const capable = validations.filter((v) => v.issues.length === 0);
  const insufficient = validations.filter((v) => v.issues.length > 0);

  const hasRequirements = requiredRpm > 0 || requiredPowerKw > 0;

  return (
    <Card title="Machine">
      {!hasRequirements && (
        <p className="text-sm text-slate-400">
          Run a calculation first to validate machine capabilities
        </p>
      )}

      {hasRequirements && capable.length === 0 && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs font-medium text-red-600">
            No machines meet the requirements ({Number.isFinite(requiredRpm) ? Math.round(requiredRpm) : 0} RPM,{" "}
            {Number.isFinite(requiredPowerKw) ? requiredPowerKw.toFixed(1) : "0.0"} kW, {requiredAxes}-axis)
          </p>
        </div>
      )}

      {/* Capable machines */}
      <div className="space-y-1">
        {capable.map((v) => (
          <MachineRow
            key={v.machine.id}
            validation={v}
            selected={value?.id === v.machine.id}
            onClick={() => onChange(v.machine)}
          />
        ))}
      </div>

      {/* Insufficient machines (collapsed) */}
      {insufficient.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
            {insufficient.length} insufficient machine{insufficient.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-1 space-y-1">
            {insufficient.map((v) => (
              <MachineRow
                key={v.machine.id}
                validation={v}
                selected={false}
                onClick={() => onChange(v.machine)}
                disabled
              />
            ))}
          </div>
        </details>
      )}

      {/* Selected machine specs */}
      {value && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-700/50">
          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <span>Max RPM: <strong>{value.spindleMaxRpm.toLocaleString()}</strong></span>
            <span>Power: <strong>{value.spindlePowerKw} kW</strong></span>
            <span>Tools: <strong>{value.toolCapacity}</strong></span>
            <span>Controller: <strong>{value.controller}</strong></span>
            <span>Table: <strong>{value.tableSize.x} x {value.tableSize.y} mm</strong></span>
            <span>Type: <strong>{value.type}</strong></span>
          </div>
        </div>
      )}
    </Card>
  );
}

function MachineRow({
  validation,
  selected,
  onClick,
  disabled,
}: {
  validation: MachineValidation;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { machine: m, issues } = validation;
  const cap = capabilityBadge(m.axes);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left
        text-sm transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : selected
              ? "bg-primary-600 text-white"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      title={issues.length > 0 ? issues.join("; ") : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{m.name}</div>
        <div className="text-xs opacity-75">{m.manufacturer}</div>
      </div>
      <Badge color={cap.color}>{cap.label}</Badge>
      <span className="text-xs opacity-60">
        {m.spindleMaxRpm.toLocaleString()} RPM
      </span>
      {issues.length > 0 && (
        <span className="text-xs text-red-400" aria-label="Warning">!</span>
      )}
    </button>
  );
}
