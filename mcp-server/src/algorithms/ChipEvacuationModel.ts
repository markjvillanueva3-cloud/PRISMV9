/**
 * Chip Evacuation Analysis Model
 *
 * Determines optimal chip evacuation strategy based on L/D ratio
 * for drilling operations, with pressure and flow requirements:
 *   Strategy = f(L/D, material, coolant_type)
 *
 * SAFETY-CRITICAL: Poor chip evacuation causes drill seizure,
 * tool breakage, workpiece damage, and potential fire (with Ti/Mg).
 *
 * References:
 * - Sandvik Coromant "Drilling Application Guide" (2021)
 * - Klocke, F. (2011). "Manufacturing Processes", Ch.5
 * - ANSI/ASME B94.11M Deep hole drilling guidelines
 *
 * @module algorithms/ChipEvacuationModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export type EvacMaterialType =
  | "steel" | "stainless" | "aluminum" | "titanium"
  | "superalloy" | "cast_iron" | "copper";

export interface ChipEvacuationInput {
  /** Tool/drill diameter [mm]. */
  tool_diameter: number;
  /** Hole depth [mm]. */
  hole_depth: number;
  /** Material type. */
  material_type: EvacMaterialType;
  /** Available coolant pressure [bar]. */
  system_pressure: number;
  /** Available coolant flow [L/min]. */
  system_flow: number;
  /** Through-tool coolant available. Default false. */
  coolant_through?: boolean;
  /** Feed per revolution [mm/rev]. Default 0.2. */
  feed_per_rev?: number;
  /** Cutting speed [m/min]. Default 100. */
  cutting_speed?: number;
}

export interface ChipEvacuationOutput extends WithWarnings {
  /** Length-to-diameter ratio. */
  ld_ratio: number;
  /** Recommended evacuation strategy. */
  strategy: "standard" | "peck_cycle" | "high_pressure" | "gundrilling";
  /** Required coolant pressure [bar]. */
  required_pressure: number;
  /** Required coolant flow [L/min]. */
  required_flow: number;
  /** Pressure adequate for strategy. */
  pressure_adequate: boolean;
  /** Flow adequate for strategy. */
  flow_adequate: boolean;
  /** Recommended peck depth [mm] (if peck strategy). */
  peck_depth: number | null;
  /** Recommended dwell at bottom [s] (if peck strategy). */
  dwell_time: number | null;
  /** Peck retract height [mm]. */
  retract_height: number | null;
  /** Estimated chip volume per peck [mm^3]. */
  chip_volume_per_peck: number | null;
  /** Maximum recommended drilling depth without retract [mm]. */
  max_depth_no_retract: number;
  /** Recommendations. */
  recommendations: string[];
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

/** Material factor for pressure/flow requirements. */
const MATERIAL_FACTORS: Record<EvacMaterialType, number> = {
  steel: 1.0, stainless: 1.3, aluminum: 0.7,
  titanium: 1.5, superalloy: 1.8, cast_iron: 0.6, copper: 0.8,
};

/** Material peck depth multiplier (fraction of D). */
const PECK_DEPTH_MULT: Record<EvacMaterialType, number> = {
  steel: 1.5, stainless: 1.0, aluminum: 2.5,
  titanium: 0.8, superalloy: 0.5, cast_iron: 2.0, copper: 2.0,
};

/** L/D strategy table. */
const LD_TABLE: { maxLD: number; strategy: ChipEvacuationOutput["strategy"]; basePressure: number; baseFlowPerMm: number; peckMult: number; dwell: number }[] = [
  { maxLD: 3,   strategy: "standard",       basePressure: 10,  baseFlowPerMm: 0.5, peckMult: 0,   dwell: 0 },
  { maxLD: 5,   strategy: "standard",       basePressure: 20,  baseFlowPerMm: 0.8, peckMult: 0,   dwell: 0 },
  { maxLD: 8,   strategy: "peck_cycle",     basePressure: 40,  baseFlowPerMm: 1.0, peckMult: 1.5, dwell: 0.5 },
  { maxLD: 12,  strategy: "high_pressure",  basePressure: 70,  baseFlowPerMm: 1.5, peckMult: 1.0, dwell: 0.8 },
  { maxLD: 20,  strategy: "high_pressure",  basePressure: 100, baseFlowPerMm: 2.0, peckMult: 1.0, dwell: 1.0 },
  { maxLD: 999, strategy: "gundrilling",    basePressure: 150, baseFlowPerMm: 3.0, peckMult: 0,   dwell: 0 },
];

// ── Algorithm Implementation ────────────────────────────────────────

export class ChipEvacuationModel implements Algorithm<ChipEvacuationInput, ChipEvacuationOutput> {

  validate(input: ChipEvacuationInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.tool_diameter || input.tool_diameter <= 0 || input.tool_diameter > 200) {
      issues.push({ field: "tool_diameter", message: `Drill diameter must be 0-200 mm, got ${input.tool_diameter}`, severity: "error" });
    }
    if (!input.hole_depth || input.hole_depth <= 0 || input.hole_depth > 5000) {
      issues.push({ field: "hole_depth", message: `Hole depth must be 0-5000 mm, got ${input.hole_depth}`, severity: "error" });
    }
    const validMats = Object.keys(MATERIAL_FACTORS);
    if (!input.material_type || !validMats.includes(input.material_type)) {
      issues.push({ field: "material_type", message: `Material must be one of: ${validMats.join(", ")}`, severity: "error" });
    }
    if (input.system_pressure === undefined || input.system_pressure < 0) {
      issues.push({ field: "system_pressure", message: `System pressure must be >= 0, got ${input.system_pressure}`, severity: "error" });
    }
    if (input.system_flow === undefined || input.system_flow < 0) {
      issues.push({ field: "system_flow", message: `System flow must be >= 0, got ${input.system_flow}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ChipEvacuationInput): ChipEvacuationOutput {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const {
      tool_diameter, hole_depth, material_type,
      system_pressure, system_flow,
      coolant_through = false,
      feed_per_rev = 0.2,
      cutting_speed = 100,
    } = input;

    const matFactor = MATERIAL_FACTORS[material_type] || 1.0;
    const ld_ratio = hole_depth / tool_diameter;

    // Find strategy from L/D table
    const row = LD_TABLE.find(r => ld_ratio <= r.maxLD) || LD_TABLE[LD_TABLE.length - 1];
    const strategy = row.strategy;

    // Required pressure and flow with material factor
    const required_pressure = row.basePressure * matFactor;
    const required_flow = row.baseFlowPerMm * tool_diameter * matFactor;

    // Through-tool coolant reduces external flow need
    const effective_flow = coolant_through ? system_flow : system_flow * 0.6;

    const pressure_adequate = system_pressure >= required_pressure;
    const flow_adequate = effective_flow >= required_flow;

    // Peck parameters
    let peck_depth: number | null = null;
    let dwell_time: number | null = null;
    let retract_height: number | null = null;
    let chip_volume_per_peck: number | null = null;

    if (row.peckMult > 0) {
      const matPeckMult = PECK_DEPTH_MULT[material_type] || 1.5;
      peck_depth = tool_diameter * Math.min(row.peckMult, matPeckMult);
      dwell_time = row.dwell;
      retract_height = Math.min(tool_diameter * 0.5, 3); // 0.5D or 3mm max

      // Chip volume per peck: pi/4 x D^2 x peck_depth (approximate)
      chip_volume_per_peck = (Math.PI / 4) * tool_diameter * tool_diameter * peck_depth;
    }

    // Max depth without retract (based on flute capacity ~3D for standard)
    const max_depth_no_retract = tool_diameter * 3;

    // Warnings and recommendations
    if (!pressure_adequate) {
      warnings.push(`INSUFFICIENT_PRESSURE: Need ${required_pressure.toFixed(0)} bar, have ${system_pressure.toFixed(0)}.`);
      recommendations.push("Upgrade coolant system or use peck drilling with full retract.");
    }
    if (!flow_adequate) {
      warnings.push(`INSUFFICIENT_FLOW: Need ${required_flow.toFixed(1)} L/min, have ${effective_flow.toFixed(1)}.`);
    }

    if (ld_ratio > 3 && !coolant_through) {
      recommendations.push(`L/D = ${ld_ratio.toFixed(1)}: Through-spindle coolant strongly recommended.`);
    }
    if (ld_ratio > 20) {
      warnings.push(`EXTREME_LD: L/D = ${ld_ratio.toFixed(1)}. Specialized gundrilling equipment required.`);
      recommendations.push("Use single-flute gundrill with high-pressure internal coolant.");
    }

    if (material_type === "titanium" || material_type === "superalloy") {
      recommendations.push(`${material_type}: Reduce peck depth to ${(tool_diameter * 0.5).toFixed(1)} mm. Monitor torque for chip pack.`);
      if (ld_ratio > 5) {
        warnings.push("FIRE_RISK: Ti/superalloy deep drilling. Ensure continuous coolant flow. Never run dry.");
      }
    }

    if (material_type === "aluminum" && ld_ratio > 5) {
      recommendations.push("Aluminum: Use polished-flute drill. Chip welding risk at depth.");
    }

    if (strategy === "peck_cycle") {
      const numPecks = peck_depth ? Math.ceil(hole_depth / peck_depth) : 0;
      recommendations.push(`Peck drilling: ~${numPecks} pecks at ${peck_depth?.toFixed(1)} mm depth each.`);
    }

    return {
      ld_ratio,
      strategy,
      required_pressure,
      required_flow,
      pressure_adequate,
      flow_adequate,
      peck_depth,
      dwell_time,
      retract_height,
      chip_volume_per_peck,
      max_depth_no_retract,
      recommendations,
      warnings,
      calculation_method: "L/D ratio strategy selection + material-adjusted pressure/flow",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "chip-evacuation",
      name: "Chip Evacuation Analysis Model",
      description: "L/D-based chip evacuation strategy with pressure/flow requirements for drilling",
      formula: "Strategy = f(L/D); P_req = base_pressure x mat_factor; Q_req = base_flow x D x mat_factor",
      reference: "Sandvik Drilling Application Guide (2021); Klocke (2011) Ch.5",
      safety_class: "critical",
      domain: "thermal",
      inputs: {
        tool_diameter: "Drill diameter [mm]",
        hole_depth: "Hole depth [mm]",
        material_type: "Workpiece material type",
        system_pressure: "Available pressure [bar]",
        system_flow: "Available flow [L/min]",
      },
      outputs: {
        strategy: "Evacuation strategy (standard/peck/HP/gun)",
        required_pressure: "Required pressure [bar]",
        required_flow: "Required flow [L/min]",
        peck_depth: "Recommended peck depth [mm]",
      },
    };
  }
}
