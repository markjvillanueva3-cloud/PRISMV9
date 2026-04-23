import { describe, it, expect } from "vitest";
import { strategyBenchmarkEngine } from "../engines/StrategyBenchmarkEngine.js";

const mkStrategy = (id = "s1", ae = 3, ap = 5, fz = 0.08, vc = 180) => ({
  strategy_id: id, ae_mm: ae, ap_mm: ap, fz_mm: fz, vc_m_min: vc, overhead_min: 0.5,
});
const FEATURE = { volume_cm3: 50, tolerance_mm: 0.05, type: "pocket" };
const MATERIAL = {
  kc1_1_n_mm2: 1800, mc: 0.25, cost_per_cm3_usd: 0.02,
  taylor_C: 300, taylor_n: 0.25,
};
const TOOL = {
  diameter_mm: 12, flute_count: 4, corner_radius_mm: 1,
  overhang_mm: 40, cost_usd: 30, expected_parts: 100,
};
const MACHINE = { rate_usd_hr: 85, spindle_power_kw: 15, overhead_usd_per_part: 0.5 };

describe("StrategyBenchmarkEngine", () => {
  it("benchmark() returns all required fields", () => {
    const r = strategyBenchmarkEngine.benchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE);
    expect(r.strategy_id).toBe("s1");
    expect(r.cycle_time_min).toBeGreaterThan(0);
    expect(r.tool_life_min).toBeGreaterThan(0);
    expect(r.Ra_um).toBeGreaterThan(0);
    expect(r.cost_per_part).toBeGreaterThan(0);
    expect(r.Cpk_predicted).toBeGreaterThanOrEqual(0);
  });

  it("benchmark() respects MC trial count", () => {
    const r20 = strategyBenchmarkEngine.benchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 20);
    const r500 = strategyBenchmarkEngine.benchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 500);
    expect(r20.cycle_time_min).toBeGreaterThan(0);
    expect(r500.cycle_time_min).toBeGreaterThan(0);
  });

  it("aggressive strategy has lower cycle time than conservative", () => {
    const aggr = strategyBenchmarkEngine.benchmark(mkStrategy("aggr", 6, 8, 0.12, 220), FEATURE, MATERIAL, TOOL, MACHINE, 100);
    const cons = strategyBenchmarkEngine.benchmark(mkStrategy("cons", 1, 2, 0.05, 120), FEATURE, MATERIAL, TOOL, MACHINE, 100);
    expect(aggr.cycle_time_min).toBeLessThan(cons.cycle_time_min);
  });

  it("higher Vc reduces tool life (Taylor)", () => {
    const fast = strategyBenchmarkEngine.benchmark(mkStrategy("fast", 3, 5, 0.08, 300), FEATURE, MATERIAL, TOOL, MACHINE, 100);
    const slow = strategyBenchmarkEngine.benchmark(mkStrategy("slow", 3, 5, 0.08, 120), FEATURE, MATERIAL, TOOL, MACHINE, 100);
    expect(fast.tool_life_min).toBeLessThan(slow.tool_life_min);
  });

  it("compareBenchmarks() ranks by score", () => {
    const ranked = strategyBenchmarkEngine.compareBenchmarks(
      [mkStrategy("a"), mkStrategy("b", 5, 6, 0.1, 200), mkStrategy("c", 2, 3, 0.06, 150)],
      FEATURE, MATERIAL, TOOL, MACHINE, 100,
    );
    expect(ranked.length).toBe(3);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
    expect(ranked[0].result.score).toBeGreaterThanOrEqual(ranked[1].result.score);
  });

  it("compareBenchmarks() reports delta_vs_best_pct", () => {
    const ranked = strategyBenchmarkEngine.compareBenchmarks(
      [mkStrategy("a"), mkStrategy("b", 5, 6, 0.1, 200)],
      FEATURE, MATERIAL, TOOL, MACHINE, 100,
    );
    expect(ranked[0].delta_vs_best_pct).toBe(0);
    expect(ranked[1].delta_vs_best_pct).toBeGreaterThanOrEqual(0);
  });

  it("compareBenchmarks() returns empty array on empty input", () => {
    const ranked = strategyBenchmarkEngine.compareBenchmarks([], FEATURE, MATERIAL, TOOL, MACHINE);
    expect(ranked).toEqual([]);
  });

  it("monteCarloBenchmark() exposes raw sample arrays", () => {
    const mc = strategyBenchmarkEngine.monteCarloBenchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 50);
    expect(mc.cycle_time_samples.length).toBe(50);
    expect(mc.tool_life_samples.length).toBe(50);
    expect(mc.Ra_samples.length).toBe(50);
    expect(mc.cost_samples.length).toBe(50);
    expect(mc.trials).toBe(50);
  });

  it("monteCarloBenchmark() all samples positive", () => {
    const mc = strategyBenchmarkEngine.monteCarloBenchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 100);
    expect(mc.cycle_time_samples.every((x: number) => x > 0)).toBe(true);
    expect(mc.tool_life_samples.every((x: number) => x > 0)).toBe(true);
    expect(mc.Ra_samples.every((x: number) => x > 0)).toBe(true);
  });

  it("MC cycle time variance > 0 (non-degenerate distribution)", () => {
    const mc = strategyBenchmarkEngine.monteCarloBenchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 200);
    const mean = mc.cycle_time_samples.reduce((a: number, b: number) => a + b, 0) / mc.cycle_time_samples.length;
    const variance = mc.cycle_time_samples.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / mc.cycle_time_samples.length;
    expect(variance).toBeGreaterThan(0);
  });

  it("larger feature volume → longer cycle time", () => {
    const small = strategyBenchmarkEngine.benchmark(mkStrategy(), { ...FEATURE, volume_cm3: 10 }, MATERIAL, TOOL, MACHINE, 50);
    const large = strategyBenchmarkEngine.benchmark(mkStrategy(), { ...FEATURE, volume_cm3: 500 }, MATERIAL, TOOL, MACHINE, 50);
    expect(large.cycle_time_min).toBeGreaterThan(small.cycle_time_min);
  });

  it("Cpk_predicted is finite for both tight and loose tolerance", () => {
    const loose = strategyBenchmarkEngine.benchmark(mkStrategy(), { ...FEATURE, tolerance_mm: 0.1 }, MATERIAL, TOOL, MACHINE, 200);
    const tight = strategyBenchmarkEngine.benchmark(mkStrategy(), { ...FEATURE, tolerance_mm: 0.005 }, MATERIAL, TOOL, MACHINE, 200);
    expect(Number.isFinite(loose.Cpk_predicted)).toBe(true);
    expect(Number.isFinite(tight.Cpk_predicted)).toBe(true);
  });

  it("score is finite positive", () => {
    const r = strategyBenchmarkEngine.benchmark(mkStrategy(), FEATURE, MATERIAL, TOOL, MACHINE, 50);
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });

  it("compareBenchmarks() preserves strategy_id identity", () => {
    const ranked = strategyBenchmarkEngine.compareBenchmarks(
      [mkStrategy("alpha"), mkStrategy("beta", 5, 6, 0.1, 200)],
      FEATURE, MATERIAL, TOOL, MACHINE, 50,
    );
    const ids = ranked.map(r => r.result.strategy_id).sort();
    expect(ids).toEqual(["alpha", "beta"]);
  });
});
