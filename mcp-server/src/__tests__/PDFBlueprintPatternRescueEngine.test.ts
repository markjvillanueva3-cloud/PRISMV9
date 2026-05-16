/**
 * PDFBlueprintPatternRescueEngine — tests for the BLUEPRINT-OCR-TRAINING-MS1
 * / U2 rescue (4 pattern groups: fractional dims, limit-pair dims, ISO 1302
 * N-grade Ra, standalone microinch).
 *
 * Every assertion pins a concrete numeric or string outcome. The engine is a
 * pure-transform: input -> deterministic output -> tests pin output exactly.
 */
import { describe, it, expect } from "vitest";
import {
  pdfBlueprintPatternRescueEngine,
  PDFBlueprintPatternRescueEngine,
  type RescuedExtractionResult,
} from "../engines/PDFBlueprintPatternRescueEngine.js";

// Helper: assert the rescue counts match exactly (closes the under/over-extract gap).
function expectCounts(r: RescuedExtractionResult, expected: {
  fractional: number;
  limit_pair: number;
  n_grade: number;
  standalone_microinch: number;
}): void {
  expect(r.rescue_counts).toEqual(expected);
}

describe("PDFBlueprintPatternRescueEngine — empty + adversarial inputs", () => {
  it("empty string returns 0/0/0/0 counts + empty arrays", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "" });
    expect(r.dimensions).toEqual([]);
    expect(r.surface_finishes).toEqual([]);
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 0, standalone_microinch: 0 });
  });

  it("non-string input is coerced to empty (runtime guard at boundary)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: 12345 as unknown as string });
    expect(r.dimensions).toEqual([]);
    expect(r.surface_finishes).toEqual([]);
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 0, standalone_microinch: 0 });
  });

  it("missing input.text_content returns empty (no throw)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({} as { text_content: string });
    expect(r.dimensions).toEqual([]);
    expect(r.surface_finishes).toEqual([]);
  });

  it("pure-whitespace input returns 0/0/0/0", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "   \n\t  \n  " });
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 0, standalone_microinch: 0 });
  });

  it("null and undefined inputs are caught (defense-in-depth, never throw)", () => {
    const r1 = pdfBlueprintPatternRescueEngine.extract({ text_content: null as unknown as string });
    const r2 = pdfBlueprintPatternRescueEngine.extract({ text_content: undefined as unknown as string });
    expect(r1.dimensions).toEqual([]);
    expect(r2.dimensions).toEqual([]);
  });
});

describe("PDFBlueprintPatternRescueEngine — fractional dimensions (US inch)", () => {
  it("`1/2` -> nominal 0.5 inch, type linear, zero tolerances", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BORE 1/2 DIA" });
    expectCounts(r, { fractional: 1, limit_pair: 0, n_grade: 0, standalone_microinch: 0 });
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.type).toBe("linear");
    expect(d.nominal).toBeCloseTo(0.5, 6);
    expect(d.unit).toBe("inch");
    expect(d.tolerance_plus).toBe(0);
    expect(d.tolerance_minus).toBe(0);
  });

  it("`3/8` -> 0.375 inch", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "WIDTH 3/8" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(0.375, 6);
    expect(r.dimensions[0].unit).toBe("inch");
  });

  it("mixed `1-1/2\"` -> 1.5 inch (whole + frac, inch mark)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "LENGTH 1-1/2\"" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(1.5, 6);
    expect(r.dimensions[0].unit).toBe("inch");
  });

  it("mixed-with-space `2 3/4` -> 2.75 inch", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BAR 2 3/4 LG" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(2.75, 6);
  });

  it("denominator 64 (`1/64`) accepted (last entry in whitelist)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "MIN GAP 1/64" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(0.015625, 6);
  });

  it("denominator 128 REJECTED (not in whitelist)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "TIGHT 1/128" });
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 0, standalone_microinch: 0 });
    expect(r.dimensions).toEqual([]);
  });

  it("denominator 3 (non-power-of-2) REJECTED", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "ratio 1/3 oversize" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("date `1/4/2026` REJECTED (slash chain)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Date 1/4/2026 issued" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("thread spec `1/4-20 UNC` REJECTED", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "TAP 1/4-20 UNC" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("thread spec `3/8-16 UNF` REJECTED", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BOLT 3/8-16 UNF" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("ratio `1/4:2` REJECTED (followed by colon-digit)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "ratio 1/4:2 spec" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("`Page 1/4` REJECTED (PAGE prefix tight-window veto)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Page 1/4" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("`SHEET 1/2 of 3` REJECTED (SHEET prefix tight-window veto)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "SHEET 1/2 of 3" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("zero-numerator `0/4` REJECTED (degenerate)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "test 0/4 reading" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("improper fraction `5/4` REJECTED (num >= den)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Note 5/4 of total" });
    expect(r.rescue_counts.fractional).toBe(0);
  });

  it("three fractions in one text — all 3 captured, values match", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "BORE 1/2 DIA, GROOVE WIDTH 3/8, FILLET 1/16",
    });
    expect(r.rescue_counts.fractional).toBe(3);
    const values = r.dimensions.map(d => d.nominal).sort((a, b) => a - b);
    expect(values).toEqual([1 / 16, 3 / 8, 1 / 2]);
  });

  it("fractional unit is ALWAYS inch (US convention — no mm fractions)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "RAD 1/8" });
    expect(r.dimensions.every(d => d.unit === "inch")).toBe(true);
  });
});

describe("PDFBlueprintPatternRescueEngine — limit-pair dimensions (US bilateral)", () => {
  it("`1.000/1.002` -> nominal 1.001, +0.001/-0.001", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "DIA 1.000/1.002" });
    expectCounts(r, { fractional: 0, limit_pair: 1, n_grade: 0, standalone_microinch: 0 });
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    expect(d.type).toBe("linear");
    expect(d.nominal).toBeCloseTo(1.001, 6);
    expect(d.tolerance_plus).toBeCloseTo(0.001, 6);
    expect(d.tolerance_minus).toBeCloseTo(-0.001, 6);
    expect(d.unit).toBe("mm");
  });

  it("swapped order `1.002/1.000` auto-oriented to same result", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "LIMIT 1.002/1.000" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(1.001, 6);
    expect(r.dimensions[0].tolerance_plus).toBeCloseTo(0.001, 6);
    expect(r.dimensions[0].tolerance_minus).toBeCloseTo(-0.001, 6);
  });

  it("`0.250/0.260` -> nominal 0.255, +0.005/-0.005", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "SHAFT 0.250/0.260" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].nominal).toBeCloseTo(0.255, 6);
    expect(r.dimensions[0].tolerance_plus).toBeCloseTo(0.005, 6);
  });

  it("sub-0.1 pair `0.005/0.010` REJECTED (tolerance pair, not limits)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "tol 0.005/0.010 band" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("wide band `1.0/3.0` REJECTED (band/mean > 0.5)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "range 1.0/3.0 unclear" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("metric thread `M10x1.0/1.25` REJECTED (M-prefix context)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "THREAD M10x1.0/1.25" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("chamfer `1.0/1.25 x 45deg` REJECTED (x-suffix context)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "CHAM 1.0/1.25 x 45deg" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("degenerate `1.000/1.000` REJECTED (zero band)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "tight 1.000/1.000 nom" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("limit-pair unit defaults to mm (caller may override via dispatcher)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BORE 12.000/12.025" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].unit).toBe("mm");
  });

  it("plain fraction `1/2` does NOT cross-fire as limit (both must be decimal)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "RAD 1/2" });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("two limit pairs in one blueprint — both captured", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "DIA 1.000/1.002 LEN 25.00/25.10",
    });
    expect(r.rescue_counts.limit_pair).toBe(2);
    const nominals = r.dimensions.map(d => d.nominal).sort((a, b) => a - b);
    expect(nominals[0]).toBeCloseTo(1.001, 6);
    expect(nominals[1]).toBeCloseTo(25.05, 6);
  });
});

describe("PDFBlueprintPatternRescueEngine — ISO 1302 N-grade surface finish", () => {
  it("N6 with SURFACE FINISH context -> Ra 0.8 µm", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "SURFACE FINISH N6" });
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 1, standalone_microinch: 0 });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(0.8);
    expect(r.surface_finishes[0].unit).toBe("um");
    expect(r.surface_finishes[0].location).toBe("N-grade=N6");
  });

  it("N4 with FINISH context -> Ra 0.2 µm", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "FINISH = N4" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(0.2);
  });

  it("N12 (worst grade) -> Ra 50 µm", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "ROUGHNESS N12" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(50);
  });

  it("N1 (best grade, ISO 1302 context) -> Ra 0.025 µm", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "MIRROR FINISH N1 (ISO 1302)" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(0.025);
  });

  it("N4 WITHOUT surface-finish context REJECTED (could be NEMA, PN, etc.)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "PART-N4 / NEMA-N4 enclosure" });
    expect(r.rescue_counts.n_grade).toBe(0);
    expect(r.surface_finishes).toEqual([]);
  });

  it("N13 (out of range 1..12) REJECTED", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "FINISH N13 here" });
    expect(r.rescue_counts.n_grade).toBe(0);
  });

  it("N0 REJECTED (regex demands [1-9]|1[0-2])", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "FINISH N0 nope" });
    expect(r.rescue_counts.n_grade).toBe(0);
  });

  it("three N-grades in one text — all captured with correct Ra mapping", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "Surface finish: N6 typ, except N7 on bore, N4 on seal face",
    });
    expect(r.rescue_counts.n_grade).toBe(3);
    const ras = r.surface_finishes.map(f => f.ra).sort((a, b) => a - b);
    expect(ras).toEqual([0.2, 0.8, 1.6]);
  });

  it("ISO 1302 mapping is correct for N6 (matches ISO 1302:2002 Annex F)", () => {
    // ISO 1302 specifies N6 = Ra 0.8 µm; this is a contract pin (do NOT change).
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "FINISH N6" });
    expect(r.surface_finishes[0].ra).toBe(0.8);
  });
});

describe("PDFBlueprintPatternRescueEngine — standalone microinch (no Ra prefix)", () => {
  it("`32 µin` -> Ra 32 uin (no Ra prefix needed)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "32 µin typ" });
    expectCounts(r, { fractional: 0, limit_pair: 0, n_grade: 0, standalone_microinch: 1 });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(32);
    expect(r.surface_finishes[0].unit).toBe("uin");
  });

  it("`125 microinch` (word form) -> Ra 125 uin", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Surface roughness 125 microinch max" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(125);
  });

  it("`Ra 32 µin` SKIPPED here (sister engine owns Ra-prefix form — avoids double-count)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Ra 32 µin" });
    expect(r.rescue_counts.standalone_microinch).toBe(0);
    expect(r.surface_finishes).toEqual([]);
  });

  it("decimal `2.5 µin` (mirror polish) captured", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Mirror polish 2.5 µin" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBeCloseTo(2.5, 6);
    expect(r.surface_finishes[0].unit).toBe("uin");
  });

  it("`0 µin` REJECTED (Ra <= 0 is degenerate)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "limit 0 µin should fail" });
    expect(r.rescue_counts.standalone_microinch).toBe(0);
  });

  it("alternative unicode `μin` (U+03BC GREEK SMALL LETTER MU) captured", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Spec 63 μin" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(63);
    expect(r.surface_finishes[0].unit).toBe("uin");
  });

  it("ASCII fallback `uin` captured (when µ unicode is lost in OCR)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "RMS 8 uin" });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(8);
  });
});

describe("PDFBlueprintPatternRescueEngine — integration + safety", () => {
  it("singleton is state-free across calls (no shared mutable state)", () => {
    const r1 = pdfBlueprintPatternRescueEngine.extract({ text_content: "BORE 1/2 DIA" });
    const r2 = pdfBlueprintPatternRescueEngine.extract({ text_content: "" });
    expect(r1.rescue_counts.fractional).toBe(1);
    expect(r2.rescue_counts.fractional).toBe(0);
    expect(r1.dimensions[0].nominal).toBeCloseTo(0.5, 6);
  });

  it("fresh class instance produces same result as singleton (deterministic)", () => {
    const fresh = new PDFBlueprintPatternRescueEngine();
    const a = fresh.extract({ text_content: "DIA 1.000/1.002" });
    const b = pdfBlueprintPatternRescueEngine.extract({ text_content: "DIA 1.000/1.002" });
    expect(a.dimensions[0].nominal).toBeCloseTo(b.dimensions[0].nominal, 6);
    expect(a.dimensions[0].tolerance_plus).toBeCloseTo(b.dimensions[0].tolerance_plus, 6);
    expect(a.rescue_counts).toEqual(b.rescue_counts);
  });

  it("comprehensive blueprint — all 4 pattern groups captured in one pass", () => {
    const blueprint = `
PART NUMBER: 2475-037
DIMENSIONS:
BORE 1/2 DIA
SHAFT 1.000/1.002
SURFACE FINISH N6
ROUGHNESS 32 µin max
    `;
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: blueprint });
    expect(r.rescue_counts.fractional).toBe(1);
    expect(r.rescue_counts.limit_pair).toBe(1);
    expect(r.rescue_counts.n_grade).toBe(1);
    expect(r.rescue_counts.standalone_microinch).toBe(1);
    // Total: 2 dims (frac+limit) + 2 finishes (n_grade+uin)
    expect(r.dimensions).toHaveLength(2);
    expect(r.surface_finishes).toHaveLength(2);
  });

  it("adversarial 5000-rep input — output bounded at RESCUE_MAX_DIMS=1000", () => {
    const big = "BORE 1/2 DIA ".repeat(5000);
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: big });
    expect(r.dimensions.length).toBeLessThanOrEqual(1000);
    expect(r.dimensions.length).toBeGreaterThan(0);
    // Every captured value is 0.5 (the same fraction repeated)
    expect(r.dimensions.every(d => Math.abs(d.nominal - 0.5) < 1e-6)).toBe(true);
  });

  it("rescue_counts keys are stable across all return paths", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "nothing matches" });
    expect(Object.keys(r.rescue_counts).sort()).toEqual([
      "fractional",
      "limit_pair",
      "n_grade",
      "standalone_microinch",
    ]);
  });

  it("output is shape-compatible with sister engine ExtractedDimension type", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "1.000/1.002" });
    expect(r.dimensions).toHaveLength(1);
    const d = r.dimensions[0];
    // Pin every field of ExtractedDimension to prove shape-compat
    expect(typeof d.type).toBe("string");
    expect(typeof d.nominal).toBe("number");
    expect(typeof d.tolerance_plus).toBe("number");
    expect(typeof d.tolerance_minus).toBe("number");
    expect(typeof d.unit).toBe("string");
    expect(typeof d.raw_text).toBe("string");
    // Field-level structure (regression pin for shape-compat with sister)
    expect(d).toEqual(expect.objectContaining({
      type: "linear",
      unit: "mm",
    }));
  });

  it("output is shape-compatible with sister engine SurfaceFinish type", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "FINISH N4" });
    expect(r.surface_finishes).toHaveLength(1);
    const s = r.surface_finishes[0];
    expect(typeof s.ra).toBe("number");
    expect(s.unit === "um" || s.unit === "uin").toBe(true);
    expect(s.ra).toBe(0.2);
    expect(s.unit).toBe("um");
    expect(s.location).toBe("N-grade=N4");
  });

  it("REGRESSION P0-2: fractional raw_text equals trimmed match (no slice-math fallback)", () => {
    // Previously the slice arithmetic produced negative offsets, silently masked
    // by a synthesized fallback string. Lookbehind regex now gives m[0]==fraction.
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BORE 3/8 DIA" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].raw_text).toBe("3/8");
  });

  it("REGRESSION P0-2: fractional raw_text for mixed `1-1/2\"` keeps inch mark", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "L 1-1/2\" max" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].raw_text).toBe("1-1/2\"");
  });

  it("REGRESSION P0-1: standalone-microinch regex `\\d+(?:\\.\\d+)?` rejects `3.` ghost-match", () => {
    // Old `\\d+\\.?\\d*` allowed `parseFloat("3.")===3` ghost matches mid-text.
    // New regex demands explicit decimals OR no decimal point at all.
    // `"3."` is not followed by µin → no match; `"3 µin"` IS valid (integer form).
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "Note: 3.something else then 32 µin spec",
    });
    expect(r.surface_finishes).toHaveLength(1);
    expect(r.surface_finishes[0].ra).toBe(32);
  });

  it("REGRESSION P0-1: standalone-microinch ReDoS-bounded on adversarial digit run", () => {
    // 10k-digit input + uin. Old `\\d+\\.?\\d*` had ambiguity; new `\\d+(?:\\.\\d+)?`
    // is unambiguous. Test asserts completion within a generous 3s ceiling that
    // any real ReDoS (exponential) would still blow past, while leaving headroom
    // for slow CI machines + the engine's other 4 regexes that also scan the
    // adversarial input.
    const big = "9".repeat(10000) + " uin";
    const t0 = Date.now();
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: big });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(3000);
    // The 10k nines parse to Infinity → ra is rejected by isFinite check.
    // Either captures nothing (Infinity rejected) or one valid match — never hangs.
    expect(r.surface_finishes.length).toBeLessThanOrEqual(1);
  });

  it("REGRESSION P1-2: standalone-microinch widened Ra-prefix veto catches `Ra = 32 µin`", () => {
    // Old 6-char back-window missed `Ra = ` (8 chars including value start).
    // New 10-char window catches it → rescue does NOT double-count.
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Ra = 32 µin typ" });
    expect(r.rescue_counts.standalone_microinch).toBe(0);
  });

  it("REGRESSION P1-2: standalone-microinch widened veto catches `Ra: 32 µin`", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "Ra: 32 µin" });
    expect(r.rescue_counts.standalone_microinch).toBe(0);
  });

  it("REGRESSION P1-3: limit-pair M-prefix wider window catches `M10 X 1.0/1.25`", () => {
    // Old 8-char window missed spaced metric thread context. New 16-char rejects.
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "METRIC THREAD M10 X 1.0/1.25 PITCH",
    });
    expect(r.rescue_counts.limit_pair).toBe(0);
  });

  it("REGRESSION P1-4: limit-pair honors default_unit='inch' (US blueprint)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({
      text_content: "DIA 0.250/0.260",
      default_unit: "inch",
    });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].unit).toBe("inch");
  });

  it("REGRESSION P1-4: limit-pair defaults to mm when default_unit omitted (backward compat)", () => {
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "BORE 12.000/12.025" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].unit).toBe("mm");
  });

  it("REGRESSION P1-1: lookbehind avoids consuming leading char (raw_text stable)", () => {
    // Old `(?:^|[^#\\d\\/.\\-A-Za-z])` consumed 1 char → m.index off-by-one.
    // Lookbehind preserves m.index alignment for downstream slice operations.
    const r = pdfBlueprintPatternRescueEngine.extract({ text_content: "(1/4)" });
    expect(r.dimensions).toHaveLength(1);
    expect(r.dimensions[0].raw_text).toBe("1/4");
  });

  it("ISO 1302 full grade table — every N1..N12 maps to correct Ra (regression pin)", () => {
    const grades = [
      { n: 1, ra: 0.025 },
      { n: 2, ra: 0.05 },
      { n: 3, ra: 0.1 },
      { n: 4, ra: 0.2 },
      { n: 5, ra: 0.4 },
      { n: 6, ra: 0.8 },
      { n: 7, ra: 1.6 },
      { n: 8, ra: 3.2 },
      { n: 9, ra: 6.3 },
      { n: 10, ra: 12.5 },
      { n: 11, ra: 25 },
      { n: 12, ra: 50 },
    ];
    for (const { n, ra } of grades) {
      const r = pdfBlueprintPatternRescueEngine.extract({ text_content: `SURFACE FINISH N${n}` });
      expect(r.surface_finishes).toHaveLength(1);
      expect(r.surface_finishes[0].ra).toBe(ra);
      expect(r.surface_finishes[0].location).toBe(`N-grade=N${n}`);
    }
  });
});
