/**
 * Kienzle Specific Cutting Force Model
 *
 * Implements the Kienzle equation for cutting force prediction:
 *   Fc = kc1.1 × b × h^(1-mc)
 *
 * With extensions:
 * - Rake angle correction (Sandvik standard)
 * - 3-component force decomposition (tangential, feed, radial)
 * - Multi-tooth engaged-teeth averaging (Martellotti mean chip thickness)
 * - ISO material group force ratios (Altintas Table 2.2)
 * - Uncertainty bounds (±15% verified, ±25% estimated)
 *
 * SAFETY-CRITICAL: Cutting force predictions directly affect tool load,
 * machine power requirements, and stability margins.
 *
 * References:
 * - Kienzle, O. (1952). "Die Bestimmung von Kräften und Leistungen..."
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.2
 * - Sandvik Coromant Technical Guide
 *
 * @module algorithms/KienzleForceModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
  UncertaintyBand,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface KienzleInput {
  /** Specific cutting force at h=1mm, b=1mm [N/mm²]. */
  kc1_1: number;
  /** Kienzle exponent (typically 0.15-0.35). */
  mc: number;
  /** Feed per tooth [mm/tooth] (or feed per rev for turning). */
  feed_per_tooth: number;
  /** Axial depth of cut [mm]. */
  axial_depth: number;
  /** Radial depth of cut [mm]. */
  radial_depth: number;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Number of teeth/flutes. */
  number_of_teeth: number;
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Rake angle [degrees] (default 6). */
  rake_angle?: number;
  /** ISO material group: N, P, M, K, S, H (default "P"). */
  iso_group?: string;
  /** Data quality: "verified" or "estimated" (default "estimated"). */
  data_quality?: "verified" | "estimated";
}

export interface KienzleOutput extends WithWarnings {
  /** Main cutting force [N]. */
  Fc: number;
  /** Feed force [N]. */
  Ff: number;
  /** Passive/radial force [N]. */
  Fp: number;
  /** Resultant force [N]. */
  F_resultant: number;
  /** Specific cutting force kc [N/mm²]. */
  specific_force: number;
  /** Mean chip thickness h [mm]. */
  chip_thickness: number;
  /** Chip width b [mm]. */
  chip_width: number;
  /** Cutting power [kW]. */
  power: number;
  /** Torque [Nm]. */
  torque: number;
  /** Force component ratios by ISO group. */
  force_ratios: { Ff_over_Fc: number; Fp_over_Fc: number; iso_group: string };
  /** Uncertainty band on Fc. */
  uncertainty: UncertaintyBand;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_FORCE: 50000,        // N
  MAX_POWER: 200,          // kW
  MAX_CUTTING_SPEED: 2000, // m/min
  MIN_CUTTING_SPEED: 1,
  MAX_FEED: 2.0,           // mm/tooth
  MIN_FEED: 0.001,
  MAX_DEPTH: 100,          // mm
  MIN_DEPTH: 0.01,
  MAX_KC1_1: 10000,        // N/mm²
  MIN_KC1_1: 50,
};

// ISO group → [Ff/Fc, Fp/Fc] ratios (Altintas Table 2.2)
const FORCE_RATIOS: Record<string, [number, number]> = {
  N: [0.3, 0.2], P: [0.4, 0.3], M: [0.45, 0.35],
  K: [0.35, 0.25], S: [0.5, 0.4], H: [0.35, 0.4], X: [0.4, 0.3],
};

// ── Algorithm Implementation ────────────────────────────────────────

export class KienzleForceModel implements Algorithm<KienzleInput, KienzleOutput> {

  validate(input: KienzleInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.kc1_1 || input.kc1_1 < LIMITS.MIN_KC1_1 || input.kc1_1 > LIMITS.MAX_KC1_1) {
      issues.push({ field: "kc1_1", message: `kc1.1 must be ${LIMITS.MIN_KC1_1}-${LIMITS.MAX_KC1_1} N/mm², got ${input.kc1_1}`, severity: "error" });
    }
    if (input.mc === undefined || input.mc < 0 || input.mc > 1) {
      issues.push({ field: "mc", message: `mc must be 0-1, got ${input.mc}`, severity: "error" });
    }
    if (!input.feed_per_tooth || input.feed_per_tooth < LIMITS.MIN_FEED || input.feed_per_tooth > LIMITS.MAX_FEED) {
      issues.push({ field: "feed_per_tooth", message: `Feed must be ${LIMITS.MIN_FEED}-${LIMITS.MAX_FEED} mm/tooth, got ${input.feed_per_tooth}`, severity: "error" });
    }
    if (!input.axial_depth || input.axial_depth < LIMITS.MIN_DEPTH || input.axial_depth > LIMITS.MAX_DEPTH) {
      issues.push({ field: "axial_depth", message: `Axial depth must be ${LIMITS.MIN_DEPTH}-${LIMITS.MAX_DEPTH} mm, got ${input.axial_depth}`, severity: "error" });
    }
    if (!input.radial_depth || input.radial_depth < LIMITS.MIN_DEPTH) {
      issues.push({ field: "radial_depth", message: `Radial depth must be >= ${LIMITS.MIN_DEPTH} mm, got ${input.radial_depth}`, severity: "error" });
    }
    if (!input.tool_diameter || input.tool_diameter <= 0) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be > 0, got ${input.tool_diameter}`, severity: "error" });
    }
    if (!input.number_of_teeth || input.number_of_teeth < 1) {
      issues.push({ field: "number_of_teeth", message: `Number of teeth must be >= 1, got ${input.number_of_teeth}`, severity: "error" });
    }
    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_CUTTING_SPEED || input.cutting_speed > LIMITS.MAX_CUTTING_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_CUTTING_SPEED}-${LIMITS.MAX_CUTTING_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    if (input.radial_depth && input.tool_diameter && input.radial_depth > input.tool_diameter) {
      issues.push({ field: "radial_depth", message: `Radial depth (${input.radial_depth}) exceeds tool diameter (${input.tool_diameter})`, severity: "warning" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: KienzleInput): KienzleOutput {
    const warnings: string[] = [];
    const {
      kc1_1, mc, feed_per_tooth, axial_depth, radial_depth,
      tool_diameter, number_of_teeth, cutting_speed,
      rake_angle = 6, iso_group = "P", data_quality = "estimated",
    } = input;

    // Chip geometry
    const engagement_ratio = Math.min(radial_depth / tool_diameter, 1.0);
    let h_mean: number;

    if (number_of_teeth === 1) {
      // Single-point (turning/boring): h = feed directly
      h_mean = feed_per_tooth;
    } else {
      // Multi-tooth (milling): Martellotti mean chip thickness
      // h_mean = fz × (1 - cos(φ_e)) / φ_e where φ_e = arccos(1 - 2·ae/D)
      const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
      h_mean = phi_e > 0.001
        ? feed_per_tooth * (1 - Math.cos(phi_e)) / phi_e
        : feed_per_tooth;
    }

    const b = axial_depth;
    const h = Math.max(h_mean, 0.001);

    // Kienzle specific cutting force: kc = kc1.1 × h^(-mc)
    const kc = kc1_1 * Math.pow(h, -mc);

    // Rake angle correction (Sandvik): factor = 1 - 0.01 × γ
    const rake_correction = 1 - 0.01 * rake_angle;

    // Engaged teeth for milling: z_e = z × φ_e / (2π)
    let z_e = 1;
    if (number_of_teeth > 1) {
      const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
      z_e = Math.max(number_of_teeth * phi_e / (2 * Math.PI), 0.1);
    }

    // Main cutting force
    const Fc_single = kc * b * h * rake_correction;
    const Fc_raw = Fc_single * z_e;

    // 3-component decomposition by ISO group
    const [ffRatio, fpRatio] = FORCE_RATIOS[iso_group] || FORCE_RATIOS.P;
    const Ff = Fc_raw * ffRatio;
    const Fp = Fc_raw * fpRatio;
    const F_resultant = Math.sqrt(Fc_raw ** 2 + Ff ** 2 + Fp ** 2);

    // Safety cap
    const Fc = Math.min(Fc_raw, LIMITS.MAX_FORCE);
    if (Fc_raw > LIMITS.MAX_FORCE) {
      warnings.push(`Force ${Fc_raw.toFixed(0)}N exceeds limit, capped at ${LIMITS.MAX_FORCE}N`);
    }

    // Power and torque
    const power_raw = (Fc * cutting_speed) / 60000;
    const power = Math.min(power_raw, LIMITS.MAX_POWER);
    const torque = (Fc * tool_diameter) / 2000;

    // Warnings
    const kcInflation = kc / kc1_1;
    if (kcInflation > 3.0) {
      warnings.push(`KC_INFLATED: kc=${kc.toFixed(0)} is ${kcInflation.toFixed(1)}x kc1_1=${kc1_1}. Outside valid regime.`);
    } else if (kcInflation > 2.5) {
      warnings.push(`KC_ELEVATED: kc=${kc.toFixed(0)} is ${kcInflation.toFixed(1)}x kc1_1=${kc1_1}. Thin chip effect.`);
    }
    if (radial_depth >= tool_diameter * 0.99) {
      warnings.push(`FULL_SLOT: Full slotting detected (ae~=D). High tool load risk.`);
    }

    // Uncertainty bounds
    const uncertaintyPct = data_quality === "verified" ? 0.15 : 0.25;

    return {
      Fc, Ff, Fp, F_resultant,
      specific_force: kc,
      chip_thickness: h,
      chip_width: b,
      power, torque, warnings,
      force_ratios: { Ff_over_Fc: ffRatio, Fp_over_Fc: fpRatio, iso_group },
      uncertainty: {
        nominal: Fc,
        low: Fc * (1 - uncertaintyPct),
        high: Fc * (1 + uncertaintyPct),
        confidence: data_quality === "verified" ? 0.85 : 0.70,
        source: data_quality,
      },
      calculation_method: "Kienzle (Fc = kc1.1 × b × h^(1-mc))",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "kienzle",
      name: "Kienzle Specific Cutting Force Model",
      description: "Predicts cutting forces from specific cutting force coefficient and chip geometry",
      formula: "Fc = kc1.1 × b × h^(1-mc)",
      reference: "Kienzle (1952); Altintas 'Manufacturing Automation' (2012) Ch.2",
      safety_class: "critical",
      domain: "force",
      inputs: {
        kc1_1: "Specific cutting force at h=1mm, b=1mm [N/mm²]",
        mc: "Kienzle exponent [-]",
        feed_per_tooth: "Feed per tooth [mm/tooth]",
        axial_depth: "Axial depth of cut [mm]",
        radial_depth: "Radial depth of cut [mm]",
        tool_diameter: "Tool diameter [mm]",
        number_of_teeth: "Number of flutes [-]",
        cutting_speed: "Cutting speed [m/min]",
      },
      outputs: {
        Fc: "Main cutting force [N]",
        Ff: "Feed force [N]",
        Fp: "Passive force [N]",
        power: "Cutting power [kW]",
        torque: "Torque [Nm]",
      },
    };
  }
}
