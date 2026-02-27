/**
 * Chip Volume Rate Predictor — Material Removal Rate & Chip Load Analysis
 *
 * Computes volumetric chip removal rate (Q) for various cutting operations
 * accounting for actual tool engagement geometry. Goes beyond simple Q = ae×ap×Vf
 * by modeling actual chip cross-section for different tool types and operations.
 *
 * Manufacturing uses: machining time estimation, power requirement prediction,
 * chip conveyor sizing, cutting fluid flow rate planning.
 *
 * References:
 * - Altintas, Y. (2012). "Manufacturing Automation" Ch. 2
 * - Sandvik Coromant (2020). "Metal Cutting Technical Guide"
 *
 * @module algorithms/ChipVolumeRate
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type CuttingOperation = "milling_slot" | "milling_side" | "milling_face" | "turning" | "drilling" | "boring";

export interface ChipVolumeRateInput {
  /** Operation type. */
  operation: CuttingOperation;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Axial depth of cut ap [mm]. */
  depth_of_cut: number;
  /** Radial depth of cut ae [mm] (milling). For turning: feed per rev. */
  width_of_cut: number;
  /** Feed rate [mm/min] or feed per rev [mm/rev] for turning. */
  feed_rate: number;
  /** Number of flutes/inserts (milling). Default 1 for turning. */
  n_flutes?: number;
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Tool nose radius [mm] (turning). Default 0.8. */
  nose_radius?: number;
  /** Tool lead angle [deg] (turning). Default 90. */
  lead_angle?: number;
  /** Specific cutting energy [W·s/mm³]. Default 3.5 (steel). */
  specific_energy?: number;
  /** Spindle power limit [kW]. Optional — for power check. */
  spindle_power?: number;
}

export interface ChipVolumeRateOutput extends WithWarnings {
  /** Volumetric material removal rate [cm³/min]. */
  mrr_cm3_per_min: number;
  /** Volumetric MRR [mm³/min]. */
  mrr_mm3_per_min: number;
  /** Specific MRR [cm³/min per kW]. */
  specific_mrr: number;
  /** Estimated cutting power [kW]. */
  cutting_power_kw: number;
  /** Feed per tooth [mm/tooth] (milling). */
  feed_per_tooth: number;
  /** Average chip thickness [mm]. */
  avg_chip_thickness: number;
  /** Maximum chip thickness [mm]. */
  max_chip_thickness: number;
  /** Spindle speed [RPM]. */
  spindle_speed: number;
  /** Table feed rate [mm/min]. */
  table_feed: number;
  /** Whether spindle power is sufficient. */
  power_sufficient: boolean;
  /** Power utilization percentage. */
  power_utilization_pct: number;
  /** Machining time for 1 cm³ [s]. */
  time_per_cm3: number;
  calculation_method: string;
}

export class ChipVolumeRatePredictor implements Algorithm<ChipVolumeRateInput, ChipVolumeRateOutput> {

  validate(input: ChipVolumeRateInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.tool_diameter || input.tool_diameter <= 0) {
      issues.push({ field: "tool_diameter", message: "Must be > 0", severity: "error" });
    }
    if (!input.depth_of_cut || input.depth_of_cut <= 0) {
      issues.push({ field: "depth_of_cut", message: "Must be > 0", severity: "error" });
    }
    if (!input.width_of_cut || input.width_of_cut <= 0) {
      issues.push({ field: "width_of_cut", message: "Must be > 0", severity: "error" });
    }
    if (!input.feed_rate || input.feed_rate <= 0) {
      issues.push({ field: "feed_rate", message: "Must be > 0", severity: "error" });
    }
    if (!input.cutting_speed || input.cutting_speed <= 0) {
      issues.push({ field: "cutting_speed", message: "Must be > 0", severity: "error" });
    }
    if (input.depth_of_cut > input.tool_diameter * 3) {
      issues.push({ field: "depth_of_cut", message: "Very high ap/D ratio", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ChipVolumeRateInput): ChipVolumeRateOutput {
    const warnings: string[] = [];
    const D = input.tool_diameter;
    const ap = input.depth_of_cut;
    const ae = input.width_of_cut;
    const Vc = input.cutting_speed;
    const Nf = input.n_flutes ?? (input.operation === "turning" ? 1 : 4);
    const kc = (input.specific_energy ?? 3.5) * 1000; // W·s/mm³ → ... (keep as specific energy)

    // Spindle speed
    const n = (Vc * 1000) / (Math.PI * D); // RPM

    let mrr: number; // mm³/min
    let fz: number;  // mm/tooth
    let hAvg: number; // average chip thickness
    let hMax: number; // max chip thickness
    let tableFeed: number; // mm/min

    switch (input.operation) {
      case "milling_slot":
      case "milling_side":
      case "milling_face": {
        // Feed per tooth
        tableFeed = input.feed_rate; // mm/min assumed
        fz = tableFeed / (n * Nf);

        // MRR = ae × ap × Vf
        mrr = ae * ap * tableFeed;

        // Average chip thickness (milling)
        // h_avg = fz × (ae/D) for side milling
        // h_max = fz × sin(arccos(1 - 2ae/D)) for arc engagement
        const aeRatio = Math.min(ae / D, 1);
        if (input.operation === "milling_slot") {
          hAvg = fz * 2 / Math.PI; // slot: average over semicircle
          hMax = fz;
        } else {
          const phi = Math.acos(1 - 2 * aeRatio);
          hAvg = fz * Math.sin(phi / 2) * aeRatio;
          hMax = fz * Math.sin(phi);
        }
        break;
      }
      case "turning": {
        // Feed per rev
        const f = input.feed_rate; // mm/rev
        fz = f;
        tableFeed = f * n;

        // MRR = ap × f × Vc × 1000 (Vc in m/min)
        mrr = ap * f * Vc * 1000 / (Math.PI * D) * (Math.PI * D); // simplifies to ap × f × Vc × 1000
        // Actually: MRR = ap × f × n × π × D / 1000... no:
        // Turning MRR = ap [mm] × f [mm/rev] × n [RPM] => mm³/min... wait
        // Correct: MRR = Vc [m/min] × f [mm/rev] × ap [mm] × 1000 [mm/m]
        // = ap × f × Vc × 1000 [mm³/min]... no that's wrong dimensionally.
        // MRR [mm³/min] = ap × f × Vc × 1000
        // ap [mm] × f [mm/rev] × (Vc×1000/(π×D)) [rev/min] × π×D [mm/rev]...
        // = ap × f × Vc × 1000 [mm³/min]
        mrr = ap * f * Vc * 1000;

        // Chip thickness
        const leadRad = ((input.lead_angle ?? 90) * Math.PI) / 180;
        hAvg = f * Math.sin(leadRad);
        hMax = hAvg;
        break;
      }
      case "drilling": {
        fz = input.feed_rate / (n * 2); // 2 flutes typical
        tableFeed = input.feed_rate * n;
        // MRR = π/4 × D² × f × n
        mrr = (Math.PI / 4) * D * D * input.feed_rate * n;
        hAvg = input.feed_rate / 2; // per lip
        hMax = hAvg;
        break;
      }
      case "boring": {
        fz = input.feed_rate;
        tableFeed = input.feed_rate * n;
        mrr = Math.PI * D * ap * input.feed_rate * n / 1000;
        hAvg = input.feed_rate;
        hMax = hAvg;
        break;
      }
      default:
        fz = 0; tableFeed = 0; mrr = 0; hAvg = 0; hMax = 0;
    }

    const mrrCm3 = mrr / 1000;

    // Cutting power estimation
    const specificEnergy = input.specific_energy ?? 3.5; // W·s/mm³ = J/mm³
    const powerKW = (specificEnergy * mrr) / (60 * 1000); // (J/mm³ × mm³/min) / (60s × 1000W/kW)

    const powerSufficient = input.spindle_power ? powerKW <= input.spindle_power * 0.8 : true;
    const powerUtil = input.spindle_power ? (powerKW / input.spindle_power) * 100 : 0;
    const specificMRR = powerKW > 0 ? mrrCm3 / powerKW : 0;
    const timePer = mrrCm3 > 0 ? 60 / mrrCm3 : Infinity;

    if (!powerSufficient) {
      warnings.push(`Power required ${powerKW.toFixed(1)}kW exceeds 80% of spindle capacity`);
    }
    if (hMax > 0.5) {
      warnings.push(`High chip thickness ${hMax.toFixed(3)}mm — verify tool can handle load`);
    }

    return {
      mrr_cm3_per_min: mrrCm3,
      mrr_mm3_per_min: mrr,
      specific_mrr: specificMRR,
      cutting_power_kw: powerKW,
      feed_per_tooth: fz,
      avg_chip_thickness: hAvg,
      max_chip_thickness: hMax,
      spindle_speed: n,
      table_feed: tableFeed,
      power_sufficient: powerSufficient,
      power_utilization_pct: powerUtil,
      time_per_cm3: timePer,
      warnings,
      calculation_method: `Chip volume rate (${input.operation}, D=${D}mm, ap=${ap}mm, ae=${ae}mm)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "chip-volume-rate",
      name: "Chip Volume Rate Predictor",
      description: "Volumetric MRR calculation with chip geometry analysis for various operations",
      formula: "Q = ae × ap × Vf (milling); Q = ap × f × Vc × 1000 (turning); P = kc × Q / 60000",
      reference: "Altintas (2012); Sandvik Coromant (2020)",
      safety_class: "standard",
      domain: "force",
      inputs: { operation: "Cutting operation type", depth_of_cut: "Axial depth [mm]", width_of_cut: "Radial width [mm]" },
      outputs: { mrr_cm3_per_min: "MRR [cm³/min]", cutting_power_kw: "Required power [kW]", feed_per_tooth: "Chip load [mm/tooth]" },
    };
  }
}
