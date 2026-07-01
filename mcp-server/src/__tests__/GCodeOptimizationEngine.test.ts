/**
 * GCodeOptimizationEngine — companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Pure, deterministic G-code analyzer/optimizer (analyze / optimize / compare). These
 * tests lock the parse → classify → measure → estimate pipeline with reference values
 * computed by hand from the engine source, plus the rapid-Z-descent SAFETY warning and
 * the (honestly-estimated, non-reordering) rapid-reduction characterization. R9: each
 * assert fails if the counting, distance, time, or safety logic drifts.
 *
 * Reference contract (GCodeOptimizationEngine.ts):
 *   - rapid class: /G0[0 ]/ or "G00";  feed: /G0?1[^0-9]/ or "G01";  arc: /G0?[23]/ (dist ×1.5)
 *   - dist = euclidean from running prev (starts 0,0,0); estimated_time =
 *       feedDist/avgFeed·60 + rapidDist/5000·60 + toolChanges·8  (avgFeed=(minF+maxF)/2, else 500)
 *   - safety warn: is_rapid && z < prevZ − 50
 *   - optimize: drop 2nd of consecutive blank lines; drop a non-rapid stationary move
 *       (x===prevX && y===prevY && z===prevZ); rapid reduction is a flat 10% ESTIMATE (no reorder)
 */

import { describe, it, expect } from "vitest";
import { gcodeOptimizationEngine, GCodeOptimizationEngine } from "../engines/GCodeOptimizationEngine.js";

describe("GCodeOptimizationEngine", () => {
  describe("singleton + construction", () => {
    it("exports a singleton instance of the class", () => {
      expect(gcodeOptimizationEngine).toBeInstanceOf(GCodeOptimizationEngine);
    });
  });

  describe("analyze()", () => {
    it("computes exact counts/distances/time for a known 2-move program", () => {
      // L1 rapid from (0,0,0) to (30,40,0): dist = sqrt(30²+40²) = 50
      // L2 feed  from (30,40,0) to (30,40,-10) F200: dist = 10
      const a = gcodeOptimizationEngine.analyze("G00 X30 Y40 Z0\nG01 X30 Y40 Z-10 F200");
      expect(a.total_lines).toBe(2);
      expect(a.code_lines).toBe(2);
      expect(a.comment_lines).toBe(0);
      expect(a.blank_lines).toBe(0);
      expect(a.rapid_moves).toBe(1);
      expect(a.feed_moves).toBe(1);
      expect(a.arc_moves).toBe(0);
      expect(a.tool_changes).toBe(0);
      expect(a.total_rapid_distance_mm).toBe(50);
      expect(a.total_feed_distance_mm).toBe(10);
      // feedTime 10/200·60=3 ; rapidTime 50/5000·60=0.6 ; round(3.6)=4
      expect(a.estimated_time_sec).toBe(4);
      expect(a.feed_rate_range).toEqual({ min: 200, max: 200 });
      expect(a.spindle_speed_range).toEqual({ min: 0, max: 0 }); // no S words
      expect(a.unique_tools).toEqual([]);
      expect(a.warnings).toEqual([]);
    });

    it("classifies arc moves and tool changes; returns unique sorted tools + spindle range", () => {
      const a = gcodeOptimizationEngine.analyze(
        ["T3 M06", "G00 X0 Y0 Z5", "G01 X10 Y0 Z-1 F150 S1200", "G02 X20 Y0 Z-1", "T1 M06"].join("\n"),
      );
      expect(a.tool_changes).toBe(2);
      expect(a.unique_tools).toEqual([1, 3]); // sorted ascending
      expect(a.arc_moves).toBe(1);
      expect(a.feed_moves).toBe(1);
      expect(a.spindle_speed_range).toEqual({ min: 1200, max: 1200 });
      expect(a.feed_rate_range).toEqual({ min: 150, max: 150 });
    });

    it("counts comment and blank lines separately from code", () => {
      const a = gcodeOptimizationEngine.analyze("(header)\n\n; note\nG01 X1 Y0 Z0 F50");
      expect(a.total_lines).toBe(4);
      expect(a.comment_lines).toBe(2); // "(header)" and "; note"
      expect(a.blank_lines).toBe(1);
      expect(a.code_lines).toBe(1);
    });

    it("EDGE: empty input yields a zeroed analysis, never NaN", () => {
      const a = gcodeOptimizationEngine.analyze("");
      expect(a.total_lines).toBe(1); // "".split("\n") -> [""]
      expect(a.code_lines).toBe(0);
      expect(a.estimated_time_sec).toBe(0);
      expect(Number.isFinite(a.estimated_time_sec)).toBe(true);
      expect(a.feed_rate_range).toEqual({ min: 0, max: 0 });
      expect(a.unique_tools).toEqual([]);
    });
  });

  describe("safety — rapid Z descent warning (echo emit-safety lock)", () => {
    it("warns on a rapid Z plunge deeper than 50mm below the previous Z", () => {
      // prevZ 0 -> z -60 : -60 < 0 - 50 = -50 -> warns; descent magnitude 60.0mm
      const a = gcodeOptimizationEngine.analyze("G00 X0 Y0 Z0\nG00 X0 Y0 Z-60");
      expect(a.warnings.length).toBe(1);
      expect(a.warnings[0]).toContain("Rapid Z descent of 60.0mm");
    });

    it("does NOT warn at the ≤50mm boundary (strict less-than)", () => {
      // z -50 : -50 < -50 is false -> no warning
      const a = gcodeOptimizationEngine.analyze("G00 X0 Y0 Z0\nG00 X0 Y0 Z-50");
      expect(a.warnings).toEqual([]);
    });
  });

  describe("optimize()", () => {
    it("drops a non-rapid stationary duplicate move", () => {
      const r = gcodeOptimizationEngine.optimize("G01 X10 Y0 Z0 F100\nG01 X10 Y0 Z0 F100");
      expect(r.original_lines).toBe(2);
      expect(r.lines_removed).toBe(1); // 2nd line is stationary (same x/y/z)
      expect(r.optimized_lines).toBe(1);
      expect(r.gcode).toBe("G01 X10 Y0 Z0 F100");
    });

    it("collapses consecutive blank lines (keeps the first, drops the second)", () => {
      // "A\n\n\nB".split("\n") === ["A","","","B"] -> exactly TWO blank lines (not three).
      // The engine keeps the 1st blank (prev line is code) and removes the 2nd (prev line blank).
      const r = gcodeOptimizationEngine.optimize("G01 X10 Y0 Z0 F100\n\n\nG01 X20 Y0 Z0 F100");
      expect(r.original_lines).toBe(4);
      expect(r.lines_removed).toBe(1); // 1 of the 2 consecutive blanks removed
      expect(r.optimized_lines).toBe(3);
    });

    it("CHARACTERIZE: rapid reduction is a flat 10% ESTIMATE, not an actual reorder", () => {
      // 5 rapid moves of 100mm each = 500mm rapid; engine estimates 10% = 50mm.
      const prog = ["G00 X100 Y0 Z0", "G00 X200 Y0 Z0", "G00 X300 Y0 Z0", "G00 X400 Y0 Z0", "G00 X500 Y0 Z0"].join("\n");
      const r = gcodeOptimizationEngine.optimize(prog);
      expect(r.original_rapid_mm).toBe(500);
      expect(r.optimized_rapid_mm).toBe(450); // 500 - 10%
      expect(r.rapid_reduction_pct).toBe(10);
      // No physical lines were removable here, so the gcode body is byte-identical.
      expect(r.gcode).toBe(prog);
      expect(r.lines_removed).toBe(0);
    });

    it("never reports negative time savings", () => {
      const r = gcodeOptimizationEngine.optimize("G01 X10 Y0 Z0 F100\nG01 X10 Y0 Z0 F100");
      expect(r.time_saved_sec).toBeGreaterThanOrEqual(0);
      expect(r.time_saved_pct).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyze() — feed fallback + known classifier limits", () => {
    it("uses the 500 mm/min avgFeed fallback when a feed move has no F word", () => {
      // Feed move (no F): minF=Infinity, maxF=0 -> avgFeed falls back to 500.
      // dist (0,0,0)->(10,0,0) = 10 ; feedTime = 10/500*60 = 1.2 -> round(1.2) = 1
      const a = gcodeOptimizationEngine.analyze("G01 X10 Y0 Z0");
      expect(a.feed_moves).toBe(1);
      expect(a.feed_rate_range).toEqual({ min: 0, max: 0 }); // no F observed
      expect(a.estimated_time_sec).toBe(1); // proves the 500 fallback was applied
    });

    it("FIXED (U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN): G28/G30 home + G20/G21 unit codes are NOT arcs", () => {
      // The arc matcher /G0?[23](?![0-9])/ now rejects two-digit G2x/G3x codes that used to
      // false-match the bare "2"/"3" and inflate arc_moves + total_feed_distance (×1.5).
      expect(gcodeOptimizationEngine.analyze("G28 X0 Y0 Z0").arc_moves).toBe(0); // return-to-ref
      expect(gcodeOptimizationEngine.analyze("G30 X0 Y0 Z0").arc_moves).toBe(0); // 2nd reference home
      expect(gcodeOptimizationEngine.analyze("G20").arc_moves).toBe(0); // inch units
      expect(gcodeOptimizationEngine.analyze("G21").arc_moves).toBe(0); // mm units
      // Real arcs are still detected (regression guard for the lookahead):
      expect(gcodeOptimizationEngine.analyze("G02 X10 Y0 Z0").arc_moves).toBe(1); // spaced
      expect(gcodeOptimizationEngine.analyze("G2X10Y0Z0").arc_moves).toBe(1); // compact
      expect(gcodeOptimizationEngine.analyze("G3 X10 Y0 Z0").arc_moves).toBe(1); // G3 CCW
    });

    it("KNOWN LIMITATION: compact 'G0X10' (no space) is not classified as a rapid move", () => {
      // The rapid matcher /G0[0 ]/ requires a '0' or space after G0, so space-free compact
      // G0 forms are missed. Locked to document the gap (same follow-up).
      const a = gcodeOptimizationEngine.analyze("G0X10");
      expect(a.code_lines).toBe(1);
      expect(a.rapid_moves).toBe(0); // <-- compact G0 missed
    });
  });

  describe("compare()", () => {
    it("identifies the faster program and signs the time difference accordingly", () => {
      const fast = "G01 X10 Y0 Z0 F1000"; // high feed -> low time
      const slow = "G01 X10 Y0 Z0 F50"; // low feed -> high time
      const c = gcodeOptimizationEngine.compare(fast, slow);
      expect(c.program_a.estimated_time_sec).toBeLessThan(c.program_b.estimated_time_sec);
      expect(c.time_difference_sec).toBeLessThan(0); // a - b, a faster
      expect(c.recommendation).toMatch(/Program A is \d+s faster/);
    });

    it("reports similar cycle times when both estimates are equal", () => {
      const same = "G01 X10 Y0 Z0 F100";
      const c = gcodeOptimizationEngine.compare(same, same);
      expect(c.time_difference_sec).toBe(0);
      expect(c.recommendation).toBe("Programs have similar estimated cycle times");
    });
  });
});
