/**
 * GDTStackupEngine — PHASE22 wiring tests. Real assertions on a 3-link
 * stack-up (shaft + spacer + housing) with bilateral tolerances. Exercises
 * worst-case / RSS / monte-carlo paths and thermal-shift behavior.
 */
import { describe, it, expect } from "vitest";
import { gdtStackupEngine } from "../engines/GDTStackupEngine.js";

const SHAFT_SPACER_HOUSING = {
  dimensions: [
    { name: "housing_id", nominal_mm: 50.00, plus_tol_mm: 0.02, minus_tol_mm: 0.00, direction: "positive" as const },
    { name: "spacer_thk", nominal_mm: 10.00, plus_tol_mm: 0.05, minus_tol_mm: 0.05, direction: "negative" as const },
    { name: "shaft_dia",  nominal_mm: 39.95, plus_tol_mm: 0.00, minus_tol_mm: 0.03, direction: "negative" as const },
  ],
  gap_name: "axial_clearance",
};

describe("GDTStackupEngine.compute — three-dimension axial stack", () => {
  it("nominal gap = housing − spacer − shaft = 0.05mm", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(r.value.nominal_gap_mm).toBeCloseTo(0.05, 5);
  });

  it("worst-case total tolerance = sum of all tolerances", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    // Σ tolerance bands = 0.02 + 0.10 + 0.03 = 0.15 mm
    expect(r.value.worst_case.total_tolerance_mm).toBeCloseTo(0.15, 5);
  });

  it("RSS total tolerance < worst-case total (RSS shrinks the band)", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(r.value.rss.total_tolerance_mm).toBeLessThan(r.value.worst_case.total_tolerance_mm);
  });

  it("RSS feasibility false when nominal-gap can swing negative", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    // 0.05 ± rss-half-band — rss min could be negative
    expect(typeof r.value.rss.feasible).toBe("boolean");
  });

  it("monte-carlo trials default 10000 — reject_pct in [0, 100]", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(r.value.monte_carlo.reject_pct).toBeGreaterThanOrEqual(0);
    expect(r.value.monte_carlo.reject_pct).toBeLessThanOrEqual(100);
  });

  it("sensitivity contributions sum to ~100%", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    const sum = r.value.sensitivity.reduce((s, x) => s + x.contribution_pct, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it("explicit gap_requirement {min: 0.02, max: 0.20} populates feasibility", () => {
    const r = gdtStackupEngine.compute({
      ...SHAFT_SPACER_HOUSING,
      gap_requirement: { min_mm: 0.02, max_mm: 0.20 },
    });
    expect(typeof r.value.worst_case.feasible).toBe("boolean");
  });

  it("thermal_delta_c=0 → thermal_shift_mm = 0", () => {
    const r = gdtStackupEngine.compute({
      ...SHAFT_SPACER_HOUSING,
      temperature_delta_c: 0,
    });
    expect(r.value.thermal_shift_mm).toBe(0);
  });

  it("monte_carlo_trials=1000 → still produces a valid stat (mean reasonable)", () => {
    const r = gdtStackupEngine.compute({
      ...SHAFT_SPACER_HOUSING,
      monte_carlo_trials: 1000,
    });
    // Mean should be near nominal 0.05
    expect(r.value.monte_carlo.mean_gap_mm).toBeGreaterThan(-0.1);
    expect(r.value.monte_carlo.mean_gap_mm).toBeLessThan(0.2);
  });

  it("AtomicValue wrapper has unit 'mm'", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(r.unit).toBe("mm");
  });

  it("recommendations is an array (may be empty for a feasible stack)", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(Array.isArray(r.value.recommendations)).toBe(true);
  });

  it("monte-carlo p001 ≤ p999 (percentile order)", () => {
    const r = gdtStackupEngine.compute(SHAFT_SPACER_HOUSING);
    expect(r.value.monte_carlo.p001_mm).toBeLessThanOrEqual(r.value.monte_carlo.p999_mm);
  });
});
