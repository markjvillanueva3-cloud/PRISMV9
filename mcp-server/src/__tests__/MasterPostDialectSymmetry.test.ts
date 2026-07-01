/**
 * MasterPostProcessorUnifiedAGIEngine — Dialect Symmetry
 * ======================================================
 * Anti-regression for U-MASTERPOST-DIALECT-SYMMETRY (echo, 2026-05-26).
 *
 * Background — the bug this test pins
 * -----------------------------------
 * The engine's quality scorers (`runDeepLearningAnalysis`, `quickQualityScore`,
 * `scoreSafety`, `scoreBestPractices`, `scoreAccuracy`, `scoreTribalAdherence`)
 * previously used Fanuc-rooted regex literals: safe-start `/G28|G30|G53/`,
 * work-offset `/G5[4-9]/`, HSM `/G5\.1|G187|CYCLE832|M120|G08 P1/`.
 *
 * Two dialects regressed silently:
 *  - Heidenhain emits `M91 Z` / `TOOL CALL N Z` for safe-start and `CYCL DEF 7
 *    DATUM SHIFT` for work-offset — neither matched the Fanuc regex. Only its
 *    `M120` HSM hit, capping quality at 60 + 15 = 75.
 *  - Mitsubishi emits `G05.1 Q1` (leading zero) — the literal `G5\.1` regex
 *    failed to match it. Same 75 ceiling.
 *
 * Echo's overnight corpus prove-out (2026-05-25 → 2026-05-26, 8-iter /loop)
 * surfaced this as `120/200 PASS at corpus tier; Heidenhain/Mitsubishi 0%`.
 * This test pins the dialect-symmetric fix at the `analyzeGCode` and
 * `generatePost` quality surfaces.
 */

import { describe, it, expect } from "vitest";
import {
  masterPostProcessorUnifiedAGIEngine,
  DEFAULT_DIALECT_SIGNALS,
  type UnifiedControllerType,
  type DialectSignals,
} from "../engines/MasterPostProcessorUnifiedAGIEngine.js";

/**
 * Synthetic best-effort gcode per dialect. Each fixture includes the dialect's
 * canonical safe-start, work-offset, HSM, work-offset reference, several
 * comments, a tool change, spindle on, coolant on, a few feed moves, coolant
 * off, spindle off, safe retract, program end. These mirror what a competent
 * post would emit for a simple face-mill operation.
 */
const FIXTURES: Record<UnifiedControllerType, string> = {
  fanuc: [
    "%",
    "O0001 (FANUC TEST)",
    "(TOOL: T1 12MM ENDMILL)",
    "(OP: FACE MILL Z+0.0)",
    "(MAT: AL-6061)",
    "(SAFE START BLOCK)",
    "(COMMENT 6)",
    "G17 G20 G40 G49 G80 G90",
    "G91 G28 Z0.",
    "G54",
    "T1 M06",
    "G00 X0. Y0.",
    "G43 H1 Z1.",
    "G5.1 Q1 R0.01",
    "M03 S8000",
    "M08",
    "G01 Z-0.25 F20.",
    "G01 X2.0 Y0. F30.",
    "G01 X2.0 Y2.0",
    "G00 Z1.",
    "M09",
    "M05",
    "G91 G28 Z0.",
    "M30",
    "%",
  ].join("\n"),

  haas: [
    "%",
    "O0002 (HAAS TEST)",
    "(TOOL: T1 12MM ENDMILL)",
    "(OP: FACE MILL Z+0.0)",
    "(MAT: AL-6061)",
    "(SAFE START BLOCK)",
    "(COMMENT 6)",
    "G17 G20 G40 G49 G80 G90",
    "G91 G28 Z0.",
    "G54",
    "T1 M06",
    "G00 X0. Y0.",
    "G43 H1 Z1.",
    "G187 P3 E0.001",
    "M03 S8000",
    "M08",
    "G01 Z-0.25 F20.",
    "G01 X2.0 Y0. F30.",
    "G01 X2.0 Y2.0",
    "G00 Z1.",
    "M09",
    "M05",
    "G91 G28 Z0.",
    "M30",
    "%",
  ].join("\n"),

  okuma: [
    "%",
    "O0003 (OKUMA TEST)",
    "(TOOL: T1 12MM ENDMILL)",
    "(OP: FACE MILL Z+0.0)",
    "(MAT: AL-6061)",
    "(SAFE START BLOCK)",
    "(COMMENT 6)",
    "G17 G20 G40 G49 G80 G90",
    "G91 G28 Z0.",
    "G54",
    "T1 M06",
    "G00 X0. Y0.",
    "G43 H1 Z1.",
    "G08 P1",
    "M03 S8000",
    "M08",
    "G01 Z-0.25 F20.",
    "G01 X2.0 Y0. F30.",
    "G01 X2.0 Y2.0",
    "G00 Z1.",
    "M09",
    "M05",
    "G91 G28 Z0.",
    "M30",
    "%",
  ].join("\n"),

  // Heidenhain — canonical TNC syntax. NO G28/G54.
  heidenhain: [
    "; HEIDENHAIN TNC TEST",
    "; TOOL: T1 12MM ENDMILL",
    "; OP: FACE MILL",
    "; MAT: AL-6061",
    "; SAFE START",
    "; COMMENT 6",
    "BEGIN PGM TEST MM",
    "TOOL CALL 1 Z S8000",
    "CYCL DEF 7.0 DATUM SHIFT",
    "CYCL DEF 7.1 X+0.",
    "CYCL DEF 7.2 Y+0.",
    "CYCL DEF 7.3 Z+0.",
    "M120 LA5.0",
    "M03",
    "M08",
    "L Z+1. R0 FMAX",
    "L X+0. Y+0. R0 FMAX",
    "L Z-0.25 F200.",
    "L X+50. Y+0. F300.",
    "L X+50. Y+50.",
    "L Z+1. FMAX",
    "M09",
    "M05",
    "M91 Z0",
    "END PGM TEST MM",
  ].join("\n"),

  // Mitsubishi — Fanuc-compatible BUT HSM uses G05.1 (leading 0).
  mitsubishi: [
    "%",
    "O0004 (MITSUBISHI TEST)",
    "(TOOL: T1 12MM ENDMILL)",
    "(OP: FACE MILL Z+0.0)",
    "(MAT: AL-6061)",
    "(SAFE START BLOCK)",
    "(COMMENT 6)",
    "G17 G20 G40 G49 G80 G90",
    "G91 G28 Z0.",
    "G54",
    "T1 M06",
    "G00 X0. Y0.",
    "G43 H1 Z1.",
    "G05.1 Q1 R0.01",
    "M03 S8000",
    "M08",
    "G01 Z-0.25 F20.",
    "G01 X2.0 Y0. F30.",
    "G01 X2.0 Y2.0",
    "G00 Z1.",
    "M09",
    "M05",
    "G91 G28 Z0.",
    "M30",
    "%",
  ].join("\n"),

  // Remaining dialects fall back to DEFAULT_DIALECT_SIGNALS — included for
  // completeness so the parity-spread assertion runs across all sampled
  // dialects, not just the previously-broken pair.
  siemens: "",
  mazak: "",
  fagor: "",
  hurco: "",
  dmg_mori: "",
  brother: "",
  doosan: "",
  citizen: "",
  generic: "",
};

const DIALECTS_UNDER_TEST: UnifiedControllerType[] = [
  "fanuc",
  "haas",
  "okuma",
  "heidenhain",
  "mitsubishi",
];

describe("MasterPostProcessorUnifiedAGIEngine — dialect symmetry", () => {
  // -------------------------------------------------------------------------
  // PUBLIC SURFACE — DEFAULT_DIALECT_SIGNALS exported and well-formed
  // -------------------------------------------------------------------------
  describe("DEFAULT_DIALECT_SIGNALS", () => {
    it("exports a DialectSignals object with all 3 regex fields", () => {
      expect(DEFAULT_DIALECT_SIGNALS.safe_start).toBeInstanceOf(RegExp);
      expect(DEFAULT_DIALECT_SIGNALS.work_offset).toBeInstanceOf(RegExp);
      expect(DEFAULT_DIALECT_SIGNALS.hsm).toBeInstanceOf(RegExp);
    });

    it("Fanuc default HSM regex matches both G5.1 and G05.1 (Mitsubishi leading-zero variant)", () => {
      expect(DEFAULT_DIALECT_SIGNALS.hsm.test("G5.1 Q1 R0.01")).toBe(true);
      expect(DEFAULT_DIALECT_SIGNALS.hsm.test("G05.1 Q1 R0.01")).toBe(true);
    });

    it("Fanuc default safe-start matches G28/G30/G53 family", () => {
      expect(DEFAULT_DIALECT_SIGNALS.safe_start.test("G91 G28 Z0.")).toBe(true);
      expect(DEFAULT_DIALECT_SIGNALS.safe_start.test("G30 X0. Y0.")).toBe(true);
      expect(DEFAULT_DIALECT_SIGNALS.safe_start.test("G53 X-100.")).toBe(true);
    });

    it("Fanuc default work-offset matches G54-G59 range", () => {
      for (let n = 54; n <= 59; n++) {
        expect(DEFAULT_DIALECT_SIGNALS.work_offset.test(`G${n}`)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // PER-DIALECT QUALITY — generatePost with deep_learning enabled
  // -------------------------------------------------------------------------
  describe("generatePost quality_score reaches >= 85 on all sampled dialects", () => {
    for (const controller of DIALECTS_UNDER_TEST) {
      it(`${controller}: synthetic best-effort gcode scores >= 85`, () => {
        const result = masterPostProcessorUnifiedAGIEngine.generatePost({
          controller,
          gcode: FIXTURES[controller],
          enable_deep_learning: true,
        });
        // Anti-regression: pre-fix, Heidenhain + Mitsubishi were capped at 75
        // (base 60 + 15 HSM only). Now they MUST clear the same bar as Fanuc.
        expect(result.quality_score).toBeGreaterThanOrEqual(85);
      });
    }
  });

  // -------------------------------------------------------------------------
  // PARITY — score spread across dialects bounded
  // -------------------------------------------------------------------------
  describe("dialect parity", () => {
    it("max-min quality_score spread across 5 dialects is bounded (<= 15 pts)", () => {
      const scores = DIALECTS_UNDER_TEST.map(controller => {
        const result = masterPostProcessorUnifiedAGIEngine.generatePost({
          controller,
          gcode: FIXTURES[controller],
          enable_deep_learning: true,
        });
        return { controller, score: result.quality_score };
      });
      const max = Math.max(...scores.map(s => s.score));
      const min = Math.min(...scores.map(s => s.score));
      const spread = max - min;
      // Pre-fix this spread was 25 pts (85 Fanuc - 60 Heidenhain). Allow some
      // headroom for legitimate dialect-feature delta; reject regression.
      expect(spread).toBeLessThanOrEqual(15);
    });

    it("Heidenhain quality is NOT pinned at 75 (the pre-fix ceiling)", () => {
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "heidenhain",
        gcode: FIXTURES.heidenhain,
        enable_deep_learning: true,
      });
      // Pre-fix: Heidenhain capped at 75 because only the M120 HSM bit fired.
      // Post-fix: safe-start (M91/TOOL CALL Z), work-offset (CYCL DEF 7), and
      // ; comments all fire — clears the 75 ceiling.
      expect(result.quality_score).toBeGreaterThan(75);
    });

    it("Mitsubishi G05.1 (leading-zero) HSM call is now detected", () => {
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "mitsubishi",
        gcode: FIXTURES.mitsubishi,
        enable_deep_learning: true,
      });
      // Pre-fix regex `/G5\.1/` missed the leading-0 form. Mitsubishi quality
      // sat at 75. Now must clear the bar.
      expect(result.quality_score).toBeGreaterThanOrEqual(85);
    });
  });

  // -------------------------------------------------------------------------
  // QUICK-QUALITY PATH — when enable_deep_learning is OMITTED
  // -------------------------------------------------------------------------
  describe("quickQualityScore path (enable_deep_learning omitted)", () => {
    it("Heidenhain reaches >= 70 via the quick path (no DL)", () => {
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "heidenhain",
        gcode: FIXTURES.heidenhain,
        // enable_deep_learning intentionally omitted
      });
      // quickQualityScore base=50; safe_start +10, M0?9 coolant +5,
      // work_offset +5, comments +5, hsm_code (M120) +15 = 90.
      expect(result.quality_score).toBeGreaterThanOrEqual(70);
    });

    it("Mitsubishi reaches >= 80 via the quick path (G05.1 detected)", () => {
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "mitsubishi",
        gcode: FIXTURES.mitsubishi,
      });
      expect(result.quality_score).toBeGreaterThanOrEqual(80);
    });
  });

  // -------------------------------------------------------------------------
  // R12 NEGATIVE — minimal gcode still penalized
  // -------------------------------------------------------------------------
  describe("R12 negative — stub-passable defenses", () => {
    it("empty gcode does NOT clear the 85 bar (dialect-agnostic guard)", () => {
      // The fix MUST NOT make stubs pass. Empty input goes through the
      // error path (no segments / gcode) — engine returns quality_score=0
      // and a warning, never a false-positive 85.
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "heidenhain",
        gcode: "",
        enable_deep_learning: true,
      });
      expect(result.quality_score).toBeLessThan(85);
    });

    it("minimal 2-line gcode does NOT clear 85 (signal coverage required)", () => {
      const result = masterPostProcessorUnifiedAGIEngine.generatePost({
        controller: "heidenhain",
        gcode: "; minimal\nBEGIN PGM X MM",
        enable_deep_learning: true,
      });
      // 60 base + at most 0-1 signals match → far below 85.
      expect(result.quality_score).toBeLessThan(85);
    });
  });
});

// Type-import smoke — exercises the exported DialectSignals interface
// (prevents accidental un-export regression).
const _dialectSignalsTypeProbe: DialectSignals = DEFAULT_DIALECT_SIGNALS;
void _dialectSignalsTypeProbe;
