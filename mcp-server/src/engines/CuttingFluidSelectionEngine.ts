/**
 * CuttingFluidSelectionEngine — Fluid Type Selection
 *
 * Recommends cutting fluid type by operation and material:
 * - Flood coolant concentration and type
 * - MQL (minimum quantity lubrication) parameters
 * - Dry machining suitability assessment
 * - Cryogenic cooling recommendation
 * - Fluid life estimation and maintenance
 *
 * Key physics: Cutting fluid serves three functions:
 * cooling (removes heat), lubrication (reduces friction),
 * and chip evacuation. The relative importance depends on
 * operation: drilling needs evacuation, finishing needs
 * lubrication, heavy roughing needs cooling. MQL provides
 * lubrication with minimal fluid (5-50 mL/hr).
 *
 * Reference: Machinery's Handbook Ch.26 (Cutting Fluids),
 *            Blaser Swisslube application guide,
 *            Fuchs industrial metalworking fluids manual
 *
 * Actions: fluid_select
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type FluidType = "soluble_oil" | "semi_synthetic"
  | "full_synthetic" | "neat_oil" | "mql" | "dry"
  | "cryogenic";

export type Operation = "turning" | "milling" | "drilling"
  | "tapping" | "grinding" | "reaming" | "broaching";

export interface FluidSelectInput {
  operation: Operation;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  cutting_speed_m_per_min?: number;
  is_finishing?: boolean;
  is_deep_hole?: boolean;
  environmental_priority?: boolean;
}

export interface FluidSelectResult {
  recommended_type: FluidType;
  concentration: AtomicValue;
  flow_rate: AtomicValue;
  pressure: AtomicValue;
  tool_life_factor: AtomicValue;
  cooling_effectiveness: AtomicValue;
  lubrication_effectiveness: AtomicValue;
  fluid_life_months: AtomicValue;
  alternatives: FluidType[];
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Primary cooling need by operation */
const OP_NEEDS: Record<string, {
  cooling: number; lubrication: number; evacuation: number;
}> = {
  turning: { cooling: 0.7, lubrication: 0.5, evacuation: 0.3 },
  milling: { cooling: 0.6, lubrication: 0.6, evacuation: 0.4 },
  drilling: { cooling: 0.5, lubrication: 0.6, evacuation: 0.9 },
  tapping: { cooling: 0.3, lubrication: 0.9, evacuation: 0.7 },
  grinding: { cooling: 0.9, lubrication: 0.3, evacuation: 0.5 },
  reaming: { cooling: 0.4, lubrication: 0.8, evacuation: 0.5 },
  broaching: { cooling: 0.4, lubrication: 0.9, evacuation: 0.6 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class CuttingFluidSelectionEngine {
  /**
   * Select optimal cutting fluid for operation/material.
   */
  calculate(input: FluidSelectInput): FluidSelectResult {
    const warnings: string[] = [];
    const op = input.operation;
    const iso = input.material_iso_group ?? "P";
    const vc = input.cutting_speed_m_per_min ?? 100;
    const finishing = input.is_finishing ?? false;
    const deepHole = input.is_deep_hole ?? false;
    const envPriority = input.environmental_priority ?? false;

    const needs = OP_NEEDS[op] ?? OP_NEEDS.milling;

    // Select fluid type based on needs and material
    let fluidType: FluidType;
    const alternatives: FluidType[] = [];

    if (envPriority) {
      fluidType = "mql";
      alternatives.push("dry", "full_synthetic");
    } else if (op === "grinding") {
      fluidType = "full_synthetic";
      alternatives.push("semi_synthetic");
    } else if (op === "tapping" || op === "broaching"
      || op === "reaming") {
      fluidType = "neat_oil";
      alternatives.push("semi_synthetic");
    } else if (iso === "S" || iso === "H") {
      fluidType = vc > 80 ? "cryogenic" : "soluble_oil";
      alternatives.push("semi_synthetic");
    } else if (iso === "K" && !deepHole) {
      fluidType = "dry";
      alternatives.push("mql", "full_synthetic");
    } else if (iso === "N" && !deepHole) {
      fluidType = "mql";
      alternatives.push("full_synthetic", "dry");
    } else if (deepHole) {
      fluidType = "soluble_oil";
      alternatives.push("semi_synthetic");
    } else if (finishing) {
      fluidType = "semi_synthetic";
      alternatives.push("full_synthetic");
    } else {
      fluidType = "soluble_oil";
      alternatives.push("semi_synthetic");
    }

    // Concentration (%)
    let concentration = 0;
    if (fluidType === "soluble_oil") concentration = 8;
    else if (fluidType === "semi_synthetic") concentration = 6;
    else if (fluidType === "full_synthetic") concentration = 5;
    else if (fluidType === "neat_oil") concentration = 100;
    // Increase for difficult materials
    if (iso === "S" || iso === "H") concentration *= 1.2;

    // Flow rate (L/min)
    let flowRate = 10; // default flood
    if (fluidType === "mql") flowRate = 0.001; // ~50mL/hr
    else if (fluidType === "dry") flowRate = 0;
    else if (fluidType === "cryogenic") flowRate = 0.5;
    else if (deepHole) flowRate = 20;
    else if (op === "grinding") flowRate = 15;

    // Pressure (bar)
    let pressure = 5;
    if (deepHole) pressure = 40;
    else if (fluidType === "cryogenic") pressure = 10;
    else if (fluidType === "mql") pressure = 6;

    // Tool life improvement factor vs dry
    const toolLifeFactor = fluidType === "dry" ? 1.0
      : fluidType === "mql" ? 1.3
      : fluidType === "cryogenic" ? 1.8
      : fluidType === "neat_oil" ? 1.5
      : 1.4; // water-based

    // Effectiveness scores (0-100)
    const coolingEff = fluidType === "dry" ? 0
      : fluidType === "mql" ? 20
      : fluidType === "cryogenic" ? 95
      : fluidType === "neat_oil" ? 40
      : 80;

    const lubEff = fluidType === "dry" ? 0
      : fluidType === "mql" ? 70
      : fluidType === "cryogenic" ? 10
      : fluidType === "neat_oil" ? 95
      : 60;

    // Fluid life
    const fluidLife = fluidType === "neat_oil" ? 12
      : fluidType === "full_synthetic" ? 6
      : fluidType === "semi_synthetic" ? 4
      : fluidType === "soluble_oil" ? 3
      : 0; // mql/dry/cryo: N/A

    // Warnings
    if (fluidType === "dry" && needs.cooling > 0.7) {
      warnings.push(
        "Dry machining with high cooling need — " +
        "risk of thermal damage"
      );
    }
    if (iso === "K" && fluidType !== "dry") {
      warnings.push(
        "Cast iron: consider dry machining — " +
        "coolant can cause thermal shock"
      );
    }
    if (deepHole && fluidType === "mql") {
      warnings.push(
        "MQL insufficient for deep hole — " +
        "switch to flood with high pressure"
      );
    }
    if (fluidType === "cryogenic") {
      warnings.push(
        "Cryogenic cooling requires specialized equipment"
      );
    }

    return {
      recommended_type: fluidType,
      concentration: av(
        Math.round(concentration), "%", 0.1,
        fluidType === "neat_oil"
          ? "Undiluted"
          : "Mix ratio recommendation"
      ),
      flow_rate: av(r2(flowRate), "L/min", 0.15,
        fluidType === "mql"
          ? "~50 mL/hr MQL rate"
          : "Flood flow rate"),
      pressure: av(pressure, "bar", 0.1,
        deepHole
          ? "High-pressure through-tool"
          : "Standard delivery"),
      tool_life_factor: av(r2(toolLifeFactor), "ratio", 0.15,
        "Improvement vs dry machining"),
      cooling_effectiveness: av(coolingEff, "score", 0.1,
        "Heat removal capability (0-100)"),
      lubrication_effectiveness: av(lubEff, "score", 0.1,
        "Friction reduction capability (0-100)"),
      fluid_life_months: av(fluidLife, "months", 0.2,
        fluidLife > 0
          ? "Expected sump life"
          : "N/A for this type"),
      alternatives,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

export const cuttingFluidSelectionEngine =
  new CuttingFluidSelectionEngine();
