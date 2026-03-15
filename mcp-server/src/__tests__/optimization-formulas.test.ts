/**
 * Dedicated tests for OptimizationFormulasEngine
 * Methods: constrainedOptimize, paretoFront, convergenceMetrics, sensitivityAnalysis
 */
import { describe, it, expect } from "vitest";
import { optimizationFormulasEngine } from "../engines/OptimizationFormulasEngine.js";

describe("OptimizationFormulasEngine", () => {
  describe("constrainedOptimize", () => {
    it("should solve simple LP: min c^T x s.t. Ax <= b", () => {
      const r = optimizationFormulasEngine.constrainedOptimize({
        objective_coeffs: [1, 1],
        constraint_matrix: [[-1, 0], [0, -1], [1, 1]],
        constraint_rhs: [0, 0, 10],
      });
      expect(r.solution).toHaveLength(2);
      expect(r.objective_value).toBeGreaterThanOrEqual(0);
      expect(r.lagrange_multipliers).toBeDefined();
      expect(r.constraint_slacks).toHaveLength(3);
      expect(r.method).toBeDefined();
    });

    it("should respect non-negativity bounds", () => {
      const r = optimizationFormulasEngine.constrainedOptimize({
        objective_coeffs: [-3, -5],
        constraint_matrix: [[1, 0], [0, 2], [3, 2]],
        constraint_rhs: [4, 12, 18],
        minimize: false,
      });
      expect(r.solution.every((v) => v >= -0.01)).toBe(true);
    });
  });

  describe("paretoFront", () => {
    it("should identify Pareto-optimal solutions from dominated set", () => {
      const r = optimizationFormulasEngine.paretoFront({
        solutions: [
          [1, 5], [2, 3], [3, 4], [4, 1], [5, 2],
        ],
      });
      expect(r.pareto_indices.length).toBeGreaterThanOrEqual(2);
      expect(r.pareto_front.length).toBe(r.pareto_indices.length);
      expect(r.ranks).toHaveLength(5);
      for (const idx of r.pareto_indices) {
        expect(r.ranks[idx]).toBe(0);
      }
    });

    it("should compute hypervolume for 2D front", () => {
      const r = optimizationFormulasEngine.paretoFront({
        solutions: [
          [1, 4], [2, 2], [4, 1],
        ],
      });
      expect(r.hypervolume).not.toBeNull();
      if (r.hypervolume !== null) {
        expect(r.hypervolume).toBeGreaterThan(0);
      }
    });
  });

  describe("convergenceMetrics", () => {
    it("should detect convergence from decreasing objective history", () => {
      const r = optimizationFormulasEngine.convergenceMetrics({
        objective_history: [100, 50, 25, 12.5, 12.49, 12.489],
        optimal_value: 12.489,
        tolerance: 0.01,
      });
      expect(r.converged).toBe(true);
      expect(r.function_change).toBeLessThan(0.01);
      expect(r.iterations).toBe(6);
    });

    it("should detect non-convergence for oscillating series", () => {
      const r = optimizationFormulasEngine.convergenceMetrics({
        objective_history: [10, 20, 10, 20, 10, 20],
        tolerance: 1e-6,
      });
      expect(r.converged).toBe(false);
      expect(r.function_change).toBeGreaterThan(1);
    });
  });

  describe("sensitivityAnalysis", () => {
    it("should compute shadow prices and reduced costs", () => {
      const r = optimizationFormulasEngine.sensitivityAnalysis({
        objective_coeffs: [3, 5],
        constraint_matrix: [[1, 0], [0, 2], [3, 2]],
        constraint_rhs: [4, 12, 18],
        solution: [2, 6],
      });
      expect(r.shadow_prices).toHaveLength(3);
      expect(r.reduced_costs).toHaveLength(2);
      expect(r.basis_stability).toBeGreaterThanOrEqual(0);
      expect(r.basis_stability).toBeLessThanOrEqual(1);
    });
  });
});
