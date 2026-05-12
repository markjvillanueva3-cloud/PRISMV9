/**
 * Batch 68 — ReliabilityWeibull, StatisticalProcess, InventoryEOQ
 * @milestone FORGE-ENGINES-BATCH68
 */
import { describe, it, expect } from "vitest";
import { reliabilityWeibullEngine } from "../engines/ReliabilityWeibullEngine.js";
import { statisticalProcessEngine } from "../engines/StatisticalProcessEngine.js";
import { inventoryEOQEngine } from "../engines/InventoryEOQEngine.js";

describe("ReliabilityWeibullEngine", () => {
  const base = { shape_parameter_beta: 2.5, scale_parameter_eta: 10000 };
  it("reliability 0-1", () => {
    const r = reliabilityWeibullEngine.calculate(base).reliability_at_mission.value;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });
  it("MTTF > 0", () => {
    expect(reliabilityWeibullEngine.calculate(base).mttf.value).toBeGreaterThan(0);
  });
  it("B10 < B50", () => {
    const r = reliabilityWeibullEngine.calculate(base);
    expect(r.b10_life.value).toBeLessThan(r.b50_life.value);
  });
  it("higher beta = different failure mode", () => {
    const infant = reliabilityWeibullEngine.calculate({ ...base, shape_parameter_beta: 0.5 });
    const wear = reliabilityWeibullEngine.calculate({ ...base, shape_parameter_beta: 3.5 });
    expect(infant.failure_mode.value).toBeLessThan(wear.failure_mode.value);
  });
  it("warranty return > 0%", () => {
    expect(reliabilityWeibullEngine.calculate(base).warranty_return_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(reliabilityWeibullEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("StatisticalProcessEngine", () => {
  const base = { process_mean: 10.0, process_stddev: 0.01, spec_upper: 10.05, spec_lower: 9.95 };
  it("Cp > 0", () => {
    expect(statisticalProcessEngine.calculate(base).cp.value).toBeGreaterThan(0);
  });
  it("Cpk ≤ Cp", () => {
    const r = statisticalProcessEngine.calculate(base);
    expect(r.cpk.value).toBeLessThanOrEqual(r.cp.value + 0.001);
  });
  it("centered process has Cpk ≈ Cp", () => {
    const r = statisticalProcessEngine.calculate(base);
    expect(r.cpk.value).toBeCloseTo(r.cp.value, 0);
  });
  it("off-center process has lower Cpk", () => {
    const centered = statisticalProcessEngine.calculate(base);
    const offset = statisticalProcessEngine.calculate({ ...base, process_mean: 10.03 });
    expect(offset.cpk.value).toBeLessThan(centered.cpk.value);
  });
  it("sigma level > 0", () => {
    expect(statisticalProcessEngine.calculate(base).sigma_level.value).toBeGreaterThan(0);
  });
  it("UCL > LCL", () => {
    const r = statisticalProcessEngine.calculate(base);
    expect(r.ucl.value).toBeGreaterThan(r.lcl.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(statisticalProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("InventoryEOQEngine", () => {
  const base = { annual_demand: 10000, order_cost: 50, unit_cost: 25 };
  it("EOQ > 0", () => {
    expect(inventoryEOQEngine.calculate(base).eoq_units.value).toBeGreaterThan(0);
  });
  it("reorder point > 0", () => {
    expect(inventoryEOQEngine.calculate(base).reorder_point.value).toBeGreaterThan(0);
  });
  it("safety stock ≥ 0", () => {
    expect(inventoryEOQEngine.calculate(base).safety_stock.value).toBeGreaterThanOrEqual(0);
  });
  it("higher demand = higher EOQ", () => {
    const lo = inventoryEOQEngine.calculate({ ...base, annual_demand: 1000 });
    const hi = inventoryEOQEngine.calculate({ ...base, annual_demand: 100000 });
    expect(hi.eoq_units.value).toBeGreaterThan(lo.eoq_units.value);
  });
  it("total cost > 0", () => {
    expect(inventoryEOQEngine.calculate(base).total_annual_cost.value).toBeGreaterThan(0);
  });
  it("cycle time > 0", () => {
    expect(inventoryEOQEngine.calculate(base).cycle_time_days.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(inventoryEOQEngine.calculate(base).recommendations)).toBe(true);
  });
});
