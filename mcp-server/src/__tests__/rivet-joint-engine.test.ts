/**
 * RivetJointEngine — Unit Tests
 * @milestone FORGE-ENGINES-B45
 */
import { describe, it, expect } from "vitest";
import { rivetJointEngine } from "../engines/RivetJointEngine.js";

describe("RivetJointEngine", () => {
  it("joint strength > 0", () => {
    const r = rivetJointEngine.calculate({});
    expect(r.joint_strength.value).toBeGreaterThan(0);
  });

  it("joint strength = min(shear, bearing, tearing)", () => {
    const r = rivetJointEngine.calculate({});
    expect(r.joint_strength.value).toBe(
      Math.min(r.shear_strength.value, r.bearing_strength.value, r.tearing_strength.value)
    );
  });

  it("efficiency between 0 and 100%", () => {
    const r = rivetJointEngine.calculate({});
    expect(r.joint_efficiency.value).toBeGreaterThan(0);
    expect(r.joint_efficiency.value).toBeLessThanOrEqual(100);
  });

  it("double lap has higher shear strength", () => {
    const single = rivetJointEngine.calculate({ joint_type: "single_lap" });
    const double = rivetJointEngine.calculate({ joint_type: "double_lap" });
    expect(double.shear_strength.value).toBeGreaterThan(single.shear_strength.value);
  });

  it("larger rivet increases shear strength", () => {
    const small = rivetJointEngine.calculate({ rivet_diameter_mm: 12 });
    const large = rivetJointEngine.calculate({ rivet_diameter_mm: 24 });
    expect(large.shear_strength.value).toBeGreaterThan(small.shear_strength.value);
  });

  it("high-strength rivet material increases shear", () => {
    const mild = rivetJointEngine.calculate({ rivet_material: "mild_steel" });
    const hs = rivetJointEngine.calculate({ rivet_material: "high_strength" });
    expect(hs.shear_strength.value).toBeGreaterThan(mild.shear_strength.value);
  });

  it("safety factor > 0", () => {
    const r = rivetJointEngine.calculate({});
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("failure mode is valid", () => {
    const r = rivetJointEngine.calculate({});
    expect(r.failure_mode.unit).toMatch(/rivet_shear|bearing|plate_tearing/);
  });

  it("warns single lap eccentric loading", () => {
    const r = rivetJointEngine.calculate({ joint_type: "single_lap" });
    expect(r.warnings.some(w => w.includes("eccentric") || w.includes("Single lap"))).toBe(true);
  });

  it("warns when pitch too small", () => {
    const r = rivetJointEngine.calculate({ rivet_diameter_mm: 20, pitch_mm: 40 });
    expect(r.warnings.some(w => w.includes("Pitch") || w.includes("close"))).toBe(true);
  });
});
