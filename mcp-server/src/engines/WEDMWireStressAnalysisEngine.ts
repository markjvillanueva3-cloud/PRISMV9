/**
 * WEDMWireStressAnalysisEngine — Combined mechanical fatigue + thermal stress
 * WEDM-BIZ-MS0 / U-WB04
 *
 * Combines three stress mechanisms acting on the EDM wire electrode:
 *   1. MECHANICAL TENSILE STRESS — from applied tension (servo)
 *       σ_t = F_tension / A_wire
 *   2. THERMAL STRESS — from Joule heating + spark thermal shock
 *       σ_th = E × α × ΔT   (fully-constrained wire)
 *   3. FATIGUE DAMAGE — cyclic loading from repeated sparks
 *       Basquin: N_f = (σ_f' / σ_a)^(1/b)
 *       Miner:   D  = Σ (n_i / N_fi)
 *
 * Combined stress (von Mises simplification for uniaxial + thermal):
 *       σ_eq = √(σ_t² + σ_th²)
 *
 * Validation targets (WEDM-BIZ-MS0 U-WB04):
 *   - Fatigue prediction within ±20% of Charmilles brass wire catalog
 *   - Thermal stress correlates with WEDMWireHeatingEngine ΔT
 *   - Wire life within ±20% of shop-floor observation
 *
 * Physics sources:
 *   - Basquin 1910 — S-N curve formulation
 *   - Rajurkar & Wang 1993 — wire breakage in WEDM
 *   - Kunieda et al. 2005 — advances in WEDM research
 *   - Bedra / Thermocompact wire datasheets — UTS, fatigue data
 *
 * @module engines/WEDMWireStressAnalysisEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// WIRE MATERIAL MECHANICAL PROPERTIES
// ============================================================================

/**
 * Mechanical properties of EDM wire materials.
 * Sources: Bedra catalog, Thermocompact technical guide, CES EduPack.
 */
export const WIRE_MECHANICAL_PROPERTIES: Record<
  string,
  {
    uts_MPa: number;
    yield_MPa: number;
    youngs_modulus_GPa: number;
    cte_per_K: number;
    fatigue_strength_coef_MPa: number;
    fatigue_strength_exp: number;
    density_kg_m3: number;
  }
> = {
  brass_cuzn37: {
    uts_MPa: 900, // cold-drawn EDM brass
    yield_MPa: 750,
    youngs_modulus_GPa: 105,
    cte_per_K: 20.5e-6,
    fatigue_strength_coef_MPa: 620,
    fatigue_strength_exp: -0.11,
    density_kg_m3: 8400,
  },
  brass_cuzn40: {
    uts_MPa: 950,
    yield_MPa: 800,
    youngs_modulus_GPa: 107,
    cte_per_K: 20.8e-6,
    fatigue_strength_coef_MPa: 650,
    fatigue_strength_exp: -0.11,
    density_kg_m3: 8450,
  },
  coated_brass: {
    uts_MPa: 1000, // zinc-coated brass, higher UTS due to coating reinforcement
    yield_MPa: 830,
    youngs_modulus_GPa: 108,
    cte_per_K: 21.0e-6,
    fatigue_strength_coef_MPa: 680,
    fatigue_strength_exp: -0.10,
    density_kg_m3: 8500,
  },
  zinc_coated: {
    uts_MPa: 1000,
    yield_MPa: 830,
    youngs_modulus_GPa: 108,
    cte_per_K: 21.0e-6,
    fatigue_strength_coef_MPa: 680,
    fatigue_strength_exp: -0.10,
    density_kg_m3: 8500,
  },
  diffusion_annealed: {
    uts_MPa: 1100,
    yield_MPa: 920,
    youngs_modulus_GPa: 110,
    cte_per_K: 21.0e-6,
    fatigue_strength_coef_MPa: 730,
    fatigue_strength_exp: -0.10,
    density_kg_m3: 8500,
  },
  molybdenum: {
    uts_MPa: 1900, // high-tensile moly for fine-wire applications
    yield_MPa: 1600,
    youngs_modulus_GPa: 329,
    cte_per_K: 4.8e-6,
    fatigue_strength_coef_MPa: 1250,
    fatigue_strength_exp: -0.09,
    density_kg_m3: 10200,
  },
  tungsten: {
    uts_MPa: 2800,
    yield_MPa: 2400,
    youngs_modulus_GPa: 411,
    cte_per_K: 4.5e-6,
    fatigue_strength_coef_MPa: 1850,
    fatigue_strength_exp: -0.08,
    density_kg_m3: 19300,
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface WireStressInput {
  /** Wire material type */
  wire_material: keyof typeof WIRE_MECHANICAL_PROPERTIES | string;
  /** Wire diameter [mm] */
  wire_diameter_mm: number;
  /** Applied wire tension [N] */
  tension_N: number;
  /** Wire span (workpiece thickness) [mm] */
  wire_span_mm: number;
  /** Peak discharge current [A] */
  peak_current_A: number;
  /** Pulse on-time [µs] */
  pulse_on_us: number;
  /** Duty cycle (0-1) */
  duty_cycle: number;
  /** Temperature rise from Joule heating [K] — typically from WEDMWireHeatingEngine */
  temp_rise_K?: number;
  /** Cumulative cut time on this wire [min] */
  cumulative_cut_time_min?: number;
  /** Wire feed speed [m/min] (for cycle count estimation) */
  wire_feed_m_min?: number;
  /** Ambient temperature [°C] */
  ambient_temp_C?: number;
}

export interface WireStressResult {
  /** Mechanical tensile stress from applied tension [MPa] */
  tensile_stress_MPa: number;
  /** Thermal stress from Joule heating [MPa] */
  thermal_stress_MPa: number;
  /** Spark thermal shock stress contribution [MPa] */
  thermal_shock_stress_MPa: number;
  /** Combined equivalent stress (von Mises) [MPa] */
  equivalent_stress_MPa: number;
  /** Stress ratio: σ_eq / UTS (should be < 0.3 for long life) */
  stress_ratio: number;
  /** Estimated cycles to failure (Basquin) */
  cycles_to_failure: number;
  /** Estimated time to failure [min] */
  time_to_failure_min: number;
  /** Wire life remaining [%] (100 = fresh, 0 = failed) */
  wire_life_remaining_pct: number;
  /** Recommended tension for balanced stress [N] */
  recommended_tension_N: number;
  /** Maximum safe tension for this material/diameter [N] */
  max_safe_tension_N: number;
  /** Safety flags */
  within_safe_limits: boolean;
  yielding_risk: boolean;
  fatigue_risk: "low" | "moderate" | "high" | "critical";
  /** Human-readable warning message */
  warning?: string;
  /** Source of recommendation */
  recommendation_rationale: string;
}

export interface TensionOptimizationInput {
  wire_material: keyof typeof WIRE_MECHANICAL_PROPERTIES | string;
  wire_diameter_mm: number;
  wire_span_mm: number;
  peak_current_A: number;
  pulse_on_us: number;
  duty_cycle: number;
  /** Target wire life [min] */
  target_life_min?: number;
}

export interface TensionOptimizationResult {
  optimal_tension_N: number;
  predicted_life_min: number;
  stress_ratio_at_optimal: number;
  tension_range: { min_N: number; max_N: number };
  trade_off_curve: Array<{
    tension_N: number;
    life_min: number;
    stress_ratio: number;
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWireStressAnalysisEngine {
  /**
   * Analyze combined mechanical + thermal stress on wire electrode.
   */
  analyze(input: WireStressInput): WireStressResult {
    this.validateInput(input);

    const material = this.resolveMaterial(input.wire_material);
    const props = WIRE_MECHANICAL_PROPERTIES[material];

    // Wire cross-section
    const radius_mm = input.wire_diameter_mm / 2;
    const area_mm2 = Math.PI * radius_mm * radius_mm;

    // 1. Mechanical tensile stress [MPa = N/mm²]
    const tensile_stress_MPa = input.tension_N / area_mm2;

    // 2. Thermal stress from steady Joule heating
    // σ_th = E × α × ΔT for fully-constrained wire
    // Wire is tensioned between guides — partial constraint (0.5 factor from clamping compliance)
    const tempRiseK = input.temp_rise_K ?? this.estimateTempRise(input);
    const constraint_factor = 0.5; // Sodick/Mitsubishi guide compliance data
    const thermal_stress_MPa =
      props.youngs_modulus_GPa * 1000 * props.cte_per_K * tempRiseK * constraint_factor;

    // 3. Spark thermal shock — localized, high-gradient stress from plasma impact
    // σ_shock ≈ E × α × ΔT_spark × impact_factor
    // Each spark creates ~3000K plasma hitting wire for pulse_on microseconds
    // Impact factor accounts for sub-surface penetration (Klocke 2013)
    const plasma_dT = 3000 * Math.sqrt(input.pulse_on_us / 10); // √t scaling
    const impact_factor = 0.015; // fraction of shock reaching sub-surface
    const thermal_shock_stress_MPa =
      props.youngs_modulus_GPa * 1000 * props.cte_per_K * plasma_dT * impact_factor;

    // 4. Combined equivalent stress (von Mises) — for yielding / static-strength checks
    // σ_eq = √(σ_t² + σ_th² + σ_shock²)
    const equivalent_stress_MPa = Math.sqrt(
      tensile_stress_MPa ** 2 +
        thermal_stress_MPa ** 2 +
        thermal_shock_stress_MPa ** 2
    );

    // 5. Stress ratio vs UTS
    const stress_ratio = equivalent_stress_MPa / props.uts_MPa;

    // 6. Fatigue decomposition:
    //    - Mean stress σ_m = steady tensile + steady thermal (Joule)
    //    - Amplitude σ_a = oscillating spark thermal shock (pulse-to-pulse)
    //    - Goodman correction for mean-stress effect:
    //         σ_a_eq = σ_a × σ_uts / (σ_uts − σ_m)
    //    - Basquin: N_f = (σ_f' / σ_a_eq)^(1/|b|)
    const mean_stress_MPa = Math.sqrt(
      tensile_stress_MPa ** 2 + thermal_stress_MPa ** 2
    );
    let stress_amplitude = thermal_shock_stress_MPa;
    // Guard against σ_m ≥ UTS (Goodman breakdown → instant failure)
    const goodman_denom = Math.max(1, props.uts_MPa - mean_stress_MPa);
    const stress_amplitude_eq =
      mean_stress_MPa >= props.uts_MPa
        ? props.uts_MPa // forced failure: amplitude = UTS
        : stress_amplitude * (props.uts_MPa / goodman_denom);

    let cycles_to_failure: number;
    if (stress_amplitude_eq < 1) {
      cycles_to_failure = 1e12; // effectively infinite life
    } else {
      cycles_to_failure = Math.pow(
        props.fatigue_strength_coef_MPa / stress_amplitude_eq,
        1 / Math.abs(props.fatigue_strength_exp)
      );
    }
    cycles_to_failure = Math.min(cycles_to_failure, 1e12);

    // 7. Time to failure
    // Each spark = one stress cycle (thermal shock pulse)
    // Spark frequency from duty cycle / pulse_on_time:
    //   T_cycle = pulse_on + pulse_off = pulse_on / duty  (since duty = t_on/(t_on+t_off))
    //   f = 1 / T_cycle
    const cycle_period_s = (input.pulse_on_us * 1e-6) / input.duty_cycle;
    const spark_freq_Hz = 1 / cycle_period_s;
    const spark_freq_per_min = Math.min(spark_freq_Hz * 60, 6e6); // cap at realistic max
    const time_to_failure_min = cycles_to_failure / spark_freq_per_min;

    // 8. Wire life remaining
    const consumed_min = input.cumulative_cut_time_min ?? 0;
    const wire_life_remaining_pct = Math.max(
      0,
      Math.min(100, 100 * (1 - consumed_min / time_to_failure_min))
    );

    // 9. Safety assessment
    const max_safe_tension_N = this.getMaxSafeTension(input.wire_diameter_mm);
    const yielding_risk = equivalent_stress_MPa > props.yield_MPa;
    const within_safe_limits = stress_ratio < 0.5 && !yielding_risk;

    let fatigue_risk: "low" | "moderate" | "high" | "critical";
    if (stress_ratio < 0.3) fatigue_risk = "low";
    else if (stress_ratio < 0.5) fatigue_risk = "moderate";
    else if (stress_ratio < 0.7) fatigue_risk = "high";
    else fatigue_risk = "critical";

    // 10. Recommended tension (optimize for 0.35 stress ratio — balances cut speed + life)
    const target_stress_ratio = 0.35;
    const target_eq_stress = target_stress_ratio * props.uts_MPa;
    const thermal_component_sq =
      thermal_stress_MPa ** 2 + thermal_shock_stress_MPa ** 2;
    const remaining_sq = Math.max(0, target_eq_stress ** 2 - thermal_component_sq);
    const recommended_tensile_stress = Math.sqrt(remaining_sq);
    let recommended_tension_N = recommended_tensile_stress * area_mm2;
    recommended_tension_N = Math.max(
      1, // minimum 1 N for servo stability
      Math.min(recommended_tension_N, max_safe_tension_N * 0.85)
    );

    // Warnings
    let warning: string | undefined;
    if (yielding_risk) {
      warning = `CRITICAL: Combined stress ${equivalent_stress_MPa.toFixed(0)} MPa exceeds yield ${props.yield_MPa} MPa — wire will deform plastically`;
    } else if (fatigue_risk === "critical") {
      warning = `Stress ratio ${stress_ratio.toFixed(2)} is critical — expect wire break within ${time_to_failure_min.toFixed(1)} min`;
    } else if (fatigue_risk === "high") {
      warning = `Stress ratio ${stress_ratio.toFixed(2)} is high — reduce tension to ${recommended_tension_N.toFixed(1)} N`;
    } else if (input.tension_N > max_safe_tension_N) {
      warning = `Applied tension ${input.tension_N} N exceeds max safe ${max_safe_tension_N} N for ${input.wire_diameter_mm} mm wire`;
    }

    const recommendation_rationale = yielding_risk
      ? "Reduce tension below yield threshold"
      : fatigue_risk === "low"
      ? "Current settings provide long wire life"
      : fatigue_risk === "moderate"
      ? "Acceptable for standard production"
      : `Rebalance: reduce tension to ${recommended_tension_N.toFixed(1)} N or reduce pulse power`;

    return {
      tensile_stress_MPa,
      thermal_stress_MPa,
      thermal_shock_stress_MPa,
      equivalent_stress_MPa,
      stress_ratio,
      cycles_to_failure,
      time_to_failure_min,
      wire_life_remaining_pct,
      recommended_tension_N,
      max_safe_tension_N,
      within_safe_limits,
      yielding_risk,
      fatigue_risk,
      warning,
      recommendation_rationale,
    };
  }

  /**
   * Optimize wire tension for target life.
   */
  optimizeTension(input: TensionOptimizationInput): TensionOptimizationResult {
    const material = this.resolveMaterial(input.wire_material);
    const props = WIRE_MECHANICAL_PROPERTIES[material];
    const max_safe = this.getMaxSafeTension(input.wire_diameter_mm);

    const tension_min = 1;
    const tension_max = max_safe * 0.95;
    const steps = 20;
    const trade_off_curve: Array<{
      tension_N: number;
      life_min: number;
      stress_ratio: number;
    }> = [];

    let best_life = 0;
    let best_tension = tension_min;
    let best_ratio = 1;
    const target_life = input.target_life_min ?? 120;

    for (let i = 0; i <= steps; i++) {
      const t = tension_min + ((tension_max - tension_min) * i) / steps;
      const result = this.analyze({
        wire_material: input.wire_material,
        wire_diameter_mm: input.wire_diameter_mm,
        tension_N: t,
        wire_span_mm: input.wire_span_mm,
        peak_current_A: input.peak_current_A,
        pulse_on_us: input.pulse_on_us,
        duty_cycle: input.duty_cycle,
      });
      trade_off_curve.push({
        tension_N: t,
        life_min: result.time_to_failure_min,
        stress_ratio: result.stress_ratio,
      });
      // Prefer tension that meets target life with stress_ratio ≈ 0.3-0.4
      if (
        result.time_to_failure_min >= target_life &&
        result.stress_ratio < 0.5 &&
        result.time_to_failure_min > best_life
      ) {
        best_life = result.time_to_failure_min;
        best_tension = t;
        best_ratio = result.stress_ratio;
      }
    }

    // If nothing met target, pick lowest stress_ratio viable
    if (best_life === 0) {
      const viable = trade_off_curve.filter((p) => p.stress_ratio < 0.6);
      if (viable.length > 0) {
        const best = viable.reduce((a, b) => (a.life_min > b.life_min ? a : b));
        best_tension = best.tension_N;
        best_life = best.life_min;
        best_ratio = best.stress_ratio;
      }
    }

    return {
      optimal_tension_N: best_tension,
      predicted_life_min: best_life,
      stress_ratio_at_optimal: best_ratio,
      tension_range: { min_N: tension_min, max_N: tension_max },
      trade_off_curve,
    };
  }

  /**
   * Compute fatigue damage accumulated over multiple load states (Miner's rule).
   */
  accumulateDamage(
    segments: Array<{
      input: WireStressInput;
      duration_min: number;
    }>
  ): { total_damage: number; life_consumed_pct: number; failed: boolean } {
    let total_damage = 0;
    for (const seg of segments) {
      const result = this.analyze(seg.input);
      if (result.time_to_failure_min > 0) {
        total_damage += seg.duration_min / result.time_to_failure_min;
      }
    }
    return {
      total_damage,
      life_consumed_pct: Math.min(100, total_damage * 100),
      failed: total_damage >= 1.0,
    };
  }

  /**
   * Classify wire material into canonical key.
   */
  private resolveMaterial(mat: string): keyof typeof WIRE_MECHANICAL_PROPERTIES {
    const key = mat.toLowerCase();
    if (key in WIRE_MECHANICAL_PROPERTIES)
      return key as keyof typeof WIRE_MECHANICAL_PROPERTIES;
    if (key.includes("coat") || key.includes("zinc")) return "zinc_coated";
    if (key.includes("diffusion")) return "diffusion_annealed";
    if (key.includes("moly")) return "molybdenum";
    if (key.includes("tungsten")) return "tungsten";
    if (key.includes("cuzn40")) return "brass_cuzn40";
    return "brass_cuzn37";
  }

  /**
   * Max safe tension from EDM_PHYSICS.wire_safety.
   */
  private getMaxSafeTension(diameter_mm: number): number {
    const safety = EDM_PHYSICS.wire_safety;
    if (diameter_mm <= 0.22) return safety.max_tension_0_20mm;
    if (diameter_mm <= 0.27) return safety.max_tension_0_25mm;
    return safety.max_tension_0_30mm;
  }

  /**
   * Rough ΔT estimate if caller didn't provide from WEDMWireHeatingEngine.
   * Based on Joule heating: ΔT ≈ I² × ρ × t / (A² × m × cp)
   */
  private estimateTempRise(input: WireStressInput): number {
    const material = this.resolveMaterial(input.wire_material);
    const matKey = material.includes("brass")
      ? "brass"
      : material.includes("moly")
      ? "molybdenum"
      : material.includes("tungsten")
      ? "tungsten"
      : "brass";
    const resistivity =
      EDM_PHYSICS.wire_joule_heating.resistivity[material] ??
      EDM_PHYSICS.wire_joule_heating.resistivity.brass_cuzn37;
    const cp = EDM_PHYSICS.wire_joule_heating.specific_heat[matKey] ?? 377;
    const density = EDM_PHYSICS.wire_joule_heating.density[matKey] ?? 8400;

    const radius_mm = input.wire_diameter_mm / 2;
    const area_mm2 = Math.PI * radius_mm * radius_mm;
    const length_mm = input.wire_span_mm;
    const volume_m3 = (area_mm2 * length_mm) * 1e-9;
    const mass_kg = volume_m3 * density;

    // Power: P = I² × R, R = ρL/A (with ρ in Ω·mm²/m, L in mm, A in mm²)
    const power_W =
      Math.pow(input.peak_current_A, 2) *
      (resistivity * length_mm / 1000 / area_mm2);
    const avg_power = power_W * input.duty_cycle;
    // Residence time (assume wire feed 10 m/min default)
    const feed_m_min = input.wire_feed_m_min ?? 10;
    const residence_s = (length_mm / 1000) / (feed_m_min / 60);
    return (avg_power * residence_s) / (mass_kg * cp);
  }

  /**
   * Input sanity checks.
   */
  private validateInput(input: WireStressInput): void {
    if (!Number.isFinite(input.wire_diameter_mm) || input.wire_diameter_mm <= 0)
      throw new Error("wire_diameter_mm must be positive finite");
    if (!Number.isFinite(input.tension_N) || input.tension_N < 0)
      throw new Error("tension_N must be non-negative finite");
    if (!Number.isFinite(input.wire_span_mm) || input.wire_span_mm <= 0)
      throw new Error("wire_span_mm must be positive finite");
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

export const wedmWireStressAnalysisEngine = new WEDMWireStressAnalysisEngine();
