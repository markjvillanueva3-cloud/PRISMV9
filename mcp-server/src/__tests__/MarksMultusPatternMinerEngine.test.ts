/**
 * MarksMultusPatternMinerEngine Test Suite
 * ==========================================
 *
 * LATHE-AWARE-HARDEN MS5 U-LAT40 — Validates .MIN G-code pattern mining.
 *
 * @milestone LATHE-AWARE-HARDEN MS5
 * @unit U-LAT40
 */

import { describe, it, expect } from "vitest";
import { marksMultusPatternMinerEngine } from "../engines/MarksMultusPatternMinerEngine.js";

const SAMPLE_MIN = `
(MULTUS B300 — sample program)
O1001
G50 S4000
G96 S300 M3
T0101
G0 X100 Z50
G71 P100 Q200 U0.5 W0.2 D2.0 F0.3
N100 G0 X30
G1 X35 Z-10 F0.1
N200 Z-50
G76 P020060 Q50 R0.01
M8
T0202
M98 P1500
G65 P9100 A10 B20
#100 = 1.5
IF [#100 GT 1.0] GOTO 50
G31 X-10 F50
M9
M30
`;

describe("MarksMultusPatternMinerEngine", () => {
  // ── mineText() basic ──────────────────────────────────────────────────

  describe("mineText()", () => {
    it("returns a MiningResult with total_lines", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.total_lines).toBeGreaterThan(0);
    });

    it("detects macro calls (G65)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.macro_call).toBeGreaterThanOrEqual(1);
    });

    it("detects canned cycles (G71, G76)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.canned_cycle).toBeGreaterThanOrEqual(2);
    });

    it("detects tool changes (T01, T02)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.tool_change).toBeGreaterThanOrEqual(2);
      expect(r.unique_tools).toContain(101);
      expect(r.unique_tools).toContain(202);
    });

    it("detects spindle modes (G50/G96/G97)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.spindle_mode).toBeGreaterThanOrEqual(2);
    });

    it("detects coolant modes (M8/M9)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.coolant_mode).toBeGreaterThanOrEqual(2);
    });

    it("detects subprogram calls (M98)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.subprogram_call).toBeGreaterThanOrEqual(1);
    });

    it("detects conditional logic (IF/GOTO/variable)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.conditional).toBeGreaterThanOrEqual(1);
    });

    it("detects probe cycles (G31)", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.pattern_counts.probe).toBeGreaterThanOrEqual(1);
      expect(r.has_probing).toBe(true);
    });

    it("sets has_macros when macros present", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.has_macros).toBe(true);
    });

    it("sets has_conditional_logic when conditionals present", () => {
      const r = marksMultusPatternMinerEngine.mineText(SAMPLE_MIN);
      expect(r.has_conditional_logic).toBe(true);
    });

    it("skips comment-only lines (parens / semicolons)", () => {
      const commentHeavy = `(COMMENT 1)\n; comment 2\nT0101\n(ANOTHER COMMENT)\n`;
      const r = marksMultusPatternMinerEngine.mineText(commentHeavy);
      expect(r.pattern_counts.tool_change).toBe(1);
    });

    it("produces semantic hashes that are stable across runs", () => {
      const a = marksMultusPatternMinerEngine.mineText("T0101\n");
      const b = marksMultusPatternMinerEngine.mineText("T0101\n");
      expect(a.patterns[0]?.semantic_hash).toBe(b.patterns[0]?.semantic_hash);
    });

    it("produces different hashes for different kinds on same signature", () => {
      // T0101 is detected as tool_change; should hash differently from any other kind on same line
      const r = marksMultusPatternMinerEngine.mineText("T0101 M98 P1500\n");
      const tc = r.patterns.find((p) => p.kind === "tool_change");
      const sp = r.patterns.find((p) => p.kind === "subprogram_call");
      expect(tc?.semantic_hash).not.toBe(sp?.semantic_hash);
    });

    it("includes tool details in tool_change pattern", () => {
      const r = marksMultusPatternMinerEngine.mineText("T0303\n");
      const tc = r.patterns.find((p) => p.kind === "tool_change");
      expect(tc?.details?.tool).toBe(303);
    });

    it("empty text returns zero-count result", () => {
      const r = marksMultusPatternMinerEngine.mineText("");
      expect(r.patterns.length).toBe(0);
    });
  });

  // ── mineFile() ────────────────────────────────────────────────────────

  describe("mineFile()", () => {
    it("returns empty result for non-existent file", () => {
      const r = marksMultusPatternMinerEngine.mineFile("H:/ghost_does_not_exist.min");
      expect(r.total_lines).toBe(0);
      expect(r.patterns).toEqual([]);
    });
  });

  // ── mineDirectory() ──────────────────────────────────────────────────

  describe("mineDirectory()", () => {
    it("returns empty aggregate for non-existent directory", () => {
      const r = marksMultusPatternMinerEngine.mineDirectory("H:/ghost_dir");
      expect(r.per_file.length).toBe(0);
      expect(r.deduped.length).toBe(0);
      expect(r.aggregate.total_lines).toBe(0);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports 9 supported pattern kinds", () => {
      const stats = marksMultusPatternMinerEngine.getStats();
      expect(stats.supported_kinds).toBe(9);
      expect(stats.dedup_algorithm).toContain("sha1");
    });
  });
});
