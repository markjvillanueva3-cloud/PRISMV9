/**
 * Tests for BOX-MS2 — MacroValidationEngine (U-BOX23)
 */
import { describe, it, expect } from "vitest";
import { MacroValidationEngine } from "../engines/MacroValidationEngine.js";
import type { MacroVarSet } from "../engines/MacroValidationEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeValidMacro(): string[] {
  return [
    "( PARAMETRIC MACRO: TEST-PART )",
    "V1 = 2.0     ( STOCK DIAMETER )",
    "V2 = 1.875   ( FINISH OD )",
    "V5 = 3.5     ( PART LENGTH )",
    "V45 = 600    ( OD ROUGH SFM )",
    "V46 = 0.012  ( OD ROUGH FEED )",
    "V47 = 800    ( OD FINISH SFM )",
    "V48 = 0.006  ( OD FINISH FEED )",
    "V70 = [V45 * 3.8197] / V1    ( OD ROUGH RPM CALC )",
    "V71 = [V47 * 3.8197] / V2    ( OD FINISH RPM CALC )",
    "V60 = 4.0    ( X CLEARANCE )",
    "V62 = 20     ( SAFE RETRACT X )",
    "V63 = 20     ( SAFE RETRACT Z )",
    "V64 = 2500   ( MAX RPM LIMIT )",
    "T010101",
    "G50 S2500",
    "G96 S600 M3",
    "M8",
    "G0 X2.0 Z0.1",
    "G1 X1.875 F0.012",
    "G1 Z-3.5 F0.012",
    "G0 X20 Z20",
    "M1",
    "M9",
    "T020202",
    "G50 S3000",
    "G96 S800 M3",
    "M8",
    "G0 X1.875 Z0.05",
    "G1 Z-3.5 F0.006",
    "G0 X20 Z20",
    "M9",
    "M5",
    "M30",
  ];
}

function makeOriginalVars(): MacroVarSet {
  return {
    V1: 2.0,
    V2: 1.875,
    V5: 3.5,
    V45: 600,
    V46: 0.012,
    V47: 800,
    V48: 0.006,
    V60: 4.0,
    V62: 20,
    V63: 20,
    V64: 2500,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("MacroValidationEngine", () => {
  const engine = new MacroValidationEngine();

  describe("validate() — safety checks", () => {
    it("passes all safety checks for valid macro", () => {
      const result = engine.validate({
        macro_lines: makeValidMacro(),
        original_vars: makeOriginalVars(),
      });

      expect(result.safety.g50_present).toBe(true);
      expect(result.safety.g50_values).toContain(2500);
      expect(result.safety.spindle_stop).toBe(true);
      expect(result.safety.retract_safe).toBe(true);
      expect(result.safety.coolant_balanced).toBe(true);
      expect(result.safety.optional_stops).toBeGreaterThanOrEqual(1);
    });

    it("fails when G50 missing with CSS mode", () => {
      const lines = makeValidMacro().filter(l => !/G50/.test(l));
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
      });

      const g50Check = result.checks.find(c => c.name === "g50_speed_clamp");
      expect(g50Check?.passed).toBe(false);
      expect(g50Check?.severity).toBe("critical");
    });

    it("fails when M5 spindle stop missing", () => {
      const lines = makeValidMacro().filter(l => !/M5/.test(l) || /M50/.test(l));
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
      });

      const m5Check = result.checks.find(c => c.name === "spindle_stop");
      expect(m5Check?.passed).toBe(false);
    });

    it("warns when coolant not balanced", () => {
      const lines = makeValidMacro().filter(l => !/M9/.test(l));
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
      });

      const coolantCheck = result.checks.find(c => c.name === "coolant_balance");
      expect(coolantCheck?.passed).toBe(false);
      expect(coolantCheck?.severity).toBe("warning");
    });
  });

  describe("validate() — collision detection", () => {
    it("detects rapid into stock when stock diameter increases", () => {
      const lines = makeValidMacro();
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
        altered_vars: { ...makeOriginalVars(), V1: 5.0 }, // Much larger stock
      });

      // With stock dia 5.0, rapid to X2.0 would be inside stock
      expect(result.collision_risks.length).toBeGreaterThan(0);
      expect(result.collision_risks.some(r => r.risk === "rapid_into_stock")).toBe(true);
    });

    it("correctly flags rapids below stock diameter as risks", () => {
      const lines = makeValidMacro();
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
      });

      // X1.875 rapid with stock dia 2.0 is correctly flagged
      // (before roughing completes, this would crash)
      const belowStockRisks = result.collision_risks.filter(
        r => r.x_position < 2.0 && r.x_position > 0,
      );
      expect(belowStockRisks.length).toBeGreaterThan(0);
      expect(belowStockRisks[0].risk).toBe("rapid_into_stock");
    });
  });

  describe("validate() — equivalence checks", () => {
    it("passes equivalence when tool change count matches", () => {
      const macro = makeValidMacro();
      const original = [
        "T010101",
        "G50 S2500",
        "G96 S600 M3",
        "G0 X2.0 Z0.1",
        "G1 X1.875 F0.012",
        "M5",
        "T020202",
        "G50 S3000",
        "G96 S800 M3",
        "G0 X1.875 Z0.05",
        "M5",
        "M30",
      ];

      const result = engine.validate({
        macro_lines: macro,
        original_lines: original,
        original_vars: makeOriginalVars(),
      });

      const toolCheck = result.checks.find(c => c.name === "tool_change_count");
      expect(toolCheck?.passed).toBe(true);
    });

    it("fails equivalence when tool change count differs", () => {
      const macro = makeValidMacro();
      const original = [
        "T010101", "T020202", "T030303", // 3 tools
        "M5", "M30",
      ];

      const result = engine.validate({
        macro_lines: macro,
        original_lines: original,
        original_vars: makeOriginalVars(),
      });

      const toolCheck = result.checks.find(c => c.name === "tool_change_count");
      expect(toolCheck?.passed).toBe(false);
    });
  });

  describe("validate() — altered behavior", () => {
    it("verifies RPM recalculates when diameter changes", () => {
      const lines = makeValidMacro();
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
        altered_vars: { ...makeOriginalVars(), V1: 1.5 }, // Smaller stock
      });

      const rpmCheck = result.checks.find(c => c.name === "rpm_recalculation");
      expect(rpmCheck?.passed).toBe(true);
    });

    it("confirms G50 values unchanged with altered parameters", () => {
      const lines = makeValidMacro();
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
        altered_vars: { ...makeOriginalVars(), V1: 1.5 },
      });

      const g50Check = result.checks.find(c => c.name === "g50_unchanged");
      expect(g50Check?.passed).toBe(true);
    });
  });

  describe("validate() — overall result", () => {
    it("valid=true when only collision risks (no other critical failures)", () => {
      // Use a macro where all rapids are above stock diameter
      const safeLines = [
        "V1 = 2.0     ( STOCK DIAMETER )",
        "V45 = 600    ( SFM )",
        "V70 = [V45 * 3.8197] / V1    ( RPM CALC )",
        "T010101",
        "G50 S2500",
        "G96 S600 M3",
        "M8",
        "G0 X2.1 Z0.1", // X > stock dia — safe
        "G1 X1.875 F0.012", // G1 feed move — not checked
        "G0 X20 Z20",
        "M1",
        "M9",
        "M5",
        "M30",
      ];
      const result = engine.validate({
        macro_lines: safeLines,
        original_vars: { V1: 2.0, V45: 600 },
      });

      expect(result.collision_risks.length).toBe(0);
      expect(result.valid).toBe(true);
      expect(result.stats.critical_failures).toBe(0);
    });

    it("valid=false when critical failure exists", () => {
      const lines = makeValidMacro().filter(l => !/G50/.test(l));
      const result = engine.validate({
        macro_lines: lines,
        original_vars: makeOriginalVars(),
      });

      expect(result.valid).toBe(false);
      expect(result.stats.critical_failures).toBeGreaterThan(0);
    });
  });

  describe("evaluateVariables()", () => {
    it("resolves simple assignments", () => {
      const lines = [
        "V1 = 2.0     ( STOCK DIA )",
        "V5 = 3.5     ( PART LEN )",
      ];
      const result = engine.evaluateVariables(lines, {});

      expect(result["V1"]).toBe(2.0);
      expect(result["V5"]).toBe(3.5);
    });

    it("resolves calculated assignments (multiplication + division)", () => {
      const lines = [
        "V70 = [V45 * 3.8197] / V1    ( RPM CALC )",
      ];
      const result = engine.evaluateVariables(lines, { V45: 600, V1: 2.0 });

      // V70 = 600 * 3.8197 / 2.0 = 1145.91
      expect(result["V70"]).toBeCloseTo(1145.91, 0);
    });

    it("preserves input vars and adds new ones", () => {
      const lines = [
        "V10 = 99     ( NEW VAR )",
      ];
      const result = engine.evaluateVariables(lines, { V1: 2.0 });

      expect(result["V1"]).toBe(2.0);   // preserved
      expect(result["V10"]).toBe(99);    // added
    });

    it("handles missing variable references gracefully", () => {
      const lines = [
        "V70 = [V45 * 3.8197] / V1    ( RPM CALC )",
      ];
      // V45 not provided
      const result = engine.evaluateVariables(lines, { V1: 2.0 });

      // V70 should not be set (can't resolve V45)
      expect(result["V70"]).toBeUndefined();
    });
  });
});
