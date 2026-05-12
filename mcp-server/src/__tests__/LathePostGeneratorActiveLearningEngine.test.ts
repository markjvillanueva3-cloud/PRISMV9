/**
 * LathePostGeneratorActiveLearningEngine Tests — LATHE-MASTER U-LTH21
 *
 * Tests active learning feedback loop for post-processor improvement.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LathePostGeneratorActiveLearningEngine,
  lathePostGeneratorActiveLearningEngine,
  ShopFloorFailure,
} from "../engines/LathePostGeneratorActiveLearningEngine.js";

describe("LathePostGeneratorActiveLearningEngine", () => {
  let engine: LathePostGeneratorActiveLearningEngine;

  beforeEach(() => {
    engine = new LathePostGeneratorActiveLearningEngine();
  });

  // ── queueFailure Tests ────────────────────────────────────────────────────

  describe("queueFailure", () => {
    it("queues a syntax error failure", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100", "G01 Z-50 F0.2"],
        description: "Syntax error on line 1",
        machine_message: "ILLEGAL CHARACTER",
      });

      expect(failure.id).toBeDefined();
      expect(failure.controller).toBe("fanuc-31it");
      expect(failure.category).toBe("syntax_error");
      expect(failure.status).toBe("new");
    });

    it("categorizes motion errors", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X500."],
        description: "Position error - X axis over travel",
        machine_message: "SOFT LIMIT ALARM",
      });

      expect(failure.category).toBe("motion_error");
      expect(failure.severity).toBe("major");
    });

    it("categorizes tool errors", () => {
      const failure = engine.queueFailure({
        controller: "okuma-osp",
        gcode_snippet: ["T0505"],
        description: "Tool not found in turret",
        machine_message: "TOOL OFFSET ERROR",
      });

      expect(failure.category).toBe("tool_error");
    });

    it("categorizes spindle errors", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle speed too high",
        machine_message: "SPINDLE OVERLOAD",
      });

      expect(failure.category).toBe("spindle_error");
    });

    it("categorizes safety violations as critical", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X-50."],
        description: "Emergency stop - possible collision",
        machine_message: "E-STOP ACTIVATED",
      });

      expect(failure.category).toBe("safety_violation");
      expect(failure.severity).toBe("critical");
    });

    it("categorizes cycle errors", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G71 U2.0 R0.5"],
        description: "Canned cycle error",
        machine_message: "G71 PARAMETER ERROR",
      });

      expect(failure.category).toBe("cycle_error");
    });

    it("categorizes coolant errors", () => {
      const failure = engine.queueFailure({
        controller: "okuma-osp",
        gcode_snippet: ["M08"],
        description: "Coolant system fault",
        machine_message: "FLOOD COOLANT ERROR",
      });

      expect(failure.category).toBe("coolant_error");
    });

    it("categorizes unknown errors", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["X100."],
        description: "Something happened",
      });

      expect(failure.category).toBe("unknown");
    });

    it("includes optional fields", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100."],
        description: "Test failure",
        program_id: "O0001",
        line_number: 5,
        operator_notes: "Happened during roughing",
      });

      expect(failure.program_id).toBe("O0001");
      expect(failure.line_number).toBe(5);
      expect(failure.operator_notes).toBe("Happened during roughing");
    });

    it("generates unique IDs", () => {
      const failure1 = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100."],
        description: "Test 1",
      });

      const failure2 = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100."],
        description: "Test 2",
      });

      expect(failure1.id).not.toBe(failure2.id);
    });
  });

  // ── analyzeFailure Tests ──────────────────────────────────────────────────

  describe("analyzeFailure", () => {
    it("analyzes syntax error and proposes correction", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Syntax error - missing decimal",
        line_number: 1,
      });

      const correction = engine.analyzeFailure(failure.id);

      expect(correction).not.toBeNull();
      expect(correction!.failure_id).toBe(failure.id);
      expect(correction!.rule_type).toBe("syntax_error");
      expect(correction!.confidence).toBeGreaterThan(0);
    });

    it("analyzes motion error", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X500. Z100."],
        description: "Over travel on X axis",
      });

      const correction = engine.analyzeFailure(failure.id);

      expect(correction).not.toBeNull();
      expect(correction!.rule_type).toBe("motion_error");
    });

    it("analyzes spindle error and suggests fix", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle speed exceeds maximum",
      });

      const correction = engine.analyzeFailure(failure.id);

      expect(correction).not.toBeNull();
      expect(correction!.corrected_pattern).toContain("S6000");
    });

    it("updates failure status to analyzing then correction_proposed", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["T0101"],
        description: "Tool offset error",
      });

      engine.analyzeFailure(failure.id);

      const updated = engine.getAllFailures().find(f => f.id === failure.id);
      expect(updated!.status).toBe("correction_proposed");
    });

    it("returns null for non-existent failure", () => {
      const correction = engine.analyzeFailure("non-existent-id");

      expect(correction).toBeNull();
    });

    it("extracts problem line using line_number", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100.", "S8000 M03", "G01 Z-50."],
        description: "Spindle error",
        line_number: 2,
      });

      const correction = engine.analyzeFailure(failure.id);

      expect(correction!.original_pattern).toContain("S8000");
    });
  });

  // ── verifyCorrection Tests ────────────────────────────────────────────────

  describe("verifyCorrection", () => {
    it("marks correction as verified on success", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;

      const result = engine.verifyCorrection(correction.id, {
        success: true,
        message: "Test passed with corrected code",
      });

      expect(result).toBe(true);

      const corrections = engine.getCorrectionsForFailure(failure.id);
      expect(corrections[0].verified).toBe(true);
      expect(corrections[0].verification_result).toContain("passed");
    });

    it("marks failure as rejected on verification failure", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Syntax error",
      });

      const correction = engine.analyzeFailure(failure.id)!;

      engine.verifyCorrection(correction.id, {
        success: false,
        message: "Correction did not fix the issue",
      });

      const updated = engine.getAllFailures().find(f => f.id === failure.id);
      expect(updated!.status).toBe("rejected");
    });

    it("returns false for non-existent correction", () => {
      const result = engine.verifyCorrection("non-existent", {
        success: true,
        message: "Test",
      });

      expect(result).toBe(false);
    });
  });

  // ── incorporateCorrection Tests ───────────────────────────────────────────

  describe("incorporateCorrection", () => {
    it("incorporates verified correction", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;
      engine.verifyCorrection(correction.id, { success: true, message: "OK" });

      const result = engine.incorporateCorrection(correction.id);

      expect(result).toBe(true);
      expect(engine.getIncorporatedRulesCount()).toBe(1);
    });

    it("rejects unverified correction", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;

      const result = engine.incorporateCorrection(correction.id);

      expect(result).toBe(false);
    });

    it("updates failure status to incorporated", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;
      engine.verifyCorrection(correction.id, { success: true, message: "OK" });
      engine.incorporateCorrection(correction.id);

      const updated = engine.getAllFailures().find(f => f.id === failure.id);
      expect(updated!.status).toBe("incorporated");
    });
  });

  // ── applyCorrections Tests ────────────────────────────────────────────────

  describe("applyCorrections", () => {
    it("applies incorporated corrections to G-code", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000 M03"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;
      engine.verifyCorrection(correction.id, { success: true, message: "OK" });
      engine.incorporateCorrection(correction.id);

      const gcode = ["O0001", "S8000 M03", "G00 X100.", "M30"];
      const result = engine.applyCorrections(gcode);

      expect(result.corrected[1]).toContain("S6000");
      expect(result.appliedRules.length).toBeGreaterThan(0);
    });

    it("returns unchanged G-code when no rules match", () => {
      const gcode = ["O0001", "G00 X100.", "M30"];
      const result = engine.applyCorrections(gcode);

      expect(result.corrected).toEqual(gcode);
      expect(result.appliedRules.length).toBe(0);
    });
  });

  // ── getMetrics Tests ──────────────────────────────────────────────────────

  describe("getMetrics", () => {
    it("returns initial metrics", () => {
      const metrics = engine.getMetrics();

      expect(metrics.total_failures).toBe(0);
      expect(metrics.corrections_proposed).toBe(0);
      expect(metrics.corrections_verified).toBe(0);
      expect(metrics.corrections_incorporated).toBe(0);
    });

    it("tracks failure count", () => {
      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Error 1",
      });

      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X200"],
        description: "Error 2",
      });

      const metrics = engine.getMetrics();
      expect(metrics.total_failures).toBe(2);
    });

    it("tracks most common category", () => {
      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000"],
        description: "Spindle overload",
      });

      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S9000"],
        description: "Spindle speed too high",
      });

      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Syntax error",
      });

      const metrics = engine.getMetrics();
      expect(metrics.most_common_category).toBe("spindle_error");
    });

    it("calculates accuracy improvement", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000"],
        description: "Spindle error",
      });

      const correction = engine.analyzeFailure(failure.id)!;
      engine.verifyCorrection(correction.id, { success: true, message: "OK" });
      engine.incorporateCorrection(correction.id);

      const metrics = engine.getMetrics();
      expect(metrics.accuracy_improvement).toBe(100);
    });
  });

  // ── Query Methods Tests ───────────────────────────────────────────────────

  describe("getPendingFailures", () => {
    it("returns only new and analyzing failures", () => {
      const failure1 = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Error 1",
      });

      const failure2 = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000"],
        description: "Error 2",
      });

      engine.analyzeFailure(failure1.id);

      const pending = engine.getPendingFailures();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(failure2.id);
    });
  });

  describe("getAllFailures", () => {
    it("returns all failures", () => {
      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Error 1",
      });

      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X200"],
        description: "Error 2",
      });

      expect(engine.getAllFailures().length).toBe(2);
    });
  });

  describe("getCorrectionsForFailure", () => {
    it("returns corrections for specific failure", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["S8000"],
        description: "Spindle error",
      });

      engine.analyzeFailure(failure.id);

      const corrections = engine.getCorrectionsForFailure(failure.id);
      expect(corrections.length).toBe(1);
    });

    it("returns empty array for failure with no corrections", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Error",
      });

      const corrections = engine.getCorrectionsForFailure(failure.id);
      expect(corrections.length).toBe(0);
    });
  });

  // ── Static Methods ────────────────────────────────────────────────────────

  describe("getVersion", () => {
    it("returns version string", () => {
      expect(LathePostGeneratorActiveLearningEngine.getVersion()).toBe("1.0.0");
    });
  });

  describe("reset", () => {
    it("clears all data", () => {
      engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G00 X100"],
        description: "Error",
      });

      engine.reset();

      expect(engine.getAllFailures().length).toBe(0);
      expect(engine.getIncorporatedRulesCount()).toBe(0);
    });
  });

  // ── Singleton Tests ───────────────────────────────────────────────────────

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(lathePostGeneratorActiveLearningEngine).toBeDefined();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty gcode snippet", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: [],
        description: "Empty program error",
      });

      expect(failure.category).toBe("unknown");
    });

    it("handles performance issues as minor severity", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G01 X100. F0.5"],
        description: "Surface finish quality issue - chatter marks",
      });

      expect(failure.category).toBe("performance_issue");
      expect(failure.severity).toBe("cosmetic");
    });

    it("handles coordinate errors", () => {
      const failure = engine.queueFailure({
        controller: "fanuc-31it",
        gcode_snippet: ["G54", "G00 X100."],
        description: "Work offset G54 not set",
        machine_message: "COORDINATE SYSTEM ERROR",
      });

      expect(failure.category).toBe("coordinate_error");
    });

    it("handles compatibility errors", () => {
      const failure = engine.queueFailure({
        controller: "haas-ngc",
        gcode_snippet: ["G112"],
        description: "Guide bushing mode not supported",
        machine_message: "UNKNOWN COMMAND G112",
      });

      expect(failure.category).toBe("compatibility_error");
    });
  });
});
