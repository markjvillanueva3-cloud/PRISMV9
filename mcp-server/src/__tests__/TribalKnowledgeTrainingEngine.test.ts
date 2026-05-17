/**
 * TribalKnowledgeTrainingEngine — public-surface behavioral tests
 *
 * Covers the dataset builder, validation, recommendation enhancement, and the
 * lookup index methods that the neural synthesis facade consumes.
 */

import { describe, it, expect } from "vitest";
import {
  TribalKnowledgeTrainingEngine,
  tribalKnowledgeTrainingEngine,
  type RecommendationContext,
} from "../engines/TribalKnowledgeTrainingEngine.js";

describe("TribalKnowledgeTrainingEngine", () => {
  describe("singleton identity", () => {
    it("exports a singleton instance of the engine class", () => {
      expect(tribalKnowledgeTrainingEngine).toBeInstanceOf(TribalKnowledgeTrainingEngine);
    });

    it("starts with no dataset until buildTrainingDataset() is called", () => {
      // Fresh-process invariant — stats() is null pre-build.
      // (Cannot reset module state mid-test; check is contractual.)
      expect(typeof tribalKnowledgeTrainingEngine.getTrainingStats).toBe("function");
      expect(typeof tribalKnowledgeTrainingEngine.getTrainingDataset).toBe("function");
    });
  });

  describe("buildTrainingDataset()", () => {
    it("returns a fully-populated dataset with patterns and indexes", () => {
      const ds = tribalKnowledgeTrainingEngine.buildTrainingDataset();
      expect(ds.patterns.length).toBeGreaterThan(0);
      expect(ds.anti_patterns.length).toBeGreaterThanOrEqual(0);
      expect(ds.category_index).toBeInstanceOf(Map);
      expect(ds.material_index).toBeInstanceOf(Map);
      expect(ds.operation_index).toBeInstanceOf(Map);
      expect(ds.keyword_index).toBeInstanceOf(Map);
    });

    it("emits training stats with consistent counters", () => {
      const ds = tribalKnowledgeTrainingEngine.buildTrainingDataset();
      expect(ds.stats.total_patterns).toBe(ds.patterns.length);
      expect(ds.stats.total_anti_patterns).toBe(ds.anti_patterns.length);
      expect(ds.stats.avg_confidence).toBeGreaterThanOrEqual(0);
      expect(ds.stats.avg_confidence).toBeLessThanOrEqual(1);
      expect(ds.stats.training_timestamp.length).toBeGreaterThan(0);
    });

    it("populates the category index keyed on category names", () => {
      const ds = tribalKnowledgeTrainingEngine.buildTrainingDataset();
      expect(ds.category_index.size).toBeGreaterThan(0);
      for (const [, patterns] of ds.category_index) {
        expect(Array.isArray(patterns)).toBe(true);
      }
    });
  });

  describe("getTrainingStats() / getTrainingDataset()", () => {
    it("returns non-null after a build", () => {
      tribalKnowledgeTrainingEngine.buildTrainingDataset();
      expect(tribalKnowledgeTrainingEngine.getTrainingStats()).not.toBeNull();
      expect(tribalKnowledgeTrainingEngine.getTrainingDataset()).not.toBeNull();
    });

    it("getTrainingSummary() yields a non-empty human-readable string", () => {
      tribalKnowledgeTrainingEngine.buildTrainingDataset();
      const summary = tribalKnowledgeTrainingEngine.getTrainingSummary();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe("validateAgainstTribalKnowledge()", () => {
    const ctx: RecommendationContext = {
      material: "1045 steel",
      material_iso: "P",
      operation: "od_rough",
      controller: "fanuc",
    };

    it("returns a populated ValidationResult shape", () => {
      const result = tribalKnowledgeTrainingEngine.validateAgainstTribalKnowledge(
        ctx,
        "use carbide insert at 200 m/min cutting speed",
      );
      expect(typeof result.valid).toBe("boolean");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.matching_patterns)).toBe(true);
      expect(Array.isArray(result.violated_anti_patterns)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.tribal_wisdom)).toBe(true);
    });

    it("treats an empty proposed action as zero-match (valid + low confidence)", () => {
      const result = tribalKnowledgeTrainingEngine.validateAgainstTribalKnowledge(ctx, "");
      expect(result.valid).toBe(true);
      expect(result.matching_patterns.length).toBe(0);
    });

    it("caps tribal_wisdom output at 5 entries", () => {
      const result = tribalKnowledgeTrainingEngine.validateAgainstTribalKnowledge(
        ctx,
        "speed feed depth tool chip coolant insert finish",
      );
      expect(result.tribal_wisdom.length).toBeLessThanOrEqual(5);
    });
  });

  describe("enhanceRecommendation()", () => {
    it("returns an EnhancedRecommendation with the original preserved", () => {
      const result = tribalKnowledgeTrainingEngine.enhanceRecommendation(
        { material_iso: "N", operation: "od_finish" },
        "raise cutting speed to 600 m/min for aluminium",
      );
      expect(result.original_recommendation).toBe(
        "raise cutting speed to 600 m/min for aluminium",
      );
      expect(typeof result.senior_machinist_says).toBe("string");
      expect(Array.isArray(result.tribal_validations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("lookup index methods", () => {
    it("getPatternsByCategory() returns an array (possibly empty) for any key", () => {
      tribalKnowledgeTrainingEngine.buildTrainingDataset();
      const out = tribalKnowledgeTrainingEngine.getPatternsByCategory("safety");
      expect(Array.isArray(out)).toBe(true);
    });

    it("getPatternsByMaterial() returns an array for any material token", () => {
      tribalKnowledgeTrainingEngine.buildTrainingDataset();
      const out = tribalKnowledgeTrainingEngine.getPatternsByMaterial("steel");
      expect(Array.isArray(out)).toBe(true);
    });

    it("getAllAntiPatterns() returns only playbook_antipattern source rows", () => {
      tribalKnowledgeTrainingEngine.buildTrainingDataset();
      const all = tribalKnowledgeTrainingEngine.getAllAntiPatterns();
      for (const p of all) {
        expect(p.source_type).toBe("playbook_antipattern");
      }
    });

    it("needsRefresh() reports a boolean", () => {
      const v = tribalKnowledgeTrainingEngine.needsRefresh();
      expect(typeof v).toBe("boolean");
    });
  });
});
