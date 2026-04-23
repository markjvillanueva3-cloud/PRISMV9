/**
 * Tests for WEDMProgramVerificationEngine
 * MS-P1.5-ONESHOT/U-P1.5-OS-06
 */

import { describe, it, expect } from "vitest";
import {
  wedmProgramVerificationEngine,
  type WEDMControllerType,
} from "../engines/WEDMProgramVerificationEngine.js";

describe("WEDMProgramVerificationEngine", () => {
  describe("Valid Programs", () => {
    it("passes a well-formed Mitsubishi program", () => {
      const gcode = `
%
O1001 (TEST PROGRAM)
G21 (METRIC)
G90 G54
M6 (WIRE THREAD)
M28 (SUBMERGE ON)
G0 X10.0 Y10.0
G41 D01
G1 X50.0 F100
G1 Y50.0
G1 X10.0
G1 Y10.0
G40
M29 (SUBMERGE OFF)
M7 (WIRE CUT)
M30
%
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.error_count).toBe(0);
      expect(result.hard_block).toBe(false);
      expect(result.safety_score_contribution).toBe(0.1);
    });

    it("passes a well-formed Sodick program", () => {
      const gcode = `
%
O2001
G21
G90 G54
M50 (WIRE THREAD)
M78 (SUBMERGE)
G0 X0 Y0
G41 D1
G1 X100.0 E1
G40
M79
M51
M30
%
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "sodick_aq",
        expected_units: "metric",
      });

      expect(result.pass).toBe(true);
      expect(result.error_count).toBe(0);
    });

    it("passes a well-formed Fanuc ROBOCUT program", () => {
      const gcode = `
%
O3001
G21
G90
M60 (WIRE THREAD)
M50 (SUBMERGE)
G0 X0 Y0
G41 D1
G1 X50.0
G40
M51
M61
M30
%
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "fanuc_robocut",
        expected_units: "metric",
      });

      expect(result.pass).toBe(true);
    });
  });

  describe("Offset Pairing (G41/G42/G40)", () => {
    it("detects unpaired G41 (missing G40)", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
G1 Y50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.error_count).toBeGreaterThan(0);
      const offsetIssue = result.issues.find((i) => i.check === "offset_pairing");
      expect(offsetIssue).toBeDefined();
      expect(offsetIssue?.message).toContain("Unclosed cutter compensation");
    });

    it("detects unpaired G42 (missing G40)", () => {
      const gcode = `
G21
G42 D1
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "offset_pairing" && i.severity === "error")).toBe(true);
    });

    it("detects nested offsets (G41 followed by G42 without G40)", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
G42 D2
G1 Y50.0
G40
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.message.includes("Nested"))).toBe(true);
    });

    it("warns on G40 without prior offset", () => {
      const gcode = `
G21
G1 X50.0
G40
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.warning_count).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.check === "offset_pairing" && i.severity === "warning")).toBe(true);
    });

    it("passes properly paired offsets", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
G40
G42 D2
G1 X100.0
G40
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      const offsetErrors = result.issues.filter(
        (i) => i.check === "offset_pairing" && i.severity === "error"
      );
      expect(offsetErrors.length).toBe(0);
    });
  });

  describe("Program End (M02/M30)", () => {
    it("detects missing program end", () => {
      const gcode = `
G21
G1 X50.0
G1 Y50.0
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "program_end")).toBe(true);
    });

    it("accepts M02 as valid end", () => {
      const gcode = `
G21
G1 X50.0
M02
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      const endIssues = result.issues.filter((i) => i.check === "program_end");
      expect(endIssues.length).toBe(0);
    });

    it("accepts M30 as valid end", () => {
      const gcode = `
G21
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      const endIssues = result.issues.filter((i) => i.check === "program_end");
      expect(endIssues.length).toBe(0);
    });

    it("accepts Agie M17 as valid end", () => {
      const gcode = `
G71
G1 X50.0
M17
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "agie_cut",
        expected_units: "metric",
      });

      const endIssues = result.issues.filter((i) => i.check === "program_end");
      expect(endIssues.length).toBe(0);
    });

    it("ignores trailing comments after end", () => {
      const gcode = `
G21
G1 X50.0
M30
(END OF PROGRAM)
; Comment line
%
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      const endIssues = result.issues.filter((i) => i.check === "program_end");
      expect(endIssues.length).toBe(0);
    });
  });

  describe("Unit Consistency (G20/G21)", () => {
    it("detects metric code when imperial expected", () => {
      const gcode = `
G21 (METRIC)
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "imperial",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "unit_consistency" && i.severity === "error")).toBe(true);
      expect(result.issues.some((i) => i.message.includes("G21") && i.message.includes("G20"))).toBe(true);
    });

    it("detects imperial code when metric expected", () => {
      const gcode = `
G20 (INCH)
G1 X2.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "unit_consistency")).toBe(true);
    });

    it("warns when no unit code present", () => {
      const gcode = `
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.warning_count).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.check === "unit_consistency" && i.severity === "warning")).toBe(true);
    });

    it("uses correct unit codes for Agie (G70/G71)", () => {
      const gcode = `
G71 (METRIC ON AGIE)
G1 X50.0
M17
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "agie_cut",
        expected_units: "metric",
      });

      const unitIssues = result.issues.filter((i) => i.check === "unit_consistency" && i.severity === "error");
      expect(unitIssues.length).toBe(0);
    });
  });

  describe("E-Code Validity", () => {
    it("detects undefined E-codes", () => {
      const gcode = `
G21
G1 X50.0 E99
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "sodick_aq",
        expected_units: "metric",
        valid_e_codes: [1, 2, 3, 4, 5],
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "e_code_validity")).toBe(true);
      expect(result.issues.some((i) => i.message.includes("E99"))).toBe(true);
    });

    it("passes valid E-codes", () => {
      const gcode = `
G21
G1 X50.0 E1
G1 Y50.0 E2
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "sodick_aq",
        expected_units: "metric",
        valid_e_codes: [1, 2, 3, 4, 5],
      });

      const eCodeIssues = result.issues.filter((i) => i.check === "e_code_validity");
      expect(eCodeIssues.length).toBe(0);
    });

    it("skips E-code check when no valid codes provided", () => {
      const gcode = `
G21
G1 X50.0 E999
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        // No valid_e_codes provided
      });

      expect(result.checks_performed).not.toContain("e_code_validity");
    });
  });

  describe("Coordinate Range", () => {
    it("detects X coordinate exceeding max", () => {
      const gcode = `
G21
G1 X500.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        travel_limits: { x_min: -200, x_max: 200, y_min: -150, y_max: 150 },
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "coordinate_range" && i.message.includes("X500"))).toBe(true);
    });

    it("detects Y coordinate below min", () => {
      const gcode = `
G21
G1 Y-300.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        travel_limits: { x_min: -200, x_max: 200, y_min: -150, y_max: 150 },
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.message.includes("below minimum"))).toBe(true);
    });

    it("checks U/V axes for taper limits", () => {
      const gcode = `
G21
G1 X50.0 U100.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        travel_limits: { x_min: -200, x_max: 200, y_min: -150, y_max: 150, u_min: -50, u_max: 50 },
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.message.includes("U100"))).toBe(true);
    });

    it("ignores coordinates in comments", () => {
      const gcode = `
G21
(MOVE TO X999 POSITION)
; X888 is far away
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        travel_limits: { x_min: -200, x_max: 200, y_min: -150, y_max: 150 },
      });

      const rangeIssues = result.issues.filter((i) => i.check === "coordinate_range");
      expect(rangeIssues.length).toBe(0);
    });
  });

  describe("Wire Threading", () => {
    it("warns on wire cut without prior thread", () => {
      const gcode = `
G21
G1 X50.0
M7 (WIRE CUT WITHOUT THREAD)
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      expect(result.warning_count).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.check === "wire_threading")).toBe(true);
    });

    it("passes with proper thread before cut", () => {
      const gcode = `
G21
M6 (THREAD)
G1 X50.0
M7 (CUT)
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "mitsubishi_fa",
        expected_units: "metric",
      });

      const threadIssues = result.issues.filter((i) => i.check === "wire_threading");
      expect(threadIssues.length).toBe(0);
    });
  });

  describe("Taper Pairing (G51/G50)", () => {
    it("detects unclosed taper mode", () => {
      const gcode = `
G21
G51 (TAPER ON)
G1 X50.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.issues.some((i) => i.check === "taper_pairing" && i.severity === "error")).toBe(true);
    });

    it("passes properly paired taper", () => {
      const gcode = `
G21
G51 (TAPER ON)
G1 X50.0
G50 (TAPER OFF)
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      const taperErrors = result.issues.filter((i) => i.check === "taper_pairing" && i.severity === "error");
      expect(taperErrors.length).toBe(0);
    });

    it("uses G51.1/G50.1 for Fanuc taper", () => {
      const gcode = `
G21
G51.1 (TAPER ON)
G1 X50.0
G50.1 (TAPER OFF)
M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "fanuc_robocut",
        expected_units: "metric",
      });

      const taperErrors = result.issues.filter((i) => i.check === "taper_pairing" && i.severity === "error");
      expect(taperErrors.length).toBe(0);
    });
  });

  describe("Skip Checks", () => {
    it("skips specified checks", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
; No G40, no M30
      `.trim();

      const result = wedmProgramVerificationEngine.verify({
        gcode,
        controller: "generic",
        expected_units: "metric",
        skip_checks: ["offset_pairing", "program_end"],
      });

      expect(result.checks_performed).not.toContain("offset_pairing");
      expect(result.checks_performed).not.toContain("program_end");
      // Should still check other things
      expect(result.checks_performed).toContain("unit_consistency");
    });
  });

  describe("Gate Function", () => {
    it("allows valid program", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
G40
M30
      `.trim();

      const gate = wedmProgramVerificationEngine.gate({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(gate.allow).toBe(true);
      expect(gate.result.pass).toBe(true);
    });

    it("blocks invalid program", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
      `.trim();

      const gate = wedmProgramVerificationEngine.gate({
        gcode,
        controller: "generic",
        expected_units: "metric",
      });

      expect(gate.allow).toBe(false);
      expect(gate.reason).toContain("VERIFICATION FAILED");
    });
  });

  describe("Quick Verify", () => {
    it("uses generic controller and metric by default", () => {
      const gcode = `
G21
G41 D1
G1 X50.0
G40
M30
      `.trim();

      const result = wedmProgramVerificationEngine.quickVerify(gcode);

      expect(result.pass).toBe(true);
    });

    it("accepts imperial parameter", () => {
      const gcode = `
G20
G1 X2.0
M30
      `.trim();

      const result = wedmProgramVerificationEngine.quickVerify(gcode, "imperial");

      const unitIssues = result.issues.filter((i) => i.check === "unit_consistency" && i.severity === "error");
      expect(unitIssues.length).toBe(0);
    });
  });

  describe("Controller Codes", () => {
    it("returns codes for all supported controllers", () => {
      const controllers = wedmProgramVerificationEngine.getSupportedControllers();

      for (const ctrl of controllers) {
        const codes = wedmProgramVerificationEngine.getControllerCodes(ctrl);
        expect(codes.program_end.length).toBeGreaterThan(0);
        expect(codes.offset_left).toBeDefined();
        expect(codes.offset_right).toBeDefined();
        expect(codes.offset_cancel).toBeDefined();
      }
    });

    it("lists 10 supported controllers", () => {
      const controllers = wedmProgramVerificationEngine.getSupportedControllers();
      expect(controllers.length).toBe(10); // 9 specific + generic
      expect(controllers).toContain("mitsubishi_fa");
      expect(controllers).toContain("sodick_aq");
      expect(controllers).toContain("makino_u");
      expect(controllers).toContain("agie_cut");
      expect(controllers).toContain("fanuc_robocut");
      expect(controllers).toContain("generic");
    });
  });

  describe("Safety Score", () => {
    it("returns +0.10 for passing verification", () => {
      const gcode = `G21\nG1 X50\nM30`;
      const result = wedmProgramVerificationEngine.quickVerify(gcode);

      expect(result.safety_score_contribution).toBe(0.1);
      expect(wedmProgramVerificationEngine.getSafetyScoreContribution(result)).toBe(0.1);
    });

    it("returns 0 for failing verification", () => {
      const gcode = `G21\nG41 D1\nG1 X50`; // Missing G40 and M30
      const result = wedmProgramVerificationEngine.quickVerify(gcode);

      expect(result.safety_score_contribution).toBe(0);
    });
  });

  describe("Summary Messages", () => {
    it("includes line count and check count in pass summary", () => {
      const gcode = `G21\nG1 X50\nM30`;
      const result = wedmProgramVerificationEngine.quickVerify(gcode);

      expect(result.summary).toContain("lines");
      expect(result.summary).toContain("checks");
      expect(result.summary).toContain("S(x)");
    });

    it("includes error/warning count in fail summary", () => {
      const gcode = `G21\nG41 D1\nG1 X50`;
      const result = wedmProgramVerificationEngine.quickVerify(gcode);

      expect(result.summary).toContain("VERIFICATION FAILED");
      expect(result.summary).toContain("HARD BLOCK");
    });
  });
});
