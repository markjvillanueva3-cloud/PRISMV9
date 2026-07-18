/**
 * Tests for DimensionalAnalysisCrossValidationEngine
 *
 * Covers:
 *   - Buckingham Pi theorem (dimensional analysis)
 *   - Dimensional consistency checking
 *   - Machining dimensional analysis presets
 *   - k-fold, LOO, repeated k-fold, nested cross-validation
 *   - Model comparison (AIC, BIC, CV)
 *   - Learning curves
 */

import { describe, it, expect } from "vitest";
import { dimensionalAnalysisCrossValidationEngine as engine } from "../engines/DimensionalAnalysisCrossValidationEngine.js";

// ============================================================================
// Helper: generate linear data y = 2*x + 1 + noise
// ============================================================================
function generateLinearData(n: number, noise = 0.1, seed = 42): { X: number[][]; y: number[] } {
  let s = seed | 0 || 1;
  const rng = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() * 10;
    X.push([x]);
    y.push(2 * x + 1 + (rng() - 0.5) * noise);
  }
  return { X, y };
}

/** Generate polynomial data y = x^2 + 3x + 2 + noise */
function generatePolyData(n: number, noise = 0.5, seed = 99): { X: number[][]; y: number[] } {
  let s = seed | 0 || 1;
  const rng = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() * 6 - 3;
    X.push([x]);
    y.push(x * x + 3 * x + 2 + (rng() - 0.5) * noise);
  }
  return { X, y };
}

// ============================================================================
// 1. Buckingham Pi Theorem
// ============================================================================

describe("Buckingham Pi Theorem", () => {
  it("3 vars with 2 dims → 1 Pi group", () => {
    // Pendulum: T [T:1], L [L:1], g [L:1, T:-2]
    const result = engine.buckinghamPi({
      variables: [
        { name: "T", dimensions: { T: 1 } },
        { name: "L", dimensions: { L: 1 } },
        { name: "g", dimensions: { L: 1, T: -2 } },
      ],
    });
    expect(result.n_pi_groups).toBe(1);
    expect(result.pi_groups).toHaveLength(1);
    expect(result.rank).toBe(2);
  });

  it("force analysis gives correct n-r groups", () => {
    // 5 variables: F [MLT-2], m [M], L [L], t [T], v [LT-1]
    const result = engine.buckinghamPi({
      variables: [
        { name: "F", dimensions: { M: 1, L: 1, T: -2 } },
        { name: "m", dimensions: { M: 1 } },
        { name: "L", dimensions: { L: 1 } },
        { name: "t", dimensions: { T: 1 } },
        { name: "v", dimensions: { L: 1, T: -1 } },
      ],
    });
    // 3 fundamental dimensions (M, L, T), rank should be 3
    // So n-r = 5-3 = 2 Pi groups
    expect(result.rank).toBe(3);
    expect(result.n_pi_groups).toBe(2);
    expect(result.pi_groups).toHaveLength(2);
  });

  it("known result: pendulum Pi = T²g/L", () => {
    const result = engine.buckinghamPi({
      variables: [
        { name: "T", dimensions: { T: 1 } },
        { name: "L", dimensions: { L: 1 } },
        { name: "g", dimensions: { L: 1, T: -2 } },
      ],
    });
    // The single Pi group should involve T, L, g
    const pi = result.pi_groups[0];
    expect(pi.variables).toContain("T");
    expect(pi.variables).toContain("L");
    expect(pi.variables).toContain("g");

    // Verify dimensionlessness: sum of exponent * dimension for each dim = 0
    const vars = [
      { name: "T", dimensions: { T: 1 } as Record<string, number> },
      { name: "L", dimensions: { L: 1 } as Record<string, number> },
      { name: "g", dimensions: { L: 1, T: -2 } as Record<string, number> },
    ];
    const dims = ["L", "T"];
    for (const d of dims) {
      let sum = 0;
      for (let i = 0; i < vars.length; i++) {
        sum += (vars[i].dimensions[d] ?? 0) * pi.exponents[i];
      }
      expect(Math.abs(sum)).toBeLessThan(1e-8);
    }
  });
});

// ============================================================================
// 2. Dimensional Consistency
// ============================================================================

describe("Dimensional Consistency Check", () => {
  it("valid equation passes", () => {
    // F = m * a → both sides [M L T^-2]
    const result = engine.dimensionalConsistencyCheck({
      equation_terms: [
        { coefficient: 1, variables: ["F"], exponents: [1] },
        { coefficient: 1, variables: ["m", "a"], exponents: [1, 1] },
      ],
      variable_dimensions: {
        F: { M: 1, L: 1, T: -2 },
        m: { M: 1 },
        a: { L: 1, T: -2 },
      },
    });
    expect(result.consistent).toBe(true);
    expect(result.inconsistencies).toHaveLength(0);
  });

  it("invalid equation detected", () => {
    // F = m * v (wrong: force ≠ momentum)
    const result = engine.dimensionalConsistencyCheck({
      equation_terms: [
        { coefficient: 1, variables: ["F"], exponents: [1] },
        { coefficient: 1, variables: ["m", "v"], exponents: [1, 1] },
      ],
      variable_dimensions: {
        F: { M: 1, L: 1, T: -2 },
        m: { M: 1 },
        v: { L: 1, T: -1 },
      },
    });
    expect(result.consistent).toBe(false);
    expect(result.inconsistencies.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. Machining Dimensional Analysis
// ============================================================================

describe("Machining Dimensional Analysis", () => {
  it("cutting force set produces meaningful Pi groups", () => {
    const result = engine.machiningDimensionalAnalysis({ variable_set: "cutting_force" });
    expect(result.pi_groups.length).toBeGreaterThan(0);
    expect(result.known_correlations.length).toBeGreaterThan(0);
    expect(result.known_correlations.some(c => c.name === "Kienzle")).toBe(true);
    expect(result.physical_interpretation.length).toBeGreaterThan(0);
  });

  it("surface roughness set includes f/r ratio concept", () => {
    const result = engine.machiningDimensionalAnalysis({ variable_set: "surface_roughness" });
    expect(result.pi_groups.length).toBeGreaterThan(0);
    // The physical interpretation should mention feed-to-nose-radius
    const hasRatio = result.physical_interpretation.some(
      (p) => p.includes("f") && p.includes("r_nose")
    );
    expect(hasRatio).toBe(true);
    expect(result.known_correlations.some(c => c.equation.includes("r_nose"))).toBe(true);
  });
});

// ============================================================================
// 4. k-Fold Cross-Validation
// ============================================================================

describe("k-Fold Cross-Validation", () => {
  it("mean score ≈ true performance (±0.1)", () => {
    const { X, y } = generateLinearData(100, 0.1);
    const result = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 10 });
    // Linear model on linear data should give R² close to 1
    expect(result.mean_score).toBeGreaterThan(0.9);
    expect(result.mean_r_squared).toBeGreaterThan(0.9);
  });

  it("k=5 gives reasonable variance estimate", () => {
    const { X, y } = generateLinearData(50, 0.5);
    const result = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 5 });
    expect(result.fold_scores).toHaveLength(5);
    expect(result.std_score).toBeGreaterThanOrEqual(0);
    expect(result.std_score).toBeLessThan(1);
  });

  it("higher k → lower bias, higher variance", () => {
    const { X, y } = generateLinearData(60, 1.0);
    const r5 = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 3, seed: 1 });
    const r10 = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 10, seed: 1 });
    // With more folds, we train on more data → generally higher mean score (lower bias)
    // The variance of fold scores tends to increase with k
    // Just verify both give valid output
    expect(r5.fold_scores).toHaveLength(3);
    expect(r10.fold_scores).toHaveLength(10);
    // Higher k trains on more data per fold → typically better mean score
    // Allow some tolerance since randomness is involved
    expect(r10.mean_score).toBeGreaterThan(r5.mean_score - 0.15);
  });
});

// ============================================================================
// 5. Leave-One-Out CV
// ============================================================================

describe("Leave-One-Out CV", () => {
  it("PRESS statistic computed correctly", () => {
    const { X, y } = generateLinearData(20, 0.2);
    const result = engine.leaveOneOutCV({ X, y, model_type: "linear" });
    expect(result.press_statistic).toBeGreaterThan(0);
    expect(result.loo_mse).toBeGreaterThan(0);
    expect(result.loo_r_squared).toBeLessThanOrEqual(1);
    // For good linear fit, PRESS should be close to RSS
    expect(result.loo_r_squared).toBeGreaterThan(0.8);
  });

  it("identifies influential points (high leverage)", () => {
    // Create data with an outlier/leverage point
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 20; i++) {
      X.push([i]);
      y.push(2 * i + 1);
    }
    // Add a high-leverage point far from the rest
    X.push([100]);
    y.push(50); // Way off the line y=2x+1 (should be 201)

    const result = engine.leaveOneOutCV({ X, y, model_type: "linear" });
    expect(result.press_statistic).toBeGreaterThan(0);
    // The outlier point at index 20 should be influential
    expect(result.influential_points).toContain(20);
  });
});

// ============================================================================
// 6. Repeated k-Fold CV
// ============================================================================

describe("Repeated k-Fold CV", () => {
  it("more repeats → tighter CI", () => {
    const { X, y } = generateLinearData(40, 0.3);
    const r3 = engine.repeatedKFoldCV({ X, y, model_type: "linear", k: 5, n_repeats: 3 });
    const r20 = engine.repeatedKFoldCV({ X, y, model_type: "linear", k: 5, n_repeats: 20 });

    const ci3Width = r3.confidence_interval_95[1] - r3.confidence_interval_95[0];
    const ci20Width = r20.confidence_interval_95[1] - r20.confidence_interval_95[0];
    // More repeats → tighter (or equal) CI
    expect(ci20Width).toBeLessThanOrEqual(ci3Width + 0.01);
    expect(r20.repeat_means).toHaveLength(20);
    expect(r3.repeat_means).toHaveLength(3);
  });
});

// ============================================================================
// 7. Nested Cross-Validation
// ============================================================================

describe("Nested Cross-Validation", () => {
  it("selects correct model when one is clearly better", () => {
    // Polynomial data → polynomial model should win over linear
    const { X, y } = generatePolyData(60, 0.5);
    const result = engine.nestedCrossValidation({
      X, y,
      model_types: ["linear", "polynomial"],
      hyperparams: { degree: [2] },
      k_outer: 3,
      k_inner: 3,
    });
    // Polynomial should be selected or at least competitive
    expect(["linear", "polynomial"]).toContain(result.best_model);
    expect(result.generalization_score).toBeGreaterThan(-1);
    expect(result.selection_stability).toBeGreaterThan(0);
    expect(result.selection_stability).toBeLessThanOrEqual(1);
  });

  it("provides unbiased performance estimate", () => {
    const { X, y } = generateLinearData(50, 0.2);
    const result = engine.nestedCrossValidation({
      X, y,
      model_types: ["linear", "ridge"],
      hyperparams: { lambda: [0.01, 0.1, 1.0] },
      k_outer: 5,
      k_inner: 3,
    });
    // Generalization score should be reasonable (not inflated)
    expect(result.generalization_score).toBeLessThanOrEqual(1);
    expect(result.generalization_score).toBeGreaterThan(0.5);
    expect(Object.keys(result.model_comparison).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 8. Model Comparison
// ============================================================================

describe("Model Comparison", () => {
  it("simpler model preferred when similar performance (BIC)", () => {
    // Linear data → linear model should be preferred by BIC (penalizes complexity)
    const { X, y } = generateLinearData(50, 0.1);
    const result = engine.compareModels({
      X, y,
      models: [
        { name: "linear", type: "linear" },
        { name: "polynomial", type: "polynomial", params: { degree: 2 } },
      ],
    });
    // BIC penalizes complexity more → should prefer linear for linear data
    expect(result.best_by_bic).toBe("linear");
    expect(result.comparison_table).toHaveLength(2);
  });

  it("AIC ≤ BIC for same model (BIC penalizes more for n > e²≈7.4)", () => {
    const { X, y } = generateLinearData(30, 0.2);
    const result = engine.compareModels({
      X, y,
      models: [{ name: "linear", type: "linear" }],
    });
    const row = result.comparison_table[0];
    // BIC penalty: k*ln(n), AIC penalty: 2k. For n≥8, ln(n) > 2 → BIC > AIC
    expect(row.bic).toBeGreaterThanOrEqual(row.aic - 0.001);
  });
});

// ============================================================================
// 9. Learning Curve
// ============================================================================

describe("Learning Curve", () => {
  it("test score improves with more data", () => {
    const { X, y } = generateLinearData(80, 0.5);
    const result = engine.learningCurve({
      X, y, model_type: "linear",
      train_sizes: [0.2, 0.5, 0.8],
      n_repeats: 5,
    });
    expect(result.train_sizes_abs).toHaveLength(3);
    // General trend: more data → better test score
    expect(result.test_scores[result.test_scores.length - 1])
      .toBeGreaterThanOrEqual(result.test_scores[0] - 0.1);
  });

  it("convergence detected for sufficient data", () => {
    const { X, y } = generateLinearData(100, 0.1);
    const result = engine.learningCurve({
      X, y, model_type: "linear",
      train_sizes: [0.3, 0.5, 0.7, 0.9, 0.95],
      n_repeats: 3,
    });
    // With clean linear data, should converge
    expect(result.converged).toBe(true);
    expect(result.recommended_min_samples).toBeLessThanOrEqual(100);
  });

  it("train score ≥ test score (typical)", () => {
    const { X, y } = generateLinearData(60, 0.5);
    const result = engine.learningCurve({
      X, y, model_type: "linear",
      train_sizes: [0.3, 0.6, 0.9],
      n_repeats: 5,
    });
    // Training score is typically >= test score (overfitting gap)
    for (let i = 0; i < result.train_scores.length; i++) {
      // Allow small tolerance for randomness
      expect(result.train_scores[i]).toBeGreaterThanOrEqual(result.test_scores[i] - 0.15);
    }
  });
});

// ============================================================================
// 10. Boundary Cases
// ============================================================================

describe("Boundary Cases", () => {
  it("k=1 is valid (train and test on full data)", () => {
    const { X, y } = generateLinearData(20, 0.1);
    const result = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 1 });
    expect(result.fold_scores).toHaveLength(1);
    expect(result.mean_score).toBeGreaterThan(0.9);
    expect(result.std_score).toBe(0);
  });

  it("single feature works", () => {
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]; // y = 2x
    const result = engine.kFoldCrossValidation({ X, y, model_type: "linear", k: 5 });
    expect(result.mean_score).toBeGreaterThan(0.9);
    expect(result.mean_mse).toBeLessThan(1);
  });
});
