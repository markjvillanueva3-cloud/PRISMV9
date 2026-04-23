/**
 * Tests for LatheLoRAEnsembleVoterEngine — LATHE-LORA-MS0 U-LLR41
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheLoRAEnsembleVoterEngine,
  type ModelPrediction,
} from "../engines/LatheLoRAEnsembleVoterEngine.js";

describe("LatheLoRAEnsembleVoterEngine", () => {
  beforeEach(() => {
    latheLoRAEnsembleVoterEngine.reset();
  });

  describe("Configuration", () => {
    it("should have default configuration", () => {
      const config = latheLoRAEnsembleVoterEngine.getConfig();
      expect(config.default_strategy).toBe("weighted");
      expect(config.min_consensus_ratio).toBe(0.5);
      expect(config.max_voters).toBe(10);
    });

    it("should update configuration", () => {
      latheLoRAEnsembleVoterEngine.setConfig({ default_strategy: "majority" });
      expect(latheLoRAEnsembleVoterEngine.getConfig().default_strategy).toBe("majority");
    });
  });

  describe("Majority Voting", () => {
    it("should pick most frequent prediction", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
        { model_id: "m3", prediction: "B", confidence: 0.9 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "majority");
      expect(result.winner).toBe("A");
      expect(result.support_count).toBe(2);
    });

    it("should record vote distribution", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "X", confidence: 0.5 },
        { model_id: "m2", prediction: "Y", confidence: 0.5 },
        { model_id: "m3", prediction: "X", confidence: 0.5 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "majority");
      expect(result.vote_distribution.X).toBe(2);
      expect(result.vote_distribution.Y).toBe(1);
    });
  });

  describe("Weighted Voting", () => {
    it("should pick highest confidence sum", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.3 },
        { model_id: "m2", prediction: "A", confidence: 0.3 },
        { model_id: "m3", prediction: "B", confidence: 0.9 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "weighted");
      expect(result.winner).toBe("B");
    });

    it("should beat majority when confidence is much higher", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.1 },
        { model_id: "m2", prediction: "A", confidence: 0.1 },
        { model_id: "m3", prediction: "B", confidence: 0.95 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "weighted");
      expect(result.winner).toBe("B"); // 0.95 > 0.2
    });
  });

  describe("Ranked Voting (Borda)", () => {
    it("should compute borda count correctly", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8, rank: 1 },
        { model_id: "m2", prediction: "B", confidence: 0.7, rank: 2 },
        { model_id: "m3", prediction: "A", confidence: 0.6, rank: 2 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "ranked");
      // A: (3-1+1) + (3-2+1) = 3 + 2 = 5
      // B: (3-2+1) = 2
      expect(result.winner).toBe("A");
    });
  });

  describe("Unanimous Voting", () => {
    it("should return winner only if all agree", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
        { model_id: "m3", prediction: "A", confidence: 0.9 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "unanimous");
      expect(result.winner).toBe("A");
    });

    it("should return empty winner if not unanimous", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "B", confidence: 0.7 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "unanimous");
      expect(result.winner).toBe("");
    });
  });

  describe("Plurality Voting", () => {
    it("should behave like majority for plurality", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "X", confidence: 0.5 },
        { model_id: "m2", prediction: "X", confidence: 0.5 },
        { model_id: "m3", prediction: "Y", confidence: 0.5 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "plurality");
      expect(result.winner).toBe("X");
    });
  });

  describe("Outlier Detection", () => {
    it("should detect low confidence outliers", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.9 },
        { model_id: "m2", prediction: "A", confidence: 0.85 },
        { model_id: "m3", prediction: "A", confidence: 0.1 },
      ];
      const outliers = latheLoRAEnsembleVoterEngine.detectOutliers(predictions);
      expect(outliers).toContain("m3");
    });

    it("should return empty for small sets", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.9 },
        { model_id: "m2", prediction: "A", confidence: 0.1 },
      ];
      expect(latheLoRAEnsembleVoterEngine.detectOutliers(predictions)).toEqual([]);
    });
  });

  describe("Consensus Check", () => {
    it("should detect consensus when majority agrees", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.8 },
        { model_id: "m3", prediction: "B", confidence: 0.8 },
      ];
      const result = latheLoRAEnsembleVoterEngine.vote(predictions, "majority");
      expect(latheLoRAEnsembleVoterEngine.hasConsensus(result)).toBe(true);
    });
  });

  describe("Validation", () => {
    it("should throw on empty predictions", () => {
      expect(() => latheLoRAEnsembleVoterEngine.vote([])).toThrow();
    });

    it("should throw on too many voters", () => {
      const predictions: ModelPrediction[] = Array.from({ length: 11 }, (_, i) => ({
        model_id: `m${i}`,
        prediction: "A",
        confidence: 0.8,
      }));
      expect(() => latheLoRAEnsembleVoterEngine.vote(predictions)).toThrow();
    });

    it("should validate confidence range", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 1.5 },
      ];
      expect(() => latheLoRAEnsembleVoterEngine.vote(predictions)).toThrow();
    });
  });

  describe("Stats and History", () => {
    it("should track voting history", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
      ];
      latheLoRAEnsembleVoterEngine.vote(predictions);
      latheLoRAEnsembleVoterEngine.vote(predictions);
      expect(latheLoRAEnsembleVoterEngine.getHistory().length).toBe(2);
    });

    it("should compute stats", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
      ];
      latheLoRAEnsembleVoterEngine.vote(predictions);
      const stats = latheLoRAEnsembleVoterEngine.getStats();
      expect(stats.total_votes).toBe(1);
      expect(stats.consensus_rate).toBe(1);
    });

    it("should return summary string", () => {
      const predictions: ModelPrediction[] = [
        { model_id: "m1", prediction: "A", confidence: 0.8 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
      ];
      latheLoRAEnsembleVoterEngine.vote(predictions);
      expect(latheLoRAEnsembleVoterEngine.getSummary()).toContain("Total Votes");
    });
  });
});
