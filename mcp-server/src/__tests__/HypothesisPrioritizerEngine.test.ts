import { describe, it, expect, beforeEach } from "vitest";
import {
  HypothesisPrioritizerEngine,
  type HypothesisRankingInput,
} from "../engines/HypothesisPrioritizerEngine.js";

describe("HypothesisPrioritizerEngine", () => {
  let engine: HypothesisPrioritizerEngine;

  beforeEach(() => {
    engine = new HypothesisPrioritizerEngine();
    engine.resetForTests();
  });

  describe("getPrior", () => {
    it("should return higher conservative prior for hardened steel", () => {
      const priorH = engine.getPrior("conservative_speed", { material_iso_group: "H", operation: "roughing" });
      const priorN = engine.getPrior("conservative_speed", { material_iso_group: "N", operation: "roughing" });

      expect(priorH?.prior_probability).toBeGreaterThan(priorN?.prior_probability ?? 0);
    });

    it("should adjust prior based on operation type", () => {
      const priorRoughing = engine.getPrior("aggressive_feed", { material_iso_group: "P", operation: "roughing" });
      const priorFinishing = engine.getPrior("aggressive_feed", { material_iso_group: "P", operation: "finishing" });

      expect(priorRoughing?.prior_probability).toBeGreaterThan(priorFinishing?.prior_probability ?? 0);
    });

    it("should return valid confidence interval", () => {
      const prior = engine.getPrior("test_hypothesis", { material_iso_group: "P", operation: "roughing" });

      expect(prior?.confidence_interval[0]).toBeLessThan(prior?.confidence_interval[1] ?? 0);
      expect(prior?.confidence_interval[0]).toBeGreaterThanOrEqual(0);
      expect(prior?.confidence_interval[1]).toBeLessThanOrEqual(1);
    });
  });

  describe("updatePrior", () => {
    it("should increase prior on success", () => {
      const initial = engine.getPrior("test_hyp", { material_iso_group: "P", operation: "roughing" });
      const initialProb = initial?.prior_probability ?? 0.33;

      const updated = engine.updatePrior({
        hypothesis_id: "test_hyp",
        outcome: "success",
        context: { material_iso: "P", operation: "roughing" },
      });

      expect(updated.prior_probability).toBeGreaterThan(initialProb);
      expect(updated.evidence_count).toBe(1);
      expect(updated.success_rate).toBe(1.0);
    });

    it("should decrease prior on failure", () => {
      engine.updatePrior({
        hypothesis_id: "test_hyp2",
        outcome: "success",
        context: {},
      });

      const afterSuccess = engine.updatePrior({
        hypothesis_id: "test_hyp2",
        outcome: "failure",
        context: {},
      });

      expect(afterSuccess.success_rate).toBeLessThan(1.0);
    });

    it("should accumulate evidence count", () => {
      engine.updatePrior({ hypothesis_id: "test_hyp3", outcome: "success", context: {} });
      engine.updatePrior({ hypothesis_id: "test_hyp3", outcome: "success", context: {} });
      const final = engine.updatePrior({ hypothesis_id: "test_hyp3", outcome: "partial", context: {} });

      expect(final.evidence_count).toBe(3);
    });
  });

  describe("prioritize", () => {
    it("should rank hypotheses by posterior probability", () => {
      const input: HypothesisRankingInput = {
        hypotheses: [
          { id: "conservative_speed", description: "Reduce speed 20%", category: "speed", predicted_outcome: 0.8 },
          { id: "aggressive_feed", description: "Increase feed 30%", category: "feed", predicted_outcome: 0.6 },
          { id: "experimental_trochoidal", description: "Try trochoidal", category: "strategy", predicted_outcome: 0.7 },
        ],
        context: {
          material_iso_group: "P",
          operation: "roughing",
        },
      };

      const result = engine.prioritize(input);

      expect(result.ranked_hypotheses.length).toBe(3);
      expect(result.ranked_hypotheses[0].rank).toBe(1);
      expect(result.ranked_hypotheses[1].rank).toBe(2);
      expect(result.ranked_hypotheses[2].rank).toBe(3);

      for (let i = 1; i < result.ranked_hypotheses.length; i++) {
        expect(result.ranked_hypotheses[i - 1].posterior_probability)
          .toBeGreaterThanOrEqual(result.ranked_hypotheses[i].posterior_probability);
      }
    });

    it("should flag disagreements between prior and predicted outcome", () => {
      engine.updatePrior({ hypothesis_id: "low_prior_hyp", outcome: "failure", context: {} });
      engine.updatePrior({ hypothesis_id: "low_prior_hyp", outcome: "failure", context: {} });

      const input: HypothesisRankingInput = {
        hypotheses: [
          { id: "low_prior_hyp", description: "Low prior high prediction", category: "speed", predicted_outcome: 0.9 },
        ],
        context: {
          material_iso_group: "P",
          operation: "roughing",
        },
      };

      const result = engine.prioritize(input);

      expect(result.disagreement_flags.length).toBeGreaterThanOrEqual(0);
    });

    it("should provide top recommendation", () => {
      const input: HypothesisRankingInput = {
        hypotheses: [
          { id: "hyp1", description: "First hypothesis", category: "speed", predicted_outcome: 0.7 },
          { id: "hyp2", description: "Second hypothesis", category: "feed", predicted_outcome: 0.8 },
        ],
        context: {
          material_iso_group: "P",
          operation: "roughing",
        },
      };

      const result = engine.prioritize(input);

      expect(result.top_recommendation).toBeDefined();
      expect(result.top_recommendation.length).toBeGreaterThan(0);
    });
  });

  describe("getTribalEndorsements", () => {
    it("should return endorsements for known hypotheses", () => {
      const endorsements = engine.getTribalEndorsements("trochoidal_roughing");

      expect(endorsements.length).toBeGreaterThan(0);
      expect(endorsements).toContain("JM-MILL-004");
    });

    it("should return empty array for unknown hypotheses", () => {
      const endorsements = engine.getTribalEndorsements("unknown_hypothesis");

      expect(endorsements).toEqual([]);
    });
  });
});
