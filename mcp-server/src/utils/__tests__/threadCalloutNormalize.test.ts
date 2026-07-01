/**
 * Tests for the TS thread-callout normalizer (U-XRAY-THREAD-NORMALIZE-TS) -- a cross-boundary CLONE of
 * the canonical `normalizeThreadCallout` in scripts/lib/ollama-vision-extract-lib.mjs. Reference values
 * are pinned IDENTICAL on both sides (ASME B1.1 screw majors, ISO 261 coarse pitch) so the clones cannot
 * silently diverge.
 */
import { describe, it, expect } from "vitest";
import { normalizeThreadCallout, resolveThread } from "../threadCalloutNormalize.js";

describe("normalizeThreadCallout", () => {
  it("Unified inch -- fraction / decimal / screw size + series + class", () => {
    expect(normalizeThreadCallout("1/4-20 UNC-2B")).toMatchObject({
      system: "unified", series: "UNC", major_dia_in: 0.25, tpi: 20, class: "2B", resolved: true, assumed: false,
    });
    expect(normalizeThreadCallout(".250-20 UNC")).toMatchObject({ major_dia_in: 0.25, tpi: 20 });
    // screw #10 = .190 major (ASME B1.1)
    expect(normalizeThreadCallout("#10-32 UNF")).toMatchObject({ major_dia_in: 0.19, tpi: 32, series: "UNF" });
    expect(normalizeThreadCallout("1-8 UNC")).toMatchObject({ major_dia_in: 1, tpi: 8 }); // low tpi -> inch
    // series omitted -> resolves but assumed=true, series "UN"
    expect(normalizeThreadCallout("3/8-16")).toMatchObject({ major_dia_in: 0.375, tpi: 16, series: "UN", assumed: true, resolved: true });
  });

  it("#-less screw size disambiguated from inch major by tpi (live: '10-24 UNC' = #10)", () => {
    expect(normalizeThreadCallout("10-24 UNC")).toMatchObject({ major_dia_in: 0.19, tpi: 24, series: "UNC" });
    expect(normalizeThreadCallout("6-32 UNC")).toMatchObject({ major_dia_in: 0.138, tpi: 32 }); // #6
    expect(normalizeThreadCallout("12-28 UNF")).toMatchObject({ major_dia_in: 0.216, tpi: 28 }); // #12
  });

  it("metric -- explicit pitch wins, bare M6 fills ISO-261 coarse (assumed)", () => {
    const m = normalizeThreadCallout("M6x1.0");
    expect(m).toMatchObject({ system: "metric", series: "M", pitch_mm: 1.0, assumed: false, resolved: true });
    expect(m.major_dia_in).toBeCloseTo(6 / 25.4, 4); // 0.2362in
    expect(normalizeThreadCallout("M6")).toMatchObject({ pitch_mm: 1.0, assumed: true, resolved: true });
    expect(normalizeThreadCallout("M10X1.5-6H")).toMatchObject({ pitch_mm: 1.5, class: "6H", system: "metric" });
  });

  it("NPT pipe -- nominal size is NOT the major dia (honest null)", () => {
    expect(normalizeThreadCallout("1/4-18 NPT")).toMatchObject({
      system: "npt", series: "NPT", tpi: 18, major_dia_in: null, resolved: true,
    });
    expect(normalizeThreadCallout("1/8 NPTF")).toMatchObject({ series: "NPTF", system: "npt" });
  });

  it("SELF-SAFE: never fabricate a thread (R12) -- range / material grade / implausible major", () => {
    // each returns the fully-unresolved shape (resolved false AND no fabricated values)
    const NONE = { resolved: false, system: null, major_dia_in: null, tpi: null };
    expect(normalizeThreadCallout("1-2")).toMatchObject(NONE); // a range
    expect(normalizeThreadCallout("10-32")).toMatchObject(NONE); // ambiguous (no #/series)
    expect(normalizeThreadCallout("M2 STEEL")).toMatchObject(NONE); // AISI tool steel, not a thread
    expect(normalizeThreadCallout("M2 TOOL STEEL")).toMatchObject(NONE);
    expect(normalizeThreadCallout("M42 HSS")).toMatchObject(NONE);
    expect(normalizeThreadCallout("D2 RC60")).toMatchObject(NONE);
    expect(normalizeThreadCallout("14-20 UNC")).toMatchObject(NONE); // 14in thread does not exist
    expect(normalizeThreadCallout("")).toMatchObject(NONE);
    expect(normalizeThreadCallout(null)).toMatchObject(NONE);
  });

  it("de-garble: a unicode en-dash (U+2013) is normalized so the thread still parses", () => {
    expect(normalizeThreadCallout("1/4" + String.fromCharCode(0x2013) + "20 UNC")).toMatchObject({
      resolved: true, tpi: 20, major_dia_in: 0.25,
    });
  });
});

describe("resolveThread", () => {
  it("resolves a thread-typed or thread-signature dim with the full spec", () => {
    expect(resolveThread("thread", "1/4-20 UNC-2B")).toMatchObject({ major_dia_in: 0.25, tpi: 20, series: "UNC" });
    // a thread signature in raw_text resolves even on a non-thread `type`
    expect(resolveThread("linear", "M6x1.0")).toMatchObject({ pitch_mm: 1.0, system: "metric" });
  });

  it("yields nothing (undefined) for a plain dim or a material grade", () => {
    // nullish-substitution -> a concrete value comparison (a non-thread must produce no spec)
    expect(resolveThread("linear", ".500") ?? "NO-THREAD").toBe("NO-THREAD"); // a plain linear dim
    expect(resolveThread("linear", "M2 STEEL") ?? "NO-THREAD").toBe("NO-THREAD"); // material grade
    expect(resolveThread("thread", "") ?? "NO-THREAD").toBe("NO-THREAD");
    expect(resolveThread("thread", null) ?? "NO-THREAD").toBe("NO-THREAD");
  });
});
