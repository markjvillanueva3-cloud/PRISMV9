/**
 * ISO 2768 general-tolerance tests (JULIETT-DB-COVERAGE-MS0).
 *
 * Verifies the canonical ISO 2768-1:1989 (linear, external radius/chamfer,
 * angular) and ISO 2768-2:1989 (straightness/flatness, perpendicularity,
 * symmetry, circular run-out) tables consolidated into ToleranceEngine.
 *
 * Reference values are taken directly from the published standards — a failing
 * assertion here means a wrong inspection/quoting tolerance reached a consumer.
 */
import { describe, it, expect } from "vitest";
import {
  generalToleranceLinear,
  generalToleranceRadiusChamfer,
  generalToleranceAngular,
  generalToleranceGeometric,
  ISO2768_LINEAR,
} from "../engines/ToleranceEngine.js";

describe("ISO 2768-1 linear general tolerances", () => {
  // Spanning size bands × spanning classes (variability floor).
  it.each([
    [1, "f", 0.05],   //  >0.5–3   f
    [1, "m", 0.10],   //  >0.5–3   m
    [1, "c", 0.20],   //  >0.5–3   c
    [4, "v", 0.50],   //  >3–6     v
    [30, "m", 0.20],  //  >6–30    m (boundary inclusive)
    [100, "c", 0.80], //  >30–120  c
    [200, "f", 0.20], //  >120–400 f
    [450, "c", 2.00], //  >400–1000 c
    [1500, "v", 6.00],//  >1000–2000 v
    [3000, "m", 2.00],//  >2000–4000 m
  ] as const)("linear(%dmm, %s) = ±%fmm", (nominal, cls, expected) => {
    expect(generalToleranceLinear(nominal, cls).plusMinus_mm).toBe(expected);
  });

  it("rejects dimensions below 0.5 mm (no general tolerance per ISO 2768-1)", () => {
    expect(() => generalToleranceLinear(0.3, "m")).toThrow(/below 0.5mm/);
  });

  it("rejects the very-coarse class for the ≤3 mm band (blank in the standard)", () => {
    expect(() => generalToleranceLinear(2, "v")).toThrow(/not tabulated/);
  });

  it("rejects the fine class for the >2000 mm band (blank in the standard)", () => {
    expect(() => generalToleranceLinear(3000, "f")).toThrow(/not tabulated/);
  });

  it("rejects dimensions above the tabulated 4000 mm", () => {
    expect(() => generalToleranceLinear(5000, "m")).toThrow(/exceeds tabulated 4000mm/);
  });

  it.each([NaN, Infinity, -5, 0] as const)("rejects non-physical input %p", (bad) => {
    expect(() => generalToleranceLinear(bad as number, "m")).toThrow();
  });

  it("rejects an unknown tolerance class", () => {
    // @ts-expect-error — exercising a runtime-invalid class
    expect(() => generalToleranceLinear(30, "x")).toThrow(/invalid class/);
  });

  it("exposes a size-band label and standard citation", () => {
    const r = generalToleranceLinear(30, "m");
    expect(r.size_range).toBe(">6–30 mm");
    expect(r.standard).toContain("ISO 2768-1:1989");
  });

  it("canonical table omits the sub-0.5 mm band and blanks v≤3 / f>2000", () => {
    expect(ISO2768_LINEAR[0].up_to).toBe(3);
    expect(ISO2768_LINEAR[0].v).toBeNull();
    expect(ISO2768_LINEAR[ISO2768_LINEAR.length - 1].f).toBeNull();
  });
});

describe("ISO 2768-1 external radius & chamfer general tolerances", () => {
  it.each([
    [2, "m", 0.2],   //  0.5–3 f&m
    [2, "c", 0.2],   //  0.5–3 c&v (NOT 0.4 — common error)
    [5, "m", 0.5],   //  >3–6 f&m
    [5, "v", 1.0],   //  >3–6 c&v
    [50, "f", 1.0],  //  >6 f&m (flat — no fabricated 2.0 band)
    [50, "v", 2.0],  //  >6 c&v
  ] as const)("radiusChamfer(%dmm, %s) = ±%fmm", (nominal, cls, expected) => {
    expect(generalToleranceRadiusChamfer(nominal, cls).plusMinus_mm).toBe(expected);
  });

  it("rejects radius/chamfer below 0.5 mm", () => {
    expect(() => generalToleranceRadiusChamfer(0.3, "m")).toThrow(/below 0.5mm/);
  });
});

describe("ISO 2768-1 angular general tolerances", () => {
  it.each([
    [8, "m", 1.0, "1°00′"],         //  ≤10   f&m
    [8, "c", 1.5, "1°30′"],         //  ≤10   c
    [8, "v", 3.0, "3°00′"],         //  ≤10   v
    [30, "m", 0.5, "0°30′"],        //  >10–50 f&m
    [100, "f", 1 / 3, "0°20′"],     //  >50–120 f&m
    [300, "c", 0.25, "0°15′"],      //  >120–400 c
    [500, "c", 1 / 6, "0°10′"],     //  >400 c
    [500, "v", 1 / 3, "0°20′"],     //  >400 v
  ] as const)("angular(%dmm, %s) ≈ ±%f° (%s)", (side, cls, expDeg, expDms) => {
    const r = generalToleranceAngular(side, cls);
    expect(r.plusMinus_deg).toBeCloseTo(expDeg, 4);
    expect(r.plusMinus_dms).toBe(expDms);
  });

  it("rejects non-physical shorter-side length", () => {
    expect(() => generalToleranceAngular(NaN, "m")).toThrow();
    expect(() => generalToleranceAngular(-1, "m")).toThrow();
  });
});

describe("ISO 2768-2 geometrical general tolerances", () => {
  it.each([
    [5, "H", "straightness", 0.02],
    [50, "K", "flatness", 0.2],
    [50, "H", "straightness", 0.1],
    [2000, "L", "flatness", 1.6],
    [50, "H", "perpendicularity", 0.2],
    [200, "L", "perpendicularity", 1.0],
    [500, "H", "symmetry", 0.5],    //  H symmetry is a flat 0.5
    [2000, "L", "symmetry", 2.0],
    [999, "K", "circular_runout", 0.2], //  size-independent
    [1, "L", "circular_runout", 0.5],
  ] as const)("geometric(%dmm, %s, %s) = %fmm", (nominal, cls, type, expected) => {
    expect(generalToleranceGeometric(nominal, cls, type).tolerance_mm).toBe(expected);
  });

  it("circular run-out is size-independent (H=0.1, K=0.2, L=0.5)", () => {
    expect(generalToleranceGeometric(10, "H", "circular_runout").tolerance_mm).toBe(0.1);
    expect(generalToleranceGeometric(2999, "H", "circular_runout").tolerance_mm).toBe(0.1);
  });

  it("rejects sizes above the tabulated 3000 mm for non-runout characteristics", () => {
    expect(() => generalToleranceGeometric(5000, "H", "flatness")).toThrow(/exceeds tabulated 3000mm/);
  });

  it("rejects an unknown geometric class", () => {
    // @ts-expect-error — runtime-invalid class
    expect(() => generalToleranceGeometric(50, "Z", "flatness")).toThrow(/invalid class/);
  });

  it("rejects an unknown geometric type", () => {
    // @ts-expect-error — runtime-invalid type
    expect(() => generalToleranceGeometric(50, "H", "roundness")).toThrow(/invalid geometric type/);
  });

  it("rejects non-physical input", () => {
    expect(() => generalToleranceGeometric(0, "H", "flatness")).toThrow();
    expect(() => generalToleranceGeometric(Infinity, "H", "flatness")).toThrow();
  });
});
