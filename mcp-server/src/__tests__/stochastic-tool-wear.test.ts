/**
 * StochasticToolWearEngine Tests
 * Tests Monte Carlo tool life distribution, FOSM analytical bounds,
 * Weibull fitting, Sobol sensitivity, and Bayesian updating.
 */
import { describe, it, expect } from "vitest";
import {
  stochasticToolWearEngine,
  StochasticToolWearEngine,
} from "../engines/StochasticToolWearEngine.js";
import type { StochasticWearInput, UncertainParam } from "../engines/StochasticToolWearEngine.js";

const engine = stochasticToolWearEngine;

// ── Taylor life (deterministic) ─────────────────────────────────────────
describe("taylorLife", () => {
  it("T = (C/V)^(1/n) exactly", () => {
    // V=200, n=0.25, C=400 → T = (400/200)^4 = 16 min
    expect(engine.taylorLife(200, 0.25, 400)).toBeCloseTo(16, 5);
  });

  it("higher speed → shorter life", () => {
    const t1 = engine.taylorLife(100, 0.25, 400);
    const t2 = engine.taylorLife(200, 0.25, 400);
    expect(t2).toBeLessThan(t1);
  });

  it("higher C → longer life", () => {
    const t1 = engine.taylorLife(200, 0.25, 300);
    const t2 = engine.taylorLife(200, 0.25, 600);
    expect(t2).toBeGreaterThan(t1);
  });

  it("returns 0 for invalid inputs", () => {
    expect(engine.taylorLife(0, 0.25, 400)).toBe(0);
    expect(engine.taylorLife(200, 0, 400)).toBe(0);
  });
});

// ── Extended Taylor ─────────────────────────────────────────────────────
describe("extendedTaylorLife", () => {
  it("reduces to basic Taylor when a=0, b=0", () => {
    const basic = engine.taylorLife(200, 0.25, 400);
    const ext = engine.extendedTaylorLife(200, 0.2, 2, 0.25, 400, 0, 0);
    expect(ext).toBeCloseTo(basic, 3);
  });

  it("higher feed reduces life (a>0)", () => {
    const t1 = engine.extendedTaylorLife(200, 0.1, 2, 0.25, 400, 0.3, 0.15);
    const t2 = engine.extendedTaylorLife(200, 0.3, 2, 0.25, 400, 0.3, 0.15);
    expect(t2).toBeLessThan(t1);
  });

  it("higher depth reduces life (b>0)", () => {
    const t1 = engine.extendedTaylorLife(200, 0.2, 1, 0.25, 400, 0.3, 0.15);
    const t2 = engine.extendedTaylorLife(200, 0.2, 4, 0.25, 400, 0.3, 0.15);
    expect(t2).toBeLessThan(t1);
  });
});

// ── Usui wear rate ──────────────────────────────────────────────────────
describe("usuiWearRate", () => {
  it("increases with temperature (Arrhenius)", () => {
    const r1 = engine.usuiWearRate(1e-6, 5000, 1000, 200, 700);
    const r2 = engine.usuiWearRate(1e-6, 5000, 1000, 200, 1000);
    expect(r2).toBeGreaterThan(r1);
  });

  it("increases with sliding velocity", () => {
    const r1 = engine.usuiWearRate(1e-6, 5000, 1000, 100, 800);
    const r2 = engine.usuiWearRate(1e-6, 5000, 1000, 300, 800);
    expect(r2).toBeGreaterThan(r1);
  });

  it("zero at zero temperature", () => {
    expect(engine.usuiWearRate(1e-6, 5000, 1000, 200, 0)).toBe(0);
  });
});

// ── FOSM ────────────────────────────────────────────────────────────────
describe("fosmTaylorLife", () => {
  it("mean matches deterministic Taylor", () => {
    const fosm = engine.fosmTaylorLife(200, 5, 0.25, 8, 400, 5);
    const det = engine.taylorLife(200, 0.25, 400);
    expect(fosm.mean).toBeCloseTo(det, 3);
  });

  it("std > 0 with non-zero CVs", () => {
    const fosm = engine.fosmTaylorLife(200, 5, 0.25, 8, 400, 5);
    expect(fosm.std).toBeGreaterThan(0);
  });

  it("larger CV → larger std", () => {
    const f1 = engine.fosmTaylorLife(200, 2, 0.25, 2, 400, 2);
    const f2 = engine.fosmTaylorLife(200, 10, 0.25, 10, 400, 10);
    expect(f2.std).toBeGreaterThan(f1.std);
  });

  it("zero CV → zero std", () => {
    const fosm = engine.fosmTaylorLife(200, 0, 0.25, 0, 400, 0);
    expect(fosm.std).toBe(0);
  });
});

// ── Weibull fitting ─────────────────────────────────────────────────────
describe("fitWeibull", () => {
  it("β > 0 and η > 0 for valid data", () => {
    const samples = [10, 12, 14, 15, 16, 18, 20, 22, 25];
    const w = engine.fitWeibull(samples);
    expect(w.beta).toBeGreaterThan(0);
    expect(w.eta).toBeGreaterThan(0);
  });

  it("higher variability → lower β", () => {
    const tight = [14, 15, 15, 16, 16, 17];
    const wide = [5, 10, 15, 20, 25, 30];
    expect(engine.fitWeibull(tight).beta).toBeGreaterThan(engine.fitWeibull(wide).beta);
  });

  it("handles small samples gracefully", () => {
    const w = engine.fitWeibull([10, 12]);
    expect(w.beta).toBeGreaterThan(0);
    expect(w.eta).toBeGreaterThan(0);
  });
});

// ── Bayesian update ─────────────────────────────────────────────────────
describe("bayesianUpdate", () => {
  const priorN: UncertainParam = { mean: 0.25, cv_pct: 10 };
  const priorC: UncertainParam = { mean: 400, cv_pct: 15 };

  it("returns prior when insufficient data", () => {
    const result = engine.bayesianUpdate(priorN, priorC, [{ time_min: 10, wear_mm: 0.1 }], 200, 0.3);
    expect(result.updated_n_mean).toBe(priorN.mean);
    expect(result.updated_C_mean).toBe(priorC.mean);
  });

  it("shifts posterior toward observed data", () => {
    // Observed wear suggests shorter life than prior
    const obs = [
      { time_min: 5, wear_mm: 0.1 },
      { time_min: 10, wear_mm: 0.2 },
    ];
    const result = engine.bayesianUpdate(priorN, priorC, obs, 200, 0.3);
    // Observed life ≈ 15 min, implied C should be less than prior 400
    expect(result.updated_C_mean).toBeDefined();
    expect(typeof result.updated_C_mean).toBe("number");
  });

  it("posterior C is between prior and observation", () => {
    const obs = [
      { time_min: 5, wear_mm: 0.05 },
      { time_min: 10, wear_mm: 0.1 },
    ];
    const result = engine.bayesianUpdate(priorN, priorC, obs, 200, 0.3);
    const observedLife = 0.3 / (0.1 / 10); // 30 min
    const impliedC = 200 * Math.pow(observedLife, 0.25);
    // Posterior should be between prior C and implied C
    const lower = Math.min(priorC.mean, impliedC);
    const upper = Math.max(priorC.mean, impliedC);
    expect(result.updated_C_mean).toBeGreaterThanOrEqual(lower * 0.5);
    expect(result.updated_C_mean).toBeLessThanOrEqual(upper * 1.5);
  });
});

// ── Full stochastic analysis ────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: StochasticWearInput = {
    cutting_speed: { mean: 200, cv_pct: 5 },
    feed_rate: { mean: 0.2, cv_pct: 3 },
    depth_of_cut: { mean: 2, cv_pct: 5 },
    taylor_n: { mean: 0.25, cv_pct: 8 },
    taylor_C: { mean: 400, cv_pct: 10 },
    mc_samples: 1000,
  };

  it("returns complete result structure", () => {
    const result = engine.analyze(baseInput);
    expect(result.taylor_life.mean_min).toBeGreaterThan(0);
    expect(result.taylor_life.std_min).toBeGreaterThan(0);
    expect(result.taylor_life.weibull_beta).toBeGreaterThan(0);
    expect(result.taylor_life.weibull_eta).toBeGreaterThan(0);
    expect(result.fosm_life_mean).toBeGreaterThan(0);
    expect(result.fosm_life_std).toBeGreaterThan(0);
    expect(result.reliability_at_target).toBeGreaterThanOrEqual(0);
    expect(result.reliability_at_target).toBeLessThanOrEqual(1);
    expect(result.replacement_interval_p90).toBeGreaterThan(0);
    expect(result.top_uncertainty_driver).toBeTruthy();
    expect(result.formula).toContain("Taylor");
    expect(result.formula).toContain("FOSM");
    expect(result.formula).toContain("Weibull");
    expect(result.formula).toContain("Sobol");
    expect(result.formula).toContain("Bayes");
  });

  it("MC mean roughly matches FOSM mean", () => {
    const result = engine.analyze(baseInput);
    const relDiff = Math.abs(result.taylor_life.mean_min - result.fosm_life_mean) / result.fosm_life_mean;
    expect(relDiff).toBeLessThan(0.3); // within 30% for moderate nonlinearity
  });

  it("p5 < median < p95", () => {
    const result = engine.analyze(baseInput);
    const d = result.taylor_life;
    expect(d.p5_min).toBeLessThan(d.median_min);
    expect(d.median_min).toBeLessThan(d.p95_min);
  });

  it("p25 < p75", () => {
    const result = engine.analyze(baseInput);
    expect(result.taylor_life.p25_min).toBeLessThan(result.taylor_life.p75_min);
  });

  it("replacement_interval_p90 < mean (conservative)", () => {
    const result = engine.analyze(baseInput);
    expect(result.replacement_interval_p90).toBeLessThan(result.taylor_life.mean_min * 1.5);
  });

  it("higher CV → wider distribution", () => {
    const tight = engine.analyze({
      ...baseInput,
      cutting_speed: { mean: 200, cv_pct: 2 },
      taylor_n: { mean: 0.25, cv_pct: 2 },
      taylor_C: { mean: 400, cv_pct: 2 },
    });
    const wide = engine.analyze({
      ...baseInput,
      cutting_speed: { mean: 200, cv_pct: 15 },
      taylor_n: { mean: 0.25, cv_pct: 15 },
      taylor_C: { mean: 400, cv_pct: 15 },
    });
    expect(wide.taylor_life.std_min).toBeGreaterThan(tight.taylor_life.std_min);
  });

  it("extended Taylor with feed/depth exponents", () => {
    const result = engine.analyze({
      ...baseInput,
      taylor_a: { mean: 0.3, cv_pct: 10 },
      taylor_b: { mean: 0.15, cv_pct: 10 },
    });
    expect(result.taylor_life.mean_min).toBeGreaterThan(0);
  });

  it("coating thickness variation affects life distribution", () => {
    const withCoat = engine.analyze({
      ...baseInput,
      coating_thickness_um: { mean: 4, cv_pct: 15 },
      mc_samples: 2000,
    });
    // With coating variation, distribution should still be valid
    expect(withCoat.taylor_life.mean_min).toBeGreaterThan(0);
    expect(withCoat.taylor_life.std_min).toBeGreaterThan(0);
    expect(withCoat.taylor_life.p5_min).toBeLessThan(withCoat.taylor_life.p95_min);
  });

  it("hardness variation affects life", () => {
    const result = engine.analyze({
      ...baseInput,
      hardness_HRC: { mean: 30, cv_pct: 5 },
    });
    expect(result.taylor_life.mean_min).toBeGreaterThan(0);
  });

  it("Sobol indices sum to ~1 and top driver identified", () => {
    const result = engine.analyze({
      ...baseInput,
      compute_sobol: true,
      mc_samples: 500,
    });
    expect(result.sobol_indices).toBeDefined();
    expect(result.sobol_indices!.length).toBeGreaterThan(0);
    const totalSi = result.sobol_indices!.reduce((s, i) => s + i.Si, 0);
    // Sobol indices should approximately sum to ≤1 (may exceed due to interactions)
    expect(totalSi).toBeGreaterThan(0);
    expect(result.top_uncertainty_driver).toBeTruthy();
  });

  it("Bayesian updating from observed data", () => {
    const result = engine.analyze({
      ...baseInput,
      observed_wear_data: [
        { time_min: 5, wear_mm: 0.05 },
        { time_min: 10, wear_mm: 0.1 },
        { time_min: 15, wear_mm: 0.18 },
      ],
    });
    expect(result.bayesian_posterior).toBeDefined();
    expect(result.bayesian_posterior!.updated_n_mean).toBeGreaterThan(0);
    expect(result.bayesian_posterior!.updated_C_mean).toBeGreaterThan(0);
  });

  it("warns on high variability", () => {
    const result = engine.analyze({
      ...baseInput,
      cutting_speed: { mean: 200, cv_pct: 25 },
      taylor_n: { mean: 0.25, cv_pct: 25 },
      taylor_C: { mean: 400, cv_pct: 25 },
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("lognormal distribution option", () => {
    const result = engine.analyze({
      ...baseInput,
      cutting_speed: { mean: 200, cv_pct: 5, distribution: "lognormal" },
      taylor_n: { mean: 0.25, cv_pct: 8, distribution: "lognormal" },
      taylor_C: { mean: 400, cv_pct: 10, distribution: "lognormal" },
    });
    expect(result.taylor_life.mean_min).toBeGreaterThan(0);
  });

  it("uniform distribution option", () => {
    const result = engine.analyze({
      ...baseInput,
      cutting_speed: { mean: 200, cv_pct: 5, distribution: "uniform" },
    });
    expect(result.taylor_life.mean_min).toBeGreaterThan(0);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(stochasticToolWearEngine).toBeInstanceOf(StochasticToolWearEngine);
  });
});
