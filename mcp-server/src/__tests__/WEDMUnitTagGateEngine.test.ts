/**
 * WEDMUnitTagGateEngine tests
 * MS-P2.5-SAFETY/U-P2.5-SAFE-02
 */

import { describe, it, expect } from "vitest";
import { WEDMUnitTagGateEngine } from "../engines/WEDMUnitTagGateEngine.js";

describe("WEDMUnitTagGateEngine", () => {
  const engine = new WEDMUnitTagGateEngine();

  describe("evaluate()", () => {
    it("returns PASS when G21 matches metric declaration", () => {
      const result = engine.evaluate({
        program_text: "%\nO0001\nG21 G90 G54\nG00 X50.0 Y25.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.hard_block).toBe(false);
      expect(result.safety_gate_input.pass).toBe(true);
      expect(result.safety_gate_input.code_unit).toBe("G21");
      expect(result.safety_score_contribution).toBe(0.1);
    });

    it("returns PASS when G20 matches imperial declaration", () => {
      const result = engine.evaluate({
        program_text: "%\nO0002\nG20 G90 G54\nG00 X2.0 Y1.0\nM30\n%",
        declared_unit: "imperial",
      });

      expect(result.pass).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.safety_gate_input.code_unit).toBe("G20");
    });

    it("returns FAIL when header is missing", () => {
      const result = engine.evaluate({
        program_text: "%\nO0003\nG90 G54\nG00 X50.0 Y25.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_header_missing");
      expect(result.hard_block).toBe(true);
      expect(result.safety_gate_input.pass).toBe(false);
      expect(result.safety_gate_input.code_unit).toBe("missing");
      expect(result.safety_score_contribution).toBe(0.0);
    });

    it("returns FAIL when header mismatches declaration (G20 vs metric)", () => {
      const result = engine.evaluate({
        program_text: "%\nO0004\nG20 G90 G54\nG00 X50.0 Y25.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_header_mismatch");
      expect(result.hard_block).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("returns FAIL when header mismatches declaration (G21 vs imperial)", () => {
      const result = engine.evaluate({
        program_text: "%\nO0005\nG21 G90 G54\nG00 X2.0 Y1.0\nM30\n%",
        declared_unit: "imperial",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_header_mismatch");
    });

    it("returns FAIL when shop profile mismatches declaration", () => {
      const result = engine.evaluate({
        program_text: "%\nO0006\nG21 G90 G54\nG00 X50.0 Y25.0\nM30\n%",
        declared_unit: "metric",
        shop_unit_system: "imperial",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_shop_profile_mismatch");
      expect(result.warnings[0]).toContain("25.4");
    });

    it("detects 25.4x coordinate magnitude confusion", () => {
      const result = engine.evaluate({
        program_text: "%\nO0007\nG21 G90 G54\nG00 X50.8 Y25.4\nM30\n%",
        declared_unit: "metric",
        expected_max_coord: 2.0,
        magnitude_tolerance_ratio: 5.0,
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_coordinate_magnitude");
      expect(result.metrics.coord_magnitude_suspicious).toBe(true);
      expect(result.warnings[0]).toContain("25.4");
    });

    it("returns FAIL for empty program", () => {
      const result = engine.evaluate({
        program_text: "",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_empty_program");
    });

    it("ignores G20/G21 in comments", () => {
      const result = engine.evaluate({
        program_text: "%\nO0008\n(G20 this is a comment)\nG21 G90\nG00 X50.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(true);
      expect(result.safety_gate_input.code_unit).toBe("G21");
    });

    it("returns AtomicValue with correct shape", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X10.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.atomic).toBeDefined();
      expect(result.atomic.value).toBe(1.0);
      expect(result.atomic.unit).toBe("dimensionless");
      expect(result.atomic.source).toContain("WEDMUnitTagGateEngine");
    });

    it("returns safety_gate_input matching WEDMProgramSafetyGateEngine interface", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X10.0\nM30\n%",
        declared_unit: "metric",
      });

      const sgi = result.safety_gate_input;
      expect(sgi).toHaveProperty("pass");
      expect(sgi).toHaveProperty("declared_unit");
      expect(sgi).toHaveProperty("code_unit");
      expect(sgi).toHaveProperty("coordinate_scale_consistent");
      expect(typeof sgi.pass).toBe("boolean");
      expect(["metric", "imperial"]).toContain(sgi.declared_unit);
      expect(["G20", "G21", "missing"]).toContain(sgi.code_unit);
    });
  });

  describe("gate()", () => {
    it("returns allow=true for passing programs", () => {
      const result = engine.gate({
        program_text: "%\nG21\nG00 X50.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.allow).toBe(true);
      expect(result.reason).toContain("UNIT OK");
    });

    it("returns allow=false for failing programs", () => {
      const result = engine.gate({
        program_text: "%\nG20\nG00 X50.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.allow).toBe(false);
      expect(result.reason).toContain("UNIT BLOCK");
    });
  });

  describe("adversarial inputs", () => {
    it("handles NaN in expected_max_coord", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X50.0\nM30\n%",
        declared_unit: "metric",
        expected_max_coord: NaN,
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.metrics.magnitude_ratio).toBeNull();
    });

    it("handles Infinity in expected_max_coord", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X50.0\nM30\n%",
        declared_unit: "metric",
        expected_max_coord: Infinity,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.coord_magnitude_suspicious).toBe(false);
    });

    it("handles whitespace-only program", () => {
      const result = engine.evaluate({
        program_text: "   \n\t\n   ",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_empty_program");
    });

    it("handles extremely large coordinates without crashing", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X999999999.999 Y888888888.888\nM30\n%",
        declared_unit: "metric",
        expected_max_coord: 100,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.max_abs_coord_found).toBeGreaterThan(0);
    });

    it("handles negative coordinates", () => {
      const result = engine.evaluate({
        program_text: "%\nG21\nG00 X-50.0 Y-25.0\nM30\n%",
        declared_unit: "metric",
      });

      expect(result.pass).toBe(true);
      expect(result.metrics.max_abs_coord_found).toBeGreaterThan(0);
    });
  });

  describe("variability: controller dialects", () => {
    it("handles Mitsubishi-style program (G21 modal)", () => {
      const mitsubishiProgram = `%
O1234
G21 G90 G54
G92 X0 Y0
G01 X50.0 F100
M30
%`;
      const result = engine.evaluate({
        program_text: mitsubishiProgram,
        declared_unit: "metric",
      });

      expect(result.pass).toBe(true);
      expect(result.safety_gate_input.code_unit).toBe("G21");
    });

    it("handles Sodick-style program (G71 metric alias)", () => {
      const sodickProgram = `%
N0001
G21 G90
M50
G01 X25.4 Y12.7
M51
M30
%`;
      const result = engine.evaluate({
        program_text: sodickProgram,
        declared_unit: "metric",
      });

      expect(result.pass).toBe(true);
    });

    it("handles Fanuc-style imperial program", () => {
      const fanucProgram = `%
O2000
G20 G90 G17
G00 X2.0 Y1.0
G01 X3.0 F10.0
M30
%`;
      const result = engine.evaluate({
        program_text: fanucProgram,
        declared_unit: "imperial",
      });

      expect(result.pass).toBe(true);
      expect(result.safety_gate_input.code_unit).toBe("G20");
    });
  });
});
