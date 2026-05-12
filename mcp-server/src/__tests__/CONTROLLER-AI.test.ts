/**
 * CONTROLLER-AI: CNC Controller Deep Learning Engine Tests
 *
 * Tests for controller-specific intelligence:
 * - Controller selection for jobs
 * - G-code translation between dialects
 * - Macro programming patterns
 * - Recovery procedures
 * - Cutter compensation knowledge
 *
 * @module __tests__/CONTROLLER-AI
 */

import { describe, it, expect } from "vitest";
import {
  CNCControllerDeepLearningEngine,
  cncControllerDeepLearning,
  type ControllerFamily,
} from "../engines/CNCControllerDeepLearningEngine.js";

describe("CONTROLLER-AI: CNC Controller Deep Learning Engine", () => {
  const engine = new CNCControllerDeepLearningEngine();

  // ===========================================================================
  // CONTROLLER SELECTION TESTS
  // ===========================================================================
  describe("Controller Selection", () => {
    it("should recommend controllers based on axis requirements", () => {
      const recommendations = engine.selectControllerForJob({
        operation_type: "5axis_milling",
        axes_needed: 5,
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].score).toBeGreaterThan(0);

      // All top recommendations should support 5 axes
      const top3 = recommendations.slice(0, 3);
      top3.forEach(rec => {
        const profile = engine.getControllerProfile(rec.controller);
        expect(profile.max_axes).toBeGreaterThanOrEqual(5);
      });
    });

    it("should filter to JM Die machines when requested", () => {
      const recommendations = engine.selectControllerForJob({
        operation_type: "turning",
        axes_needed: 2,
        jm_die_only: true,
      });

      // Only JM Die available controllers should have scores > 0
      const available = recommendations.filter(r => r.score > 0);
      available.forEach(rec => {
        expect(rec.jm_die_machine).toBeDefined();
      });
    });

    it("should boost score for macro capability when required", () => {
      const withMacro = engine.selectControllerForJob({
        operation_type: "parametric",
        axes_needed: 3,
        macro_required: true,
      });

      const withoutMacro = engine.selectControllerForJob({
        operation_type: "parametric",
        axes_needed: 3,
        macro_required: false,
      });

      // Controllers with macro support should score higher when required
      const haasWithMacro = withMacro.find(r => r.controller === "haas_ngc");
      const haasWithoutMacro = withoutMacro.find(r => r.controller === "haas_ngc");

      expect(haasWithMacro).toBeDefined();
      expect(haasWithoutMacro).toBeDefined();
      expect(haasWithMacro!.score).toBeGreaterThanOrEqual(haasWithoutMacro!.score);
    });

    it("should prefer conversational controllers when specified", () => {
      const recommendations = engine.selectControllerForJob({
        operation_type: "simple_milling",
        axes_needed: 3,
        conversational_preferred: true,
      });

      // Mazak, Hurco, Okuma support conversational
      const conversationalControllers: ControllerFamily[] = ["mazak_mazatrol", "hurco_winmax", "okuma_osp"];
      const topController = recommendations[0].controller;

      // At least one of top 3 should be conversational
      const top3 = recommendations.slice(0, 3).map(r => r.controller);
      const hasConversational = top3.some(c => conversationalControllers.includes(c));
      expect(hasConversational).toBe(true);
    });

    it("should provide reasons for recommendations", () => {
      const recommendations = engine.selectControllerForJob({
        operation_type: "milling",
        axes_needed: 4,
        max_rpm_needed: 15000,
      });

      expect(recommendations[0].reasons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // G-CODE TRANSLATION TESTS
  // ===========================================================================
  describe("G-Code Translation", () => {
    it("should translate cutter comp codes for Heidenhain", () => {
      const program = "G41 D1\nG1 X100 Y100 F500\nG40";
      const result = engine.translateGCode("fanuc", "heidenhain_tnc", program);

      expect(result.translated_code).toContain("RL");
      expect(result.translated_code).toContain("R0");
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it("should warn about Mazatrol translation limitations", () => {
      const program = "MAZATROL CONVERSATIONAL";
      const result = engine.translateGCode("mazak_mazatrol", "fanuc", program);

      expect(result.warnings.some(w => w.includes("Mazatrol"))).toBe(true);
    });

    it("should maintain high confidence for compatible controllers", () => {
      const program = "G0 X0 Y0 Z50\nM3 S5000\nG1 Z-5 F100";
      const result = engine.translateGCode("haas_ngc", "fanuc", program);

      // Haas and Fanuc use same dialect
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should track all changes made", () => {
      const program = "G41 D1\nG42 D2\nG40";
      const result = engine.translateGCode("fanuc", "heidenhain_tnc", program);

      // Should have changes for G41 → RL, G42 → RR, G40 → R0
      expect(result.changes.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle programs with no translation needed", () => {
      const program = "G0 X0 Y0\nM3 S1000";
      const result = engine.translateGCode("fanuc", "haas_ngc", program);

      // Same dialect, no changes needed
      expect(result.changes.length).toBe(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  // ===========================================================================
  // MACRO INTELLIGENCE TESTS
  // ===========================================================================
  describe("Macro Intelligence", () => {
    it("should recommend Okuma V-macro patterns", () => {
      const pattern = engine.recommendMacro("probing setup", "okuma_osp");

      expect(pattern).not.toBeNull();
      if (pattern) {
        expect(pattern.controller).toBe("okuma_osp");
        expect(pattern.code_template).toContain("V");
      }
    });

    it("should recommend Haas macro B patterns", () => {
      const pattern = engine.recommendMacro("tool management production", "haas_ngc");

      expect(pattern).not.toBeNull();
      if (pattern) {
        expect(pattern.controller).toBe("haas_ngc");
        expect(pattern.code_template).toContain("#");
      }
    });

    it("should generate macro code for Okuma", () => {
      const macro = engine.generateMacro("Probe workpiece corner", "okuma_osp");

      expect(macro.code).toContain("VC");
      expect(macro.explanation).toContain("Okuma");
      expect(macro.variables.length).toBeGreaterThan(0);
    });

    it("should generate macro code for Haas", () => {
      const macro = engine.generateMacro("Tool life check", "haas_ngc");

      expect(macro.code).toContain("#");
      expect(macro.explanation).toContain("Macro B");
    });

    it("should generate macro code for Fanuc", () => {
      const macro = engine.generateMacro("Custom cycle", "fanuc");

      expect(macro.code).toContain("#");
      expect(macro.code).toContain("IF");
    });
  });

  // ===========================================================================
  // RECOVERY PROCEDURES TESTS
  // ===========================================================================
  describe("Recovery Procedures", () => {
    it("should have recovery procedure for Hurco power failure", () => {
      const procedure = engine.getRecoveryProcedure("hurco_winmax", "power_failure");

      expect(procedure).not.toBeNull();
      if (procedure) {
        expect(procedure.steps.length).toBeGreaterThan(0);
        expect(procedure.precautions.length).toBeGreaterThan(0);
        expect(procedure.verification.length).toBeGreaterThan(0);
      }
    });

    it("should have recovery procedure for Okuma tool breakage", () => {
      const procedure = engine.getRecoveryProcedure("okuma_osp", "tool_breakage");

      expect(procedure).not.toBeNull();
      if (procedure) {
        expect(procedure.steps.some(s => s.includes("retract") || s.includes("Retract"))).toBe(true);
      }
    });

    it("should return null for unknown scenarios", () => {
      const procedure = engine.getRecoveryProcedure("fanuc", "unknown_scenario_xyz");
      expect(procedure).toBeNull();
    });
  });

  // ===========================================================================
  // POST DEBUGGING TESTS
  // ===========================================================================
  describe("Post Debugging", () => {
    it("should diagnose cutter compensation errors", () => {
      // Use a message that explicitly triggers cutter comp detection
      const result = engine.debugPostIssue("Error: cutter comp G41 overcut detected in profile", "hurco_winmax");

      expect(result.diagnosis.toLowerCase()).toContain("cutter comp");
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(Array.isArray(result.related_knowledge)).toBe(true);
    });

    it("should diagnose axis errors", () => {
      const result = engine.debugPostIssue("Axis X soft limit exceeded without tool", "haas_ngc");

      // Should provide suggestions for limit errors
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should diagnose tool errors", () => {
      const result = engine.debugPostIssue("Tool T15 not found in magazine", "okuma_osp");

      expect(result.diagnosis.toLowerCase()).toContain("tool");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // CONTROLLER PROFILES TESTS
  // ===========================================================================
  describe("Controller Profiles", () => {
    it("should return profile for each controller family", () => {
      const families: ControllerFamily[] = [
        "okuma_osp", "haas_ngc", "hurco_winmax", "fanuc",
        "mazak_mazatrol", "siemens_sinumerik", "heidenhain_tnc", "mitsubishi", "roku_roku"
      ];

      families.forEach(family => {
        const profile = engine.getControllerProfile(family);
        expect(profile).toBeDefined();
        expect(profile.family).toBe(family);
        expect(profile.capabilities.length).toBeGreaterThan(0);
      });
    });

    it("should return JM Die machines", () => {
      const machines = engine.getJMDieMachines();

      expect(machines.length).toBeGreaterThan(10);
      expect(machines.some(m => m.controller === "okuma_osp")).toBe(true);
      expect(machines.some(m => m.controller === "haas_ngc")).toBe(true);
      expect(machines.some(m => m.controller === "hurco_winmax")).toBe(true);
    });

    it("should compare controllers", () => {
      const comparison = engine.compareControllers("okuma_osp", "haas_ngc");

      expect(comparison.comparison.max_axes).toBeDefined();
      expect(comparison.comparison.max_rpm).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
    });
  });

  // ===========================================================================
  // CUTTER COMPENSATION KNOWLEDGE TESTS
  // ===========================================================================
  describe("Cutter Compensation Knowledge", () => {
    it("should have WinMax specific knowledge", () => {
      const knowledge = engine.getCutterCompKnowledge();

      expect(knowledge.winmax).toBeDefined();
      expect(knowledge.winmax.activation).toContain("G41");
      expect(knowledge.winmax.troubleshooting.length).toBeGreaterThan(0);
    });

    it("should have general cutter comp knowledge", () => {
      const knowledge = engine.getCutterCompKnowledge();

      expect(knowledge.general.types.length).toBeGreaterThan(0);
      expect(knowledge.general.common_errors.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // DEEP REASONING TESTS
  // ===========================================================================
  describe("Deep Reasoning", () => {
    it("should analyze query for controller requirements", () => {
      const result = engine.deepReason("Need 5-axis controller for high speed machining at JM Die");

      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.reasoning_chain.some(c => c.includes("5-axis"))).toBe(true);
      expect(result.reasoning_chain.some(c => c.includes("JM Die"))).toBe(true);
    });

    it("should identify specific controller mentions", () => {
      const result = engine.deepReason("Compare Okuma OSP to Fanuc for lathe operations");

      expect(result.reasoning_chain.some(c => c.includes("okuma") || c.includes("Okuma"))).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it("should provide confidence score", () => {
      const result = engine.deepReason("General machining question");

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should provide conclusion", () => {
      const result = engine.deepReason("What controller for simple 3-axis milling?");

      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SINGLETON TESTS
  // ===========================================================================
  describe("Singleton", () => {
    it("should export singleton instance", () => {
      expect(cncControllerDeepLearning).toBeDefined();
      expect(cncControllerDeepLearning).toBeInstanceOf(CNCControllerDeepLearningEngine);
    });

    it("should have all methods available", () => {
      expect(typeof cncControllerDeepLearning.selectControllerForJob).toBe("function");
      expect(typeof cncControllerDeepLearning.translateGCode).toBe("function");
      expect(typeof cncControllerDeepLearning.generateMacro).toBe("function");
      expect(typeof cncControllerDeepLearning.deepReason).toBe("function");
    });
  });
});
