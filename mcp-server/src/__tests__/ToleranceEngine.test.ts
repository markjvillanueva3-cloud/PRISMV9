/**
 * ToleranceEngine — PHASE24 wiring tests.
 *
 * Pure-function ISO 286 tolerance engine. Asserts:
 *   - calculateITGrade matches ISO 286-1:2010 published values for canonical
 *     bands (10mm IT7 = 15μm, 50mm IT7 = 25μm, 100mm IT11 = 220μm).
 *   - analyzeShaftHoleFit recognizes H7/g6 as a clearance fit and produces
 *     positive min_clearance_mm.
 *   - toleranceStackUp on independent dimensions produces RSS-style total.
 *   - Invalid inputs throw with descriptive messages (out-of-range nominal,
 *     bad fit format, bad IT grade).
 */
import { describe, it, expect } from "vitest";
import {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  type StackDimension,
} from "../engines/ToleranceEngine.js";

describe("ToleranceEngine — calculateITGrade (ISO 286-1:2010)", () => {
  it("10mm IT7 = 15 μm (size band 6–10mm row, IT7 col)", () => {
    const r = calculateITGrade(10, 7);
    expect(r.tolerance_um).toBe(15);
    expect(r.tolerance_mm).toBe(0.015);
    expect(r.grade).toBe(7);
    expect(r.grade_label).toBe("IT7");
    expect(r.nominal_mm).toBe(10);
  });

  it("50mm IT7 = 25 μm", () => {
    const r = calculateITGrade(50, 7);
    expect(r.tolerance_um).toBe(25);
    expect(r.tolerance_mm).toBe(0.025);
  });

  it("100mm IT11 = 220 μm", () => {
    const r = calculateITGrade(100, 11);
    expect(r.tolerance_um).toBe(220);
    expect(r.tolerance_mm).toBe(0.22);
  });

  it("IT01 grade label rendered as 'IT01' for it_grade=-1", () => {
    const r = calculateITGrade(10, -1);
    expect(r.grade_label).toBe("IT01");
    expect(r.grade).toBe(-1);
  });

  it("nominal=0 throws out-of-range error", () => {
    expect(() => calculateITGrade(0, 7)).toThrow(/outside ISO 286 range/);
  });

  it("nominal=600 throws out-of-range error (above 500mm cap)", () => {
    expect(() => calculateITGrade(600, 7)).toThrow(/outside ISO 286 range/);
  });

  it("invalid IT grade=99 throws", () => {
    expect(() => calculateITGrade(10, 99)).toThrow(/Invalid IT grade/);
  });
});

describe("ToleranceEngine — analyzeShaftHoleFit", () => {
  it("H7/g6 on 25mm is a clearance fit with positive min clearance", () => {
    const r = analyzeShaftHoleFit(25, "H7/g6");
    expect(r.fit_type).toBe("clearance");
    expect(r.min_clearance_mm).toBeGreaterThan(0);
    expect(r.max_clearance_mm).toBeGreaterThan(r.min_clearance_mm);
    expect(r.nominal_mm).toBe(25);
    expect(r.fit_class).toBe("H7/g6");
  });

  it("H7/p6 on 25mm is an interference fit (negative clearance)", () => {
    const r = analyzeShaftHoleFit(25, "H7/p6");
    expect(r.fit_type).toBe("interference");
    expect(r.max_clearance_mm).toBeLessThanOrEqual(0);
  });

  it("hole position 'H' has lower_mm = nominal (lower deviation=0)", () => {
    const r = analyzeShaftHoleFit(25, "H7/g6");
    expect(r.hole.position).toBe("H");
    // For H position: lower_deviation = 0, so lower_mm = nominal_mm
    expect(r.hole.lower_mm).toBe(25);
    expect(r.hole.upper_mm).toBeGreaterThan(25);
    // Tolerance band must equal IT7 at 25mm (band 18–30mm row → 21 μm)
    expect(r.hole.tolerance_um).toBe(21);
  });

  it("invalid fit format throws", () => {
    expect(() => analyzeShaftHoleFit(25, "garbage")).toThrow(/Invalid fit class format/);
  });

  it("nominal=0 throws", () => {
    expect(() => analyzeShaftHoleFit(0, "H7/g6")).toThrow(/outside ISO 286 range/);
  });
});

describe("ToleranceEngine — toleranceStackUp", () => {
  it("single dimension stack reports 1 analyzed and matching mean", () => {
    const dims: StackDimension[] = [{ nominal: 10, tolerance: 0.05 }];
    const r = toleranceStackUp(dims);
    expect(r.dimensions_analyzed).toBe(1);
    expect(r.mean_dimension).toBe(10);
    expect(r.worst_case_tolerance).toBeCloseTo(0.05, 5);
  });

  it("3-dim stack worst-case = sum of |tolerances| = 0.15", () => {
    const dims: StackDimension[] = [
      { nominal: 10, tolerance: 0.05 },
      { nominal: 20, tolerance: 0.05 },
      { nominal: 30, tolerance: 0.05 },
    ];
    const r = toleranceStackUp(dims);
    expect(r.dimensions_analyzed).toBe(3);
    expect(r.mean_dimension).toBe(60);
    expect(r.worst_case_tolerance).toBeCloseTo(0.15, 5);
  });

  it("RSS (root-sum-square) is smaller than worst-case ≈ 0.0866", () => {
    const dims: StackDimension[] = [
      { nominal: 10, tolerance: 0.05 },
      { nominal: 20, tolerance: 0.05 },
      { nominal: 30, tolerance: 0.05 },
    ];
    const r = toleranceStackUp(dims);
    expect(r.rss_tolerance).toBeLessThan(r.worst_case_tolerance);
    // sqrt(3 × 0.05²) ≈ 0.0866
    expect(r.rss_tolerance).toBeCloseTo(0.0866, 3);
  });

  it("worst_case_range expands around mean by ±worst_case_tolerance", () => {
    const dims: StackDimension[] = [
      { nominal: 10, tolerance: 0.05 },
      { nominal: 20, tolerance: 0.05 },
    ];
    const r = toleranceStackUp(dims);
    // mean=30, wc=0.10
    expect(r.worst_case_range.min).toBeCloseTo(29.9, 5);
    expect(r.worst_case_range.max).toBeCloseTo(30.1, 5);
  });

  it("empty array throws descriptive error", () => {
    expect(() => toleranceStackUp([])).toThrow(/at least one dimension required/);
  });
});
