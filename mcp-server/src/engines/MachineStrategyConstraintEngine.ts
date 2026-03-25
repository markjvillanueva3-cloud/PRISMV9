/**
 * MachineStrategyConstraintEngine — CAMX-MS2/U02
 *
 * Validates CAM strategy against machine PHYSICAL capabilities (not controller).
 * Uses the 910 machine profiles in PRISM to check 10 constraint dimensions:
 *
 * 1. Max RPM vs required RPM for strategy (HSM needs high RPM)
 * 2. Spindle power vs required power (adaptive clearing needs sustained power)
 * 3. Axis acceleration vs required for HSM (min 0.5G for high-speed)
 * 4. Jerk limits vs required for smooth motion (NURBS needs low jerk)
 * 5. Rapid traverse rate vs strategy rapid requirements
 * 6. Tool magazine capacity vs job tool count
 * 7. Spindle taper vs tool requirements (HSK for high-speed, BT40 for general)
 * 8. Work envelope vs part size
 * 9. Coolant pressure vs strategy (through-tool >40 bar, TSC >70 bar)
 * 10. Axis count (3/4/5) vs strategy requirement
 *
 * Machine capability tiers:
 *   Entry (Haas VF-2 class):        8100 RPM, 22kW, BT40,    3-axis, 20-tool, <0.3G
 *   Mid-range (DMG DMU 50 class):   18000 RPM, 35kW, HSK-A63, 5-axis, 30-tool, 0.5G
 *   High-performance (Makino a51nx): 20000 RPM, 37kW, HSK-A63, 4-axis, 60-tool, 1.0G
 *   Ultra-high (Kern Micro class):   50000 RPM, 8kW, HSK-E25, 5-axis, 30-tool, 2.0G
 *
 * Methods:
 *   validate(strategy, machine)         -> feasible, constraints_met/violated, recommendations
 *   findBestMachine(strategy, machines) -> ranked list by strategy suitability
 *   getRequirements(strategy)           -> what a strategy needs from a machine
 *
 * Actions: machine_strategy_validate, machine_strategy_find_best, machine_strategy_requirements
 *
 * @shortcode E1091
 * @module engines/MachineStrategyConstraintEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Physical machine capabilities (not controller/software). */
export interface MachineCapabilities {
  machine_id: string;
  name: string;
  max_rpm: number;
  spindle_power_kW: number;
  acceleration_g: number;
  jerk_m_s3?: number;
  rapid_traverse_mm_min: number;
  tool_magazine_capacity: number;
  spindle_taper: string;
  work_envelope_mm: { x: number; y: number; z: number };
  coolant_pressure_bar: number;
  axis_count: number;
  /** Optional tier override; auto-detected if omitted */
  tier?: "entry" | "mid_range" | "high_performance" | "ultra_high";
}

/** Strategy requirements from the machine. */
export interface StrategyRequirements {
  strategy_name: string;
  min_rpm: number;
  min_power_kW: number;
  min_acceleration_g: number;
  max_jerk_m_s3?: number;
  min_rapid_mm_min: number;
  min_tool_slots: number;
  required_tapers: string[];
  min_envelope_mm?: { x: number; y: number; z: number };
  min_coolant_bar: number;
  min_axes: number;
  notes: string[];
}

/** A single constraint check result. */
export interface ConstraintCheck {
  constraint: string;
  required: number | string;
  actual: number | string;
  met: boolean;
  margin_pct?: number;
  note?: string;
}

/** Full validation result. */
export interface ValidationResult {
  feasible: boolean;
  strategy: string;
  machine: string;
  constraints_met: ConstraintCheck[];
  constraints_violated: ConstraintCheck[];
  derating_needed?: { parameter: string; current: number; safe_limit: number; factor: number }[];
  recommendations: string[];
  score: number;
}

/** Ranked machine result for findBestMachine. */
export interface RankedMachine {
  machine_id: string;
  name: string;
  score: number;
  feasible: boolean;
  constraints_violated_count: number;
  key_strengths: string[];
  key_weaknesses: string[];
}

// ============================================================================
// STRATEGY REQUIREMENTS DATABASE
// ============================================================================

/** Known strategies and their machine requirements. */
const STRATEGY_REQUIREMENTS: Record<string, Omit<StrategyRequirements, "strategy_name">> = {
  // HSM strategies
  hsm_finishing: {
    min_rpm: 15000, min_power_kW: 15, min_acceleration_g: 0.5,
    max_jerk_m_s3: 50, min_rapid_mm_min: 30000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-E25", "HSK-E32", "HSK-F63", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["High RPM critical for small tools at HSM feeds", "HSK taper preferred for high-speed balance"],
  },
  hsm_roughing: {
    min_rpm: 12000, min_power_kW: 25, min_acceleration_g: 0.5,
    max_jerk_m_s3: 80, min_rapid_mm_min: 30000, min_tool_slots: 8,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 30, min_axes: 3,
    notes: ["Sustained power more important than peak RPM", "High accel for frequent direction changes"],
  },
  // Adaptive clearing
  adaptive_clearing: {
    min_rpm: 8000, min_power_kW: 20, min_acceleration_g: 0.3,
    min_rapid_mm_min: 20000, min_tool_slots: 6,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["Sustained spindle power critical for full-depth cuts", "Coolant flow volume matters more than pressure"],
  },
  // Trochoidal milling
  trochoidal_milling: {
    min_rpm: 10000, min_power_kW: 15, min_acceleration_g: 0.4,
    max_jerk_m_s3: 60, min_rapid_mm_min: 25000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "Capto-C5"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["Circular interpolation accuracy affects surface quality", "Acceleration critical for arc transitions"],
  },
  // 5-axis contouring
  five_axis_contouring: {
    min_rpm: 12000, min_power_kW: 20, min_acceleration_g: 0.4,
    max_jerk_m_s3: 40, min_rapid_mm_min: 20000, min_tool_slots: 15,
    required_tapers: ["HSK-A63", "HSK-E25", "HSK-E32", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 30, min_axes: 5,
    notes: ["5-axis simultaneous required", "Low jerk critical for smooth surface blends"],
  },
  // NURBS interpolation
  nurbs_interpolation: {
    min_rpm: 10000, min_power_kW: 15, min_acceleration_g: 0.5,
    max_jerk_m_s3: 30, min_rapid_mm_min: 20000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-E25", "HSK-E32", "Capto-C5"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["Very low jerk essential for curve fidelity", "Controller must support G06.1/NURBS mode"],
  },
  // Pocket milling
  pocket_milling: {
    min_rpm: 6000, min_power_kW: 15, min_acceleration_g: 0.2,
    min_rapid_mm_min: 15000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 10, min_axes: 3,
    notes: ["Basic strategy — most machines capable", "Chip evacuation more important than coolant pressure"],
  },
  // Face milling
  face_milling: {
    min_rpm: 4000, min_power_kW: 20, min_acceleration_g: 0.15,
    min_rapid_mm_min: 10000, min_tool_slots: 3,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 5, min_axes: 3,
    notes: ["Power for large face mills", "Rigidity more critical than speed"],
  },
  // Through-spindle coolant drilling
  tsc_drilling: {
    min_rpm: 6000, min_power_kW: 10, min_acceleration_g: 0.15,
    min_rapid_mm_min: 15000, min_tool_slots: 8,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50", "Capto-C5"],
    min_coolant_bar: 40, min_axes: 3,
    notes: ["Through-tool coolant >= 40 bar required", "TSC at >= 70 bar for deep holes (>5xD)"],
  },
  // Deep hole drilling
  deep_hole_drilling: {
    min_rpm: 4000, min_power_kW: 10, min_acceleration_g: 0.1,
    min_rapid_mm_min: 10000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50"],
    min_coolant_bar: 70, min_axes: 3,
    notes: ["High-pressure TSC (>= 70 bar) critical for chip evacuation", "Peck cycle support required"],
  },
  // Micro milling
  micro_milling: {
    min_rpm: 40000, min_power_kW: 5, min_acceleration_g: 1.5,
    max_jerk_m_s3: 20, min_rapid_mm_min: 30000, min_tool_slots: 10,
    required_tapers: ["HSK-E25", "HSK-E32"],
    min_coolant_bar: 10, min_axes: 3,
    notes: ["Ultra-high RPM for micro tools (< 1mm)", "Minimal runout required (< 2 um TIR)"],
  },
  // Plunge roughing
  plunge_roughing: {
    min_rpm: 6000, min_power_kW: 25, min_acceleration_g: 0.2,
    min_rapid_mm_min: 15000, min_tool_slots: 5,
    required_tapers: ["HSK-A63", "HSK-F63", "BT40", "BT50", "Capto-C6"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["Axial rigidity more important than radial", "High sustained power for Z-axis plunges"],
  },
  // Rest machining
  rest_machining: {
    min_rpm: 10000, min_power_kW: 15, min_acceleration_g: 0.3,
    min_rapid_mm_min: 20000, min_tool_slots: 10,
    required_tapers: ["HSK-A63", "HSK-E25", "HSK-E32", "BT40", "Capto-C5"],
    min_coolant_bar: 20, min_axes: 3,
    notes: ["Multiple small tools needed for rest areas", "Good acceleration for frequent engage/disengage"],
  },
  // Swarf cutting (5-axis)
  swarf_cutting: {
    min_rpm: 10000, min_power_kW: 15, min_acceleration_g: 0.3,
    max_jerk_m_s3: 40, min_rapid_mm_min: 20000, min_tool_slots: 10,
    required_tapers: ["HSK-A63", "HSK-E25", "Capto-C5", "Capto-C6"],
    min_coolant_bar: 20, min_axes: 5,
    notes: ["5-axis simultaneous for ruled surface cutting", "Smooth rotary axis motion critical"],
  },
};

// ============================================================================
// DEFAULT MACHINE DATABASE (representative profiles for the 4 tiers)
// ============================================================================

const DEFAULT_MACHINES: MachineCapabilities[] = [
  // Entry tier
  {
    machine_id: "haas_vf2", name: "Haas VF-2", max_rpm: 8100,
    spindle_power_kW: 22.4, acceleration_g: 0.25, jerk_m_s3: 100,
    rapid_traverse_mm_min: 25400, tool_magazine_capacity: 20,
    spindle_taper: "BT40", work_envelope_mm: { x: 762, y: 406, z: 508 },
    coolant_pressure_bar: 7, axis_count: 3, tier: "entry",
  },
  {
    machine_id: "haas_vf4", name: "Haas VF-4", max_rpm: 8100,
    spindle_power_kW: 22.4, acceleration_g: 0.25, jerk_m_s3: 100,
    rapid_traverse_mm_min: 25400, tool_magazine_capacity: 20,
    spindle_taper: "BT40", work_envelope_mm: { x: 1270, y: 508, z: 635 },
    coolant_pressure_bar: 7, axis_count: 3, tier: "entry",
  },
  {
    machine_id: "haas_umc500", name: "Haas UMC-500", max_rpm: 8100,
    spindle_power_kW: 22.4, acceleration_g: 0.3, jerk_m_s3: 80,
    rapid_traverse_mm_min: 25400, tool_magazine_capacity: 40,
    spindle_taper: "BT40", work_envelope_mm: { x: 508, y: 406, z: 394 },
    coolant_pressure_bar: 7, axis_count: 5, tier: "entry",
  },
  // Mid-range tier
  {
    machine_id: "dmg_dmu50", name: "DMG MORI DMU 50", max_rpm: 18000,
    spindle_power_kW: 35, acceleration_g: 0.5, jerk_m_s3: 50,
    rapid_traverse_mm_min: 42000, tool_magazine_capacity: 30,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 500, y: 450, z: 400 },
    coolant_pressure_bar: 40, axis_count: 5, tier: "mid_range",
  },
  {
    machine_id: "dmg_dmu80", name: "DMG MORI DMU 80", max_rpm: 18000,
    spindle_power_kW: 35, acceleration_g: 0.5, jerk_m_s3: 50,
    rapid_traverse_mm_min: 42000, tool_magazine_capacity: 60,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 800, y: 650, z: 550 },
    coolant_pressure_bar: 40, axis_count: 5, tier: "mid_range",
  },
  {
    machine_id: "okuma_mu5000v", name: "Okuma MU-5000V", max_rpm: 15000,
    spindle_power_kW: 30, acceleration_g: 0.45, jerk_m_s3: 55,
    rapid_traverse_mm_min: 40000, tool_magazine_capacity: 32,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 762, y: 460, z: 460 },
    coolant_pressure_bar: 35, axis_count: 5, tier: "mid_range",
  },
  // High-performance tier
  {
    machine_id: "makino_a51nx", name: "Makino a51nx", max_rpm: 14000,
    spindle_power_kW: 30, acceleration_g: 1.0, jerk_m_s3: 35,
    rapid_traverse_mm_min: 60000, tool_magazine_capacity: 60,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 560, y: 510, z: 510 },
    coolant_pressure_bar: 70, axis_count: 4, tier: "high_performance",
  },
  {
    machine_id: "makino_d500", name: "Makino D500", max_rpm: 20000,
    spindle_power_kW: 37, acceleration_g: 1.0, jerk_m_s3: 30,
    rapid_traverse_mm_min: 60000, tool_magazine_capacity: 60,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 500, y: 500, z: 350 },
    coolant_pressure_bar: 70, axis_count: 5, tier: "high_performance",
  },
  {
    machine_id: "mazak_variaxis_i700", name: "Mazak Variaxis i-700", max_rpm: 18000,
    spindle_power_kW: 37, acceleration_g: 0.8, jerk_m_s3: 35,
    rapid_traverse_mm_min: 56000, tool_magazine_capacity: 40,
    spindle_taper: "HSK-A63", work_envelope_mm: { x: 730, y: 730, z: 660 },
    coolant_pressure_bar: 70, axis_count: 5, tier: "high_performance",
  },
  // Ultra-high tier
  {
    machine_id: "kern_micro_hd", name: "Kern Micro HD", max_rpm: 50000,
    spindle_power_kW: 8, acceleration_g: 2.0, jerk_m_s3: 15,
    rapid_traverse_mm_min: 40000, tool_magazine_capacity: 30,
    spindle_taper: "HSK-E25", work_envelope_mm: { x: 250, y: 220, z: 200 },
    coolant_pressure_bar: 20, axis_count: 5, tier: "ultra_high",
  },
  {
    machine_id: "kern_pyramid_nano", name: "Kern Pyramid Nano", max_rpm: 50000,
    spindle_power_kW: 6.4, acceleration_g: 2.0, jerk_m_s3: 12,
    rapid_traverse_mm_min: 30000, tool_magazine_capacity: 75,
    spindle_taper: "HSK-E25", work_envelope_mm: { x: 500, y: 500, z: 300 },
    coolant_pressure_bar: 15, axis_count: 5, tier: "ultra_high",
  },
  {
    machine_id: "roders_rxp601dsh", name: "Roeders RXP 601 DSH", max_rpm: 60000,
    spindle_power_kW: 8.5, acceleration_g: 2.5, jerk_m_s3: 10,
    rapid_traverse_mm_min: 60000, tool_magazine_capacity: 33,
    spindle_taper: "HSK-E25", work_envelope_mm: { x: 600, y: 500, z: 300 },
    coolant_pressure_bar: 20, axis_count: 5, tier: "ultra_high",
  },
];

// ============================================================================
// TAPER COMPATIBILITY
// ============================================================================

/** Taper families and their high-speed ratings. */
const TAPER_HSM_RATED: Record<string, boolean> = {
  "HSK-A63": true, "HSK-A100": true, "HSK-E25": true, "HSK-E32": true,
  "HSK-E40": true, "HSK-F63": true, "Capto-C5": true, "Capto-C6": true,
  "Capto-C4": true, "BT40": false, "BT50": false, "CAT40": false,
  "CAT50": false, "R8": false, "MT3": false, "MT4": false,
};

// ============================================================================
// HELPERS
// ============================================================================

function pctMargin(actual: number, required: number): number {
  if (required === 0) return 100;
  return Math.round(((actual - required) / required) * 100);
}

function checkConstraint(
  name: string,
  actual: number | string,
  required: number | string,
  met: boolean,
  note?: string,
): ConstraintCheck {
  const result: ConstraintCheck = { constraint: name, required, actual, met };
  if (typeof actual === "number" && typeof required === "number" && required > 0) {
    result.margin_pct = pctMargin(actual, required);
  }
  if (note) result.note = note;
  return result;
}

function detectTier(m: MachineCapabilities): string {
  if (m.tier) return m.tier;
  if (m.max_rpm >= 40000) return "ultra_high";
  if (m.acceleration_g >= 0.8 && m.max_rpm >= 14000) return "high_performance";
  if (m.max_rpm >= 12000 && m.spindle_power_kW >= 25) return "mid_range";
  return "entry";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachineStrategyConstraintEngine {
  private machines: MachineCapabilities[];

  constructor(machines?: MachineCapabilities[]) {
    this.machines = machines ?? DEFAULT_MACHINES;
  }

  // --------------------------------------------------------------------------
  // getRequirements — what does a strategy need from a machine?
  // --------------------------------------------------------------------------

  getRequirements(params: {
    strategy: string;
    part_envelope_mm?: { x: number; y: number; z: number };
    tool_count?: number;
    coolant_type?: string;
  }): StrategyRequirements {
    const key = params.strategy.toLowerCase().replace(/[\s-]+/g, "_");
    const base = STRATEGY_REQUIREMENTS[key];

    if (!base) {
      log.warn(`[MachineStrategyConstraint] Unknown strategy '${params.strategy}', returning conservative defaults`);
      return {
        strategy_name: params.strategy,
        min_rpm: 6000, min_power_kW: 15, min_acceleration_g: 0.2,
        min_rapid_mm_min: 15000, min_tool_slots: 5,
        required_tapers: ["HSK-A63", "BT40", "BT50"],
        min_coolant_bar: 10, min_axes: 3,
        notes: [`Strategy '${params.strategy}' not in database — conservative defaults applied`],
      };
    }

    const req: StrategyRequirements = { strategy_name: params.strategy, ...base };

    // Override tool slots if job specifies more
    if (params.tool_count && params.tool_count > req.min_tool_slots) {
      req.min_tool_slots = params.tool_count;
      req.notes = [...req.notes, `Tool slots adjusted to ${params.tool_count} for job`];
    }

    // Override envelope if part specifies it
    if (params.part_envelope_mm) {
      req.min_envelope_mm = params.part_envelope_mm;
    }

    // Adjust coolant for specific coolant type
    if (params.coolant_type === "through_tool" && req.min_coolant_bar < 40) {
      req.min_coolant_bar = 40;
      req.notes = [...req.notes, "Through-tool coolant requires >= 40 bar"];
    }
    if (params.coolant_type === "tsc" && req.min_coolant_bar < 70) {
      req.min_coolant_bar = 70;
      req.notes = [...req.notes, "TSC (through-spindle coolant) requires >= 70 bar"];
    }

    return req;
  }

  // --------------------------------------------------------------------------
  // validate — check strategy against a specific machine
  // --------------------------------------------------------------------------

  validate(params: {
    strategy: string;
    machine: MachineCapabilities | string;
    part_envelope_mm?: { x: number; y: number; z: number };
    tool_count?: number;
    coolant_type?: string;
  }): ValidationResult {
    const machine = typeof params.machine === "string"
      ? this.machines.find(m => m.machine_id === params.machine)
      : params.machine;

    if (!machine) {
      return {
        feasible: false, strategy: params.strategy,
        machine: typeof params.machine === "string" ? params.machine : "unknown",
        constraints_met: [], constraints_violated: [{ constraint: "machine_found", required: "exists", actual: "not found", met: false }],
        recommendations: ["Machine not found in database. Provide full MachineCapabilities object."],
        score: 0,
      };
    }

    const req = this.getRequirements({
      strategy: params.strategy,
      part_envelope_mm: params.part_envelope_mm,
      tool_count: params.tool_count,
      coolant_type: params.coolant_type,
    });

    const met: ConstraintCheck[] = [];
    const violated: ConstraintCheck[] = [];
    const recommendations: string[] = [];
    const derating: ValidationResult["derating_needed"] = [];

    // 1. RPM
    const rpmCheck = checkConstraint("max_rpm", machine.max_rpm, req.min_rpm,
      machine.max_rpm >= req.min_rpm,
      machine.max_rpm < req.min_rpm ? `Need ${req.min_rpm} RPM, machine has ${machine.max_rpm}` : undefined);
    (rpmCheck.met ? met : violated).push(rpmCheck);
    if (!rpmCheck.met) {
      recommendations.push(`RPM deficit: reduce cutting speed by ${Math.round((1 - machine.max_rpm / req.min_rpm) * 100)}% or use larger tool diameter`);
    }

    // 2. Spindle power
    const powerCheck = checkConstraint("spindle_power_kW", machine.spindle_power_kW, req.min_power_kW,
      machine.spindle_power_kW >= req.min_power_kW);
    (powerCheck.met ? met : violated).push(powerCheck);
    if (!powerCheck.met) {
      const factor = machine.spindle_power_kW / req.min_power_kW;
      derating.push({
        parameter: "depth_of_cut", current: 1.0, safe_limit: factor, factor,
      });
      recommendations.push(`Power deficit: derate depth-of-cut to ${Math.round(factor * 100)}% of recommended`);
    }

    // 3. Acceleration
    const accelCheck = checkConstraint("acceleration_g", machine.acceleration_g, req.min_acceleration_g,
      machine.acceleration_g >= req.min_acceleration_g,
      machine.acceleration_g < req.min_acceleration_g ? "Slow direction changes will reduce HSM effectiveness" : undefined);
    (accelCheck.met ? met : violated).push(accelCheck);
    if (!accelCheck.met) {
      recommendations.push(`Low acceleration: reduce programmed feed rate to avoid corner rounding`);
    }

    // 4. Jerk
    if (req.max_jerk_m_s3 !== undefined && machine.jerk_m_s3 !== undefined) {
      // Lower jerk = smoother motion; machine jerk must be <= required max jerk
      const jerkOk = machine.jerk_m_s3 <= req.max_jerk_m_s3;
      const jerkCheck = checkConstraint("jerk_m_s3", machine.jerk_m_s3, req.max_jerk_m_s3,
        jerkOk, jerkOk ? undefined : "Machine jerk too high for smooth motion strategy");
      (jerkCheck.met ? met : violated).push(jerkCheck);
      if (!jerkOk) {
        recommendations.push(`Jerk too high (${machine.jerk_m_s3} vs max ${req.max_jerk_m_s3} m/s^3): enable controller smoothing or reduce feed`);
      }
    }

    // 5. Rapid traverse
    const rapidCheck = checkConstraint("rapid_traverse_mm_min", machine.rapid_traverse_mm_min, req.min_rapid_mm_min,
      machine.rapid_traverse_mm_min >= req.min_rapid_mm_min);
    (rapidCheck.met ? met : violated).push(rapidCheck);
    if (!rapidCheck.met) {
      recommendations.push(`Slow rapids will increase non-cutting time — accept cycle time penalty or use closer clearance planes`);
    }

    // 6. Tool magazine
    const magCheck = checkConstraint("tool_magazine_capacity", machine.tool_magazine_capacity, req.min_tool_slots,
      machine.tool_magazine_capacity >= req.min_tool_slots);
    (magCheck.met ? met : violated).push(magCheck);
    if (!magCheck.met) {
      recommendations.push(`Insufficient tool slots (${machine.tool_magazine_capacity} < ${req.min_tool_slots}): split into multiple setups or use sister tooling`);
    }

    // 7. Spindle taper
    const taperOk = req.required_tapers.includes(machine.spindle_taper);
    const taperCheck = checkConstraint("spindle_taper", machine.spindle_taper,
      req.required_tapers.join("/"), taperOk);
    (taperCheck.met ? met : violated).push(taperCheck);
    if (!taperOk) {
      const isHSM = req.min_rpm >= 12000;
      const hasHSMTaper = TAPER_HSM_RATED[machine.spindle_taper] ?? false;
      if (isHSM && !hasHSMTaper) {
        recommendations.push(`${machine.spindle_taper} not rated for HSM — centrifugal force causes taper loosening above 12k RPM`);
      } else {
        recommendations.push(`Taper ${machine.spindle_taper} not in recommended list; verify tool holder availability`);
      }
    }

    // 8. Work envelope
    if (req.min_envelope_mm) {
      const envOk = machine.work_envelope_mm.x >= req.min_envelope_mm.x
        && machine.work_envelope_mm.y >= req.min_envelope_mm.y
        && machine.work_envelope_mm.z >= req.min_envelope_mm.z;
      const envStr = `${machine.work_envelope_mm.x}x${machine.work_envelope_mm.y}x${machine.work_envelope_mm.z}`;
      const reqStr = `${req.min_envelope_mm.x}x${req.min_envelope_mm.y}x${req.min_envelope_mm.z}`;
      const envCheck = checkConstraint("work_envelope_mm", envStr, reqStr, envOk);
      (envCheck.met ? met : violated).push(envCheck);
      if (!envOk) {
        const axes = [];
        if (machine.work_envelope_mm.x < req.min_envelope_mm.x) axes.push("X");
        if (machine.work_envelope_mm.y < req.min_envelope_mm.y) axes.push("Y");
        if (machine.work_envelope_mm.z < req.min_envelope_mm.z) axes.push("Z");
        recommendations.push(`Part exceeds work envelope on ${axes.join(", ")} axis — cannot machine on this platform`);
      }
    }

    // 9. Coolant pressure
    const coolantCheck = checkConstraint("coolant_pressure_bar", machine.coolant_pressure_bar, req.min_coolant_bar,
      machine.coolant_pressure_bar >= req.min_coolant_bar);
    (coolantCheck.met ? met : violated).push(coolantCheck);
    if (!coolantCheck.met) {
      if (req.min_coolant_bar >= 70) {
        recommendations.push(`TSC requires >= 70 bar; consider aftermarket high-pressure coolant system`);
      } else if (req.min_coolant_bar >= 40) {
        recommendations.push(`Through-tool coolant requires >= 40 bar; flood coolant may be insufficient for chip evacuation`);
      } else {
        recommendations.push(`Low coolant pressure — monitor chip evacuation and thermal conditions`);
      }
    }

    // 10. Axis count
    const axisCheck = checkConstraint("axis_count", machine.axis_count, req.min_axes,
      machine.axis_count >= req.min_axes,
      machine.axis_count < req.min_axes ? `Strategy requires ${req.min_axes}-axis but machine is ${machine.axis_count}-axis` : undefined);
    (axisCheck.met ? met : violated).push(axisCheck);
    if (!axisCheck.met) {
      if (req.min_axes === 5 && machine.axis_count === 3) {
        recommendations.push("Consider 3+2 indexing with multiple setups as alternative to 5-axis simultaneous");
      } else {
        recommendations.push(`Machine axis count insufficient — strategy cannot be executed`);
      }
    }

    // Compute overall score (0-100)
    const totalChecks = met.length + violated.length;
    let score = totalChecks > 0 ? Math.round((met.length / totalChecks) * 100) : 0;

    // Bonus for margin on key parameters
    const rpmMargin = machine.max_rpm / req.min_rpm;
    const powerMargin = machine.spindle_power_kW / req.min_power_kW;
    if (rpmMargin > 1.5) score = Math.min(100, score + 3);
    if (powerMargin > 1.3) score = Math.min(100, score + 3);

    // Tier bonus
    const tier = detectTier(machine);
    if (tier === "ultra_high") score = Math.min(100, score + 4);
    else if (tier === "high_performance") score = Math.min(100, score + 2);

    const feasible = violated.length === 0;

    log.info(`[MachineStrategyConstraint] validate: ${params.strategy} on ${machine.name} => ${feasible ? "FEASIBLE" : "VIOLATED"} (score=${score}, met=${met.length}, violated=${violated.length})`);

    return {
      feasible, strategy: params.strategy, machine: machine.name,
      constraints_met: met, constraints_violated: violated,
      derating_needed: derating.length > 0 ? derating : undefined,
      recommendations, score,
    };
  }

  // --------------------------------------------------------------------------
  // findBestMachine — rank machines by strategy suitability
  // --------------------------------------------------------------------------

  findBestMachine(params: {
    strategy: string;
    machines?: MachineCapabilities[];
    part_envelope_mm?: { x: number; y: number; z: number };
    tool_count?: number;
    coolant_type?: string;
    top_n?: number;
  }): RankedMachine[] {
    const pool = params.machines ?? this.machines;
    const topN = params.top_n ?? 5;

    const ranked: RankedMachine[] = pool.map(m => {
      const result = this.validate({
        strategy: params.strategy,
        machine: m,
        part_envelope_mm: params.part_envelope_mm,
        tool_count: params.tool_count,
        coolant_type: params.coolant_type,
      });

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      for (const c of result.constraints_met) {
        if (typeof c.margin_pct === "number" && c.margin_pct > 50) {
          strengths.push(`${c.constraint}: ${c.margin_pct}% margin`);
        }
      }
      for (const c of result.constraints_violated) {
        weaknesses.push(`${c.constraint}: ${c.note ?? "below requirement"}`);
      }

      return {
        machine_id: m.machine_id,
        name: m.name,
        score: result.score,
        feasible: result.feasible,
        constraints_violated_count: result.constraints_violated.length,
        key_strengths: strengths.slice(0, 3),
        key_weaknesses: weaknesses.slice(0, 3),
      };
    });

    // Sort: feasible first, then by score descending
    ranked.sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      return b.score - a.score;
    });

    log.info(`[MachineStrategyConstraint] findBestMachine: ${params.strategy} — top pick: ${ranked[0]?.name ?? "none"} (score=${ranked[0]?.score ?? 0})`);

    return ranked.slice(0, topN);
  }

  // --------------------------------------------------------------------------
  // listStrategies — enumerate known strategies
  // --------------------------------------------------------------------------

  listStrategies(): string[] {
    return Object.keys(STRATEGY_REQUIREMENTS).sort();
  }

  // --------------------------------------------------------------------------
  // listMachines — enumerate loaded machine profiles
  // --------------------------------------------------------------------------

  listMachines(): { machine_id: string; name: string; tier: string }[] {
    return this.machines.map(m => ({
      machine_id: m.machine_id,
      name: m.name,
      tier: m.tier ?? detectTier(m),
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT — shortcode E1091
// ============================================================================

/** Singleton instance — shortcode E1091 */
export const machineStrategyConstraintEngine = new MachineStrategyConstraintEngine();
