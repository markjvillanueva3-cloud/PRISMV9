/**
 * GearTrainEngine — Unit Tests
 * @milestone FORGE-ENGINES-B30
 */
import { describe, it, expect } from "vitest";
import { gearTrainEngine } from "../engines/GearTrainEngine.js";

describe("GearTrainEngine", () => {
  it("gear ratio = Ng/Np", () => {
    const r = gearTrainEngine.calculate({
      pinion_teeth: 20,
      gear_teeth: 60,
    });
    expect(r.gear_ratio.value).toBeCloseTo(3, 2);
  });

  it("output RPM = input / ratio", () => {
    const r = gearTrainEngine.calculate({
      pinion_teeth: 20,
      gear_teeth: 80,
      input_rpm: 1600,
    });
    expect(r.output_rpm.value).toBeCloseTo(400, 0);
  });

  it("output torque = input × ratio × efficiency", () => {
    const r = gearTrainEngine.calculate({
      pinion_teeth: 20,
      gear_teeth: 60,
      input_power_kw: 5,
      input_rpm: 1500,
    });
    // Torque_in = 5000×60/(2π×1500) ≈ 31.83 N·m
    // Torque_out ≈ 31.83 × 3 × 0.98 ≈ 93.6
    expect(r.output_torque.value).toBeCloseTo(93.6, 0);
  });

  it("pitch diameter = module × teeth", () => {
    const r = gearTrainEngine.calculate({
      module_mm: 4,
      pinion_teeth: 25,
    });
    expect(r.pitch_diameter_pinion.value).toBeCloseTo(100, 1);
  });

  it("center distance = (dp + dg) / 2", () => {
    const r = gearTrainEngine.calculate({
      module_mm: 3,
      pinion_teeth: 20,
      gear_teeth: 40,
    });
    // dp=60, dg=120, cd=90
    expect(r.center_distance.value).toBeCloseTo(90, 1);
  });

  it("helical gears have lower efficiency than spur", () => {
    const spur = gearTrainEngine.calculate({ helix_angle_deg: 0 });
    const helical = gearTrainEngine.calculate({ helix_angle_deg: 20 });
    expect(helical.mesh_efficiency.value).toBeLessThan(
      spur.mesh_efficiency.value
    );
  });

  it("bending stress increases with power", () => {
    const low = gearTrainEngine.calculate({ input_power_kw: 2 });
    const high = gearTrainEngine.calculate({ input_power_kw: 20 });
    expect(high.lewis_bending_stress.value).toBeGreaterThan(
      low.lewis_bending_stress.value
    );
  });

  it("warns few pinion teeth < 14", () => {
    const r = gearTrainEngine.calculate({ pinion_teeth: 12 });
    expect(r.warnings.some(w => w.includes("interference"))).toBe(true);
  });

  it("contact stress > 0", () => {
    const r = gearTrainEngine.calculate({});
    expect(r.contact_stress.value).toBeGreaterThan(0);
  });

  it("tangential force from torque", () => {
    const r = gearTrainEngine.calculate({
      module_mm: 3,
      pinion_teeth: 20,
      input_power_kw: 5,
      input_rpm: 1500,
    });
    // T_in ≈ 31.83 N·m, dp=60mm, Wt = 2T/d = 2×31830/60 ≈ 1061 N
    expect(r.tangential_force.value).toBeCloseTo(1061, -1);
  });
});
