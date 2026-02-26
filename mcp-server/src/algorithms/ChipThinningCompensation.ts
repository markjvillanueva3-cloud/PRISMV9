/**
 * Chip Thinning Compensation Model
 *
 * When radial engagement (ae) is less than tool diameter (D),
 * the actual chip thickness (hex) is thinner than programmed feed per tooth (fz).
 * This model calculates the compensation factor to maintain target chip load.
 *
 * Martellotti mean chip thickness:
 *   hex = fz × (1 - cos(φ_e)) / φ_e
 *   where φ_e = arccos(1 - 2·ae/D)
 *
 * Compensation:
 *   fz_compensated = fz × (fz / hex) = fz × chip_thinning_factor
 *
 * References:
 * - Martellotti, M.E. (1941). "An Analysis of the Milling Process"
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.2
 * - Sandvik Coromant Technical Guide — Chip thinning
 *
 * @module algorithms/ChipThinningCompensation
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface ChipThinningInput {
  /** Programmed feed per tooth [mm/tooth]. */
  feed_per_tooth: number;
  /** Radial depth of cut ae [mm]. */
  radial_depth: number;
  /** Tool diameter D [mm]. */
  tool_diameter: number;
  /** Number of teeth (for feed rate calculation). */
  number_of_teeth?: number;
  /** Spindle speed [RPM] (for feed rate calculation). */
  spindle_speed?: number;
}

export interface ChipThinningOutput extends WithWarnings {
  /** Actual mean chip thickness hex [mm]. */
  hex: number;
  /** Programmed fz [mm/tooth]. */
  fz_programmed: number;
  /** Chip thinning factor (fz/hex, >= 1.0). */
  chip_thinning_factor: number;
  /** Compensated feed per tooth [mm/tooth] to achieve target hex. */
  fz_compensated: number;
  /** Engagement angle φ_e [radians]. */
  engagement_angle: number;
  /** Engagement angle [degrees]. */
  engagement_angle_deg: number;
  /** ae/D ratio. */
  engagement_ratio: number;
  /** Compensated feed rate [mm/min] if RPM and teeth provided. */
  feed_rate_compensated?: number;
  /** Original feed rate [mm/min] if RPM and teeth provided. */
  feed_rate_original?: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MIN_FEED: 0.001,
  MAX_FEED: 2.0,
  MIN_DEPTH: 0.01,
  MIN_DIAMETER: 0.5,
  MAX_DIAMETER: 200,
  MAX_COMPENSATION: 5.0,  // Don't compensate more than 5x
};

// ── Algorithm Implementation ────────────────────────────────────────

export class ChipThinningCompensation implements Algorithm<ChipThinningInput, ChipThinningOutput> {

  validate(input: ChipThinningInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.feed_per_tooth || input.feed_per_tooth < LIMITS.MIN_FEED || input.feed_per_tooth > LIMITS.MAX_FEED) {
      issues.push({ field: "feed_per_tooth", message: `Feed must be ${LIMITS.MIN_FEED}-${LIMITS.MAX_FEED} mm/tooth, got ${input.feed_per_tooth}`, severity: "error" });
    }
    if (!input.radial_depth || input.radial_depth < LIMITS.MIN_DEPTH) {
      issues.push({ field: "radial_depth", message: `Radial depth must be >= ${LIMITS.MIN_DEPTH} mm, got ${input.radial_depth}`, severity: "error" });
    }
    if (!input.tool_diameter || input.tool_diameter < LIMITS.MIN_DIAMETER || input.tool_diameter > LIMITS.MAX_DIAMETER) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be ${LIMITS.MIN_DIAMETER}-${LIMITS.MAX_DIAMETER} mm, got ${input.tool_diameter}`, severity: "error" });
    }
    if (input.radial_depth && input.tool_diameter && input.radial_depth > input.tool_diameter) {
      issues.push({ field: "radial_depth", message: `Radial depth (${input.radial_depth}) exceeds tool diameter (${input.tool_diameter})`, severity: "warning" });
    }
    if (input.number_of_teeth !== undefined && input.number_of_teeth < 1) {
      issues.push({ field: "number_of_teeth", message: `Number of teeth must be >= 1, got ${input.number_of_teeth}`, severity: "error" });
    }
    if (input.spindle_speed !== undefined && input.spindle_speed <= 0) {
      issues.push({ field: "spindle_speed", message: `Spindle speed must be > 0, got ${input.spindle_speed}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ChipThinningInput): ChipThinningOutput {
    const warnings: string[] = [];
    const { feed_per_tooth, radial_depth, tool_diameter, number_of_teeth, spindle_speed } = input;

    // Engagement ratio
    const engagement_ratio = Math.min(radial_depth / tool_diameter, 1.0);

    // Engagement angle
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    const phi_e_deg = phi_e * 180 / Math.PI;

    // Martellotti mean chip thickness
    let hex: number;
    if (phi_e > 0.001) {
      hex = feed_per_tooth * (1 - Math.cos(phi_e)) / phi_e;
    } else {
      hex = feed_per_tooth;
      warnings.push("Extremely light engagement — chip thinning calculation near singularity");
    }

    // Chip thinning factor
    let chip_thinning_factor = hex > 0 ? feed_per_tooth / hex : 1.0;

    // When ae >= D, there's no thinning (full slot)
    if (engagement_ratio >= 0.999) {
      hex = feed_per_tooth;
      chip_thinning_factor = 1.0;
    }

    // Compensated feed
    let fz_compensated = feed_per_tooth * chip_thinning_factor;

    // Safety cap on compensation
    if (chip_thinning_factor > LIMITS.MAX_COMPENSATION) {
      warnings.push(`Extreme thinning factor ${chip_thinning_factor.toFixed(2)} — capped at ${LIMITS.MAX_COMPENSATION}x`);
      chip_thinning_factor = LIMITS.MAX_COMPENSATION;
      fz_compensated = feed_per_tooth * LIMITS.MAX_COMPENSATION;
    }

    // Feed rate if RPM and teeth provided
    let feed_rate_compensated: number | undefined;
    let feed_rate_original: number | undefined;
    if (number_of_teeth && spindle_speed) {
      feed_rate_original = feed_per_tooth * number_of_teeth * spindle_speed;
      feed_rate_compensated = fz_compensated * number_of_teeth * spindle_speed;
    }

    // Warnings
    if (chip_thinning_factor > 1.5) {
      warnings.push(`Significant chip thinning (${chip_thinning_factor.toFixed(2)}x). Increase programmed feed to ${fz_compensated.toFixed(3)} mm/tooth for target chip load.`);
    } else if (chip_thinning_factor > 1.2) {
      warnings.push(`Moderate chip thinning (${chip_thinning_factor.toFixed(2)}x). Consider feed compensation.`);
    }
    if (engagement_ratio < 0.05) {
      warnings.push("Very light radial engagement — consider increasing ae for stability");
    }

    return {
      hex: Math.round(hex * 10000) / 10000,
      fz_programmed: feed_per_tooth,
      chip_thinning_factor: Math.round(chip_thinning_factor * 1000) / 1000,
      fz_compensated: Math.round(fz_compensated * 10000) / 10000,
      engagement_angle: Math.round(phi_e * 10000) / 10000,
      engagement_angle_deg: Math.round(phi_e_deg * 10) / 10,
      engagement_ratio: Math.round(engagement_ratio * 10000) / 10000,
      feed_rate_compensated: feed_rate_compensated ? Math.round(feed_rate_compensated) : undefined,
      feed_rate_original: feed_rate_original ? Math.round(feed_rate_original) : undefined,
      warnings,
      calculation_method: "Chip Thinning (hex = fz × (1 - cos(φ_e)) / φ_e)",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "chip-thinning",
      name: "Chip Thinning Compensation",
      description: "Calculates actual chip thickness and compensated feed for partial radial engagement",
      formula: "hex = fz × (1 - cos(φ_e)) / φ_e; φ_e = arccos(1 - 2·ae/D)",
      reference: "Martellotti (1941); Altintas (2012) Ch.2; Sandvik Technical Guide",
      safety_class: "standard",
      domain: "geometry",
      inputs: {
        feed_per_tooth: "Programmed feed per tooth [mm/tooth]",
        radial_depth: "Radial depth ae [mm]",
        tool_diameter: "Tool diameter D [mm]",
      },
      outputs: {
        hex: "Mean chip thickness [mm]",
        chip_thinning_factor: "Thinning ratio fz/hex [-]",
        fz_compensated: "Compensated feed [mm/tooth]",
        engagement_angle: "Engagement angle [rad]",
      },
    };
  }
}
