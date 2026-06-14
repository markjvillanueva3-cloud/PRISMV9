export interface MachineEntry {
  id: string;
  name: string;
  manufacturer: string;
  type: "VMC" | "HMC" | "Lathe" | "Mill-Turn" | "5-Axis";
  axes: number;
  spindleMaxRpm: number;
  spindlePowerKw: number;
  maxToolDiameter: number;
  toolCapacity: number;
  tableSize: { x: number; y: number };
  controller: string;
}

// ── JM Die Company real machine fleet ──────────────────────────────────────────
// The actual machines on the JM Die shop floor (Machesney Park, IL — cold-heading
// dies & tooling for the fastener industry), NOT a generic vendor catalog.
//   • `id` matches the canonical machine_id in jm-die-profile.ts JM_DIE_CONTROLLER_MAP
//     and ShopConfigurationEngine — so SmartMachineSelector dedups this local seed
//     cleanly against the live backend roster (matched by id) instead of double-listing.
//   • Lathe specs (rpm / power / envelope / turret) are PRISM-authoritative, copied
//     from ShopConfigurationEngine.DEFAULT_MACHINES. For lathes, maxToolDiameter carries
//     the bar capacity (mm) and tableSize.x carries the X work-envelope (z omitted as y=0).
//   • Mill spindle / table specs are published manufacturer data-sheet values (Hurco,
//     Okuma GENOS, Haas, Roku-Roku). Controllers from JM_DIE_CONTROLLER_MAP.
//   • The 3 EDMs (2 Mitsubishi sinker + 1 wire) are intentionally excluded — they have
//     no rotary spindle, so they don't fit this rpm/power/axes capability catalog.
export const MACHINES: MachineEntry[] = [
  // Okuma turning centers (7) — specs from ShopConfigurationEngine (authoritative)
  { id: "LTH-01", name: "Okuma GENOS L300-M", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 5000, spindlePowerKw: 15, maxToolDiameter: 65, toolCapacity: 12, tableSize: { x: 260, y: 0 }, controller: "Okuma OSP-P300L-R" },
  { id: "LTH-02", name: "Okuma GENOS L200E-M", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 5000, spindlePowerKw: 11, maxToolDiameter: 51, toolCapacity: 12, tableSize: { x: 200, y: 0 }, controller: "Okuma OSP-P200LA-R" },
  { id: "LTH-03", name: "Okuma LNC8", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 4000, spindlePowerKw: 11, maxToolDiameter: 51, toolCapacity: 12, tableSize: { x: 200, y: 0 }, controller: "Okuma OSP-U10L" },
  { id: "LTH-04", name: "Okuma Crown L1060", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 3800, spindlePowerKw: 11, maxToolDiameter: 51, toolCapacity: 8, tableSize: { x: 200, y: 0 }, controller: "Okuma OSP-U10L" },
  { id: "LTH-05", name: "Okuma GENOS L400II-E", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 3800, spindlePowerKw: 22, maxToolDiameter: 80, toolCapacity: 12, tableSize: { x: 340, y: 0 }, controller: "Okuma OSP-P300LA-E" },
  { id: "LTH-06", name: "Okuma LB 3000EX Big Bore", manufacturer: "Okuma", type: "Lathe", axes: 2, spindleMaxRpm: 3800, spindlePowerKw: 22, maxToolDiameter: 102, toolCapacity: 12, tableSize: { x: 320, y: 0 }, controller: "Okuma OSP-P500" },
  { id: "LTH-07", name: "Okuma Multus B250II", manufacturer: "Okuma", type: "Mill-Turn", axes: 5, spindleMaxRpm: 5000, spindlePowerKw: 22, maxToolDiameter: 80, toolCapacity: 20, tableSize: { x: 320, y: 0 }, controller: "Okuma OSP-P300SA" },
  // Mills (5) — published manufacturer specs; controllers from JM_DIE_CONTROLLER_MAP
  { id: "VMC-01", name: "Hurco VM30i", manufacturer: "Hurco", type: "VMC", axes: 3, spindleMaxRpm: 12000, spindlePowerKw: 14.9, maxToolDiameter: 89, toolCapacity: 24, tableSize: { x: 1270, y: 508 }, controller: "Hurco WinMAX v10" },
  { id: "VMC-02", name: "Okuma M460V-5AX", manufacturer: "Okuma", type: "5-Axis", axes: 5, spindleMaxRpm: 15000, spindlePowerKw: 22, maxToolDiameter: 100, toolCapacity: 48, tableSize: { x: 400, y: 400 }, controller: "Okuma OSP-P300MA-H" },
  { id: "VMC-03", name: "Haas VF-2", manufacturer: "Haas", type: "VMC", axes: 3, spindleMaxRpm: 8100, spindlePowerKw: 22.4, maxToolDiameter: 89, toolCapacity: 20, tableSize: { x: 762, y: 356 }, controller: "Haas PRE-NGC" },
  { id: "VMC-04", name: "Haas OM-2", manufacturer: "Haas", type: "VMC", axes: 3, spindleMaxRpm: 30000, spindlePowerKw: 3.7, maxToolDiameter: 40, toolCapacity: 20, tableSize: { x: 508, y: 254 }, controller: "Haas PRE-NGC" },
  { id: "VMC-05", name: "Roku-Roku HC 658-II", manufacturer: "Roku-Roku", type: "VMC", axes: 3, spindleMaxRpm: 32000, spindlePowerKw: 6.3, maxToolDiameter: 40, toolCapacity: 30, tableSize: { x: 600, y: 500 }, controller: "Fanuc 31i-B5" },
];

export interface MachineValidation {
  machine: MachineEntry;
  rpmOk: boolean;
  powerOk: boolean;
  axesOk: boolean;
  issues: string[];
}

export function validateMachines(
  requiredRpm: number,
  requiredPowerKw: number,
  requiredAxes: number,
): MachineValidation[] {
  // Guard against NaN/Infinity
  if (!Number.isFinite(requiredRpm)) requiredRpm = 0;
  if (!Number.isFinite(requiredPowerKw)) requiredPowerKw = 0;
  if (!Number.isFinite(requiredAxes) || requiredAxes < 0) requiredAxes = 0;
  requiredRpm = Math.round(requiredRpm);

  return MACHINES.map((m) => {
    const issues: string[] = [];
    const rpmOk = m.spindleMaxRpm >= requiredRpm;
    const powerOk = m.spindlePowerKw >= requiredPowerKw;
    const axesOk = m.axes >= requiredAxes;

    if (!rpmOk) issues.push(`Max RPM ${m.spindleMaxRpm} < required ${Math.round(requiredRpm)}`);
    if (!powerOk) issues.push(`Power ${m.spindlePowerKw} kW < required ${requiredPowerKw.toFixed(1)} kW`);
    if (!axesOk) issues.push(`${m.axes}-axis < required ${requiredAxes}-axis`);

    return { machine: m, rpmOk, powerOk, axesOk, issues };
  });
}
