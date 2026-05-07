/**
 * LatheLoRATribalAugmentationEngine Tests
 * LATHE-LORA-MS0 U-LLR28: Tribal knowledge augmentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRATribalAugmentationEngine, type TribalTip, type PlaybookRule } from "../engines/LatheLoRATribalAugmentationEngine.js";

describe("LatheLoRATribalAugmentationEngine", () => {
  beforeEach(() => {
    latheLoRATribalAugmentationEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRATribalAugmentationEngine.getConfig();

      expect(config.max_tips_per_response).toBe(3);
      expect(config.min_relevance_score).toBe(0.5);
      expect(config.include_rationale).toBe(true);
      expect(config.warn_on_anti_patterns).toBe(true);
    });

    it("allows config updates", () => {
      latheLoRATribalAugmentationEngine.setConfig({
        max_tips_per_response: 5,
        min_relevance_score: 0.3,
      });

      const config = latheLoRATribalAugmentationEngine.getConfig();
      expect(config.max_tips_per_response).toBe(5);
      expect(config.min_relevance_score).toBe(0.3);
    });
  });

  describe("getTips", () => {
    it("returns all tips", () => {
      const tips = latheLoRATribalAugmentationEngine.getTips();
      expect(tips.length).toBeGreaterThan(0);
    });

    it("filters by source", () => {
      const jmDieTips = latheLoRATribalAugmentationEngine.getTips("jm_die");
      expect(jmDieTips.every(t => t.source === "jm_die")).toBe(true);
    });

    it("includes JM Die and Okuma tips", () => {
      const tips = latheLoRATribalAugmentationEngine.getTips();
      expect(tips.some(t => t.source === "jm_die")).toBe(true);
      expect(tips.some(t => t.source === "okuma")).toBe(true);
    });
  });

  describe("addTip", () => {
    it("adds custom tip", () => {
      const custom: TribalTip = {
        id: "custom-001",
        content: "Custom tip for testing",
        source: "community",
        keywords: ["test", "custom"],
        priority: 5,
        verified: false,
      };

      latheLoRATribalAugmentationEngine.addTip(custom);

      const tips = latheLoRATribalAugmentationEngine.getTips();
      expect(tips.find(t => t.id === "custom-001")).toBeDefined();
    });
  });

  describe("getRules", () => {
    it("returns all rules", () => {
      const rules = latheLoRATribalAugmentationEngine.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it("filters by category", () => {
      const safetyRules = latheLoRATribalAugmentationEngine.getRules("safety");
      expect(safetyRules.every(r => r.category === "safety")).toBe(true);
    });
  });

  describe("addRule", () => {
    it("adds custom rule", () => {
      const custom: PlaybookRule = {
        id: "custom-rule",
        condition: "Test condition",
        action: "Test action",
        rationale: "Test rationale",
        category: "test",
        severity: "info",
      };

      latheLoRATribalAugmentationEngine.addRule(custom);

      const rules = latheLoRATribalAugmentationEngine.getRules();
      expect(rules.find(r => r.id === "custom-rule")).toBeDefined();
    });
  });

  describe("findRelevantTips", () => {
    it("finds tips by keyword match", () => {
      const tips = latheLoRATribalAugmentationEngine.findRelevantTips(
        "For D2 tool steel, reduce SFM and use coolant.",
        "What parameters for D2?"
      );

      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(t => t.tip.content.toLowerCase().includes("d2"))).toBe(true);
    });

    it("respects max tips config", () => {
      latheLoRATribalAugmentationEngine.setConfig({ max_tips_per_response: 2 });

      const tips = latheLoRATribalAugmentationEngine.findRelevantTips(
        "For roughing D2 on Okuma with coolant and G50 spindle limit.",
        "Everything about lathe"
      );

      expect(tips.length).toBeLessThanOrEqual(2);
    });

    it("filters by minimum relevance", () => {
      latheLoRATribalAugmentationEngine.setConfig({ min_relevance_score: 0.9 });

      const tips = latheLoRATribalAugmentationEngine.findRelevantTips(
        "Random text",
        "Random query"
      );

      expect(tips.length).toBe(0);
    });
  });

  describe("checkRules", () => {
    it("triggers SFM > 500 rule", () => {
      const rules = latheLoRATribalAugmentationEngine.checkRules(
        "Use 600 SFM for steel roughing.",
        "What SFM?"
      );

      expect(rules.some(r => r.id === "rule-001")).toBe(true);
    });

    it("triggers missing G50 rule", () => {
      const rules = latheLoRATribalAugmentationEngine.checkRules(
        "G96 S400 enables constant surface speed.",
        "How to use CSS?"
      );

      expect(rules.some(r => r.id === "rule-002")).toBe(true);
    });

    it("triggers no coolant for steel rule", () => {
      const rules = latheLoRATribalAugmentationEngine.checkRules(
        "For steel turning, use 400 SFM.",
        "Parameters?"
      );

      expect(rules.some(r => r.id === "rule-005")).toBe(true);
    });

    it("does not trigger rules for safe response", () => {
      const rules = latheLoRATribalAugmentationEngine.checkRules(
        "G50 S3000 G96 S400 with flood coolant M08. Verify clearance.",
        "CSS setup"
      );

      // Should not trigger rule-002 (has G50), rule-005 (has coolant), or rule-006 (has verify)
      expect(rules.some(r => r.id === "rule-002")).toBe(false);
      expect(rules.some(r => r.id === "rule-005")).toBe(false);
    });
  });

  describe("augment", () => {
    it("augments response with relevant tips", () => {
      const result = latheLoRATribalAugmentationEngine.augment(
        "For D2 tool steel roughing, use carbide inserts.",
        "What for D2?"
      );

      expect(result.augmented_response).toContain("Shop Floor Tips");
      expect(result.tips_applied.length).toBeGreaterThan(0);
    });

    it("adds critical warnings", () => {
      const result = latheLoRATribalAugmentationEngine.augment(
        "G96 S400 enables constant surface speed.",
        "How to use CSS?"
      );

      expect(result.augmented_response).toContain("CRITICAL");
      expect(result.rules_triggered.some(r => r.severity === "critical")).toBe(true);
    });

    it("calculates confidence boost", () => {
      const result = latheLoRATribalAugmentationEngine.augment(
        "For D2 tool steel, reduce SFM by 20%.",
        "D2 parameters"
      );

      expect(result.confidence_boost).toBeGreaterThan(0);
    });

    it("preserves original response", () => {
      const original = "Simple response.";
      const result = latheLoRATribalAugmentationEngine.augment(original, "query");

      expect(result.original_response).toBe(original);
    });
  });

  describe("searchTips", () => {
    it("searches by keyword", () => {
      const tips = latheLoRATribalAugmentationEngine.searchTips("coolant");
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(t => t.content.toLowerCase().includes("coolant"))).toBe(true);
    });

    it("searches content", () => {
      const tips = latheLoRATribalAugmentationEngine.searchTips("deflection");
      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe("getTipsByMaterial", () => {
    it("returns tips for D2", () => {
      const tips = latheLoRATribalAugmentationEngine.getTipsByMaterial("D2");
      expect(tips.length).toBeGreaterThan(0);
    });

    it("returns tips for M2", () => {
      const tips = latheLoRATribalAugmentationEngine.getTipsByMaterial("M2");
      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe("getTipsByOperation", () => {
    it("returns tips for roughing", () => {
      const tips = latheLoRATribalAugmentationEngine.getTipsByOperation("roughing");
      expect(tips.length).toBeGreaterThan(0);
    });

    it("returns tips for boring", () => {
      const tips = latheLoRATribalAugmentationEngine.getTipsByOperation("boring");
      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("returns statistics", () => {
      const stats = latheLoRATribalAugmentationEngine.getStats();

      expect(stats.total_tips).toBeGreaterThan(0);
      expect(stats.tips_by_source.jm_die).toBeGreaterThan(0);
      expect(stats.tips_by_source.okuma).toBeGreaterThan(0);
      expect(stats.total_rules).toBeGreaterThan(0);
      expect(stats.rules_by_severity.critical).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("resets to defaults", () => {
      latheLoRATribalAugmentationEngine.addTip({
        id: "custom",
        content: "Custom",
        source: "community",
        keywords: ["test"],
        priority: 1,
        verified: false,
      });

      latheLoRATribalAugmentationEngine.reset();

      const tips = latheLoRATribalAugmentationEngine.getTips();
      expect(tips.find(t => t.id === "custom")).toBeUndefined();
    });
  });
});
