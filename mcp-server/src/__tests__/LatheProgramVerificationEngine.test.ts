/**
 * LatheProgramVerificationEngine Tests
 *
 * U-LTH38: G-code verification and simulation tests
 */

import { describe, it, expect } from "vitest";
import {
  latheProgramVerificationEngine,
  type MachineLimits,
} from "../engines/LatheProgramVerificationEngine.js";

describe("LatheProgramVerificationEngine", () => {
  const validProgram = `
O1001
(TEST PART)
G28 U0 W0
G50 S3000
T0101
G96 S150 M03
G00 X52 Z2
G01 X50 Z0 F0.2
G01 Z-30
G00 X100 Z100
M05
M30
  `.trim();

  describe("verify()", () => {
    it("verifies valid program", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.verification_id).toMatch(/^verify_\d+_\d+$/);
      expect(result.passed).toBe(true);
      expect(result.error_count).toBe(0);
    });

    it("calculates verification score", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("counts blocks and motions", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.total_blocks).toBeGreaterThan(0);
      expect(result.motion_blocks).toBeGreaterThan(0);
    });

    it("detects tool changes", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.tool_changes).toBe(1);
    });

    it("tracks processing time", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Syntax Checking", () => {
    it("detects missing program end", () => {
      const noEnd = `
O1001
G00 X50 Z2
G01 X45 Z0 F0.2
      `.trim();

      const result = latheProgramVerificationEngine.verify(noEnd);

      expect(result.issues.some(i => i.code === "NO_PROG_END")).toBe(true);
    });

    it("warns about unknown G codes", () => {
      const unknownG = `
O1001
G199 X50
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(unknownG);

      expect(result.issues.some(i => i.code === "UNKNOWN_G_CODE")).toBe(true);
    });

    it("passes valid syntax", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      const syntaxErrors = result.issues.filter(
        i => i.severity === "error" && i.code.includes("SYNTAX")
      );
      expect(syntaxErrors.length).toBe(0);
    });
  });

  describe("Axis Limits", () => {
    it("detects X axis limit violation", () => {
      const overLimit = `
O1001
G00 X500 Z0
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overLimit, {
        x_max_mm: 300
      });

      expect(result.issues.some(i => i.code === "X_AXIS_LIMIT")).toBe(true);
      expect(result.safety_checks.axis_limits_ok).toBe(false);
    });

    it("detects Z axis limit violation", () => {
      const overLimit = `
O1001
G00 X50 Z-500
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overLimit, {
        z_min_mm: -200
      });

      expect(result.issues.some(i => i.code === "Z_AXIS_LIMIT")).toBe(true);
    });

    it("passes within limits", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.safety_checks.axis_limits_ok).toBe(true);
    });
  });

  describe("Spindle Limits", () => {
    it("detects spindle over-speed", () => {
      const overSpeed = `
O1001
G97 S5000 M03
G00 X50 Z2
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overSpeed, {
        spindle_max_rpm: 4000
      });

      expect(result.issues.some(i => i.code === "SPINDLE_OVER_MAX")).toBe(true);
      expect(result.safety_checks.spindle_limits_ok).toBe(false);
    });

    it("tracks maximum spindle speed", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.simulation.max_spindle_rpm).toBeGreaterThan(0);
    });
  });

  describe("Tool Checking", () => {
    it("detects tool out of range", () => {
      const badTool = `
O1001
T2020
G00 X50 Z2
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(badTool, {
        max_tools: 12
      });

      expect(result.issues.some(i => i.code === "TOOL_OUT_OF_RANGE")).toBe(true);
    });

    it("accepts valid tool numbers", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      const toolErrors = result.issues.filter(i => i.code === "TOOL_OUT_OF_RANGE");
      expect(toolErrors.length).toBe(0);
    });
  });

  describe("Simulation Results", () => {
    it("tracks axis extremes", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.simulation.max_x).toBeGreaterThanOrEqual(0);
      expect(result.simulation.max_z).toBeGreaterThanOrEqual(result.simulation.min_z);
    });

    it("calculates total distance", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.simulation.total_distance_mm).toBeGreaterThan(0);
    });

    it("estimates execution time", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.simulation.estimated_time_sec).toBeGreaterThanOrEqual(0);
    });

    it("tracks max feed rate", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.simulation.max_feed_rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("checkSyntaxOnly()", () => {
    it("validates correct syntax", () => {
      const result = latheProgramVerificationEngine.checkSyntaxOnly(validProgram);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("detects syntax errors", () => {
      const invalid = `
G00 X50
G01 Z-30 F0.2
      `.trim();

      const result = latheProgramVerificationEngine.checkSyntaxOnly(invalid);

      // Should detect missing program end
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Issue Details", () => {
    it("includes line number in issues", () => {
      const overLimit = `
O1001
G00 X500 Z0
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overLimit, {
        x_max_mm: 300
      });

      const issue = result.issues.find(i => i.code === "X_AXIS_LIMIT");
      expect(issue?.line_number).toBeDefined();
    });

    it("includes line content in issues", () => {
      const overLimit = `
O1001
G00 X500 Z0
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overLimit, {
        x_max_mm: 300
      });

      const issue = result.issues.find(i => i.code === "X_AXIS_LIMIT");
      expect(issue?.line_content).toContain("X500");
    });

    it("provides suggestions for issues", () => {
      const overSpeed = `
O1001
G97 S5000 M03
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overSpeed, {
        spindle_max_rpm: 4000
      });

      const issue = result.issues.find(i => i.code === "SPINDLE_OVER_MAX");
      expect(issue?.suggestion).toBeDefined();
    });
  });

  describe("Custom Limits", () => {
    it("respects custom axis limits", () => {
      const limits: Partial<MachineLimits> = {
        x_max_mm: 200,
        z_min_mm: -100
      };

      const overLimit = `
O1001
G00 X250 Z-150
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(overLimit, limits);

      expect(result.issues.some(i => i.code === "X_AXIS_LIMIT")).toBe(true);
      expect(result.issues.some(i => i.code === "Z_AXIS_LIMIT")).toBe(true);
    });

    it("respects custom spindle limit", () => {
      const limits: Partial<MachineLimits> = {
        spindle_max_rpm: 2000
      };

      const program = `
O1001
G97 S2500 M03
M30
      `.trim();

      const result = latheProgramVerificationEngine.verify(program, limits);

      expect(result.issues.some(i => i.code === "SPINDLE_OVER_MAX")).toBe(true);
    });
  });

  describe("getStatistics()", () => {
    it("returns supported G codes", () => {
      const stats = latheProgramVerificationEngine.getStatistics();

      expect(stats.supported_g_codes).toContain(0);
      expect(stats.supported_g_codes).toContain(1);
      expect(stats.supported_g_codes).toContain(71);
      expect(stats.supported_g_codes).toContain(76);
    });

    it("returns supported M codes", () => {
      const stats = latheProgramVerificationEngine.getStatistics();

      expect(stats.supported_m_codes).toContain(3);
      expect(stats.supported_m_codes).toContain(5);
      expect(stats.supported_m_codes).toContain(30);
    });

    it("tracks verification count", () => {
      const before = latheProgramVerificationEngine.getStatistics().total_verifications;

      latheProgramVerificationEngine.verify(validProgram);

      const after = latheProgramVerificationEngine.getStatistics().total_verifications;
      expect(after).toBe(before + 1);
    });
  });

  describe("Safety Checks Summary", () => {
    it("returns all safety check results", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.safety_checks).toHaveProperty("axis_limits_ok");
      expect(result.safety_checks).toHaveProperty("spindle_limits_ok");
      expect(result.safety_checks).toHaveProperty("feed_limits_ok");
      expect(result.safety_checks).toHaveProperty("tool_sequence_ok");
      expect(result.safety_checks).toHaveProperty("coolant_sequence_ok");
    });

    it("all checks pass for valid program", () => {
      const result = latheProgramVerificationEngine.verify(validProgram);

      expect(result.safety_checks.axis_limits_ok).toBe(true);
      expect(result.safety_checks.spindle_limits_ok).toBe(true);
      expect(result.safety_checks.feed_limits_ok).toBe(true);
    });
  });
});
