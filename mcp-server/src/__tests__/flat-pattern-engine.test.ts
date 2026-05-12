/**
 * FlatPatternEngine — Unit Tests
 * @milestone FORGE-ENGINES-B43
 */
import { describe, it, expect } from "vitest";
import { flatPatternEngine } from "../engines/FlatPatternEngine.js";

describe("FlatPatternEngine", () => {
  it("total flat length > 0", () => {
    const r = flatPatternEngine.calculate({});
    expect(r.total_flat_length.value).toBeGreaterThan(0);
  });

  it("flat length < sum of leg lengths (deductions)", () => {
    const legs = [50, 30, 50];
    const r = flatPatternEngine.calculate({
      leg_lengths_mm: legs,
      bend_angles_deg: [90, 90],
    });
    expect(r.total_flat_length.value).toBeLessThan(
      legs.reduce((s, l) => s + l, 0)
    );
  });

  it("bend allowance > 0", () => {
    const r = flatPatternEngine.calculate({});
    expect(r.bend_allowance_per_bend.value).toBeGreaterThan(0);
  });

  it("larger radius increases bend allowance", () => {
    const tight = flatPatternEngine.calculate({ bend_radius_mm: 1 });
    const loose = flatPatternEngine.calculate({ bend_radius_mm: 10 });
    expect(loose.bend_allowance_per_bend.value).toBeGreaterThan(
      tight.bend_allowance_per_bend.value
    );
  });

  it("K-factor in valid range", () => {
    const r = flatPatternEngine.calculate({});
    expect(r.k_factor.value).toBeGreaterThanOrEqual(0.25);
    expect(r.k_factor.value).toBeLessThanOrEqual(0.50);
  });

  it("more bends count correctly", () => {
    const two = flatPatternEngine.calculate({
      leg_lengths_mm: [40, 30, 40],
      bend_angles_deg: [90, 90],
    });
    expect(two.num_bends.value).toBe(2);
  });

  it("outside setback > 0 for 90 degree bend", () => {
    const r = flatPatternEngine.calculate({ bend_angles_deg: [90] });
    expect(r.outside_setback.value).toBeGreaterThan(0);
  });

  it("warns tight bend radius", () => {
    const r = flatPatternEngine.calculate({
      material: "stainless",
      thickness_mm: 3,
      bend_radius_mm: 0.5,
    });
    expect(r.warnings.some(w => w.includes("radius") || w.includes("crack"))).toBe(true);
  });

  it("blank weight > 0", () => {
    const r = flatPatternEngine.calculate({});
    expect(r.blank_weight.value).toBeGreaterThan(0);
  });

  it("aluminum lighter blank than steel", () => {
    const steel = flatPatternEngine.calculate({ material: "mild_steel" });
    const alum = flatPatternEngine.calculate({ material: "aluminum" });
    expect(alum.blank_weight.value).toBeLessThan(steel.blank_weight.value);
  });
});
