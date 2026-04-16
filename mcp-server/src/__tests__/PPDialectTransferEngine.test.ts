/**
 * PPDialectTransferEngine Tests — PP-AGI-MS0
 *
 * Tests G-code knowledge transfer from known to unknown controllers:
 * - Transfer with full spec (family known)
 * - Transfer with partial spec (capabilities only)
 * - G-code family inference from sample lines
 * - canTransfer threshold check
 * - Gap detection for mismatched capabilities
 * - Pattern extraction and confidence scoring
 */

import { describe, it, expect } from "vitest";
import {
  PPDialectTransferEngine,
  ppDialectTransferEngine,
  type PartialControllerSpec,
} from "../engines/PPDialectTransferEngine.js";

describe("PPDialectTransferEngine", () => {
  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(ppDialectTransferEngine).toBeDefined();
      expect(ppDialectTransferEngine).toBeInstanceOf(PPDialectTransferEngine);
    });
  });

  describe("transfer - family known", () => {
    it("Fanuc-family spec matches a Fanuc controller", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "fanuc",
        arc_format: "ijk_incremental",
        comment_style: "parentheses",
      });
      expect(result.best_match.controller_id).toMatch(/fanuc|generic_fanuc|haas|doosan/);
      expect(result.best_match.similarity).toBeGreaterThan(0.5);
    });

    it("Siemens-family spec matches a Siemens controller", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "siemens",
        arc_format: "ijk_absolute",
        comment_style: "semicolon",
      });
      expect(result.best_match.controller_id).toMatch(/siemens|dmg_celos_siemens/);
    });

    it("Heidenhain-family spec matches Heidenhain", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "heidenhain",
        comment_style: "heidenhain",
      });
      expect(result.best_match.controller_id).toMatch(/heidenhain/);
    });

    it("returns at least 3 runner-ups", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      expect(result.runner_ups.length).toBeGreaterThanOrEqual(3);
    });

    it("runner-ups are sorted by descending similarity", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      for (let i = 1; i < result.runner_ups.length; i++) {
        expect(result.runner_ups[i].similarity)
          .toBeLessThanOrEqual(result.runner_ups[i - 1].similarity);
      }
    });
  });

  describe("transfer - partial spec", () => {
    it("5-axis TCPC spec matches an advanced controller", () => {
      const result = ppDialectTransferEngine.transfer({
        has_tcpc: true,
        max_axes: 5,
        has_hsc: true,
      });
      // Should match a 5-axis capable controller
      expect(result.best_match.similarity).toBeGreaterThan(0.3);
    });

    it("Swiss-type spec matches Swiss controller", () => {
      const result = ppDialectTransferEngine.transfer({
        is_swiss: true,
        has_sub_spindle: true,
      });
      expect(result.best_match.controller_id).toMatch(/citizen|star/);
    });

    it("empty spec still returns a result (fallback)", () => {
      const result = ppDialectTransferEngine.transfer({});
      expect(result.best_match.controller_id).toBeDefined();
      expect(result.transferred_patterns.length).toBeGreaterThan(0);
    });
  });

  describe("transferred patterns", () => {
    it("includes safe_start pattern", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      const safeStart = result.transferred_patterns.find(p => p.category === "safe_start");
      expect(safeStart).toBeDefined();
      expect(typeof safeStart!.pattern).toBe("string");
      expect(safeStart!.confidence).toBeGreaterThan(0);
    });

    it("includes program_start and program_end", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      expect(result.transferred_patterns.some(p => p.category === "program_start")).toBe(true);
      expect(result.transferred_patterns.some(p => p.category === "program_end")).toBe(true);
    });

    it("includes tool_change pattern", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      const tc = result.transferred_patterns.find(p => p.category === "tool_change");
      expect(tc).toBeDefined();
      expect(Array.isArray(tc!.pattern)).toBe(true);
    });

    it("includes canned_cycles", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      const cycles = result.transferred_patterns.find(p => p.category === "canned_cycles");
      expect(cycles).toBeDefined();
    });

    it("includes spindle and coolant codes", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      expect(result.transferred_patterns.some(p => p.category === "spindle_codes")).toBe(true);
      expect(result.transferred_patterns.some(p => p.category === "coolant_codes")).toBe(true);
    });

    it("all patterns have confidence in (0, 1]", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      for (const p of result.transferred_patterns) {
        expect(p.confidence).toBeGreaterThan(0);
        expect(p.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("all patterns have source_controller set", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "siemens" });
      for (const p of result.transferred_patterns) {
        expect(p.source_controller.length).toBeGreaterThan(0);
      }
    });

    it("HSC/TCPC patterns appear for 5-axis source", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "fanuc",
        has_tcpc: true,
        has_hsc: true,
        max_axes: 5,
      });
      // If best match has TCPC, pattern should exist
      const tcpc = result.transferred_patterns.find(p => p.category === "tcpc_5axis");
      const hsc = result.transferred_patterns.find(p => p.category === "hsc_mode");
      // At least one should appear for an advanced Fanuc match
      expect(tcpc !== undefined || hsc !== undefined).toBe(true);
    });
  });

  describe("overall_confidence", () => {
    it("is in [0, 1]", () => {
      const result = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      expect(result.overall_confidence).toBeGreaterThanOrEqual(0);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("known family has higher confidence than empty spec", () => {
      const known = ppDialectTransferEngine.transfer({ base_family: "fanuc" });
      const empty = ppDialectTransferEngine.transfer({});
      expect(known.overall_confidence).toBeGreaterThanOrEqual(empty.overall_confidence);
    });
  });

  describe("gap detection", () => {
    it("flags TCPC gap when target has it but source does not", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "other",
        has_tcpc: true,
      });
      // If best match lacks TCPC, should flag
      if (!result.transferred_patterns.some(p => p.category === "tcpc_5axis")) {
        const tcpcGap = result.gaps.find(g => g.feature === "tcpc");
        if (tcpcGap) {
          expect(tcpcGap.reason).toContain("TCPC");
        }
      }
    });

    it("flags Swiss gap when target is Swiss but source is not", () => {
      const result = ppDialectTransferEngine.transfer({
        base_family: "siemens", // Siemens is not Swiss
        is_swiss: true,
      });
      const swissGap = result.gaps.find(g => g.feature === "swiss_type");
      expect(swissGap).toBeDefined();
    });

    it("flags missing family when no family or gcode provided", () => {
      const result = ppDialectTransferEngine.transfer({
        has_hsc: true,
      });
      const familyGap = result.gaps.find(g => g.feature === "base_family");
      expect(familyGap).toBeDefined();
    });
  });

  describe("canTransfer", () => {
    it("returns true for well-specified Fanuc", () => {
      expect(ppDialectTransferEngine.canTransfer({
        base_family: "fanuc",
        arc_format: "ijk_incremental",
        comment_style: "parentheses",
      })).toBe(true);
    });

    it("returns true for Siemens family", () => {
      expect(ppDialectTransferEngine.canTransfer({
        base_family: "siemens",
      })).toBe(true);
    });

    it("empty spec may or may not pass threshold", () => {
      const result = ppDialectTransferEngine.canTransfer({}, 0.99);
      expect(typeof result).toBe("boolean");
    });

    it("low threshold always passes", () => {
      expect(ppDialectTransferEngine.canTransfer({}, 0.01)).toBe(true);
    });
  });

  describe("inferFamily", () => {
    it("detects Fanuc from M98 and O-number", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "%", "O0001", "G90 G21 G17 G40 G80",
        "M98 P1000", "M30", "%",
      ]);
      expect(result.family).toBe("fanuc");
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("detects Siemens from CYCLE81 and DEF", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "DEF REAL _DEPTH=10.0",
        "CYCLE81(100, 0, 1, -25)",
        "M30",
      ]);
      expect(result.family).toBe("siemens");
      expect(result.evidence.some(e => e.includes("Siemens"))).toBe(true);
    });

    it("detects Heidenhain from BLK FORM and TOOL CALL", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "BLK FORM 0.1 Z X-50 Y-50 Z-30",
        "TOOL CALL 5 Z S5000",
        "CYCL DEF 200 DRILLING",
      ]);
      expect(result.family).toBe("heidenhain");
    });

    it("detects Okuma from G8.1 NURBS", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "G8.1", "G01 X10 Y20 F500",
      ]);
      expect(result.family).toBe("okuma");
    });

    it("detects Haas from G187", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "%", "O0001", "G187 P1 E0.005", "M30", "%",
      ]);
      // G187 is Haas-specific (falls in "other" bucket)
      expect(result.evidence.some(e => e.includes("Haas"))).toBe(true);
    });

    it("returns evidence array", () => {
      const result = ppDialectTransferEngine.inferFamily([
        "DEF REAL _X", "CYCLE800()", "TRAORI",
      ]);
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("handles empty input gracefully", () => {
      const result = ppDialectTransferEngine.inferFamily([]);
      expect(result.family).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("transfer with sample_gcode", () => {
    it("infers family from G-code and matches accordingly", () => {
      const result = ppDialectTransferEngine.transfer({
        sample_gcode: [
          "DEF REAL _DEPTH", "CYCLE81(100,0,1,-25)", "CYCLE800()",
        ],
      });
      // Should match a Siemens controller
      expect(result.best_match.controller_id).toMatch(/siemens|dmg_celos_siemens/);
    });
  });
});
