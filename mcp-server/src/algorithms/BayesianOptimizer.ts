/**
 * Bayesian Optimizer — Sequential Model-Based Optimization
 *
 * Gaussian Process surrogate with Expected Improvement acquisition for
 * expensive-to-evaluate manufacturing experiments. Balances exploration
 * vs exploitation to find optimal cutting parameters with minimal trials.
 *
 * References:
 * - Jones, D.R. et al. (1998). "Efficient Global Optimization (EGO)"
 * - Shahriari, B. et al. (2016). "Taking the Human Out of the Loop"
 * - Snoek, J. et al. (2012). "Practical Bayesian Optimization"
 *
 * @module algorithms/BayesianOptimizer
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface BayesianOptimizerInput {
  /** Observed input points (each row = one experiment). */
  X_observed: number[][];
  /** Observed output values (one per experiment, minimize). */
  y_observed: number[];
  /** Number of dimensions. */
  dimensions: number;
  /** Lower bounds per dimension. */
  lower_bounds: number[];
  /** Upper bounds per dimension. */
  upper_bounds: number[];
  /** Number of candidates to evaluate. Default 1000. */
  n_candidates?: number;
  /** Acquisition function. Default "EI". */
  acquisition?: "EI" | "UCB" | "PI";
  /** UCB kappa (exploration weight). Default 2.0. */
  kappa?: number;
  /** GP length scale. Default auto. */
  length_scale?: number;
  /** GP signal variance. Default 1.0. */
  signal_variance?: number;
  /** GP noise variance. Default 0.01. */
  noise_variance?: number;
  /** Seed for candidate generation. */
  seed?: number;
}

export interface BayesianOptimizerOutput extends WithWarnings {
  next_point: number[];
  expected_improvement: number;
  predicted_mean: number;
  predicted_std: number;
  best_observed: number;
  best_observed_point: number[];
  model_quality: number;
  calculation_method: string;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class BayesianOptimizer implements Algorithm<BayesianOptimizerInput, BayesianOptimizerOutput> {

  validate(input: BayesianOptimizerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.X_observed?.length) issues.push({ field: "X_observed", message: "At least 1 observation required", severity: "error" });
    if (!input.y_observed?.length) issues.push({ field: "y_observed", message: "Required", severity: "error" });
    if (input.X_observed?.length !== input.y_observed?.length) {
      issues.push({ field: "y_observed", message: "Must match X_observed length", severity: "error" });
    }
    if (!input.dimensions || input.dimensions < 1) issues.push({ field: "dimensions", message: "Must be >= 1", severity: "error" });
    if (input.X_observed?.length < 2) issues.push({ field: "X_observed", message: "At least 2 observations recommended", severity: "warning" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: BayesianOptimizerInput): BayesianOptimizerOutput {
    const warnings: string[] = [];
    const { X_observed, y_observed, dimensions, lower_bounds, upper_bounds } = input;
    const nCandidates = input.n_candidates ?? 1000;
    const acquisition = input.acquisition ?? "EI";
    const kappa = input.kappa ?? 2.0;
    const sigVar = input.signal_variance ?? 1.0;
    const noiseVar = input.noise_variance ?? 0.01;
    const rand = mulberry32(input.seed ?? Date.now());
    const n = X_observed.length;

    // Auto length scale: median pairwise distance
    let ls = input.length_scale ?? 1.0;
    if (!input.length_scale && n >= 2) {
      const dists: number[] = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        dists.push(Math.sqrt(X_observed[i].reduce((s, v, d) => s + (v - X_observed[j][d]) ** 2, 0)));
      }
      dists.sort((a, b) => a - b);
      ls = dists[Math.floor(dists.length / 2)] || 1.0;
    }

    // RBF kernel
    const kernel = (x1: number[], x2: number[]) => {
      const r2 = x1.reduce((s, v, d) => s + ((v - x2[d]) / ls) ** 2, 0);
      return sigVar * Math.exp(-0.5 * r2);
    };

    // Build K matrix (n×n) + Cholesky-ish solve via regularized inverse
    const K: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => kernel(X_observed[i], X_observed[j]) + (i === j ? noiseVar : 0)));

    // Simple matrix inverse for small n (adequate for BO with <100 obs)
    const Kinv = this.invertMatrix(K);
    const alpha = Kinv.map(row => row.reduce((s, v, j) => s + v * y_observed[j], 0));

    const bestIdx = y_observed.indexOf(Math.min(...y_observed));
    const bestY = y_observed[bestIdx];

    // Normal CDF/PDF approximation
    const normPdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const normCdf = (x: number) => {
      const t = 1 / (1 + 0.2316419 * Math.abs(x));
      const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
      const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
      return x > 0 ? 1 - p : p;
    };

    // Evaluate candidates
    let bestEI = -Infinity;
    let bestCandidate: number[] = lower_bounds.map((lo, d) => (lo + upper_bounds[d]) / 2);
    let bestMu = 0, bestSigma = 0;

    for (let c = 0; c < nCandidates; c++) {
      const x = lower_bounds.map((lo, d) => lo + rand() * (upper_bounds[d] - lo));

      // GP prediction
      const kStar = X_observed.map(xi => kernel(x, xi));
      const mu = kStar.reduce((s, k, i) => s + k * alpha[i], 0);
      const kss = kernel(x, x);
      const v = kStar.map((k, i) => Kinv[i].reduce((s, kinv, j) => s + kinv * kStar[j], 0));
      const sigma2 = Math.max(1e-10, kss - kStar.reduce((s, k, i) => s + k * v[i], 0));
      const sigma = Math.sqrt(sigma2);

      // Acquisition
      let acqVal = 0;
      if (acquisition === "EI") {
        const z = sigma > 1e-8 ? (bestY - mu) / sigma : 0;
        acqVal = sigma > 1e-8 ? (bestY - mu) * normCdf(z) + sigma * normPdf(z) : 0;
      } else if (acquisition === "UCB") {
        acqVal = -(mu - kappa * sigma); // minimize, so negate
      } else { // PI
        const z = sigma > 1e-8 ? (bestY - mu) / sigma : 0;
        acqVal = normCdf(z);
      }

      if (acqVal > bestEI) {
        bestEI = acqVal;
        bestCandidate = x;
        bestMu = mu;
        bestSigma = sigma;
      }
    }

    // Model quality: leave-one-out cross-validation R²
    let ssRes = 0, ssTot = 0;
    const yMean = y_observed.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      const pred = y_observed[i] - alpha[i] / Kinv[i][i];
      ssRes += (y_observed[i] - pred) ** 2;
      ssTot += (y_observed[i] - yMean) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      next_point: bestCandidate,
      expected_improvement: bestEI,
      predicted_mean: bestMu,
      predicted_std: bestSigma,
      best_observed: bestY,
      best_observed_point: X_observed[bestIdx],
      model_quality: Math.max(0, r2),
      warnings,
      calculation_method: `Bayesian optimization (GP + ${acquisition}, ls=${ls.toFixed(2)})`,
    };
  }

  private invertMatrix(A: number[][]): number[][] {
    const n = A.length;
    const aug: number[][] = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) { aug[col][col] = 1e-12; continue; }
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "bayesian-optimizer",
      name: "Bayesian Optimizer (GP-EI)",
      description: "Gaussian Process surrogate with acquisition functions for sample-efficient optimization",
      formula: "EI(x) = (f_best - μ(x))Φ(z) + σ(x)φ(z); z = (f_best - μ)/σ",
      reference: "Jones et al. (1998) EGO; Snoek et al. (2012)",
      safety_class: "informational",
      domain: "optimization",
      inputs: { X_observed: "Past experiments", y_observed: "Past outcomes", dimensions: "Parameter count" },
      outputs: { next_point: "Suggested next experiment", expected_improvement: "EI at next point", model_quality: "LOO R²" },
    };
  }
}
