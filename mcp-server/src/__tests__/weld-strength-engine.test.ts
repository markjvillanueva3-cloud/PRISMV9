/**
 * WeldStrengthEngine — Unit Tests
 * @milestone FORGE-ENGINES-B29
 */
import { describe, it, expect } from "vitest";
import { weldStrengthEngine } from "../engines/WeldStrengthEngine.js";

describe("WeldStrengthEngine", () => {
  it("fillet throat = 0.707 × leg", () => {
    const r = weldStrengthEngine.calculate({
      weld_type: "fillet",
      leg_size_mm: 8,
    });
    expect(r.throat_thickness.value).toBeCloseTo(5.66, 1);
  });

  it("butt weld throat = plate thickness", () => {
    const r = weldStrengthEngine.calculate({
      weld_type: "butt_full",
      plate_thickness_mm: 12,
    });
    expect(r.throat_thickness.value).toBeCloseTo(12, 1);
  });

  it("higher force → higher stress", () => {
    const low = weldStrengthEngine.calculate({ force_n: 5000 });
    const high = weldStrengthEngine.calculate({ force_n: 50000 });
    expect(high.direct_shear_stress.value).toBeGreaterThan(
      low.direct_shear_stress.value
    );
  });

  it("double-sided weld doubles area", () => {
    const single = weldStrengthEngine.calculate({
      weld_both_sides: false,
    });
    const dbl = weldStrengthEngine.calculate({
      weld_both_sides: true,
    });
    expect(dbl.weld_area.value).toBeCloseTo(
      single.weld_area.value * 2, 0
    );
  });

  it("safety factor decreases with force", () => {
    const low = weldStrengthEngine.calculate({ force_n: 5000 });
    const high = weldStrengthEngine.calculate({ force_n: 100000 });
    expect(high.safety_factor.value).toBeLessThan(
      low.safety_factor.value
    );
  });

  it("E70 stronger than E60", () => {
    const e60 = weldStrengthEngine.calculate({ electrode: "E60" });
    const e70 = weldStrengthEngine.calculate({ electrode: "E70" });
    expect(e70.allowable_stress.value).toBeGreaterThan(
      e60.allowable_stress.value
    );
  });

  it("RT/UT inspection gives highest joint efficiency", () => {
    const vis = weldStrengthEngine.calculate({
      inspection_level: "visual",
    });
    const rt = weldStrengthEngine.calculate({
      inspection_level: "RT_UT",
    });
    expect(rt.joint_efficiency.value).toBeGreaterThan(
      vis.joint_efficiency.value
    );
  });

  it("warns undersized leg for thick plate", () => {
    const r = weldStrengthEngine.calculate({
      leg_size_mm: 3,
      plate_thickness_mm: 20,
    });
    expect(r.warnings.some(w => w.includes("minimum"))).toBe(true);
  });

  it("bending stress from moment", () => {
    const r = weldStrengthEngine.calculate({
      moment_nm: 500,
      force_n: 1000,
    });
    expect(r.bending_stress.value).toBeGreaterThan(0);
    expect(r.combined_stress.value).toBeGreaterThan(
      r.direct_shear_stress.value
    );
  });

  it("warns visual-only on full-pen butt", () => {
    const r = weldStrengthEngine.calculate({
      weld_type: "butt_full",
      inspection_level: "visual",
    });
    expect(
      r.warnings.some(w => w.includes("visual-only"))
    ).toBe(true);
  });
});
