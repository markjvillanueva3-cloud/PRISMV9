/**
 * CADToleranceSignalEncoderEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U09).
 *
 * Closed-form assertions on the 6-d tolerance signal: min/mean log-norm
 * math, count log-norm, presence flags for form/orientation/location
 * GD&T categories, R12 fail-loud, unified-feature augmentation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADToleranceSignalEncoderEngine, TOLERANCE_SIGNAL_DIM } from "../engines/CADToleranceSignalEncoderEngine.js";

describe("CADToleranceSignalEncoderEngine — P1-U09", () => {
  let eng: CADToleranceSignalEncoderEngine;
  beforeEach(() => {
    eng = new CADToleranceSignalEncoderEngine();
  });

  it("TOLERANCE_SIGNAL_DIM=6 and empty input returns 6-d zero vector + counter", () => {
    expect(TOLERANCE_SIGNAL_DIM).toBe(6);
    expect(eng.encodeTolerances([])).toEqual([0, 0, 0, 0, 0, 0]);
    expect(eng.getStats().totalEmptySignals).toBe(1);
  });

  it("single tight tolerance: tightest+mean both = log1p(0.01)/log1p(10)", () => {
    const v = eng.encodeTolerances([{ tolerance_mm: 0.01 }]);
    const expected = Math.log1p(0.01) / Math.log1p(10);
    expect(v[0]).toBeCloseTo(expected, 6); // tightest
    expect(v[1]).toBeCloseTo(expected, 6); // mean
  });

  it("min tolerance distinguished from mean across multiple callouts", () => {
    const v = eng.encodeTolerances([
      { tolerance_mm: 0.05 },
      { tolerance_mm: 0.5 },
      { tolerance_mm: 0.5 },
    ]);
    const tightest = Math.log1p(0.05) / Math.log1p(10);
    const mean = Math.log1p(0.35) / Math.log1p(10); // (0.05+0.5+0.5)/3 = 0.35
    expect(v[0]).toBeCloseTo(tightest, 6);
    expect(v[1]).toBeCloseTo(mean, 6);
    expect(v[0]).toBeLessThan(v[1]); // tightest < mean
  });

  it("count log-norm: 64 callouts → exactly 1.0; 0 callouts → 0", () => {
    const sixtyFour = Array.from({ length: 64 }, () => ({ tolerance_mm: 0.1 }));
    expect(eng.encodeTolerances(sixtyFour)[2]).toBeCloseTo(1.0, 10);
    expect(eng.encodeTolerances([])[2]).toBe(0);
  });

  it("count log-norm: monotonic increasing (1 < 8 < 32)", () => {
    const one = eng.encodeTolerances([{ tolerance_mm: 0.1 }])[2];
    const eight = eng.encodeTolerances(Array.from({ length: 8 }, () => ({ tolerance_mm: 0.1 })))[2];
    const thirtyTwo = eng.encodeTolerances(Array.from({ length: 32 }, () => ({ tolerance_mm: 0.1 })))[2];
    expect(one).toBeLessThan(eight);
    expect(eight).toBeLessThan(thirtyTwo);
  });

  it("form presence flag: flatness/straightness/circularity/cylindricity → slot[3]=1", () => {
    for (const sym of ["flatness", "straightness", "circularity", "cylindricity"]) {
      const v = eng.encodeTolerances([{ gdt_symbol: sym }]);
      expect(v[3]).toBe(1);
      expect(v[4]).toBe(0); // not orientation
      expect(v[5]).toBe(0); // not location
    }
  });

  it("orientation presence flag: perpendicularity/parallelism/angularity → slot[4]=1", () => {
    for (const sym of ["perpendicularity", "parallelism", "angularity"]) {
      const v = eng.encodeTolerances([{ gdt_symbol: sym }]);
      expect(v[4]).toBe(1);
      expect(v[3]).toBe(0);
      expect(v[5]).toBe(0);
    }
  });

  it("location presence flag: position/concentricity/symmetry/profile → slot[5]=1", () => {
    for (const sym of ["position", "concentricity", "symmetry", "profile_surface", "profile_line"]) {
      const v = eng.encodeTolerances([{ gdt_symbol: sym }]);
      expect(v[5]).toBe(1);
      expect(v[3]).toBe(0);
      expect(v[4]).toBe(0);
    }
  });

  it("case-insensitive GD&T symbol matching: 'POSITION' → location flag set", () => {
    const v = eng.encodeTolerances([{ gdt_symbol: "POSITION" }]);
    expect(v[5]).toBe(1);
  });

  it("unknown GD&T symbol → no category flag set", () => {
    const v = eng.encodeTolerances([{ gdt_symbol: "weirdness" }]);
    expect(v[3]).toBe(0);
    expect(v[4]).toBe(0);
    expect(v[5]).toBe(0);
  });

  it("invalid tolerance (NaN / Infinity / negative) excluded from min+mean", () => {
    const v = eng.encodeTolerances([
      { tolerance_mm: Number.NaN },
      { tolerance_mm: -1 },
      { tolerance_mm: Number.POSITIVE_INFINITY },
      { tolerance_mm: 0.02 }, // only valid one
    ]);
    const expected = Math.log1p(0.02) / Math.log1p(10);
    expect(v[0]).toBeCloseTo(expected, 6);
    expect(v[1]).toBeCloseTo(expected, 6);
  });

  it("all-invalid tolerances → numeric slots stay zero; count still reflects array length", () => {
    const v = eng.encodeTolerances([
      { tolerance_mm: Number.NaN },
      { tolerance_mm: -1 },
    ]);
    expect(v[0]).toBe(0);
    expect(v[1]).toBe(0);
    expect(v[2]).toBeGreaterThan(0); // 2 callouts log-normed
  });

  it("mixed category callouts → multiple flags set simultaneously", () => {
    const v = eng.encodeTolerances([
      { tolerance_mm: 0.02, gdt_symbol: "flatness" },
      { tolerance_mm: 0.05, gdt_symbol: "position" },
      { tolerance_mm: 0.03, gdt_symbol: "perpendicularity" },
    ]);
    expect(v[3]).toBe(1); // form
    expect(v[4]).toBe(1); // orientation
    expect(v[5]).toBe(1); // location
  });

  it("R12 fail-loud: non-array callouts throws TypeError", () => {
    expect(() => eng.encodeTolerances(null as never)).toThrow(TypeError);
    expect(() => eng.encodeTolerances("nope" as never)).toThrow(TypeError);
  });

  it("augmentUnifiedFeature concatenates 33-d unified + 6-d tolerance = 39-d", () => {
    const unified = new Array(33).fill(0.5);
    const callouts = [{ tolerance_mm: 0.01, gdt_symbol: "position" }];
    const augmented = eng.augmentUnifiedFeature(unified, callouts);
    expect(augmented).toHaveLength(39);
    // First 33 dims = unified verbatim
    for (let i = 0; i < 33; i++) expect(augmented[i]).toBe(0.5);
    // Tail 6 dims = tolerance signal
    expect(augmented[33]).toBeGreaterThan(0); // tightest tol
    expect(augmented[38]).toBe(1); // location flag (position)
  });

  it("augmentUnifiedFeature R12: non-array unifiedFeature throws TypeError", () => {
    expect(() => eng.augmentUnifiedFeature(null as never, [])).toThrow(TypeError);
  });

  it("getStats tracks totalEncodings + totalEmptySignals + totalCallouts", () => {
    eng.encodeTolerances([{ tolerance_mm: 0.01 }, { tolerance_mm: 0.02 }]);
    eng.encodeTolerances([]);
    eng.encodeTolerances([{ gdt_symbol: "flatness" }]);
    const s = eng.getStats();
    expect(s.totalEncodings).toBe(3);
    expect(s.totalEmptySignals).toBe(1);
    expect(s.totalCallouts).toBe(3); // 2 + 0 + 1
  });
});
