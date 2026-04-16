/**
 * FanSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B40
 */
import { describe, it, expect } from "vitest";
import { fanSelectionEngine } from "../engines/FanSelectionEngine.js";

describe("FanSelectionEngine", () => {
  it("total pressure ≥ static pressure", () => {
    const r = fanSelectionEngine.calculate({ static_pressure_pa: 500 });
    expect(r.total_pressure.value).toBeGreaterThanOrEqual(500);
  });

  it("brake power > air power", () => {
    const r = fanSelectionEngine.calculate({});
    expect(r.brake_power.value * 1000).toBeGreaterThan(r.air_power.value);
  });

  it("higher flow needs more power", () => {
    const low = fanSelectionEngine.calculate({ flow_m3h: 1000 });
    const high = fanSelectionEngine.calculate({ flow_m3h: 10000 });
    expect(high.brake_power.value).toBeGreaterThan(low.brake_power.value);
  });

  it("BC fan more efficient than FC fan", () => {
    const bc = fanSelectionEngine.calculate({ fan_type: "centrifugal_bc" });
    const fc = fanSelectionEngine.calculate({ fan_type: "centrifugal_fc" });
    expect(bc.fan_efficiency.value).toBeGreaterThan(fc.fan_efficiency.value);
  });

  it("motor size ≥ brake power", () => {
    const r = fanSelectionEngine.calculate({});
    expect(r.motor_size.value).toBeGreaterThanOrEqual(r.brake_power.value);
  });

  it("VFD reduces annual cost", () => {
    const noVfd = fanSelectionEngine.calculate({ use_vfd: false });
    const vfd = fanSelectionEngine.calculate({ use_vfd: true });
    expect(vfd.annual_energy_cost.value).toBeLessThan(
      noVfd.annual_energy_cost.value
    );
  });

  it("sound power level > 0", () => {
    const r = fanSelectionEngine.calculate({});
    expect(r.sound_power_level.value).toBeGreaterThan(0);
  });

  it("tip speed > 0", () => {
    const r = fanSelectionEngine.calculate({});
    expect(r.tip_speed.value).toBeGreaterThan(0);
  });

  it("specific speed > 0", () => {
    const r = fanSelectionEngine.calculate({});
    expect(r.specific_speed.value).toBeGreaterThan(0);
  });

  it("warns FC fan at high pressure", () => {
    const r = fanSelectionEngine.calculate({
      fan_type: "centrifugal_fc",
      static_pressure_pa: 2000,
    });
    expect(r.warnings.some(w => w.includes("FC fan"))).toBe(true);
  });
});
