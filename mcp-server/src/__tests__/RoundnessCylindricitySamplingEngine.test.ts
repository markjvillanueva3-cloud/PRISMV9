import { describe, it, expect } from "vitest";
import { roundnessCylindricitySamplingEngine } from "../engines/RoundnessCylindricitySamplingEngine.js";

describe("RoundnessCylindricitySamplingEngine", () => {
  it("generates industrial plan with rotary datum for roundness", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.01,
      diameter_mm: 50,
    });
    expect(r.circumferential_points).toBeGreaterThanOrEqual(7);
    expect(r.axial_generators).toBe(1);
    expect(r.method_confidence).toBeGreaterThan(0.8);
  });

  it("warns when 2-point method used on odd-lobe signature", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "two_point",
      tolerance_mm: 0.01,
      diameter_mm: 30,
      expected_upr: 3,
    });
    expect(r.method_confidence).toBeLessThan(0.5);
    expect(r.warnings.some((w) => /odd/i.test(w))).toBe(true);
  });

  it("3-point vee is well-suited to 3-lobe", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "three_point_vee",
      tolerance_mm: 0.005,
      diameter_mm: 30,
      expected_upr: 3,
    });
    expect(r.method_confidence).toBeGreaterThan(0.8);
  });

  it("warns on 3-point vee with even UPR", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "three_point_vee",
      tolerance_mm: 0.01,
      diameter_mm: 30,
      expected_upr: 4,
    });
    expect(r.method_confidence).toBeLessThan(0.5);
    expect(r.warnings.some((w) => /even/i.test(w))).toBe(true);
  });

  it("precision class boosts point count", () => {
    const ind = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.05,
      diameter_mm: 30,
      filter_cutoff_upr: 10,
      precision_class: "industrial",
    });
    const pre = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.05,
      diameter_mm: 30,
      filter_cutoff_upr: 10,
      precision_class: "precision",
    });
    expect(pre.circumferential_points).toBeGreaterThan(ind.circumferential_points);
  });

  it("reference class uses much higher point count", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.001,
      diameter_mm: 30,
      precision_class: "reference",
    });
    expect(r.circumferential_points).toBeGreaterThanOrEqual(180);
  });

  it("cylindricity generates axial generators", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "cylindricity",
      method: "rotary_datum",
      tolerance_mm: 0.01,
      diameter_mm: 25,
      length_mm: 50,
    });
    expect(r.axial_generators).toBeGreaterThanOrEqual(3);
    expect(r.axial_spacing_mm).toBeGreaterThan(0);
    expect(r.total_points).toBe(r.circumferential_points * r.axial_generators);
  });

  it("cylindricity without length falls back to default 3 axial", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "cylindricity",
      method: "rotary_datum",
      tolerance_mm: 0.01,
      diameter_mm: 25,
    });
    expect(r.axial_generators).toBe(3);
    expect(r.warnings.some((w) => /length/i.test(w))).toBe(true);
  });

  it("tighter tolerance requests more points", () => {
    const loose = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.1,
      diameter_mm: 30,
    });
    const tight = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.002,
      diameter_mm: 30,
    });
    expect(tight.circumferential_points).toBeGreaterThan(loose.circumferential_points);
  });

  it("UPR resolvable = floor(N/2)", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.01,
      diameter_mm: 30,
    });
    expect(r.upr_resolvable).toBe(Math.floor(r.circumferential_points / 2));
  });

  it("angular spacing = 360/N", () => {
    const r = roundnessCylindricitySamplingEngine.plan({
      feature: "roundness",
      method: "rotary_datum",
      tolerance_mm: 0.01,
      diameter_mm: 30,
    });
    expect(Math.abs(r.angular_spacing_deg - 360 / r.circumferential_points)).toBeLessThan(0.2);
  });

  it("getStats returns methods list", () => {
    const s = roundnessCylindricitySamplingEngine.getStats();
    expect(s.methods).toContain("rotary_datum");
    expect(s.nyquist_rule).toMatch(/Nyquist/);
  });
});
