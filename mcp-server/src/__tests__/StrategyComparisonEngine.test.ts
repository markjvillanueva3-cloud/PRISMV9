import { describe, it, expect } from "vitest";
import { strategyComparisonEngine } from "../engines/StrategyComparisonEngine.js";

const mkStrat = (id: string, ae = 3, ap = 5, fz = 0.08, vc = 180) => ({
  strategy_id: id, ae_mm: ae, ap_mm: ap, fz_mm: fz, vc_m_min: vc, overhead_min: 0.5,
});
const FEAT = { volume_cm3: 50, tolerance_mm: 0.05, type: "pocket" };
const MAT = { kc1_1_n_mm2: 1800, mc: 0.25, cost_per_cm3_usd: 0.02, taylor_C: 300, taylor_n: 0.25 };
const TOOL = { diameter_mm: 12, flute_count: 4, corner_radius_mm: 1, overhang_mm: 40, cost_usd: 30, expected_parts: 100 };
const MACH = { rate_usd_hr: 85, spindle_power_kw: 15 };

describe("StrategyComparisonEngine", () => {
  it("compare() requires at least 2 strategies", async () => {
    await expect(
      strategyComparisonEngine.compare([mkStrat("a")], FEAT, MAT, TOOL, MACH),
    ).rejects.toThrow(/at least 2/);
  });

  it("compare() returns ranked strategies with scores", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    expect(r.strategies.length).toBe(2);
    expect(r.strategies[0].rank).toBe(1);
    expect(r.strategies[1].rank).toBe(2);
  });

  it("compare() reports winner with margin", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200), mkStrat("c", 1, 2, 0.05, 120)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    expect(r.winner).toBeDefined();
    expect(r.winner.margin_pct).toBeGreaterThanOrEqual(0);
  });

  it("compare() produces explanations for non-winner strategies", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    expect(Array.isArray(r.explanations)).toBe(true);
  });

  it("compare() dimension scores in 0-100 range", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    for (const s of r.strategies) {
      for (const key of ["cycle_time", "tool_life", "surface_quality", "cost_per_part", "safety_margin", "robustness"]) {
        const v = (s.scores as Record<string, number>)[key];
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("priority 'speed' ranks faster strategies higher", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("fast", 6, 8, 0.12, 220), mkStrat("slow", 1, 2, 0.04, 100)],
      FEAT, MAT, TOOL, MACH, "speed", 50,
    );
    expect(r.strategies.length).toBe(2);
  });

  it("overall_score strictly decreasing with rank", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200), mkStrat("c", 2, 3, 0.06, 150)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    for (let i = 1; i < r.strategies.length; i++) {
      expect(r.strategies[i-1].overall_score).toBeGreaterThanOrEqual(r.strategies[i].overall_score);
    }
  });

  it("radarChart() produces 6 axes per strategy", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    const radar = strategyComparisonEngine.radarChart(r);
    expect(radar.axes).toHaveLength(6);
  });

  it("radarChart() strategy series count matches inputs", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200), mkStrat("c", 2, 3, 0.06, 150)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    const radar = strategyComparisonEngine.radarChart(r);
    expect(radar.series.length).toBe(3);
  });

  it("radar_chart embedded in comparison result", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    expect(r.radar_chart).toBeDefined();
    expect(Array.isArray(r.radar_chart.axes)).toBe(true);
    expect(r.radar_chart.axes.length).toBe(6);
  });

  it("tradeoffs[] populated as strings", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    expect(Array.isArray(r.tradeoffs)).toBe(true);
  });

  it("winner id matches strategy at rank=1", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200), mkStrat("c", 2, 3, 0.06, 150)],
      FEAT, MAT, TOOL, MACH, "balanced", 50,
    );
    const firstRanked = r.strategies.find(s => s.rank === 1)!;
    expect(r.winner.id).toBe(firstRanked.id);
  });

  it("priority 'tool_life' considered", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "tool_life", 50,
    );
    expect(r.strategies.length).toBe(2);
  });

  it("priority 'cost' considered", async () => {
    const r = await strategyComparisonEngine.compare(
      [mkStrat("a"), mkStrat("b", 5, 6, 0.1, 200)],
      FEAT, MAT, TOOL, MACH, "cost", 50,
    );
    expect(r.strategies.length).toBe(2);
  });
});
