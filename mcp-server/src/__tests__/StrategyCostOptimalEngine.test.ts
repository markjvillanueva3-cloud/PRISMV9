/**
 * StrategyCostOptimalEngine Tests — CAMX-MS2/U05
 */

import { describe, it, expect } from "vitest";
import {
  StrategyCostOptimalEngine,
  strategyCostOptimalEngine,
  type StrategyCostOption,
  type CostRates,
} from "../engines/StrategyCostOptimalEngine.js";

const RATES: CostRates = {
  machine_rate_per_min_usd: 1.5,
  energy_rate_per_kWh_usd: 0.12,
  part_value_usd: 500,
};

const OPT_FAST_RISKY: StrategyCostOption = {
  strategy_id: "high_speed_roughing",
  cycle_time_min: 10,
  expected_tool_life_min: 30,
  tool_price_usd: 120,
  avg_power_kW: 20,
  failure_probability: 0.05,
};

const OPT_SLOW_SAFE: StrategyCostOption = {
  strategy_id: "conservative_roughing",
  cycle_time_min: 25,
  expected_tool_life_min: 180,
  tool_price_usd: 120,
  avg_power_kW: 12,
  failure_probability: 0.005,
};

describe("StrategyCostOptimalEngine.computeCost()", () => {
  it("computes all 4 cost components", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    expect(r.cycle_time_cost_usd).toBeGreaterThan(0);
    expect(r.tool_cost_usd).toBeGreaterThan(0);
    expect(r.energy_cost_usd).toBeGreaterThan(0);
    expect(r.scrap_risk_cost_usd).toBeGreaterThan(0);
    expect(r.total_cost_usd).toBeCloseTo(
      r.cycle_time_cost_usd + r.tool_cost_usd + r.energy_cost_usd + r.scrap_risk_cost_usd,
      2,
    );
  });

  it("cycle_time_cost = cycle_time × machine_rate", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    expect(r.cycle_time_cost_usd).toBeCloseTo(10 * 1.5, 2); // 15 USD
  });

  it("tool_cost amortizes tool price by life fraction", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    // 10min / 30min × $120 = $40
    expect(r.tool_cost_usd).toBeCloseTo(40, 2);
  });

  it("energy_cost = kW × min/60 × rate", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    // 20kW × 10/60 h × $0.12 = $0.40
    expect(r.energy_cost_usd).toBeCloseTo(0.4, 2);
  });

  it("scrap_risk_cost = failure_probability × part_value", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    expect(r.scrap_risk_cost_usd).toBeCloseTo(0.05 * 500, 2); // $25
  });

  it("breakdown percentages sum to 100", () => {
    const r = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    const sum = r.breakdown_pct.cycle_time_pct +
                r.breakdown_pct.tool_pct +
                r.breakdown_pct.energy_pct +
                r.breakdown_pct.scrap_risk_pct;
    expect(sum).toBeCloseTo(100, 0);
  });

  it("throws for zero cycle_time", () => {
    expect(() => strategyCostOptimalEngine.computeCost(
      { ...OPT_FAST_RISKY, cycle_time_min: 0 }, RATES
    )).toThrow(/cycle_time_min/);
  });

  it("throws for zero tool life", () => {
    expect(() => strategyCostOptimalEngine.computeCost(
      { ...OPT_FAST_RISKY, expected_tool_life_min: 0 }, RATES
    )).toThrow(/expected_tool_life_min/);
  });

  it("throws for out-of-range failure probability", () => {
    expect(() => strategyCostOptimalEngine.computeCost(
      { ...OPT_FAST_RISKY, failure_probability: 1.5 }, RATES
    )).toThrow(/failure_probability/);
  });
});

describe("StrategyCostOptimalEngine.decide()", () => {
  it("ranks options by total cost ascending", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY, OPT_SLOW_SAFE], RATES);
    expect(d.ranked[0].total_cost_usd).toBeLessThanOrEqual(d.ranked[1].total_cost_usd);
  });

  it("picks the minimum-cost option as 'best'", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY, OPT_SLOW_SAFE], RATES);
    const fastCost = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES).total_cost_usd;
    const slowCost = strategyCostOptimalEngine.computeCost(OPT_SLOW_SAFE, RATES).total_cost_usd;
    const expectedWinner = fastCost <= slowCost ? OPT_FAST_RISKY.strategy_id : OPT_SLOW_SAFE.strategy_id;
    expect(d.best.strategy_id).toBe(expectedWinner);
  });

  it("reports savings vs worst option", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY, OPT_SLOW_SAFE], RATES);
    expect(d.savings_vs_worst_usd).toBeGreaterThanOrEqual(0);
  });

  it("throws for empty options array", () => {
    expect(() => strategyCostOptimalEngine.decide([], RATES)).toThrow();
  });

  it("single option returns itself as best", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY], RATES);
    expect(d.best.strategy_id).toBe(OPT_FAST_RISKY.strategy_id);
    expect(d.savings_vs_worst_usd).toBe(0);
  });

  it("explanation includes chosen strategy id", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY, OPT_SLOW_SAFE], RATES);
    expect(d.explanation).toContain(d.best.strategy_id);
  });

  it("identifies dominant cost component in explanation", () => {
    const d = strategyCostOptimalEngine.decide([OPT_FAST_RISKY, OPT_SLOW_SAFE], RATES);
    expect(d.explanation).toMatch(/cycle time|tool wear|energy|scrap risk/);
  });
});

describe("StrategyCostOptimalEngine.sensitivity()", () => {
  it("baseline matches computeCost total", () => {
    const s = strategyCostOptimalEngine.sensitivity(OPT_FAST_RISKY, RATES);
    const c = strategyCostOptimalEngine.computeCost(OPT_FAST_RISKY, RATES);
    expect(s.baseline_usd).toBeCloseTo(c.total_cost_usd, 1);
  });

  it("identifies most-sensitive rate", () => {
    const s = strategyCostOptimalEngine.sensitivity(OPT_FAST_RISKY, RATES);
    expect(["machine_rate", "energy_rate", "part_value"]).toContain(s.most_sensitive_to);
  });

  it("positive delta at default +10%", () => {
    const s = strategyCostOptimalEngine.sensitivity(OPT_FAST_RISKY, RATES, 10);
    expect(s.machine_rate_delta_usd).toBeGreaterThan(0);
  });

  it("larger delta produces larger rate impact", () => {
    const s10 = strategyCostOptimalEngine.sensitivity(OPT_FAST_RISKY, RATES, 10);
    const s50 = strategyCostOptimalEngine.sensitivity(OPT_FAST_RISKY, RATES, 50);
    expect(s50.machine_rate_delta_usd).toBeGreaterThan(s10.machine_rate_delta_usd);
  });
});

describe("StrategyCostOptimalEngine singleton", () => {
  it("exports singleton", () => {
    expect(strategyCostOptimalEngine).toBeInstanceOf(StrategyCostOptimalEngine);
  });
});
