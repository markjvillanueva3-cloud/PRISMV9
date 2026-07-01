/**
 * GaussianMixtureModel — soft (probabilistic) clustering by fitting a mixture of
 * k diagonal-covariance Gaussians via Expectation-Maximization.
 *
 *   E-step: r_ic = π_c N(x_i | μ_c, Σ_c) / Σ_c' π_c' N(x_i | μ_c', Σ_c')
 *   M-step: N_c = Σ_i r_ic ; π_c = N_c/n ; μ_c = Σ_i r_ic x_i / N_c ;
 *           σ²_c,j = Σ_i r_ic (x_ij − μ_cj)² / N_c   (floored)
 *   iterate until the data log-likelihood Σ_i log Σ_c π_c N(x_i|θ_c) converges.
 *
 * Completes the clustering family alongside the hard/density/supervised variants
 * already shipped this milestone (`ml_kmedoids`, `ml_dbscan`, `ml_knn`): GMM gives
 * each point a *soft membership* + a generative density, useful when clusters
 * overlap (mixed material regimes, blended tool-wear states, telemetry mode
 * mixtures) and when you want per-point cluster confidence rather than a hard label.
 *
 * Numerically hardened (math-expert discipline): responsibilities normalized with
 * the log-sum-exp trick (no underflow on well-separated data), a variance floor
 * prevents singular collapse, deterministic seeded init for reproducibility.
 * Diagonal covariance (per-feature variance) keeps it inversion-free and stable.
 *
 * Why NEW (grep 2026-05-29): no GMM / mixture / EM primitive exists in the
 * 123-file algorithms/ directory.
 *
 * @module algorithms/GaussianMixtureModel
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — probabilistic clustering
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface GMMInput {
  /** Data matrix [n × d]. */
  data: number[][];
  /** Number of mixture components k (≤ n). */
  k: number;
  /** EM iteration cap (default 100). */
  maxIter?: number;
  /** Log-likelihood convergence tolerance (default 1e-6). */
  tol?: number;
  /** Deterministic init seed (default 1). */
  seed?: number;
  /** Minimum per-feature variance to avoid singular components (default 1e-6). */
  varianceFloor?: number;
}

export interface GMMOutput {
  /** Mixture weights π (length k, sum 1). */
  weights: number[];
  /** Component means [k × d]. */
  means: number[][];
  /** Component diagonal variances [k × d]. */
  variances: number[][];
  /** Soft responsibilities [n × k] (each row sums to 1). */
  responsibilities: number[][];
  /** Hard labels = argmax responsibility (length n). */
  labels: number[];
  /** Final data log-likelihood. */
  logLikelihood: number;
  iterations: number;
  converged: boolean;
  k: number;
  nSamples: number;
  nFeatures: number;
  warnings: string[];
}

const DEFAULT_MAX_ITER = 100;
const DEFAULT_TOL = 1e-6;
const DEFAULT_VAR_FLOOR = 1e-6;
const LOG_2PI = Math.log(2 * Math.PI);

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

/** log N(x | μ, diag(σ²)) for a d-dim point. */
function logGaussian(x: number[], mean: number[], variance: number[]): number {
  let s = 0;
  for (let j = 0; j < x.length; j++) {
    const v = variance[j];
    const diff = x[j] - mean[j];
    s += -0.5 * (LOG_2PI + Math.log(v)) - (diff * diff) / (2 * v);
  }
  return s;
}

/** Deterministic distinct index picks via LCG. */
function seededInitIndices(n: number, k: number, seed: number): number[] {
  let s = (seed * 2654435761 + 1) & 0x7fffffff;
  const chosen = new Set<number>();
  const order: number[] = [];
  // try random picks; fall back to sequential fill to guarantee k distinct
  let guard = 0;
  while (chosen.size < k && guard < n * 10) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % n;
    if (!chosen.has(idx)) { chosen.add(idx); order.push(idx); }
    guard++;
  }
  for (let i = 0; i < n && chosen.size < k; i++) {
    if (!chosen.has(i)) { chosen.add(i); order.push(i); }
  }
  return order.slice(0, k);
}

export const GaussianMixtureModel: Algorithm<GMMInput, GMMOutput> = {
  validate(input: GMMInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { data, k } = input ?? ({} as GMMInput);

    if (!isMatrix(data)) {
      issues.push({ field: "data", message: "data must be a non-empty [n × d] matrix.", severity: "error" });
    } else {
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (!isFiniteNumber(data[i][j])) {
            issues.push({ field: `data[${i}][${j}]`, message: "data values must be finite.", severity: "error" });
            break;
          }
        }
      }
    }
    if (!Number.isInteger(k) || k < 1) {
      issues.push({ field: "k", message: "k must be an integer ≥ 1.", severity: "error" });
    } else if (isMatrix(data) && k > data.length) {
      issues.push({ field: "k", message: `k ${k} > n ${data.length} samples.`, severity: "error" });
    }
    if (input?.maxIter !== undefined && (!Number.isInteger(input.maxIter) || input.maxIter < 1)) {
      issues.push({ field: "maxIter", message: "maxIter must be an integer ≥ 1.", severity: "error" });
    }
    if (input?.tol !== undefined && (!isFiniteNumber(input.tol) || input.tol <= 0)) {
      issues.push({ field: "tol", message: "tol must be a positive finite number.", severity: "error" });
    }
    if (input?.varianceFloor !== undefined && (!isFiniteNumber(input.varianceFloor) || input.varianceFloor <= 0)) {
      issues.push({ field: "varianceFloor", message: "varianceFloor must be a positive finite number.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: GMMInput): GMMOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`GaussianMixtureModel: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const data = input.data;
    const n = data.length;
    const d = data[0].length;
    const k = input.k;
    const maxIter = input.maxIter ?? DEFAULT_MAX_ITER;
    const tol = input.tol ?? DEFAULT_TOL;
    const seed = input.seed ?? 1;
    const varFloor = input.varianceFloor ?? DEFAULT_VAR_FLOOR;

    // global per-dim variance for init
    const globalMean = new Array<number>(d).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) globalMean[j] += data[i][j];
    for (let j = 0; j < d; j++) globalMean[j] /= n;
    const globalVar = new Array<number>(d).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) { const c = data[i][j] - globalMean[j]; globalVar[j] += c * c; }
    for (let j = 0; j < d; j++) globalVar[j] = Math.max(globalVar[j] / n, varFloor);

    // init: means = seeded distinct points; weights uniform; variances = global
    const initIdx = seededInitIndices(n, k, seed);
    const weights = new Array<number>(k).fill(1 / k);
    const means = initIdx.map((idx) => data[idx].slice());
    const variances = Array.from({ length: k }, () => globalVar.slice());
    const resp: number[][] = Array.from({ length: n }, () => new Array<number>(k).fill(0));

    let prevLL = -Infinity;
    let logLikelihood = -Infinity;
    let iter = 0;
    let converged = false;

    for (; iter < maxIter; iter++) {
      // ─ E-step + log-likelihood (log-sum-exp) ─
      logLikelihood = 0;
      for (let i = 0; i < n; i++) {
        const logr = new Array<number>(k);
        let maxLog = -Infinity;
        for (let c = 0; c < k; c++) {
          logr[c] = Math.log(weights[c]) + logGaussian(data[i], means[c], variances[c]);
          if (logr[c] > maxLog) maxLog = logr[c];
        }
        let sumExp = 0;
        for (let c = 0; c < k; c++) sumExp += Math.exp(logr[c] - maxLog);
        const lse = maxLog + Math.log(sumExp);
        logLikelihood += lse;
        for (let c = 0; c < k; c++) resp[i][c] = Math.exp(logr[c] - lse);
      }

      // ─ convergence on log-likelihood ─
      if (iter > 0 && Math.abs(logLikelihood - prevLL) < tol) { converged = true; iter++; break; }
      prevLL = logLikelihood;

      // ─ M-step ─
      for (let c = 0; c < k; c++) {
        let Nc = 0;
        for (let i = 0; i < n; i++) Nc += resp[i][c];
        if (Nc < 1e-300) { warnings.push(`component ${c} collapsed (no responsibility) — kept at prior parameters.`); continue; }
        weights[c] = Nc / n;
        const mu = new Array<number>(d).fill(0);
        for (let i = 0; i < n; i++) { const r = resp[i][c]; for (let j = 0; j < d; j++) mu[j] += r * data[i][j]; }
        for (let j = 0; j < d; j++) mu[j] /= Nc;
        const va = new Array<number>(d).fill(0);
        for (let i = 0; i < n; i++) { const r = resp[i][c]; for (let j = 0; j < d; j++) { const diff = data[i][j] - mu[j]; va[j] += r * diff * diff; } }
        for (let j = 0; j < d; j++) va[j] = Math.max(va[j] / Nc, varFloor);
        means[c] = mu;
        variances[c] = va;
      }
    }

    if (!converged) warnings.push(`EM did not converge within ${maxIter} iterations (Δlog-likelihood ≥ tol).`);

    // hard labels = argmax responsibility
    const labels = resp.map((row) => {
      let best = 0, bestV = -Infinity;
      for (let c = 0; c < k; c++) if (row[c] > bestV) { bestV = row[c]; best = c; }
      return best;
    });

    return {
      weights, means, variances, responsibilities: resp, labels,
      logLikelihood, iterations: iter, converged,
      k, nSamples: n, nFeatures: d, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "gaussian_mixture_model",
      name: "Gaussian Mixture Model (EM, diagonal covariance)",
      version: "1.0.0",
      domain: "ml",
      category: "clustering",
      description:
        "Soft probabilistic clustering by fitting k diagonal-covariance Gaussians via Expectation-Maximization. Returns weights, means, variances, per-point soft responsibilities, and a generative log-likelihood. Log-sum-exp stable, variance-floored.",
      equation_plain: "r_ic = π_c N(x_i|μ_c,Σ_c) / Σ_c' π_c' N(...); μ_c = Σ_i r_ic x_i / Σ_i r_ic; iterate (EM)",
      assumptions: [
        "Diagonal covariance (features conditionally independent within a component).",
        "k known a priori; data roughly Gaussian per component.",
      ],
      limitations: [
        "EM converges to a local optimum — seed-dependent on overlapping/poorly-separated data.",
        "Diagonal covariance can't model correlated features (use full-cov GMM upstream if needed).",
      ],
      reference: "Dempster, A.P., Laird, N.M., Rubin, D.B. (1977). Maximum Likelihood from Incomplete Data via the EM Algorithm. J. Royal Statistical Society B.",
      inputs: {
        data: { type: "number[][]", description: "[n × d] sample matrix" },
        k: { type: "number", description: "number of mixture components (≤ n)" },
        maxIter: { type: "number", description: "EM iteration cap" },
        tol: { type: "number", description: "log-likelihood convergence tolerance" },
        seed: { type: "number", description: "deterministic init seed" },
      },
      outputs: {
        weights: { type: "number[]", description: "mixture weights" },
        means: { type: "number[][]", description: "k×d component means" },
        responsibilities: { type: "number[][]", description: "n×k soft memberships" },
        labels: { type: "number[]", description: "hard argmax labels" },
      },
      last_validated: "2026-05-29",
    };
  },
};
