/**
 * PPGCodeMinimizerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPGCodeMinimizerEngine,
  ppGCodeMinimizerEngine,
} from "../engines/PPGCodeMinimizerEngine.js";

const SAMPLE = `%
O1001 (MINIMIZE TEST)
G90 G21 G17
G54
T1 M6
S2000 M3
M8
G0 X10. Y10.
G0 Z5.
G1 Z-1. F200.
G1 X50. F200.
G1 Y40. F200.
G1 X10. F250.
G1 Y10. F250.
G0 Z25.
M9
M5
M30
%`;

describe("PPGCodeMinimizerEngine", () => {
  it("exports singleton", () => {
    expect(ppGCodeMinimizerEngine).toBeInstanceOf(PPGCodeMinimizerEngine);
  });

  describe("redundant modal motion stripping", () => {
    it("strips consecutive G1 redundants", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      // Three G1 lines → two redundants stripped
      expect(r.tokens_removed.modal_motion).toBeGreaterThanOrEqual(2);
    });

    it("output still parseable", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      // Must still contain the first G1 (for motion mode setup)
      expect(r.text).toMatch(/G1/);
      expect(r.text).toContain("Z-1.");
      expect(r.text).toContain("X50.");
    });

    it("keeps G0 after G1 (different motion)", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      // G0 Z5. after G1 Z-1. — G0 must remain
      expect(r.text).toContain("G0 Z25.");
    });

    it("first G-motion code always preserved", () => {
      const code = `G0 X10\nG0 Y10\nG1 X20 F100\nG1 Y20\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      // First G0 and first G1 preserved, second G0 and second G1 stripped
      expect(r.text).toContain("G0 X10");
      expect(r.text).toContain("G1 X20");
    });
  });

  describe("redundant F/S stripping", () => {
    it("strips F200 repeats", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.tokens_removed.redundant_f).toBeGreaterThanOrEqual(2);
    });

    it("keeps F when value changes", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      // F250 is different from preceding F200 → should be kept
      expect(r.text).toContain("F250");
    });

    it("strips S2000 repeats (only one occurrence in SAMPLE so 0)", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.tokens_removed.redundant_s).toBe(0);
    });

    it("strips repeated S when same value repeats", () => {
      const code = `G1 X10 F100 S2000\nG1 Y10 F100 S2000\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      expect(r.tokens_removed.redundant_s).toBe(1);
      expect(r.tokens_removed.redundant_f).toBe(1);
    });
  });

  describe("byte savings", () => {
    it("saved_bytes > 0 for SAMPLE", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.saved_bytes).toBeGreaterThan(0);
    });

    it("saved_percent reported", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.saved_percent).toBeGreaterThan(0);
      expect(r.saved_percent).toBeLessThan(100);
    });

    it("input_bytes and output_bytes match text length", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.input_bytes).toBe(SAMPLE.length);
      expect(r.output_bytes).toBe(r.text.length);
    });
  });

  describe("block number stripping", () => {
    it("strips N-words when strip_block_numbers=true", () => {
      const code = `%
O1001
N10 G90 G21
N20 G0 X10 Y10
N30 G1 Z-1 F100
N40 M30
%`;
      const r = ppGCodeMinimizerEngine.minimize(code, {
        strip_block_numbers: true,
      });
      expect(r.text).not.toMatch(/N10|N20|N30|N40/);
      expect(r.tokens_removed.block_numbers).toBeGreaterThan(0);
    });

    it("keeps N-words by default", () => {
      const code = `N10 G90\nN20 G0 X10\nN30 M30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      expect(r.text).toContain("N10");
    });
  });

  describe("comment stripping", () => {
    it("strips comments when strip_comments=true", () => {
      const code = `%
O1001 (HEADER)
G90 G21
(OPERATION 1)
G0 X10 Y10
G1 Z-1 F100 (PLUNGE)
M30
%`;
      const r = ppGCodeMinimizerEngine.minimize(code, {
        strip_comments: true,
      });
      expect(r.text).not.toContain("(OPERATION 1)");
      expect(r.text).not.toContain("(PLUNGE)");
    });

    it("keeps comments by default", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.text).toContain("(MINIMIZE TEST)");
    });
  });

  describe("whitespace collapse", () => {
    it("collapses multiple spaces to single", () => {
      const code = `G1   X10   Y10   F100\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      expect(r.text).not.toMatch(/ {2,}/);
    });

    it("preserves content integrity", () => {
      const code = `G1   X10   Y10   F100\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      expect(r.text).toContain("X10");
      expect(r.text).toContain("Y10");
      expect(r.text).toContain("F100");
    });
  });

  describe("header preservation", () => {
    it("keeps header modal codes (G90 G21 G17)", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.text).toContain("G90");
      expect(r.text).toContain("G21");
      expect(r.text).toContain("G17");
    });

    it("keeps program number O1001", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.text).toContain("O1001");
    });

    it("keeps M30 program end", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.text).toContain("M30");
    });
  });

  describe("minimizeAggressive", () => {
    it("strips both comments and block numbers", () => {
      const code = `N10 G90 (HEADER)
N20 G0 X10 (COMMENT)
N30 M30`;
      const r = ppGCodeMinimizerEngine.minimizeAggressive(code);
      expect(r.text).not.toContain("(COMMENT)");
    });

    it("saves more bytes than conservative", () => {
      const code = `%
O1001 (HDR)
N10 G90 G21
N20 G0 X10 Y10
N30 G1 Z-1 F100
N40 M30
%`;
      const aggressive = ppGCodeMinimizerEngine.minimizeAggressive(code);
      const conservative = ppGCodeMinimizerEngine.minimizeConservative(code);
      expect(aggressive.output_bytes).toBeLessThanOrEqual(conservative.output_bytes);
    });
  });

  describe("minimizeConservative", () => {
    it("keeps block numbers", () => {
      const code = `N10 G90\nN20 G0 X10\nN30 M30`;
      const r = ppGCodeMinimizerEngine.minimizeConservative(code);
      expect(r.text).toContain("N10");
    });

    it("keeps comments", () => {
      const code = `(HEADER)\nG0 X10\n(END)\nM30`;
      const r = ppGCodeMinimizerEngine.minimizeConservative(code);
      expect(r.text).toContain("(HEADER)");
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppGCodeMinimizerEngine.defaultOptions();
      expect(o.strip_redundant_modal).toBe(true);
      expect(o.strip_redundant_fs).toBe(true);
      expect(o.strip_block_numbers).toBe(false);
      expect(o.strip_comments).toBe(false);
    });
  });

  describe("option toggles", () => {
    it("strip_redundant_modal=false keeps all motion codes", () => {
      const code = `G1 X10 F100\nG1 Y10\nG1 Z5\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code, {
        strip_redundant_modal: false,
      });
      expect(r.tokens_removed.modal_motion).toBe(0);
      // All three G1s should still be present
      const g1Count = (r.text.match(/G1\b/g) ?? []).length;
      expect(g1Count).toBe(3);
    });

    it("strip_redundant_fs=false keeps repeated F-words", () => {
      const code = `G1 X10 F100\nG1 Y10 F100\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code, {
        strip_redundant_fs: false,
      });
      expect(r.tokens_removed.redundant_f).toBe(0);
      const fCount = (r.text.match(/F100/g) ?? []).length;
      expect(fCount).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppGCodeMinimizerEngine.minimize("");
      expect(r.text).toBe("");
      expect(r.saved_bytes).toBe(0);
    });

    it("handles single-line program", () => {
      const r = ppGCodeMinimizerEngine.minimize("M30");
      expect(r.text).toContain("M30");
    });

    it("handles program with only comments", () => {
      const code = `(HEADER ONLY)\n(NOTHING ELSE)`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      // Should still contain comments since default keeps them
      expect(r.text).toContain("(HEADER ONLY)");
    });

    it("reports zero tokens removed for already-minimal program", () => {
      const code = `G1 X10 F100\nY20\nZ5 F200\nM30`;
      const r = ppGCodeMinimizerEngine.minimize(code);
      expect(r.tokens_removed.modal_motion).toBe(0);
    });

    it("output never larger than input", () => {
      const r = ppGCodeMinimizerEngine.minimize(SAMPLE);
      expect(r.output_bytes).toBeLessThanOrEqual(r.input_bytes);
    });
  });
});
