/**
 * WEDMDielectricFlushAdjustEngine — Dielectric Conductivity → Flush Pressure
 * P2P-FULLSTACK-MS0 / U-P2PFS40
 *
 * Purpose
 * -------
 * Takes a baseline flush pressure (from thickness/material/pass) and *adjusts*
 * it for the actual measured dielectric conductivity (µS/cm) and temperature.
 * As DI water saturates the resin column, σ climbs; debris eviction suffers
 * and wire-break risk rises. Compensating with higher flush pressure is the
 * primary operator response. This engine formalizes that adjustment and
 * emits a 4-tier status plus resin-exchange urgency.
 *
 * Physics
 * -------
 * Piecewise-linear multiplicative factors on top of baseline pressure:
 *
 *   k_cond  = 1 + max(0, σ − σ_opt) × s_σ
 *   k_temp  = 1 + max(0, T_C − T_ref) × s_T
 *   k_thick = 1 + b_thick     if thickness > thick_threshold, else 1
 *
 *   P_adj   = clamp(P_base × k_cond × k_temp × k_thick,
 *                   P_base × min_factor,
 *                   P_base × max_factor)
 *
 * All constants live in src/physics/wedm-constants.ts (WEDM_DIELECTRIC_SPEC).
 *
 * Sources
 * -------
 *   • Mitsubishi MV1200S Operator Manual §4.2 (dielectric QC & flush tables)
 *   • Sodick VL400Q Maintenance Guide §3.7 (resin/filter life)
 *   • Kunieda et al. 2005 CIRP Annals (flushing physics, debris eviction)
 *   • JM Die QC logs 2024 (resin column exchange intervals)
 */

import { WEDM_DIELECTRIC_SPEC } from "../physics/wedm-constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DielectricFlushAdjustInput {
  /** Baseline flush pressure from upstream calc (bar). */
  baseline_flush_pressure_bar: number;
  /** Measured dielectric conductivity (µS/cm). */
  conductivity_uS_cm: number;
  /** Part thickness (mm). Optional — enables thick-section boost. */
  thickness_mm?: number;
  /** Dielectric temperature (°C). Defaults to 20 (reference). */
  dielectric_temp_C?: number;
}

export type ConductivityStatus =
  | "optimal"
  | "acceptable"
  | "degraded"
  | "out_of_spec";

export type ResinExchangeUrgency = "none" | "recommended" | "required";

export interface DielectricFlushAdjustResult {
  baseline_flush_pressure_bar: number;
  adjusted_flush_pressure_bar: number;
  conductivity_factor: number;
  temperature_factor: number;
  thick_section_factor: number;
  total_factor: number;
  conductivity_status: ConductivityStatus;
  resin_exchange_urgency: ResinExchangeUrgency;
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMDielectricFlushAdjustEngine {
  /**
   * Compute the adjusted flush pressure plus status classifications.
   * Throws on non-positive baseline pressure or negative conductivity.
   */
  calculate(input: DielectricFlushAdjustInput): DielectricFlushAdjustResult {
    this.validate(input);

    const {
      baseline_flush_pressure_bar,
      conductivity_uS_cm,
      thickness_mm,
      dielectric_temp_C = WEDM_DIELECTRIC_SPEC.reference_temp_C,
    } = input;

    const spec = WEDM_DIELECTRIC_SPEC;

    // Conductivity factor: grows with excess above optimum.
    const conductivityExcess = Math.max(
      0,
      conductivity_uS_cm - spec.optimal_conductivity_uS_cm,
    );
    const conductivity_factor = 1 + conductivityExcess * spec.pressure_sensitivity_per_uS_cm;

    // Temperature factor: grows with excess above 20 °C reference.
    const tempExcess = Math.max(0, dielectric_temp_C - spec.reference_temp_C);
    const temperature_factor = 1 + tempExcess * spec.temp_sensitivity_per_C;

    // Thick section boost: >60 mm gets a flat additive on the multiplier.
    const thick_section_factor =
      thickness_mm != null && thickness_mm > spec.thick_section_threshold_mm
        ? 1 + spec.thick_section_boost
        : 1;

    const raw_total_factor = conductivity_factor * temperature_factor * thick_section_factor;
    const total_factor = Math.max(
      spec.min_pressure_factor,
      Math.min(spec.max_pressure_factor, raw_total_factor),
    );

    const adjusted_flush_pressure_bar = round3(
      baseline_flush_pressure_bar * total_factor,
    );

    const conductivity_status = this.classifyConductivity(conductivity_uS_cm);
    const resin_exchange_urgency = this.classifyResinUrgency(conductivity_status);

    const warnings = this.buildWarnings(
      conductivity_uS_cm,
      dielectric_temp_C,
      conductivity_status,
      raw_total_factor,
    );
    const recommendations = this.buildRecommendations(
      conductivity_status,
      resin_exchange_urgency,
      dielectric_temp_C,
      thickness_mm,
    );

    return {
      baseline_flush_pressure_bar: round3(baseline_flush_pressure_bar),
      adjusted_flush_pressure_bar,
      conductivity_factor: round4(conductivity_factor),
      temperature_factor: round4(temperature_factor),
      thick_section_factor: round4(thick_section_factor),
      total_factor: round4(total_factor),
      conductivity_status,
      resin_exchange_urgency,
      warnings,
      recommendations,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────

  private validate(input: DielectricFlushAdjustInput): void {
    const { baseline_flush_pressure_bar, conductivity_uS_cm, thickness_mm, dielectric_temp_C } = input;
    if (!(baseline_flush_pressure_bar > 0)) {
      throw new Error(
        `Invalid baseline_flush_pressure_bar: ${baseline_flush_pressure_bar} — must be > 0`,
      );
    }
    if (!(conductivity_uS_cm >= 0)) {
      throw new Error(
        `Invalid conductivity_uS_cm: ${conductivity_uS_cm} — must be >= 0`,
      );
    }
    if (thickness_mm != null && !(thickness_mm > 0)) {
      throw new Error(
        `Invalid thickness_mm: ${thickness_mm} — must be > 0 when provided`,
      );
    }
    if (dielectric_temp_C != null && !(dielectric_temp_C >= 0 && dielectric_temp_C <= 100)) {
      throw new Error(
        `Invalid dielectric_temp_C: ${dielectric_temp_C} — must be in [0, 100] °C when provided`,
      );
    }
  }

  private classifyConductivity(sigma: number): ConductivityStatus {
    const s = WEDM_DIELECTRIC_SPEC;
    if (sigma <= s.optimal_conductivity_uS_cm + 3) return "optimal"; // up to ~8 µS/cm
    if (sigma <= s.acceptable_uS_cm_max) return "acceptable"; // up to 15
    if (sigma <= s.degraded_uS_cm_max) return "degraded"; // up to 25
    return "out_of_spec"; // > 25
  }

  private classifyResinUrgency(status: ConductivityStatus): ResinExchangeUrgency {
    switch (status) {
      case "optimal":
      case "acceptable":
        return "none";
      case "degraded":
        return "recommended";
      case "out_of_spec":
        return "required";
    }
  }

  private buildWarnings(
    sigma: number,
    temp_C: number,
    status: ConductivityStatus,
    raw_factor: number,
  ): string[] {
    const warnings: string[] = [];
    const spec = WEDM_DIELECTRIC_SPEC;

    if (status === "out_of_spec") {
      warnings.push(
        `Conductivity ${sigma.toFixed(1)} µS/cm exceeds ${spec.degraded_uS_cm_max} µS/cm spec — resin exchange required before precision work.`,
      );
    } else if (status === "degraded") {
      warnings.push(
        `Conductivity ${sigma.toFixed(1)} µS/cm is degraded (>${spec.acceptable_uS_cm_max} µS/cm) — spark fidelity and Ra will suffer.`,
      );
    }

    if (temp_C > spec.temp_ceiling_C) {
      warnings.push(
        `Dielectric temperature ${temp_C.toFixed(1)} °C exceeds ${spec.temp_ceiling_C} °C — engage chiller before long cuts.`,
      );
    }

    if (raw_factor > spec.max_pressure_factor) {
      warnings.push(
        `Required pressure multiplier ${raw_factor.toFixed(2)}× exceeds safe cap ${spec.max_pressure_factor}× — clamp engaged; address root cause (resin + temperature) rather than overdriving pump.`,
      );
    }

    return warnings;
  }

  private buildRecommendations(
    status: ConductivityStatus,
    urgency: ResinExchangeUrgency,
    temp_C: number,
    thickness_mm: number | undefined,
  ): string[] {
    const recs: string[] = [];
    const spec = WEDM_DIELECTRIC_SPEC;

    if (urgency === "required") {
      recs.push("STOP: exchange resin column before starting precision work.");
    } else if (urgency === "recommended") {
      recs.push("Schedule resin exchange within the next maintenance window.");
    }

    if (status === "optimal") {
      recs.push("Dielectric within precision-work optimum — proceed with baseline parameters.");
    } else if (status === "acceptable") {
      recs.push("Dielectric acceptable for production — monitor conductivity at 2-hour intervals.");
    }

    if (temp_C > spec.reference_temp_C + 5) {
      recs.push(
        `Lower dielectric temperature toward ${spec.reference_temp_C} °C to reduce conductivity drift.`,
      );
    }

    if (thickness_mm != null && thickness_mm > spec.thick_section_threshold_mm) {
      recs.push(
        `Thick section (${thickness_mm.toFixed(0)} mm > ${spec.thick_section_threshold_mm} mm) — verify upper/lower flushing nozzles are aligned.`,
      );
    }

    if (recs.length === 0) {
      recs.push("No adjustment action required.");
    }
    return recs;
  }
}

// Round helpers keep output stable for snapshot tests without altering ordering.
function round3(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x;
}
function round4(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 10000) / 10000 : x;
}

// Singleton for convenience; matches the pattern used by sibling WEDM engines.
export const wedmDielectricFlushAdjustEngine = new WEDMDielectricFlushAdjustEngine();
