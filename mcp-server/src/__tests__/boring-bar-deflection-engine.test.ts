/**
 * BoringBarDeflectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B16
 */
import { describe, it, expect } from "vitest";
import {
  boringBarDeflectionEngine,
} from "../engines/BoringBarDeflectionEngine.js";

describe("BoringBarDeflectionEngine", () => {
  it("calculates L/D ratio", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 20,
      overhang_mm: 80,
    });
    expect(r.ld_ratio.value).toBe(4);
  });

  it("calculates deflection for steel bar", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 20,
      overhang_mm: 80,
      bar_material: "steel",
    });
    expect(r.static_deflection.value).toBeGreaterThan(0);
    expect(r.deflection_at_surface.value).toBeCloseTo(
      r.static_deflection.value * 2, 4
    );
  });

  it("carbide bar has less deflection than steel", () => {
    const steel = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 20,
      overhang_mm: 80,
      bar_material: "steel",
    });
    const carbide = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 20,
      overhang_mm: 80,
      bar_material: "carbide",
    });
    expect(carbide.static_deflection.value).toBeLessThan(
      steel.static_deflection.value
    );
  });

  it("warns steel bar at L/D > 4", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 16,
      overhang_mm: 80,
      bar_material: "steel",
    });
    expect(r.ld_ratio.value).toBe(5);
    expect(
      r.warnings.some(w => w.includes("upgrade"))
    ).toBe(true);
  });

  it("recommends dampened bar for L/D > 6", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 10,
      overhang_mm: 80,
    });
    expect(r.recommended_bar_type.unit).toContain("dampened");
  });

  it("warns deflection > tolerance", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 12,
      overhang_mm: 100,
      depth_of_cut_mm: 1.0,
      tolerance_mm: 0.01,
    });
    expect(
      r.warnings.some(w => w.includes("tolerance"))
    ).toBe(true);
  });

  it("calculates minimum bar diameter", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 20,
      overhang_mm: 80,
      bar_material: "steel",
    });
    // min = 80/4 = 20mm for steel
    expect(r.min_bar_diameter.value).toBe(20);
  });

  it("calculates stiffness", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 25,
      overhang_mm: 100,
    });
    expect(r.stiffness.value).toBeGreaterThan(0);
  });

  it("warns high DOC relative to bar", () => {
    const r = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 16,
      overhang_mm: 50,
      depth_of_cut_mm: 2.0,
    });
    expect(
      r.warnings.some(w => w.includes("10%"))
    ).toBe(true);
  });

  it("surface finish impact scales with deflection", () => {
    const small = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 25,
      overhang_mm: 50,
    });
    const large = boringBarDeflectionEngine.calculate({
      bar_diameter_mm: 25,
      overhang_mm: 100,
    });
    expect(large.surface_finish_impact.value).toBeGreaterThan(
      small.surface_finish_impact.value
    );
  });
});
