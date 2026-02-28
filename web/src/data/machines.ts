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

export const MACHINES: MachineEntry[] = [
  { id: "HAAS-VF2", name: "Haas VF-2", manufacturer: "Haas", type: "VMC", axes: 3, spindleMaxRpm: 8100, spindlePowerKw: 22.4, maxToolDiameter: 89, toolCapacity: 20, tableSize: { x: 762, y: 356 }, controller: "Haas NGC" },
  { id: "HAAS-VF4", name: "Haas VF-4SS", manufacturer: "Haas", type: "VMC", axes: 3, spindleMaxRpm: 12000, spindlePowerKw: 22.4, maxToolDiameter: 89, toolCapacity: 40, tableSize: { x: 1270, y: 457 }, controller: "Haas NGC" },
  { id: "DMG-CMX600", name: "DMG MORI CMX 600 V", manufacturer: "DMG MORI", type: "VMC", axes: 3, spindleMaxRpm: 12000, spindlePowerKw: 18.5, maxToolDiameter: 80, toolCapacity: 30, tableSize: { x: 600, y: 560 }, controller: "CELOS Siemens" },
  { id: "DMG-DMU50", name: "DMG MORI DMU 50", manufacturer: "DMG MORI", type: "5-Axis", axes: 5, spindleMaxRpm: 20000, spindlePowerKw: 35, maxToolDiameter: 80, toolCapacity: 60, tableSize: { x: 500, y: 450 }, controller: "CELOS Siemens" },
  { id: "MAZAK-CV5", name: "Mazak CV5-500", manufacturer: "Mazak", type: "5-Axis", axes: 5, spindleMaxRpm: 18000, spindlePowerKw: 30, maxToolDiameter: 80, toolCapacity: 40, tableSize: { x: 500, y: 400 }, controller: "SmoothX" },
  { id: "OKUMA-MB56", name: "Okuma MB-56VA", manufacturer: "Okuma", type: "HMC", axes: 4, spindleMaxRpm: 15000, spindlePowerKw: 26, maxToolDiameter: 100, toolCapacity: 48, tableSize: { x: 560, y: 560 }, controller: "OSP-P300MA" },
  { id: "HAAS-ST20", name: "Haas ST-20", manufacturer: "Haas", type: "Lathe", axes: 2, spindleMaxRpm: 4000, spindlePowerKw: 22.4, maxToolDiameter: 300, toolCapacity: 12, tableSize: { x: 533, y: 0 }, controller: "Haas NGC" },
  { id: "DMG-NLX2500", name: "DMG MORI NLX 2500", manufacturer: "DMG MORI", type: "Lathe", axes: 2, spindleMaxRpm: 4000, spindlePowerKw: 26, maxToolDiameter: 350, toolCapacity: 12, tableSize: { x: 705, y: 0 }, controller: "CELOS Mitsubishi" },
  { id: "MAZAK-INT200", name: "Mazak Integrex i-200", manufacturer: "Mazak", type: "Mill-Turn", axes: 5, spindleMaxRpm: 12000, spindlePowerKw: 30, maxToolDiameter: 80, toolCapacity: 36, tableSize: { x: 500, y: 0 }, controller: "SmoothAi" },
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
