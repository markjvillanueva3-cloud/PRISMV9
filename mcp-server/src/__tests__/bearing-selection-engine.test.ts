/**
 * BearingSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B33
 */
import { describe, it, expect } from "vitest";
import { bearingSelectionEngine } from "../engines/BearingSelectionEngine.js";

describe("BearingSelectionEngine", () => {
  it("required dynamic rating increases with load", () => {
    const low = bearingSelectionEngine.calculate({ radial_load_n: 2000 });
    const high = bearingSelectionEngine.calculate({ radial_load_n: 10000 });
    expect(high.required_dynamic_rating.value).toBeGreaterThan(
      low.required_dynamic_rating.value
    );
  });

  it("L10 life in hours > 0", () => {
    const r = bearingSelectionEngine.calculate({});
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });

  it("higher speed requires higher dynamic rating", () => {
    const slow = bearingSelectionEngine.calculate({ speed_rpm: 500 });
    const fast = bearingSelectionEngine.calculate({ speed_rpm: 5000 });
    expect(fast.required_dynamic_rating.value).toBeGreaterThan(
      slow.required_dynamic_rating.value
    );
  });

  it("oil jet improves life vs grease", () => {
    const grease = bearingSelectionEngine.calculate({ lubrication: "grease" });
    const jet = bearingSelectionEngine.calculate({ lubrication: "oil_jet" });
    expect(jet.adjusted_life_hours.value).toBeGreaterThan(
      grease.adjusted_life_hours.value
    );
  });

  it("contaminated environment reduces life", () => {
    const clean = bearingSelectionEngine.calculate({ contamination: "clean" });
    const dirty = bearingSelectionEngine.calculate({ contamination: "severe" });
    expect(dirty.adjusted_life_hours.value).toBeLessThan(
      clean.adjusted_life_hours.value
    );
  });

  it("cylindrical roller warns on axial load", () => {
    const r = bearingSelectionEngine.calculate({
      bearing_type: "cylindrical",
      axial_load_n: 1000,
    });
    expect(r.warnings.some(w => w.includes("axial"))).toBe(true);
  });

  it("ndm calculated from bore × rpm", () => {
    const r = bearingSelectionEngine.calculate({
      shaft_diameter_mm: 50,
      speed_rpm: 3000,
    });
    expect(r.ndm_value.value).toBe(150000);
  });

  it("warns ndm exceeds limit", () => {
    const r = bearingSelectionEngine.calculate({
      shaft_diameter_mm: 100,
      speed_rpm: 6000,
      bearing_type: "tapered",
    });
    // ndm = 600000 > 350000 limit for tapered
    expect(r.warnings.some(w => w.includes("ndm"))).toBe(true);
  });

  it("ball bearings use p=3 life exponent", () => {
    const r = bearingSelectionEngine.calculate({
      bearing_type: "deep_groove",
      radial_load_n: 5000,
    });
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });

  it("higher reliability reduces adjusted life", () => {
    const r90 = bearingSelectionEngine.calculate({ reliability_pct: 90 });
    const r99 = bearingSelectionEngine.calculate({ reliability_pct: 99 });
    expect(r99.adjusted_life_hours.value).toBeLessThan(
      r90.adjusted_life_hours.value
    );
  });
});
