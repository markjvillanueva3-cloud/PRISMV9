/**
 * WEDMWireTensionOptimizerEngine — Optimal wire tension for geometry + material
 * WEDM-BIZ-MS0 / U-WB05
 *
 * Given part geometry, material, and thickness, recommends optimal wire
 * tension that balances:
 *   1. Deflection accuracy — higher tension reduces bowing under discharge force
 *        δ_mid ≈ F × L / (2 × T) for a tensioned-string midspan load
 *   2. Wire break risk — higher tension increases mechanical stress toward UTS
 *   3. Corner fidelity — tighter tension reduces lag at direction changes
 *   4. Taper cutting — angular stability requires tension within a window
 *
 * Optimization objective (weighted):
 *   J(T) = w_a × accuracy_penalty(T) + w_s × safety_penalty(T)
 *        + w_c × corner_penalty(T) + w_t × taper_penalty(T)
 *
 * Accuracy penalty uses a log-normal decay with tension.
 * Safety penalty uses stress_ratio from the stress-analysis engine.
 * Corner penalty is proportional to corner_lag (EDM_PHYSICS.corner_lag).
 * Taper penalty widens outside the "sweet-spot" band for the wire gauge.
 *
 * Geometry complexity drives weight selection:
 *   - Simple profile (few corners, no taper) → weight accuracy heavily
 *   - Complex profile (many corners, tight radii) → weight corner lag
 *   - Taper cuts → weight taper band strictly
 *
 * Physics sources:
 *   - Dauw & Albert 1992 — CIRP: wire tension vs deflection
 *   - Mitsubishi corner control white paper
 *   - GF Charmilles Robofil application guide
 *   - Bedra / Thermocompact wire catalogs
 *
 * @module engines/WEDMWireTensionOptimizerEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";
import {
  wedmWireStressAnalysisEngine,
  WIRE_MECHANICAL_PROPERTIES,
} from "./WEDMWireStressAnalysisEngine.js";

// ============================================================================
// MATERIAL HARDNESS SCALING
// ============================================================================

/**
 * Tension scaling factor by workpiece material.
 * Harder materials generate higher discharge reaction forces →
 * require more tension to keep wire straight.
 * Values are multipliers applied to the baseline 0.25 mm brass target.
 */
export const MATERIAL_HARDNESS_FACTOR: Record<string, number> = {
  steel: 1.00, // baseline (mild / 1018)
  tool_steel: 1.10,
  stainless: 1.05,
  aluminum: 0.80, // less reaction force
  titanium: 1.15,
  inconel: 1.25,
  tungsten_carbide: 1.30, // very high — hardest
  pcd: 1.20,
  copper: 0.75,
  graphite: 0.70,
};

// ============================================================================
// GEOMETRY COMPLEXITY
// ============================================================================

export type GeometryComplexity = "simple" | "moderate" | "complex" | "ultra_precision";

/**
 * Complexity→weight mapping. Weights sum to 1.0 per complexity class.
 */
export const COMPLEXITY_WEIGHTS: Record<
  GeometryComplexity,
  { accuracy: number; safety: number; corner: number; taper: number }
> = {
  simple: { accuracy: 0.35, safety: 0.35, corner: 0.15, taper: 0.15 },
  moderate: { accuracy: 0.30, safety: 0.30, corner: 0.25, taper: 0.15 },
  complex: { accuracy: 0.25, safety: 0.20, corner: 0.35, taper: 0.20 },
  ultra_precision: { accuracy: 0.40, safety: 0.15, corner: 0.25, taper: 0.20 },
};

// ============================================================================
// TYPES
// ============================================================================

export interface TensionOptimizerInput {
  /** Wire material */
  wire_material: keyof typeof WIRE_MECHANICAL_PROPERTIES | string;
  /** Wire diameter [mm] */
  wire_diameter_mm: number;
  /** Workpiece material */
  workpiece_material: keyof typeof MATERIAL_HARDNESS_FACTOR | string;
  /** Workpiece thickness (wire span) [mm] */
  thickness_mm: number;
  /** Geometry complexity classification */
  geometry_complexity?: GeometryComplexity;
  /** Number of corners in profile (used if complexity omitted) */
  corner_count?: number;
  /** Minimum inside corner radius [mm] (0 = sharp) */
  min_corner_radius_mm?: number;
  /** Taper angle [deg] (0 = straight cut) */
  taper_angle_deg?: number;
  /** Peak discharge current [A] */
  peak_current_A: number;
  /** Pulse on-time [µs] */
  pulse_on_us: number;
  /** Duty cycle */
  duty_cycle: number;
  /** Discharge force per amp [N/A] (default 0.15) */
  force_per_amp?: number;
  /** Target cut-time [min] for fatigue margin calculation */
  target_life_min?: number;
}

export interface TensionOptimizerResult {
  optimal_tension_N: number;
  geometry_complexity: GeometryComplexity;
  weights_used: { accuracy: number; safety: number; corner: number; taper: number };
  tension_envelope: {
    min_viable_N: number;
    max_safe_N: number;
    sweet_spot_low_N: number;
    sweet_spot_high_N: number;
  };
  predicted_deflection_um: number;
  stress_ratio_at_optimal: number;
  wire_life_min: number;
  corner_lag_ms: number;
  accuracy_grade: "A" | "B" | "C" | "D";
  /** Full trade-off curve across the tension range */
  trade_off_curve: Array<{
    tension_N: number;
    deflection_um: number;
    stress_ratio: number;
    corner_lag_ms: number;
    composite_cost: number;
  }>;
  recommendations: string[];
  warnings: string[];
}

export interface ComplexityClassificationInput {
  corner_count: number;
  min_corner_radius_mm: number;
  taper_angle_deg: number;
  thickness_mm: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWireTensionOptimizerEngine {
  /**
   * Recommend optimal wire tension.
   */
  optimize(input: TensionOptimizerInput): TensionOptimizerResult {
    this.validateInput(input);

    const complexity =
      input.geometry_complexity ??
      this.classifyComplexity({
        corner_count: input.corner_count ?? 0,
        min_corner_radius_mm: input.min_corner_radius_mm ?? 10,
        taper_angle_deg: input.taper_angle_deg ?? 0,
        thickness_mm: input.thickness_mm,
      });
    const weights = COMPLEXITY_WEIGHTS[complexity];

    // Envelope
    const max_safe_N = this.getMaxSafeTension(input.wire_diameter_mm);
    const min_viable_N = Math.max(1, max_safe_N * 0.08); // ~8% of max for servo stability
    const sweet_spot_low_N = max_safe_N * 0.35;
    const sweet_spot_high_N = max_safe_N * 0.75;

    // Discharge force estimate
    const force_per_amp = input.force_per_amp ?? 0.15; // N/A (Dauw & Albert)
    const avg_force_N = force_per_amp * input.peak_current_A * input.duty_cycle;

    // Material hardness factor
    const hardness_factor = this.resolveHardnessFactor(input.workpiece_material);

    // Sweep tension
    const steps = 40;
    const trade_off_curve: TensionOptimizerResult["trade_off_curve"] = [];
    let best_cost = Infinity;
    let best_tension = sweet_spot_low_N;
    let best_deflection = 0;
    let best_stress_ratio = 0;
    let best_corner_lag = 0;
    let best_life = 0;

    for (let i = 0; i <= steps; i++) {
      const T = min_viable_N + ((max_safe_N * 0.95 - min_viable_N) * i) / steps;

      // Deflection: δ = F × L / (2 × T) (tensioned-string midspan)
      const deflection_mm = (avg_force_N * hardness_factor * input.thickness_mm) / (2 * T);
      const deflection_um = deflection_mm * 1000;

      // Stress / life from analysis engine
      const stressResult = wedmWireStressAnalysisEngine.analyze({
        wire_material: input.wire_material,
        wire_diameter_mm: input.wire_diameter_mm,
        tension_N: T,
        wire_span_mm: input.thickness_mm,
        peak_current_A: input.peak_current_A,
        pulse_on_us: input.pulse_on_us,
        duty_cycle: input.duty_cycle,
      });
      const stress_ratio = stressResult.stress_ratio;

      // Corner lag: response_time × feed_rate proxy
      // Response time from EDM_PHYSICS by tension band
      const corner_lag_ms = this.estimateCornerLag(T);

      // Cost components (all normalized to [0, ~1])
      const accuracy_penalty = Math.min(1, deflection_um / 25); // target <25 µm
      const safety_penalty = Math.min(1, Math.pow(stress_ratio / 0.5, 2));
      const corner_penalty =
        (input.corner_count ?? 0) > 0
          ? Math.min(1, corner_lag_ms / 25) // 25 ms baseline
          : 0;
      const taper_penalty =
        Math.abs(input.taper_angle_deg ?? 0) > 0.1
          ? this.taperPenalty(T, sweet_spot_low_N, sweet_spot_high_N)
          : 0;

      const composite_cost =
        weights.accuracy * accuracy_penalty +
        weights.safety * safety_penalty +
        weights.corner * corner_penalty +
        weights.taper * taper_penalty;

      trade_off_curve.push({
        tension_N: T,
        deflection_um,
        stress_ratio,
        corner_lag_ms,
        composite_cost,
      });

      if (composite_cost < best_cost) {
        best_cost = composite_cost;
        best_tension = T;
        best_deflection = deflection_um;
        best_stress_ratio = stress_ratio;
        best_corner_lag = corner_lag_ms;
        best_life = stressResult.time_to_failure_min;
      }
    }

    // Grade
    const accuracy_grade = this.gradeAccuracy(best_deflection);

    // Recommendations / warnings
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (best_tension < sweet_spot_low_N) {
      recommendations.push(
        `Operating below sweet-spot low (${sweet_spot_low_N.toFixed(1)} N) — expect higher deflection`
      );
    }
    if (best_tension > sweet_spot_high_N) {
      warnings.push(
        `Operating near ${((best_tension / max_safe_N) * 100).toFixed(0)}% of max safe — monitor for wire breaks`
      );
    }
    if (best_deflection > 25) {
      warnings.push(
        `Predicted deflection ${best_deflection.toFixed(1)} µm exceeds precision threshold (25 µm)`
      );
    }
    if (best_stress_ratio > 0.5) {
      warnings.push(
        `Stress ratio ${best_stress_ratio.toFixed(2)} is high — consider reducing current or pulse-on`
      );
    }
    if ((input.target_life_min ?? 0) > 0 && best_life < (input.target_life_min ?? 0)) {
      warnings.push(
        `Predicted life ${best_life.toFixed(1)} min below target ${input.target_life_min} min`
      );
    }
    if (complexity === "ultra_precision" && accuracy_grade !== "A") {
      recommendations.push(
        `Ultra-precision complexity requires grade A — consider thicker wire or reduced current`
      );
    }
    if (complexity === "complex" && best_corner_lag > 18) {
      recommendations.push(
        `Complex geometry: increase tension or reduce feed to cut corner lag below 18 ms`
      );
    }

    return {
      optimal_tension_N: best_tension,
      geometry_complexity: complexity,
      weights_used: weights,
      tension_envelope: {
        min_viable_N,
        max_safe_N,
        sweet_spot_low_N,
        sweet_spot_high_N,
      },
      predicted_deflection_um: best_deflection,
      stress_ratio_at_optimal: best_stress_ratio,
      wire_life_min: best_life,
      corner_lag_ms: best_corner_lag,
      accuracy_grade,
      trade_off_curve,
      recommendations,
      warnings,
    };
  }

  /**
   * Classify geometry complexity from corner count, radius, taper, thickness.
   */
  classifyComplexity(input: ComplexityClassificationInput): GeometryComplexity {
    let score = 0;
    if (input.corner_count > 20) score += 3;
    else if (input.corner_count > 8) score += 2;
    else if (input.corner_count > 2) score += 1;

    if (input.min_corner_radius_mm < 0.1) score += 3;
    else if (input.min_corner_radius_mm < 0.5) score += 2;
    else if (input.min_corner_radius_mm < 2) score += 1;

    if (Math.abs(input.taper_angle_deg) > 10) score += 2;
    else if (Math.abs(input.taper_angle_deg) > 2) score += 1;

    if (input.thickness_mm > 100) score += 2;
    else if (input.thickness_mm > 50) score += 1;

    if (score >= 7) return "ultra_precision";
    if (score >= 4) return "complex";
    if (score >= 2) return "moderate";
    return "simple";
  }

  /**
   * Compare tension recommendations across multiple geometry scenarios.
   */
  compareScenarios(
    scenarios: Array<{ name: string; input: TensionOptimizerInput }>
  ): Array<{
    name: string;
    optimal_tension_N: number;
    stress_ratio: number;
    deflection_um: number;
    grade: string;
  }> {
    return scenarios.map(({ name, input }) => {
      const result = this.optimize(input);
      return {
        name,
        optimal_tension_N: result.optimal_tension_N,
        stress_ratio: result.stress_ratio_at_optimal,
        deflection_um: result.predicted_deflection_um,
        grade: result.accuracy_grade,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private getMaxSafeTension(diameter_mm: number): number {
    const s = EDM_PHYSICS.wire_safety;
    if (diameter_mm <= 0.22) return s.max_tension_0_20mm;
    if (diameter_mm <= 0.27) return s.max_tension_0_25mm;
    return s.max_tension_0_30mm;
  }

  private resolveHardnessFactor(mat: string): number {
    const k = mat.toLowerCase();
    for (const key of Object.keys(MATERIAL_HARDNESS_FACTOR)) {
      if (k.includes(key)) return MATERIAL_HARDNESS_FACTOR[key];
    }
    return 1.0;
  }

  private estimateCornerLag(tension_N: number): number {
    const r = EDM_PHYSICS.corner_lag.response_time_ms;
    if (tension_N < 11) return r.low;
    if (tension_N < 17) return r.medium;
    return r.high;
  }

  private taperPenalty(
    T: number,
    low_N: number,
    high_N: number
  ): number {
    if (T >= low_N && T <= high_N) return 0;
    if (T < low_N) return Math.min(1, (low_N - T) / low_N);
    return Math.min(1, (T - high_N) / high_N);
  }

  private gradeAccuracy(deflection_um: number): "A" | "B" | "C" | "D" {
    if (deflection_um <= 5) return "A";
    if (deflection_um <= 15) return "B";
    if (deflection_um <= 30) return "C";
    return "D";
  }

  private validateInput(input: TensionOptimizerInput): void {
    if (!Number.isFinite(input.wire_diameter_mm) || input.wire_diameter_mm <= 0)
      throw new Error("wire_diameter_mm must be positive finite");
    if (!Number.isFinite(input.thickness_mm) || input.thickness_mm <= 0)
      throw new Error("thickness_mm must be positive finite");
    if (!Number.isFinite(input.peak_current_A) || input.peak_current_A <= 0)
      throw new Error("peak_current_A must be positive finite");
    if (!Number.isFinite(input.pulse_on_us) || input.pulse_on_us <= 0)
      throw new Error("pulse_on_us must be positive finite");
    if (
      !Number.isFinite(input.duty_cycle) ||
      input.duty_cycle <= 0 ||
      input.duty_cycle > 1
    )
      throw new Error("duty_cycle must be in (0, 1]");
  }
}

export const wedmWireTensionOptimizerEngine = new WEDMWireTensionOptimizerEngine();
