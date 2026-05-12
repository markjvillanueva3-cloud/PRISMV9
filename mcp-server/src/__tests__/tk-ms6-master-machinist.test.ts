/**
 * TK-MS6 U-TK30: Master Machinist Recommendation Mode Tests
 */

import { describe, it, expect } from "vitest";
import { tribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";

describe("TK-MS6 U-TK30: Master Machinist Recommendation Mode", () => {
  describe("masterMachinistRecommend", () => {
    it("should return recommendations for empty context", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({});

      expect(result).toBeDefined();
      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("total_candidates");
      expect(result).toHaveProperty("master_machinist_says");
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should return recommendations for material context", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({
        material: "P",  // Steel
      });

      expect(result).toBeDefined();
      expect(result.context.material).toBe("P");
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });

    it("should return recommendations for operation context", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({
        operation: "milling",
      });

      expect(result).toBeDefined();
      expect(result.context.operation).toBe("milling");
    });

    it("should format recommendations with 'Senior machinists say' prefix", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({});

      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec.message).toMatch(/Senior machinists say:/);
        expect(rec).toHaveProperty("validation_count");
        expect(rec).toHaveProperty("confidence_pct");
        expect(rec).toHaveProperty("provenance");
      }
    });

    it("should include provenance chain in recommendations", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({
        material: "M",  // Stainless
        operation: "turning",
      });

      if (result.recommendations.length > 0) {
        const provenance = result.recommendations[0].provenance;
        expect(provenance).toHaveProperty("captured_by");
        expect(provenance).toHaveProperty("captured_at");
        expect(provenance).toHaveProperty("times_applied");
      }
    });

    it("should provide master_machinist_says summary string", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({
        operation: "drilling",
      });

      expect(typeof result.master_machinist_says).toBe("string");
      expect(result.master_machinist_says.length).toBeGreaterThan(0);
    });

    it("should limit recommendations to max 3", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({});

      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });

    it("should score recommendations by confidence + usage + evidence", () => {
      const result = tribalKnowledgeEngine.masterMachinistRecommend({});

      if (result.recommendations.length > 1) {
        // Higher scored should come first
        const scores = result.recommendations.map(r => r.relevance_score);
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
        }
      }
    });
  });
});
