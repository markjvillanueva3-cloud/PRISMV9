import { useMemo, useState, useEffect, useRef } from "react";
import { validateMachines, MACHINES, type MachineEntry, type MachineValidation } from "../../data/machines";
import { dataApi } from "../../api/data";
import { orderMachinesByShopUsage, fetchShopProfile, type ShopProfile } from "../../data/shopUsageOrder";
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

/** Map backend machine to MachineEntry shape */
function mapBackendMachine(m: Record<string, unknown>): MachineEntry {
  const sp = (m.spindle ?? {}) as Record<string, unknown>;
  const we = (m.work_envelope ?? {}) as Record<string, unknown>;
  const x = (we.x ?? {}) as Record<string, unknown>;
  const y = (we.y ?? {}) as Record<string, unknown>;
  const atc = (m.tool_changer ?? m.atc ?? {}) as Record<string, unknown>;
  const axes = m.type === "5-Axis" || String(m.subtype ?? "").includes("5") ? 5
    : String(m.type ?? "").toLowerCase().includes("lathe") ? 2 : 3;
  const machineType = String(m.type ?? "VMC").toLowerCase().includes("lathe") ? "Lathe" as const
    : String(m.type ?? "").toLowerCase().includes("turn") ? "Mill-Turn" as const
    : axes >= 5 ? "5-Axis" as const
    : String(m.type ?? "").toLowerCase().includes("horizontal") ? "HMC" as const : "VMC" as const;
  return {
    id: String(m.id ?? ""),
    name: `${m.manufacturer ?? ""} ${m.model ?? ""}`.trim(),
    manufacturer: String(m.manufacturer ?? ""),
    type: machineType,
    axes,
    spindleMaxRpm: Number(sp.max_rpm ?? m.spindleMaxRpm ?? 10000),
    spindlePowerKw: Number(sp.power_rating ?? sp.power_continuous ?? m.spindlePowerKw ?? 15),
    maxToolDiameter: Number((atc as Record<string, unknown>).max_tool_diameter ?? 100),
    toolCapacity: Number((atc as Record<string, unknown>).capacity ?? 20),
    tableSize: { x: Number(x.max ?? 500), y: Number((y as Record<string, unknown>).max ?? 400) },
    controller: String((m.controller as Record<string, unknown>)?.manufacturer ?? "") + " " + String((m.controller as Record<string, unknown>)?.model ?? ""),
  };
}

export default function SmartMachineSelector({
  requiredRpm, requiredPowerKw, requiredAxes, value, onChange,
}: Props) {
  const [backendMachines, setBackendMachines] = useState<MachineEntry[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const fetchedRef = useRef(false);

  // Fetch backend machines once on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setBackendLoading(true);
    dataApi.searchMachines({ query: "*", limit: 100 })
      .then((res: unknown) => {
        const items = ((res as Record<string, unknown>).results ?? (Array.isArray(res) ? res : [])) as Record<string, unknown>[];
        const mapped = items.map(mapBackendMachine);
        const localIds = new Set(MACHINES.map(m => m.id));
        setBackendMachines(mapped.filter(m => !localIds.has(m.id)));
      })
      .catch(() => setBackendMachines([]))
      .finally(() => setBackendLoading(false));
  }, []);

  // Fetch the JM shop-function profile once (served at /jm-shop-profile.json by the
  // jm-shop-knowledge-to-vault bridge). Fail-soft: null -> machines keep fixed order.
  useEffect(() => { fetchShopProfile().then(setShopProfile).catch(() => setShopProfile(null)); }, []);

  // Combine local (9) + backend (888), then ORDER BY REAL SHOP USAGE (lathe/Okuma
  // dominant) so the operator sees the machines the shop actually runs first.
  const allMachines = useMemo(
    () => orderMachinesByShopUsage([...MACHINES, ...backendMachines], shopProfile).map((r) => r.machine),
    [backendMachines, shopProfile],
  );

  const validations = useMemo(
    () => {
      // Validate against all machines (local + backend)
      const results: MachineValidation[] = allMachines.map((machine) => {
        const issues: string[] = [];
        const rpmOk = !requiredRpm || machine.spindleMaxRpm >= requiredRpm;
        const powerOk = !requiredPowerKw || machine.spindlePowerKw >= requiredPowerKw;
        const axesOk = !requiredAxes || machine.axes >= requiredAxes;
        if (!rpmOk) issues.push(`RPM: needs ${Math.round(requiredRpm)}, max ${machine.spindleMaxRpm}`);
        if (!powerOk) issues.push(`Power: needs ${requiredPowerKw.toFixed(1)} kW, max ${machine.spindlePowerKw}`);
        if (!axesOk) issues.push(`Axes: needs ${requiredAxes}, has ${machine.axes}`);
        return { machine, rpmOk, powerOk, axesOk, issues };
      });
      // Sort capable first, then by power descending
      return results.sort((a, b) => a.issues.length - b.issues.length || b.machine.spindlePowerKw - a.machine.spindlePowerKw);
    },
    [requiredRpm, requiredPowerKw, requiredAxes, allMachines],
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

      {backendLoading && (
        <p className="text-xs text-primary-500 animate-pulse mb-2">Loading 888 machine profiles...</p>
      )}
      {hasRequirements && capable.length === 0 && !backendLoading && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs font-medium text-red-600">
            No machines meet the requirements ({Number.isFinite(requiredRpm) ? Math.round(requiredRpm) : 0} RPM,{" "}
            {Number.isFinite(requiredPowerKw) ? requiredPowerKw.toFixed(1) : "0.0"} kW, {requiredAxes}-axis)
          </p>
        </div>
      )}
      {hasRequirements && capable.length > 0 && (
        <p className="text-xs text-slate-400 mb-1">{capable.length} of {allMachines.length} machines qualify</p>
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
