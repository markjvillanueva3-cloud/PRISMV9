/**
 * Johnson-Cook Constitutive Flow Stress Model
 *
 * Implements the Johnson-Cook equation:
 *   σ = [A + B·ε^n] × [1 + C·ln(ε̇/ε̇₀)] × [1 - T*^m]
 *
 * Where:
 * - A: yield strength [MPa]
 * - B: strain hardening coefficient [MPa]
 * - n: strain hardening exponent
 * - C: strain rate sensitivity coefficient
 * - m: thermal softening exponent
 * - T* = (T - T_ref) / (T_melt - T_ref) homologous temperature
 *
 * Used for:
 * - Predicting flow stress in machining simulations
 * - FEM chip formation models
 * - High strain-rate deformation analysis
 *
 * References:
 * - Johnson, G.R. & Cook, W.H. (1983). "A constitutive model..."
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.2
 *
 * @module algorithms/JohnsonCookModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface JohnsonCookInput {
  /** Plastic strain [-] (typically 0.001-5.0). */
  strain: number;
  /** Strain rate [1/s] (machining: 10³-10⁶). */
  strain_rate: number;
  /** Temperature [°C]. */
  temperature: number;
  /** Yield strength A [MPa]. */
  A: number;
  /** Strain hardening coefficient B [MPa]. */
  B: number;
  /** Strain hardening exponent n [-]. */
  n: number;
  /** Strain rate sensitivity C [-]. */
  C: number;
  /** Thermal softening exponent m [-]. */
  m: number;
  /** Melting temperature [°C]. */
  T_melt: number;
  /** Reference temperature [°C] (default 25). */
  T_ref?: number;
  /** Reference strain rate [1/s] (default 1.0). */
  strain_rate_ref?: number;
}

export interface JohnsonCookOutput extends WithWarnings {
  /** Flow stress σ [MPa]. */
  stress: number;
  /** Strain hardening term [A + B·ε^n]. */
  strain_term: number;
  /** Strain rate term [1 + C·ln(ε̇/ε̇₀)]. */
  rate_term: number;
  /** Thermal softening term [1 - T*^m]. */
  thermal_term: number;
  /** Homologous temperature T* [-]. */
  T_star: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_STRESS: 10000,     // MPa
  MIN_STRAIN: 0.0001,
  MAX_STRAIN: 10,
  MIN_STRAIN_RATE: 0.001,
  MAX_STRAIN_RATE: 1e8,
  MIN_A: 1,
  MAX_A: 5000,
  MIN_B: 0,
  MAX_B: 5000,
  MIN_TEMP: -273,        // absolute zero
};

// ── Algorithm Implementation ────────────────────────────────────────

export class JohnsonCookModel implements Algorithm<JohnsonCookInput, JohnsonCookOutput> {

  validate(input: JohnsonCookInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (input.strain === undefined || input.strain < 0) {
      issues.push({ field: "strain", message: `Strain must be >= 0, got ${input.strain}`, severity: "error" });
    }
    if (input.strain > LIMITS.MAX_STRAIN) {
      issues.push({ field: "strain", message: `Strain ${input.strain} exceeds max ${LIMITS.MAX_STRAIN}`, severity: "warning" });
    }
    if (input.strain_rate === undefined || input.strain_rate < LIMITS.MIN_STRAIN_RATE) {
      issues.push({ field: "strain_rate", message: `Strain rate must be >= ${LIMITS.MIN_STRAIN_RATE}, got ${input.strain_rate}`, severity: "error" });
    }
    if (!input.A || input.A < LIMITS.MIN_A || input.A > LIMITS.MAX_A) {
      issues.push({ field: "A", message: `A must be ${LIMITS.MIN_A}-${LIMITS.MAX_A} MPa, got ${input.A}`, severity: "error" });
    }
    if (input.B === undefined || input.B < 0) {
      issues.push({ field: "B", message: `B must be >= 0, got ${input.B}`, severity: "error" });
    }
    if (input.n === undefined || input.n < 0 || input.n > 2) {
      issues.push({ field: "n", message: `n must be 0-2, got ${input.n}`, severity: "error" });
    }
    if (input.C === undefined || input.C < 0 || input.C > 1) {
      issues.push({ field: "C", message: `C must be 0-1, got ${input.C}`, severity: "error" });
    }
    if (input.m === undefined || input.m < 0 || input.m > 5) {
      issues.push({ field: "m", message: `m must be 0-5, got ${input.m}`, severity: "error" });
    }
    if (!input.T_melt || input.T_melt < 100) {
      issues.push({ field: "T_melt", message: `T_melt must be >= 100°C, got ${input.T_melt}`, severity: "error" });
    }
    if (input.temperature !== undefined && input.T_melt && input.temperature >= input.T_melt) {
      issues.push({ field: "temperature", message: `Temperature ${input.temperature}°C >= T_melt ${input.T_melt}°C`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: JohnsonCookInput): JohnsonCookOutput {
    const warnings: string[] = [];
    const {
      A, B, n, C, m, T_melt,
      T_ref = 25,
      strain_rate_ref = 1.0,
    } = input;

    let strain = input.strain;
    let strain_rate = input.strain_rate;
    const temperature = input.temperature;

    // Clamp strain to avoid numerical issues
    strain = Math.max(strain, LIMITS.MIN_STRAIN);

    // Strain hardening term: [A + B·ε^n]
    const strain_term = A + B * Math.pow(strain, n);

    // Strain rate term: [1 + C·ln(ε̇/ε̇₀)]
    const rate_ratio = Math.max(strain_rate / strain_rate_ref, 1);
    const rate_term = 1 + C * Math.log(rate_ratio);

    // Thermal softening term: [1 - T*^m]
    let thermal_term = 1.0;
    let T_star = 0;
    if (temperature > T_ref) {
      T_star = Math.min((temperature - T_ref) / (T_melt - T_ref), 0.999);
      thermal_term = 1 - Math.pow(T_star, m);
      if (temperature > T_melt * 0.9) {
        warnings.push(`Temperature ${temperature}°C near melting ${T_melt}°C — thermal softening dominant`);
      }
    }

    // Combined flow stress
    let stress = strain_term * rate_term * thermal_term;

    // Safety clamp
    if (stress > LIMITS.MAX_STRESS) {
      warnings.push(`Stress ${stress.toFixed(0)} MPa exceeds limit, capped at ${LIMITS.MAX_STRESS}`);
      stress = LIMITS.MAX_STRESS;
    }
    stress = Math.max(stress, 0);

    // Warnings for extreme conditions
    if (strain_rate > 1e6) {
      warnings.push(`Very high strain rate (${strain_rate.toExponential(1)} /s) — J-C model may lose accuracy`);
    }
    if (T_star > 0.8) {
      warnings.push(`High homologous temperature T*=${T_star.toFixed(2)} — near-melt behavior`);
    }

    return {
      stress: Math.round(stress * 10) / 10,
      strain_term: Math.round(strain_term * 10) / 10,
      rate_term: Math.round(rate_term * 10000) / 10000,
      thermal_term: Math.round(thermal_term * 10000) / 10000,
      T_star: Math.round(T_star * 10000) / 10000,
      warnings,
      calculation_method: "Johnson-Cook (σ = [A+Bε^n][1+C·ln(ε̇*)][1-T*^m])",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "johnson-cook",
      name: "Johnson-Cook Constitutive Flow Stress Model",
      description: "Predicts flow stress from strain, strain rate, and temperature",
      formula: "σ = [A + B·ε^n] × [1 + C·ln(ε̇/ε̇₀)] × [1 - T*^m]",
      reference: "Johnson & Cook (1983); Altintas (2012) Ch.2",
      safety_class: "standard",
      domain: "material",
      inputs: {
        strain: "Plastic strain [-]",
        strain_rate: "Strain rate [1/s]",
        temperature: "Temperature [°C]",
        A: "Yield strength [MPa]",
        B: "Strain hardening coefficient [MPa]",
        n: "Strain hardening exponent [-]",
        C: "Strain rate sensitivity [-]",
        m: "Thermal softening exponent [-]",
        T_melt: "Melting temperature [°C]",
      },
      outputs: {
        stress: "Flow stress [MPa]",
        strain_term: "Strain hardening [MPa]",
        rate_term: "Strain rate factor [-]",
        thermal_term: "Thermal softening factor [-]",
      },
    };
  }
}
