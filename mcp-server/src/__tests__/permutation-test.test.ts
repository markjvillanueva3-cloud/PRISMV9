/**
 * Tests for PermutationTestEngine
 * Covers: Two-sample, paired, correlation, ANOVA permutation tests, bootstrap CI
 */
import { describe, it, expect } from "vitest";
import { permutationTestEngine } from "../engines/PermutationTestEngine.js";

describe("PermutationTestEngine", () => {

  describe("twoSampleTest", () => {
    it("detects significantly different means", () => {
      const a = [10, 11, 12, 13, 14, 15, 16];
      const b = [20, 21, 22, 23, 24, 25, 26];
      const result = permutationTestEngine.twoSampleTest({
        sample_a: a, sample_b: b, statistic: "mean_diff",
        n_permutations: 5000, seed: 42,
      });
      expect(result.p_value).toBeLessThan(0.01);
      expect(result.significant_at_005).toBe(true);
      expect(Math.abs(result.effect_size)).toBeGreaterThan(0.8); // large effect
    });

    it("no significant difference for same distribution", () => {
      const a = [10, 11, 12, 13, 14];
      const b = [10.5, 11.5, 12.5, 13.5, 14.5];
      const result = permutationTestEngine.twoSampleTest({
        sample_a: a, sample_b: b, statistic: "mean_diff",
        n_permutations: 5000, seed: 42,
      });
      expect(result.p_value).toBeGreaterThan(0.05);
    });

    it("reproducible with same seed", () => {
      const a = [1, 2, 3, 4, 5];
      const b = [6, 7, 8, 9, 10];
      const r1 = permutationTestEngine.twoSampleTest({
        sample_a: a, sample_b: b, n_permutations: 1000, seed: 123,
      });
      const r2 = permutationTestEngine.twoSampleTest({
        sample_a: a, sample_b: b, n_permutations: 1000, seed: 123,
      });
      expect(r1.p_value).toBe(r2.p_value);
    });
  });

  describe("pairedTest", () => {
    it("detects significant paired effect", () => {
      const before = [100, 102, 98, 105, 99, 101, 103];
      const after = [110, 112, 108, 115, 109, 111, 113]; // consistent +10
      const result = permutationTestEngine.pairedTest({
        before, after, statistic: "mean_diff", n_permutations: 5000, seed: 42,
      });
      expect(result.p_value).toBeLessThan(0.05);
    });

    it("no effect when differences are zero-centered", () => {
      const before = [100, 102, 98, 105, 99];
      const after = [101, 101, 99, 104, 100]; // differences ≈ 0
      const result = permutationTestEngine.pairedTest({
        before, after, statistic: "mean_diff", n_permutations: 5000, seed: 42,
      });
      expect(result.p_value).toBeGreaterThan(0.1);
    });
  });

  describe("correlationTest", () => {
    it("detects significant positive correlation", () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2.1, 4.0, 5.9, 8.1, 10.0, 11.9, 14.1, 16.0, 17.9, 20.1];
      const result = permutationTestEngine.correlationTest({
        x, y, method: "pearson", n_permutations: 5000, seed: 42,
      });
      expect(result.observed_correlation).toBeGreaterThan(0.95);
      expect(result.p_value).toBeLessThan(0.01);
    });

    it("no correlation for independent data", () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8];
      const y = [3, 1, 4, 1, 5, 9, 2, 6]; // pseudo-random
      const result = permutationTestEngine.correlationTest({
        x, y, method: "pearson", n_permutations: 5000, seed: 42,
      });
      expect(result.p_value).toBeGreaterThan(0.05);
    });
  });

  describe("anovaPermutation", () => {
    it("detects difference between 3 distinct groups", () => {
      const groups = [
        [10, 11, 12, 13, 14],
        [20, 21, 22, 23, 24],
        [30, 31, 32, 33, 34],
      ];
      const result = permutationTestEngine.anovaPermutation({
        groups, n_permutations: 5000,
      });
      expect(result.p_value).toBeLessThan(0.01);
      expect(result.observed_f).toBeGreaterThan(1);
    });

    it("no difference for similar groups", () => {
      const groups = [
        [10, 11, 12, 13],
        [10.5, 11.5, 12.5, 13.5],
        [10.2, 11.2, 12.2, 13.2],
      ];
      const result = permutationTestEngine.anovaPermutation({
        groups, n_permutations: 5000,
      });
      expect(result.p_value).toBeGreaterThan(0.05);
    });
  });

  describe("bootstrapConfidenceInterval", () => {
    it("CI contains true mean for normal data", () => {
      // Mean should be around 50
      const data = [48, 49, 50, 51, 52, 49, 50, 51, 50, 49, 51, 50];
      const result = permutationTestEngine.bootstrapConfidenceInterval({
        data, statistic: "mean", n_bootstrap: 5000, method: "percentile",
        confidence: 0.95,
      });
      expect(result.ci[0]).toBeLessThan(50);
      expect(result.ci[1]).toBeGreaterThan(49);
    });

    it("bootstrap SE is positive and reasonable", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = permutationTestEngine.bootstrapConfidenceInterval({
        data, statistic: "mean", n_bootstrap: 5000,
      });
      expect(result.se_bootstrap).toBeGreaterThan(0);
      expect(result.se_bootstrap).toBeLessThan(5); // reasonable for range 1-10
    });

    it("median CI narrower for concentrated data", () => {
      const concentrated = [50, 50, 50, 50, 50, 51, 49, 50];
      const spread = [10, 20, 30, 40, 50, 60, 70, 80];
      const r1 = permutationTestEngine.bootstrapConfidenceInterval({
        data: concentrated, statistic: "median", n_bootstrap: 3000,
      });
      const r2 = permutationTestEngine.bootstrapConfidenceInterval({
        data: spread, statistic: "median", n_bootstrap: 3000,
      });
      const width1 = r1.ci[1] - r1.ci[0];
      const width2 = r2.ci[1] - r2.ci[0];
      expect(width1).toBeLessThan(width2);
    });
  });

  describe("manufacturingComparison", () => {
    it("identifies better process when difference is clear", () => {
      const process_a = [50.1, 50.0, 49.9, 50.2, 49.8]; // tight tolerance
      const process_b = [50.5, 49.5, 51.0, 49.0, 50.8]; // wide variation
      const result = permutationTestEngine.manufacturingComparison({
        process_a, process_b, metric: "variance", test_type: "independent",
      });
      expect(result.better_process).toBe("a"); // lower variance
    });
  });
});
