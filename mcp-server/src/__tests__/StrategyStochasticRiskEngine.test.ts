import { describe, it, expect } from "vitest";
import {
  strategyStochasticRiskEngine,
  StrategyStochasticRiskEngine,
  type StrategyRiskCandidate,
  type StochasticRiskConfig,
} from "../engines/StrategyStochasticRiskEngine.js";

const C_GOOD: StrategyRiskCandidate = {
  strategy_id: "high_feed_roughing",
  dim_mean_mm: 0.0,
  dim_stddev_mm: 0.008,
  tool_life_mean_min: 90,
  tool_life_stddev_min: 10,
  ra_mean_um: 2.5,
  ra_stddev_um: 0.3,
  utility: 0.82,
};

const C_RISKY: StrategyRiskCandidate = {
  strategy_id: "aggressive_hsm",
  dim_mean_mm: 0.01,
  dim_stddev_mm: 0.025,
  tool_life_mean_min: 40,
  tool_life_stddev_min: 15,
  ra_mean_um: 3.5,
  ra_stddev_um: 0.8,
  utility: 0.90,
};

const C_CONSERVATIVE: StrategyRiskCandidate = {
  strategy_id: "gentle_finishing",
  dim_mean_mm: 0.0,
  dim_stddev_mm: 0.004,
  tool_life_mean_min: 200,
  tool_life_stddev_min: 15,
  ra_mean_um: 1.2,
  ra_stddev_um: 0.15,
  utility: 0.70,
};

const CONFIG: StochasticRiskConfig = {
  tolerance_mm: 0.03,
  min_tool_life_min: 30,
  max_ra_um: 3.2,
  trials: 500,
  seed: 42,
};

describe("StrategyStochasticRiskEngine", () => {
  it("exports a singleton", () => {
    expect(strategyStochasticRiskEngine).toBeInstanceOf(StrategyStochasticRiskEngine);
  });

  it("stochasticCompare returns a decision per candidate", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD, C_RISKY], CONFIG);
    expect(r.decisions).toHaveLength(2);
    expect(r.decisions[0].strategy_id).toBe("high_feed_roughing");
  });

  it("p_success is in [0,1]", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD, C_RISKY, C_CONSERVATIVE], CONFIG);
    for (const d of r.decisions) {
      expect(d.p_success).toBeGreaterThanOrEqual(0);
      expect(d.p_success).toBeLessThanOrEqual(1);
    }
  });

  it("conservative candidate has higher p_success than risky", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_CONSERVATIVE, C_RISKY], CONFIG);
    const cons = r.decisions.find(d => d.strategy_id === "gentle_finishing")!;
    const risky = r.decisions.find(d => d.strategy_id === "aggressive_hsm")!;
    expect(cons.p_success).toBeGreaterThan(risky.p_success);
  });

  it("failure_breakdown sums to ≤1", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], CONFIG);
    const fb = r.decisions[0].failure_breakdown;
    const total = fb.dim_out_of_tol + fb.tool_wear_excess + fb.surface_bad + fb.multiple;
    expect(total).toBeLessThanOrEqual(1.00001);
  });

  it("assigns ranks 1..N", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD, C_RISKY, C_CONSERVATIVE], CONFIG);
    const ranks = r.decisions.map(d => d.rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
  });

  it("best has lowest rank (1)", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD, C_RISKY, C_CONSERVATIVE], CONFIG);
    expect(r.best.rank).toBe(1);
  });

  it("worst has highest rank (N)", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD, C_RISKY, C_CONSERVATIVE], CONFIG);
    expect(r.worst.rank).toBe(3);
  });

  it("expected_utility is finite", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD], CONFIG);
    expect(Number.isFinite(r.decisions[0].expected_utility)).toBe(true);
  });

  it("var_95 is ≥ 0", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], CONFIG);
    expect(r.decisions[0].var_95).toBeGreaterThanOrEqual(0);
  });

  it("deterministic with same seed", () => {
    const r1 = strategyStochasticRiskEngine.stochasticCompare([C_GOOD], CONFIG);
    const r2 = strategyStochasticRiskEngine.stochasticCompare([C_GOOD], CONFIG);
    expect(r1.decisions[0].p_success).toBe(r2.decisions[0].p_success);
  });

  it("different seeds produce different samples", () => {
    const r1 = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], { ...CONFIG, seed: 1 });
    const r2 = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], { ...CONFIG, seed: 9999 });
    // At 500 trials with high-variance candidate, expected_utility should differ slightly
    expect(r1.decisions[0].p_success).not.toBe(r2.decisions[0].p_success);
  });

  it("riskRank returns sorted by rank ascending", () => {
    const ranked = strategyStochasticRiskEngine.riskRank([C_GOOD, C_RISKY, C_CONSERVATIVE], CONFIG);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  it("throws on empty candidates", () => {
    expect(() => strategyStochasticRiskEngine.stochasticCompare([], CONFIG)).toThrow();
  });

  it("throws on invalid tolerance", () => {
    expect(() => strategyStochasticRiskEngine.stochasticCompare([C_GOOD], { ...CONFIG, tolerance_mm: 0 })).toThrow();
  });

  it("throws on negative lambda", () => {
    expect(() => strategyStochasticRiskEngine.stochasticCompare([C_GOOD], CONFIG, -1)).toThrow();
  });

  it("higher lambda penalizes high-VaR candidates more", () => {
    const low = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], CONFIG, 0.0);
    const high = strategyStochasticRiskEngine.stochasticCompare([C_RISKY], CONFIG, 2.0);
    expect(high.decisions[0].risk_adjusted).toBeLessThanOrEqual(low.decisions[0].risk_adjusted);
  });

  it("clamps trials to minimum 100", () => {
    const r = strategyStochasticRiskEngine.stochasticCompare([C_GOOD], { ...CONFIG, trials: 10 });
    expect(r.trials).toBeGreaterThanOrEqual(100);
  });

  it("preserves meta on decisions", () => {
    const with_meta: StrategyRiskCandidate = { ...C_GOOD, meta: { tag: "pilot-A" } };
    const r = strategyStochasticRiskEngine.stochasticCompare([with_meta], CONFIG);
    expect(r.decisions[0].meta).toEqual({ tag: "pilot-A" });
  });
});
