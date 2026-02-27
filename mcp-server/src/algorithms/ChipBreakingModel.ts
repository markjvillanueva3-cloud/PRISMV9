/**
 * Chip Breaking Analysis Model
 *
 * Evaluates chip formation, type classification, and breaking feasibility:
 *   h = fz x sin(kappa_r)  (chip thickness from feed and lead angle)
 *
 * With extensions:
 * - ISO material group-specific chip behavior (P/M/K/N/S/H)
 * - Chip type classification (continuous/segmented/broken/stringy)
 * - Chipbreaker geometry effectiveness
 * - BUE (Built-Up Edge) risk assessment
 * - Chip ratio and compression factor
 *
 * SAFETY-CRITICAL: Poor chip control causes tool breakage, workpiece damage,
 * operator injury from flying chips, and machine downtime.
 *
 * References:
 * - ISO 3685:1993 Tool life testing — chip form classification
 * - Sandvik Coromant "Metal Cutting Technology" (2020)
 * - Jawahir, I.S. (1988). "Chip Breaking Mechanics"
 *
 * @module algorithms/ChipBreakingModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface ChipBreakingInput {
  /** Feed per tooth [mm/tooth]. */
  feed_per_tooth: number;
  /** Axial depth of cut [mm]. */
  axial_depth: number;
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** ISO material group: P, M, K, N, S, H. */
  iso_group: string;
  /** Tool lead/entering angle [degrees]. Default 45. */
  lead_angle?: number;
  /** Whether insert has chipbreaker geometry. Default false. */
  has_chipbreaker?: boolean;
  /** Rake angle [degrees]. Default 6. */
  rake_angle?: number;
}

export interface ChipBreakingOutput extends WithWarnings {
  /** Uncut chip thickness [mm]. */
  chip_thickness: number;
  /** Chip width [mm]. */
  chip_width: number;
  /** Chip compression ratio (actual/uncut thickness). */
  chip_compression_ratio: number;
  /** Classified chip type. */
  chip_type: "broken" | "segmented" | "continuous" | "stringy" | "snarled";
  /** ISO 3685 chip form code (1-8). */
  chip_form_code: number;
  /** Breaking feasibility assessment. */
  breaking_feasibility: "good" | "marginal" | "poor";
  /** BUE risk level. */
  bue_risk: "low" | "medium" | "high";
  /** Recommended actions. */
  recommendations: string[];
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LIMITS = {
  MIN_CHIP_THICKNESS: 0.005,   // mm — below this, rubbing not cutting
  RUBBING_THRESHOLD: 0.02,     // mm — work hardening risk
  IDEAL_MIN: 0.05,             // mm — lower bound of good chip breaking
  IDEAL_MAX: 0.3,              // mm — upper bound before jamming risk
  JAM_THRESHOLD: 0.5,          // mm — chip jamming and breakage risk
  MAX_FEED: 2.0,
  MIN_FEED: 0.001,
  MAX_DEPTH: 100,
  MAX_SPEED: 2000,
};

/** ISO group chip behavior characteristics. */
const ISO_CHIP_BEHAVIOR: Record<string, {
  tendency: string;
  bue_speed_range: [number, number]; // m/min range where BUE forms
  compression_ratio: number;
  break_difficulty: number; // 1=easy, 5=very hard
}> = {
  P: { tendency: "continuous", bue_speed_range: [30, 120], compression_ratio: 2.5, break_difficulty: 3 },
  M: { tendency: "continuous_hard", bue_speed_range: [20, 80], compression_ratio: 3.0, break_difficulty: 4 },
  K: { tendency: "segmented", bue_speed_range: [0, 0], compression_ratio: 1.5, break_difficulty: 1 },
  N: { tendency: "stringy", bue_speed_range: [50, 300], compression_ratio: 3.5, break_difficulty: 5 },
  S: { tendency: "continuous_abrasive", bue_speed_range: [10, 40], compression_ratio: 2.0, break_difficulty: 4 },
  H: { tendency: "segmented", bue_speed_range: [0, 0], compression_ratio: 1.2, break_difficulty: 1 },
};

// ── Algorithm Implementation ────────────────────────────────────────

export class ChipBreakingModel implements Algorithm<ChipBreakingInput, ChipBreakingOutput> {

  validate(input: ChipBreakingInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.feed_per_tooth || input.feed_per_tooth < LIMITS.MIN_FEED || input.feed_per_tooth > LIMITS.MAX_FEED) {
      issues.push({ field: "feed_per_tooth", message: `Feed must be ${LIMITS.MIN_FEED}-${LIMITS.MAX_FEED} mm/tooth, got ${input.feed_per_tooth}`, severity: "error" });
    }
    if (!input.axial_depth || input.axial_depth < 0 || input.axial_depth > LIMITS.MAX_DEPTH) {
      issues.push({ field: "axial_depth", message: `Axial depth must be 0-${LIMITS.MAX_DEPTH} mm, got ${input.axial_depth}`, severity: "error" });
    }
    if (!input.cutting_speed || input.cutting_speed <= 0 || input.cutting_speed > LIMITS.MAX_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be > 0 and <= ${LIMITS.MAX_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    if (!input.tool_diameter || input.tool_diameter <= 0) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be > 0, got ${input.tool_diameter}`, severity: "error" });
    }
    const validGroups = ["P", "M", "K", "N", "S", "H"];
    if (!input.iso_group || !validGroups.includes(input.iso_group.toUpperCase())) {
      issues.push({ field: "iso_group", message: `ISO group must be one of ${validGroups.join(",")}, got ${input.iso_group}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ChipBreakingInput): ChipBreakingOutput {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const {
      feed_per_tooth, axial_depth, cutting_speed, tool_diameter,
      lead_angle = 45, has_chipbreaker = false, rake_angle = 6,
    } = input;
    const iso_group = input.iso_group.toUpperCase();
    const behavior = ISO_CHIP_BEHAVIOR[iso_group] || ISO_CHIP_BEHAVIOR.P;

    // Chip thickness: h = fz x sin(kappa_r)
    const kappa_rad = (lead_angle * Math.PI) / 180;
    const chip_thickness = feed_per_tooth * Math.sin(kappa_rad);

    // Chip width: b = ap / sin(kappa_r)
    const chip_width = axial_depth / Math.sin(kappa_rad);

    // Chip compression ratio (material-dependent)
    const speed_factor = Math.max(0.6, 1.0 - (cutting_speed - 100) * 0.001);
    const rake_factor = 1.0 + (6 - rake_angle) * 0.02;
    const chip_compression_ratio = behavior.compression_ratio * speed_factor * rake_factor;

    // Chip type classification
    let chip_type: ChipBreakingOutput["chip_type"];
    let chip_form_code: number;

    if (iso_group === "K" || iso_group === "H") {
      // Cast iron / hardened: naturally segmented
      chip_type = "segmented";
      chip_form_code = 3;
    } else if (iso_group === "N" && !has_chipbreaker) {
      // Aluminum without chipbreaker: stringy
      chip_type = "stringy";
      chip_form_code = 7;
    } else if (chip_thickness < LIMITS.RUBBING_THRESHOLD) {
      chip_type = "continuous";
      chip_form_code = 6;
    } else if (chip_thickness > LIMITS.IDEAL_MAX) {
      chip_type = has_chipbreaker ? "broken" : "continuous";
      chip_form_code = has_chipbreaker ? 2 : 5;
    } else if (has_chipbreaker && chip_thickness >= LIMITS.IDEAL_MIN) {
      chip_type = "broken";
      chip_form_code = 2;
    } else if (chip_thickness >= LIMITS.IDEAL_MIN) {
      chip_type = has_chipbreaker ? "broken" : "continuous";
      chip_form_code = has_chipbreaker ? 2 : 4;
    } else {
      chip_type = "continuous";
      chip_form_code = 5;
    }

    // Breaking feasibility
    let breaking_feasibility: ChipBreakingOutput["breaking_feasibility"];
    if (chip_type === "broken" || chip_type === "segmented") {
      breaking_feasibility = "good";
    } else if (has_chipbreaker && chip_thickness >= LIMITS.RUBBING_THRESHOLD) {
      breaking_feasibility = "marginal";
    } else {
      breaking_feasibility = "poor";
    }

    // BUE risk
    let bue_risk: ChipBreakingOutput["bue_risk"] = "low";
    const [bueMin, bueMax] = behavior.bue_speed_range;
    if (bueMin > 0 && cutting_speed >= bueMin && cutting_speed <= bueMax) {
      bue_risk = "high";
      warnings.push(`BUE_RISK: Cutting speed ${cutting_speed} m/min is in BUE range (${bueMin}-${bueMax}) for ${iso_group}.`);
      recommendations.push(`Increase speed above ${bueMax} m/min or use coated insert to avoid BUE.`);
    } else if (bueMin > 0 && cutting_speed >= bueMin * 0.8 && cutting_speed <= bueMax * 1.2) {
      bue_risk = "medium";
    }

    // Warnings and recommendations
    if (chip_thickness < LIMITS.RUBBING_THRESHOLD) {
      warnings.push(`RUBBING: Chip thickness ${chip_thickness.toFixed(3)} mm < ${LIMITS.RUBBING_THRESHOLD} mm. Work hardening risk.`);
      recommendations.push("Increase feed per tooth to ensure proper chip formation.");
    }
    if (chip_thickness > LIMITS.JAM_THRESHOLD) {
      warnings.push(`CHIP_JAM: Chip thickness ${chip_thickness.toFixed(3)} mm > ${LIMITS.JAM_THRESHOLD} mm. Jamming/breakage risk.`);
      recommendations.push("Reduce feed or increase lead angle to thin chip.");
    }
    if (breaking_feasibility === "poor") {
      recommendations.push("Use insert with chipbreaker geometry for this material/feed combination.");
    }
    if (iso_group === "N" && !has_chipbreaker) {
      recommendations.push("Aluminum: use polished insert with chipbreaker. Consider high-pressure coolant.");
    }
    if (iso_group === "M" && chip_thickness > 0.15) {
      warnings.push("Stainless steel: thick chips increase BUE risk and work hardening.");
    }

    return {
      chip_thickness,
      chip_width,
      chip_compression_ratio,
      chip_type,
      chip_form_code,
      breaking_feasibility,
      bue_risk,
      recommendations,
      warnings,
      calculation_method: "Chip thickness (h = fz x sin(kappa)) + ISO 3685 classification",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "chip-breaking",
      name: "Chip Breaking Analysis Model",
      description: "Evaluates chip formation, type, and breaking feasibility by ISO material group",
      formula: "h = fz x sin(kappa_r); ISO 3685 chip classification",
      reference: "ISO 3685:1993; Sandvik Metal Cutting Technology (2020); Jawahir (1988)",
      safety_class: "standard",
      domain: "force",
      inputs: {
        feed_per_tooth: "Feed per tooth [mm/tooth]",
        axial_depth: "Axial depth of cut [mm]",
        cutting_speed: "Cutting speed [m/min]",
        iso_group: "ISO material group (P/M/K/N/S/H)",
        lead_angle: "Tool lead angle [deg]",
      },
      outputs: {
        chip_thickness: "Uncut chip thickness [mm]",
        chip_type: "Chip type classification",
        breaking_feasibility: "Breaking feasibility (good/marginal/poor)",
        bue_risk: "Built-up edge risk level",
      },
    };
  }
}
