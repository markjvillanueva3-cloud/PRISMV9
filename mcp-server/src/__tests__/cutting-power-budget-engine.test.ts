/**
 * CuttingPowerBudgetEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { cuttingPowerBudgetEngine } from "../engines/CuttingPowerBudgetEngine.js";

describe("CuttingPowerBudgetEngine", () => {
  const base = {
    machine_power_kW: 15,
    cutting_speed_m_min: 200,
    depth_of_cut_mm: 2,
  };

  it("required power > 0", () => {
    const r = cuttingPowerBudgetEngine.calculate(base);
    expect(r.required_power_kW.value).toBeGreaterThan(0);
  });

  it("available power > 0", () => {
    const r = cuttingPowerBudgetEngine.calculate(base);
    expect(r.available_power_kW.value).toBeGreaterThan(0);
  });

  it("power utilization ≥ 0", () => {
    const r = cuttingPowerBudgetEngine.calculate(base);
    expect(r.power_utilization_pct.value).toBeGreaterThanOrEqual(0);
  });

  it("deeper cut requires more power", () => {
    const shallow = cuttingPowerBudgetEngine.calculate({ ...base, depth_of_cut_mm: 1 });
    const deep = cuttingPowerBudgetEngine.calculate({ ...base, depth_of_cut_mm: 5 });
    expect(deep.required_power_kW.value).toBeGreaterThan(
      shallow.required_power_kW.value
    );
  });

  it("limiting factor is valid", () => {
    const r = cuttingPowerBudgetEngine.calculate(base);
    expect(["power", "torque", "none"]).toContain(r.limiting_factor);
  });

  it("recommendations is array", () => {
    const r = cuttingPowerBudgetEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
