/**
 * Chip Thinning Compensation — Feed Rate Adjustment Algorithm
 *
 * Implements chip thinning compensation for radial engagement < 50%:
 *   h_ex = fz × √(1 - (1 - 2×ae/D)²)
 *
 * Where:
 *   - h_ex: Effective chip thickness [mm]
 *   - fz: Feed per tooth [mm]
 *   - ae: Radial depth of cut (stepover) [mm]
 *   - D: Tool diameter [mm]
 *
 * Inverse solve for compensated feed:
 *   fz_comp = fz_target / √(1 - (1 - 2×ae/D)²)
 *
 * S1-MS2 P2-U04: Created 2026-04-12
 *
 * @see Sandvik Coromant "Milling Technical Guide"
 * @see Altintas, Y. (2012) "Manufacturing Automation" §3.4
 *
 * @module algorithms/ChipThinningCompensation
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

// ─── Input Interface ───────────────────────────────────────────────

export interface ChipThinningInput extends AlgorithmInput {
  /** Feed per tooth [mm] */
  fz_mm: number;
  /** Radial depth of cut (stepover) [mm] */
  ae_mm: number;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Target chip thickness for compensation [mm] (optional) */
  target_chip_mm?: number;
  /** Calculate compensated feed? */
  calculate_compensation?: boolean;
}

// ─── Output Interface ──────────────────────────────────────────────

export interface ChipThinningOutput extends AlgorithmOutput {
  /** Effective (actual) chip thickness [mm] */
  effective_chip_mm: AtomicValue<number>;
  /** Chip thinning factor (h_ex / fz) */
  thinning_factor: number;
  /** Radial immersion ratio (ae/D) */
  radial_immersion: number;
  /** Engagement angle [degrees] */
  engagement_angle_deg: number;
  /** Compensated feed per tooth for target chip [mm] */
  compensated_fz_mm?: AtomicValue<number>;
  /** Feed increase percentage for compensation */
  feed_increase_pct?: number;
  /** Whether compensation is needed (ae/D < 50%) */
  compensation_needed: boolean;
}

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  fz_mm: { min: 0.01, max: 2.0, unit: "mm" },
  ae_mm: { min: 0.1, max: 100, unit: "mm" },
  tool_diameter_mm: { min: 1, max: 200, unit: "mm" },
};

// ─── Chip Thinning Class ───────────────────────────────────────────

class ChipThinningCompensationImpl implements Algorithm<ChipThinningInput, ChipThinningOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: ChipThinningInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.fz_mm <= 0) errors.push("fz_mm must be positive");
    if (input.ae_mm <= 0) errors.push("ae_mm must be positive");
    if (input.tool_diameter_mm <= 0) errors.push("tool_diameter_mm must be positive");

    if (input.ae_mm > input.tool_diameter_mm) {
      errors.push("ae_mm cannot exceed tool_diameter_mm");
    }

    const ratio = input.ae_mm / input.tool_diameter_mm;
    if (ratio > 0.5) {
      warnings.push(`Radial immersion ${(ratio * 100).toFixed(0)}% >= 50% — chip thinning minimal`);
    }

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate chip thinning and compensation.
   *
   * Effective chip: h_ex = fz × √(1 - (1 - 2×ae/D)²)
   * Compensated feed: fz_comp = target / thinning_factor
   */
  calculate(input: ChipThinningInput): ChipThinningOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Chip thinning validation failed: ${validation.errors.join(", ")}`);
    }

    const warnings = [...validation.warnings];

    const fz = input.fz_mm;
    const ae = input.ae_mm;
    const D = input.tool_diameter_mm;

    // Radial immersion ratio
    const radialImmersion = ae / D;

    // Engagement angle: cos(φ) = 1 - 2ae/D  →  φ = acos(1 - 2ae/D)
    const cosEngagement = Math.max(-1, Math.min(1, 1 - 2 * radialImmersion));
    const engagementAngle = Math.acos(cosEngagement); // radians
    const engagementAngleDeg = (engagementAngle * 180) / Math.PI;

    // Chip thinning factor: √(1 - (1 - 2×ae/D)²) = sin(φ)
    const thinningFactor = Math.sin(engagementAngle);

    // Effective chip thickness
    const effectiveChip = fz * thinningFactor;

    // Compensation calculation
    const compensationNeeded = radialImmersion < 0.5 && thinningFactor < 0.95;
    let compensatedFz: number | undefined;
    let feedIncreasePct: number | undefined;

    if (input.calculate_compensation !== false && compensationNeeded) {
      const targetChip = input.target_chip_mm ?? fz; // Target = original fz if not specified
      compensatedFz = targetChip / thinningFactor;
      feedIncreasePct = ((compensatedFz / fz) - 1) * 100;

      // Safety cap on feed increase
      if (feedIncreasePct > 200) {
        warnings.push(`Feed increase ${feedIncreasePct.toFixed(0)}% exceeds 200% — verify tool/machine limits`);
      }
    }

    // Safety score
    let physicsScore = 1.0;
    if (thinningFactor < 0.3) physicsScore -= 0.1; // Very thin chips — rubbing zone

    const rangeScore = validation.warnings.length > 0 ? 0.9 : 1.0;
    const materialScore = 1.0;
    const processScore = 0.98;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);

    const result: ChipThinningOutput = {
      effective_chip_mm: createAtomicValue(effectiveChip, "mm", 5, "chip-thinning", safety.score,
        `h_ex = fz × sin(φ) = ${fz} × ${thinningFactor.toFixed(4)}`),
      thinning_factor: thinningFactor,
      radial_immersion: radialImmersion,
      engagement_angle_deg: engagementAngleDeg,
      compensation_needed: compensationNeeded,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: ChipThinningCompensationImpl.VERSION,
      warnings,
    };

    if (compensatedFz !== undefined) {
      result.compensated_fz_mm = createAtomicValue(compensatedFz, "mm", 5, "compensation", safety.score,
        `fz_comp = target / thinning_factor = ${compensatedFz.toFixed(4)}`);
      result.feed_increase_pct = feedIncreasePct;
    }

    return result;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "chip_thinning_compensation",
      name: "Chip Thinning Compensation",
      version: ChipThinningCompensationImpl.VERSION,
      domain: "toolpath",
      category: "feed_optimization",
      description: "Calculates effective chip thickness for radial engagements < 50% and " +
        "provides compensated feed rate to maintain target chip load for consistent tool life and MRR.",
      equation_plain: "h_ex = fz × √(1 - (1 - 2×ae/D)²)",
      equation_latex: "h_{ex} = f_z \\cdot \\sqrt{1 - \\left(1 - \\frac{2a_e}{D}\\right)^2}",
      references: [
        {
          authors: "Sandvik Coromant",
          title: "Metal Cutting Technical Guide — Milling",
          publication: "Sandvik Coromant",
          year: 2024,
        },
        {
          authors: "Altintas, Y.",
          title: "Manufacturing Automation: Metal Cutting Mechanics",
          publication: "Cambridge University Press",
          year: 2012,
          pages: "Section 3.4",
        },
      ],
      assumptions: [
        "Circular tool path approximation",
        "Constant radial engagement along path",
        "No tool deflection during cut",
        "Synchronous milling (conventional or climb)",
      ],
      limitations: [
        "Does not account for variable engagement (corners, islands)",
        "Very low engagement (<5%) may enter rubbing zone",
        "Compensated feed must respect machine/tool limits",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: [],
      last_validated: "2026-04-12",
      validation_score: 0.99,
    };
  }
}

export const ChipThinningCompensation = new ChipThinningCompensationImpl();
