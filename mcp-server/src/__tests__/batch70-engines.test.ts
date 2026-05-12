/**
 * Batch 70 — BevelGear, HarmonicDrive, Coupling
 * @milestone FORGE-ENGINES-BATCH70
 */
import { describe, it, expect } from "vitest";
import { bevelGearEngine } from "../engines/BevelGearEngine.js";
import { harmonicDriveEngine } from "../engines/HarmonicDriveEngine.js";
import { couplingEngine } from "../engines/CouplingEngine.js";

describe("BevelGearEngine", () => {
  const base = { pinion_teeth: 20, gear_teeth: 40, transmitted_power_kW: 10, pinion_speed_rpm: 1500 };
  it("gear ratio = teeth ratio", () => {
    expect(bevelGearEngine.calculate(base).gear_ratio.value).toBeCloseTo(2, 1);
  });
  it("cone angles sum ≈ 90°", () => {
    const r = bevelGearEngine.calculate(base);
    expect(r.pitch_cone_angle_pinion_deg.value + r.pitch_cone_angle_gear_deg.value).toBeCloseTo(90, 0);
  });
  it("bending stress > 0", () => {
    expect(bevelGearEngine.calculate(base).bending_stress_MPa.value).toBeGreaterThan(0);
  });
  it("contact stress > 0", () => {
    expect(bevelGearEngine.calculate(base).contact_stress_MPa.value).toBeGreaterThan(0);
  });
  it("face width > 0", () => {
    expect(bevelGearEngine.calculate(base).face_width_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(bevelGearEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("HarmonicDriveEngine", () => {
  const base = { output_torque_Nm: 50 };
  it("frame size > 0", () => {
    expect(harmonicDriveEngine.calculate(base).frame_size.value).toBeGreaterThan(0);
  });
  it("rated torque ≥ output torque", () => {
    expect(harmonicDriveEngine.calculate(base).rated_torque_Nm.value).toBeGreaterThanOrEqual(50);
  });
  it("efficiency > 70%", () => {
    expect(harmonicDriveEngine.calculate(base).efficiency_pct.value).toBeGreaterThan(70);
  });
  it("lost motion < 2 arcmin", () => {
    expect(harmonicDriveEngine.calculate(base).lost_motion_arcmin.value).toBeLessThan(2);
  });
  it("higher torque = bigger frame", () => {
    const lo = harmonicDriveEngine.calculate({ ...base, output_torque_Nm: 5 });
    const hi = harmonicDriveEngine.calculate({ ...base, output_torque_Nm: 500 });
    expect(hi.frame_size.value).toBeGreaterThan(lo.frame_size.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(harmonicDriveEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CouplingEngine", () => {
  const base = { transmitted_power_kW: 15, speed_rpm: 1500 };
  it("design torque > 0", () => {
    expect(couplingEngine.calculate(base).design_torque_Nm.value).toBeGreaterThan(0);
  });
  it("coupling size > 0", () => {
    expect(couplingEngine.calculate(base).coupling_size_mm.value).toBeGreaterThan(0);
  });
  it("max bore > 0", () => {
    expect(couplingEngine.calculate(base).max_bore_mm.value).toBeGreaterThan(0);
  });
  it("more power = bigger coupling", () => {
    const lo = couplingEngine.calculate({ ...base, transmitted_power_kW: 2 });
    const hi = couplingEngine.calculate({ ...base, transmitted_power_kW: 100 });
    expect(hi.coupling_size_mm.value).toBeGreaterThanOrEqual(lo.coupling_size_mm.value);
  });
  it("angular capacity > 0", () => {
    expect(couplingEngine.calculate(base).angular_capacity_deg.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(couplingEngine.calculate(base).recommendations)).toBe(true);
  });
});
