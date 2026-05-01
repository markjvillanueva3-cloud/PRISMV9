/**
 * CoolantFlowEngine — Unit Tests
 * @milestone FORGE-ENGINES-B23
 */
import { describe, it, expect } from "vitest";
import { coolantFlowEngine } from "../engines/CoolantFlowEngine.js";

describe("CoolantFlowEngine", () => {
  it("calculates required flow rate", () => {
    const r = coolantFlowEngine.calculate({
      cutting_power_kw: 10,
      operation: "milling",
    });
    expect(r.required_flow_lpm.value).toBeGreaterThan(0);
  });

  it("higher power needs more flow", () => {
    const low = coolantFlowEngine.calculate({ cutting_power_kw: 3 });
    const high = coolantFlowEngine.calculate({ cutting_power_kw: 15 });
    expect(high.required_flow_lpm.value).toBeGreaterThan(
      low.required_flow_lpm.value
    );
  });

  it("grinding transfers more heat to coolant", () => {
    const mill = coolantFlowEngine.calculate({
      cutting_power_kw: 5,
      operation: "milling",
    });
    const grind = coolantFlowEngine.calculate({
      cutting_power_kw: 5,
      operation: "grinding",
    });
    expect(grind.required_flow_lpm.value).toBeGreaterThan(
      mill.required_flow_lpm.value
    );
  });

  it("through-spindle has higher recommended pressure", () => {
    const flood = coolantFlowEngine.calculate({
      coolant_type: "flood",
    });
    const tsc = coolantFlowEngine.calculate({
      coolant_type: "through_spindle",
    });
    expect(tsc.recommended_pressure.value).toBeGreaterThan(
      flood.recommended_pressure.value
    );
  });

  it("nozzle velocity increases with pressure", () => {
    const low = coolantFlowEngine.calculate({
      supply_pressure_bar: 3,
    });
    const high = coolantFlowEngine.calculate({
      supply_pressure_bar: 70,
    });
    expect(high.nozzle_velocity_mps.value).toBeGreaterThan(
      low.nozzle_velocity_mps.value
    );
  });

  it("warns low concentration", () => {
    const r = coolantFlowEngine.calculate({
      coolant_concentration_pct: 3,
    });
    expect(r.concentration_ok.value).toBe(0);
    expect(
      r.warnings.some(w => w.includes("Concentration") ||
        w.includes("concentration"))
    ).toBe(true);
  });

  it("warns insufficient pressure for deep holes", () => {
    const r = coolantFlowEngine.calculate({
      operation: "drilling",
      hole_depth_diameter_ratio: 15,
      supply_pressure_bar: 20,
      coolant_type: "flood",
    });
    expect(
      r.warnings.some(w => w.includes("Pressure") ||
        w.includes("pressure"))
    ).toBe(true);
  });

  it("high pressure has better chip evacuation", () => {
    const flood = coolantFlowEngine.calculate({
      coolant_type: "flood",
      supply_pressure_bar: 5,
    });
    const hp = coolantFlowEngine.calculate({
      coolant_type: "high_pressure",
      supply_pressure_bar: 150,
    });
    expect(hp.chip_evacuation_score.value).toBeGreaterThan(
      flood.chip_evacuation_score.value
    );
  });

  it("tank turnover calculated", () => {
    const r = coolantFlowEngine.calculate({
      tank_capacity_liters: 200,
    });
    expect(r.tank_turnover_min.value).toBeGreaterThan(0);
  });

  it("more nozzles increase actual flow", () => {
    const one = coolantFlowEngine.calculate({ nozzle_count: 1 });
    const four = coolantFlowEngine.calculate({ nozzle_count: 4 });
    expect(four.actual_flow_lpm.value).toBeGreaterThan(
      one.actual_flow_lpm.value
    );
  });
});
