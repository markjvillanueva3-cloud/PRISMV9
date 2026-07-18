/**
 * PumpSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B40
 */
import { describe, it, expect } from "vitest";
import { pumpSelectionEngine } from "../engines/PumpSelectionEngine.js";

describe("PumpSelectionEngine", () => {
  it("TDH > 0 with defaults", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.total_dynamic_head.value).toBeGreaterThan(0);
  });

  it("TDH = static + friction + pressure head", () => {
    const r = pumpSelectionEngine.calculate({
      static_head_m: 10, friction_head_m: 3, pressure_head_m: 2,
    });
    expect(r.total_dynamic_head.value).toBeCloseTo(15, 0);
  });

  it("brake power > hydraulic power", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.brake_power.value).toBeGreaterThan(r.hydraulic_power.value);
  });

  it("higher flow needs more power", () => {
    const low = pumpSelectionEngine.calculate({ flow_m3h: 10 });
    const high = pumpSelectionEngine.calculate({ flow_m3h: 100 });
    expect(high.brake_power.value).toBeGreaterThan(low.brake_power.value);
  });

  it("motor size ≥ brake power", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.motor_size.value).toBeGreaterThanOrEqual(r.brake_power.value);
  });

  it("specific speed > 0", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.specific_speed.value).toBeGreaterThan(0);
  });

  it("NPSH available > 0", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.npsh_available.value).toBeGreaterThan(0);
  });

  it("efficiency between 0 and 100%", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.pump_efficiency.value).toBeGreaterThan(0);
    expect(r.pump_efficiency.value).toBeLessThanOrEqual(100);
  });

  it("annual energy cost > 0", () => {
    const r = pumpSelectionEngine.calculate({});
    expect(r.annual_energy_cost.value).toBeGreaterThan(0);
  });

  it("warns high viscosity with centrifugal", () => {
    const r = pumpSelectionEngine.calculate({
      viscosity_cp: 500,
      pump_type: "centrifugal",
    });
    expect(r.warnings.some(w => w.includes("viscosity"))).toBe(true);
  });
});
