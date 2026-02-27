/**
 * Coolant Flow Requirements Model
 *
 * Calculates required coolant flow rate and pressure for machining operations:
 *   Q_req = base_flow x D x material_factor x speed_factor
 *
 * Includes chip evacuation analysis for drilling operations with
 * L/D-based strategy selection (standard/peck/high-pressure/gundrilling).
 *
 * SAFETY-CRITICAL: Inadequate coolant causes thermal damage, tool failure,
 * fire risk (especially with titanium/magnesium), and poor chip evacuation.
 *
 * References:
 * - Sandvik Coromant "Metal Cutting Technology" (2020)
 * - Klocke, F. (2011). "Manufacturing Processes" Ch.4
 * - ANSI/ASME B94.19 Coolant hole specifications
 *
 * @module algorithms/CoolantFlowModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export type CoolantOperation =
  | "milling" | "milling_hsm" | "drilling" | "drilling_deep"
  | "drilling_gun" | "tapping" | "reaming" | "boring"
  | "turning" | "grinding";

export type MaterialClass =
  | "steel" | "stainless" | "aluminum" | "titanium"
  | "superalloy" | "cast_iron" | "copper" | "plastic";

export interface CoolantFlowInput {
  /** Machining operation type. */
  operation: CoolantOperation;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Material class. */
  material_class: MaterialClass;
  /** System available flow rate [L/min]. */
  system_flow_rate: number;
  /** System available pressure [bar]. */
  system_pressure: number;
  /** Through-spindle coolant delivery. Default false. */
  coolant_through?: boolean;
  /** Hole depth [mm] (for drilling operations). */
  hole_depth?: number;
}

export interface CoolantFlowOutput extends WithWarnings {
  /** Required flow rate [L/min]. */
  required_flow: number;
  /** Required minimum pressure [bar]. */
  required_pressure: number;
  /** Whether system flow is adequate. */
  flow_adequate: boolean;
  /** Whether system pressure is adequate. */
  pressure_adequate: boolean;
  /** Flow margin (available - required) [L/min]. */
  flow_margin: number;
  /** Pressure margin [bar]. */
  pressure_margin: number;
  /** System utilization [%]. */
  utilization_pct: number;
  /** L/D ratio (drilling only). */
  ld_ratio: number | null;
  /** Chip evacuation strategy (drilling only). */
  evacuation_strategy: string | null;
  /** Peck depth recommendation [mm] (deep drilling). */
  peck_depth: number | null;
  /** Dwell time recommendation [s] (deep drilling). */
  dwell_time: number | null;
  /** Recommendations. */
  recommendations: string[];
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

/** Base flow requirement [L/min per mm diameter] by operation. */
const FLOW_REQUIREMENTS: Record<CoolantOperation, number> = {
  milling: 0.5, milling_hsm: 0.3,
  drilling: 0.8, drilling_deep: 1.5, drilling_gun: 3.0,
  tapping: 1.0, reaming: 0.6,
  boring: 0.5, turning: 0.4, grinding: 2.0,
};

/** Base pressure requirement [bar] by operation. */
const PRESSURE_REQUIREMENTS: Record<CoolantOperation, number> = {
  milling: 10, milling_hsm: 20,
  drilling: 20, drilling_deep: 40, drilling_gun: 100,
  tapping: 10, reaming: 10,
  boring: 15, turning: 10, grinding: 5,
};

/** Material factor for coolant demand. */
const MATERIAL_FACTORS: Record<MaterialClass, number> = {
  steel: 1.0, stainless: 1.3, aluminum: 0.7,
  titanium: 1.5, superalloy: 1.8, cast_iron: 0.6,
  copper: 0.8, plastic: 0.3,
};

/** L/D-based drilling strategy table. */
const LD_STRATEGIES: { maxLD: number; strategy: string; pressure: number; flowMult: number; peckMult: number; dwell: number }[] = [
  { maxLD: 3,  strategy: "standard",       pressure: 10,  flowMult: 0.5, peckMult: 0,   dwell: 0 },
  { maxLD: 5,  strategy: "standard",       pressure: 20,  flowMult: 0.8, peckMult: 0,   dwell: 0 },
  { maxLD: 8,  strategy: "peck_cycle",     pressure: 40,  flowMult: 1.0, peckMult: 1.5, dwell: 0.5 },
  { maxLD: 12, strategy: "high_pressure",  pressure: 70,  flowMult: 1.5, peckMult: 1.0, dwell: 0.8 },
  { maxLD: 20, strategy: "high_pressure",  pressure: 100, flowMult: 2.0, peckMult: 1.0, dwell: 1.0 },
  { maxLD: 999, strategy: "gundrilling",   pressure: 150, flowMult: 3.0, peckMult: 0,   dwell: 0 },
];

// ── Algorithm Implementation ────────────────────────────────────────

export class CoolantFlowModel implements Algorithm<CoolantFlowInput, CoolantFlowOutput> {

  validate(input: CoolantFlowInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    const validOps = Object.keys(FLOW_REQUIREMENTS);
    if (!input.operation || !validOps.includes(input.operation)) {
      issues.push({ field: "operation", message: `Operation must be one of: ${validOps.join(", ")}`, severity: "error" });
    }
    if (!input.tool_diameter || input.tool_diameter <= 0 || input.tool_diameter > 500) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be 0-500 mm, got ${input.tool_diameter}`, severity: "error" });
    }
    if (!input.cutting_speed || input.cutting_speed <= 0) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be > 0, got ${input.cutting_speed}`, severity: "error" });
    }
    const validMats = Object.keys(MATERIAL_FACTORS);
    if (!input.material_class || !validMats.includes(input.material_class)) {
      issues.push({ field: "material_class", message: `Material class must be one of: ${validMats.join(", ")}`, severity: "error" });
    }
    if (input.system_flow_rate === undefined || input.system_flow_rate < 0) {
      issues.push({ field: "system_flow_rate", message: `System flow rate must be >= 0, got ${input.system_flow_rate}`, severity: "error" });
    }
    if (input.system_pressure === undefined || input.system_pressure < 0) {
      issues.push({ field: "system_pressure", message: `System pressure must be >= 0, got ${input.system_pressure}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: CoolantFlowInput): CoolantFlowOutput {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const {
      operation, tool_diameter, cutting_speed, material_class,
      system_flow_rate, system_pressure,
      coolant_through = false, hole_depth,
    } = input;

    const materialFactor = MATERIAL_FACTORS[material_class] || 1.0;
    const baseFlow = FLOW_REQUIREMENTS[operation] || 0.5;
    const basePressure = PRESSURE_REQUIREMENTS[operation] || 10;

    // Required flow = base x diameter x material_factor
    let required_flow = baseFlow * tool_diameter * materialFactor;

    // Speed adjustment
    if (cutting_speed > 300) {
      required_flow *= 1.4;
    } else if (cutting_speed > 200) {
      required_flow *= 1.2;
    }

    // Through-spindle bonus: more effective, less volume needed
    if (coolant_through) {
      required_flow *= 0.7; // TSC is more efficient
    }

    let required_pressure = basePressure * materialFactor;

    // Drilling L/D analysis
    let ld_ratio: number | null = null;
    let evacuation_strategy: string | null = null;
    let peck_depth: number | null = null;
    let dwell_time: number | null = null;

    if (hole_depth && operation.startsWith("drilling")) {
      ld_ratio = hole_depth / tool_diameter;

      // Find strategy from L/D table
      const strategy = LD_STRATEGIES.find(s => ld_ratio! <= s.maxLD) || LD_STRATEGIES[LD_STRATEGIES.length - 1];
      evacuation_strategy = strategy.strategy;

      // Override pressure/flow from L/D table if higher
      const ldPressure = strategy.pressure * materialFactor;
      const ldFlow = strategy.flowMult * tool_diameter * materialFactor;
      required_pressure = Math.max(required_pressure, ldPressure);
      required_flow = Math.max(required_flow, ldFlow);

      if (strategy.peckMult > 0) {
        peck_depth = strategy.peckMult * tool_diameter;
      }
      if (strategy.dwell > 0) {
        dwell_time = strategy.dwell;
      }

      if (ld_ratio > 3 && !coolant_through) {
        recommendations.push(`L/D = ${ld_ratio.toFixed(1)}: Through-spindle coolant strongly recommended.`);
      }
      if (ld_ratio > 20) {
        warnings.push(`EXTREME_LD: L/D = ${ld_ratio.toFixed(1)}. Gundrilling required. Standard drilling not feasible.`);
      }
    }

    // Adequacy checks
    const flow_adequate = system_flow_rate >= required_flow;
    const pressure_adequate = system_pressure >= required_pressure;
    const flow_margin = system_flow_rate - required_flow;
    const pressure_margin = system_pressure - required_pressure;
    const utilization_pct = system_flow_rate > 0 ? (required_flow / system_flow_rate) * 100 : 999;

    // Warnings
    if (!flow_adequate) {
      warnings.push(`INSUFFICIENT_FLOW: Need ${required_flow.toFixed(1)} L/min, have ${system_flow_rate.toFixed(1)}.`);
      recommendations.push("Increase coolant pump capacity or reduce cutting parameters.");
    }
    if (!pressure_adequate) {
      warnings.push(`INSUFFICIENT_PRESSURE: Need ${required_pressure.toFixed(0)} bar, have ${system_pressure.toFixed(0)}.`);
      recommendations.push("Upgrade to high-pressure coolant system or use peck drilling.");
    }

    // Material-specific warnings
    if (material_class === "titanium" || material_class === "superalloy") {
      recommendations.push(`${material_class}: Maintain continuous coolant flow. Dry cutting risks thermal damage and fire.`);
    }
    if (material_class === "aluminum" && cutting_speed > 500) {
      recommendations.push("HSM aluminum: Consider MQL (Minimum Quantity Lubrication) over flood coolant.");
    }

    return {
      required_flow,
      required_pressure,
      flow_adequate,
      pressure_adequate,
      flow_margin,
      pressure_margin,
      utilization_pct,
      ld_ratio,
      evacuation_strategy,
      peck_depth,
      dwell_time,
      recommendations,
      warnings,
      calculation_method: "Coolant flow (Q = base x D x mat_factor) + L/D chip evacuation",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "coolant-flow",
      name: "Coolant Flow Requirements Model",
      description: "Calculates required coolant flow and pressure with L/D-based chip evacuation",
      formula: "Q_req = base_flow x D x material_factor x speed_factor",
      reference: "Sandvik Metal Cutting Technology (2020); Klocke (2011) Ch.4",
      safety_class: "critical",
      domain: "thermal",
      inputs: {
        operation: "Operation type",
        tool_diameter: "Tool diameter [mm]",
        cutting_speed: "Cutting speed [m/min]",
        material_class: "Material class",
        system_flow_rate: "Available flow [L/min]",
        system_pressure: "Available pressure [bar]",
      },
      outputs: {
        required_flow: "Required flow [L/min]",
        required_pressure: "Required pressure [bar]",
        flow_adequate: "Flow adequacy check",
        evacuation_strategy: "Chip evacuation strategy",
      },
    };
  }
}
