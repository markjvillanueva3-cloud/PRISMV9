/**
 * SplineJointEngine — Unit Tests
 * @milestone FORGE-ENGINES-B47
 */
import { describe, it, expect } from "vitest";
import { splineJointEngine } from "../engines/SplineJointEngine.js";

describe("SplineJointEngine", () => {
  it("bearing stress > 0", () => {
    const r = splineJointEngine.calculate({});
    expect(r.bearing_stress.value).toBeGreaterThan(0);
  });

  it("shear stress > 0", () => {
    const r = splineJointEngine.calculate({});
    expect(r.shear_stress.value).toBeGreaterThan(0);
  });

  it("torque capacity > 0", () => {
    const r = splineJointEngine.calculate({});
    expect(r.torque_capacity.value).toBeGreaterThan(0);
  });

  it("more teeth increases torque capacity", () => {
    const few = splineJointEngine.calculate({ num_teeth: 6 });
    const many = splineJointEngine.calculate({ num_teeth: 20 });
    expect(many.torque_capacity.value).toBeGreaterThan(
      few.torque_capacity.value
    );
  });

  it("longer engagement reduces bearing stress", () => {
    const short = splineJointEngine.calculate({ engagement_length_mm: 20 });
    const long = splineJointEngine.calculate({ engagement_length_mm: 80 });
    expect(long.bearing_stress.value).toBeLessThan(
      short.bearing_stress.value
    );
  });

  it("higher hardness increases allowable bearing", () => {
    const soft = splineJointEngine.calculate({ hardness_hrc: 30 });
    const hard = splineJointEngine.calculate({ hardness_hrc: 58 });
    expect(hard.allowable_bearing.value).toBeGreaterThan(
      soft.allowable_bearing.value
    );
  });

  it("safety factor > 0", () => {
    const r = splineJointEngine.calculate({});
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("contact ratio ≤ 1", () => {
    const r = splineJointEngine.calculate({});
    expect(r.contact_ratio.value).toBeLessThanOrEqual(1);
  });

  it("mean diameter between minor and major", () => {
    const r = splineJointEngine.calculate({
      major_diameter_mm: 50, minor_diameter_mm: 42,
    });
    expect(r.mean_diameter.value).toBe(46);
  });

  it("warns short engagement", () => {
    const r = splineJointEngine.calculate({
      shaft_diameter_mm: 50, engagement_length_mm: 10,
    });
    expect(r.warnings.some(w => w.includes("short") || w.includes("L/D"))).toBe(true);
  });
});
