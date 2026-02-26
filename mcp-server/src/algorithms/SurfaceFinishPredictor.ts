/**
 * Surface Finish Predictor
 *
 * Predicts surface roughness parameters (Ra, Rz, Rt) from cutting geometry.
 *
 * Theoretical model:
 *   Ra_theoretical = f² / (32·R) × 1000  [μm]
 *   Ra_actual = Ra_theoretical × process_factor
 *
 * For milling:
 *   Ra_theoretical = (f² × ae) / (32·D·R) × 1000  [μm]
 *
 * Rz/Ra ratios per ISO 4287:1997 and Machining Data Handbook 3rd Ed.:
 *   Turning: 4.0, Milling: 5.5, Grinding: 6.5, Boring: 4.2, Reaming: 3.8
 *
 * References:
 * - ISO 4287:1997 — Geometrical product specifications (GPS)
 * - Machining Data Handbook, 3rd Edition
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.5
 *
 * @module algorithms/SurfaceFinishPredictor
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface SurfaceFinishInput {
  /** Feed per revolution or per tooth [mm]. */
  feed: number;
  /** Tool nose radius [mm]. */
  nose_radius: number;
  /** Whether this is a milling operation. */
  is_milling?: boolean;
  /** Radial depth of cut [mm] (for milling). */
  radial_depth?: number;
  /** Tool diameter [mm] (for milling). */
  tool_diameter?: number;
  /** Operation type for Rz/Ra ratio selection. */
  operation?: "turning" | "milling" | "grinding" | "boring" | "reaming";
  /** Process correction factor (default 2.0). */
  process_factor?: number;
}

export interface SurfaceFinishOutput extends WithWarnings {
  /** Actual predicted Ra [μm]. */
  Ra: number;
  /** Peak-to-valley Rz [μm]. */
  Rz: number;
  /** Total roughness Rt [μm]. */
  Rt: number;
  /** Theoretical Ra without process factor [μm]. */
  theoretical_Ra: number;
  /** Process correction factor used. */
  finish_factor: number;
  /** Rz/Ra ratio used. */
  rz_ra_ratio: number;
  /** ISO N grade estimate. */
  iso_grade?: string;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LIMITS = {
  MIN_FEED: 0.001,
  MAX_FEED: 5.0,
  MIN_NOSE_RADIUS: 0.05,
  MAX_NOSE_RADIUS: 20,
  MAX_RA: 100,       // μm
};

// Rz/Ra ratios: ISO 4287:1997 & Machining Data Handbook 3rd Ed.
const RZ_RA_RATIOS: Record<string, number> = {
  turning: 4.0,    // regular chip formation, single-point tool
  milling: 5.5,    // interrupted cut, multiple edges → higher peak scatter
  grinding: 6.5,   // abrasive, stochastic surface
  boring: 4.2,
  reaming: 3.8,
};

// ISO N grades (Ra ranges in μm)
const ISO_GRADES: Array<{ grade: string; max_ra: number }> = [
  { grade: "N1", max_ra: 0.025 },
  { grade: "N2", max_ra: 0.05 },
  { grade: "N3", max_ra: 0.1 },
  { grade: "N4", max_ra: 0.2 },
  { grade: "N5", max_ra: 0.4 },
  { grade: "N6", max_ra: 0.8 },
  { grade: "N7", max_ra: 1.6 },
  { grade: "N8", max_ra: 3.2 },
  { grade: "N9", max_ra: 6.3 },
  { grade: "N10", max_ra: 12.5 },
  { grade: "N11", max_ra: 25 },
  { grade: "N12", max_ra: 50 },
];

// ── Algorithm Implementation ────────────────────────────────────────

export class SurfaceFinishPredictor implements Algorithm<SurfaceFinishInput, SurfaceFinishOutput> {

  validate(input: SurfaceFinishInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.feed || input.feed < LIMITS.MIN_FEED || input.feed > LIMITS.MAX_FEED) {
      issues.push({ field: "feed", message: `Feed must be ${LIMITS.MIN_FEED}-${LIMITS.MAX_FEED} mm, got ${input.feed}`, severity: "error" });
    }
    if (!input.nose_radius || input.nose_radius < LIMITS.MIN_NOSE_RADIUS || input.nose_radius > LIMITS.MAX_NOSE_RADIUS) {
      issues.push({ field: "nose_radius", message: `Nose radius must be ${LIMITS.MIN_NOSE_RADIUS}-${LIMITS.MAX_NOSE_RADIUS} mm, got ${input.nose_radius}`, severity: "error" });
    }
    if (input.is_milling) {
      if (!input.radial_depth || input.radial_depth <= 0) {
        issues.push({ field: "radial_depth", message: `Radial depth required for milling, got ${input.radial_depth}`, severity: "warning" });
      }
      if (!input.tool_diameter || input.tool_diameter <= 0) {
        issues.push({ field: "tool_diameter", message: `Tool diameter required for milling, got ${input.tool_diameter}`, severity: "warning" });
      }
    }
    if (input.operation && !RZ_RA_RATIOS[input.operation]) {
      issues.push({ field: "operation", message: `Unknown operation "${input.operation}"`, severity: "warning" });
    }
    if (input.process_factor !== undefined && (input.process_factor < 0.5 || input.process_factor > 10)) {
      issues.push({ field: "process_factor", message: `Process factor should be 0.5-10, got ${input.process_factor}`, severity: "warning" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: SurfaceFinishInput): SurfaceFinishOutput {
    const warnings: string[] = [];
    const {
      feed, nose_radius,
      is_milling = false,
      radial_depth, tool_diameter,
      operation,
      process_factor = 2.0,
    } = input;

    // Theoretical Ra
    let Ra_theoretical: number;
    if (is_milling && radial_depth && tool_diameter) {
      Ra_theoretical = (feed * feed * radial_depth) / (32 * tool_diameter * nose_radius);
    } else {
      Ra_theoretical = (feed * feed) / (32 * nose_radius);
    }
    Ra_theoretical *= 1000; // mm → μm

    // Actual Ra with process factor
    let Ra_actual = Ra_theoretical * process_factor;

    // Clamp
    if (Ra_actual > LIMITS.MAX_RA) {
      warnings.push(`Ra ${Ra_actual.toFixed(1)}μm exceeds limit, capped at ${LIMITS.MAX_RA}μm`);
      Ra_actual = LIMITS.MAX_RA;
    }

    // Rz/Ra ratio selection
    const defaultOp = is_milling ? "milling" : "turning";
    const selectedOp = (operation && RZ_RA_RATIOS[operation]) ? operation : defaultOp;
    if (operation && !RZ_RA_RATIOS[operation]) {
      warnings.push(`Unknown operation "${operation}" — falling back to ${defaultOp}`);
    }
    const rz_ratio = RZ_RA_RATIOS[selectedOp];

    const Rz = Ra_actual * rz_ratio;
    const Rt = Rz * 1.3;

    // Warnings
    if (Ra_actual > 12.5) {
      warnings.push("Surface is rough (Ra > 12.5μm) — may not meet typical finish requirements");
    }
    if (Ra_actual < 0.1 && process_factor >= 2.0) {
      warnings.push("Very fine finish predicted — consider if process_factor is realistic");
    }

    // ISO N grade
    let iso_grade: string | undefined;
    for (const g of ISO_GRADES) {
      if (Ra_actual <= g.max_ra) {
        iso_grade = g.grade;
        break;
      }
    }

    return {
      Ra: Math.round(Ra_actual * 100) / 100,
      Rz: Math.round(Rz * 100) / 100,
      Rt: Math.round(Rt * 100) / 100,
      theoretical_Ra: Math.round(Ra_theoretical * 100) / 100,
      finish_factor: process_factor,
      rz_ra_ratio: rz_ratio,
      iso_grade,
      warnings,
      calculation_method: "Surface Finish (Ra = f²/(32R) × process_factor)",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "surface-finish",
      name: "Surface Finish Predictor",
      description: "Predicts Ra, Rz, Rt from feed and tool nose radius",
      formula: "Ra = f²/(32·R) × 1000 × process_factor",
      reference: "ISO 4287:1997; Machining Data Handbook 3rd Ed.",
      safety_class: "standard",
      domain: "surface",
      inputs: {
        feed: "Feed [mm/rev or mm/tooth]",
        nose_radius: "Tool nose radius [mm]",
        is_milling: "Milling operation flag",
        operation: "Operation type for Rz/Ra ratio",
      },
      outputs: {
        Ra: "Arithmetic average roughness [μm]",
        Rz: "Mean peak-to-valley height [μm]",
        Rt: "Total roughness [μm]",
        iso_grade: "ISO N surface grade",
      },
    };
  }
}
