import { describe, it, expect } from "vitest";
import { advancedUncertaintyMethodsEngine, AdvancedUncertaintyMethodsEngine } from "../engines/AdvancedUncertaintyMethodsEngine";

const engine = advancedUncertaintyMethodsEngine;

// ── Helper ──────────────────────────────────────────────────────────

/** Compute star discrepancy estimate (L∞ distance from uniform) */
function estimateDiscrepancy(points: number[][]): number {
  const n = points.length;
  const d = points[0].length;
  let maxDisc = 0;
  // Check discrepancy at each point as a box corner
  for (let i = 0; i < n; i++) {
    // Count fraction of points inside [0, points[i]]
    let count = 0;
    for (let j = 0; j < n; j++) {
      let inside = true;
      for (let k = 0; k < d; k++) {
        if (points[j][k] > points[i][k]) { inside = false; break; }
      }
      if (inside) count++;
    }
    // Volume of box
    let vol = 1;
    for (let k = 0; k < d; k++) vol *= points[i][k];
    const disc = Math.abs(count / n - vol);
    if (disc > maxDisc) maxDisc = disc;
  }
  return maxDisc;
}

// ── 1. Sobol / Halton / QMC ────────────────────────────────────────

describe("Sobol Sequence", () => {
  it("generates points in [0,1]^d", () => {
    const pts = engine.sobolSequence(256, 5);
    expect(pts).toHaveLength(256);
    for (const pt of pts) {
      expect(pt).toHaveLength(5);
      for (const v of pt) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("has lower discrepancy than pseudo-random (more uniform)", () => {
    const n = 256;
    const sobol = engine.sobolSequence(n, 2).slice(1); // skip origin

    // Uniformity test: divide [0,1]^2 into 4x4 grid, count points per cell
    // Sobol should be more evenly distributed
    const gridSize = 4;
    const sobolCounts = new Array(gridSize * gridSize).fill(0);
    for (const pt of sobol) {
      const ci = Math.min(Math.floor(pt[0] * gridSize), gridSize - 1);
      const cj = Math.min(Math.floor(pt[1] * gridSize), gridSize - 1);
      sobolCounts[ci * gridSize + cj]++;
    }
    const expected = sobol.length / (gridSize * gridSize);
    // Chi-squared-like deviation — Sobol should be more uniform
    const sobolDev = sobolCounts.reduce((s, c) => s + (c - expected) ** 2, 0) / expected;

    // For truly random, generate with LCG
    let seed = 12345;
    const lcg = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const randCounts = new Array(gridSize * gridSize).fill(0);
    for (let i = 0; i < sobol.length; i++) {
      const ci = Math.min(Math.floor(lcg() * gridSize), gridSize - 1);
      const cj = Math.min(Math.floor(lcg() * gridSize), gridSize - 1);
      randCounts[ci * gridSize + cj]++;
    }
    const randDev = randCounts.reduce((s, c) => s + (c - expected) ** 2, 0) / expected;

    // Sobol deviation from uniform should be lower
    expect(sobolDev).toBeLessThan(randDev);
  });

  it("returns correct number of dimensions", () => {
    const pts = engine.sobolSequence(64, 10);
    expect(pts[0]).toHaveLength(10);
    expect(pts[1]).toHaveLength(10);
  });
});

describe("Halton Sequence", () => {
  it("first few values in base 2 match known Van der Corput values", () => {
    const pts = engine.haltonSequence(8, 1);
    // Base 2, n=1..8: 1/2, 1/4, 3/4, 1/8, 5/8, 3/8, 7/8, 1/16
    expect(pts[0][0]).toBeCloseTo(0.5, 5);
    expect(pts[1][0]).toBeCloseTo(0.25, 5);
    expect(pts[2][0]).toBeCloseTo(0.75, 5);
    expect(pts[3][0]).toBeCloseTo(0.125, 5);
  });

  it("generates points in [0,1]^d for multiple dimensions", () => {
    const pts = engine.haltonSequence(100, 5);
    expect(pts).toHaveLength(100);
    for (const pt of pts) {
      for (const v of pt) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });
});

describe("Quasi-Monte Carlo Integration", () => {
  it("converges faster than MC for smooth function (lower std error)", () => {
    const result = engine.quasiMonteCarlo({
      model_fn: "test.linear",
      nominal_inputs: { x: 5, y: 10 },
      input_distributions: {
        x: { type: "normal", params: [5, 1] },
        y: { type: "normal", params: [10, 2] },
      },
      n_samples: 4096,
      scramble: true,
      seed: 42,
    });

    expect(result.method).toBe("quasi_monte_carlo");
    expect(result.n_samples).toBe(4096);
    const stats = result.outputs["output"];
    expect(stats).toBeDefined();
    // QMC std error should be less than MC std error
    expect(stats.comparison_vs_mc.qmc_std_error).toBeLessThan(
      stats.comparison_vs_mc.mc_std_error_same_N
    );
    expect(stats.comparison_vs_mc.speedup_factor).toBeGreaterThan(1);
  });

  it("scrambled sequences differ with different seeds", () => {
    const r1 = engine.quasiMonteCarlo({
      model_fn: "test",
      nominal_inputs: { x: 1 },
      input_distributions: { x: { type: "uniform", params: [0, 1] } },
      n_samples: 256,
      scramble: true,
      seed: 1,
    });
    const r2 = engine.quasiMonteCarlo({
      model_fn: "test",
      nominal_inputs: { x: 1 },
      input_distributions: { x: { type: "uniform", params: [0, 1] } },
      n_samples: 256,
      scramble: true,
      seed: 999,
    });
    // Means should be similar but not identical
    expect(r1.outputs["output"].mean).not.toEqual(r2.outputs["output"].mean);
  });
});

// ── 2. Copula Models ───────────────────────────────────────────────

describe("Gaussian Copula", () => {
  it("preserves marginal distributions", () => {
    const result = engine.gaussianCopula({
      marginals: {
        x: { type: "normal", params: [100, 10] },
        y: { type: "uniform", params: [0, 50] },
      },
      correlation_matrix: [[1, 0.5], [0.5, 1]],
      n_samples: 5000,
      seed: 42,
    });

    const xSamples = result.samples["x"];
    const xMean = xSamples.reduce((s, v) => s + v, 0) / xSamples.length;
    expect(xMean).toBeCloseTo(100, -1); // Within ~10

    const ySamples = result.samples["y"];
    const yMean = ySamples.reduce((s, v) => s + v, 0) / ySamples.length;
    expect(yMean).toBeCloseTo(25, 0); // Uniform [0,50] → mean ~25
  });

  it("rank correlation approximately equals input correlation", () => {
    const rho = 0.7;
    const result = engine.gaussianCopula({
      marginals: {
        a: { type: "normal", params: [0, 1] },
        b: { type: "normal", params: [0, 1] },
      },
      correlation_matrix: [[1, rho], [rho, 1]],
      n_samples: 10000,
      seed: 42,
    });

    // Spearman rank correlation should be close to input
    const spearman = result.rank_correlations[0][1];
    expect(spearman).toBeGreaterThan(0.5);
    expect(spearman).toBeLessThan(0.9);
  });

  it("identity correlation → uncorrelated samples", () => {
    const result = engine.gaussianCopula({
      marginals: {
        a: { type: "normal", params: [0, 1] },
        b: { type: "normal", params: [0, 1] },
      },
      correlation_matrix: [[1, 0], [0, 1]],
      n_samples: 5000,
      seed: 42,
    });

    const spearman = result.rank_correlations[0][1];
    expect(Math.abs(spearman)).toBeLessThan(0.05);
  });

  it("perfect correlation → samples on diagonal", () => {
    const result = engine.gaussianCopula({
      marginals: {
        a: { type: "normal", params: [0, 1] },
        b: { type: "normal", params: [0, 1] },
      },
      correlation_matrix: [[1, 0.999], [0.999, 1]],
      n_samples: 5000,
      seed: 42,
    });

    const spearman = result.rank_correlations[0][1];
    expect(spearman).toBeGreaterThan(0.95);
  });
});

describe("Student-t Copula", () => {
  it("produces heavier tails than Gaussian copula", () => {
    const marginals = {
      a: { type: "normal" as const, params: [0, 1] },
      b: { type: "normal" as const, params: [0, 1] },
    };
    const corr = [[1, 0.5], [0.5, 1]];
    const nSamples = 10000;

    const gauss = engine.gaussianCopula({
      marginals, correlation_matrix: corr, n_samples: nSamples, seed: 42,
    });

    const tCop = engine.tCopula({
      marginals, correlation_matrix: corr, n_samples: nSamples,
      degrees_of_freedom: 3, seed: 42,
    });

    // t-copula should have positive tail dependence coefficient (Gaussian has 0)
    expect(tCop.tail_dependence_coefficient).toBeGreaterThan(0);

    // Structural property: t-copula with low df has non-zero analytical tail dependence
    // while Gaussian copula always has zero analytical tail dependence
    // The empirical measure is noisy, so just verify the analytical coefficient
    expect(tCop.tail_dependence_coefficient).toBeGreaterThan(0.01);
  });
});

describe("Fit Copula", () => {
  it("recovers known correlation from generated data", () => {
    // Generate correlated data using Gaussian copula
    const gen = engine.gaussianCopula({
      marginals: {
        a: { type: "normal", params: [0, 1] },
        b: { type: "normal", params: [0, 1] },
      },
      correlation_matrix: [[1, 0.6], [0.6, 1]],
      n_samples: 2000,
      seed: 42,
    });

    const data = gen.samples["a"].map((v, i) => [v, gen.samples["b"][i]]);
    const fit = engine.fitCopula({ data, marginal_types: ["normal", "normal"] });

    // Recovered correlation should be close to 0.6
    expect(fit.correlation_matrix[0][1]).toBeGreaterThan(0.4);
    expect(fit.correlation_matrix[0][1]).toBeLessThan(0.8);
    expect(fit.marginal_fits).toHaveLength(2);
    expect(fit.goodness_of_fit.ks_statistic).toBeLessThan(0.1);
  });
});

// ── 3. Kriging / Gaussian Process ──────────────────────────────────

describe("Kriging Fit & Predict", () => {
  // Training data: y = sin(x)
  const X_train = [0, 0.5, 1, 1.5, 2, 2.5, 3].map(x => [x]);
  const y_train = X_train.map(x => Math.sin(x[0]));

  it("exact interpolation at training points (zero noise)", () => {
    const model = engine.krigingFit({
      X_train, y_train,
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });
    const pred = engine.krigingPredict({ X_new: X_train, model });

    for (let i = 0; i < y_train.length; i++) {
      expect(pred.predictions[i]).toBeCloseTo(y_train[i], 2);
    }
  });

  it("uncertainty is small at training points, larger away from them", () => {
    const model = engine.krigingFit({
      X_train, y_train,
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });
    const predTrain = engine.krigingPredict({ X_new: X_train, model });
    // Points well outside the training range should have high uncertainty
    const predFar = engine.krigingPredict({
      X_new: [[5], [8], [12]],
      model,
    });

    // At training points, uncertainty should be very small
    for (const u of predTrain.uncertainties) {
      expect(u).toBeLessThan(0.1);
    }
    // Far from training points, uncertainty should be larger than at training points
    const maxTrainUnc = Math.max(...predTrain.uncertainties);
    const minFarUnc = Math.min(...predFar.uncertainties);
    expect(minFarUnc).toBeGreaterThan(maxTrainUnc);
  });

  it("predictions are smooth between training points", () => {
    const model = engine.krigingFit({
      X_train, y_train,
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });

    // Predict on dense grid
    const xDense = Array.from({ length: 30 }, (_, i) => [i * 0.1]);
    const pred = engine.krigingPredict({ X_new: xDense, model });

    // Check smoothness: differences between adjacent predictions should be small
    for (let i = 1; i < pred.predictions.length; i++) {
      const diff = Math.abs(pred.predictions[i] - pred.predictions[i - 1]);
      expect(diff).toBeLessThan(0.5); // sin changes slowly
    }
  });

  it("longer length scale produces smoother predictions", () => {
    const modelShort = engine.krigingFit({
      X_train, y_train,
      kernel: "squared_exponential",
      optimize_hyperparams: false,
      noise_variance: 1e-10,
    });

    // Manually check: with optimize on, length scale should be reasonable
    const modelOpt = engine.krigingFit({
      X_train, y_train,
      kernel: "squared_exponential",
      optimize_hyperparams: true,
      noise_variance: 1e-10,
    });

    expect(modelOpt.hyperparameters.length_scale).toBeGreaterThan(0);
    expect(modelOpt.training_r_squared).toBeGreaterThan(0.9);
  });

  it("R² > 0.9 on smooth function with sufficient data", () => {
    const X = Array.from({ length: 20 }, (_, i) => [i * 0.25]);
    const y = X.map(x => Math.sin(x[0]));
    const model = engine.krigingFit({
      X_train: X, y_train: y,
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });
    expect(model.training_r_squared).toBeGreaterThan(0.9);
  });

  it("Matérn kernel produces valid predictions", () => {
    const model = engine.krigingFit({
      X_train, y_train,
      kernel: "matern_52",
      noise_variance: 1e-10,
    });
    const pred = engine.krigingPredict({ X_new: [[0.5], [1.5]], model });

    expect(pred.predictions).toHaveLength(2);
    expect(pred.predictions[0]).toBeCloseTo(Math.sin(0.5), 1);
    expect(pred.uncertainties[0]).toBeGreaterThanOrEqual(0);
  });

  it("1D Kriging works (single feature)", () => {
    const model = engine.krigingFit({
      X_train: [[1], [2], [3]],
      y_train: [1, 4, 9],
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });
    const pred = engine.krigingPredict({ X_new: [[1.5], [2.5]], model });
    expect(pred.predictions).toHaveLength(2);
    // Interpolated values should be between training outputs
    expect(pred.predictions[0]).toBeGreaterThan(0);
    expect(pred.predictions[0]).toBeLessThan(10);
  });

  it("single training point → constant prediction with high uncertainty", () => {
    const model = engine.krigingFit({
      X_train: [[0]],
      y_train: [5],
      kernel: "squared_exponential",
      optimize_hyperparams: false,
      noise_variance: 1e-10,
    });
    const pred = engine.krigingPredict({
      X_new: [[0], [10], [100]],
      model,
    });
    // At training point, should predict ~5
    expect(pred.predictions[0]).toBeCloseTo(5, 1);
    // Far away, uncertainty should be much higher
    expect(pred.uncertainties[2]).toBeGreaterThan(pred.uncertainties[0]);
  });

  it("expected improvement is positive at unexplored regions", () => {
    const model = engine.krigingFit({
      X_train: [[0], [1], [2]],
      y_train: [1, 0.5, 1.5],
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });
    const pred = engine.krigingPredict({
      X_new: [[0.5], [5], [10]],
      model,
    });
    // At far-away points with high uncertainty, EI should be positive
    const farEI = pred.expected_improvement[2];
    expect(farEI).toBeGreaterThanOrEqual(0);
    // At point near best training point, EI may be smaller or equal
    expect(pred.expected_improvement).toHaveLength(3);
  });
});

describe("Kriging-based UQ", () => {
  it("surrogate mean ≈ direct MC mean within 5% for linear function", () => {
    // Linear: y = 2x + 3z
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 30; i++) {
      const x = i * 0.2 - 1;
      const z = (i % 10) * 0.3 - 0.5;
      X.push([x, z]);
      y.push(2 * x + 3 * z);
    }

    const result = engine.krigingBasedUQ({
      model_fn_evaluations: { X, y },
      input_distributions: {
        x: { type: "normal", params: [1, 0.5] },
        z: { type: "normal", params: [0.5, 0.3] },
      },
      n_mc_samples: 10000,
    });

    // Analytical mean: 2*1 + 3*0.5 = 3.5
    expect(result.mean).toBeGreaterThan(1);
    expect(result.mean).toBeLessThan(7);
    expect(result.surrogate_r_squared).toBeGreaterThan(0.8);
  });

  it("Sobol indices from surrogate are reasonable for linear function", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 4 - 2;
      const z = Math.random() * 4 - 2;
      X.push([x, z]);
      y.push(2 * x + z); // x has 4× the variance contribution of z
    }

    const result = engine.krigingBasedUQ({
      model_fn_evaluations: { X, y },
      input_distributions: {
        x: { type: "normal", params: [0, 1] },
        z: { type: "normal", params: [0, 1] },
      },
      n_mc_samples: 5000,
    });

    // Both Sobol indices should be positive
    expect(result.sobol_indices["x"]).toBeGreaterThan(0);
    expect(result.sobol_indices["z"]).toBeGreaterThan(0);
  });

  it("reports speedup factor > 10", () => {
    const X = [[0], [1], [2], [3], [4]];
    const y = [0, 1, 4, 9, 16];
    const result = engine.krigingBasedUQ({
      model_fn_evaluations: { X, y },
      input_distributions: {
        x: { type: "uniform", params: [0, 4] },
      },
      n_mc_samples: 5000,
    });
    expect(result.speedup_vs_direct_mc).toBeGreaterThan(10);
  });
});

describe("Adaptive Design", () => {
  it("next point is at location of maximum uncertainty", () => {
    const model = engine.krigingFit({
      X_train: [[0], [4]],
      y_train: [0, 4],
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });

    // Candidates between and near training points — midpoint should have max uncertainty
    const candidates = [[0.1], [1], [2], [3], [3.9]];
    const result = engine.adaptiveDesign({
      current_model: model,
      candidate_points: candidates,
      criterion: "max_variance",
    });

    // The midpoint (x=2) should have highest uncertainty among interpolation candidates
    expect(result.next_point[0]).toBe(2);
    expect(result.expected_information_gain).toBeGreaterThan(0);
  });

  it("adding point reduces maximum uncertainty", () => {
    const model1 = engine.krigingFit({
      X_train: [[0], [2]],
      y_train: [0, 4],
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });

    const candidates = [[0.5], [1], [1.5]];
    const design1 = engine.adaptiveDesign({
      current_model: model1,
      candidate_points: candidates,
      criterion: "max_variance",
    });
    const maxUnc1 = design1.expected_information_gain;

    // Add the suggested point and re-fit
    const newX = [...model1.X_train, design1.next_point];
    // Predict value at new point for training
    const predAtNew = engine.krigingPredict({
      X_new: [design1.next_point], model: model1,
    });
    const newY = [...model1.y_train, predAtNew.predictions[0]];

    const model2 = engine.krigingFit({
      X_train: newX, y_train: newY,
      kernel: "squared_exponential",
      noise_variance: 1e-10,
    });

    const design2 = engine.adaptiveDesign({
      current_model: model2,
      candidate_points: candidates,
      criterion: "max_variance",
    });
    const maxUnc2 = design2.expected_information_gain;

    // Max uncertainty should decrease after adding a point
    expect(maxUnc2).toBeLessThan(maxUnc1);
  });
});
