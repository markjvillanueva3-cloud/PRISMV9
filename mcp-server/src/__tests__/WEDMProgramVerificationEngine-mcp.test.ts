/**
 * U-P2PFS14: WEDMProgramVerificationEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_program_verify, wedm_program_gate, wedm_quick_verify
 */
import { describe, it, expect } from "vitest";
import { wedmProgramVerificationEngine } from "../engines/WEDMProgramVerificationEngine.js";

describe("WEDMProgramVerificationEngine MCP Wiring (U-P2PFS14)", () => {
  const validProgram = `
G21
G90 G54
M6
G41 D01 X10 Y10
G1 X50 Y50 F100
G40 X60 Y60
M7
M30
`;

  const invalidProgram = `
G21
G90 G54
M6
G41 D01 X10 Y10
G1 X50 Y50 F100
; Missing G40 cancel
M7
; Missing M30
`;

  describe("verify()", () => {
    it("returns VerificationResult structure for valid program", () => {
      const result = wedmProgramVerificationEngine.verify({
        gcode: validProgram,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("error_count");
      expect(result).toHaveProperty("warning_count");
      expect(result).toHaveProperty("safety_score_contribution");
      expect(result).toHaveProperty("checks_performed");
      expect(result).toHaveProperty("lines_analyzed");
      expect(result).toHaveProperty("summary");
    });

    it("passes valid program", () => {
      const result = wedmProgramVerificationEngine.verify({
        gcode: validProgram,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.error_count).toBe(0);
      expect(result.hard_block).toBe(false);
      expect(result.safety_score_contribution).toBe(0.1);
    });

    it("fails invalid program with errors", () => {
      const result = wedmProgramVerificationEngine.verify({
        gcode: invalidProgram,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(false);
      expect(result.error_count).toBeGreaterThan(0);
      expect(result.hard_block).toBe(true);
      expect(result.safety_score_contribution).toBe(0.0);
    });

    it("validates offset pairing (G41/G42 must have G40)", () => {
      const unclosedOffset = `G21\nG41 D01 X10 Y10\nG1 X50 Y50\nM30`;
      const result = wedmProgramVerificationEngine.verify({
        gcode: unclosedOffset,
        controller: "generic",
        expected_units: "metric",
      });

      const offsetIssue = result.issues.find((i) => i.check === "offset_pairing");
      expect(offsetIssue).toBeDefined();
      expect(offsetIssue?.severity).toBe("error");
    });

    it("validates program end code present", () => {
      const noEnd = `G21\nG1 X10 Y10`;
      const result = wedmProgramVerificationEngine.verify({
        gcode: noEnd,
        controller: "generic",
        expected_units: "metric",
      });

      const endIssue = result.issues.find((i) => i.check === "program_end");
      expect(endIssue).toBeDefined();
      expect(endIssue?.severity).toBe("error");
    });

    it("validates unit consistency", () => {
      const wrongUnits = `G20\nG1 X10 Y10\nM30`; // G20 imperial but expected metric
      const result = wedmProgramVerificationEngine.verify({
        gcode: wrongUnits,
        controller: "generic",
        expected_units: "metric",
      });

      const unitIssue = result.issues.find((i) => i.check === "unit_consistency");
      expect(unitIssue).toBeDefined();
      expect(unitIssue?.severity).toBe("error");
    });

    it("validates E-codes against valid set", () => {
      const badECode = `G21\nE99\nM30`;
      const result = wedmProgramVerificationEngine.verify({
        gcode: badECode,
        controller: "generic",
        expected_units: "metric",
        valid_e_codes: [1, 2, 3, 4, 5],
      });

      const ecodeIssue = result.issues.find((i) => i.check === "e_code_validity");
      expect(ecodeIssue).toBeDefined();
      expect(ecodeIssue?.severity).toBe("error");
    });

    it("validates coordinate range against travel limits", () => {
      const outOfRange = `G21\nX500 Y500\nM30`;
      const result = wedmProgramVerificationEngine.verify({
        gcode: outOfRange,
        controller: "generic",
        expected_units: "metric",
        travel_limits: { x_min: 0, x_max: 400, y_min: 0, y_max: 400 },
      });

      const rangeIssue = result.issues.find((i) => i.check === "coordinate_range");
      expect(rangeIssue).toBeDefined();
      expect(rangeIssue?.severity).toBe("error");
    });

    it("respects skip_checks parameter", () => {
      const unclosedOffset = `G21\nG41 D01 X10 Y10\nG1 X50 Y50\nM30`;
      const result = wedmProgramVerificationEngine.verify({
        gcode: unclosedOffset,
        controller: "generic",
        expected_units: "metric",
        skip_checks: ["offset_pairing"],
      });

      const offsetIssue = result.issues.find((i) => i.check === "offset_pairing");
      expect(offsetIssue).toBeUndefined();
      expect(result.checks_performed).not.toContain("offset_pairing");
    });
  });

  describe("gate()", () => {
    it("returns allow/deny with reason and full result", () => {
      const gate = wedmProgramVerificationEngine.gate({
        gcode: validProgram,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(gate).toHaveProperty("allow");
      expect(gate).toHaveProperty("reason");
      expect(gate).toHaveProperty("result");
      expect(gate.allow).toBe(true);
      expect(typeof gate.reason).toBe("string");
    });

    it("denies invalid program", () => {
      const gate = wedmProgramVerificationEngine.gate({
        gcode: invalidProgram,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(gate.allow).toBe(false);
      expect(gate.reason).toContain("FAILED");
    });
  });

  describe("quickVerify()", () => {
    it("returns verification result with minimal input", () => {
      const result = wedmProgramVerificationEngine.quickVerify(validProgram);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("issues");
      expect(result.pass).toBe(true);
    });

    it("defaults to metric units", () => {
      const result = wedmProgramVerificationEngine.quickVerify("G21\nM30");
      expect(result.pass).toBe(true);
    });
  });

  describe("utility methods", () => {
    it("getSupportedControllers returns array", () => {
      const controllers = wedmProgramVerificationEngine.getSupportedControllers();
      expect(Array.isArray(controllers)).toBe(true);
      expect(controllers.length).toBeGreaterThan(0);
      expect(controllers).toContain("mitsubishi_fa");
      expect(controllers).toContain("sodick_aq");
      expect(controllers).toContain("generic");
    });

    it("getControllerCodes returns dialect codes", () => {
      const codes = wedmProgramVerificationEngine.getControllerCodes("mitsubishi_fa");
      expect(codes).toHaveProperty("program_end");
      expect(codes).toHaveProperty("wire_thread");
      expect(codes).toHaveProperty("offset_left");
      expect(codes.offset_left).toBe("G41");
    });
  });
});
