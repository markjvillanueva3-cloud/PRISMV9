/**
 * SwissGuideBushDecisionEngine — per-engine tests (MS6b / U-LPS21)
 */
import { describe, it, expect } from "vitest";
import { swissGuideBushDecisionEngine } from "../engines/SwissGuideBushDecisionEngine.js";

function base() {
  return {
    bar_diameter_mm: 12,
    bar_tolerance_class: "h6" as const,
    projection_mm: 40,
    target_tolerance_mm: 0.02,
    target_ra_um: 1.6,
    bushing_overhang_mm: 5,
    collet_overhang_mm: 40,
    radial_force_n: 80,
  };
}

describe("SwissGuideBushDecisionEngine", () => {
  it("recommends GB when tolerance is tight (< 0.02 mm)", () => {
    const r = swissGuideBushDecisionEngine.decide({ ...base(), target_tolerance_mm: 0.005 });
    expect(r.recommended_mode).toBe("guide_bush");
    expect(r.reasoning.some((r) => /tolerance/.test(r))).toBe(true);
  });

  it("recommends GB when Ra < 0.8 µm (fine finish)", () => {
    const r = swissGuideBushDecisionEngine.decide({ ...base(), target_ra_um: 0.4 });
    expect(r.recommended_mode).toBe("guide_bush");
    expect(r.reasoning.some((r) => /Ra/.test(r))).toBe(true);
  });

  it("flags mirror-class Ra < 0.4 µm as REQUIRES GB", () => {
    const r = swissGuideBushDecisionEngine.decide({ ...base(), target_ra_um: 0.2 });
    expect(r.recommended_mode).toBe("guide_bush");
    expect(r.reasoning.some((r) => /mirror-class/.test(r))).toBe(true);
  });

  it("recommends GB when L/D > 4 (slender overhang)", () => {
    const r = swissGuideBushDecisionEngine.decide({
      ...base(),
      bar_diameter_mm: 10,
      projection_mm: 60, // L/D = 6
    });
    expect(r.recommended_mode).toBe("guide_bush");
    expect(r.reasoning.some((r) => /L\/D/.test(r))).toBe(true);
  });

  it("returns 'either' for loose tolerance + modest L/D + rough finish (no hard GB criterion)", () => {
    const r = swissGuideBushDecisionEngine.decide({
      ...base(),
      bar_diameter_mm: 20,
      projection_mm: 30,
      target_tolerance_mm: 0.1,
      target_ra_um: 3.2,
    });
    expect(r.recommended_mode).toBe("either");
    expect(r.reasoning.some((r) => /either mode/.test(r))).toBe(true);
  });

  it("flags h9 bar when GB mode required (tolerance mismatch)", () => {
    const r = swissGuideBushDecisionEngine.decide({
      ...base(),
      bar_tolerance_class: "h9",
      target_tolerance_mm: 0.005,
    });
    expect(r.bar_tolerance_ok).toBe(false);
    expect(r.warnings.some((w) => /h6/.test(w))).toBe(true);
  });

  it("GB deflection is less than non-GB deflection (shorter lever arm)", () => {
    const r = swissGuideBushDecisionEngine.decide(base());
    expect(r.deflection_gb_mm).toBeDefined();
    expect(r.deflection_nongb_mm).toBeDefined();
    expect(r.deflection_gb_mm!).toBeLessThan(r.deflection_nongb_mm!);
  });

  it("deflection scales cubically with length (L³)", () => {
    // Use larger lengths to avoid rounding-precision noise on very small deflections.
    const r1 = swissGuideBushDecisionEngine.decide({
      ...base(),
      bar_diameter_mm: 8,
      radial_force_n: 400,
      bushing_overhang_mm: 30,
    });
    const r2 = swissGuideBushDecisionEngine.decide({
      ...base(),
      bar_diameter_mm: 8,
      radial_force_n: 400,
      bushing_overhang_mm: 60,
    });
    // Doubling L should increase deflection by ~8× (2³).
    const ratio = r2.deflection_gb_mm! / r1.deflection_gb_mm!;
    expect(ratio).toBeGreaterThan(7);
    expect(ratio).toBeLessThan(9);
  });

  it("computes collet pressure when clamping force + contact length supplied", () => {
    const r = swissGuideBushDecisionEngine.decide({
      ...base(),
      clamping_force_n: 5000,
      collet_contact_length_mm: 15,
      collet_mu: 0.15,
    });
    expect(r.collet_pressure_mpa).toBeDefined();
    expect(r.collet_pressure_mpa!).toBeGreaterThan(0);
  });

  it("warns on thin-wall parts with high collet pressure", () => {
    const r = swissGuideBushDecisionEngine.decide({
      ...base(),
      clamping_force_n: 30000,
      wall_thickness_mm: 0.5,
    });
    expect(r.warnings.some((w) => /wall|ovality/.test(w))).toBe(true);
  });

  it("handles missing bushing_overhang (no GB deflection reported)", () => {
    const r = swissGuideBushDecisionEngine.decide({ ...base(), bushing_overhang_mm: undefined });
    expect(r.deflection_gb_mm).toBeUndefined();
  });
});
