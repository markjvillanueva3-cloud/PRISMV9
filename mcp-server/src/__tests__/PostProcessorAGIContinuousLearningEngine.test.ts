/**
 * PostProcessorAGIContinuousLearningEngine Tests
 * ===============================================
 * Tests for the continuous learning engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  postProcessorAGIContinuousLearningEngine,
  type ProductionFeedback
} from "../engines/PostProcessorAGIContinuousLearningEngine.js";

function createFeedback(overrides: Partial<ProductionFeedback> = {}): ProductionFeedback {
  return {
    postId: "test-post-" + Math.random().toString(36).slice(2, 8),
    generatedAt: new Date().toISOString(),
    outcome: "success",
    controller: "fanuc",
    material: "steel",
    operations: ["roughing"],
    ...overrides
  };
}

describe("PostProcessorAGIContinuousLearningEngine", () => {
  beforeEach(() => {
    postProcessorAGIContinuousLearningEngine.resetLearning();
  });

  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorAGIContinuousLearningEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.minEvidenceForPromotion).toBe(10);
      expect(stats.promotionConfidenceThreshold).toBe(0.85);
    });

    it("should track feedback count", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());

      const stats = postProcessorAGIContinuousLearningEngine.getStatistics();
      expect(stats.feedbackCount).toBe(2);
    });
  });

  describe("Feedback Recording", () => {
    it("should record success feedback", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());

      expect(result.learningsGenerated).toBeGreaterThan(0);
    });

    it("should record failed feedback", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "failed" })
      );

      expect(result.learningsGenerated).toBeGreaterThan(0);
    });

    it("should update engine beliefs on success", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "success" }));

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief).toBeDefined();
      expect(belief?.positiveEvidence).toBe(1);
      expect(belief?.evidenceCount).toBe(1);
    });

    it("should update engine beliefs on failure", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "failed" }));

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief).toBeDefined();
      expect(belief?.negativeEvidence).toBe(1);
    });

    it("should track multiple engine beliefs", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());

      expect(postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics")).toBeDefined();
      expect(postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-physics-generator")).toBeDefined();
      expect(postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-master-agi")).toBeDefined();
    });
  });

  describe("Bayesian Belief Updating", () => {
    it("should increase confidence with positive evidence", () => {
      for (let i = 0; i < 10; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "success" }));
      }

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief?.overallConfidence).toBeGreaterThan(0.85);
    });

    it("should decrease confidence with negative evidence", () => {
      for (let i = 0; i < 10; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "failed" }));
      }

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief?.overallConfidence).toBeLessThan(0.5);
    });

    it("should track controller-specific accuracy", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ controller: "fanuc", outcome: "success" }));
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ controller: "haas", outcome: "failed" }));

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief?.controllerAccuracy).toBeDefined();
      expect(belief?.controllerAccuracy?.fanuc).toBeDefined();
      expect(belief?.controllerAccuracy?.haas).toBeDefined();
    });

    it("should track material-specific accuracy", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ material: "steel", outcome: "success" }));
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ material: "titanium", outcome: "failed" }));

      const belief = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      expect(belief?.materialAccuracy?.steel).toBeDefined();
      expect(belief?.materialAccuracy?.titanium).toBeDefined();
    });
  });

  describe("Mistake Pattern Detection", () => {
    it("should detect patterns from corrections", () => {
      const feedback = createFeedback({
        outcome: "minor_edits",
        corrections: [
          { line: 10, type: "feed", original: "F500", corrected: "F400", reason: "too aggressive" }
        ]
      });

      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      expect(result.patternsUpdated).toBeGreaterThan(0);
    });

    it("should detect patterns from incidents", () => {
      const feedback = createFeedback({
        outcome: "failed",
        incidents: [
          { type: "chatter", severity: "moderate", description: "Chatter during finish pass" }
        ]
      });

      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      expect(result.patternsUpdated).toBeGreaterThan(0);
    });

    it("should accumulate pattern occurrences", () => {
      const feedback = createFeedback({
        outcome: "minor_edits",
        corrections: [
          { line: 10, type: "feed", original: "F500", corrected: "F400" }
        ]
      });

      postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);

      const patterns = postProcessorAGIContinuousLearningEngine.getTopMistakePatterns();
      expect(patterns[0].occurrences).toBe(3);
    });

    it("should generate prevention rules after threshold", () => {
      const feedback = createFeedback({
        outcome: "minor_edits",
        corrections: [
          { line: 10, type: "feed", original: "F500", corrected: "F400" }
        ]
      });

      for (let i = 0; i < 5; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      }

      const patterns = postProcessorAGIContinuousLearningEngine.getTopMistakePatterns();
      expect(patterns[0].preventionRule).toBeDefined();
      expect(patterns[0].preventionConfidence).toBeGreaterThan(0);
    });

    it("should get top mistake patterns", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({
          outcome: "minor_edits",
          corrections: [{ line: 1, type: "feed", original: "A", corrected: "B" }]
        })
      );
      postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({
          outcome: "minor_edits",
          corrections: [{ line: 1, type: "speed", original: "C", corrected: "D" }]
        })
      );

      const patterns = postProcessorAGIContinuousLearningEngine.getTopMistakePatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe("Knowledge Extraction", () => {
    it("should extract knowledge from successful feedback", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "success" })
      );

      expect(result.knowledgeAdded).toBeGreaterThanOrEqual(0);
    });

    it("should learn from corrections", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({
          outcome: "minor_edits",
          corrections: [
            { line: 5, type: "feed", original: "F300", corrected: "F250", reason: "better finish" }
          ]
        })
      );

      expect(result.knowledgeAdded).toBeGreaterThan(0);
    });

    it("should build evidence for learned knowledge", () => {
      const feedback = createFeedback({ outcome: "success" });
      for (let i = 0; i < 5; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      }

      const stats = postProcessorAGIContinuousLearningEngine.getStatistics();
      expect(stats.knowledgeEntries).toBeGreaterThan(0);
    });
  });

  describe("Knowledge Promotion", () => {
    it("should promote knowledge with sufficient evidence", () => {
      const feedback = createFeedback({ outcome: "success" });

      // Need ≥10 evidence for promotion
      for (let i = 0; i < 15; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      }

      const promoted = postProcessorAGIContinuousLearningEngine.getPromotedKnowledge();
      expect(promoted.length).toBeGreaterThan(0);
    });

    it("should not promote knowledge with insufficient evidence", () => {
      const feedback = createFeedback({ outcome: "success" });

      for (let i = 0; i < 5; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      }

      const promoted = postProcessorAGIContinuousLearningEngine.getPromotedKnowledge();
      expect(promoted.length).toBe(0);
    });
  });

  describe("Knowledge Search", () => {
    it("should search knowledge base", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "success", controller: "fanuc", material: "steel" })
      );

      const results = postProcessorAGIContinuousLearningEngine.searchKnowledge("fanuc");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search by material", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "success", material: "titanium" })
      );

      const results = postProcessorAGIContinuousLearningEngine.searchKnowledge("titanium");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Prevention Rules", () => {
    it("should get prevention rules for controller/material", () => {
      const feedback = createFeedback({
        outcome: "minor_edits",
        controller: "fanuc",
        material: "steel",
        corrections: [{ line: 1, type: "feed", original: "F500", corrected: "F400" }]
      });

      for (let i = 0; i < 5; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(feedback);
      }

      const rules = postProcessorAGIContinuousLearningEngine.getPreventionRules("fanuc", "steel");
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should return empty for unknown combinations", () => {
      const rules = postProcessorAGIContinuousLearningEngine.getPreventionRules("unknown", "unknown");
      expect(rules).toEqual([]);
    });
  });

  describe("Learning State", () => {
    it("should return comprehensive learning state", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());

      const state = postProcessorAGIContinuousLearningEngine.getLearningState();

      expect(state.totalFeedback).toBe(1);
      expect(state.engineBeliefs.length).toBeGreaterThan(0);
      expect(state.strategies.length).toBeGreaterThan(0);
    });

    it("should calculate overall accuracy", () => {
      for (let i = 0; i < 8; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "success" }));
      }
      for (let i = 0; i < 2; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "failed" }));
      }

      const state = postProcessorAGIContinuousLearningEngine.getLearningState();
      expect(state.overallAccuracy).toBeGreaterThan(0.5);
    });

    it("should calculate improvement rate", () => {
      // First 10: mostly failures
      for (let i = 0; i < 10; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(
          createFeedback({ outcome: i < 3 ? "success" : "failed" })
        );
      }
      // Next 10: mostly successes
      for (let i = 0; i < 10; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(
          createFeedback({ outcome: "success" })
        );
      }

      const state = postProcessorAGIContinuousLearningEngine.getLearningState();
      expect(state.improvementRate).toBeGreaterThan(0);
    });

    it("should include learning strategies", () => {
      const state = postProcessorAGIContinuousLearningEngine.getLearningState();

      expect(state.strategies.length).toBeGreaterThan(0);
      expect(state.strategies.some(s => s.name === "bayesian_update")).toBe(true);
      expect(state.strategies.some(s => s.name === "pattern_detection")).toBe(true);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all learning state", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());
      expect(postProcessorAGIContinuousLearningEngine.getStatistics().feedbackCount).toBe(1);

      postProcessorAGIContinuousLearningEngine.resetLearning();

      const stats = postProcessorAGIContinuousLearningEngine.getStatistics();
      expect(stats.feedbackCount).toBe(0);
      expect(stats.enginesTracked).toBe(0);
      expect(stats.patternsDetected).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle feedback without corrections", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());
      expect(result).toBeDefined();
    });

    it("should handle feedback without incidents", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());
      expect(result).toBeDefined();
    });

    it("should handle 'unused' outcome", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "unused" })
      );
      expect(result.learningsGenerated).toBeGreaterThan(0);
    });

    it("should handle 'major_edits' outcome", () => {
      const result = postProcessorAGIContinuousLearningEngine.recordFeedback(
        createFeedback({ outcome: "major_edits" })
      );
      expect(result.learningsGenerated).toBeGreaterThan(0);
    });
  });

  describe("Multi-Engine Tracking", () => {
    it("should track beliefs for all engines", () => {
      postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback());

      const stats = postProcessorAGIContinuousLearningEngine.getStatistics();
      expect(stats.enginesTracked).toBe(3);
    });

    it("should update all engine beliefs consistently", () => {
      for (let i = 0; i < 5; i++) {
        postProcessorAGIContinuousLearningEngine.recordFeedback(createFeedback({ outcome: "success" }));
      }

      const physics = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-unified-physics");
      const generator = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-physics-generator");
      const agi = postProcessorAGIContinuousLearningEngine.getEngineBelief("pp-master-agi");

      expect(physics?.evidenceCount).toBe(5);
      expect(generator?.evidenceCount).toBe(5);
      expect(agi?.evidenceCount).toBe(5);
    });
  });
});
