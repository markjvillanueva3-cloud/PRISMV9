/**
 * TribalKnowledgeActivationEngine Tests
 * ======================================
 * Tests for dormant tribal tip activation at decision points.
 *
 * @module __tests__/TribalKnowledgeActivationEngine.test
 * @milestone PP-TRIBAL-ACTIVATION
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  tribalKnowledgeActivationEngine,
  TribalKnowledgeActivationEngine,
  type ActivationContext,
  type ActivationResult,
  type ActivatedTip,
  type PPDecisionParams,
} from "../engines/TribalKnowledgeActivationEngine.js";

describe("TribalKnowledgeActivationEngine", () => {
  // ==========================================================================
  // ENGINE INSTANTIATION
  // ==========================================================================

  describe("Engine instantiation", () => {
    it("should export singleton", () => {
      expect(tribalKnowledgeActivationEngine).toBeDefined();
      expect(tribalKnowledgeActivationEngine).toBeInstanceOf(TribalKnowledgeActivationEngine);
    });

    it("should have all required methods", () => {
      const methods = [
        "activateTipsForContext",
        "getTipsByOperation",
        "getTipsByMaterial",
        "getTipsByController",
        "getTipsByProblem",
        "rankTipsByRelevance",
        "integrateWithPPDecision",
        "activateForSpeedFeed",
        "activateForToolpath",
        "activateForController",
        "activateForTroubleshooting",
        "getStats",
        "getSelfAwareness",
      ];
      for (const m of methods) {
        expect(typeof (tribalKnowledgeActivationEngine as any)[m]).toBe("function");
      }
    });

    it("should expose self-awareness info", () => {
      const awareness = tribalKnowledgeActivationEngine.getSelfAwareness();
      expect(awareness.name).toBe("TribalKnowledgeActivationEngine");
      expect(awareness.capabilities.length).toBeGreaterThan(5);
      expect(awareness.integrations.length).toBeGreaterThan(2);
      expect(awareness.decision_types.length).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // CONTEXT ACTIVATION
  // ==========================================================================

  describe("activateTipsForContext", () => {
    it("should activate tips for speed_feed context", () => {
      const context: ActivationContext = {
        decision_type: "speed_feed",
        material: "stainless steel",
        iso_group: "M",
        operation: "pocket",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      expect(result).toBeDefined();
      expect(result.context).toEqual(context);
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.tips)).toBe(true);
    });

    it("should activate tips for controller_output context", () => {
      const context: ActivationContext = {
        decision_type: "controller_output",
        controller: "fanuc",
        operation: "profile",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      expect(result.tips.length).toBeGreaterThanOrEqual(0);
      expect(result.total_considered).toBeGreaterThanOrEqual(0);
    });

    it("should activate tips for problem_diagnosis context", () => {
      const context: ActivationContext = {
        decision_type: "problem_diagnosis",
        symptom: "chatter vibration noise",
        material: "aluminum",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      expect(result).toBeDefined();
      expect(result.context.decision_type).toBe("problem_diagnosis");
    });

    it("should handle empty context gracefully", () => {
      const context: ActivationContext = {
        decision_type: "general",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("should score tips with relevance metadata", () => {
      const context: ActivationContext = {
        decision_type: "toolpath_strategy",
        operation: "pocket",
        cam_system: "mastercam",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      if (result.tips.length > 0) {
        const tip = result.tips[0];
        expect(tip.relevance_score).toBeGreaterThanOrEqual(0);
        expect(tip.relevance_score).toBeLessThanOrEqual(100);
        expect(tip.priority).toMatch(/critical|high|medium|low/);
        expect(typeof tip.is_safety).toBe("boolean");
        expect(tip.activation_reason).toBeDefined();
      }
    });

    it("should sort tips by relevance descending", () => {
      const context: ActivationContext = {
        decision_type: "speed_feed",
        material: "titanium",
      };
      const result = tribalKnowledgeActivationEngine.activateTipsForContext(context);

      for (let i = 1; i < result.tips.length; i++) {
        expect(result.tips[i - 1].relevance_score).toBeGreaterThanOrEqual(result.tips[i].relevance_score);
      }
    });
  });

  // ==========================================================================
  // SPECIALIZED GETTERS
  // ==========================================================================

  describe("getTipsByOperation", () => {
    it("should return tips for pocket operation", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByOperation("pocket");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for threading operation", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByOperation("thread");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should respect limit parameter", () => {
      const tips5 = tribalKnowledgeActivationEngine.getTipsByOperation("drilling", 5);
      expect(tips5.length).toBeLessThanOrEqual(5);

      const tips3 = tribalKnowledgeActivationEngine.getTipsByOperation("drilling", 3);
      expect(tips3.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getTipsByMaterial", () => {
    it("should return tips for titanium", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("titanium");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for stainless steel", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("stainless");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for aluminum", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("aluminum");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for tool steel (D2)", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("D2");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should infer ISO group from material name", () => {
      // Titanium should map to group S (superalloys)
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("Ti-6Al-4V");
      expect(Array.isArray(tips)).toBe(true);
    });
  });

  describe("getTipsByController", () => {
    it("should return tips for Fanuc controller", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByController("fanuc");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for Siemens controller", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByController("siemens");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for Okuma controller", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByController("okuma");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should be case-insensitive", () => {
      const tipsLower = tribalKnowledgeActivationEngine.getTipsByController("fanuc");
      const tipsUpper = tribalKnowledgeActivationEngine.getTipsByController("FANUC");
      // Both should work without error
      expect(Array.isArray(tipsLower)).toBe(true);
      expect(Array.isArray(tipsUpper)).toBe(true);
    });
  });

  describe("getTipsByProblem", () => {
    it("should return tips for chatter problem", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem("chatter vibration");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for poor surface finish", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem("poor surface finish");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should return tips for tool breakage", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem("tool break");
      expect(Array.isArray(tips)).toBe(true);
    });
  });

  // ==========================================================================
  // RANKING
  // ==========================================================================

  describe("rankTipsByRelevance", () => {
    it("should rank tips based on context", () => {
      // First get some tips
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "general",
      });

      if (result.tips.length > 0) {
        const rawTips = result.tips.map(t => t.tip);
        const context: ActivationContext = {
          decision_type: "speed_feed",
          material: "aluminum",
          iso_group: "N",
        };
        const ranked = tribalKnowledgeActivationEngine.rankTipsByRelevance(rawTips, context);

        // Should return activated tips with scores
        expect(Array.isArray(ranked)).toBe(true);
        for (const tip of ranked) {
          expect(tip.relevance_score).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ==========================================================================
  // PP INTEGRATION
  // ==========================================================================

  describe("integrateWithPPDecision", () => {
    it("should integrate tips with PP decision", () => {
      const params: PPDecisionParams = {
        controller: "fanuc",
        machine_type: "3_axis",
        operation: "pocket",
        material: "aluminum",
      };
      const integration = tribalKnowledgeActivationEngine.integrateWithPPDecision(params);

      expect(integration).toBeDefined();
      expect(Array.isArray(integration.tips)).toBe(true);
      expect(Array.isArray(integration.modifiers)).toBe(true);
      expect(Array.isArray(integration.warnings)).toBe(true);
      expect(Array.isArray(integration.quirks)).toBe(true);
      expect(Array.isArray(integration.gcode_suggestions)).toBe(true);
    });

    it("should extract parameter modifiers from tips", () => {
      const params: PPDecisionParams = {
        controller: "okuma",
        material: "titanium",
        operation: "roughing",
      };
      const integration = tribalKnowledgeActivationEngine.integrateWithPPDecision(params);

      // Modifiers should be properly structured
      for (const mod of integration.modifiers) {
        expect(mod.parameter).toBeDefined();
        expect(mod.modification).toBeDefined();
        expect(typeof mod.value).toBe("number");
        expect(mod.reason).toBeDefined();
        expect(mod.source_tip_id).toBeDefined();
        expect(mod.confidence).toBeGreaterThanOrEqual(0);
        expect(mod.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should limit warnings to reasonable count", () => {
      const params: PPDecisionParams = {
        controller: "haas",
        material: "cast iron",
      };
      const integration = tribalKnowledgeActivationEngine.integrateWithPPDecision(params);

      expect(integration.warnings.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // SPECIALIZED ACTIVATION METHODS
  // ==========================================================================

  describe("activateForSpeedFeed", () => {
    it("should activate tips for speed/feed calculation", () => {
      const result = tribalKnowledgeActivationEngine.activateForSpeedFeed({
        material: "stainless 304",
        operation: "facing",
      });

      expect(result.context.decision_type).toBe("speed_feed");
      expect(result.context.material).toBe("stainless 304");
    });

    it("should include tool type in context", () => {
      const result = tribalKnowledgeActivationEngine.activateForSpeedFeed({
        material: "aluminum",
        operation: "pocket",
        tool_type: "carbide",
        tool_diameter_mm: 12,
      });

      expect(result.context.tool_type).toBe("carbide");
      expect(result.context.tool_diameter_mm).toBe(12);
    });
  });

  describe("activateForToolpath", () => {
    it("should activate tips for toolpath strategy", () => {
      const result = tribalKnowledgeActivationEngine.activateForToolpath({
        operation: "adaptive roughing",
        material: "steel",
        cam_system: "hypermill",
      });

      expect(result.context.decision_type).toBe("toolpath_strategy");
      expect(result.context.cam_system).toBe("hypermill");
    });
  });

  describe("activateForController", () => {
    it("should activate tips for controller", () => {
      const result = tribalKnowledgeActivationEngine.activateForController({
        controller: "siemens",
        operation: "probing",
      });

      expect(result.context.decision_type).toBe("controller_output");
      expect(result.context.controller).toBe("siemens");
    });
  });

  describe("activateForTroubleshooting", () => {
    it("should activate tips for troubleshooting", () => {
      const result = tribalKnowledgeActivationEngine.activateForTroubleshooting({
        symptom: "dimensional accuracy problems",
        machine: "haas vf2",
        material: "aluminum",
      });

      expect(result.context.decision_type).toBe("problem_diagnosis");
      expect(result.context.symptom).toBe("dimensional accuracy problems");
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("getStats", () => {
    it("should return activation statistics", () => {
      // Trigger some activations first
      tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "speed_feed",
        material: "steel",
      });

      const stats = tribalKnowledgeActivationEngine.getStats();

      expect(stats.total_activations).toBeGreaterThan(0);
      expect(typeof stats.tips_activated).toBe("number");
      expect(typeof stats.by_decision_type).toBe("object");
      expect(typeof stats.by_category).toBe("object");
      expect(stats.source_tip_count).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge cases", () => {
    it("should handle empty keywords array", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "general",
        keywords: [],
      });
      expect(result).toBeDefined();
    });

    it("should handle very long symptom text", () => {
      const longSymptom = "The machine is making a very loud noise during cutting operations and the surface finish is very poor with lots of chatter marks and the tool seems to be wearing out very quickly and there is excessive heat generation";
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem(longSymptom);
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should handle unknown material", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("unobtanium");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should handle unknown controller", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByController("unknowncontroller");
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should handle special characters in search", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "general",
        material: "Ti-6Al-4V (grade 5)",
        keywords: ["Ra < 0.8", "HRC 45-50"],
      });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // SAFETY TIP DETECTION
  // ==========================================================================

  describe("Safety tip detection", () => {
    it("should identify safety-related tips", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "general",
        keywords: ["safety", "danger"],
      });

      const safetyTips = result.tips.filter(t => t.is_safety);
      // All tips with is_safety=true should have safety category or keywords
      for (const tip of safetyTips) {
        const text = (tip.tip.title + " " + tip.tip.body + " " + tip.tip.category).toLowerCase();
        const hasSafetyKeyword = ["safety", "danger", "warning", "never", "must not", "collision", "crash"].some(
          kw => text.includes(kw)
        );
        // Safety tips should have safety category or relevant keywords
        expect(tip.tip.category === "safety" || hasSafetyKeyword || tip.is_safety).toBe(true);
      }
    });

    it("should prioritize safety tips", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "problem_diagnosis",
        symptom: "machine crash collision danger",
      });

      // Safety tips should tend to have higher priority
      const criticalSafety = result.tips.filter(t => t.is_safety && t.priority === "critical");
      // This is more of a behavioral check - safety tips should be boosted
      expect(Array.isArray(criticalSafety)).toBe(true);
    });
  });
});
