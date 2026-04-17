/**
 * LathePostRegressionTestGeneratorEngine Tests — LATHE-MASTER U-LTH19
 *
 * Tests regression test generation from G-code samples.
 */

import { describe, it, expect } from "vitest";
import {
  LathePostRegressionTestGeneratorEngine,
  RegressionTest,
} from "../engines/LathePostRegressionTestGeneratorEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const sampleFanucProgram = [
  "O0001",
  "(FANUC SAMPLE PROGRAM)",
  "N10 G28 U0 W0",
  "N20 T0101",
  "N30 G97 S1200 M03",
  "N40 G00 X50. Z5.",
  "N50 G01 Z-30. F0.15",
  "N60 G00 X100. Z50.",
  "N70 M30",
];

const sampleOkumaProgram = [
  "O1234",
  "(OKUMA OSP-P300L)",
  "N10 G28",
  "N20 T0202",
  "N30 S800 M03",
  "N40 G00 X80. Z2.",
  "N50 G71 U2.0 R0.5",
  "N60 G71 P100 Q200 U0.5 W0.1 F0.2",
  "N100 G00 X30.",
  "N110 G01 Z0 F0.1",
  "N120 X40. Z-10.",
  "N200 X80.",
  "N210 G00 X200. Z100.",
  "N220 M30",
];

const minimalProgram = [
  "O9999",
  "G00 X10.",
  "M30",
];

const programWithCycles = [
  "O0002",
  "T0303",
  "S600 M03",
  "G76 P010060 Q100 R0.05",
  "G76 X29.0 Z-20. P500 Q150 F2.0",
  "G83 Z-25. R5. Q5. F0.1",
  "G80",
  "M30",
];

// ── generateTest Tests ──────────────────────────────────────────────────────

describe("LathePostRegressionTestGeneratorEngine", () => {
  describe("generateTest", () => {
    it("generates test from valid Fanuc program", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        test_name: "Fanuc Sample Test",
      });

      expect(result.success).toBe(true);
      expect(result.test).toBeDefined();
      expect(result.test!.controller).toBe("fanuc-31it");
      expect(result.test!.name).toBe("Fanuc Sample Test");
      expect(result.patterns_found).toBeGreaterThan(0);
    });

    it("extracts program start pattern", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const startPattern = result.test!.patterns.find(p => p.type === "program_start");
      expect(startPattern).toBeDefined();
      expect(startPattern!.samples).toContain("O0001");
      expect(startPattern!.required).toBe(true);
    });

    it("extracts program end pattern", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const endPattern = result.test!.patterns.find(p => p.type === "program_end");
      expect(endPattern).toBeDefined();
      expect(endPattern!.samples).toContain("M30");
    });

    it("extracts tool change pattern", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const toolPattern = result.test!.patterns.find(p => p.type === "tool_change");
      expect(toolPattern).toBeDefined();
      expect(toolPattern!.samples).toContain("T0101");
    });

    it("extracts spindle command pattern", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const spindlePattern = result.test!.patterns.find(p => p.type === "spindle_command");
      expect(spindlePattern).toBeDefined();
      expect(spindlePattern!.samples.some(s => s.includes("S1200"))).toBe(true);
    });

    it("extracts canned cycle patterns", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: programWithCycles,
        controller: "fanuc-31it",
      });

      const cyclePattern = result.test!.patterns.find(p => p.type === "canned_cycle");
      expect(cyclePattern).toBeDefined();
      expect(cyclePattern!.samples.some(s => s.includes("G76") || s.includes("G83"))).toBe(true);
    });

    it("excludes coordinates by default", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        include_coordinates: false,
      });

      const coordPattern = result.test!.patterns.find(p => p.type === "coordinate_move");
      expect(coordPattern).toBeUndefined();
    });

    it("includes coordinates when requested", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        include_coordinates: true,
      });

      const coordPattern = result.test!.patterns.find(p => p.type === "coordinate_move");
      expect(coordPattern).toBeDefined();
    });

    it("excludes comments by default", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        include_comments: false,
      });

      const commentPattern = result.test!.patterns.find(p => p.type === "comment");
      expect(commentPattern).toBeUndefined();
    });

    it("includes comments when requested", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        include_comments: true,
      });

      const commentPattern = result.test!.patterns.find(p => p.type === "comment");
      expect(commentPattern).toBeDefined();
    });

    it("extracts critical blocks", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      expect(result.test!.critical_blocks.length).toBeGreaterThan(0);
      expect(result.test!.critical_blocks).toContain("O0001");
    });

    it("handles empty input", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: [],
        controller: "fanuc-31it",
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Empty G-code input");
    });

    it("warns on missing program start", () => {
      const noStart = ["G00 X10.", "M30"];
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: noStart,
        controller: "fanuc-31it",
      });

      expect(result.warnings.some(w => w.includes("program start"))).toBe(true);
    });

    it("warns on missing program end", () => {
      const noEnd = ["O0001", "G00 X10."];
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: noEnd,
        controller: "fanuc-31it",
      });

      expect(result.warnings.some(w => w.includes("program end"))).toBe(true);
    });

    it("generates vitest code", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
        test_name: "Fanuc Test",
      });

      expect(result.test_code).toBeDefined();
      expect(result.test_code).toContain('import { describe, it, expect }');
      expect(result.test_code).toContain('describe("Fanuc Test"');
    });

    it("includes timestamp in generated test", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      expect(result.test!.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("handles Okuma program", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleOkumaProgram,
        controller: "okuma-osp-p300l",
      });

      expect(result.success).toBe(true);
      expect(result.test!.controller).toBe("okuma-osp-p300l");

      const cyclePattern = result.test!.patterns.find(p => p.type === "canned_cycle");
      expect(cyclePattern).toBeDefined();
      expect(cyclePattern!.samples.some(s => s.includes("G71"))).toBe(true);
    });
  });

  // ── runRegressionTest Tests ───────────────────────────────────────────────

  describe("runRegressionTest", () => {
    it("passes when G-code matches test", () => {
      const genResult = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const runResult = LathePostRegressionTestGeneratorEngine.runRegressionTest(
        sampleFanucProgram,
        genResult.test!
      );

      expect(runResult.passed).toBe(true);
      expect(runResult.failures.length).toBe(0);
    });

    it("fails when required pattern missing", () => {
      const genResult = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const modifiedProgram = sampleFanucProgram.filter(l => !l.includes("M30"));

      const runResult = LathePostRegressionTestGeneratorEngine.runRegressionTest(
        modifiedProgram,
        genResult.test!
      );

      expect(runResult.passed).toBe(false);
      expect(runResult.failures.some(f => f.includes("program_end") || f.includes("M30"))).toBe(true);
    });

    it("fails when critical block missing", () => {
      const genResult = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const differentProgram = [
        "O9999",
        "G00 X10.",
        "M30",
      ];

      const runResult = LathePostRegressionTestGeneratorEngine.runRegressionTest(
        differentProgram,
        genResult.test!
      );

      expect(runResult.failures.some(f => f.includes("critical block"))).toBe(true);
    });

    it("fails when program order is wrong", () => {
      const genResult = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: minimalProgram,
        controller: "fanuc-31it",
      });

      const wrongOrder = [
        "M30",
        "G00 X10.",
        "O9999",
      ];

      const runResult = LathePostRegressionTestGeneratorEngine.runRegressionTest(
        wrongOrder,
        genResult.test!
      );

      expect(runResult.passed).toBe(false);
      expect(runResult.failures.some(f => f.includes("order") || f.includes("before"))).toBe(true);
    });

    it("warns on missing optional patterns", () => {
      const genResult = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const runResult = LathePostRegressionTestGeneratorEngine.runRegressionTest(
        minimalProgram,
        genResult.test!
      );

      expect(runResult.warnings.length).toBeGreaterThan(0);
    });
  });

  // ── generateTestSuite Tests ───────────────────────────────────────────────

  describe("generateTestSuite", () => {
    it("generates tests from multiple samples", () => {
      const samples = [
        { gcode: sampleFanucProgram, controller: "fanuc-31it", name: "Fanuc Test" },
        { gcode: sampleOkumaProgram, controller: "okuma-osp", name: "Okuma Test" },
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTestSuite(samples);

      expect(result.tests.length).toBe(2);
      expect(result.combined_code).toContain("Fanuc Test");
      expect(result.combined_code).toContain("Okuma Test");
    });

    it("skips failed test generations", () => {
      const samples = [
        { gcode: sampleFanucProgram, controller: "fanuc-31it", name: "Valid" },
        { gcode: [], controller: "empty", name: "Empty" },
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTestSuite(samples);

      expect(result.tests.length).toBe(1);
      expect(result.tests[0].name).toBe("Valid");
    });
  });

  // ── Static Method Tests ───────────────────────────────────────────────────

  describe("getVersion", () => {
    it("returns version string", () => {
      const version = LathePostRegressionTestGeneratorEngine.getVersion();
      expect(version).toBe("1.0.0");
    });
  });

  describe("getPatternTypes", () => {
    it("returns all pattern types", () => {
      const types = LathePostRegressionTestGeneratorEngine.getPatternTypes();

      expect(types).toContain("program_start");
      expect(types).toContain("program_end");
      expect(types).toContain("tool_change");
      expect(types).toContain("spindle_command");
      expect(types).toContain("canned_cycle");
      expect(types.length).toBeGreaterThanOrEqual(10);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles program with only comments", () => {
      const commentsOnly = [
        "(COMMENT 1)",
        "(COMMENT 2)",
        "; Another comment",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: commentsOnly,
        controller: "test",
        include_comments: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes("program start"))).toBe(true);
    });

    it("handles percent sign program start", () => {
      const percentStart = [
        "%",
        "O0001",
        "M30",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: percentStart,
        controller: "fanuc-31it",
      });

      const startPattern = result.test!.patterns.find(p => p.type === "program_start");
      expect(startPattern).toBeDefined();
    });

    it("handles M02 as program end", () => {
      const m02End = [
        "O0001",
        "G00 X10.",
        "M02",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: m02End,
        controller: "test",
      });

      const endPattern = result.test!.patterns.find(p => p.type === "program_end");
      expect(endPattern).toBeDefined();
      expect(endPattern!.samples).toContain("M02");
    });

    it("handles M99 as program end (subprogram)", () => {
      const m99End = [
        "O9001",
        "G00 X10.",
        "M99",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: m99End,
        controller: "test",
      });

      const endPattern = result.test!.patterns.find(p => p.type === "program_end");
      expect(endPattern).toBeDefined();
      expect(endPattern!.samples).toContain("M99");
    });

    it("handles multiple tool changes", () => {
      const multiTool = [
        "O0001",
        "T0101",
        "G00 X10.",
        "T0202",
        "G00 X20.",
        "T0303",
        "M30",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: multiTool,
        controller: "fanuc-31it",
      });

      const toolPattern = result.test!.patterns.find(p => p.type === "tool_change");
      expect(toolPattern).toBeDefined();
      expect(toolPattern!.samples.length).toBe(3);
      expect(toolPattern!.line_numbers.length).toBe(3);
    });

    it("handles coolant commands", () => {
      const withCoolant = [
        "O0001",
        "M08",
        "G00 X10.",
        "M09",
        "M30",
      ];

      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: withCoolant,
        controller: "fanuc-31it",
      });

      const coolantPattern = result.test!.patterns.find(p => p.type === "coolant");
      expect(coolantPattern).toBeDefined();
      expect(coolantPattern!.samples.some(s => s.includes("M08") || s.includes("M09"))).toBe(true);
    });

    it("handles mixed G-code and threading cycles", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: programWithCycles,
        controller: "fanuc-31it",
      });

      expect(result.success).toBe(true);
      expect(result.test!.patterns.length).toBeGreaterThan(3);
    });

    it("records line numbers correctly", () => {
      const result = LathePostRegressionTestGeneratorEngine.generateTest({
        gcode: sampleFanucProgram,
        controller: "fanuc-31it",
      });

      const startPattern = result.test!.patterns.find(p => p.type === "program_start");
      expect(startPattern!.line_numbers[0]).toBe(1);

      const endPattern = result.test!.patterns.find(p => p.type === "program_end");
      expect(endPattern!.line_numbers[0]).toBe(sampleFanucProgram.length);
    });
  });
});
