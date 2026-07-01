/**
 * MillProgramAnalyzerEngine tests — restoration coverage (U-STUB-HUNT-04).
 *
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect } from "vitest";
import { MillProgramAnalyzerEngine, millProgramAnalyzerEngine } from "../engines/MillProgramAnalyzerEngine.js";

const PROG = `(Sample program)
T1 M06
G00 X0 Y0 Z5
M08
S3000 M03
G01 X10 Y10 F500
G01 X20 F250
G00 Z25
M09
M30`;

describe("MillProgramAnalyzerEngine.analyze", () => {
  it("counts blocks (non-empty non-comment lines)", () => {
    const r = millProgramAnalyzerEngine.analyze(PROG);
    expect(r.lineCount).toBe(10);
    expect(r.blockCount).toBe(9);   // header is comment, stripped
  });

  it("tallies G-codes (zero-padded), M-codes, tool changes, coolant", () => {
    const r = millProgramAnalyzerEngine.analyze(PROG);
    expect(r.gCodeUsage["G00"]).toBe(2);
    expect(r.gCodeUsage["G01"]).toBe(2);
    expect(r.mCodeUsage["M06"]).toBe(1);
    expect(r.mCodeUsage["M08"]).toBe(1);
    expect(r.mCodeUsage["M09"]).toBe(1);
    expect(r.toolChanges).toBe(1);
    expect(r.coolantStates.on).toBe(1);
    expect(r.coolantStates.off).toBe(1);
  });

  it("extracts feed and spindle ranges", () => {
    const r = millProgramAnalyzerEngine.analyze(PROG);
    expect(r.feedRange.min).toBe(250);
    expect(r.feedRange.max).toBe(500);
    expect(r.spindleRange.min).toBe(3000);
    expect(r.spindleRange.max).toBe(3000);
  });

  it("flags missing-coolant when tool changes exist", () => {
    const prog = "T1 M06\nG00 X0 Y0\nF100 S1000";
    const r = millProgramAnalyzerEngine.analyze(prog);
    expect(r.warnings.some((w) => /coolant/.test(w))).toBe(true);
  });

  it("flags empty/comment-only program", () => {
    const r = millProgramAnalyzerEngine.analyze("(comment only)");
    expect(r.warnings.some((w) => /no G-codes/.test(w))).toBe(true);
  });

  it("rejects non-string input fail-loud (R12)", () => {
    expect(() => millProgramAnalyzerEngine.analyze(123 as unknown as string)).toThrow(/string/);
  });
});

describe("MillProgramAnalyzerEngine.validate", () => {
  it("returns ok=true with no errors", () => {
    const r = millProgramAnalyzerEngine.validate(PROG);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    // shape parity with analyze()
    expect(r.blockCount).toBe(9);
  });
});

describe("MillProgramAnalyzerEngine.validateSetup", () => {
  it("passes shop_floor when machine has headroom", () => {
    const r = millProgramAnalyzerEngine.validateSetup({
      iso_group: "P",
      tool: { diameter_mm: 16, flutes: 4, substrate: "carbide" },
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      machine: { max_power_kw: 50 },
    });
    expect(r.ok).toBe(true);
    expect(r.power.pass).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it("fails when machine power exceeded", () => {
    const r = millProgramAnalyzerEngine.validateSetup({
      iso_group: "S",
      tool: { diameter_mm: 16, flutes: 4, substrate: "carbide" },
      parameters: { rpm: 6000, feed_per_tooth: 0.15, doc_mm: 8, woc_mm: 16 },
      machine: { max_power_kw: 1.0 },
    });
    expect(r.ok).toBe(false);
    expect(r.power.pass).toBe(false);
    expect(r.violations.some((v) => /power/.test(v))).toBe(true);
  });
});

describe("MillProgramAnalyzerEngine.analyzeSPC", () => {
  it("computes mean and sigma of identical samples", () => {
    const r = millProgramAnalyzerEngine.analyzeSPC({ measurements: [5, 5, 5, 5] });
    expect(r.n).toBe(4);
    expect(r.mean).toBe(5);
    expect(r.sigma).toBe(0);
    expect(r.range).toBe(0);
  });

  it("computes Cp + Cpk against spec limits", () => {
    const r = millProgramAnalyzerEngine.analyzeSPC({
      measurements: [10, 10.1, 9.9, 10.05, 9.95],
      USL: 10.5,
      LSL: 9.5,
    });
    expect(r.n).toBe(5);
    expect(r.mean).toBeCloseTo(10, 2);
    expect(r.sigma).toBeGreaterThan(0);
    expect(r.Cp).not.toBeNull();
    expect(r.Cpk).not.toBeNull();
    expect(r.Cp!).toBeGreaterThan(0);
    expect(r.withinSpec).toBe(true);
  });

  it("flags out-of-spec when any measurement breaches USL", () => {
    const r = millProgramAnalyzerEngine.analyzeSPC({
      measurements: [10, 10.1, 11.0],
      USL: 10.5,
      LSL: 9.5,
    });
    expect(r.withinSpec).toBe(false);
  });

  it("empty measurements returns n=0 + nulls", () => {
    const r = millProgramAnalyzerEngine.analyzeSPC({ measurements: [] });
    expect(r.n).toBe(0);
    expect(r.Cp).toBeNull();
    expect(r.withinSpec).toBeNull();
  });

  it("filters non-finite values from measurements", () => {
    const r = millProgramAnalyzerEngine.analyzeSPC({ measurements: [1, NaN, 2, Infinity, 3] });
    expect(r.n).toBe(3);
    expect(r.mean).toBe(2);
  });

  it("rejects non-array measurements fail-loud", () => {
    expect(() => millProgramAnalyzerEngine.analyzeSPC({ measurements: null as unknown as number[] })).toThrow(/array/);
  });
});

describe("class identity", () => {
  it("fresh instance produces same analyze() result as singleton", () => {
    const eng = new MillProgramAnalyzerEngine();
    const a = eng.analyze(PROG);
    const b = millProgramAnalyzerEngine.analyze(PROG);
    expect(a.blockCount).toBe(b.blockCount);
    expect(a.toolChanges).toBe(b.toolChanges);
    expect(a.feedRange.min).toBe(b.feedRange.min);
  });
});
