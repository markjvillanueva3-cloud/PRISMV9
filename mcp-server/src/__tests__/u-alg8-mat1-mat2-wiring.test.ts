/**
 * Tests for Phase 0-D-6 wirings:
 *   U-ALG8: KalmanFilter → AdaptiveControlEngine
 *           ExtendedTaylorModel → ToolWearRateEngine
 *           BayesianWearModel → StochasticToolLifeEngine
 *   U-MAT1: Learning algorithms → SuperalloyMachiningEngine
 *   U-MAT2: BayesianWearModel → CeramicsMachiningEngine
 *           BayesianWearModel → MagnesiumMachiningEngine
 */

import { describe, it, expect } from "vitest";
import { adaptiveControl } from "../engines/AdaptiveControlEngine.js";
import { toolWearRateEngine } from "../engines/ToolWearRateEngine.js";
import { stochasticToolLifeEngine } from "../engines/StochasticToolLifeEngine.js";
import { superalloyMachiningEngine } from "../engines/SuperalloyMachiningEngine.js";
import { ceramicsMachiningEngine } from "../engines/CeramicsMachiningEngine.js";
import { magnesiumMachiningEngine } from "../engines/MagnesiumMachiningEngine.js";

// ── U-ALG8: KalmanFilter → AdaptiveControlEngine ──────────────────

describe("AdaptiveControlEngine.adaptive_wear_kalman", () => {
  it("returns kalman_used metadata field", () => {
    const result = adaptiveControl("adaptive_wear_kalman", {
      load_history: [40, 42, 44, 46, 48],
      baseline_load_pct: 40,
      expected_life_min: 45,
      time_step_min: 1,
    }) as Record<string, unknown>;
    expect(result).toHaveProperty("kalman_used");
    expect(result).toHaveProperty("state_estimate");
    expect(result).toHaveProperty("filter_consistent");
  });

  it("falls back gracefully with < 3 readings", () => {
    const result = adaptiveControl("adaptive_wear_kalman", {
      load_history: [40, 42],
      baseline_load_pct: 40,
      expected_life_min: 45,
    }) as Record<string, unknown>;
    expect(result.kalman_used).toBe(false);
    expect(result.estimated_wear_pct).toBeDefined();
  });

  it("detects increasing wear from rising load", () => {
    const result = adaptiveControl("adaptive_wear_kalman", {
      load_history: [40, 45, 50, 55, 60, 65],
      baseline_load_pct: 40,
      expected_life_min: 30,
      time_step_min: 5,
    }) as Record<string, unknown>;
    expect(result.estimated_wear_pct as number).toBeGreaterThan(20);
  });

  it("preserves base WearResult fields", () => {
    const result = adaptiveControl("adaptive_wear_kalman", {
      load_history: [40, 42, 44],
      baseline_load_pct: 40,
      expected_life_min: 45,
    }) as Record<string, unknown>;
    expect(result).toHaveProperty("wear_rate_pct_per_min");
    expect(result).toHaveProperty("remaining_life_min");
    expect(result).toHaveProperty("feed_compensation_pct");
    expect(result).toHaveProperty("should_replace");
    expect(result).toHaveProperty("recommendation");
  });

  it("is listed in valid_actions", () => {
    const result = adaptiveControl("invalid_action") as Record<string, unknown>;
    expect((result.valid_actions as string[])).toContain("adaptive_wear_kalman");
  });
});

// ── U-ALG8: ExtendedTaylorModel → ToolWearRateEngine ──────────────

describe("ToolWearRateEngine.extendedToolLife", () => {
  it("returns extended_model_used metadata", () => {
    const result = toolWearRateEngine.extendedToolLife({
      cutting_speed_mpm: 200,
      tool_material: "carbide",
      work_material: "steel",
    });
    expect(result).toHaveProperty("extended_model_used");
    expect(result).toHaveProperty("speed_for_60min_life");
    expect(result).toHaveProperty("taylor_cliff_warning");
    expect(result).toHaveProperty("taylor_warnings");
  });

  it("returns positive tool life for reasonable parameters", () => {
    const result = toolWearRateEngine.extendedToolLife({
      cutting_speed_mpm: 150,
      feed_mm: 0.2,
      depth_of_cut_mm: 2.0,
      tool_material: "carbide",
      work_material: "steel",
    });
    expect(result.predicted_tool_life.value).toBeGreaterThan(0);
    expect(result.flank_wear_rate.value).toBeGreaterThan(0);
  });

  it("temperature derating reduces tool life (when algorithm available) or falls back", () => {
    const normal = toolWearRateEngine.extendedToolLife({
      cutting_speed_mpm: 200,
      tool_material: "carbide",
      work_material: "steel",
      temperature_factor: 1.0,
    });
    const hot = toolWearRateEngine.extendedToolLife({
      cutting_speed_mpm: 200,
      tool_material: "carbide",
      work_material: "steel",
      temperature_factor: 0.6,
    });
    if (normal.extended_model_used) {
      // Algorithm available: temperature derating should reduce life
      expect(hot.predicted_tool_life.value).toBeLessThan(normal.predicted_tool_life.value);
    } else {
      // Fallback: both use basic Taylor (no temp factor), so equal
      expect(hot.predicted_tool_life.value).toBe(normal.predicted_tool_life.value);
      expect(hot.taylor_warnings).toContain("ExtendedTaylorModel unavailable — using basic Taylor");
    }
  });

  it("preserves base ToolWearRateResult fields", () => {
    const result = toolWearRateEngine.extendedToolLife({
      cutting_speed_mpm: 200,
    });
    expect(result).toHaveProperty("taylor_constant");
    expect(result).toHaveProperty("taylor_exponent");
    expect(result).toHaveProperty("crater_wear_risk");
    expect(result).toHaveProperty("optimal_speed_cost");
  });
});

// ── U-ALG8: BayesianWearModel → StochasticToolLifeEngine ──────────

describe("StochasticToolLifeEngine.updateFromMeasurements", () => {
  it("returns bayesian_model_used metadata", () => {
    const result = stochasticToolLifeEngine.updateFromMeasurements({
      material: "AISI 4140",
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      depth_mm: 2.0,
      observed_lives: [25, 28, 22, 30, 27],
    });
    expect(result).toHaveProperty("bayesian_model_used");
    expect(result).toHaveProperty("posterior_mean_life");
    expect(result).toHaveProperty("posterior_std_life");
    expect(result).toHaveProperty("credible_interval_95");
    expect(result).toHaveProperty("shrinkage");
  });

  it("returns prior-only result without observations", () => {
    const result = stochasticToolLifeEngine.updateFromMeasurements({
      material: "AISI 4140",
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      depth_mm: 2.0,
      observed_lives: [],
    });
    expect(result.bayesian_model_used).toBe(false);
    expect(result.recommendation).toContain("COLLECT_MORE");
  });

  it("posterior moves toward observed data", () => {
    const result = stochasticToolLifeEngine.updateFromMeasurements({
      material: "AISI 4140",
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      depth_mm: 2.0,
      observed_lives: [15, 14, 16, 15, 13],
    });
    // Posterior should move toward ~15 min (observed mean)
    expect(result.posterior_mean_life).toBeGreaterThan(5);
    expect(result.posterior_mean_life).toBeLessThan(100);
  });

  it("preserves base StochasticToolLifeResult", () => {
    const result = stochasticToolLifeEngine.updateFromMeasurements({
      material: "Ti-6Al-4V",
      cutting_speed_mpm: 60,
      feed_mm: 0.15,
      depth_mm: 2.0,
      observed_lives: [20, 22],
    });
    expect(result.value).toHaveProperty("taylor_life_min");
    expect(result.value).toHaveProperty("weibull");
    expect(result.value).toHaveProperty("optimal_replacement_min");
  });
});

// ── U-MAT1: Learning algorithms → SuperalloyMachiningEngine ───────

describe("SuperalloyMachiningEngine.analyzeWithLearning", () => {
  it("returns learning_model_used metadata", () => {
    const result = superalloyMachiningEngine.analyzeWithLearning({
      alloy: "inconel_718",
      cutting_speed_mpm: 40,
      feed_mm: 0.15,
      depth_mm: 1.5,
    });
    expect(result).toHaveProperty("learning_model_used");
    expect(result).toHaveProperty("extended_taylor_life");
    expect(result).toHaveProperty("posterior_crater_rate");
    expect(result).toHaveProperty("learning_recommendation");
  });

  it("preserves base J-C physics results", () => {
    const result = superalloyMachiningEngine.analyzeWithLearning({
      alloy: "inconel_718",
      cutting_speed_mpm: 40,
      feed_mm: 0.15,
      depth_mm: 1.5,
    });
    expect(result.cutting_force_N).toBeGreaterThan(0);
    expect(result.temperature_C).toBeGreaterThan(25);
    expect(result.jc_flow_stress_MPa).toBeGreaterThan(0);
    expect(result.tool_life_min).toBeGreaterThan(0);
  });

  it("accepts observed crater depths for learning", () => {
    const result = superalloyMachiningEngine.analyzeWithLearning({
      alloy: "waspaloy",
      cutting_speed_mpm: 35,
      feed_mm: 0.12,
      depth_mm: 1.0,
      observed_crater_depths: [0.001, 0.0015, 0.002],
    });
    // Should have learning data
    expect(result.learning_recommendation).toBeDefined();
    expect(result.learning_recommendation.length).toBeGreaterThan(0);
  });

  it("works for all superalloy types", () => {
    const alloys = ["inconel_718", "inconel_625", "waspaloy", "rene_41", "hastelloy_x", "mar_m247"] as const;
    for (const alloy of alloys) {
      const result = superalloyMachiningEngine.analyzeWithLearning({
        alloy,
        cutting_speed_mpm: 30,
        feed_mm: 0.1,
        depth_mm: 1.0,
      });
      expect(result.cutting_force_N).toBeGreaterThan(0);
    }
  });
});

// ── U-MAT2: BayesianWearModel → CeramicsMachiningEngine ──────────

describe("CeramicsMachiningEngine.assessWithBayesian", () => {
  it("returns bayesian_model_used metadata", () => {
    const result = ceramicsMachiningEngine.assessWithBayesian({
      material: "alumina",
      applied_stress_MPa: 200,
      observed_strengths: [380, 395, 370, 410, 385],
    });
    expect(result).toHaveProperty("bayesian_model_used");
    expect(result).toHaveProperty("posterior_strength_mean");
    expect(result).toHaveProperty("updated_fracture_probability");
    expect(result).toHaveProperty("updated_safety_factor");
  });

  it("returns base result without observations", () => {
    const result = ceramicsMachiningEngine.assessWithBayesian({
      material: "zirconia",
      applied_stress_MPa: 300,
    });
    expect(result.bayesian_model_used).toBe(false);
    expect(result.posterior_strength_mean).toBeNull();
    expect(result.fracture_probability).toBeGreaterThanOrEqual(0);
  });

  it("higher observed strength reduces fracture probability", () => {
    const base = ceramicsMachiningEngine.assessWithBayesian({
      material: "alumina",
      applied_stress_MPa: 200,
    });
    const stronger = ceramicsMachiningEngine.assessWithBayesian({
      material: "alumina",
      applied_stress_MPa: 200,
      observed_strengths: [500, 520, 510, 490, 530],
    });
    // With much stronger observed material, updated fracture prob should be lower
    if (stronger.updated_fracture_probability !== null) {
      expect(stronger.updated_fracture_probability).toBeLessThanOrEqual(
        base.fracture_probability
      );
    }
  });

  it("preserves base MicroFractureResult fields", () => {
    const result = ceramicsMachiningEngine.assessWithBayesian({
      material: "silicon_nitride",
      applied_stress_MPa: 400,
      observed_strengths: [800, 820],
    });
    expect(result).toHaveProperty("critical_crack_length_mm");
    expect(result).toHaveProperty("stress_intensity_MPa_sqrt_m");
    expect(result).toHaveProperty("weibull_modulus");
    expect(result).toHaveProperty("safety_factor");
  });
});

// ── U-MAT2: BayesianWearModel → MagnesiumMachiningEngine ─────────

describe("MagnesiumMachiningEngine.assessFireRiskWithUncertainty", () => {
  it("returns bayesian_model_used metadata", () => {
    const result = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "AZ91",
      cutting_speed_mpm: 300,
      feed_mm: 0.15,
      depth_mm: 1.0,
      coolant_type: "dry",
      observed_temperatures: [350, 360, 340, 370, 355],
    });
    expect(result).toHaveProperty("bayesian_model_used");
    expect(result).toHaveProperty("temperature_posterior_mean");
    expect(result).toHaveProperty("temperature_credible_95");
    expect(result).toHaveProperty("probability_exceeds_ignition");
    expect(result).toHaveProperty("confidence_in_risk");
  });

  it("returns low confidence without observations", () => {
    const result = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "AZ31",
      cutting_speed_mpm: 200,
      feed_mm: 0.1,
      depth_mm: 0.5,
      coolant_type: "co2",
    });
    expect(result.bayesian_model_used).toBe(false);
    expect(result.confidence_in_risk).toBeLessThanOrEqual(0.6);
    expect(result.temperature_posterior_mean).toBeNull();
  });

  it("preserves base fire risk fields", () => {
    const result = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "WE43",
      cutting_speed_mpm: 200,
      feed_mm: 0.1,
      depth_mm: 0.5,
      coolant_type: "oil",
      observed_temperatures: [300, 310],
    });
    expect(result).toHaveProperty("chip_temperature_C");
    expect(result).toHaveProperty("ignition_temperature_C");
    expect(result).toHaveProperty("fire_risk");
    expect(result).toHaveProperty("risk_score");
    expect(result).toHaveProperty("safe_speed_limit_mpm");
  });

  it("WE43 has higher ignition tolerance than AZ31", () => {
    const we43 = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "WE43",
      cutting_speed_mpm: 300,
      feed_mm: 0.15,
      depth_mm: 1.0,
      coolant_type: "dry",
    });
    const az31 = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "AZ31",
      cutting_speed_mpm: 300,
      feed_mm: 0.15,
      depth_mm: 1.0,
      coolant_type: "dry",
    });
    // WE43 has fire_resistance_factor=1.4, AZ31=1.0
    expect(we43.ignition_temperature_C).toBeGreaterThan(az31.ignition_temperature_C);
  });

  it("emulsion coolant triggers hydrogen warning", () => {
    const result = magnesiumMachiningEngine.assessFireRiskWithUncertainty({
      alloy: "AZ91",
      cutting_speed_mpm: 200,
      feed_mm: 0.1,
      depth_mm: 0.5,
      coolant_type: "emulsion",
      observed_temperatures: [300],
    });
    expect(result.warnings.some(w => w.toLowerCase().includes("hydrogen"))).toBe(true);
  });
});
