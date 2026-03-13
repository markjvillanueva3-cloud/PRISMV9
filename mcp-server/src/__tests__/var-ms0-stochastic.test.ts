/**
 * VAR-MS0 Stochastic Engines — Comprehensive Test Suite
 *
 * Tests 6 engines:
 *   1. StochasticCuttingForceEngine
 *   2. StochasticToolLifeEngine
 *   3. StochasticThermalEngine
 *   4. StochasticSurfaceFinishEngine
 *   5. StochasticChatterEngine
 *   6. UncertaintyPropagationPipelineEngine
 */
import { describe, it, expect } from "vitest";

import { stochasticCuttingForceEngine } from "../engines/StochasticCuttingForceEngine.js";
import { stochasticToolLifeEngine } from "../engines/StochasticToolLifeEngine.js";
import { stochasticThermalEngine } from "../engines/StochasticThermalEngine.js";
import { stochasticSurfaceFinishEngine } from "../engines/StochasticSurfaceFinishEngine.js";
import { stochasticChatterEngine } from "../engines/StochasticChatterEngine.js";
import { uncertaintyPropagationPipelineEngine } from "../engines/UncertaintyPropagationPipelineEngine.js";

// ============================================================================
// 1. StochasticCuttingForceEngine
// ============================================================================

describe("StochasticCuttingForceEngine", () => {
  const baseInput = {
    material: "AISI 4140",
    depth_mm: 2,
    feed_mm: 0.1,
    width_mm: 5,
    tool_diameter_mm: 10,
    flute_count: 4,
    n_trials: 500,
  };

  it("returns mean_force_n > 0", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.mean_force_n).toBeGreaterThan(0);
  });

  it("returns std_dev_n > 0", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.std_dev_n).toBeGreaterThan(0);
  });

  it("ci_95 brackets mean", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.ci_95[0]).toBeLessThan(r.value.mean_force_n);
    expect(r.value.ci_95[1]).toBeGreaterThan(r.value.mean_force_n);
  });

  it("ci_99 is wider than ci_95", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.ci_99[0]).toBeLessThanOrEqual(r.value.ci_95[0]);
    expect(r.value.ci_99[1]).toBeGreaterThanOrEqual(r.value.ci_95[1]);
  });

  it("cv_percent > 0", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.cv_percent).toBeGreaterThan(0);
  });

  it("sobol_indices has entries", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.sobol_indices.length).toBeGreaterThan(0);
    for (const s of r.value.sobol_indices) {
      expect(s.Si).toBeGreaterThanOrEqual(0);
      expect(s.STi).toBeGreaterThanOrEqual(0);
      expect(s.parameter).toBeTruthy();
    }
  });

  it("dominant_uncertainty is a string", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(typeof r.value.dominant_uncertainty).toBe("string");
    expect(r.value.dominant_uncertainty.length).toBeGreaterThan(0);
  });

  it("each material produces different mean force", () => {
    const materials = ["AISI 4140", "Ti-6Al-4V", "Al 7075-T6", "Inconel 718"];
    const means = materials.map((material) =>
      stochasticCuttingForceEngine.compute({ ...baseInput, material }).value.mean_force_n
    );
    const unique = new Set(means);
    expect(unique.size).toBe(materials.length);
  });

  it("FOSM and MC both populated when method='both'", () => {
    const r = stochasticCuttingForceEngine.compute({ ...baseInput, method: "both" });
    expect(r.value.fosm).not.toBeNull();
    expect(r.value.mc).not.toBeNull();
    expect(r.value.fosm!.mean).toBeGreaterThan(0);
    expect(r.value.fosm!.std_dev).toBeGreaterThan(0);
    expect(r.value.mc!.mean).toBeGreaterThan(0);
    expect(r.value.mc!.std_dev).toBeGreaterThan(0);
  });

  it("mc-only mode has null fosm", () => {
    const r = stochasticCuttingForceEngine.compute({ ...baseInput, method: "mc" });
    expect(r.value.mc).not.toBeNull();
    expect(r.value.fosm).toBeNull();
  });

  it("fosm-only mode has null mc", () => {
    const r = stochasticCuttingForceEngine.compute({ ...baseInput, method: "fosm" });
    expect(r.value.fosm).not.toBeNull();
    expect(r.value.mc).toBeNull();
  });

  it("histogram has bins with counts", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.mc).not.toBeNull();
    const hist = r.value.mc!.histogram;
    expect(hist.length).toBeGreaterThan(0);
    const totalCount = hist.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(500);
  });

  it("p_exceed has entries with valid probabilities", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.p_exceed.length).toBeGreaterThan(0);
    for (const pe of r.value.p_exceed) {
      expect(pe.probability).toBeGreaterThanOrEqual(0);
      expect(pe.probability).toBeLessThanOrEqual(1);
      expect(pe.limit_n).toBeGreaterThan(0);
    }
  });

  it("material_scatter has entries", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.value.material_scatter.length).toBeGreaterThan(0);
    for (const ms of r.value.material_scatter) {
      expect(ms.cv_pct).toBeGreaterThan(0);
    }
  });

  it("unit is N", () => {
    const r = stochasticCuttingForceEngine.compute(baseInput);
    expect(r.unit).toBe("N");
  });

  it("higher depth yields higher force", () => {
    const lo = stochasticCuttingForceEngine.compute({ ...baseInput, depth_mm: 1 });
    const hi = stochasticCuttingForceEngine.compute({ ...baseInput, depth_mm: 4 });
    expect(hi.value.mean_force_n).toBeGreaterThan(lo.value.mean_force_n);
  });
});

// ============================================================================
// 2. StochasticToolLifeEngine
// ============================================================================

describe("StochasticToolLifeEngine", () => {
  // Use Al 7075-T6 at moderate speed — produces meaningful Taylor lives
  // (steel at high speed yields sub-minute lives due to V^(1/n) scaling)
  const baseInput = {
    material: "Al 7075-T6",
    cutting_speed_mpm: 3,
    feed_mm: 0.15,
    depth_mm: 2,
    n_trials: 500,
  };

  it("taylor_life_min > 0", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(r.value.taylor_life_min).toBeGreaterThan(0);
  });

  it("weibull populated when method=all", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(r.value.weibull).not.toBeNull();
    // beta and eta should be finite and positive
    expect(Number.isFinite(r.value.weibull!.beta)).toBe(true);
    expect(r.value.weibull!.beta).toBeGreaterThan(0);
    expect(Number.isFinite(r.value.weibull!.eta_min)).toBe(true);
    expect(r.value.weibull!.eta_min).toBeGreaterThan(0);
  });

  it("weibull mean and median are positive and finite", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(Number.isFinite(r.value.weibull!.mean_min)).toBe(true);
    expect(r.value.weibull!.mean_min).toBeGreaterThan(0);
    expect(Number.isFinite(r.value.weibull!.median_min)).toBe(true);
    expect(r.value.weibull!.median_min).toBeGreaterThan(0);
  });

  it("wiener has mean_life > 0", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(r.value.wiener).not.toBeNull();
    expect(r.value.wiener!.mean_life_min).toBeGreaterThan(0);
  });

  it("wiener ci_95 brackets mean", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    const w = r.value.wiener!;
    expect(w.ci_95[0]).toBeLessThan(w.mean_life_min);
    expect(w.ci_95[1]).toBeGreaterThan(w.mean_life_min);
  });

  it("reliability array has entries with p_survive between 0 and 1", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(r.value.reliability.length).toBeGreaterThan(0);
    for (const rp of r.value.reliability) {
      expect(Number.isFinite(rp.p_survive)).toBe(true);
      expect(rp.p_survive).toBeGreaterThanOrEqual(0);
      expect(rp.p_survive).toBeLessThanOrEqual(1);
      expect(rp.time_min).toBeGreaterThan(0);
    }
  });

  it("reliability is non-increasing with time", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    const rel = r.value.reliability;
    for (let i = 1; i < rel.length; i++) {
      expect(rel[i].p_survive).toBeLessThanOrEqual(rel[i - 1].p_survive + 1e-9);
    }
  });

  it("optimal_replacement_min is finite and positive", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(Number.isFinite(r.value.optimal_replacement_min)).toBe(true);
    expect(r.value.optimal_replacement_min).toBeGreaterThan(0);
  });

  it("Bayesian updating produces posterior when observed_wear given", () => {
    const withObs = stochasticToolLifeEngine.compute({
      ...baseInput,
      observed_wear: [
        { time_min: 5, vb_mm: 0.05 },
        { time_min: 10, vb_mm: 0.10 },
        { time_min: 15, vb_mm: 0.14 },
      ],
    });
    expect(withObs.value.bayesian).not.toBeNull();
    expect(withObs.value.bayesian!.posterior_mean).toBeGreaterThan(0);
    expect(withObs.value.bayesian!.posterior_std).toBeGreaterThan(0);
    expect(withObs.value.bayesian!.remaining_life_min).toBeGreaterThan(0);
    // Posterior should differ from prior
    expect(withObs.value.bayesian!.posterior_mean).not.toBe(withObs.value.bayesian!.prior_mean);
  });

  it("bayesian ci_95 brackets posterior mean", () => {
    const r = stochasticToolLifeEngine.compute({
      ...baseInput,
      observed_wear: [
        { time_min: 5, vb_mm: 0.05 },
        { time_min: 10, vb_mm: 0.10 },
      ],
    });
    expect(r.value.bayesian!.ci_95[0]).toBeLessThan(r.value.bayesian!.posterior_mean);
    expect(r.value.bayesian!.ci_95[1]).toBeGreaterThan(r.value.bayesian!.posterior_mean);
  });

  it("lower speed gives longer life than higher speed", () => {
    const slow = stochasticToolLifeEngine.compute({ ...baseInput, cutting_speed_mpm: 2 });
    const fast = stochasticToolLifeEngine.compute({ ...baseInput, cutting_speed_mpm: 5 });
    expect(slow.value.taylor_life_min).toBeGreaterThan(fast.value.taylor_life_min);
  });

  it("p_survive_target populated when target_time given", () => {
    const r = stochasticToolLifeEngine.compute({ ...baseInput, target_time_min: 10 });
    expect(r.value.p_survive_target).not.toBeNull();
    expect(Number.isFinite(r.value.p_survive_target!)).toBe(true);
    expect(r.value.p_survive_target!).toBeGreaterThanOrEqual(0);
    expect(r.value.p_survive_target!).toBeLessThanOrEqual(1);
  });

  it("hazard_at_taylor is finite", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(Number.isFinite(r.value.hazard_at_taylor)).toBe(true);
    expect(r.value.hazard_at_taylor).toBeGreaterThanOrEqual(0);
  });

  it("dominant_uncertainty is a string", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(typeof r.value.dominant_uncertainty).toBe("string");
    expect(r.value.dominant_uncertainty.length).toBeGreaterThan(0);
  });

  it("cost_ratio is populated", () => {
    const r = stochasticToolLifeEngine.compute(baseInput);
    expect(r.value.cost_ratio).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. StochasticThermalEngine
// ============================================================================

describe("StochasticThermalEngine", () => {
  const baseInput = {
    material: "Ti-6Al-4V",
    cutting_speed_mpm: 60,
    feed_mm: 0.1,
    depth_mm: 1.5,
    width_mm: 5,
    tool_diameter_mm: 10,
    coolant_type: "flood" as const,
    n_trials: 500,
  };

  it("mean_temp > 25 (above ambient)", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.mean_temp_c).toBeGreaterThan(25);
  });

  it("std_dev_c > 0", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.std_dev_c).toBeGreaterThan(0);
  });

  it("ci_95 brackets mean", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.ci_95[0]).toBeLessThan(r.value.mean_temp_c);
    expect(r.value.ci_95[1]).toBeGreaterThan(r.value.mean_temp_c);
  });

  it("ci_99 wider than ci_95", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.ci_99[0]).toBeLessThanOrEqual(r.value.ci_95[0]);
    expect(r.value.ci_99[1]).toBeGreaterThanOrEqual(r.value.ci_95[1]);
  });

  it("flood coolant produces lower temp than dry", () => {
    const flood = stochasticThermalEngine.compute(baseInput);
    const dry = stochasticThermalEngine.compute({ ...baseInput, coolant_type: "dry" as const });
    expect(flood.value.mean_temp_c).toBeLessThan(dry.value.mean_temp_c);
  });

  it("p_exceed_coating has entries", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.p_exceed_coating.length).toBeGreaterThan(0);
    for (const pe of r.value.p_exceed_coating) {
      expect(pe.probability).toBeGreaterThanOrEqual(0);
      expect(pe.probability).toBeLessThanOrEqual(1);
      expect(pe.max_temp_c).toBeGreaterThan(0);
      expect(["safe", "caution", "danger"]).toContain(pe.risk);
    }
  });

  it("sobol_indices present", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.sobol_indices.length).toBeGreaterThan(0);
    for (const s of r.value.sobol_indices) {
      expect(s.Si).toBeGreaterThanOrEqual(0);
      expect(s.Si).toBeLessThanOrEqual(1);
    }
  });

  it("heat_partition has mean between 0 and 1", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.heat_partition.mean).toBeGreaterThan(0);
    expect(r.value.heat_partition.mean).toBeLessThan(1);
    expect(r.value.heat_partition.peclet).toBeGreaterThan(0);
  });

  it("coolant_effectiveness populated", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.coolant_effectiveness.h_mean).toBeGreaterThan(0);
  });

  it("dominant_uncertainty is a string", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(typeof r.value.dominant_uncertainty).toBe("string");
    expect(r.value.dominant_uncertainty.length).toBeGreaterThan(0);
  });

  it("cv_percent is positive", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.cv_percent).toBeGreaterThan(0);
  });

  it("FOSM and MC both populated with method='both'", () => {
    const r = stochasticThermalEngine.compute({ ...baseInput, method: "both" });
    expect(r.value.fosm).not.toBeNull();
    expect(r.value.mc).not.toBeNull();
    expect(r.value.fosm!.mean).toBeGreaterThan(25);
    expect(r.value.mc!.mean).toBeGreaterThan(25);
  });

  it("mc histogram has bins", () => {
    const r = stochasticThermalEngine.compute(baseInput);
    expect(r.value.mc).not.toBeNull();
    expect(r.value.mc!.histogram.length).toBeGreaterThan(0);
  });

  it("higher speed yields higher temperature", () => {
    const slow = stochasticThermalEngine.compute({ ...baseInput, cutting_speed_mpm: 30 });
    const fast = stochasticThermalEngine.compute({ ...baseInput, cutting_speed_mpm: 120 });
    expect(fast.value.mean_temp_c).toBeGreaterThan(slow.value.mean_temp_c);
  });

  it("cryogenic produces lower temp than flood", () => {
    const cryo = stochasticThermalEngine.compute({ ...baseInput, coolant_type: "cryogenic" as const });
    const flood = stochasticThermalEngine.compute(baseInput);
    expect(cryo.value.mean_temp_c).toBeLessThan(flood.value.mean_temp_c);
  });
});

// ============================================================================
// 4. StochasticSurfaceFinishEngine
// ============================================================================

describe("StochasticSurfaceFinishEngine", () => {
  const baseInput = {
    material: "AISI 4140",
    feed_mm: 0.15,
    tool_nose_radius_mm: 0.8,
    cutting_speed_mpm: 200,
    operation: "turning" as const,
    target_ra_um: 3.2,
    n_trials: 500,
  };

  it("theoretical_ra > 0", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.theoretical_ra_um).toBeGreaterThan(0);
  });

  it("mean_ra >= theoretical_ra (scatter adds roughness)", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.mean_ra_um).toBeGreaterThanOrEqual(r.value.theoretical_ra_um);
  });

  it("ci_95 brackets mean", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.ci_95[0]).toBeLessThan(r.value.mean_ra_um);
    expect(r.value.ci_95[1]).toBeGreaterThan(r.value.mean_ra_um);
  });

  it("ci_99 wider than ci_95", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.ci_99[0]).toBeLessThanOrEqual(r.value.ci_95[0]);
    expect(r.value.ci_99[1]).toBeGreaterThanOrEqual(r.value.ci_95[1]);
  });

  it("cpk is a number when target given", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.cpk).not.toBeNull();
    expect(typeof r.value.cpk).toBe("number");
  });

  it("sigma_level populated when target given", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.sigma_level).not.toBeNull();
    expect(typeof r.value.sigma_level).toBe("number");
  });

  it("scatter_breakdown has sources", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.scatter_breakdown.length).toBeGreaterThan(0);
    const sources = r.value.scatter_breakdown.map((s) => s.source);
    expect(sources).toContain("vibration");
    expect(sources).toContain("BUE");
  });

  it("bue_probability between 0 and 1", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.bue_probability).toBeGreaterThanOrEqual(0);
    expect(r.value.bue_probability).toBeLessThanOrEqual(1);
  });

  it("recommendations is array with entries", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(Array.isArray(r.value.recommendations)).toBe(true);
    expect(r.value.recommendations.length).toBeGreaterThan(0);
  });

  it("sobol_indices populated from MC", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.sobol_indices.length).toBeGreaterThan(0);
  });

  it("dominant_uncertainty is a string", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(typeof r.value.dominant_uncertainty).toBe("string");
    expect(r.value.dominant_uncertainty.length).toBeGreaterThan(0);
  });

  it("chatter_proximity between 0 and 1", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.chatter_proximity).toBeGreaterThanOrEqual(0);
    expect(r.value.chatter_proximity).toBeLessThanOrEqual(1);
  });

  it("mc histogram has bins", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.mc).not.toBeNull();
    expect(r.value.mc!.histogram.length).toBeGreaterThan(0);
  });

  it("p_exceed_target populated when target given", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.p_exceed_target).not.toBeNull();
    expect(r.value.p_exceed_target!).toBeGreaterThanOrEqual(0);
    expect(r.value.p_exceed_target!).toBeLessThanOrEqual(1);
  });

  it("higher feed yields higher theoretical Ra", () => {
    const lo = stochasticSurfaceFinishEngine.compute({ ...baseInput, feed_mm: 0.05 });
    const hi = stochasticSurfaceFinishEngine.compute({ ...baseInput, feed_mm: 0.30 });
    expect(hi.value.theoretical_ra_um).toBeGreaterThan(lo.value.theoretical_ra_um);
  });

  it("FOSM and MC both populated with method='both'", () => {
    const r = stochasticSurfaceFinishEngine.compute({ ...baseInput, method: "both" });
    expect(r.value.fosm).not.toBeNull();
    expect(r.value.mc).not.toBeNull();
  });

  it("cv_percent is positive", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.cv_percent).toBeGreaterThan(0);
  });

  it("std_dev_um is positive", () => {
    const r = stochasticSurfaceFinishEngine.compute(baseInput);
    expect(r.value.std_dev_um).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. StochasticChatterEngine
// ============================================================================

describe("StochasticChatterEngine", () => {
  const baseInput = {
    material: "AISI 4140",
    speed_range_rpm: [3000, 15000] as [number, number],
    depth_range_mm: [0.5, 5] as [number, number],
    flute_count: 4,
    tool_diameter_mm: 10,
    n_trials: 200,
    speed_points: 10,
    depth_points: 8,
  };

  it("grid has speed_points * depth_points entries", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.grid.length).toBe(10 * 8);
  });

  it("p_chatter between 0 and 1 for all grid points", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    for (const pt of r.value.grid) {
      expect(pt.p_chatter).toBeGreaterThanOrEqual(0);
      expect(pt.p_chatter).toBeLessThanOrEqual(1);
    }
  });

  it("grid points have valid mean_a_lim_mm", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    for (const pt of r.value.grid) {
      expect(pt.mean_a_lim_mm).toBeGreaterThanOrEqual(0);
    }
  });

  it("contours has entries", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.contours.length).toBeGreaterThan(0);
  });

  it("contours have valid probability levels", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    for (const c of r.value.contours) {
      expect(c.probability).toBeGreaterThan(0);
      expect(c.probability).toBeLessThanOrEqual(1);
    }
  });

  it("safe_zone has entries", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.safe_zone.length).toBeGreaterThan(0);
    expect(r.value.safe_zone.length).toBe(10); // one per speed point
  });

  it("safe_zone max_depth_mm >= 0", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    for (const sz of r.value.safe_zone) {
      expect(sz.max_depth_mm).toBeGreaterThanOrEqual(0);
      expect(sz.threshold).toBe(0.05);
    }
  });

  it("sobol_indices has 5 entries", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.sobol_indices.length).toBe(5);
    const names = r.value.sobol_indices.map((s) => s.parameter);
    expect(names).toContain("natural_freq_hz");
    expect(names).toContain("damping_ratio");
    expect(names).toContain("Kc");
    expect(names).toContain("stiffness");
    expect(names).toContain("process_damping");
  });

  it("sobol Si and STi are in [0,1]", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    for (const s of r.value.sobol_indices) {
      expect(s.Si).toBeGreaterThanOrEqual(0);
      expect(s.Si).toBeLessThanOrEqual(1);
      expect(s.STi).toBeGreaterThanOrEqual(0);
      expect(s.STi).toBeLessThanOrEqual(1);
    }
  });

  it("summary has optimal values", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.summary.optimal_speed_rpm).toBeGreaterThan(0);
    expect(r.value.summary.optimal_depth_mm).toBeGreaterThanOrEqual(0);
    expect(r.value.summary.deterministic_vs_stochastic_ratio).toBeGreaterThan(0);
  });

  it("summary min_safe_depth <= max_safe_depth", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.summary.min_safe_depth_mm).toBeLessThanOrEqual(
      r.value.summary.max_safe_depth_mm
    );
  });

  it("dominant_uncertainty is a string", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(typeof r.value.dominant_uncertainty).toBe("string");
    expect(r.value.dominant_uncertainty.length).toBeGreaterThan(0);
  });

  it("bayesian is null without tap_test", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.bayesian).toBeNull();
  });

  it("Bayesian with tap_test narrows uncertainty", () => {
    const r = stochasticChatterEngine.compute({
      ...baseInput,
      tap_test: [
        { freq_hz: 700, magnitude: 0.2, phase_deg: -20 },
        { freq_hz: 800, magnitude: 0.5, phase_deg: -45 },
        { freq_hz: 850, magnitude: 1.0, phase_deg: -90 },
        { freq_hz: 900, magnitude: 0.5, phase_deg: -135 },
        { freq_hz: 1000, magnitude: 0.2, phase_deg: -160 },
      ],
    });
    expect(r.value.bayesian).not.toBeNull();
    expect(r.value.bayesian!.uncertainty_reduction_pct).toBeGreaterThan(0);
    expect(r.value.bayesian!.posterior_fn_hz).toBeGreaterThan(0);
    expect(r.value.bayesian!.posterior_zeta).toBeGreaterThan(0);
  });

  it("material_scatter has 5 entries", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    expect(r.value.material_scatter.length).toBe(5);
    for (const ms of r.value.material_scatter) {
      expect(ms.cv_pct).toBeGreaterThan(0);
    }
  });

  it("deeper cuts have higher p_chatter than shallow cuts at same speed", () => {
    const r = stochasticChatterEngine.compute(baseInput);
    // For each speed, p_chatter should generally increase with depth
    for (let si = 0; si < 10; si++) {
      const firstPt = r.value.grid[si * 8]; // shallowest
      const lastPt = r.value.grid[si * 8 + 7]; // deepest
      expect(lastPt.p_chatter).toBeGreaterThanOrEqual(firstPt.p_chatter);
    }
  });
});

// ============================================================================
// 6. UncertaintyPropagationPipelineEngine
// ============================================================================

describe("UncertaintyPropagationPipelineEngine", () => {
  const baseInput = {
    uncertain_params: [
      { name: "kc1_1", mean: 1800, std_dev: 180 },
      { name: "depth_mm", mean: 2, std_dev: 0.1 },
      { name: "feed_mm", mean: 0.1, std_dev: 0.005 },
    ],
    stages: [
      {
        name: "force",
        model: "kienzle_force" as const,
        fixed_params: { tool_diameter_mm: 10 },
      },
      {
        name: "deflection",
        model: "deflection" as const,
        input_mapping: { force_n: "cutting_force_n" },
        fixed_params: { tool_diameter_mm: 10 },
      },
    ],
    method: "mc" as const,
    n_trials: 500,
  };

  it("stages array has 2 entries", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.stages.length).toBe(2);
  });

  it("stage names match input", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.stages[0].name).toBe("force");
    expect(r.value.stages[1].name).toBe("deflection");
  });

  it("final has mean > 0", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.final.mean).toBeGreaterThan(0);
  });

  it("final has std_dev > 0", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.final.std_dev).toBeGreaterThan(0);
  });

  it("final ci_95 brackets mean", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.final.ci_95[0]).toBeLessThan(r.value.final.mean);
    expect(r.value.final.ci_95[1]).toBeGreaterThan(r.value.final.mean);
  });

  it("final ci_99 wider than ci_95", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.final.ci_99[0]).toBeLessThanOrEqual(r.value.final.ci_95[0]);
    expect(r.value.final.ci_99[1]).toBeGreaterThanOrEqual(r.value.final.ci_95[1]);
  });

  it("sensitivities has 3 entries", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.sensitivities.length).toBe(3);
  });

  it("sensitivities sum approximately to 100%", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    const total = r.value.sensitivities.reduce((s, v) => s + v.contribution_pct, 0);
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it("sensitivities have parameter names matching input", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    const names = r.value.sensitivities.map((s) => s.parameter);
    expect(names).toContain("kc1_1");
    expect(names).toContain("depth_mm");
    expect(names).toContain("feed_mm");
  });

  it("bottleneck_stage is a string", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(typeof r.value.bottleneck_stage).toBe("string");
    expect(r.value.bottleneck_stage.length).toBeGreaterThan(0);
  });

  it("dominant_parameter is a string", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(typeof r.value.dominant_parameter).toBe("string");
    expect(r.value.dominant_parameter.length).toBeGreaterThan(0);
  });

  it("histogram has bins", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.histogram.length).toBeGreaterThan(0);
    const totalCount = r.value.histogram.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(500);
  });

  it("method is 'mc'", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.method).toBe("mc");
  });

  it("per-stage output_mean > 0", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    for (const s of r.value.stages) {
      expect(s.output_mean).toBeGreaterThan(0);
    }
  });

  it("per-stage output_std > 0", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    for (const s of r.value.stages) {
      expect(s.output_std).toBeGreaterThan(0);
    }
  });

  it("per-stage variance_contribution_pct >= 0", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    for (const s of r.value.stages) {
      expect(s.variance_contribution_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it("FOSM method works", () => {
    // FOSM on a single-stage pipeline to ensure std_dev propagates
    const r = uncertaintyPropagationPipelineEngine.propagate({
      uncertain_params: [
        { name: "kc1_1", mean: 1800, std_dev: 180 },
        { name: "depth_mm", mean: 2, std_dev: 0.1 },
        { name: "feed_mm", mean: 0.1, std_dev: 0.005 },
      ],
      stages: [
        {
          name: "force",
          model: "kienzle_force" as const,
          fixed_params: { tool_diameter_mm: 10 },
        },
      ],
      method: "fosm",
    });
    expect(r.value.method).toBe("fosm");
    expect(r.value.final.mean).toBeGreaterThan(0);
    expect(r.value.final.std_dev).toBeGreaterThan(0);
    expect(r.value.stages.length).toBe(1);
  });

  it("PCE method works", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate({
      ...baseInput,
      method: "pce",
    });
    expect(r.value.method).toBe("pce");
    expect(r.value.final.mean).toBeGreaterThan(0);
    expect(r.value.final.std_dev).toBeGreaterThan(0);
  });

  it("method_comparison present for PCE", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate({
      ...baseInput,
      method: "pce",
    });
    expect(r.value.method_comparison).toBeDefined();
    expect(r.value.method_comparison!.length).toBe(2);
    const methods = r.value.method_comparison!.map((m) => m.method);
    expect(methods).toContain("pce");
    expect(methods).toContain("mc");
  });

  it("PCE and MC means are in reasonable agreement", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate({
      ...baseInput,
      method: "pce",
      n_trials: 500,
    });
    const pce = r.value.method_comparison!.find((m) => m.method === "pce")!;
    const mc = r.value.method_comparison!.find((m) => m.method === "mc")!;
    // Means should be within 50% of each other
    const ratio = pce.mean / mc.mean;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });

  it("unit is uncertainty_pipeline", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.unit).toBe("uncertainty_pipeline");
  });

  it("lognormal distribution input works", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate({
      ...baseInput,
      uncertain_params: [
        { name: "kc1_1", mean: 1800, std_dev: 180, distribution: "lognormal" },
        { name: "depth_mm", mean: 2, std_dev: 0.1 },
        { name: "feed_mm", mean: 0.1, std_dev: 0.005 },
      ],
    });
    expect(r.value.final.mean).toBeGreaterThan(0);
  });

  it("final cv_pct is positive", () => {
    const r = uncertaintyPropagationPipelineEngine.propagate(baseInput);
    expect(r.value.final.cv_pct).toBeGreaterThan(0);
  });
});
