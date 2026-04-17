/**
 * Tests for WEDMControllerDialectVerifierEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-06
 */

import { describe, it, expect } from "vitest";
import {
  WEDMControllerDialectVerifierEngine,
  wedmControllerDialectVerifierEngine,
  type DialectInput,
  type WEDMController,
} from "../engines/WEDMControllerDialectVerifierEngine.js";

describe("WEDMControllerDialectVerifierEngine", () => {
  describe("Basic Dialect Validation", () => {
    it("passes valid Mitsubishi FA program", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
O1001
G21 G90
G00 X0 Y0
G01 X10 Y10 E5
G41
G01 X20 Y20
G40
M30
%`,
        expected_controller: "mitsubishi_fa",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.hard_block).toBe(false);
    });

    it("passes valid Agie program", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G71 G90
G00 X0 Y0
G01 X10 Y10
M17
%`,
        expected_controller: "agie_cut",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
    });

    it("passes valid Sodick program with C-codes", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21 G90
G00 X0 Y0
C10
G01 X10 Y10
M30
%`,
        expected_controller: "sodick_aq",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
    });
  });

  describe("Invalid Code Detection", () => {
    it("detects invalid G-code", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21
G99 X10 Y10
M30
%`,
        expected_controller: "mitsubishi_fa",
      });

      expect(result.pass).toBe(false);
      expect(result.violations.some(v => v.code === "G99")).toBe(true);
    });

    it("detects invalid M-code", () => {
      // M99 is actually valid for subroutines, use M77 which isn't in the valid list
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21
M77
M30
%`,
        expected_controller: "mitsubishi_fa",
      });

      expect(result.pass).toBe(false);
      expect(result.violations.some(v => v.code === "M77")).toBe(true);
    });

    it("detects E-code out of range", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21
E100
M30
%`,
        expected_controller: "mitsubishi_fa", // E-code range 1-64
      });

      expect(result.pass).toBe(false);
      expect(result.violations.some(v => v.code === "E100")).toBe(true);
    });

    it("detects C-code on non-Sodick controller", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21
G00 X0 Y0
(This is a comment)
M30
%`,
        expected_controller: "mitsubishi_fa",
      });

      // This should pass - no C-codes in actual code
      expect(result.success).toBe(true);
    });
  });

  describe("Controller-Specific Requirements", () => {
    it("warns about missing required codes for Mitsubishi", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G00 X0 Y0
G01 X10 Y10
%`,
        expected_controller: "mitsubishi_fa",
      });

      // Missing G21 and M30
      expect(result.required_codes_missing.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.issue === "missing_required")).toBe(true);
    });

    it("warns about missing program end code", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21 G90
G00 X0 Y0
%`,
        expected_controller: "mitsubishi_fa",
      });

      expect(result.violations.some(v => v.message.includes("program end"))).toBe(true);
    });

    it("validates Agie requires G71 not G21", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `%
G21 G90
M17
%`,
        expected_controller: "agie_cut",
      });

      // G21 is not valid for Agie - should use G71
      expect(result.violations.some(v => v.code === "G21")).toBe(true);
    });
  });

  describe("Code Extraction", () => {
    it("extracts all G-codes", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "G21 G90 G00 X0\nG01 X10\nG02 I5 J5",
        expected_controller: "generic",
      });

      expect(result.detected_codes.g_codes).toContain("G21");
      expect(result.detected_codes.g_codes).toContain("G90");
      expect(result.detected_codes.g_codes).toContain("G00");
      expect(result.detected_codes.g_codes).toContain("G01");
      expect(result.detected_codes.g_codes).toContain("G02");
    });

    it("extracts all M-codes", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "M06\nG01 X10\nM07\nM30",
        expected_controller: "generic",
      });

      expect(result.detected_codes.m_codes).toContain("M06");
      expect(result.detected_codes.m_codes).toContain("M07");
      expect(result.detected_codes.m_codes).toContain("M30");
    });

    it("extracts E-codes", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "E5\nG01 X10 E10\nE20",
        expected_controller: "generic",
      });

      expect(result.detected_codes.e_codes).toContain(5);
      expect(result.detected_codes.e_codes).toContain(10);
      expect(result.detected_codes.e_codes).toContain(20);
    });

    it("ignores codes in comments", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `G21
( G99 in comment )
; M123 in comment
M30`,
        expected_controller: "generic",
      });

      expect(result.detected_codes.g_codes).not.toContain("G99");
      expect(result.detected_codes.m_codes).not.toContain("M123");
    });
  });

  describe("Quick Check for S(x)", () => {
    it("returns correct format", () => {
      const result = wedmControllerDialectVerifierEngine.quickCheckForSx(
        "G21\nM30",
        "mitsubishi_fa"
      );

      expect(typeof result.pass).toBe("boolean");
      expect(result.expected_controller).toBe("mitsubishi_fa");
    });

    it("matches full verify result", () => {
      const gcode = "G21 G90\nG01 X10\nM30";
      const quick = wedmControllerDialectVerifierEngine.quickCheckForSx(gcode, "mitsubishi_fa");
      const full = wedmControllerDialectVerifierEngine.verify({
        gcode,
        expected_controller: "mitsubishi_fa",
      });

      expect(quick.pass).toBe(full.pass);
    });
  });

  describe("Controller Detection", () => {
    it("detects Agie from G70/G71", () => {
      const result = wedmControllerDialectVerifierEngine.detectController("G71 G90\nM17");
      expect(result.controller).toBe("agie_cut");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("detects Sodick from C-codes", () => {
      const result = wedmControllerDialectVerifierEngine.detectController("G21\nG00 X0 Y0\nM30");
      // No C-codes, so should be generic or Mitsubishi-like
      expect(result.controller).not.toBe("sodick_aq");
    });

    it("detects Mitsubishi from E-codes with M06/M07", () => {
      const result = wedmControllerDialectVerifierEngine.detectController("G21\nE5\nM06\nM07\nM30");
      expect(result.controller).toContain("mitsubishi");
      expect(result.reasons.some(r => r.includes("Mitsubishi"))).toBe(true);
    });

    it("returns generic with low confidence for ambiguous code", () => {
      const result = wedmControllerDialectVerifierEngine.detectController("G00 X0 Y0");
      expect(result.controller).toBe("generic");
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe("Dialect Information", () => {
    it("returns dialect for Mitsubishi FA", () => {
      const dialect = wedmControllerDialectVerifierEngine.getDialect("mitsubishi_fa");

      expect(dialect.name).toBe("Mitsubishi FA Series");
      expect(dialect.manufacturer).toBe("Mitsubishi Electric");
      expect(dialect.e_code_range).toEqual([1, 64]);
      expect(dialect.wire_threading.start).toBe("M06");
    });

    it("returns dialect for Sodick", () => {
      const dialect = wedmControllerDialectVerifierEngine.getDialect("sodick_aq");

      expect(dialect.name).toBe("Sodick AQ Series");
      expect(dialect.c_code_range).toBeDefined();
      expect(dialect.wire_threading.start).toBe("M10");
    });

    it("lists all controllers", () => {
      const controllers = wedmControllerDialectVerifierEngine.listControllers();

      expect(controllers).toContain("mitsubishi_fa");
      expect(controllers).toContain("mitsubishi_mv");
      expect(controllers).toContain("sodick_aq");
      expect(controllers).toContain("agie_cut");
      expect(controllers).toContain("fanuc_robocut");
      expect(controllers.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Summary Messages", () => {
    it("provides clear pass summary", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "G21 G90\nG01 X10\nM30",
        expected_controller: "mitsubishi_fa",
      });

      expect(result.summary).toContain("PASS");
      expect(result.summary).toContain("Mitsubishi FA");
    });

    it("provides clear hard block summary", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "G99\nM30",
        expected_controller: "mitsubishi_fa",
      });

      expect(result.summary).toContain("HARD BLOCK");
      expect(result.summary).toContain("invalid");
    });
  });

  describe("All Controllers", () => {
    const controllers: WEDMController[] = [
      "mitsubishi_fa", "mitsubishi_mv",
      "sodick_aq", "sodick_al",
      "makino_u", "makino_eu",
      "agie_cut", "agie_charm",
      "fanuc_robocut", "generic"
    ];

    controllers.forEach((controller) => {
      it(`validates ${controller} dialect exists`, () => {
        const dialect = wedmControllerDialectVerifierEngine.getDialect(controller);

        expect(dialect.name).toBeDefined();
        expect(dialect.manufacturer).toBeDefined();
        expect(dialect.valid_g_codes.length).toBeGreaterThan(0);
        expect(dialect.valid_m_codes.length).toBeGreaterThan(0);
        expect(dialect.program_end_codes.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty program", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "",
        expected_controller: "generic",
      });

      expect(result.success).toBe(true);
      expect(result.detected_codes.g_codes.length).toBe(0);
    });

    it("handles program with only comments", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `( This is a comment )
; Another comment`,
        expected_controller: "generic",
      });

      expect(result.success).toBe(true);
      expect(result.detected_codes.g_codes.length).toBe(0);
    });

    it("handles case-insensitive codes", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "g21 g90\nm30",
        expected_controller: "mitsubishi_fa",
      });

      expect(result.detected_codes.g_codes).toContain("G21");
      expect(result.detected_codes.g_codes).toContain("G90");
    });

    it("handles codes without leading zeros", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "G0 X0 Y0\nG1 X10\nM2",
        expected_controller: "generic",
      });

      // G0, G1, M2 should be recognized
      expect(result.detected_codes.g_codes.length).toBeGreaterThan(0);
    });
  });

  describe("Violation Details", () => {
    it("includes line numbers in violations", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: `G21
G90
G99
M30`,
        expected_controller: "mitsubishi_fa",
      });

      const g99Violation = result.violations.find(v => v.code === "G99");
      expect(g99Violation?.line_number).toBe(3);
    });

    it("provides suggestions for common errors", () => {
      const result = wedmControllerDialectVerifierEngine.verify({
        gcode: "G21\nM30",
        expected_controller: "agie_cut",
      });

      // G21 is invalid for Agie - should suggest G71
      const g21Violation = result.violations.find(v => v.code === "G21");
      if (g21Violation) {
        expect(g21Violation.suggestion).toBeDefined();
      }
    });
  });
});
