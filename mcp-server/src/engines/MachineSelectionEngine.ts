/**
 * MachineSelectionEngine — Manufacturing Intelligence Layer
 *
 * Recommends optimal CNC machines for part requirements based on
 * travel, accuracy, spindle, and tooling capacity. Composes MachineRegistry.
 *
 * Actions: machine_recommend, machine_compare, machine_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachineRequirements {
  part_envelope_mm: { x: number; y: number; z: number };
  operations: string[];              // face_mill, drill, bore, 5axis_contour, etc.
  material_iso_group?: string;
  required_accuracy_mm?: number;     // best tolerance needed
  surface_finish_Ra?: number;
  max_tool_diameter_mm?: number;
  min_spindle_rpm?: number;
  max_spindle_rpm?: number;
  needs_4th_axis?: boolean;
  needs_5th_axis?: boolean;
  pallet_changer?: boolean;
  production_volume?: "prototype" | "low" | "medium" | "high";
  max_hourly_rate?: number;
}

export interface MachineCandidate {
  machine_id: string;
  name: string;
  type: string;                      // VMC, HMC, lathe, 5axis, Swiss, etc.
  score: number;
  travel: { x: number; y: number; z: number };
  spindle: { max_rpm: number; power_kW: number; taper: string };
  tool_capacity: number;
  accuracy_mm: number;
  hourly_rate: number;
  rationale: string[];
  limitations: string[];
}

export interface MachineComparisonResult {
  machines: MachineCandidate[];
  best_match: string;
  comparison_factors: string[];
}

export interface MachineValidationResult {
  suitable: boolean;
  machine_id: string;
  issues: string[];
  travel_ok: boolean;
  spindle_ok: boolean;
  accuracy_ok: boolean;
  axes_ok: boolean;
}

// ============================================================================
// MACHINE DATABASE (representative CNC machines)
// ============================================================================

interface MachineSpec {
  id: string; name: string; type: string;
  x: number; y: number; z: number; // travel mm
  rpm: number; power: number; taper: string;
  tools: number; accuracy: number; rate: number;
  axes: number; pallet: boolean;
}

const MACHINES: MachineSpec[] = [
  { id: "haas_vf2", name: "Haas VF-2", type: "VMC", x: 762, y: 406, z: 508, rpm: 8100, power: 22.4, taper: "BT40", tools: 20, accuracy: 0.013, rate: 85, axes: 3, pallet: false },
  { id: "haas_vf4", name: "Haas VF-4", type: "VMC", x: 1270, y: 508, z: 635, rpm: 8100, power: 22.4, taper: "BT40", tools: 20, accuracy: 0.013, rate: 95, axes: 3, pallet: false },
  { id: "haas_uo2", name: "Haas UMC-500", type: "5-Axis", x: 508, y: 406, z: 394, rpm: 8100, power: 22.4, taper: "BT40", tools: 40, accuracy: 0.010, rate: 135, axes: 5, pallet: false },
  { id: "dmg_dmu50", name: "DMG MORI DMU 50", type: "5-Axis", x: 500, y: 450, z: 400, rpm: 14000, power: 25, taper: "HSK-A63", tools: 30, accuracy: 0.005, rate: 175, axes: 5, pallet: false },
  { id: "dmg_dmu80", name: "DMG MORI DMU 80", type: "5-Axis", x: 800, y: 650, z: 550, rpm: 18000, power: 35, taper: "HSK-A63", tools: 60, accuracy: 0.004, rate: 225, axes: 5, pallet: true },
  { id: "mazak_v15", name: "Mazak VCN-430A", type: "VMC", x: 560, y: 410, z: 460, rpm: 12000, power: 18.5, taper: "BT40", tools: 30, accuracy: 0.008, rate: 110, axes: 3, pallet: false },
  { id: "mazak_i200", name: "Mazak INTEGREX i-200", type: "Multi-Tasking", x: 615, y: 230, z: 905, rpm: 12000, power: 22, taper: "HSK-A63", tools: 36, accuracy: 0.005, rate: 200, axes: 5, pallet: false },
  { id: "okuma_genos", name: "Okuma GENOS M560-V", type: "VMC", x: 1050, y: 560, z: 460, rpm: 15000, power: 22, taper: "BT40", tools: 32, accuracy: 0.006, rate: 120, axes: 3, pallet: false },
  { id: "makino_a51", name: "Makino a51nx", type: "HMC", x: 560, y: 510, z: 510, rpm: 14000, power: 30, taper: "HSK-A63", tools: 60, accuracy: 0.003, rate: 250, axes: 4, pallet: true },
  { id: "makino_d500", name: "Makino D500", type: "5-Axis", x: 500, y: 500, z: 350, rpm: 20000, power: 37, taper: "HSK-A63", tools: 60, accuracy: 0.002, rate: 300, axes: 5, pallet: false },
  { id: "citizen_l20", name: "Citizen L20-XII", type: "Swiss-Lathe", x: 200, y: 0, z: 320, rpm: 10000, power: 3.7, taper: "guide_bushing", tools: 26, accuracy: 0.003, rate: 110, axes: 7, pallet: false },
  { id: "haas_st20", name: "Haas ST-20", type: "Lathe", x: 0, y: 0, z: 533, rpm: 4000, power: 22.4, taper: "A2-6", tools: 12, accuracy: 0.013, rate: 75, axes: 2, pallet: false },
];

// ============================================================================
// SCORING
// ============================================================================

function scoreMachine(m: MachineSpec, req: MachineRequirements): { score: number; rationale: string[]; limitations: string[] } {
  let score = 50;
  const rationale: string[] = [];
  const limitations: string[] = [];

  // Travel check
  const travelOk = m.x >= req.part_envelope_mm.x && m.y >= req.part_envelope_mm.y && m.z >= req.part_envelope_mm.z;
  if (travelOk) {
    score += 15;
    const margin = Math.min(
      (m.x - req.part_envelope_mm.x) / req.part_envelope_mm.x,
      (m.y - req.part_envelope_mm.y) / Math.max(req.part_envelope_mm.y, 1),
      (m.z - req.part_envelope_mm.z) / req.part_envelope_mm.z
    );
    if (margin > 0.5) { score += 5; rationale.push("Generous travel margin"); }
    rationale.push(`Travel ${m.x}×${m.y}×${m.z} covers part envelope`);
  } else {
    score -= 30;
    limitations.push(`Travel ${m.x}×${m.y}×${m.z} insufficient for part`);
  }

  // Accuracy
  if (req.required_accuracy_mm) {
    if (m.accuracy <= req.required_accuracy_mm) { score += 10; rationale.push(`Accuracy ${m.accuracy}mm meets requirement`); }
    else { score -= 20; limitations.push(`Accuracy ${m.accuracy}mm insufficient (need ${req.required_accuracy_mm}mm)`); }
  }

  // Spindle RPM
  if (req.min_spindle_rpm && m.rpm >= req.min_spindle_rpm) { score += 5; }
  else if (req.min_spindle_rpm) { limitations.push(`Max RPM ${m.rpm} below required ${req.min_spindle_rpm}`); score -= 10; }

  // 5-axis need
  if (req.needs_5th_axis && m.axes >= 5) { score += 15; rationale.push("5-axis capable"); }
  else if (req.needs_5th_axis) { score -= 25; limitations.push("5-axis required but not available"); }
  else if (req.needs_4th_axis && m.axes >= 4) { score += 10; rationale.push("4th axis available"); }
  else if (req.needs_4th_axis && m.axes < 4) { score -= 15; limitations.push("4th axis required"); }

  // Pallet changer
  if (req.pallet_changer && m.pallet) { score += 10; rationale.push("Pallet changer for high throughput"); }
  else if (req.pallet_changer && !m.pallet) { score -= 5; limitations.push("No pallet changer"); }

  // Cost
  if (req.max_hourly_rate && m.rate <= req.max_hourly_rate) { score += 5; rationale.push(`Rate $${m.rate}/hr within budget`); }
  else if (req.max_hourly_rate) { score -= 5; limitations.push(`Rate $${m.rate}/hr exceeds budget`); }

  // Production volume
  if (req.production_volume === "high" && m.pallet) { score += 10; rationale.push("Pallet system suits high volume"); }
  if (req.production_volume === "prototype" && m.rate < 120) { score += 5; rationale.push("Cost-effective for prototyping"); }

  // Material power check
  if (req.material_iso_group === "S" || req.material_iso_group === "H") {
    if (m.power >= 25) { score += 5; rationale.push("Sufficient power for hard materials"); }
    else { limitations.push(`Power ${m.power}kW may limit feed rates in hard materials`); }
  }

  return { score: Math.max(0, Math.min(100, score)), rationale, limitations };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachineSelectionEngine {
  recommend(req: MachineRequirements): MachineCandidate[] {
    const candidates: MachineCandidate[] = [];

    for (const m of MACHINES) {
      const { score, rationale, limitations } = scoreMachine(m, req);
      candidates.push({
        machine_id: m.id, name: m.name, type: m.type, score,
        travel: { x: m.x, y: m.y, z: m.z },
        spindle: { max_rpm: m.rpm, power_kW: m.power, taper: m.taper },
        tool_capacity: m.tools, accuracy_mm: m.accuracy,
        hourly_rate: m.rate, rationale, limitations,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }

  compare(machineIds: string[]): MachineComparisonResult {
    const machines: MachineCandidate[] = [];

    for (const id of machineIds) {
      const m = MACHINES.find(mc => mc.id === id) || MACHINES[0];
      machines.push({
        machine_id: m.id, name: m.name, type: m.type, score: 50,
        travel: { x: m.x, y: m.y, z: m.z },
        spindle: { max_rpm: m.rpm, power_kW: m.power, taper: m.taper },
        tool_capacity: m.tools, accuracy_mm: m.accuracy,
        hourly_rate: m.rate, rationale: [], limitations: [],
      });
    }

    const best = machines.reduce((b, c) => c.score >= b.score ? c : b, machines[0]);
    return {
      machines, best_match: best.machine_id,
      comparison_factors: ["travel", "spindle_rpm", "accuracy", "tool_capacity", "hourly_rate"],
    };
  }

  validate(machineId: string, req: MachineRequirements): MachineValidationResult {
    const m = MACHINES.find(mc => mc.id === machineId);
    if (!m) return { suitable: false, machine_id: machineId, issues: ["Machine not found"], travel_ok: false, spindle_ok: false, accuracy_ok: false, axes_ok: false };

    const issues: string[] = [];
    const travelOk = m.x >= req.part_envelope_mm.x && m.y >= req.part_envelope_mm.y && m.z >= req.part_envelope_mm.z;
    if (!travelOk) issues.push("Travel envelope insufficient");

    const spindleOk = !req.min_spindle_rpm || m.rpm >= req.min_spindle_rpm;
    if (!spindleOk) issues.push(`RPM ${m.rpm} below required ${req.min_spindle_rpm}`);

    const accuracyOk = !req.required_accuracy_mm || m.accuracy <= req.required_accuracy_mm;
    if (!accuracyOk) issues.push(`Accuracy ${m.accuracy}mm insufficient`);

    const axesNeeded = req.needs_5th_axis ? 5 : req.needs_4th_axis ? 4 : 3;
    const axesOk = m.axes >= axesNeeded;
    if (!axesOk) issues.push(`${axesNeeded}-axis required, machine has ${m.axes}`);

    return { suitable: issues.length === 0, machine_id: machineId, issues, travel_ok: travelOk, spindle_ok: spindleOk, accuracy_ok: accuracyOk, axes_ok: axesOk };
  }
}

export const machineSelectionEngine = new MachineSelectionEngine();
