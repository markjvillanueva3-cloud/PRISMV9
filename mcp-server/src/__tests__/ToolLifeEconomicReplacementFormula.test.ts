/**
 * ToolLifeEconomicReplacementFormula.test.ts — hotel iter15.
 * Verifies TCO break-even math, sensitivity to tool-price and changeout
 * time, hazard-driven economic life T*, replacement-schedule flagging.
 */

import { describe, it, expect } from "vitest";
import {
  costPerCutMinute,
  economicLife,
  replacementSchedule,
  type ToolCostInput,
} from "../algorithms/ToolLifeEconomicReplacementFormula.js";

// Typical carbide-insert tool for steel turning:
const INSERT_INPUT: ToolCostInput = {
  tool_price: 24,               // $24/insert
  regrind_cost: 0,              // disposable
  edges_per_tool: 4,            // 4 corners per square insert
  changeout_min: 2,             // 2 min to index/swap
  labor_rate_per_min: 1.0,      // $60/hr operator
  machine_rate_per_min: 1.5,    // $90/hr machine
};

// HSS form tool that gets reground:
const REGRIND_INPUT: ToolCostInput = {
  tool_price: 180,              // $180 tool body
  regrind_cost: 15,             // $15/regrind
  edges_per_tool: 10,           // ground 10 times before scrap
  changeout_min: 8,             // 8 min full swap
  labor_rate_per_min: 1.0,
  machine_rate_per_min: 1.5,
};

describe("costPerCutMinute — TCO ledger correctness", () => {
  it("INSERT: 30-min life → cost reconciles with components", () => {
    const r = costPerCutMinute(INSERT_INPUT, 30);
    // edge_amortized = 24/4 + 0 = $6
    // changeout_total = 2 * (1 + 1.5) = $5
    // tool/min = 6/30 = $0.20  ;  changeout/min = 5/30 ≈ $0.1667
    expect(r.components.edge_amortized_cost).toBeCloseTo(6, 6);
    expect(r.components.changeout_total_cost).toBeCloseTo(5, 6);
    expect(r.tool_cost_per_min).toBeCloseTo(0.20, 4);
    expect(r.changeout_cost_per_min).toBeCloseTo(0.16667, 4);
    expect(r.cost_per_cut_minute).toBeCloseTo(0.36667, 4);
  });

  it("REGRIND: 60-min life with regrind cost included", () => {
    const r = costPerCutMinute(REGRIND_INPUT, 60);
    // edge = 180/10 + 15 = $33  ; changeout = 8 * 2.5 = $20
    expect(r.components.edge_amortized_cost).toBeCloseTo(33, 6);
    expect(r.components.changeout_total_cost).toBeCloseTo(20, 6);
  });

  it("doubling life → halves cost-per-minute (1/T scaling)", () => {
    const r30 = costPerCutMinute(INSERT_INPUT, 30);
    const r60 = costPerCutMinute(INSERT_INPUT, 60);
    expect(Math.abs(r60.cost_per_cut_minute - r30.cost_per_cut_minute / 2)).toBeLessThan(1e-9);
  });

  it("doubling changeout_min → doubles changeout component (linear)", () => {
    const a = costPerCutMinute({ ...INSERT_INPUT, changeout_min: 2 }, 30);
    const b = costPerCutMinute({ ...INSERT_INPUT, changeout_min: 4 }, 30);
    expect(Math.abs(b.changeout_cost_per_min - 2 * a.changeout_cost_per_min)).toBeLessThan(1e-9);
  });

  it("R12: rejects non-positive t_cut_min", () => {
    expect(() => costPerCutMinute(INSERT_INPUT, 0)).toThrow(/> 0/);
    expect(() => costPerCutMinute(INSERT_INPUT, -5)).toThrow(/> 0/);
  });

  it("R12: rejects non-integer edges_per_tool", () => {
    expect(() => costPerCutMinute({ ...INSERT_INPUT, edges_per_tool: 4.5 }, 30)).toThrow(/integer/);
  });

  it("R12: rejects edges_per_tool < 1", () => {
    expect(() => costPerCutMinute({ ...INSERT_INPUT, edges_per_tool: 0 }, 30)).toThrow(/integer >= 1/);
  });

  it("R12: rejects NaN labor_rate", () => {
    expect(() => costPerCutMinute(
      { ...INSERT_INPUT, labor_rate_per_min: NaN }, 30,
    )).toThrow(/finite/);
  });
});

describe("economicLife — closed-form T*", () => {
  it("zero scrap risk → T* falls to baseline (no quality hazard)", () => {
    const r = economicLife(INSERT_INPUT, 0, 100);
    expect(r.t_economic_min).toBe(1);  // HAZARD_BASELINE_MIN
    expect(r.expected_scrap_cost_per_min).toBe(0);
  });

  it("non-zero scrap risk produces a finite T*", () => {
    const r = economicLife(INSERT_INPUT, 0.5, 50);  // 0.5 scraps/hr, $50/part
    expect(r.t_economic_min).toBeGreaterThan(0);
    expect(Number.isFinite(r.t_economic_min)).toBe(true);
    expect(r.expected_scrap_cost_per_min).toBeGreaterThan(0);
  });

  it("higher scrap risk → SHORTER T* (replace tools sooner)", () => {
    const low = economicLife(INSERT_INPUT, 0.5, 50);
    const high = economicLife(INSERT_INPUT, 2.0, 50);
    expect(high.t_economic_min).toBeLessThan(low.t_economic_min);
  });

  it("higher part value → SHORTER T* (cost of scrap dominates)", () => {
    const cheap = economicLife(INSERT_INPUT, 1.0, 10);
    const expensive = economicLife(INSERT_INPUT, 1.0, 1_000);
    expect(expensive.t_economic_min).toBeLessThan(cheap.t_economic_min);
  });

  it("closed-form: T* = sqrt(2·K / (λ·V)) verified directly", () => {
    // K_fixed for INSERT_INPUT: 6 + 5 = $11
    // λ = 1.0 scrap/hr = 1/60 scrap/min
    // V = $100/part
    // T* = sqrt(2 * 11 / ((1/60) * 100)) = sqrt(22 / 1.6667) = sqrt(13.2) ≈ 3.633 min
    const r = economicLife(INSERT_INPUT, 1.0, 100);
    expect(r.t_economic_min).toBeCloseTo(Math.sqrt(13.2), 3);
  });

  it("R12: rejects negative scrap_risk_per_hr", () => {
    expect(() => economicLife(INSERT_INPUT, -0.1, 50)).toThrow(/>= 0/);
  });

  it("R12: rejects NaN part_value_avg", () => {
    expect(() => economicLife(INSERT_INPUT, 0.5, NaN)).toThrow(/finite/);
  });
});

describe("replacementSchedule — sample analysis + flagging", () => {
  it("flags samples relative to economic life", () => {
    // Compute T* first
    const econ = economicLife(INSERT_INPUT, 1.0, 100);
    const tStar = econ.t_economic_min;
    // Build 3 samples: half T*, at T*, double T*
    const samples = [tStar * 0.5, tStar, tStar * 2.0];
    const rows = replacementSchedule(INSERT_INPUT, 1.0, 100, samples);
    expect(rows[0].flag).toBe("below_economic");
    expect(rows[1].flag).toBe("near_economic");
    expect(rows[2].flag).toBe("above_economic");
  });

  it("pct_above_economic computed correctly", () => {
    const econ = economicLife(INSERT_INPUT, 1.0, 100);
    const t = econ.t_economic_min * 1.5;  // 50% above T*
    const rows = replacementSchedule(INSERT_INPUT, 1.0, 100, [t]);
    expect(rows[0].pct_above_economic).toBeCloseTo(0.5, 6);
  });

  it("R12: rejects empty samples", () => {
    expect(() => replacementSchedule(INSERT_INPUT, 1.0, 100, [])).toThrow(/non-empty/);
  });

  it("R12: rejects non-positive life sample", () => {
    expect(() => replacementSchedule(INSERT_INPUT, 1.0, 100, [10, 0, 30])).toThrow(/> 0/);
  });
});
