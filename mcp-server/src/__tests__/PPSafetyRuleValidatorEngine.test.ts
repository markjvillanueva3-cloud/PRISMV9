/**
 * PPSafetyRuleValidatorEngine Tests — PP-DL-MS4
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PPSafetyRuleValidatorEngine,
  ppSafetyRuleValidatorEngine,
  type SafetyContext,
} from "../engines/PPSafetyRuleValidatorEngine.js";

const safeProgram: SafetyContext = {
  gcode_lines: [
    "%", "O0001", "G90 G21 G17 G40 G80",
    "G91 G28 Z0", "T1 M6", "G90",
    "G54", "G43 H1 Z50", "S5000 M3", "M8",
    "G0 X0 Y0", "G1 Z-2 F200", "G1 X50",
    "M5", "M9", "G91 G28 Z0",
    "T2 M6", "S8000 M3", "M8",
    "G0 X10 Y10", "G1 Z-1 F100",
    "M5", "M9", "G91 G28 Z0", "M30", "%",
  ],
  material_id: "1018",
};

const unsafeProgram: SafetyContext = {
  gcode_lines: [
    "G0 X0 Y0 Z5",
    "S5000 M3",
    "G1 Z-2 F200",
    "T2 M6", // tool change without M5!
    "S8000 M3",
  ],
  material_id: "1018",
};

const titaniumNoCoolant: SafetyContext = {
  gcode_lines: ["G90 G21", "S3000 M3", "G1 X10 F100", "M30"],
  material_id: "Ti-6Al-4V",
};

const fiveAxisNoTCPC: SafetyContext = {
  gcode_lines: ["G90 G21", "G0 X0 Y0 Z50", "G1 Z-5 A10 C20 F200", "M30"],
  has_5axis: true,
};

describe("PPSafetyRuleValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppSafetyRuleValidatorEngine).toBeInstanceOf(PPSafetyRuleValidatorEngine);
  });

  describe("validate — safe program", () => {
    it("passes all rules", () => {
      const r = ppSafetyRuleValidatorEngine.validate(safeProgram);
      expect(r.overall).toBe("safe");
      expect(r.criticals).toBe(0);
      expect(r.errors).toBe(0);
    });

    it("checks multiple rules", () => {
      const r = ppSafetyRuleValidatorEngine.validate(safeProgram);
      expect(r.rules_checked).toBeGreaterThan(5);
    });

    it("safe recommendation when all pass", () => {
      const r = ppSafetyRuleValidatorEngine.validate(safeProgram);
      expect(r.recommendations.some(s => s.includes("safe to run"))).toBe(true);
    });
  });

  describe("validate — unsafe program", () => {
    it("detects missing safe start", () => {
      const r = ppSafetyRuleValidatorEngine.validate(unsafeProgram);
      const safeStart = r.results.find(s => s.rule_id === "safe_start_block");
      expect(safeStart?.passed).toBe(false);
    });

    it("detects missing program end", () => {
      const r = ppSafetyRuleValidatorEngine.validate(unsafeProgram);
      const progEnd = r.results.find(s => s.rule_id === "program_end");
      expect(progEnd?.passed).toBe(false);
    });

    it("detects spindle running during tool change", () => {
      const r = ppSafetyRuleValidatorEngine.validate(unsafeProgram);
      const spindleCheck = r.results.find(s => s.rule_id === "spindle_off_before_tool_change");
      expect(spindleCheck?.passed).toBe(false);
    });

    it("overall is critical or unsafe", () => {
      const r = ppSafetyRuleValidatorEngine.validate(unsafeProgram);
      expect(["critical", "unsafe"]).toContain(r.overall);
    });
  });

  describe("validate — titanium without coolant", () => {
    it("detects titanium without flood coolant as critical", () => {
      const r = ppSafetyRuleValidatorEngine.validate(titaniumNoCoolant);
      const tiCheck = r.results.find(s => s.rule_id === "titanium_requires_coolant");
      expect(tiCheck?.passed).toBe(false);
      expect(tiCheck?.message).toContain("ignition");
    });

    it("has remediation suggestion", () => {
      const r = ppSafetyRuleValidatorEngine.validate(titaniumNoCoolant);
      const tiCheck = r.results.find(s => s.rule_id === "titanium_requires_coolant");
      expect(tiCheck?.remediation).toContain("M8");
    });
  });

  describe("validate — 5-axis without TCPC", () => {
    it("warns about missing TCPC", () => {
      const r = ppSafetyRuleValidatorEngine.validate(fiveAxisNoTCPC);
      const tcpcCheck = r.results.find(s => s.rule_id === "five_axis_tcpc_present");
      expect(tcpcCheck?.passed).toBe(false);
    });
  });

  describe("isSafe", () => {
    it("true for safe program", () => {
      expect(ppSafetyRuleValidatorEngine.isSafe(safeProgram)).toBe(true);
    });

    it("false for unsafe program", () => {
      expect(ppSafetyRuleValidatorEngine.isSafe(unsafeProgram)).toBe(false);
    });
  });

  describe("rule management", () => {
    let engine: PPSafetyRuleValidatorEngine;
    beforeEach(() => { engine = new PPSafetyRuleValidatorEngine(); });

    it("lists all rules", () => {
      const rules = engine.listRules();
      expect(rules.length).toBeGreaterThan(5);
    });

    it("disables a rule", () => {
      const before = engine.validate(unsafeProgram);
      const safeStartFailed = before.results.some(r => r.rule_id === "safe_start_block" && !r.passed);
      expect(safeStartFailed).toBe(true);

      engine.setRuleEnabled("safe_start_block", false);
      const after = engine.validate(unsafeProgram);
      expect(after.results.some(r => r.rule_id === "safe_start_block")).toBe(false);
    });

    it("adds custom rule", () => {
      engine.addRule({
        id: "custom_test",
        name: "Custom test rule",
        severity: "info",
        category: "custom",
        description: "Always passes",
        enabled: true,
        check: () => ({ passed: true, message: "OK" }),
      });
      const r = engine.validate(safeProgram);
      expect(r.results.some(s => s.rule_id === "custom_test")).toBe(true);
    });

    it("reset restores defaults", () => {
      engine.setRuleEnabled("safe_start_block", false);
      engine.reset();
      const rules = engine.listRules();
      const safeStart = rules.find(r => r.id === "safe_start_block");
      expect(safeStart?.enabled).toBe(true);
    });

    it("getRuleCount returns total", () => {
      expect(engine.getRuleCount()).toBeGreaterThan(5);
    });
  });

  describe("result structure", () => {
    it("all results have required fields", () => {
      const r = ppSafetyRuleValidatorEngine.validate(safeProgram);
      for (const result of r.results) {
        expect(result.rule_id.length).toBeGreaterThan(0);
        expect(result.rule_name.length).toBeGreaterThan(0);
        expect(["info", "warning", "error", "critical"]).toContain(result.severity);
        expect(typeof result.passed).toBe("boolean");
        expect(result.message.length).toBeGreaterThan(0);
      }
    });

    it("failed results have remediation when available", () => {
      const r = ppSafetyRuleValidatorEngine.validate(unsafeProgram);
      const failed = r.results.filter(s => !s.passed);
      const withRemediation = failed.filter(s => s.remediation);
      expect(withRemediation.length).toBeGreaterThan(0);
    });
  });
});
