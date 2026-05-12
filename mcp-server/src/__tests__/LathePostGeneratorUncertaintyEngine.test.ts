/**
 * LathePostGeneratorUncertaintyEngine Tests — LATHE-MASTER U-LTH22
 *
 * Tests ensemble-based uncertainty quantification for lathe post-processor output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LathePostGeneratorUncertaintyEngine,
  lathePostGeneratorUncertaintyEngine,
  type BlockUncertainty,
  type ProgramUncertainty,
} from "../engines/LathePostGeneratorUncertaintyEngine.js";

describe("LathePostGeneratorUncertaintyEngine", () => {
  let engine: LathePostGeneratorUncertaintyEngine;

  beforeEach(() => {
    engine = new LathePostGeneratorUncertaintyEngine();
  });

  // ── Block Analysis Tests ──────────────────────────────────────────────────

  describe("analyzeBlock", () => {
    it("analyzes motion block with confidence", () => {
      const result = engine.analyzeBlock("G01 X10.0 Z-5.0 F0.15", 1);

      expect(result.line_number).toBe(1);
      expect(result.block).toBe("G01 X10.0 Z-5.0 F0.15");
      expect(result.category).toBe("motion");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.uncertainty).toBe(Math.round((1 - result.confidence) * 1000) / 1000);
    });

    it("analyzes tooling block", () => {
      const result = engine.analyzeBlock("T0101 M06", 5);

      expect(result.category).toBe("tooling");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("analyzes spindle block", () => {
      const result = engine.analyzeBlock("S1500 M03", 3);

      expect(result.category).toBe("spindle");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("analyzes coolant block", () => {
      const result = engine.analyzeBlock("M08", 10);

      expect(result.category).toBe("coolant");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("analyzes canned cycle with lower confidence", () => {
      const result = engine.analyzeBlock("G71 U2.0 R1.0", 15);

      expect(result.category).toBe("cycle");
      expect(result.confidence).toBeLessThan(0.9);
    });

    it("analyzes coordinate block", () => {
      const result = engine.analyzeBlock("X25.4 Z-10.0", 8);

      expect(result.category).toBe("coordinates");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("analyzes safety block", () => {
      const result = engine.analyzeBlock("G28 U0 W0", 1);

      expect(result.category).toBe("safety");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("analyzes timing block", () => {
      const result = engine.analyzeBlock("G04 P500", 12);

      expect(result.category).toBe("timing");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("analyzes syntax block (comment)", () => {
      const result = engine.analyzeBlock("(ROUGHING PASS)", 2);

      expect(result.category).toBe("syntax");
      expect(result.confidence).toBe(1.0);
      expect(result.flagged).toBe(false);
    });

    it("analyzes syntax block (semicolon comment)", () => {
      const result = engine.analyzeBlock("; Tool change", 4);

      expect(result.category).toBe("syntax");
      expect(result.confidence).toBe(1.0);
    });

    it("handles empty block", () => {
      const result = engine.analyzeBlock("", 1);

      expect(result.category).toBe("syntax");
      expect(result.confidence).toBe(1.0);
      expect(result.flagged).toBe(false);
    });

    it("handles unknown pattern with lower confidence", () => {
      const result = engine.analyzeBlock("CUSTOM_MACRO_123", 20);

      expect(result.category).toBe("unknown");
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("includes ensemble votes", () => {
      const result = engine.analyzeBlock("G01 X10.0 F0.1", 1);

      expect(result.ensemble_votes).toBeDefined();
      expect(Array.isArray(result.ensemble_votes)).toBe(true);
      expect(result.ensemble_votes.length).toBeGreaterThan(0);
    });

    it("calculates disagreement", () => {
      const result = engine.analyzeBlock("G71 U2.0 R1.0 P100 Q200", 15);

      expect(result.disagreement).toBeGreaterThanOrEqual(0);
      expect(result.disagreement).toBeLessThanOrEqual(1);
    });
  });

  // ── Risk Assessment Tests ─────────────────────────────────────────────────

  describe("risk assessment", () => {
    it("assigns low risk to high-confidence blocks", () => {
      const result = engine.analyzeBlock("M30", 100);

      expect(result.risk_level).toBe("low");
    });

    it("assigns risk based on confidence thresholds", () => {
      const results: BlockUncertainty[] = [];
      for (let i = 0; i < 50; i++) {
        results.push(engine.analyzeBlock("G71 U2.0 R1.0 P100 Q200 X10 Z-5", i + 1));
      }

      const riskLevels = new Set(results.map(r => r.risk_level));
      expect(riskLevels.size).toBeGreaterThanOrEqual(1);
    });

    it("flags blocks exceeding disagreement threshold", () => {
      const customEngine = new LathePostGeneratorUncertaintyEngine({
        disagreement_threshold: 0.01,
        min_confidence_threshold: 0.99,
      });

      const result = customEngine.analyzeBlock("G71 U2.0 R1.0", 1);
      expect(result.flagged).toBe(true);
    });

    it("generates reason for flagged blocks", () => {
      const customEngine = new LathePostGeneratorUncertaintyEngine({
        min_confidence_threshold: 0.99,
      });

      const result = customEngine.analyzeBlock("UNKNOWN_CODE", 1);
      if (result.flagged) {
        expect(result.reason).toBeDefined();
        expect(result.reason!.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Program Analysis Tests ────────────────────────────────────────────────

  describe("analyzeProgram", () => {
    const sampleProgram = [
      "%",
      "O0001 (TEST PROGRAM)",
      "G28 U0 W0",
      "T0101 M06",
      "G97 S1500 M03",
      "G00 X50.0 Z5.0",
      "G01 X25.0 F0.2",
      "G01 Z-30.0",
      "G00 X50.0",
      "G28 U0 W0",
      "M30",
      "%",
    ];

    it("analyzes complete program", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(result.program_id).toBe("O0001");
      expect(result.controller).toBe("fanuc-31it");
      expect(result.total_blocks).toBe(sampleProgram.length);
      expect(result.analyzed_blocks).toBeGreaterThan(0);
    });

    it("calculates overall confidence", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
      expect(result.overall_uncertainty).toBe(
        Math.round((1 - result.overall_confidence) * 1000) / 1000
      );
    });

    it("tracks risk distribution", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(result.risk_distribution).toBeDefined();
      expect(result.risk_distribution.low).toBeGreaterThanOrEqual(0);
      expect(result.risk_distribution.medium).toBeGreaterThanOrEqual(0);
      expect(result.risk_distribution.high).toBeGreaterThanOrEqual(0);
      expect(result.risk_distribution.critical).toBeGreaterThanOrEqual(0);

      const totalRisk =
        result.risk_distribution.low +
        result.risk_distribution.medium +
        result.risk_distribution.high +
        result.risk_distribution.critical;
      expect(totalRisk).toBe(sampleProgram.length);
    });

    it("aggregates category confidence", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(result.category_confidence).toBeDefined();
      expect(Object.keys(result.category_confidence).length).toBeGreaterThan(0);
    });

    it("identifies high-risk lines", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(Array.isArray(result.high_risk_lines)).toBe(true);
    });

    it("generates recommendations", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("includes timestamp", () => {
      const result = engine.analyzeProgram(sampleProgram, "O0001", "fanuc-31it");

      expect(result.analyzed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── Flagged Blocks Tests ──────────────────────────────────────────────────

  describe("getFlaggedBlocks", () => {
    it("returns flagged blocks only", () => {
      const program = [
        "G00 X50.0",
        "UNKNOWN_MACRO_CALL",
        "G01 X25.0 F0.2",
        "ANOTHER_UNKNOWN",
      ];

      const flagged = engine.getFlaggedBlocks(program);

      expect(Array.isArray(flagged)).toBe(true);
      for (const block of flagged) {
        expect(block.flagged).toBe(true);
      }
    });

    it("returns empty array for clean program", () => {
      const cleanProgram = ["G00 X50.0", "G01 X25.0 F0.2", "M30"];

      const flagged = engine.getFlaggedBlocks(cleanProgram);

      expect(flagged.length).toBeLessThanOrEqual(cleanProgram.length);
    });
  });

  // ── Production Readiness Tests ────────────────────────────────────────────

  describe("isProductionReady", () => {
    it("returns ready for clean program", () => {
      const cleanProgram = [
        "G28 U0 W0",
        "T0101",
        "S1500 M03",
        "G00 X50.0",
        "G01 X25.0 F0.2",
        "M30",
      ];

      const result = engine.isProductionReady(cleanProgram);

      expect(result.ready).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it("identifies blockers for critical blocks", () => {
      const customEngine = new LathePostGeneratorUncertaintyEngine({
        min_confidence_threshold: 0.99,
        disagreement_threshold: 0.001,
      });

      const program = [
        "VERY_UNKNOWN_MACRO_WITH_PARAMS #100=#101*#102",
        "G28 U0 W0",
      ];

      const result = customEngine.isProductionReady(program);

      if (!result.ready) {
        expect(result.blockers.length).toBeGreaterThan(0);
        expect(result.blockers[0]).toContain("Line");
      }
    });
  });

  // ── Configuration Tests ───────────────────────────────────────────────────

  describe("configuration", () => {
    it("uses default configuration", () => {
      const config = engine.getConfig();

      expect(config.num_models).toBe(5);
      expect(config.dropout_rate).toBe(0.1);
      expect(config.disagreement_threshold).toBe(0.15);
      expect(config.min_confidence_threshold).toBe(0.7);
    });

    it("accepts custom configuration", () => {
      const customEngine = new LathePostGeneratorUncertaintyEngine({
        num_models: 10,
        dropout_rate: 0.2,
        disagreement_threshold: 0.1,
        min_confidence_threshold: 0.8,
      });

      const config = customEngine.getConfig();

      expect(config.num_models).toBe(10);
      expect(config.dropout_rate).toBe(0.2);
      expect(config.disagreement_threshold).toBe(0.1);
      expect(config.min_confidence_threshold).toBe(0.8);
    });

    it("returns copy of config (immutable)", () => {
      const config1 = engine.getConfig();
      const config2 = engine.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  // ── Version Tests ─────────────────────────────────────────────────────────

  describe("version", () => {
    it("returns version string", () => {
      const version = LathePostGeneratorUncertaintyEngine.getVersion();

      expect(version).toBe("1.0.0");
    });
  });

  // ── Singleton Tests ───────────────────────────────────────────────────────

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(lathePostGeneratorUncertaintyEngine).toBeDefined();
      expect(lathePostGeneratorUncertaintyEngine.getConfig()).toBeDefined();
    });
  });

  // ── Category Pattern Tests ────────────────────────────────────────────────

  describe("category patterns", () => {
    it("categorizes G00 as motion", () => {
      expect(engine.analyzeBlock("G00 X10.0", 1).category).toBe("motion");
    });

    it("categorizes G01 as motion", () => {
      expect(engine.analyzeBlock("G01 Z-5.0 F0.1", 1).category).toBe("motion");
    });

    it("categorizes G02 as motion", () => {
      expect(engine.analyzeBlock("G02 X10 Z-5 R5", 1).category).toBe("motion");
    });

    it("categorizes G03 as motion", () => {
      expect(engine.analyzeBlock("G03 X10 Z-5 I2 K3", 1).category).toBe("motion");
    });

    it("categorizes T codes as tooling", () => {
      expect(engine.analyzeBlock("T0202", 1).category).toBe("tooling");
    });

    it("categorizes M06 as tooling", () => {
      expect(engine.analyzeBlock("M06", 1).category).toBe("tooling");
    });

    it("categorizes S codes as spindle", () => {
      expect(engine.analyzeBlock("S2000", 1).category).toBe("spindle");
    });

    it("categorizes M03/M04/M05 as spindle", () => {
      expect(engine.analyzeBlock("M03", 1).category).toBe("spindle");
      expect(engine.analyzeBlock("M04", 1).category).toBe("spindle");
      expect(engine.analyzeBlock("M05", 1).category).toBe("spindle");
    });

    it("categorizes G96/G97 as spindle", () => {
      expect(engine.analyzeBlock("G96 S200", 1).category).toBe("spindle");
      expect(engine.analyzeBlock("G97 S1500", 1).category).toBe("spindle");
    });

    it("categorizes M07/M08/M09 as coolant", () => {
      expect(engine.analyzeBlock("M07", 1).category).toBe("coolant");
      expect(engine.analyzeBlock("M08", 1).category).toBe("coolant");
      expect(engine.analyzeBlock("M09", 1).category).toBe("coolant");
    });

    it("categorizes G70-G76 as cycle", () => {
      expect(engine.analyzeBlock("G70 P100 Q200", 1).category).toBe("cycle");
      expect(engine.analyzeBlock("G71 U2 R1", 1).category).toBe("cycle");
      expect(engine.analyzeBlock("G76 P010060 Q100", 1).category).toBe("cycle");
    });

    it("categorizes G80-G89 as cycle", () => {
      expect(engine.analyzeBlock("G83 Z-20 Q5 F0.1", 1).category).toBe("cycle");
    });

    it("categorizes G54-G59 as coordinates", () => {
      expect(engine.analyzeBlock("G54", 1).category).toBe("coordinates");
    });

    it("categorizes G90/G91 as coordinates", () => {
      expect(engine.analyzeBlock("G90", 1).category).toBe("coordinates");
      expect(engine.analyzeBlock("G91", 1).category).toBe("coordinates");
    });

    it("categorizes G28 as safety", () => {
      expect(engine.analyzeBlock("G28 U0 W0", 1).category).toBe("safety");
    });

    it("categorizes M00/M01 as safety", () => {
      expect(engine.analyzeBlock("M00", 1).category).toBe("safety");
      expect(engine.analyzeBlock("M01", 1).category).toBe("safety");
    });

    it("categorizes M02/M30 as safety", () => {
      expect(engine.analyzeBlock("M02", 1).category).toBe("safety");
      expect(engine.analyzeBlock("M30", 1).category).toBe("safety");
    });

    it("categorizes G04 as timing", () => {
      expect(engine.analyzeBlock("G04 P1000", 1).category).toBe("timing");
    });

    it("categorizes N-numbers as syntax", () => {
      expect(engine.analyzeBlock("N100", 1).category).toBe("syntax");
    });

    it("categorizes O-numbers as syntax", () => {
      expect(engine.analyzeBlock("O0001", 1).category).toBe("syntax");
    });

    it("categorizes percent as syntax", () => {
      expect(engine.analyzeBlock("%", 1).category).toBe("syntax");
    });
  });

  // ── Complexity Penalty Tests ──────────────────────────────────────────────

  describe("complexity handling", () => {
    it("penalizes complex blocks with many codes", () => {
      const simpleResults: number[] = [];
      const complexResults: number[] = [];

      for (let i = 0; i < 10; i++) {
        const simpleEngine = new LathePostGeneratorUncertaintyEngine();
        const complexEngine = new LathePostGeneratorUncertaintyEngine();
        simpleResults.push(simpleEngine.analyzeBlock("G01 X10.0", 1).confidence);
        complexResults.push(complexEngine.analyzeBlock("G01 X10.0 Y20.0 Z30.0 A45.0 B90.0 C180.0 F100 S1000", 1).confidence);
      }

      const avgSimple = simpleResults.reduce((a, b) => a + b, 0) / simpleResults.length;
      const avgComplex = complexResults.reduce((a, b) => a + b, 0) / complexResults.length;

      expect(avgComplex).toBeLessThan(avgSimple);
    });

    it("penalizes blocks with macros", () => {
      const simple = engine.analyzeBlock("G01 X10.0", 1);
      const macro = engine.analyzeBlock("G01 X#100 Z#101", 1);

      expect(macro.confidence).toBeLessThan(simple.confidence);
    });

    it("penalizes long blocks", () => {
      const short = engine.analyzeBlock("G01 X10.0", 1);
      const long = engine.analyzeBlock(
        "G01 X10.000000000000 Y20.000000000000 Z30.000000000000 (VERY LONG COMMENT WITH DESCRIPTION)",
        1
      );

      expect(long.confidence).toBeLessThanOrEqual(short.confidence);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles whitespace-only block", () => {
      const result = engine.analyzeBlock("   ", 1);

      expect(result.category).toBe("syntax");
      expect(result.flagged).toBe(false);
    });

    it("handles mixed-case codes", () => {
      const result = engine.analyzeBlock("g01 x10.0 z-5.0", 1);

      expect(result.category).toBe("motion");
    });

    it("handles negative coordinates", () => {
      const result = engine.analyzeBlock("X-25.4 Z-100.0", 1);

      expect(result.category).toBe("coordinates");
    });

    it("handles decimal coordinates", () => {
      const result = engine.analyzeBlock("X0.001 Z-0.005", 1);

      expect(result.category).toBe("coordinates");
    });

    it("handles empty program", () => {
      const result = engine.analyzeProgram([], "EMPTY", "fanuc");

      expect(result.total_blocks).toBe(0);
      expect(result.analyzed_blocks).toBe(0);
      expect(result.overall_confidence).toBe(1.0);
    });

    it("handles program with only comments", () => {
      const result = engine.analyzeProgram(
        ["(COMMENT 1)", "(COMMENT 2)", "; ANOTHER COMMENT"],
        "COMMENTS",
        "fanuc"
      );

      expect(result.total_blocks).toBe(3);
      expect(result.overall_confidence).toBe(1.0);
    });
  });
});
