/**
 * Thermal Partition Model — Jaeger Moving Heat Source
 *
 * Implements the Jaeger moving heat source thermal partition model:
 *   R = 1 / (1 + 1.328 × √(Vc × a / α_chip))
 *
 * Where:
 *   - R: Partition ratio (fraction of heat into chip)
 *   - Vc: Cutting speed [m/s]
 *   - a: Contact length [mm]
 *   - α: Thermal diffusivity [mm²/s]
 *
 * S1-MS2 P2-U05: Created 2026-04-12
 *
 * @see Jaeger, J.C. (1942) "Moving sources of heat and the temperature at sliding contacts"
 * @see Trent, E.M. & Wright, P.K. (2000) "Metal Cutting" Ch.5
 * @see Shaw, M.C. (2005) "Metal Cutting Principles"
 *
 * @module algorithms/ThermalPartitionModel
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type AtomicValue,
  type ValidationResult,
  type SafetyScore,
  createAtomicValue,
  computeSafetyScore,
  createValidationResult,
} from "./types.js";

import type { ISOGroup, MaterialPhysics } from "../physics/constants.js";

// ─── Input Interface ───────────────────────────────────────────────

export interface ThermalPartitionInput extends AlgorithmInput {
  /** Cutting speed [m/min] */
  Vc_m_min: number;
  /** Contact length (chip-tool interface) [mm] — typically 0.5-2mm */
  contact_length_mm?: number;
  /** Chip thermal diffusivity [mm²/s] */
  chip_diffusivity_mm2s?: number;
  /** Tool thermal diffusivity [mm²/s] */
  tool_diffusivity_mm2s?: number;
  /** Cutting power [kW] — for temperature estimate */
  power_kW?: number;
  /** Feed [mm/rev] — for contact length estimate */
  feed_mm?: number;
}

// ─── Output Interface ──────────────────────────────────────────────

export interface ThermalPartitionOutput extends AlgorithmOutput {
  /** Partition ratio R (heat to chip) */
  partition_ratio: AtomicValue<number>;
  /** Heat fraction to chip [%] */
  heat_to_chip_pct: number;
  /** Heat fraction to tool [%] */
  heat_to_tool_pct: number;
  /** Heat fraction to workpiece [%] (remainder) */
  heat_to_workpiece_pct: number;
  /** Peclet number (characterizes heat transport regime) */
  peclet_number: number;
  /** Estimated interface temperature [°C] if power provided */
  interface_temp_C?: AtomicValue<number>;
}

// ─── Material Thermal Properties ───────────────────────────────────

const THERMAL_DIFFUSIVITY: Record<ISOGroup, number> = {
  P: 13.0,   // Steel: ~13 mm²/s
  M: 4.0,    // Stainless: ~4 mm²/s (low conductivity)
  K: 12.0,   // Cast iron: ~12 mm²/s
  N: 80.0,   // Aluminum: ~80 mm²/s (high conductivity)
  S: 3.0,    // Superalloys: ~3 mm²/s
  H: 8.0,    // Hardened steel: ~8 mm²/s
};

const TOOL_DIFFUSIVITY = {
  carbide: 25.0,    // mm²/s — WC-Co
  ceramic: 8.0,     // mm²/s — Al2O3
  CBN: 40.0,        // mm²/s — cubic boron nitride
  PCD: 150.0,       // mm²/s — polycrystalline diamond
};

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  Vc_m_min: { min: 5, max: 2000, unit: "m/min" },
  contact_length_mm: { min: 0.1, max: 5.0, unit: "mm" },
  chip_diffusivity_mm2s: { min: 1, max: 200, unit: "mm²/s" },
};

// ─── Thermal Partition Class ───────────────────────────────────────

class ThermalPartitionModelImpl implements Algorithm<ThermalPartitionInput, ThermalPartitionOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: ThermalPartitionInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.Vc_m_min <= 0) errors.push("Vc_m_min must be positive");

    if (input.Vc_m_min > 500) {
      warnings.push("Very high cutting speed — thermal effects significant");
    }

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate thermal partition using Jaeger model.
   *
   * R = 1 / (1 + 1.328 × √(Vc × a / α))
   */
  calculate(input: ThermalPartitionInput): ThermalPartitionOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Thermal partition validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    // Convert cutting speed to m/s
    const Vc_m_s = input.Vc_m_min / 60;

    // Contact length: estimate from feed if not provided
    const contactLength = input.contact_length_mm ?? (input.feed_mm ? input.feed_mm * 2 : 1.0);

    // Thermal diffusivity — input.iso_group is ISOGroup | string, narrow via cast.
    const isoGroup: ISOGroup = ((input.iso_group ?? "P") as ISOGroup);
    const chipDiffusivity = input.chip_diffusivity_mm2s ?? THERMAL_DIFFUSIVITY[isoGroup];
    const toolDiffusivity = input.tool_diffusivity_mm2s ?? TOOL_DIFFUSIVITY.carbide;

    // Peclet number: Pe = V × a / α (dimensionless)
    // Characterizes heat transport: Pe >> 1 means convection dominates
    const pecletNumber = (Vc_m_s * 1000 * contactLength) / chipDiffusivity;

    // Jaeger partition ratio (heat to chip)
    // R = 1 / (1 + 1.328 × √(Vc × a / α_chip))
    const jaegerTerm = 1.328 * Math.sqrt((Vc_m_s * 1000 * contactLength) / chipDiffusivity);
    const partitionRatio = 1 / (1 + jaegerTerm);

    // Heat distribution
    const heatToChipPct = partitionRatio * 100;
    // Remaining heat split between tool and workpiece
    // Typical: tool gets 5-15%, workpiece gets the rest
    const heatToToolPct = (1 - partitionRatio) * 0.15 * 100;
    const heatToWorkpiecePct = 100 - heatToChipPct - heatToToolPct;

    // Interface temperature estimate (simplified Loewen-Shaw type)
    let interfaceTemp: number | undefined;
    if (input.power_kW) {
      // T_interface ≈ T_room + C × (P / √(k×ρ×c)) × √(Vc)
      // Simplified: T ≈ 300 + 50 × P × √(Vc/100)
      interfaceTemp = 300 + 50 * input.power_kW * Math.sqrt(input.Vc_m_min / 100);
    }

    // Safety score
    let physicsScore = 1.0;
    if (pecletNumber < 1) physicsScore -= 0.1; // Low Peclet — conduction important
    if (partitionRatio > 0.9) warnings.push("Most heat goes to chip — good for tool life");

    const rangeScore = (validation.warnings ?? []).length > 0 ? 0.9 : 1.0;
    const materialScore = input.chip_diffusivity_mm2s ? 1.0 : 0.85;
    const processScore = 0.95;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    const result: ThermalPartitionOutput = {
      partition_ratio: createAtomicValue(partitionRatio, "-", 10, "Jaeger", safety.score,
        `R = 1/(1 + 1.328×√(Vc×a/α)) = ${partitionRatio.toFixed(3)}`),
      heat_to_chip_pct: heatToChipPct,
      heat_to_tool_pct: heatToToolPct,
      heat_to_workpiece_pct: heatToWorkpiecePct,
      peclet_number: pecletNumber,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: ThermalPartitionModelImpl.VERSION,
      warnings,
    };

    if (interfaceTemp !== undefined) {
      result.interface_temp_C = createAtomicValue(interfaceTemp, "°C", 20, "Loewen-Shaw-approx", 0.80,
        "Simplified interface temperature estimate");
    }

    return result;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "thermal_partition_jaeger",
      name: "Thermal Partition Model (Jaeger Moving Heat Source)",
      version: ThermalPartitionModelImpl.VERSION,
      domain: "thermal",
      category: "heat_partition",
      description: "Calculates heat partition between chip, tool, and workpiece using " +
        "Jaeger's moving heat source model for sliding contacts.",
      equation_plain: "R = 1 / (1 + 1.328 × √(Vc × a / α))",
      equation_latex: "R = \\frac{1}{1 + 1.328\\sqrt{\\frac{V_c \\cdot a}{\\alpha}}}",
      references: [
        {
          authors: "Jaeger, J.C.",
          title: "Moving sources of heat and the temperature at sliding contacts",
          publication: "Proc. Royal Society NSW",
          year: 1942,
          pages: "203-224",
        },
        {
          authors: "Trent, E.M. & Wright, P.K.",
          title: "Metal Cutting",
          publication: "Butterworth-Heinemann",
          year: 2000,
          pages: "Chapter 5",
        },
      ],
      assumptions: [
        "Semi-infinite solid heat conduction",
        "Constant thermal properties",
        "Uniform heat flux over contact",
        "Steady-state conditions",
      ],
      limitations: [
        "Does not model coating effects on tool",
        "Simplified workpiece heat distribution",
        "Temperature-dependent properties not included",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: ["P", "M", "K", "N", "S", "H"],
      last_validated: "2026-04-12",
      validation_score: 0.95,
    };
  }
}

export const ThermalPartitionModel = new ThermalPartitionModelImpl();
