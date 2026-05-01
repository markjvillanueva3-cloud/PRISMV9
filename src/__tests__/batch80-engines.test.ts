/**
 * Batch 80 — NetworkFlow, OptimizationSimplex, Thermocouple
 * @milestone FORGE-ENGINES-BATCH80
 */
import { describe, it, expect } from "vitest";
import { networkFlowEngine } from "../engines/NetworkFlowEngine.js";
import { optimizationSimplexEngine } from "../engines/OptimizationSimplexEngine.js";
import { thermocoupleEngine } from "../engines/ThermocoupleEngine.js";

describe("NetworkFlowEngine", () => {
  const base = {
    num_nodes: 4,
    edges: [
      { from: 0, to: 1, capacity: 10 },
      { from: 0, to: 2, capacity: 8 },
      { from: 1, to: 3, capacity: 7 },
      { from: 2, to: 3, capacity: 10 },
      { from: 1, to: 2, capacity: 5 },
    ],
    source: 0,
    sink: 3,
  };
  it("max flow > 0", () => {
    expect(networkFlowEngine.calculate(base).max_flow.value).toBeGreaterThan(0);
  });
  it("max flow = min cut", () => {
    const r = networkFlowEngine.calculate(base);
    expect(r.max_flow.value).toBe(r.min_cut_capacity.value);
  });
  it("max flow ≤ total capacity", () => {
    const r = networkFlowEngine.calculate(base);
    expect(r.max_flow.value).toBeLessThanOrEqual(r.total_capacity.value);
  });
  it("augmenting paths > 0", () => {
    expect(networkFlowEngine.calculate(base).num_augmenting_paths.value).toBeGreaterThan(0);
  });
  it("utilization between 0 and 100", () => {
    const u = networkFlowEngine.calculate(base).avg_utilization_pct.value;
    expect(u).toBeGreaterThan(0);
    expect(u).toBeLessThanOrEqual(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(networkFlowEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("OptimizationSimplexEngine", () => {
  // Maximize 3x + 2y subject to x+y≤4, x+3y≤6, x,y≥0
  const base = {
    objective: [3, 2],
    constraints_lhs: [[1, 1], [1, 3]],
    constraints_rhs: [4, 6],
  };
  it("finds optimal value", () => {
    expect(optimizationSimplexEngine.calculate(base).optimal_value.value).toBeGreaterThan(0);
  });
  it("is feasible", () => {
    expect(optimizationSimplexEngine.calculate(base).is_feasible.value).toBe(1);
  });
  it("is bounded", () => {
    expect(optimizationSimplexEngine.calculate(base).is_bounded.value).toBe(1);
  });
  it("optimal value > 0", () => {
    expect(optimizationSimplexEngine.calculate(base).optimal_value.value).toBeGreaterThan(0);
  });
  it("iterations > 0", () => {
    expect(optimizationSimplexEngine.calculate(base).num_iterations.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(optimizationSimplexEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ThermocoupleEngine", () => {
  const base = { tc_type: "K" as const, measured_temperature_C: 500 };
  it("voltage > 0 for positive temp", () => {
    expect(thermocoupleEngine.calculate(base).voltage_mV.value).toBeGreaterThan(0);
  });
  it("Type K Seebeck ≈ 41 µV/°C", () => {
    expect(thermocoupleEngine.calculate(base).seebeck_coefficient_uV_C.value).toBe(41);
  });
  it("voltage → temperature roundtrip", () => {
    const v = thermocoupleEngine.calculate(base).voltage_mV.value;
    const t = thermocoupleEngine.calculate({ tc_type: "K", measured_voltage_mV: v }).temperature_C.value;
    expect(t).toBeCloseTo(500, -1);
  });
  it("Type S has lower Seebeck than Type K", () => {
    const k = thermocoupleEngine.calculate({ tc_type: "K" }).seebeck_coefficient_uV_C.value;
    const s = thermocoupleEngine.calculate({ tc_type: "S" }).seebeck_coefficient_uV_C.value;
    expect(s).toBeLessThan(k);
  });
  it("tolerance > 0", () => {
    expect(thermocoupleEngine.calculate(base).tolerance_C.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(thermocoupleEngine.calculate(base).recommendations)).toBe(true);
  });
});
