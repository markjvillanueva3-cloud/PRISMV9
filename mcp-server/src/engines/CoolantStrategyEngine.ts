/**
 * CoolantStrategyEngine — Coolant method recommendation
 *
 * Models: Material+operation+tool → optimal coolant delivery method,
 *         concentration, pressure, flow rate estimation
 * References: Machinery's Handbook 31st ed., Sandvik Coolant Guide,
 *             NIOSH MWF Guidelines, Blaser Swisslube Application Guide
 * Extends: CoolantValidationEngine validates — this engine recommends
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

export type CoolantMaterial =
  | "carbon_steel"
  | "alloy_steel"
  | "stainless_steel"
  | "tool_steel"
  | "cast_iron"
  | "aluminum"
  | "copper"
  | "titanium"
  | "nickel_alloy"
  | "hardened_steel"
  | "magnesium"
  | "cfrp"
  | "plastic";

/** Coolant Operation type definition.
 */
export type CoolantOperation =
  | "turning_rough"
  | "turning_finish"
  | "milling_rough"
  | "milling_finish"
  | "drilling"
  | "deep_hole_drilling"
  | "tapping"
  | "reaming"
  | "grinding"
  | "boring"
  | "broaching"
  | "thread_milling";

/** Coolant Method type definition.
 */
export type CoolantMethod =
  | "flood"
  | "through_spindle"
  | "through_tool"
  | "mql"
  | "air_blast"
  | "cryogenic_co2"
  | "cryogenic_ln2"
  | "dry";

/** Coolant Fluid type definition.
 */
export type CoolantFluid =
  | "water_soluble_emulsion"
  | "semi_synthetic"
  | "full_synthetic"
  | "straight_oil"
  | "mql_ester"
  | "compressed_air"
  | "co2"
  | "liquid_nitrogen"
  | "none";

/** Coolant Strategy Input configuration/data structure.
 */
export interface CoolantStrategyInput {
  workpiece_material: CoolantMaterial;
  operation: CoolantOperation;
  cutting_speed_m_min?: number;
  depth_of_cut_mm?: number;
  hole_depth_mm?: number;        // for drilling
  hole_diameter_mm?: number;
  tool_has_through_coolant?: boolean;
  machine_max_pressure_bar?: number;
  environmental_priority?: boolean;   // prefer MQL/dry if possible
  workpiece_hardness_hrc?: number;
}

interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Coolant Strategy Result configuration/data structure.
 */
export interface CoolantStrategyResult {
  primary_method: CoolantMethod;
  fluid_type: CoolantFluid;
  concentration_pct: AtomicValue;      // emulsion concentration
  pressure_bar: AtomicValue;           // delivery pressure
  flow_rate_l_min: AtomicValue;        // estimated flow rate
  temperature_target_c: AtomicValue;   // coolant temperature
  alternative_method: CoolantMethod;
  safety_notes: string[];
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

// Materials that are dangerous when dry
const DRY_HAZARD: Set<CoolantMaterial> = new Set([
  "magnesium",      // fire risk
  "titanium",       // fire risk at high speeds
]);

// Materials that should NOT use water-based coolants
const NO_WATER: Set<CoolantMaterial> = new Set([
  "magnesium",      // hydrogen generation risk
  "cast_iron",      // rust staining (acceptable with inhibitors)
]);

// Materials that benefit most from MQL
const MQL_FRIENDLY: Set<CoolantMaterial> = new Set([
  "cast_iron",      // minimal thermal needs
  "aluminum",       // lubricity helps with BUE
  "carbon_steel",   // moderate thermal needs
]);

// Base pressure requirements by operation (bar)
const BASE_PRESSURE: Record<CoolantOperation, number> = {
  turning_rough:     10,
  turning_finish:    10,
  milling_rough:     15,
  milling_finish:    10,
  drilling:          20,
  deep_hole_drilling: 70,    // high pressure critical for chip evacuation
  tapping:           15,
  reaming:           10,
  grinding:          5,      // flood, low pressure
  boring:            15,
  broaching:         5,
  thread_milling:    20,
};

// Base flow rate by operation (L/min)
const BASE_FLOW: Record<CoolantOperation, number> = {
  turning_rough:     15,
  turning_finish:    10,
  milling_rough:     20,
  milling_finish:    12,
  drilling:          8,
  deep_hole_drilling: 25,
  tapping:           6,
  reaming:           8,
  grinding:          30,     // grinding needs high flow for thermal management
  boring:            10,
  broaching:         15,
  thread_milling:    10,
};

// Concentration by operation type (% for water-soluble)
const CONCENTRATION: Record<CoolantOperation, [number, number]> = {
  turning_rough:     [6, 8],
  turning_finish:    [5, 7],
  milling_rough:     [7, 10],
  milling_finish:    [5, 7],
  drilling:          [8, 10],
  deep_hole_drilling: [8, 12],
  tapping:           [10, 15],    // high lubricity needed
  reaming:           [8, 10],
  grinding:          [3, 5],      // lower concentration, high flow
  boring:            [6, 8],
  broaching:         [10, 15],
  thread_milling:    [8, 10],
};

// ─── Engine ────────────────────────────────────────────────────────

/** Coolant Strategy Engine engine/manager.
 */
export class CoolantStrategyEngine {
  calculate(input: CoolantStrategyInput): CoolantStrategyResult {
    const mat = input.workpiece_material;
    const op = input.operation;
    const recs: string[] = [];
    const safety: string[] = [];

    // --- Safety checks first ---
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "magnesium") {
      safety.push("CRITICAL: Magnesium — fire risk. Never use water-based coolant. Use straight oil or dry with spark containment.");
      /** If.
       * @param op - op
       * @returns void
       */
      if (op === "grinding") {
        safety.push("CRITICAL: Magnesium grinding — extreme fire risk. Ensure fire suppression is available. Never let swarf accumulate.");
      }
    }
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "titanium" && input.cutting_speed_m_min && input.cutting_speed_m_min > 80) {
      safety.push("WARNING: Titanium at high speed — fire risk if dry. Ensure adequate flood coolant or through-tool delivery.");
    }

    // --- Primary method selection ---
    let method = this._selectMethod(mat, op, input);
    let fluid = this._selectFluid(mat, op, method);

    // Environmental override: try MQL/dry if safe
    if (input.environmental_priority && !DRY_HAZARD.has(mat)) {
      if (MQL_FRIENDLY.has(mat) && !op.includes("deep_hole")) {
        method = "mql";
        fluid = "mql_ester";
        recs.push("MQL selected for environmental priority — verify chip evacuation is adequate");
      } else if (mat === "cast_iron" && op.startsWith("milling")) {
        method = "dry";
        fluid = "none";
        recs.push("Dry milling of cast iron — standard practice; monitor dust extraction");
      }
    }

    // --- Pressure ---
    let pressure = BASE_PRESSURE[op];
    // Through-spindle/tool increases effective pressure
    /** If.
     * @param method - method
     * @returns void
     */
    if (method === "through_spindle" || method === "through_tool") {
      pressure = Math.max(pressure, 40); // minimum 40 bar for through-tool
      if (op === "deep_hole_drilling") pressure = Math.max(pressure, 70);
    }
    // Machine limit check
    /** If.
     * @param input.machine_max_pressure_bar - input.machine_max_pressure_bar
     * @returns void
     */
    if (input.machine_max_pressure_bar && pressure > input.machine_max_pressure_bar) {
      const limited = input.machine_max_pressure_bar;
      recs.push(`Machine pressure limited to ${limited} bar (recommended: ${pressure} bar) — reduce feed or use through-tool coolant`);
      pressure = limited;
    }
    // MQL/dry: effectively 0 hydraulic pressure
    if (method === "mql") pressure = 6;  // MQL air pressure
    if (method === "dry" || method === "air_blast") pressure = 0;
    if (method === "cryogenic_co2") pressure = 15;
    if (method === "cryogenic_ln2") pressure = 10;

    // --- Flow rate ---
    let flow = BASE_FLOW[op];
    // Scale by cutting speed (higher speed = more heat = more coolant)
    /** If.
     * @param input.cutting_speed_m_min - input.cutting_speed_m_min
     * @returns void
     */
    if (input.cutting_speed_m_min) {
      const speedFactor = Math.max(0.5, Math.min(2.0, input.cutting_speed_m_min / 100));
      flow *= speedFactor;
    }
    // Deep hole drilling: scale by L/D ratio
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "deep_hole_drilling" && input.hole_depth_mm && input.hole_diameter_mm) {
      const ld = input.hole_depth_mm / Math.max(input.hole_diameter_mm, 0.1);
      flow *= Math.max(1.0, ld / 5);
    }
    // MQL: minimal flow
    if (method === "mql") flow = 0.05; // 20-80 ml/hr typical
    if (method === "dry" || method === "air_blast") flow = 0;
    if (method.startsWith("cryogenic")) flow = 2; // cryogenic flow rate

    // --- Concentration ---
    const [concMin, concMax] = CONCENTRATION[op];
    let concentration = (concMin + concMax) / 2;
    // Harder materials need higher concentration (more lubricity)
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "titanium" || mat === "nickel_alloy" || mat === "stainless_steel") {
      concentration = concMax;
    }
    if (method === "mql" || method === "dry" || method.startsWith("cryogenic") || method === "air_blast") {
      concentration = 0;
    }
    /** If.
     * @param fluid - fluid
     * @returns void
     */
    if (fluid === "straight_oil") {
      concentration = 100; // neat oil
    }

    // --- Temperature target ---
    let tempTarget = 22; // room temperature target
    if (op === "grinding") tempTarget = 18; // grinding needs cooler coolant
    if (mat === "titanium") tempTarget = 20; // precision temp control for titanium

    // --- Alternative method ---
    const alt = this._selectAlternative(mat, op, method, input);

    // --- Recommendations ---
    if (method === "flood" && (op === "drilling" || op === "deep_hole_drilling") && input.tool_has_through_coolant) {
      recs.push("Through-tool coolant available — switch to through_tool for better chip evacuation");
    }
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "grinding" && concentration > 5) {
      recs.push("Grinding: keep concentration 3-5% to avoid wheel loading; higher concentration reduces cooling capacity");
    }
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "aluminum" && fluid === "water_soluble_emulsion") {
      recs.push("Aluminum: ensure coolant has anti-staining additives to prevent workpiece discoloration");
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Standard coolant strategy — monitor coolant condition (pH, concentration, contamination) per manufacturer schedule");
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["coolant_strategy", "material_tip"],
      operation_type: op,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recs.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    const src = "CoolantStrategyEngine (Machinery's Handbook/Sandvik/Blaser reference)";

    return {
      primary_method: method,
      fluid_type: fluid,
      concentration_pct: {
        value: Math.round(concentration * 10) / 10,
        unit: "%",
        uncertainty: (concMax - concMin) / 2,
        source: src,
      },
      pressure_bar: {
        value: Math.round(pressure),
        unit: "bar",
        uncertainty: pressure * 0.15, // ±15%
        source: src,
      },
      flow_rate_l_min: {
        value: Math.round(flow * 10) / 10,
        unit: "L/min",
        uncertainty: flow * 0.2, // ±20%
        source: src,
      },
      temperature_target_c: {
        value: tempTarget,
        unit: "°C",
        uncertainty: 3,
        source: src,
      },
      alternative_method: alt,
      safety_notes: safety,
      recommendations: recs,
    };
  }

  private _selectMethod(mat: CoolantMaterial, op: CoolantOperation, input: CoolantStrategyInput): CoolantMethod {
    // Magnesium: straight oil or dry only
    if (mat === "magnesium") return op === "grinding" ? "flood" : "mql"; // straight oil via MQL

    // Deep hole drilling: through-tool mandatory
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "deep_hole_drilling") {
      if (input.tool_has_through_coolant) return "through_tool";
      return "flood"; // fallback, but warn
    }

    // Drilling: through-tool preferred if available
    if (op === "drilling" && input.tool_has_through_coolant) return "through_tool";

    // Cast iron: often dry or MQL for milling
    if (mat === "cast_iron" && (op === "milling_rough" || op === "milling_finish")) return "dry";

    // Hardened steel: typically dry or air blast
    if (mat === "hardened_steel" && (op === "turning_finish" || op === "milling_finish")) {
      return "air_blast";
    }

    // CFRP: dry or air blast (coolant damages fibers in some cases)
    if (mat === "cfrp") return "air_blast";

    // Titanium/nickel: high-pressure through-spindle ideal
    if ((mat === "titanium" || mat === "nickel_alloy") && input.tool_has_through_coolant) {
      return "through_spindle";
    }

    // Grinding: always flood
    if (op === "grinding") return "flood";

    // Default: flood
    return "flood";
  }

  private _selectFluid(mat: CoolantMaterial, op: CoolantOperation, method: CoolantMethod): CoolantFluid {
    if (method === "dry") return "none";
    if (method === "air_blast") return "compressed_air";
    if (method === "cryogenic_co2") return "co2";
    if (method === "cryogenic_ln2") return "liquid_nitrogen";
    if (method === "mql") return "mql_ester";

    // Magnesium: never water-based
    if (mat === "magnesium") return "straight_oil";

    // Grinding: full synthetic preferred (cleaner, better cooling)
    if (op === "grinding") return "full_synthetic";

    // Tapping/broaching: higher lubricity needed
    if (op === "tapping" || op === "broaching") return "semi_synthetic";

    // High-speed aluminum: semi-synthetic for BUE prevention
    if (mat === "aluminum") return "semi_synthetic";

    // General: water-soluble emulsion (most common, best value)
    return "water_soluble_emulsion";
  }

  private _selectAlternative(mat: CoolantMaterial, op: CoolantOperation, primary: CoolantMethod, input: CoolantStrategyInput): CoolantMethod {
    // Suggest MQL as alternative to flood for suitable materials
    if (primary === "flood" && MQL_FRIENDLY.has(mat) && !op.includes("deep_hole")) return "mql";

    // Suggest through-tool as alternative if not already selected
    if (primary === "flood" && (op === "drilling" || op === "tapping") && !input.tool_has_through_coolant) return "through_tool";

    // Suggest cryogenic as alternative for difficult materials
    if ((mat === "titanium" || mat === "nickel_alloy") && primary !== "cryogenic_co2") return "cryogenic_co2";

    // Suggest flood as fallback for through-tool
    if (primary === "through_tool" || primary === "through_spindle") return "flood";

    // Suggest air_blast as alternative to dry
    if (primary === "dry") return "air_blast";
    if (primary === "air_blast") return "mql";

    return "flood";
  }
}

/** Coolant Strategy Engine constant.
 */
export const coolantStrategyEngine = new CoolantStrategyEngine();
