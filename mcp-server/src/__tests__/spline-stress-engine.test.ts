/**
 * SplineStressEngine — Unit Tests
 * @milestone FORGE-ENGINES-B33
 */
import { describe, it, expect } from "vitest";
import { splineStressEngine } from "../engines/SplineStressEngine.js";

describe("SplineStressEngine", () => {
  it("shear and bearing stress > 0", () => {
    const r = splineStressEngine.calculate({ torque_nm: 500 });
    expect(r.shear_stress.value).toBeGreaterThan(0);
    expect(r.bearing_stress.value).toBeGreaterThan(0);
  });

  it("bearing stress > shear stress", () => {
    const r = splineStressEngine.calculate({ torque_nm: 500 });
    expect(r.bearing_stress.value).toBeGreaterThan(r.shear_stress.value);
  });

  it("more torque = higher stress", () => {
    const low = splineStressEngine.calculate({ torque_nm: 100 });
    const high = splineStressEngine.calculate({ torque_nm: 1000 });
    expect(high.shear_stress.value).toBeGreaterThan(low.shear_stress.value);
  });

  it("effective teeth = 75% of total", () => {
    const r = splineStressEngine.calculate({ num_teeth: 20 });
    expect(r.effective_teeth.value).toBeCloseTo(15, 1);
  });

  it("sliding spline has higher fretting risk", () => {
    const fixed = splineStressEngine.calculate({ spline_type: "fixed" });
    const sliding = splineStressEngine.calculate({ spline_type: "sliding" });
    expect(sliding.fretting_risk.value).toBeGreaterThan(
      fixed.fretting_risk.value
    );
  });

  it("shock loading reduces safety factor", () => {
    const stat = splineStressEngine.calculate({
      torque_nm: 300,
      loading_type: "static",
    });
    const shock = splineStressEngine.calculate({
      torque_nm: 300,
      loading_type: "shock",
    });
    expect(shock.shear_safety_factor.value).toBeLessThan(
      stat.shear_safety_factor.value
    );
  });

  it("torque capacity > 0", () => {
    const r = splineStressEngine.calculate({});
    expect(r.torque_capacity.value).toBeGreaterThan(0);
  });

  it("misalignment increases Km", () => {
    const aligned = splineStressEngine.calculate({ misalignment_deg: 0 });
    const misaligned = splineStressEngine.calculate({ misalignment_deg: 1 });
    expect(misaligned.load_distribution_factor.value).toBeGreaterThan(
      aligned.load_distribution_factor.value
    );
  });

  it("warns long L/D > 2.5", () => {
    const r = splineStressEngine.calculate({
      pitch_diameter_mm: 30,
      engagement_length_mm: 100,
    });
    expect(r.warnings.some(w => w.includes("L/D"))).toBe(true);
  });

  it("derives torque from power and rpm", () => {
    const r = splineStressEngine.calculate({
      power_kw: 10,
      rpm: 1500,
    });
    expect(r.shear_stress.value).toBeGreaterThan(0);
    expect(r.spline_feasible.unit).toBe("PASS");
  });
});
