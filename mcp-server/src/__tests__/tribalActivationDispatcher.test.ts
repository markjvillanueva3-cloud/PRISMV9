/**
 * Tribal Activation Dispatcher Tests
 * PP-AGI-S0/U-S0-04: Activate 3,594 dormant tribal tips
 */
import { describe, it, expect } from "vitest";
import { tribalKnowledgeActivationEngine } from "../engines/TribalKnowledgeActivationEngine.js";
import { tribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";

describe("tribalActivationDispatcher", () => {
  describe("activateTipsForContext", () => {
    it("should activate tips for speed_feed context", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "speed_feed",
        material: "aluminum",
        iso_group: "N",
        operation: "milling",
      });
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("total_considered");
      expect(result).toHaveProperty("total_activated");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.tips)).toBe(true);
    });

    it("should activate tips for problem_diagnosis context", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "problem_diagnosis",
        symptom: "chatter",
        machine: "VTL",
      });
      expect(result).toHaveProperty("tips");
      expect(result.context.decision_type).toBe("problem_diagnosis");
    });

    it("should activate tips for controller_output context", () => {
      const result = tribalKnowledgeActivationEngine.activateTipsForContext({
        decision_type: "controller_output",
        controller: "fanuc",
      });
      expect(result).toHaveProperty("tips");
      expect(result.context.controller).toBe("fanuc");
    });
  });

  describe("getTipsByProblem", () => {
    it("should return tips for chatter problem", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem("chatter vibration");
      expect(Array.isArray(tips)).toBe(true);
      for (const tip of tips) {
        expect(tip).toHaveProperty("tip");
        expect(tip).toHaveProperty("relevance_score");
        expect(tip).toHaveProperty("activation_reason");
        expect(tip).toHaveProperty("priority");
      }
    });

    it("should respect limit parameter", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByProblem("surface finish", 5);
      expect(tips.length).toBeLessThanOrEqual(5);
    });
  });

  describe("activateForSpeedFeed", () => {
    it("should return activation result for titanium roughing", () => {
      const result = tribalKnowledgeActivationEngine.activateForSpeedFeed({
        material: "titanium",
        operation: "roughing",
        tool_type: "carbide",
      });
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("context");
      expect(result.context.decision_type).toBe("speed_feed");
    });

    it("should handle tool diameter parameter", () => {
      const result = tribalKnowledgeActivationEngine.activateForSpeedFeed({
        material: "steel",
        operation: "finishing",
        tool_diameter_mm: 12,
        hardness_hrc: 45,
      });
      expect(result).toHaveProperty("total_activated");
      expect(typeof result.total_activated).toBe("number");
    });
  });

  describe("activateForToolpath", () => {
    it("should return tips for pocket milling", () => {
      const result = tribalKnowledgeActivationEngine.activateForToolpath({
        operation: "pocket",
        material: "aluminum",
        cam_system: "mastercam",
      });
      expect(result).toHaveProperty("tips");
      expect(result.context.decision_type).toBe("toolpath_strategy");
    });

    it("should handle feature parameter", () => {
      const result = tribalKnowledgeActivationEngine.activateForToolpath({
        operation: "adaptive",
        feature: "deep pocket",
      });
      expect(result).toHaveProperty("summary");
    });
  });

  describe("activateForController", () => {
    it("should return tips for Fanuc controller", () => {
      const result = tribalKnowledgeActivationEngine.activateForController({
        controller: "fanuc",
        operation: "threading",
      });
      expect(result).toHaveProperty("tips");
      expect(result.context.decision_type).toBe("controller_output");
    });

    it("should handle Haas controller", () => {
      const result = tribalKnowledgeActivationEngine.activateForController({
        controller: "haas",
      });
      expect(result).toHaveProperty("total_considered");
    });
  });

  describe("activateForTroubleshooting", () => {
    it("should return tips for tool breakage", () => {
      const result = tribalKnowledgeActivationEngine.activateForTroubleshooting({
        symptom: "tool breakage",
        material: "hardened steel",
      });
      expect(result).toHaveProperty("tips");
      expect(result.context.decision_type).toBe("problem_diagnosis");
    });

    it("should include machine context", () => {
      const result = tribalKnowledgeActivationEngine.activateForTroubleshooting({
        symptom: "poor surface finish",
        machine: "lathe",
        operation: "turning",
      });
      expect(result.context.machine).toBe("lathe");
    });
  });

  describe("getStats", () => {
    it("should return activation statistics", () => {
      const stats = tribalKnowledgeActivationEngine.getStats();
      expect(stats).toHaveProperty("total_activations");
      expect(stats).toHaveProperty("tips_activated");
      expect(stats).toHaveProperty("by_decision_type");
      expect(stats).toHaveProperty("by_category");
      expect(stats).toHaveProperty("source_tip_count");
      expect(typeof stats.total_activations).toBe("number");
    });
  });

  describe("getSelfAwareness", () => {
    it("should return engine self-awareness info", () => {
      const awareness = tribalKnowledgeActivationEngine.getSelfAwareness();
      expect(awareness).toHaveProperty("name", "TribalKnowledgeActivationEngine");
      expect(awareness).toHaveProperty("description");
      expect(awareness).toHaveProperty("capabilities");
      expect(awareness).toHaveProperty("integrations");
      expect(awareness).toHaveProperty("decision_types");
      expect(Array.isArray(awareness.capabilities)).toBe(true);
      expect(awareness.capabilities.length).toBeGreaterThan(5);
    });
  });

  describe("getTipsByMaterial", () => {
    it("should return tips for stainless steel", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByMaterial("stainless steel");
      expect(Array.isArray(tips)).toBe(true);
    });
  });

  describe("getTipsByController", () => {
    it("should return tips for Siemens controller", () => {
      const tips = tribalKnowledgeActivationEngine.getTipsByController("siemens");
      expect(Array.isArray(tips)).toBe(true);
    });
  });

  describe("rankTipsByRelevance", () => {
    it("should rank tips by context relevance", () => {
      const sampleTips = tribalKnowledgeEngine.search({ limit: 5 });
      const ranked = tribalKnowledgeActivationEngine.rankTipsByRelevance(sampleTips, {
        decision_type: "speed_feed",
        material: "aluminum",
      });
      expect(Array.isArray(ranked)).toBe(true);
      if (ranked.length > 1) {
        expect(ranked[0].relevance_score).toBeGreaterThanOrEqual(ranked[1].relevance_score);
      }
    });
  });

  describe("integrateWithPPDecision", () => {
    it("should integrate tips into post processor decision", () => {
      const result = tribalKnowledgeActivationEngine.integrateWithPPDecision({
        controller: "fanuc",
        machine_type: "mill",
        operation: "drilling",
      });
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("modifiers");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("quirks");
      expect(result).toHaveProperty("gcode_suggestions");
      expect(Array.isArray(result.modifiers)).toBe(true);
    });
  });
});
