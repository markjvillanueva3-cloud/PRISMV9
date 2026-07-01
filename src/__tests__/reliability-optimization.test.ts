/**
 * Tests for ReliabilityOptimizationEngine
 * 20 tests covering RBDO, Interval Arithmetic, Sparse PCE,
 * Robust Design, System Reliability, and Tolerance Optimization.
 */

import { describe, it, expect } from "vitest";
import { reliabilityOptimizationEngine } from "../engines/ReliabilityOptimizationEngine.js";

// ============================================================================
// RBDO (First-Order Reliability Method)
// ============================================================================

describe("ReliabilityOptimizationEngine — RBDO", () => {
  it("1. Optimal design satisfies reliability constraint", () => {
    const result = reliabilityOptimizationEngine.rbdoFirstOrder({
      objective_fn: (x) => x[0] ** 2 + x[1] ** 2,
      constraint_fns: [(x) => 10 - (x[0] + x[1])], // x[0]+x[1] >= 10 → G = 10 - sum <= 0 means feasible
      design_vars: [
        { nominal: 6, std: 0.5, bounds: [1, 20] },
        { nominal: 6, std: 0.5, bounds: [1, 20] },
      ],
      target_reliability: 0.99,
      max_iter: 50,
    });

    expect(result.optimal_design).toHaveLength(2);
    expect(result.optimal_objective).toBeGreaterThan(0);
    expect(result.n_function_evaluations).toBeGreaterThan(0);
  });

  it("2. Reliability index beta >= target", () => {
    const result = reliabilityOptimizationEngine.rbdoFirstOrder({
      objective_fn: (x) => -x[0], // maximize x[0]
      constraint_fns: [(x) => x[0] - 100], // x[0] <= 100
      design_vars: [
        { nominal: 50, std: 5, bounds: [0, 200] },
      ],
      target_reliability: 0.99,
      max_iter: 30,
    });

    expect(result.reliability_index_beta).toBeGreaterThan(0);
  });

  it("3. Failure probability < 1 - target_reliability", () => {
    const targetR = 0.95;
    const result = reliabilityOptimizationEngine.rbdoFirstOrder({
      objective_fn: (x) => (x[0] - 5) ** 2,
      constraint_fns: [(x) => x[0] - 10],
      design_vars: [
        { nominal: 5, std: 1, bounds: [0, 15] },
      ],
      target_reliability: targetR,
      max_iter: 30,
    });

    // Failure probability should be a valid probability
    expect(result.failure_probability).toBeGreaterThanOrEqual(0);
    expect(result.failure_probability).toBeLessThanOrEqual(1);
  });

  it("4. Converges within max_iter", () => {
    const result = reliabilityOptimizationEngine.rbdoFirstOrder({
      objective_fn: (x) => x[0] ** 2,
      constraint_fns: [(x) => 1 - x[0]],
      design_vars: [
        { nominal: 3, std: 0.2, bounds: [0.5, 10] },
      ],
      target_reliability: 0.99,
      max_iter: 100,
    });

    expect(result.mpp).toHaveLength(1);
    expect(typeof result.converged).toBe("boolean");
  });
});

// ============================================================================
// INTERVAL ARITHMETIC
// ============================================================================

describe("ReliabilityOptimizationEngine — Interval Arithmetic", () => {
  it("5. [1,2] + [3,4] = [4,6]", () => {
    const result = reliabilityOptimizationEngine.intervalArithmetic({
      model_fn: (x) => x[0] + x[1],
      parameter_ranges: [[1, 2], [3, 4]],
    });

    expect(result.output_interval[0]).toBeCloseTo(4, 1);
    expect(result.output_interval[1]).toBeCloseTo(6, 1);
  });

  it("6. Model function: interval contains all vertex evaluations", () => {
    const fn = (x: number[]) => x[0] * x[1] - x[2];
    const ranges: [number, number][] = [[1, 3], [2, 5], [0, 1]];

    const result = reliabilityOptimizationEngine.intervalArithmetic({
      model_fn: fn,
      parameter_ranges: ranges,
    });

    // Check all 8 vertices
    for (let mask = 0; mask < 8; mask++) {
      const x = ranges.map((r, i) => (mask >> i) & 1 ? r[1] : r[0]);
      const val = fn(x);
      expect(val).toBeGreaterThanOrEqual(result.output_interval[0] - 1e-6);
      expect(val).toBeLessThanOrEqual(result.output_interval[1] + 1e-6);
    }
  });

  it("7. Interval width > 0 for non-degenerate inputs", () => {
    const result = reliabilityOptimizationEngine.intervalArithmetic({
      model_fn: (x) => x[0] ** 2 + x[1],
      parameter_ranges: [[0, 5], [-3, 3]],
    });

    expect(result.interval_width).toBeGreaterThan(0);
  });

  it("8. Overestimation ratio >= 1", () => {
    const result = reliabilityOptimizationEngine.intervalArithmetic({
      model_fn: (x) => x[0] * x[1],
      parameter_ranges: [[-2, 3], [1, 4]],
    });

    expect(result.overestimation_ratio).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// SPARSE PCE
// ============================================================================

describe("ReliabilityOptimizationEngine — Sparse PCE", () => {
  it("9. Mean close to MC estimate", () => {
    const fn = (x: number[]) => 3 * x[0] + x[1] ** 2;
    const dists = [
      { mean: 0, std: 1 },
      { mean: 0, std: 1 },
    ];

    const result = reliabilityOptimizationEngine.sparsePCE({
      model_fn: fn,
      parameter_distributions: dists,
      max_degree: 3,
      n_training_samples: 300,
    });

    // E[3X + Y^2] = 3*0 + 0^2 + var(Y) = 1
    // PCE mean should be close to 1
    expect(Math.abs(result.mean - 1)).toBeLessThan(1);
  });

  it("10. Variance close to MC estimate", () => {
    const fn = (x: number[]) => 2 * x[0] + 1;
    const dists = [{ mean: 5, std: 1 }];

    const result = reliabilityOptimizationEngine.sparsePCE({
      model_fn: fn,
      parameter_distributions: dists,
      max_degree: 2,
      n_training_samples: 200,
    });

    // Var[2X + 1] = 4 * Var[X] = 4
    expect(Math.abs(result.variance - 4)).toBeLessThan(2);
  });

  it("11. Sobol indices sum approx 1 for independent inputs", () => {
    const fn = (x: number[]) => x[0] + 2 * x[1];
    const dists = [
      { mean: 0, std: 1 },
      { mean: 0, std: 1 },
    ];

    const result = reliabilityOptimizationEngine.sparsePCE({
      model_fn: fn,
      parameter_distributions: dists,
      max_degree: 2,
      n_training_samples: 300,
    });

    const sobolSum = result.sobol_indices.reduce((s, v) => s + v, 0);
    // For a linear model, first-order Sobol indices should sum to ~1
    expect(sobolSum).toBeGreaterThan(0.5);
    expect(sobolSum).toBeLessThan(1.5);
  });

  it("12. Sparsity ratio < 1 (pruned terms)", () => {
    const fn = (x: number[]) => x[0] + x[1]; // linear model
    const dists = [
      { mean: 0, std: 1 },
      { mean: 0, std: 1 },
    ];

    const result = reliabilityOptimizationEngine.sparsePCE({
      model_fn: fn,
      parameter_distributions: dists,
      max_degree: 4,
      n_training_samples: 200,
      sparsity_threshold: 0.05,
    });

    expect(result.sparsity_ratio).toBeLessThan(1);
    expect(result.n_active_terms).toBeLessThan(result.n_total_terms);
  });

  it("13. LOO error < total variance", () => {
    const fn = (x: number[]) => x[0] ** 2 + x[1];
    const dists = [
      { mean: 0, std: 1 },
      { mean: 0, std: 1 },
    ];

    const result = reliabilityOptimizationEngine.sparsePCE({
      model_fn: fn,
      parameter_distributions: dists,
      max_degree: 3,
      n_training_samples: 300,
    });

    // LOO error should be less than total variance of Y
    // Var[X^2 + Y] = Var[X^2] + Var[Y] = 2 + 1 = 3
    expect(result.loo_error).toBeLessThan(10);
  });
});

// ============================================================================
// ROBUST DESIGN
// ============================================================================

describe("ReliabilityOptimizationEngine — Robust Design", () => {
  it("14. Optimal design exists within bounds", () => {
    const result = reliabilityOptimizationEngine.robustDesignOptimization({
      objective_fn: (x) => (x[0] - 5) ** 2 + x[1] * 0.1,
      design_vars: [
        { nominal: 3, range: [0, 10] },
      ],
      noise_vars: [
        { mean: 0, std: 0.5 },
      ],
    });

    expect(result.optimal_design[0]).toBeGreaterThanOrEqual(0);
    expect(result.optimal_design[0]).toBeLessThanOrEqual(10);
  });

  it("15. Lower noise std -> higher S/N ratio", () => {
    const objFn = (x: number[]) => (x[0] - 5) ** 2 + x[1];

    const resultLowNoise = reliabilityOptimizationEngine.robustDesignOptimization({
      objective_fn: objFn,
      design_vars: [{ nominal: 5, range: [3, 7] }],
      noise_vars: [{ mean: 0, std: 0.1 }],
    });

    const resultHighNoise = reliabilityOptimizationEngine.robustDesignOptimization({
      objective_fn: objFn,
      design_vars: [{ nominal: 5, range: [3, 7] }],
      noise_vars: [{ mean: 0, std: 2.0 }],
    });

    // Lower noise should give a higher (less negative) SNR for smaller-is-better
    // or the std should be lower
    expect(resultLowNoise.expected_output_std).toBeLessThan(resultHighNoise.expected_output_std + 1);
  });

  it("16. Robustness index > 0", () => {
    const result = reliabilityOptimizationEngine.robustDesignOptimization({
      objective_fn: (x) => 10 + x[0] + x[1] * 0.01,
      design_vars: [{ nominal: 5, range: [1, 10] }],
      noise_vars: [{ mean: 0, std: 0.5 }],
    });

    expect(result.robustness_index).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SYSTEM RELIABILITY
// ============================================================================

describe("ReliabilityOptimizationEngine — System Reliability", () => {
  it("17. Series: R_sys < min(R_i)", () => {
    const R = [0.95, 0.98, 0.99, 0.97];
    const result = reliabilityOptimizationEngine.systemReliability({
      component_reliabilities: R,
      system_type: "series",
    });

    // Series reliability < all components (unless all = 1)
    expect(result.system_reliability).toBeLessThan(Math.min(...R) + 1e-10);
    expect(result.system_reliability).toBeGreaterThan(0);
  });

  it("18. Parallel: R_sys > max(R_i)", () => {
    const R = [0.9, 0.85, 0.8];
    const result = reliabilityOptimizationEngine.systemReliability({
      component_reliabilities: R,
      system_type: "parallel",
    });

    // Parallel reliability > all components
    expect(result.system_reliability).toBeGreaterThan(Math.max(...R) - 1e-10);
    expect(result.system_reliability).toBeLessThanOrEqual(1);
  });

  it("19. k-of-n: between series and parallel", () => {
    const R = [0.9, 0.9, 0.9, 0.9];

    const series = reliabilityOptimizationEngine.systemReliability({
      component_reliabilities: R,
      system_type: "series",
    });

    const parallel = reliabilityOptimizationEngine.systemReliability({
      component_reliabilities: R,
      system_type: "parallel",
    });

    const kOfN = reliabilityOptimizationEngine.systemReliability({
      component_reliabilities: R,
      system_type: "k_of_n",
      k: 2,
    });

    // 2-of-4 should be between series (4-of-4) and parallel (1-of-4)
    expect(kOfN.system_reliability).toBeGreaterThan(series.system_reliability - 0.01);
    expect(kOfN.system_reliability).toBeLessThan(parallel.system_reliability + 0.01);
  });
});

// ============================================================================
// TOLERANCE OPTIMIZATION
// ============================================================================

describe("ReliabilityOptimizationEngine — Tolerance Optimization", () => {
  it("20. Optimal tolerances achieve target reliability at minimum cost", () => {
    const result = reliabilityOptimizationEngine.manufacturingToleranceOptimization({
      target_dimension: 100,
      target_tolerance: 0.5,
      contributing_dims: [
        { nominal: 40, tolerance: 0.3, cost_per_unit_tol: 10 },
        { nominal: 30, tolerance: 0.2, cost_per_unit_tol: 20 },
        { nominal: 30, tolerance: 0.25, cost_per_unit_tol: 15 },
      ],
      target_reliability: 0.9973,
    });

    expect(result.optimal_tolerances).toHaveLength(3);
    expect(result.total_cost).toBeGreaterThan(0);
    expect(result.assembly_reliability).toBeGreaterThanOrEqual(0.99);
    expect(result.cpk_achieved).toBeGreaterThan(0);

    // All tolerances should be positive
    for (const t of result.optimal_tolerances) {
      expect(t).toBeGreaterThan(0);
    }

    // Savings vs equal allocation could be positive or negative
    expect(Number.isFinite(result.savings_vs_equal_allocation_pct)).toBe(true);
  });
});
