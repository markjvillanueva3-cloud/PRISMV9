/**
 * AHPEngine Tests
 *
 * Tests Analytic Hierarchy Process (Saaty 1980):
 * - Priority weight calculation via geometric mean
 * - Eigenvalue computation
 * - Consistency Index (CI) and Consistency Ratio (CR)
 * - Reciprocal matrix validation
 * - Edge cases (2×2, large matrices, equal weights)
 */

import { describe, it, expect } from "vitest";
import { AHPEngine, ahpEngine, type AHPInput } from "../engines/AHPEngine.js";

describe("AHPEngine", () => {
  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(ahpEngine).toBeDefined();
      expect(ahpEngine).toBeInstanceOf(AHPEngine);
    });

    it("exports class for custom instantiation", () => {
      const engine = new AHPEngine();
      expect(engine).toBeInstanceOf(AHPEngine);
    });
  });

  describe("consistent 3×3 matrix", () => {
    // Classic consistent example: A strongly preferred over B, B over C
    const input: AHPInput = {
      comparison_matrix: [
        [1, 3, 5],
        [1 / 3, 1, 3],
        [1 / 5, 1 / 3, 1],
      ],
      criteria_names: ["Cost", "Quality", "Delivery"],
    };

    it("computes priority weights", () => {
      const result = ahpEngine.calculate(input);
      expect(result.priority_weights.value).toBeGreaterThan(0);
      expect(result.priority_weights.value).toBeLessThanOrEqual(1);
      expect(result.priority_weights.unit).toBe("weight");
      expect(result.priority_weights.source).toBe("geometric_mean");
    });

    it("identifies most important criterion as index 1 (Cost)", () => {
      const result = ahpEngine.calculate(input);
      expect(result.most_important_index.value).toBe(1);
    });

    it("has CR < 0.10 (consistent)", () => {
      const result = ahpEngine.calculate(input);
      expect(result.consistency_ratio.value).toBeLessThan(0.10);
      expect(result.is_consistent.value).toBe(1);
    });

    it("eigenvalue is close to n=3 for consistent matrix", () => {
      const result = ahpEngine.calculate(input);
      expect(result.max_eigenvalue.value).toBeCloseTo(3.0, 1);
    });

    it("reports 3 criteria", () => {
      const result = ahpEngine.calculate(input);
      expect(result.num_criteria.value).toBe(3);
    });

    it("is_safe is true for consistent matrix", () => {
      const result = ahpEngine.calculate(input);
      expect(result.is_safe).toBe(true);
    });

    it("CI is near zero for near-perfect consistency", () => {
      const result = ahpEngine.calculate(input);
      expect(result.consistency_index.value).toBeCloseTo(0, 1);
    });
  });

  describe("perfect 2×2 matrix", () => {
    const input: AHPInput = {
      comparison_matrix: [
        [1, 5],
        [1 / 5, 1],
      ],
    };

    it("2×2 is always perfectly consistent (CR = 0)", () => {
      const result = ahpEngine.calculate(input);
      expect(result.consistency_ratio.value).toBeCloseTo(0, 4);
      expect(result.is_consistent.value).toBe(1);
    });

    it("most important is criterion 1", () => {
      const result = ahpEngine.calculate(input);
      expect(result.most_important_index.value).toBe(1);
    });

    it("weight spread is significant", () => {
      const result = ahpEngine.calculate(input);
      expect(result.weight_spread.value).toBeGreaterThan(0.5);
    });
  });

  describe("equal weights matrix", () => {
    const input: AHPInput = {
      comparison_matrix: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
    };

    it("all weights are equal (~0.333)", () => {
      const result = ahpEngine.calculate(input);
      // Weight spread should be nearly zero
      expect(result.weight_spread.value).toBeCloseTo(0, 4);
    });

    it("recommends that AHP adds little value", () => {
      const result = ahpEngine.calculate(input);
      expect(result.recommendations.some(r => r.includes("nearly equal weight"))).toBe(true);
    });

    it("is perfectly consistent", () => {
      const result = ahpEngine.calculate(input);
      expect(result.consistency_ratio.value).toBeCloseTo(0, 4);
    });
  });

  describe("inconsistent matrix", () => {
    // A > B (5), B > C (3), but C > A (4) — contradictory
    const input: AHPInput = {
      comparison_matrix: [
        [1, 5, 1 / 4],
        [1 / 5, 1, 3],
        [4, 1 / 3, 1],
      ],
    };

    it("detects CR > 0.10", () => {
      const result = ahpEngine.calculate(input);
      expect(result.consistency_ratio.value).toBeGreaterThan(0.10);
      expect(result.is_consistent.value).toBe(0);
    });

    it("recommends revising comparisons", () => {
      const result = ahpEngine.calculate(input);
      expect(result.recommendations.some(r => r.includes("Inconsistent"))).toBe(true);
    });
  });

  describe("non-reciprocal matrix detection", () => {
    const input: AHPInput = {
      comparison_matrix: [
        [1, 3, 5],
        [1 / 3, 1, 3],
        [1 / 5, 1 / 3, 1],
      ],
    };

    it("reciprocal matrix has no reciprocal warning", () => {
      const result = ahpEngine.calculate(input);
      expect(result.recommendations.some(r => r.includes("not reciprocal"))).toBe(false);
    });

    it("detects non-reciprocal entries", () => {
      const nonReciprocal: AHPInput = {
        comparison_matrix: [
          [1, 3, 5],
          [0.5, 1, 3], // Should be 1/3 = 0.333, not 0.5
          [1 / 5, 1 / 3, 1],
        ],
      };
      const result = ahpEngine.calculate(nonReciprocal);
      expect(result.recommendations.some(r => r.includes("not reciprocal"))).toBe(true);
    });
  });

  describe("4×4 matrix", () => {
    // Saaty textbook example: choosing a school
    const input: AHPInput = {
      comparison_matrix: [
        [1, 1 / 3, 1 / 5, 1 / 7],
        [3, 1, 1 / 3, 1 / 5],
        [5, 3, 1, 1 / 3],
        [7, 5, 3, 1],
      ],
      criteria_names: ["Learning", "Friends", "School Life", "Vocational"],
    };

    it("most important is criterion 4 (highest comparisons)", () => {
      const result = ahpEngine.calculate(input);
      expect(result.most_important_index.value).toBe(4);
    });

    it("has 4 criteria", () => {
      const result = ahpEngine.calculate(input);
      expect(result.num_criteria.value).toBe(4);
    });

    it("consistency uses RI for n=4 (0.90)", () => {
      const result = ahpEngine.calculate(input);
      // Should be reasonably consistent for this well-known example
      expect(result.consistency_ratio.value).toBeLessThan(0.15);
    });
  });

  describe("result structure", () => {
    const input: AHPInput = {
      comparison_matrix: [
        [1, 2],
        [1 / 2, 1],
      ],
    };

    it("all AtomicValue fields have required properties", () => {
      const result = ahpEngine.calculate(input);
      const avFields = [
        result.priority_weights,
        result.max_eigenvalue,
        result.consistency_index,
        result.consistency_ratio,
        result.is_consistent,
        result.num_criteria,
        result.most_important_index,
        result.weight_spread,
      ];

      for (const av of avFields) {
        expect(av).toHaveProperty("value");
        expect(av).toHaveProperty("unit");
        expect(av).toHaveProperty("uncertainty");
        expect(av).toHaveProperty("source");
        expect(typeof av.value).toBe("number");
        expect(typeof av.unit).toBe("string");
        expect(typeof av.uncertainty).toBe("number");
        expect(typeof av.source).toBe("string");
      }
    });

    it("recommendations is a non-empty array", () => {
      const result = ahpEngine.calculate(input);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("is_safe is a boolean", () => {
      const result = ahpEngine.calculate(input);
      expect(typeof result.is_safe).toBe("boolean");
    });
  });

  describe("edge cases", () => {
    it("1×1 matrix returns single criterion", () => {
      const result = ahpEngine.calculate({
        comparison_matrix: [[1]],
      });
      expect(result.num_criteria.value).toBe(1);
      expect(result.most_important_index.value).toBe(1);
    });

    it("large weight disparity (9:1)", () => {
      const result = ahpEngine.calculate({
        comparison_matrix: [
          [1, 9],
          [1 / 9, 1],
        ],
      });
      expect(result.priority_weights.value).toBeGreaterThan(0.8);
      expect(result.weight_spread.value).toBeGreaterThan(0.7);
    });
  });
});
