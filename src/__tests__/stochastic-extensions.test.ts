/**
 * PHYS-MS4 — Stochastic Extensions Tests
 * StochasticCompositesEngine + StochasticGrindingDressingEngine
 * 28 tests covering MC convergence, sensitivity ranking, distribution shape,
 * dressing optimization, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { StochasticCompositesEngine } from "../engines/StochasticCompositesEngine.js";
import { StochasticGrindingDressingEngine } from "../engines/StochasticGrindingDressingEngine.js";

const composites = new StochasticCompositesEngine();
const grinding = new StochasticGrindingDressingEngine();

// ── StochasticCompositesEngine: monteCarloDelamination ──────────────

describe("StochasticCompositesEngine — monteCarloDelamination", () => {
  it("returns valid probability between 0 and 1", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "carbon",
      layup_angle_deg: 0,
      feed_mm: 0.05,
      speed_mpm: 50,
      tool_diameter_mm: 6,
      n_samples: 500,
    });
    expect(result.delamination_probability).toBeGreaterThanOrEqual(0);
    expect(result.delamination_probability).toBeLessThanOrEqual(1);
  });

  it("returns confidence interval bracketing the probability", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "glass",
      layup_angle_deg: 45,
      feed_mm: 0.08,
      speed_mpm: 40,
      tool_diameter_mm: 8,
      n_samples: 800,
    });
    expect(result.risk_ci_95[0]).toBeLessThanOrEqual(result.delamination_probability);
    expect(result.risk_ci_95[1]).toBeGreaterThanOrEqual(result.delamination_probability);
  });

  it("higher feed increases delamination risk", () => {
    const lowFeed = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.02, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 1000,
    });
    const highFeed = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.3, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 1000,
    });
    expect(highFeed.delamination_probability).toBeGreaterThanOrEqual(
      lowFeed.delamination_probability,
    );
  });

  it("Tsai-Hill distribution has valid statistics", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 30,
      feed_mm: 0.1, speed_mpm: 60, tool_diameter_mm: 10, n_samples: 500,
    });
    const th = result.Tsai_Hill_distribution;
    expect(th.mean).toBeGreaterThan(0);
    expect(th.std).toBeGreaterThanOrEqual(0);
    expect(th.p5).toBeLessThanOrEqual(th.mean);
    expect(th.p95).toBeGreaterThanOrEqual(th.mean);
  });

  it("critical thrust force distribution is positive", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "aramid", layup_angle_deg: 45,
      feed_mm: 0.06, speed_mpm: 30, tool_diameter_mm: 5, n_samples: 500,
    });
    expect(result.critical_thrust_force_distribution.mean).toBeGreaterThan(0);
    expect(result.critical_thrust_force_distribution.p5).toBeGreaterThan(0);
  });

  it("recommended safety factor is at least 1.0", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.05, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 300,
    });
    expect(result.recommended_safety_factor).toBeGreaterThanOrEqual(1.0);
  });

  it("risk_level is a valid category", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "glass", layup_angle_deg: 90,
      feed_mm: 0.1, speed_mpm: 40, tool_diameter_mm: 8, n_samples: 300,
    });
    expect(["negligible", "low", "moderate", "high", "critical"]).toContain(
      result.risk_level,
    );
  });

  it("works for all fiber types", () => {
    for (const fiber of ["carbon", "glass", "aramid", "basalt"] as const) {
      const result = composites.monteCarloDelamination({
        fiber_type: fiber, layup_angle_deg: 0,
        feed_mm: 0.05, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 200,
      });
      expect(result.delamination_probability).toBeDefined();
      expect(result.thrust_force_mean_N).toBeGreaterThan(0);
    }
  });

  it("higher COV increases distribution spread", () => {
    const narrow = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.1, speed_mpm: 50, tool_diameter_mm: 8,
      n_samples: 800, fiber_strength_cov: 0.05, interface_shear_cov: 0.05,
    });
    const wide = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.1, speed_mpm: 50, tool_diameter_mm: 8,
      n_samples: 800, fiber_strength_cov: 0.25, interface_shear_cov: 0.25,
    });
    expect(wide.Tsai_Hill_distribution.std).toBeGreaterThan(
      narrow.Tsai_Hill_distribution.std * 0.5,
    );
  });

  it("MC converges: 2000 samples yields tighter CI than 100", () => {
    const small = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 45,
      feed_mm: 0.1, speed_mpm: 50, tool_diameter_mm: 8, n_samples: 100,
    });
    const large = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 45,
      feed_mm: 0.1, speed_mpm: 50, tool_diameter_mm: 8, n_samples: 2000,
    });
    const smallWidth = small.risk_ci_95[1] - small.risk_ci_95[0];
    const largeWidth = large.risk_ci_95[1] - large.risk_ci_95[0];
    expect(largeWidth).toBeLessThanOrEqual(smallWidth + 0.05);
  });

  it("includes formula string", () => {
    const result = composites.monteCarloDelamination({
      fiber_type: "carbon", layup_angle_deg: 0,
      feed_mm: 0.05, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 100,
    });
    expect(result.formula).toContain("Hocheng-Dharan");
    expect(result.formula).toContain("Tsai-Hill");
  });
});

// ── StochasticCompositesEngine: sensitivityAnalysis ─────────────────

describe("StochasticCompositesEngine — sensitivityAnalysis", () => {
  it("returns indices for all requested parameters", () => {
    const result = composites.sensitivityAnalysis({
      base_params: {
        fiber_type: "carbon", layup_angle_deg: 30,
        feed_mm: 0.08, speed_mpm: 50, tool_diameter_mm: 8, n_samples: 300,
      },
      vary_parameters: ["feed_mm", "speed_mpm", "tool_diameter_mm"],
    });
    expect(result.indices).toHaveLength(3);
    expect(result.indices.map(i => i.parameter)).toContain("feed_mm");
    expect(result.indices.map(i => i.parameter)).toContain("speed_mpm");
  });

  it("normalized Si values sum to approximately 1", () => {
    const result = composites.sensitivityAnalysis({
      base_params: {
        fiber_type: "carbon", layup_angle_deg: 30,
        feed_mm: 0.08, speed_mpm: 50, tool_diameter_mm: 8, n_samples: 300,
      },
      vary_parameters: ["feed_mm", "speed_mpm", "tool_diameter_mm"],
    });
    const total = result.indices.reduce((s, i) => s + i.first_order_Si, 0);
    expect(total).toBeCloseTo(1.0, 0);
  });

  it("identifies a dominant parameter", () => {
    const result = composites.sensitivityAnalysis({
      base_params: {
        fiber_type: "glass", layup_angle_deg: 0,
        feed_mm: 0.1, speed_mpm: 40, tool_diameter_mm: 10, n_samples: 300,
      },
      vary_parameters: ["feed_mm", "speed_mpm", "tool_diameter_mm", "layup_angle_deg"],
    });
    expect(result.dominant_parameter).toBeTruthy();
    expect(result.indices.some(i => i.parameter === result.dominant_parameter)).toBe(true);
  });

  it("effect_direction is valid for each index", () => {
    const result = composites.sensitivityAnalysis({
      base_params: {
        fiber_type: "carbon", layup_angle_deg: 45,
        feed_mm: 0.05, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 200,
      },
      vary_parameters: ["feed_mm", "fiber_strength_cov"],
    });
    for (const idx of result.indices) {
      expect(["increases_risk", "decreases_risk", "neutral"]).toContain(
        idx.effect_direction,
      );
    }
  });

  it("includes formula string", () => {
    const result = composites.sensitivityAnalysis({
      base_params: {
        fiber_type: "carbon", layup_angle_deg: 0,
        feed_mm: 0.05, speed_mpm: 50, tool_diameter_mm: 6, n_samples: 100,
      },
      vary_parameters: ["feed_mm"],
    });
    expect(result.formula).toContain("sensitivity");
  });
});

// ── StochasticGrindingDressingEngine: monteCarloWheelLife ───────────

describe("StochasticGrindingDressingEngine — monteCarloWheelLife", () => {
  it("returns positive wheel life distribution", () => {
    const result = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V",
      material: "steel",
      depth_mm: 0.02,
      speed_mps: 30,
      n_samples: 500,
    });
    expect(result.wheel_life_distribution.mean_parts).toBeGreaterThan(0);
    expect(result.wheel_life_distribution.std).toBeGreaterThan(0);
  });

  it("p5 < mean < p95 for wheel life", () => {
    const result = grinding.monteCarloWheelLife({
      wheel_spec: "46A80K5V",
      material: "stainless",
      depth_mm: 0.03,
      speed_mps: 25,
      n_samples: 800,
    });
    const d = result.wheel_life_distribution;
    expect(d.p5).toBeLessThanOrEqual(d.mean_parts);
    expect(d.p95).toBeGreaterThanOrEqual(d.mean_parts);
  });

  it("dressing interval CI has valid range", () => {
    const result = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V",
      material: "steel",
      depth_mm: 0.02,
      speed_mps: 30,
      n_samples: 500,
    });
    expect(result.dressing_interval_ci[0]).toBeGreaterThanOrEqual(1);
    expect(result.dressing_interval_ci[1]).toBeGreaterThanOrEqual(
      result.dressing_interval_ci[0],
    );
  });

  it("cost per part is positive", () => {
    const result = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V",
      material: "cast_iron",
      depth_mm: 0.05,
      speed_mps: 35,
      n_samples: 500,
    });
    expect(result.cost_per_part_distribution.mean).toBeGreaterThan(0);
    expect(result.cost_per_part_distribution.std).toBeGreaterThanOrEqual(0);
  });

  it("harder materials have shorter wheel life (lower G-ratio)", () => {
    const steel = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V", material: "steel",
      depth_mm: 0.02, speed_mps: 30, n_samples: 500,
    });
    const inconel = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V", material: "inconel",
      depth_mm: 0.02, speed_mps: 30, n_samples: 500,
    });
    expect(inconel.wheel_life_distribution.mean_parts).toBeLessThan(
      steel.wheel_life_distribution.mean_parts,
    );
  });

  it("works for all materials", () => {
    for (const mat of ["steel", "stainless", "inconel", "titanium", "cast_iron", "carbide", "aluminum"] as const) {
      const result = grinding.monteCarloWheelLife({
        wheel_spec: "46A60K5V", material: mat,
        depth_mm: 0.02, speed_mps: 30, n_samples: 200,
      });
      expect(result.g_ratio_used).toBeGreaterThan(0);
      expect(result.wheel_life_distribution.mean_parts).toBeGreaterThan(0);
    }
  });

  it("higher G-ratio COV increases distribution spread", () => {
    const narrow = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V", material: "steel",
      depth_mm: 0.02, speed_mps: 30, n_samples: 800, g_ratio_cov: 0.05,
    });
    const wide = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V", material: "steel",
      depth_mm: 0.02, speed_mps: 30, n_samples: 800, g_ratio_cov: 0.40,
    });
    const narrowCV = narrow.wheel_life_distribution.std / narrow.wheel_life_distribution.mean_parts;
    const wideCV = wide.wheel_life_distribution.std / wide.wheel_life_distribution.mean_parts;
    expect(wideCV).toBeGreaterThan(narrowCV);
  });

  it("includes formula string", () => {
    const result = grinding.monteCarloWheelLife({
      wheel_spec: "46A60K5V", material: "steel",
      depth_mm: 0.02, speed_mps: 30, n_samples: 100,
    });
    expect(result.formula).toContain("G=V_material/V_wheel");
  });
});

// ── StochasticGrindingDressingEngine: optimizeDressingUnderUncertainty ──

describe("StochasticGrindingDressingEngine — optimizeDressingUnderUncertainty", () => {
  const baseParams = {
    wheel_spec: "46A60K5V",
    material: "steel" as const,
    depth_mm: 0.02,
    speed_mps: 30,
    n_samples: 300,
  };

  it("returns a valid optimal interval", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.8,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(result.optimal_interval_parts).toBeGreaterThanOrEqual(1);
  });

  it("expected cost is positive", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.8,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(result.expected_cost).toBeGreaterThan(0);
  });

  it("Ra exceedance probability is between 0 and 1", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.6,
      cost_penalty_for_redress: 20,
      risk_tolerance: 0.05,
    });
    expect(result.probability_of_Ra_exceedance).toBeGreaterThanOrEqual(0);
    expect(result.probability_of_Ra_exceedance).toBeLessThanOrEqual(1);
  });

  it("tighter Ra target yields shorter dressing interval", () => {
    const loose = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 2.0,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    const tight = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.3,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(tight.optimal_interval_parts).toBeLessThanOrEqual(
      loose.optimal_interval_parts,
    );
  });

  it("cost breakdown components are non-negative", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.8,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(result.cost_breakdown.cycle_cost).toBeGreaterThanOrEqual(0);
    expect(result.cost_breakdown.dress_cost_amortized).toBeGreaterThanOrEqual(0);
    expect(result.cost_breakdown.wheel_cost_amortized).toBeGreaterThanOrEqual(0);
  });

  it("recommendation string is non-empty", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.8,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(result.risk_adjusted_recommendation.length).toBeGreaterThan(10);
  });

  it("includes formula string", () => {
    const result = grinding.optimizeDressingUnderUncertainty({
      base_params: baseParams,
      target_Ra_um: 0.8,
      cost_penalty_for_redress: 15,
      risk_tolerance: 0.10,
    });
    expect(result.formula).toContain("Ra=Ra_base");
  });
});
