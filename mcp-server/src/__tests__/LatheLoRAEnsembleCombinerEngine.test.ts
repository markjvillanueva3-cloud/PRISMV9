/**
 * Tests for LatheLoRAEnsembleCombinerEngine — LATHE-LORA-MS0 U-LLR42
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheLoRAEnsembleCombinerEngine,
  type NumericPrediction,
} from "../engines/LatheLoRAEnsembleCombinerEngine.js";

describe("LatheLoRAEnsembleCombinerEngine", () => {
  beforeEach(() => {
    latheLoRAEnsembleCombinerEngine.reset();
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const config = latheLoRAEnsembleCombinerEngine.getConfig();
      expect(config.default_method).toBe("weighted_mean");
      expect(config.trim_percent).toBe(0.1);
      expect(config.outlier_z_threshold).toBe(2.5);
    });

    it("should update config", () => {
      latheLoRAEnsembleCombinerEngine.setConfig({ default_method: "median" });
      expect(latheLoRAEnsembleCombinerEngine.getConfig().default_method).toBe("median");
    });
  });

  describe("Basic Statistics", () => {
    it("should compute mean", () => {
      expect(latheLoRAEnsembleCombinerEngine.mean([2, 4, 6])).toBe(4);
    });

    it("should handle empty mean", () => {
      expect(latheLoRAEnsembleCombinerEngine.mean([])).toBe(0);
    });

    it("should compute median for odd count", () => {
      expect(latheLoRAEnsembleCombinerEngine.median([3, 1, 2])).toBe(2);
    });

    it("should compute median for even count", () => {
      expect(latheLoRAEnsembleCombinerEngine.median([1, 2, 3, 4])).toBe(2.5);
    });

    it("should compute standard deviation", () => {
      const sd = latheLoRAEnsembleCombinerEngine.standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(sd).toBeCloseTo(2.138, 2);
    });

    it("should return 0 sd for single value", () => {
      expect(latheLoRAEnsembleCombinerEngine.standardDeviation([5])).toBe(0);
    });
  });

  describe("Weighted Mean", () => {
    it("should compute weighted mean", () => {
      const result = latheLoRAEnsembleCombinerEngine.weightedMean([10, 20], [0.5, 0.5]);
      expect(result).toBe(15);
    });

    it("should handle unequal weights", () => {
      const result = latheLoRAEnsembleCombinerEngine.weightedMean([10, 20], [1, 3]);
      expect(result).toBeCloseTo(17.5, 5);
    });

    it("should throw on length mismatch", () => {
      expect(() => latheLoRAEnsembleCombinerEngine.weightedMean([1, 2], [0.5])).toThrow();
    });
  });

  describe("Trimmed Mean", () => {
    it("should trim extremes", () => {
      const result = latheLoRAEnsembleCombinerEngine.trimmedMean([1, 5, 5, 5, 100], 0.2);
      expect(result).toBe(5);
    });

    it("should fall back to mean for small sets", () => {
      expect(latheLoRAEnsembleCombinerEngine.trimmedMean([1, 2], 0.1)).toBe(1.5);
    });
  });

  describe("Geometric and Harmonic Means", () => {
    it("should compute geometric mean", () => {
      const result = latheLoRAEnsembleCombinerEngine.geometricMean([2, 8]);
      expect(result).toBeCloseTo(4, 5);
    });

    it("should return 0 for non-positive values in geometric mean", () => {
      expect(latheLoRAEnsembleCombinerEngine.geometricMean([1, -2])).toBe(0);
    });

    it("should compute harmonic mean", () => {
      const result = latheLoRAEnsembleCombinerEngine.harmonicMean([2, 4]);
      expect(result).toBeCloseTo(2.667, 2);
    });

    it("should return 0 for non-positive in harmonic", () => {
      expect(latheLoRAEnsembleCombinerEngine.harmonicMean([1, 0])).toBe(0);
    });
  });

  describe("Outlier Removal", () => {
    it("should remove outliers", () => {
      const values = [10, 10, 10, 10, 10, 10, 10, 10, 10, 200];
      const { filtered, removedCount } = latheLoRAEnsembleCombinerEngine.removeOutliers(values);
      expect(removedCount).toBeGreaterThan(0);
      expect(filtered).not.toContain(200);
    });

    it("should keep all values if none outliers", () => {
      const values = [10, 11, 10, 12];
      const { removedCount } = latheLoRAEnsembleCombinerEngine.removeOutliers(values);
      expect(removedCount).toBe(0);
    });

    it("should skip small arrays", () => {
      const values = [10, 100];
      const { removedCount } = latheLoRAEnsembleCombinerEngine.removeOutliers(values);
      expect(removedCount).toBe(0);
    });
  });

  describe("Combine", () => {
    const makePreds = (vals: number[], confs?: number[]): NumericPrediction[] =>
      vals.map((v, i) => ({
        model_id: `m${i}`,
        value: v,
        confidence: confs?.[i] ?? 0.8,
      }));

    it("should combine via mean", () => {
      const result = latheLoRAEnsembleCombinerEngine.combine(makePreds([10, 20, 30]), "mean");
      expect(result.combined_value).toBe(20);
      expect(result.method).toBe("mean");
    });

    it("should combine via weighted mean", () => {
      const preds = makePreds([10, 20], [0.2, 0.8]);
      const result = latheLoRAEnsembleCombinerEngine.combine(preds, "weighted_mean");
      expect(result.combined_value).toBeCloseTo(18, 5);
    });

    it("should combine via median", () => {
      const result = latheLoRAEnsembleCombinerEngine.combine(makePreds([10, 20, 30]), "median");
      expect(result.combined_value).toBe(20);
    });

    it("should combine via geometric mean", () => {
      const result = latheLoRAEnsembleCombinerEngine.combine(
        makePreds([2, 8]),
        "geometric_mean",
      );
      expect(result.combined_value).toBeCloseTo(4, 5);
    });

    it("should include min, max, range", () => {
      const result = latheLoRAEnsembleCombinerEngine.combine(makePreds([5, 10, 15]));
      expect(result.min_value).toBe(5);
      expect(result.max_value).toBe(15);
      expect(result.range).toBe(10);
    });

    it("should throw on too few inputs", () => {
      expect(() => latheLoRAEnsembleCombinerEngine.combine(makePreds([5]))).toThrow();
    });

    it("should throw on too many inputs", () => {
      const many = makePreds(new Array(25).fill(10));
      expect(() => latheLoRAEnsembleCombinerEngine.combine(many)).toThrow();
    });
  });

  describe("Stats and History", () => {
    it("should track history", () => {
      const preds: NumericPrediction[] = [
        { model_id: "m1", value: 10, confidence: 0.8 },
        { model_id: "m2", value: 12, confidence: 0.7 },
      ];
      latheLoRAEnsembleCombinerEngine.combine(preds);
      latheLoRAEnsembleCombinerEngine.combine(preds);
      expect(latheLoRAEnsembleCombinerEngine.getHistory().length).toBe(2);
    });

    it("should compute stats", () => {
      const preds: NumericPrediction[] = [
        { model_id: "m1", value: 10, confidence: 0.8 },
        { model_id: "m2", value: 12, confidence: 0.7 },
      ];
      latheLoRAEnsembleCombinerEngine.combine(preds);
      const stats = latheLoRAEnsembleCombinerEngine.getStats();
      expect(stats.total_combinations).toBe(1);
    });

    it("should return summary", () => {
      const preds: NumericPrediction[] = [
        { model_id: "m1", value: 10, confidence: 0.8 },
        { model_id: "m2", value: 12, confidence: 0.7 },
      ];
      latheLoRAEnsembleCombinerEngine.combine(preds);
      expect(latheLoRAEnsembleCombinerEngine.getSummary()).toContain("Total Combinations");
    });
  });
});
