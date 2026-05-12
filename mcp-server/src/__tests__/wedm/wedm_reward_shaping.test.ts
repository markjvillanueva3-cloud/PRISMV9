/**
 * WEDMRewardShapingEngine tests — WEDM AGI Phase 3 / P3-MS3 / U-P3-11.
 *
 * Covers:
 *  - Term function shapes (Ra gaussian, MRR tanh, wire-break heuristic)
 *  - Weight application, flagging, and full reward composition
 *  - Potential-invariance spot-checks: on-target cut ≈ max reward; far-off ≈ min
 */
import { describe, it, expect } from "vitest";
import {
  WEDMRewardShapingEngine,
  wedmRewardShapingEngine,
  DEFAULT_WEIGHTS,
  DEFAULT_RA_TOLERANCE_FRAC,
  _raTermValue,
  _mrrTermValue,
  _wireBreakRiskTerm,
  type RewardContext,
} from "../../engines/WEDMRewardShapingEngine.js";
import type {
  WEDMCutOutcome,
  WEDMCutTarget,
  WEDMRecipe,
} from "../../engines/WEDMFewShotEngine.js";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

const TARGET: WEDMCutTarget = {
  target_ra_um: 2.5,
  target_mrr_mm3_per_min: 18,
};

const ON_TARGET_OUTCOME: WEDMCutOutcome = {
  actual_ra_um: 2.5,
  actual_mrr_mm3_per_min: 18,
  spark_stability: 0.9,
};

const BAD_OUTCOME: WEDMCutOutcome = {
  actual_ra_um: 5.0, // 2× target
  actual_mrr_mm3_per_min: 6,
  spark_stability: 0.2,
};

const SAFE_RECIPE: WEDMRecipe = {
  peak_current_A: 8,
  pulse_on_us: 10,
  pulse_off_us: 40,
  wire_tension_N: 10,
};

const RISKY_RECIPE: WEDMRecipe = {
  peak_current_A: 40,   // well above WBR_IP_CRITICAL (25)
  pulse_on_us: 18,
  pulse_off_us: 5,      // well below WBR_TOFF_MIN (15)
  wire_tension_N: 10,
};

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMRewardShapingEngine — defaults", () => {
  it("ships with interpretable default weights", () => {
    expect(DEFAULT_WEIGHTS.ra).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.mrr).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.spark).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.wireBreak).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_WEIGHTS.stepCompletion).toBeGreaterThanOrEqual(0);
  });

  it("default Ra tolerance matches Few-Shot convergence (10%)", () => {
    expect(DEFAULT_RA_TOLERANCE_FRAC).toBeCloseTo(0.1, 6);
  });

  it("singleton exposes the default weights", () => {
    const w = wedmRewardShapingEngine.getWeights();
    expect(w).toEqual(DEFAULT_WEIGHTS);
  });
});

describe("WEDMRewardShapingEngine — Ra term", () => {
  it("on-target Ra yields +1 (max raw Ra-term value)", () => {
    expect(_raTermValue(0)).toBeCloseTo(1.0, 5);
  });

  it("Ra over-shoot side (actual > target) decays more gently than under-shoot", () => {
    const over = _raTermValue(0.5);
    const under = _raTermValue(-0.5);
    expect(over).toBeGreaterThan(under); // over-polish is less harmful
  });

  it("large Ra error ( ±3 σ) tends to -1", () => {
    const v = _raTermValue(-5);
    expect(v).toBeLessThan(-0.9);
  });

  it("Ra term is symmetric at zero error", () => {
    expect(_raTermValue(0)).toBeCloseTo(1.0, 6);
  });
});

describe("WEDMRewardShapingEngine — MRR term", () => {
  it("zero MRR error yields zero (tanh(0) = 0)", () => {
    expect(_mrrTermValue(0)).toBeCloseTo(0, 6);
  });

  it("positive MRR over-shoot approaches +1 but never exceeds it", () => {
    expect(_mrrTermValue(10)).toBeLessThanOrEqual(1);
    expect(_mrrTermValue(10)).toBeGreaterThan(0.9);
  });

  it("negative MRR under-shoot approaches -1 but never goes below it", () => {
    expect(_mrrTermValue(-10)).toBeGreaterThanOrEqual(-1);
    expect(_mrrTermValue(-10)).toBeLessThan(-0.9);
  });

  it("MRR term is monotonically increasing in the relative error", () => {
    let prev = -Infinity;
    for (let e = -2; e <= 2; e += 0.25) {
      const v = _mrrTermValue(e);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("WEDMRewardShapingEngine — wire-break-risk term", () => {
  it("safe recipe yields near-zero risk", () => {
    expect(_wireBreakRiskTerm(SAFE_RECIPE)).toBeLessThan(0.1);
  });

  it("high-current + short off-time recipe yields high risk", () => {
    expect(_wireBreakRiskTerm(RISKY_RECIPE)).toBeGreaterThan(0.6);
  });

  it("risk is bounded to [0, 1]", () => {
    const absurd: WEDMRecipe = {
      peak_current_A: 9999,
      pulse_on_us: 1,
      pulse_off_us: 0.1,
      wire_tension_N: 10,
    };
    const r = _wireBreakRiskTerm(absurd);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

describe("WEDMRewardShapingEngine — shape() composition", () => {
  it("on-target cut yields a positive total reward", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: ON_TARGET_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.flags).toContain("ra_within_tolerance");
  });

  it("far-off cut yields a more negative total than on-target", () => {
    const good = wedmRewardShapingEngine.reward({
      target: TARGET,
      outcome: ON_TARGET_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    });
    const bad = wedmRewardShapingEngine.reward({
      target: TARGET,
      outcome: BAD_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    });
    expect(good).toBeGreaterThan(bad);
  });

  it("aborted step zeroes the step-completion component", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: ON_TARGET_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: false,
    });
    expect(r.components.stepCompletion).toBe(0);
    expect(r.flags).toContain("step_aborted");
  });

  it("risky recipe flags wire_break_risk_high and subtracts from reward", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: ON_TARGET_OUTCOME,
      recipe: RISKY_RECIPE,
      stepCompleted: true,
    });
    expect(r.flags).toContain("wire_break_risk_high");
    expect(r.components.wireBreak).toBeLessThan(0);
  });

  it("breakdown components sum to the total (no hidden additions)", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: BAD_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    });
    const sum =
      r.components.ra +
      r.components.mrr +
      r.components.spark +
      r.components.wireBreak +
      r.components.stepCompletion;
    expect(r.total).toBeCloseTo(sum, 3);
  });

  it("Ra far-off-target flag fires at |relErr| > 0.5", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: { actual_ra_um: 5.0, actual_mrr_mm3_per_min: 18 },
      stepCompleted: true,
    });
    expect(r.flags).toContain("ra_far_off_target");
  });

  it("spark_stability absent → defaults to 0.75 (not a penalty)", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: { actual_ra_um: 2.5, actual_mrr_mm3_per_min: 18 },
      stepCompleted: true,
    });
    expect(r.components.spark).toBeGreaterThan(0);
  });

  it("MRR severely below target flags mrr_severely_low", () => {
    const r = wedmRewardShapingEngine.shape({
      target: TARGET,
      outcome: { actual_ra_um: 2.5, actual_mrr_mm3_per_min: 5 },
      stepCompleted: true,
    });
    expect(r.flags).toContain("mrr_severely_low");
  });
});

describe("WEDMRewardShapingEngine — weight management", () => {
  it("setWeights overrides selected weights", () => {
    const engine = new WEDMRewardShapingEngine();
    engine.setWeights({ ra: 2.0 });
    expect(engine.getWeights().ra).toBeCloseTo(2.0, 6);
    expect(engine.getWeights().mrr).toBeCloseTo(DEFAULT_WEIGHTS.mrr, 6);
  });

  it("setWeights rejects negative weights", () => {
    const engine = new WEDMRewardShapingEngine();
    expect(() => engine.setWeights({ spark: -0.1 })).toThrow();
  });

  it("setWeights rejects NaN weights", () => {
    const engine = new WEDMRewardShapingEngine();
    expect(() => engine.setWeights({ mrr: Number.NaN })).toThrow();
  });

  it("constructor applies custom weights atomically", () => {
    const engine = new WEDMRewardShapingEngine({ ra: 1.5, mrr: 0.2 });
    const w = engine.getWeights();
    expect(w.ra).toBeCloseTo(1.5, 6);
    expect(w.mrr).toBeCloseTo(0.2, 6);
    expect(w.spark).toBeCloseTo(DEFAULT_WEIGHTS.spark, 6);
  });

  it("higher Ra weight amplifies the Ra-term influence on total reward", () => {
    const lo = new WEDMRewardShapingEngine({ ra: 0.1 });
    const hi = new WEDMRewardShapingEngine({ ra: 5.0 });
    const ctx: RewardContext = {
      target: TARGET,
      outcome: ON_TARGET_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    };
    expect(hi.reward(ctx) - lo.reward(ctx)).toBeGreaterThan(3);
  });
});

describe("WEDMRewardShapingEngine — argument validation", () => {
  it("zero or negative target_ra_um throws", () => {
    const engine = new WEDMRewardShapingEngine();
    expect(() =>
      engine.shape({
        target: { target_ra_um: 0, target_mrr_mm3_per_min: 18 },
        outcome: ON_TARGET_OUTCOME,
      }),
    ).toThrow();
    expect(() =>
      engine.shape({
        target: { target_ra_um: -1, target_mrr_mm3_per_min: 18 },
        outcome: ON_TARGET_OUTCOME,
      }),
    ).toThrow();
  });

  it("zero or negative target_mrr throws", () => {
    const engine = new WEDMRewardShapingEngine();
    expect(() =>
      engine.shape({
        target: { target_ra_um: 2.5, target_mrr_mm3_per_min: 0 },
        outcome: ON_TARGET_OUTCOME,
      }),
    ).toThrow();
  });

  it("constructor validates initial weights", () => {
    expect(() => new WEDMRewardShapingEngine({ wireBreak: -5 })).toThrow();
    expect(() => new WEDMRewardShapingEngine({ ra: Number.NaN })).toThrow();
  });
});

describe("WEDMRewardShapingEngine — idempotence and isolation", () => {
  it("multiple engines are independent", () => {
    const a = new WEDMRewardShapingEngine({ ra: 1 });
    const b = new WEDMRewardShapingEngine({ ra: 9 });
    expect(a.getWeights().ra).toBeCloseTo(1, 6);
    expect(b.getWeights().ra).toBeCloseTo(9, 6);
  });

  it("getWeights returns a copy (mutating it doesn't change engine state)", () => {
    const engine = new WEDMRewardShapingEngine();
    const w = engine.getWeights();
    w.ra = 999;
    expect(engine.getWeights().ra).toBeCloseTo(DEFAULT_WEIGHTS.ra, 6);
  });

  it("shape() is a pure function — repeated calls yield identical totals", () => {
    const engine = new WEDMRewardShapingEngine();
    const ctx: RewardContext = {
      target: TARGET,
      outcome: BAD_OUTCOME,
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    };
    const r1 = engine.reward(ctx);
    const r2 = engine.reward(ctx);
    const r3 = engine.reward(ctx);
    expect(r1).toBeCloseTo(r2, 8);
    expect(r2).toBeCloseTo(r3, 8);
  });
});

describe("WEDMRewardShapingEngine — extremes", () => {
  it("perfect cut + safe recipe yields reward near the max of the weight-sum", () => {
    const engine = new WEDMRewardShapingEngine();
    const r = engine.reward({
      target: TARGET,
      outcome: { actual_ra_um: 2.5, actual_mrr_mm3_per_min: 18, spark_stability: 1 },
      recipe: SAFE_RECIPE,
      stepCompleted: true,
    });
    // Upper bound ≈ w_ra·1 + w_mrr·0 + w_spark·1 + w_wbr·0 + w_step·1
    //            = 1.0 + 0 + 0.5 + 0 + 0.2 = 1.7
    expect(r).toBeGreaterThan(1.5);
    expect(r).toBeLessThanOrEqual(
      DEFAULT_WEIGHTS.ra +
        DEFAULT_WEIGHTS.mrr +
        DEFAULT_WEIGHTS.spark +
        DEFAULT_WEIGHTS.stepCompletion + 1e-6,
    );
  });

  it("worst cut + risky recipe yields a strongly negative reward", () => {
    const engine = new WEDMRewardShapingEngine();
    const r = engine.reward({
      target: TARGET,
      outcome: {
        actual_ra_um: 10,  // 4× target
        actual_mrr_mm3_per_min: 1, // 5% of target
        spark_stability: 0.05,
      },
      recipe: RISKY_RECIPE,
      stepCompleted: false,
    });
    expect(r).toBeLessThan(-1);
  });
});
