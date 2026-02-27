/**
 * Tool Deflection Model (Cantilever Beam)
 *
 * Predicts tool deflection using Euler-Bernoulli cantilever beam theory:
 *   delta = F x L^3 / (3 x E x I)
 *   I = pi x D^4 / 64
 *
 * With extensions:
 * - Dynamic amplification factor (default 1.5, Q~20)
 * - Runout contribution to surface error
 * - Maximum force before yield (safety factor)
 * - Stiffness calculation [N/mm]
 *
 * SAFETY-CRITICAL: Tool deflection directly affects dimensional accuracy,
 * surface finish, and can cause tool breakage or workpiece scrap.
 *
 * References:
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.2
 * - Tlusty, J. (2000). "Manufacturing Processes and Equipment"
 * - Schmitz, T. & Smith, K.S. (2019). "Machining Dynamics"
 *
 * @module algorithms/ToolDeflectionModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface ToolDeflectionInput {
  /** Cutting force (radial component) [N]. */
  cutting_force: number;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Tool overhang (stick-out) length [mm]. */
  overhang_length: number;
  /** Young's modulus [GPa]. Default 600 (cemented carbide). */
  youngs_modulus?: number;
  /** Tool runout [mm]. Default 0.005. */
  runout?: number;
  /** Dynamic amplification factor. Default 1.5. */
  dynamic_factor?: number;
  /** Shank diameter [mm]. Defaults to tool_diameter if not specified. */
  shank_diameter?: number;
}

export interface ToolDeflectionOutput extends WithWarnings {
  /** Static deflection at tool tip [mm]. */
  static_deflection: number;
  /** Dynamic deflection (with amplification) [mm]. */
  dynamic_deflection: number;
  /** Total surface error (dynamic + runout) [mm]. */
  surface_error: number;
  /** Tool stiffness [N/mm]. */
  stiffness: number;
  /** Moment of inertia [mm^4]. */
  moment_of_inertia: number;
  /** Maximum force before yield [N]. */
  max_force_before_yield: number;
  /** Safety factor (max_force / applied_force). */
  safety_factor: number;
  /** Bending stress at root [MPa]. */
  bending_stress: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_FORCE: 100000,          // N
  MAX_DIAMETER: 200,          // mm
  MIN_DIAMETER: 0.1,
  MAX_OVERHANG: 500,          // mm
  MIN_OVERHANG: 1,
  MAX_DEFLECTION: 1.0,        // mm (warning threshold)
  CRITICAL_SAFETY_FACTOR: 2.0,
  MIN_SAFETY_FACTOR: 1.5,
};

// Material yield strengths [MPa]
const YIELD_STRENGTH: Record<string, number> = {
  carbide: 3000,
  hss: 2000,
  ceramic: 4000,
};

// ── Algorithm Implementation ────────────────────────────────────────

export class ToolDeflectionModel implements Algorithm<ToolDeflectionInput, ToolDeflectionOutput> {

  validate(input: ToolDeflectionInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (input.cutting_force === undefined || input.cutting_force < 0) {
      issues.push({ field: "cutting_force", message: `Cutting force must be >= 0 N, got ${input.cutting_force}`, severity: "error" });
    }
    if (input.cutting_force > LIMITS.MAX_FORCE) {
      issues.push({ field: "cutting_force", message: `Cutting force ${input.cutting_force} N exceeds ${LIMITS.MAX_FORCE} N`, severity: "warning" });
    }
    if (!input.tool_diameter || input.tool_diameter < LIMITS.MIN_DIAMETER || input.tool_diameter > LIMITS.MAX_DIAMETER) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be ${LIMITS.MIN_DIAMETER}-${LIMITS.MAX_DIAMETER} mm, got ${input.tool_diameter}`, severity: "error" });
    }
    if (!input.overhang_length || input.overhang_length < LIMITS.MIN_OVERHANG || input.overhang_length > LIMITS.MAX_OVERHANG) {
      issues.push({ field: "overhang_length", message: `Overhang must be ${LIMITS.MIN_OVERHANG}-${LIMITS.MAX_OVERHANG} mm, got ${input.overhang_length}`, severity: "error" });
    }
    if (input.youngs_modulus !== undefined && input.youngs_modulus <= 0) {
      issues.push({ field: "youngs_modulus", message: `Young's modulus must be > 0 GPa, got ${input.youngs_modulus}`, severity: "error" });
    }

    // L/D ratio warning
    if (input.overhang_length && input.tool_diameter) {
      const ld = input.overhang_length / input.tool_diameter;
      if (ld > 6) {
        issues.push({ field: "overhang_length", message: `L/D ratio ${ld.toFixed(1)} > 6: high deflection risk`, severity: "warning" });
      }
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ToolDeflectionInput): ToolDeflectionOutput {
    const warnings: string[] = [];
    const {
      cutting_force,
      tool_diameter,
      overhang_length,
      youngs_modulus = 600,
      runout = 0.005,
      dynamic_factor = 1.5,
      shank_diameter,
    } = input;

    const d = shank_diameter || tool_diameter;

    // Moment of inertia: I = pi x D^4 / 64
    const I = (Math.PI * Math.pow(d, 4)) / 64;

    // Young's modulus: GPa -> N/mm^2
    const E = youngs_modulus * 1000;

    // Static deflection (cantilever): delta = F x L^3 / (3 x E x I)
    const L = overhang_length;
    const static_deflection = (cutting_force * Math.pow(L, 3)) / (3 * E * I);

    // Dynamic deflection with amplification factor
    const dynamic_deflection = static_deflection * dynamic_factor;

    // Total surface error
    const surface_error = dynamic_deflection + runout;

    // Stiffness: k = 3 x E x I / L^3
    const stiffness = (3 * E * I) / Math.pow(L, 3);

    // Bending stress at root: sigma = M x c / I = F x L x (D/2) / I
    const bending_stress = (cutting_force * L * (d / 2)) / I;

    // Maximum force before yield
    const yield_strength = YIELD_STRENGTH.carbide;
    const max_force_before_yield = (yield_strength * I) / (L * d / 2);

    // Safety factor
    const safety_factor = cutting_force > 0 ? max_force_before_yield / cutting_force : 999;

    // Warnings
    if (static_deflection > LIMITS.MAX_DEFLECTION) {
      warnings.push(`EXCESSIVE_DEFLECTION: Static deflection ${static_deflection.toFixed(3)} mm exceeds ${LIMITS.MAX_DEFLECTION} mm limit.`);
    } else if (static_deflection > LIMITS.MAX_DEFLECTION * 0.5) {
      warnings.push(`HIGH_DEFLECTION: Static deflection ${static_deflection.toFixed(3)} mm approaching limit.`);
    }

    if (safety_factor < LIMITS.MIN_SAFETY_FACTOR) {
      warnings.push(`LOW_SAFETY_FACTOR: ${safety_factor.toFixed(2)} < ${LIMITS.MIN_SAFETY_FACTOR}. Risk of tool breakage.`);
    } else if (safety_factor < LIMITS.CRITICAL_SAFETY_FACTOR) {
      warnings.push(`MARGINAL_SAFETY: Safety factor ${safety_factor.toFixed(2)} is below recommended ${LIMITS.CRITICAL_SAFETY_FACTOR}.`);
    }

    const ld_ratio = L / d;
    if (ld_ratio > 8) {
      warnings.push(`EXTREME_OVERHANG: L/D = ${ld_ratio.toFixed(1)}. Use vibration damping or support.`);
    } else if (ld_ratio > 5) {
      warnings.push(`LONG_OVERHANG: L/D = ${ld_ratio.toFixed(1)}. Consider shorter tool or reduced parameters.`);
    }

    if (surface_error > 0.05) {
      warnings.push(`SURFACE_ERROR: Total error ${(surface_error * 1000).toFixed(1)} um may exceed IT7 tolerance.`);
    }

    return {
      static_deflection,
      dynamic_deflection,
      surface_error,
      stiffness,
      moment_of_inertia: I,
      max_force_before_yield,
      safety_factor,
      bending_stress,
      warnings,
      calculation_method: "Euler-Bernoulli cantilever (delta = F x L^3 / (3EI))",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "tool-deflection",
      name: "Tool Deflection Model",
      description: "Predicts tool deflection using cantilever beam theory with dynamic amplification",
      formula: "delta = F x L^3 / (3 x E x I); I = pi x D^4 / 64",
      reference: "Altintas 'Manufacturing Automation' (2012) Ch.2; Schmitz & Smith (2019)",
      safety_class: "critical",
      domain: "geometry",
      inputs: {
        cutting_force: "Radial cutting force [N]",
        tool_diameter: "Tool diameter [mm]",
        overhang_length: "Tool overhang [mm]",
        youngs_modulus: "Young's modulus [GPa]",
      },
      outputs: {
        static_deflection: "Static deflection [mm]",
        dynamic_deflection: "Dynamic deflection [mm]",
        surface_error: "Total surface error [mm]",
        safety_factor: "Force safety factor [-]",
      },
    };
  }
}
