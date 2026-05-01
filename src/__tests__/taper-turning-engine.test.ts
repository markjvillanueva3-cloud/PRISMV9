/**
 * TaperTurningEngine — Unit Tests
 * @milestone FORGE-ENGINES-B16
 */
import { describe, it, expect } from "vitest";
import { taperTurningEngine } from "../engines/TaperTurningEngine.js";

describe("TaperTurningEngine", () => {
  it("calculates taper angle from dimensions", () => {
    // 30mm large, 20mm small, 100mm length
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 30,
      small_diameter_mm: 20,
      taper_length_mm: 100,
    });
    // half angle = atan(10/(2×100)) = atan(0.05) ≈ 2.862°
    expect(r.half_angle.value).toBeCloseTo(2.862, 1);
    expect(r.included_angle.value).toBeCloseTo(5.724, 1);
  });

  it("calculates compound rest angle = half angle", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 40,
      small_diameter_mm: 30,
      taper_length_mm: 50,
    });
    expect(r.compound_rest_angle.value).toBeCloseTo(
      r.half_angle.value, 2
    );
  });

  it("calculates tailstock offset correctly", () => {
    // D=30, d=20, taper_L=100, total_L=200
    // offset = (30-20)×200/(2×100) = 10
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 30,
      small_diameter_mm: 20,
      taper_length_mm: 100,
      total_part_length_mm: 200,
    });
    expect(r.tailstock_offset.value).toBe(10);
  });

  it("warns large tailstock offset", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 50,
      small_diameter_mm: 20,
      taper_length_mm: 100,
      total_part_length_mm: 200,
      method: "tailstock_offset",
    });
    expect(
      r.warnings.some(w => w.includes("bearing"))
    ).toBe(true);
  });

  it("warns steep taper for tailstock offset", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 50,
      small_diameter_mm: 20,
      taper_length_mm: 50,
      method: "tailstock_offset",
    });
    expect(
      r.warnings.some(w => w.includes("Steep taper"))
    ).toBe(true);
  });

  it("warns compound rest on long taper", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 35,
      small_diameter_mm: 30,
      taper_length_mm: 100,
      method: "compound_rest",
    });
    expect(
      r.warnings.some(w => w.includes("limited travel"))
    ).toBe(true);
  });

  it("calculates taper per foot", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 30,
      small_diameter_mm: 20,
      taper_length_mm: 100,
    });
    expect(r.taper_per_foot.value).toBeGreaterThan(0);
  });

  it("calculates number of passes", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 40,
      small_diameter_mm: 30,
      taper_length_mm: 80,
      depth_of_cut_mm: 1.0,
    });
    // radial = 10/2 = 5mm, DOC=1 → 5 passes
    expect(r.number_of_passes.value).toBe(5);
  });

  it("warns D <= d", () => {
    const r = taperTurningEngine.calculate({
      large_diameter_mm: 20,
      small_diameter_mm: 25,
      taper_length_mm: 50,
    });
    expect(
      r.warnings.some(w => w.includes("greater"))
    ).toBe(true);
  });
});
