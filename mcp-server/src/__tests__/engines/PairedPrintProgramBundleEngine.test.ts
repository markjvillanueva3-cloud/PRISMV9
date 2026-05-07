/**
 * PairedPrintProgramBundleEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS61
 */
import { describe, it, expect } from "vitest";
import {
  PairedPrintProgramBundleEngine,
  pairedPrintProgramBundleEngine,
  type PrintProgramBundle,
} from "../../engines/PairedPrintProgramBundleEngine.js";

function fresh(): PairedPrintProgramBundleEngine {
  return new PairedPrintProgramBundleEngine();
}

describe("PairedPrintProgramBundleEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(pairedPrintProgramBundleEngine).toBeInstanceOf(
      PairedPrintProgramBundleEngine,
    );
  });

  it("seeds with bundles covering sinker + wire EDM fixtures", () => {
    const e = fresh();
    const ids = e.bundles().map((b) => b.fixture_id);
    expect(ids).toContain("sinker-alcoa-1-4-20-cavity");
    expect(ids).toContain("sinker-optimas-m2-relief");
    expect(ids).toContain("wedm-alcoa-10-32-punch");
  });

  it("bundles() returns deep clones — mutation doesn't leak", () => {
    const e = fresh();
    const snap1 = e.bundles();
    snap1[0].program_signature.line_count_min = 99999;
    snap1[0].annotations?.push("MUTATED");
    const snap2 = e.bundles();
    expect(snap2[0].program_signature.line_count_min).not.toBe(99999);
    expect(snap2[0].annotations ?? []).not.toContain("MUTATED");
  });

  it("getBundle() returns undefined for unknown id", () => {
    const e = fresh();
    expect(e.getBundle("does-not-exist")).toBeUndefined();
  });

  it("registerBundle() adds a new bundle + can be retrieved", () => {
    const e = fresh();
    const before = e.bundles().length;
    const added = e.registerBundle({
      fixture_id: "custom-bundle",
      process: "mill",
      print_summary: "custom",
      program_signature: { line_count_min: 5 },
    });
    expect(added.fixture_id).toBe("custom-bundle");
    expect(e.bundles().length).toBe(before + 1);
    expect(e.getBundle("custom-bundle")?.print_summary).toBe("custom");
  });

  it("registerBundle() throws on duplicate fixture_id", () => {
    const e = fresh();
    const base: PrintProgramBundle = {
      fixture_id: "dup",
      process: "sinker_edm",
      print_summary: "first",
      program_signature: {},
    };
    e.registerBundle(base);
    expect(() => e.registerBundle({ ...base, print_summary: "second" })).toThrow(
      /already registered/,
    );
  });

  it("registerBundle() throws when fixture_id empty", () => {
    const e = fresh();
    expect(() =>
      e.registerBundle({
        fixture_id: "",
        process: "mill",
        print_summary: "no id",
        program_signature: {},
      }),
    ).toThrow(/fixture_id is required/);
  });

  it("unregisterBundle() removes a bundle; returns false on miss", () => {
    const e = fresh();
    const id = e.bundles()[0].fixture_id;
    expect(e.unregisterBundle(id)).toBe(true);
    expect(e.unregisterBundle(id)).toBe(false);
    expect(e.getBundle(id)).toBeUndefined();
  });

  it("validateProgram() throws for unknown fixture_id", () => {
    const e = fresh();
    expect(() => e.validateProgram("no-such-bundle", "G21\nM30")).toThrow(
      /No bundle registered/,
    );
  });

  it("validateProgram() passes when all signature requirements are met", () => {
    const e = fresh();
    // Build a program meeting the sinker-alcoa bundle requirements:
    // line_count 20..400, required ["G21","M30"], forbidden G00 Z0 / M00$, stages≥3, Ra 0.4..1.2
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i} F100`).join("\n");
    const program = `G21\nG17\nG90\n${body}\nM30\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.8 },
    );
    expect(res.passed).toBe(true);
    expect(res.violations).toEqual([]);
    expect(res.actual.matched_codes).toEqual(expect.arrayContaining(["G21", "M30"]));
  });

  it("validateProgram() flags line_count below minimum", () => {
    const e = fresh();
    const program = "G21\nM30"; // Only 2 lines, min is 20
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.8 },
    );
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.includes("line_count") && v.includes("< min"))).toBe(true);
  });

  it("validateProgram() flags missing required_codes", () => {
    const e = fresh();
    // Has G21 but not M30
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    const program = `G21\n${body}\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.8 },
    );
    expect(res.passed).toBe(false);
    expect(res.actual.missing_codes).toContain("M30");
    expect(res.violations.some((v) => v.includes("missing required_code: M30"))).toBe(true);
  });

  it("validateProgram() flags forbidden_patterns", () => {
    const e = fresh();
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    // Injects 'G00 Z0' which is a forbidden pattern (bare rapid to Z0)
    const program = `G21\nG00 Z0\n${body}\nM30\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.8 },
    );
    expect(res.passed).toBe(false);
    expect(res.actual.triggered_forbidden).toContain("G00 Z0");
  });

  it("validateProgram() requires stage_count metric when signature demands it", () => {
    const e = fresh();
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    const program = `G21\n${body}\nM30\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { /* no stage_count */ ra_um: 0.8 },
    );
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.includes("no stage_count"))).toBe(true);
  });

  it("validateProgram() flags stage_count below required", () => {
    const e = fresh();
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    const program = `G21\n${body}\nM30\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 2, ra_um: 0.8 }, // need 3
    );
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.includes("stage_count 2 < required 3"))).toBe(true);
  });

  it("validateProgram() flags Ra outside the band", () => {
    const e = fresh();
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    const program = `G21\n${body}\nM30\n`;

    // Too rough
    const tooRough = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 2.0 }, // max 1.2
    );
    expect(tooRough.passed).toBe(false);
    expect(tooRough.violations.some((v) => v.includes("> ra_max_um"))).toBe(true);

    // Too smooth (below ra_min)
    const tooSmooth = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.1 }, // min 0.4
    );
    expect(tooSmooth.passed).toBe(false);
    expect(tooSmooth.violations.some((v) => v.includes("< ra_min_um"))).toBe(true);
  });

  it("validateProgram() ignores blank lines in line count", () => {
    const e = fresh();
    const body = Array.from({ length: 25 }, (_, i) => `N${i + 1} G01 X${i}`).join("\n");
    // Lots of blank lines sprinkled in — shouldn't inflate count
    const program = `G21\n\n\n${body}\n\n\nM30\n`;
    const res = e.validateProgram(
      "sinker-alcoa-1-4-20-cavity",
      program,
      { stage_count: 3, ra_um: 0.8 },
    );
    expect(res.actual.line_count).toBe(27); // G21 + 25 body + M30
    expect(res.passed).toBe(true);
  });

  it("validateProgram() handles invalid forbidden_pattern regex gracefully", () => {
    const e = fresh();
    e.registerBundle({
      fixture_id: "bad-regex-fixture",
      process: "mill",
      print_summary: "bad regex test",
      program_signature: {
        forbidden_patterns: ["["], // invalid regex
      },
    });
    const res = e.validateProgram("bad-regex-fixture", "G21\nM30\n");
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.includes("invalid forbidden_pattern regex"))).toBe(
      true,
    );
  });

  it("empty signature → any program passes (as long as provided)", () => {
    const e = fresh();
    e.registerBundle({
      fixture_id: "lenient-fixture",
      process: "laser",
      print_summary: "no constraints",
      program_signature: {},
    });
    const res = e.validateProgram("lenient-fixture", "anything goes\n");
    expect(res.passed).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it("validateBatch() returns one result per payload, preserving order", () => {
    const e = fresh();
    e.registerBundle({
      fixture_id: "a",
      process: "mill",
      print_summary: "a",
      program_signature: { required_codes: ["G21"] },
    });
    e.registerBundle({
      fixture_id: "b",
      process: "mill",
      print_summary: "b",
      program_signature: { required_codes: ["M30"] },
    });
    const results = e.validateBatch([
      { fixture_id: "a", program: "G21\n" },
      { fixture_id: "b", program: "G21\n" }, // missing M30
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].fixture_id).toBe("a");
    expect(results[0].passed).toBe(true);
    expect(results[1].fixture_id).toBe("b");
    expect(results[1].passed).toBe(false);
  });

  it("seed constructor rejects duplicate fixture_ids", () => {
    expect(
      () =>
        new PairedPrintProgramBundleEngine([
          {
            fixture_id: "dup",
            process: "mill",
            print_summary: "first",
            program_signature: {},
          },
          {
            fixture_id: "dup",
            process: "mill",
            print_summary: "second",
            program_signature: {},
          },
        ]),
    ).toThrow(/Duplicate bundle fixture_id/);
  });

  it("matched_codes + missing_codes partition required_codes", () => {
    const e = fresh();
    e.registerBundle({
      fixture_id: "partition-test",
      process: "mill",
      print_summary: "partition test",
      program_signature: { required_codes: ["G21", "G17", "G90", "M30"] },
    });
    const res = e.validateProgram("partition-test", "G21\nG17\n"); // only 2 of 4
    expect(res.actual.matched_codes).toEqual(["G21", "G17"]);
    expect(res.actual.missing_codes).toEqual(["G90", "M30"]);
    expect(res.actual.matched_codes.length + res.actual.missing_codes.length).toBe(4);
  });
});
