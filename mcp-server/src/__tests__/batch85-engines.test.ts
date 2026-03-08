/**
 * Batch 85 — HypoidGear, CycloidDrive, HeatExchangerPlate
 * @milestone FORGE-ENGINES-BATCH85
 */
import { describe, it, expect } from "vitest";
import { hypoidGearEngine } from "../engines/HypoidGearEngine.js";
import { cycloidDriveEngine } from "../engines/CycloidDriveEngine.js";
import { heatExchangerPlateEngine } from "../engines/HeatExchangerPlateEngine.js";

describe("HypoidGearEngine", () => {
  const base = { pinion_teeth: 11, gear_teeth: 43, speed_rpm: 2000, torque_Nm: 100 };
  it("ratio = Zg/Zp", () => {
    expect(hypoidGearEngine.calculate(base).ratio.value).toBeCloseTo(43 / 11, 1);
  });
  it("bending stress > 0", () => {
    expect(hypoidGearEngine.calculate(base).bending_stress_MPa.value).toBeGreaterThan(0);
  });
  it("higher torque → higher stress", () => {
    const s100 = hypoidGearEngine.calculate(base).bending_stress_MPa.value;
    const s200 = hypoidGearEngine.calculate({ ...base, torque_Nm: 200 }).bending_stress_MPa.value;
    expect(s200).toBeGreaterThan(s100);
  });
  it("efficiency < 100%", () => {
    expect(hypoidGearEngine.calculate(base).efficiency_pct.value).toBeLessThan(100);
  });
  it("sliding velocity > 0", () => {
    expect(hypoidGearEngine.calculate(base).sliding_velocity_m_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(hypoidGearEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CycloidDriveEngine", () => {
  const base = { num_lobes: 20, num_pins: 21, input_speed_rpm: 1500, input_torque_Nm: 10 };
  it("reduction ratio = num_lobes for single stage", () => {
    expect(cycloidDriveEngine.calculate(base).reduction_ratio.value).toBe(20);
  });
  it("output torque > input torque", () => {
    const r = cycloidDriveEngine.calculate(base);
    expect(r.output_torque_Nm.value).toBeGreaterThan(10);
  });
  it("output speed < input speed", () => {
    expect(cycloidDriveEngine.calculate(base).output_speed_rpm.value).toBeLessThan(1500);
  });
  it("rv_type has higher ratio", () => {
    const single = cycloidDriveEngine.calculate(base).reduction_ratio.value;
    const rv = cycloidDriveEngine.calculate({ ...base, drive_type: "rv_type" }).reduction_ratio.value;
    expect(rv).toBeGreaterThan(single);
  });
  it("backlash > 0", () => {
    expect(cycloidDriveEngine.calculate(base).backlash_arcmin.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(cycloidDriveEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("HeatExchangerPlateEngine", () => {
  const base = { hot_inlet_C: 80, hot_outlet_C: 50, cold_inlet_C: 20 };
  it("duty > 0", () => {
    expect(heatExchangerPlateEngine.calculate(base).duty_kW.value).toBeGreaterThan(0);
  });
  it("LMTD > 0", () => {
    expect(heatExchangerPlateEngine.calculate(base).lmtd_C.value).toBeGreaterThan(0);
  });
  it("required area > 0", () => {
    expect(heatExchangerPlateEngine.calculate(base).required_area_m2.value).toBeGreaterThan(0);
  });
  it("num plates > 0", () => {
    expect(heatExchangerPlateEngine.calculate(base).num_plates.value).toBeGreaterThan(0);
  });
  it("overall U > 0", () => {
    expect(heatExchangerPlateEngine.calculate(base).overall_U_W_m2K.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(heatExchangerPlateEngine.calculate(base).recommendations)).toBe(true);
  });
});
