/**
 * Tests for TK-MS3-U16: TribalKnowledgeAdvisorEngine
 * Validates Tier 2/3 modifier extraction and conflict resolution.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TribalKnowledgeAdvisorEngine,
  tribalKnowledgeAdvisorEngine,
  type TribalQueryContext,
  type TribalModifiers,
  type TribalConstraints,
  type TribalAdvisory,
  type CalibrationFeedback,
} from "../engines/TribalKnowledgeAdvisorEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

describe("TK-MS3-U16: TribalKnowledgeAdvisorEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(tribalKnowledgeAdvisorEngine).toBeDefined();
      expect(tribalKnowledgeAdvisorEngine).toBeInstanceOf(TribalKnowledgeAdvisorEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new TribalKnowledgeAdvisorEngine();
      expect(engine).toBeInstanceOf(TribalKnowledgeAdvisorEngine);
    });

    it("has all required methods", () => {
      const engine = new TribalKnowledgeAdvisorEngine();
      expect(typeof engine.getModifiers).toBe("function");
      expect(typeof engine.getConstraints).toBe("function");
      expect(typeof engine.getAdvisory).toBe("function");
      expect(typeof engine.ingestCalibrationFeedback).toBe("function");
    });
  });

  // ============================================================================
  // getModifiers() TESTS
  // ============================================================================

  describe("getModifiers()", () => {
    describe("default modifiers", () => {
      it("returns valid modifiers with safety-clamped values", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        // Query with context - may or may not match tips
        const result = engine.getModifiers({
          material: "unobtainium",
          iso_group: "Z",
          operation: "teleportation",
        });

        // All modifiers should be within safety bounds
        expect(result.vc_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.vc_modifier).toBeLessThanOrEqual(1.3);
        expect(result.fz_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.fz_modifier).toBeLessThanOrEqual(1.3);
        expect(result.ap_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.ap_modifier).toBeLessThanOrEqual(1.3);
        expect(result.ae_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.ae_modifier).toBeLessThanOrEqual(1.3);
        expect(result.tool_life_modifier).toBeGreaterThanOrEqual(0.5);
        expect(result.tool_life_modifier).toBeLessThanOrEqual(2.0);
        expect(result.iso_speed_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.iso_speed_modifier).toBeLessThanOrEqual(1.3);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.evidence_count).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.source_tips)).toBe(true);
      });

      it("returns null for override fields when no tips found", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ material: "unknown" });

        expect(result.machinability_factor_override).toBeNull();
        expect(result.machine_rate_override).toBeNull();
        expect(result.cycle_time_base_override).toBeNull();
        expect(result.setup_count_override).toBeNull();
        expect(result.setup_time_per_setup_min).toBeNull();
      });
    });

    describe("modifier structure", () => {
      it("returns complete TribalModifiers structure", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "P" });

        // Verify structure completeness
        expect(result).toHaveProperty("vc_modifier");
        expect(result).toHaveProperty("fz_modifier");
        expect(result).toHaveProperty("ap_modifier");
        expect(result).toHaveProperty("ae_modifier");
        expect(result).toHaveProperty("tool_life_modifier");
        expect(result).toHaveProperty("machinability_factor_override");
        expect(result).toHaveProperty("machine_rate_override");
        expect(result).toHaveProperty("cycle_time_base_override");
        expect(result).toHaveProperty("setup_count_override");
        expect(result).toHaveProperty("setup_time_per_setup_min");
        expect(result).toHaveProperty("iso_speed_modifier");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("evidence_count");
        expect(result).toHaveProperty("source_tips");
        expect(result).toHaveProperty("auto_apply_approved");
      });

      it("modifiers are numeric values", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "M" });

        expect(typeof result.vc_modifier).toBe("number");
        expect(typeof result.fz_modifier).toBe("number");
        expect(typeof result.ap_modifier).toBe("number");
        expect(typeof result.ae_modifier).toBe("number");
        expect(typeof result.tool_life_modifier).toBe("number");
        expect(typeof result.iso_speed_modifier).toBe("number");
        expect(typeof result.confidence).toBe("number");
        expect(typeof result.evidence_count).toBe("number");
      });

      it("source_tips is array of strings", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "K" });

        expect(Array.isArray(result.source_tips)).toBe(true);
        result.source_tips.forEach(tip => {
          expect(typeof tip).toBe("string");
        });
      });
    });

    describe("safety clamping", () => {
      it("clamps modifier values to [0.7, 1.3] range", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        // Get modifiers for any context - just verify clamping behavior
        const result = engine.getModifiers({ iso_group: "H", operation: "roughing" });

        // All modifiers must be within safety bounds
        expect(result.vc_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.vc_modifier).toBeLessThanOrEqual(1.3);
        expect(result.fz_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.fz_modifier).toBeLessThanOrEqual(1.3);
        expect(result.ap_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.ap_modifier).toBeLessThanOrEqual(1.3);
        expect(result.ae_modifier).toBeGreaterThanOrEqual(0.7);
        expect(result.ae_modifier).toBeLessThanOrEqual(1.3);
      });

      it("tool_life_modifier has wider range [0.5, 2.0]", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "P", operation: "finishing" });

        expect(result.tool_life_modifier).toBeGreaterThanOrEqual(0.5);
        expect(result.tool_life_modifier).toBeLessThanOrEqual(2.0);
      });
    });

    describe("context filtering", () => {
      it("accepts material context", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ material: "4140 steel" });

        expect(result).toBeDefined();
        expect(result.vc_modifier).toBeGreaterThanOrEqual(0.7);
      });

      it("accepts iso_group context", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "H" });

        expect(result).toBeDefined();
        expect(typeof result.vc_modifier).toBe("number");
      });

      it("accepts operation context", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ operation: "drilling" });

        expect(result).toBeDefined();
        expect(typeof result.fz_modifier).toBe("number");
      });

      it("accepts machine_id context", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ machine_id: "okuma-lb3000" });

        expect(result).toBeDefined();
      });

      it("accepts combined context", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({
          material: "D2",
          iso_group: "H",
          operation: "finishing",
          machine_id: "roku-roku",
          tool_type: "endmill",
          tool_diameter_mm: 10,
        });

        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe("auto_apply_approved gate", () => {
      it("sets auto_apply_approved to false for low evidence count", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ material: "unknown-material" });

        // With no tips, evidence_count should be 0
        if (result.evidence_count < 5) {
          expect(result.auto_apply_approved).toBe(false);
        }
      });

      it("auto_apply_approved requires min 5 evidence points", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getModifiers({ iso_group: "P" });

        // If evidence_count < 5, auto_apply must be false
        if (result.evidence_count < 5) {
          expect(result.auto_apply_approved).toBe(false);
        }
      });
    });
  });

  // ============================================================================
  // getConstraints() TESTS
  // ============================================================================

  describe("getConstraints()", () => {
    describe("default constraints", () => {
      it("returns valid constraint structure with appropriate types", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ material: "unobtainium" });

        // Numeric constraints are null or positive numbers
        if (result.max_speed !== null) {
          expect(result.max_speed).toBeGreaterThan(0);
        }
        if (result.min_speed !== null) {
          expect(result.min_speed).toBeGreaterThan(0);
        }
        if (result.max_rpm !== null) {
          expect(result.max_rpm).toBeGreaterThan(0);
        }
        if (result.max_feed !== null) {
          expect(result.max_feed).toBeGreaterThan(0);
        }
        if (result.min_passes !== null) {
          expect(result.min_passes).toBeGreaterThan(0);
        }

        // Arrays must be arrays
        expect(Array.isArray(result.forbidden_machines)).toBe(true);
        expect(Array.isArray(result.forced_dependencies)).toBe(true);
        expect(Array.isArray(result.phase_overrides)).toBe(true);
        expect(Array.isArray(result.required_probe_after)).toBe(true);
        expect(Array.isArray(result.source_tips)).toBe(true);
      });
    });

    describe("constraint structure", () => {
      it("returns complete TribalConstraints structure", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ iso_group: "H" });

        expect(result).toHaveProperty("max_speed");
        expect(result).toHaveProperty("min_speed");
        expect(result).toHaveProperty("max_rpm");
        expect(result).toHaveProperty("max_feed");
        expect(result).toHaveProperty("min_passes");
        expect(result).toHaveProperty("required_machine");
        expect(result).toHaveProperty("forbidden_machines");
        expect(result).toHaveProperty("forced_dependencies");
        expect(result).toHaveProperty("phase_overrides");
        expect(result).toHaveProperty("required_probe_after");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("source_tips");
      });

      it("forbidden_machines is array of strings", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ iso_group: "H" });

        expect(Array.isArray(result.forbidden_machines)).toBe(true);
      });

      it("forced_dependencies has correct structure", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ operation: "drilling" });

        expect(Array.isArray(result.forced_dependencies)).toBe(true);
        result.forced_dependencies.forEach(dep => {
          expect(dep).toHaveProperty("before");
          expect(dep).toHaveProperty("after");
          expect(dep).toHaveProperty("reason");
        });
      });

      it("phase_overrides has correct structure", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ operation: "finishing" });

        expect(Array.isArray(result.phase_overrides)).toBe(true);
        result.phase_overrides.forEach(po => {
          expect(po).toHaveProperty("operation");
          expect(po).toHaveProperty("phase");
          expect(po).toHaveProperty("reason");
        });
      });
    });

    describe("constraint values", () => {
      it("max_speed is positive number or null", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ iso_group: "H", operation: "roughing" });

        if (result.max_speed !== null) {
          expect(result.max_speed).toBeGreaterThan(0);
        }
      });

      it("max_rpm is positive integer or null", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ machine_id: "haas-vf2" });

        if (result.max_rpm !== null) {
          expect(result.max_rpm).toBeGreaterThan(0);
          expect(Number.isInteger(result.max_rpm)).toBe(true);
        }
      });

      it("min_passes is positive integer or null", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ operation: "finishing" });

        if (result.min_passes !== null) {
          expect(result.min_passes).toBeGreaterThan(0);
          expect(Number.isInteger(result.min_passes)).toBe(true);
        }
      });

      it("confidence is between 0 and 1", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getConstraints({ iso_group: "P" });

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // getAdvisory() TESTS
  // ============================================================================

  describe("getAdvisory()", () => {
    describe("advisory structure", () => {
      it("returns complete TribalAdvisory structure", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ iso_group: "H" });

        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("recommendations");
        expect(result).toHaveProperty("notes");
        expect(result).toHaveProperty("source_tips");
      });

      it("all advisory arrays are present", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ operation: "drilling" });

        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(Array.isArray(result.notes)).toBe(true);
        expect(Array.isArray(result.source_tips)).toBe(true);
      });
    });

    describe("advisory content", () => {
      it("returns advisory arrays with valid strings", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ material: "unobtainium" });

        // Arrays may have content or be empty, but must be arrays of strings
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(Array.isArray(result.notes)).toBe(true);
        expect(Array.isArray(result.source_tips)).toBe(true);

        // If there are warnings, they should be strings
        result.warnings.forEach(w => {
          expect(typeof w).toBe("string");
        });
        result.recommendations.forEach(r => {
          expect(typeof r).toBe("string");
        });
        result.notes.forEach(n => {
          expect(typeof n).toBe("string");
        });
      });

      it("limits warnings to max 5 entries", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ iso_group: "H", operation: "roughing" });

        expect(result.warnings.length).toBeLessThanOrEqual(5);
      });

      it("limits recommendations to max 10 entries", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ iso_group: "P", operation: "finishing" });

        expect(result.recommendations.length).toBeLessThanOrEqual(10);
      });

      it("limits notes to max 5 entries", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ iso_group: "M" });

        expect(result.notes.length).toBeLessThanOrEqual(5);
      });

      it("advisory strings contain category prefix", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const result = engine.getAdvisory({ iso_group: "H" });

        // Check format: "[category] title: body..."
        const allAdvisory = [...result.warnings, ...result.recommendations, ...result.notes];
        allAdvisory.forEach(item => {
          expect(item).toMatch(/^\[/); // Starts with [
        });
      });
    });

    describe("context filtering", () => {
      it("queries multiple categories for advisory", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        // Advisory queries safety, troubleshooting, setup, tooling, speeds_feeds, etc.
        const result = engine.getAdvisory({
          iso_group: "H",
          operation: "drilling",
          machine_id: "okuma-lb3000",
        });

        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================================
  // ingestCalibrationFeedback() TESTS
  // ============================================================================

  describe("ingestCalibrationFeedback()", () => {
    describe("feedback acceptance", () => {
      it("accepts valid calibration feedback", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        const feedback: CalibrationFeedback = {
          context: { iso_group: "P", operation: "turning" },
          predicted_value: 100,
          actual_value: 95,
          metric: "vc",
          submitted_by: "operator-1",
          timestamp: new Date().toISOString(),
        };

        const result = engine.ingestCalibrationFeedback(feedback);

        expect(result.accepted).toBe(true);
        expect(typeof result.adjustment).toBe("number");
      });

      it("computes correct adjustment factor", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        const feedback: CalibrationFeedback = {
          context: { iso_group: "M" },
          predicted_value: 100,
          actual_value: 90, // 10% lower than predicted
          metric: "fz",
          submitted_by: "test",
          timestamp: new Date().toISOString(),
        };

        const result = engine.ingestCalibrationFeedback(feedback);

        // Adjustment should be actual/predicted = 0.9
        expect(result.adjustment).toBeCloseTo(0.9, 2);
      });

      it("clamps adjustment to safety range", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        // Extreme deviation: actual is 50% of predicted
        const feedback: CalibrationFeedback = {
          context: { iso_group: "H" },
          predicted_value: 100,
          actual_value: 50, // Would give 0.5 ratio
          metric: "tool_life",
          submitted_by: "test",
          timestamp: new Date().toISOString(),
        };

        const result = engine.ingestCalibrationFeedback(feedback);

        // Should be clamped to 0.7 minimum
        expect(result.adjustment).toBeGreaterThanOrEqual(0.7);
      });

      it("clamps adjustment for high deviation", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        // Extreme deviation: actual is 200% of predicted
        const feedback: CalibrationFeedback = {
          context: { iso_group: "P" },
          predicted_value: 100,
          actual_value: 200, // Would give 2.0 ratio
          metric: "cycle_time",
          submitted_by: "test",
          timestamp: new Date().toISOString(),
        };

        const result = engine.ingestCalibrationFeedback(feedback);

        // Should be clamped to 1.3 maximum
        expect(result.adjustment).toBeLessThanOrEqual(1.3);
      });
    });

    describe("feedback structure", () => {
      it("accepts feedback without timestamp", () => {
        const engine = new TribalKnowledgeAdvisorEngine();

        const feedback: CalibrationFeedback = {
          context: { iso_group: "K" },
          predicted_value: 50,
          actual_value: 55,
          metric: "ap",
          submitted_by: "operator",
          timestamp: "", // Empty timestamp
        };

        const result = engine.ingestCalibrationFeedback(feedback);
        expect(result.accepted).toBe(true);
      });

      it("accepts various metric types", () => {
        const engine = new TribalKnowledgeAdvisorEngine();
        const metrics = ["vc", "fz", "ap", "ae", "tool_life", "cycle_time", "surface_finish"];

        metrics.forEach(metric => {
          const feedback: CalibrationFeedback = {
            context: { iso_group: "P" },
            predicted_value: 100,
            actual_value: 105,
            metric,
            submitted_by: "test",
            timestamp: new Date().toISOString(),
          };

          const result = engine.ingestCalibrationFeedback(feedback);
          expect(result.accepted).toBe(true);
        });
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty context", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      const modifiers = engine.getModifiers({});
      const constraints = engine.getConstraints({});
      const advisory = engine.getAdvisory({});

      expect(modifiers).toBeDefined();
      expect(constraints).toBeDefined();
      expect(advisory).toBeDefined();
    });

    it("handles undefined values in context", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      const context: TribalQueryContext = {
        material: undefined,
        iso_group: undefined,
        operation: undefined,
      };

      const result = engine.getModifiers(context);
      expect(result).toBeDefined();
    });

    it("handles special characters in context values", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      const result = engine.getModifiers({
        material: "4140-H (heat treated)",
        operation: "rough/finish",
        machine_id: "okuma_lb-3000 ex",
      });

      expect(result).toBeDefined();
    });

    it("is reentrant - multiple calls return consistent results", () => {
      const engine = new TribalKnowledgeAdvisorEngine();
      const context: TribalQueryContext = { iso_group: "P", operation: "turning" };

      const result1 = engine.getModifiers(context);
      const result2 = engine.getModifiers(context);

      expect(result1.vc_modifier).toBe(result2.vc_modifier);
      expect(result1.fz_modifier).toBe(result2.fz_modifier);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it("different instances produce same results for same context", () => {
      const engine1 = new TribalKnowledgeAdvisorEngine();
      const engine2 = new TribalKnowledgeAdvisorEngine();
      const context: TribalQueryContext = { iso_group: "M" };

      const result1 = engine1.getModifiers(context);
      const result2 = engine2.getModifiers(context);

      expect(result1.vc_modifier).toBe(result2.vc_modifier);
    });

    it("handles zero predicted value in calibration feedback", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      const feedback: CalibrationFeedback = {
        context: { iso_group: "P" },
        predicted_value: 0, // Edge case: zero
        actual_value: 100,
        metric: "vc",
        submitted_by: "test",
        timestamp: new Date().toISOString(),
      };

      // Should handle division by zero gracefully
      const result = engine.ingestCalibrationFeedback(feedback);
      expect(result.accepted).toBe(true);
      // Infinity would be clamped to max (1.3)
      expect(result.adjustment).toBeLessThanOrEqual(1.3);
    });

    it("handles negative values in calibration feedback", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      const feedback: CalibrationFeedback = {
        context: { iso_group: "H" },
        predicted_value: -100, // Invalid: negative
        actual_value: 100,
        metric: "vc",
        submitted_by: "test",
        timestamp: new Date().toISOString(),
      };

      const result = engine.ingestCalibrationFeedback(feedback);
      // Should still return a result, clamped
      expect(result.accepted).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION WITH TribalKnowledgeEngine
  // ============================================================================

  describe("integration with TribalKnowledgeEngine", () => {
    it("queries tribalKnowledgeEngine for modifiers", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      // This should internally call tribalKnowledgeEngine.search()
      const result = engine.getModifiers({
        iso_group: "H",
        operation: "roughing",
      });

      // Result depends on actual tribal tips, but structure should be valid
      expect(result).toBeDefined();
      expect(typeof result.vc_modifier).toBe("number");
    });

    it("queries multiple categories for constraints", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      // Should query safety, setup, troubleshooting, tooling categories
      const result = engine.getConstraints({
        iso_group: "H",
        operation: "finishing",
        machine_id: "haas-vf2",
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("deduplicates tips across categories", () => {
      const engine = new TribalKnowledgeAdvisorEngine();

      // Query with context that might match tips in multiple categories
      const result = engine.getModifiers({
        iso_group: "P",
        operation: "turning",
      });

      // source_tips should have unique IDs
      const uniqueIds = new Set(result.source_tips);
      expect(uniqueIds.size).toBe(result.source_tips.length);
    });
  });
});
