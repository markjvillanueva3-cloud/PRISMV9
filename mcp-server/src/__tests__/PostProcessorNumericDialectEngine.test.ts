/**
 * PostProcessorNumericDialectEngine tests — closes Axis 2 numeric-precision gap.
 *
 * Karpathy R9: tests verify intent, not behavior. Each test names WHY the
 * invariant matters (silent crash on machine = vendor manual citation).
 *
 * Variability floor (CLAUDE.md comprehensive-build-enforcement):
 *   ≥3 spanning controllers: fanuc · haas · okuma_osp · heidenhain_tnc
 * Coverage floor:
 *   happy path + 4 failure modes (leading-zero, trailing-zero, signed-zero,
 *   modal-default) + 4 adversarial (empty / oversize / non-string / unknown)
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorNumericDialectEngine,
  postProcessorNumericDialectEngine,
  type NumericDialectInput,
  type NumericDialectController,
  type NumericViolation,
} from "../engines/PostProcessorNumericDialectEngine.js";

const engine = postProcessorNumericDialectEngine;

const FANUC_HAPPY = `G94 G90 G54
G0 X10. Y20. Z5.
G1 X100. Y50. F1000.
M30`;

const HAAS_HAPPY = `G94 G90 G54
G0 X1. Y2.
G1 X10. Y5. F500.
M30`;

const OKUMA_HAPPY = `G94 G90 G54
G0 X10 Y20
G1 X100 Y50 F1000
M30`;

/** Helper — finds first violation by code; THROWS with full violation dump
 * if not found, so failures surface the actual violations seen (not a bare
 * `undefined`). */
function findViolation(violations: NumericViolation[], code: NumericViolation["code"]): NumericViolation {
  const v = violations.find(x => x.code === code);
  if (!v) {
    throw new Error(`Expected violation code=${code}, but saw: ${JSON.stringify(violations.map(x => x.code))}`);
  }
  return v;
}

describe("PostProcessorNumericDialectEngine", () => {
  describe("rule table contract (source-of-truth)", () => {
    it("exposes all 7 documented controllers", () => {
      expect(engine.controllers().sort()).toEqual([
        "fagor", "fanuc", "haas", "heidenhain_tnc",
        "mazak_mazatrol", "okuma_osp", "siemens_840d",
      ]);
    });
    it("every controller has a citation source ≥10 chars", () => {
      for (const c of engine.controllers()) {
        const rules = engine.rulesFor(c)!;
        expect(rules.source.length).toBeGreaterThan(10);
      }
    });
    it("fanuc has no safe default feed mode (manual demands explicit G94/G95)", () => {
      // Vendor-fact: Fanuc 30i §Decimal Point — no implicit feed mode default.
      // This is THE invariant that motivated the engine — modal drift = crash.
      expect(engine.rulesFor("fanuc")!.feed_modal_default).toBe("error");
    });
    it("heidenhain rejects signed zero (uniquely strict); others allow", () => {
      expect(engine.rulesFor("heidenhain_tnc")!.signed_zero).toBe("reject");
      for (const c of engine.controllers()) {
        if (c === "heidenhain_tnc") continue;
        expect(engine.rulesFor(c)!.signed_zero).toBe("allow");
      }
    });
    it("rulesFor returns null for unknown controller (does not throw)", () => {
      expect(engine.rulesFor("zzz" as NumericDialectController)).toBeNull();
    });
  });

  describe("happy path — clean post passes numeric_pass", () => {
    it("Fanuc clean post: 0 violations, verdict numeric_pass, pass_rate>=0.5", () => {
      const r = engine.analyze({ controller: "fanuc", gcode: FANUC_HAPPY });
      expect(r.verdict).toBe("numeric_pass");
      expect(r.violations).toHaveLength(0);
      expect(r.critical_count).toBe(0);
      expect(r.warning_count).toBe(0);
      expect(r.pass_rate.value).toBeGreaterThanOrEqual(0.5);
      expect(r.pass_rate.unit).toBe("ratio");
      expect(r.pass_rate.uncertainty).toBeGreaterThan(0);
    });
    it("Haas clean post: 0 violations, verdict numeric_pass", () => {
      const r = engine.analyze({ controller: "haas", gcode: HAAS_HAPPY });
      expect(r.verdict).toBe("numeric_pass");
      expect(r.violations).toHaveLength(0);
    });
    it("Okuma (optional-decimal): integer-only tokens accepted", () => {
      const r = engine.analyze({ controller: "okuma_osp", gcode: OKUMA_HAPPY });
      expect(r.verdict).toBe("numeric_pass");
      expect(r.critical_count).toBe(0);
      expect(r.violations).toHaveLength(0);
    });
  });

  describe("D1 — leading-zero drift", () => {
    it("Fanuc X010. → leading_zero_drift WARNING with concrete fix", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "G94\nG0 X010. Y20.\nM30",
      });
      const lz = findViolation(r.violations, "leading_zero_drift");
      expect(lz.severity).toBe("warning");
      expect(lz.line).toBe(2);
      expect(lz.fix).toContain("X10.");
    });
  });

  describe("D2 — trailing-zero / decimal-point drift", () => {
    it("Fanuc X10 → trailing_zero_drift CRITICAL (vendor parses as 10µm, not 10mm)", () => {
      // Vendor manual cites this explicitly — classic 1000x crash bug.
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "G94\nG0 X10 Y20\nM30",
      });
      const tz = findViolation(r.violations, "trailing_zero_drift");
      expect(tz.severity).toBe("critical");
      expect(tz.line).toBe(2);
      expect(r.verdict).toBe("numeric_block");
      expect(r.critical_count).toBeGreaterThanOrEqual(1);
    });
    it("Okuma X10 → no trailing_zero_drift (Okuma rule is `optional`)", () => {
      const r = engine.analyze({
        controller: "okuma_osp",
        gcode: "G94\nG0 X10 Y20\nM30",
      });
      expect(r.violations.filter(v => v.code === "trailing_zero_drift")).toHaveLength(0);
    });
    it("Heidenhain X10 → trailing_zero_drift CRITICAL", () => {
      const r = engine.analyze({
        controller: "heidenhain_tnc",
        gcode: "G94\nG0 X10 Y20\nM30",
      });
      const tz = findViolation(r.violations, "trailing_zero_drift");
      expect(tz.severity).toBe("critical");
    });
  });

  describe("D3 — decimal-separator drift", () => {
    it("Fanuc X10,5 (comma decimal) → decimal_separator_drift CRITICAL", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "G94\nG0 X10,5 Y20.\nM30",
      });
      const sep = findViolation(r.violations, "decimal_separator_drift");
      expect(sep.severity).toBe("critical");
      expect(sep.line).toBe(2);
    });
  });

  describe("D4 — signed-zero drift", () => {
    it("Heidenhain X-0. → signed_zero_drift CRITICAL (uniquely strict)", () => {
      const r = engine.analyze({
        controller: "heidenhain_tnc",
        gcode: "G94\nG0 X-0. Y20.\nM30",
      });
      const sz = findViolation(r.violations, "signed_zero_drift");
      expect(sz.severity).toBe("critical");
    });
    it("Fanuc X-0. → no signed_zero_drift (Fanuc allows signed zero)", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "G94\nG0 X-0. Y20.\nM30",
      });
      expect(r.violations.filter(v => v.code === "signed_zero_drift")).toHaveLength(0);
    });
  });

  describe("D5/D6 — modal-default / feed-unit ambiguity", () => {
    it("Fanuc F1000. without G94/G95 → modal_default_drift CRITICAL (no safe default)", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "G90 G54\nG0 X10.\nG1 X20. F1000.\nM30",
      });
      const md = findViolation(r.violations, "modal_default_drift");
      expect(md.severity).toBe("critical");
      expect(r.verdict).toBe("numeric_block");
    });
    it("Haas F1000. without G94/G95 → feed_unit_ambiguous WARNING (Haas defaults to G94)", () => {
      const r = engine.analyze({
        controller: "haas",
        gcode: "G90 G54\nG0 X10.\nG1 X20. F1000.\nM30",
      });
      const md = findViolation(r.violations, "feed_unit_ambiguous");
      expect(md.severity).toBe("warning");
      expect(md.reason).toContain("G94");
    });
  });

  describe("idempotent / non-mutating analysis", () => {
    it("rulesFor returns equal values across calls (read-only contract)", () => {
      expect(engine.rulesFor("fanuc")).toEqual(engine.rulesFor("fanuc"));
    });
    it("analyze does not mutate the input gcode string", () => {
      const original = FANUC_HAPPY;
      const input: NumericDialectInput = { controller: "fanuc", gcode: original };
      engine.analyze(input);
      expect(input.gcode).toBe(original);
    });
    it("re-running analyze on the same input gives identical violation counts", () => {
      const input: NumericDialectInput = { controller: "fanuc", gcode: "G0 X10 Y20\nM30" };
      const r1 = engine.analyze(input);
      const r2 = engine.analyze(input);
      expect(r1.critical_count).toBe(r2.critical_count);
      expect(r1.warning_count).toBe(r2.warning_count);
      expect(r1.verdict).toBe(r2.verdict);
    });
  });

  describe("adversarial inputs (R12 fail-loud, never silent-pass)", () => {
    it("empty gcode → numeric_pass with blocks_scanned=0 (no false positive)", () => {
      const r = engine.analyze({ controller: "fanuc", gcode: "" });
      expect(r.verdict).toBe("numeric_pass");
      expect(r.blocks_scanned).toBe(0);
      expect(r.violations).toHaveLength(0);
    });
    it("unknown controller → single input-validation critical, never crashes", () => {
      const r = engine.analyze({
        controller: "completely_made_up" as NumericDialectController,
        gcode: "G0 X10.",
      });
      expect(r.verdict).toBe("numeric_block");
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0].reason).toContain("unknown controller");
    });
    it("non-string gcode → input-validation critical (no crash on type drift)", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: 42 as unknown as string,
      });
      expect(r.verdict).toBe("numeric_block");
      expect(r.violations[0].reason).toContain("gcode must be a string");
    });
    it("oversized gcode (>5MB) refused without scanning", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "X".repeat(5_000_001),
      });
      expect(r.verdict).toBe("numeric_block");
      expect(r.violations[0].reason).toContain("exceeds");
    });
    it("comment-only gcode → numeric_pass + blocks_scanned=0", () => {
      const r = engine.analyze({
        controller: "fanuc",
        gcode: "(this is a comment)\n; another comment\n(yet more)",
      });
      expect(r.verdict).toBe("numeric_pass");
      expect(r.blocks_scanned).toBe(0);
    });
  });

  describe("pass_rate AtomicValue contract", () => {
    it("pass_rate carries Wilson-95 source + sqrt-curve confidence in [0,1]", () => {
      const r = engine.analyze({ controller: "fanuc", gcode: FANUC_HAPPY });
      expect(r.pass_rate.source).toBe("Wilson-95");
      expect(r.pass_rate.confidence ?? -1).toBeGreaterThan(0);
      expect(r.pass_rate.confidence ?? 2).toBeLessThanOrEqual(1);
    });
    it("0-sample input gives confidence=0 (honest no-evidence signal)", () => {
      const r = engine.analyze({ controller: "fanuc", gcode: "" });
      expect(r.pass_rate.confidence).toBe(0);
    });
  });
});

describe("singleton stability", () => {
  it("postProcessorNumericDialectEngine is a stable instance with version '1.0.0'", () => {
    expect(postProcessorNumericDialectEngine).toBeInstanceOf(PostProcessorNumericDialectEngine);
    expect(postProcessorNumericDialectEngine.version).toBe("1.0.0");
  });
});
