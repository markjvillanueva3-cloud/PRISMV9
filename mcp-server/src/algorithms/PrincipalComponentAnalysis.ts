/**
 * PrincipalComponentAnalysis — linear dimensionality reduction by projecting
 * mean-centered data onto its top-k directions of maximum variance.
 *
 * The principal axes are the right singular vectors of the centered data matrix:
 *
 *   X_c = X − mean(X)            (n samples × d features, column-centered)
 *   X_c = U · diag(σ) · Vᵀ       (truncated SVD — delegated to LowRankApproximation)
 *   components = Vᵀ rows          (k principal axes, each length d)
 *   scores     = X_c · V = U·diag(σ)   (n × k projection of the samples)
 *   explainedVariance_i      = σ_i² / (n − 1)
 *   explainedVarianceRatio_i = σ_i² / ‖X_c‖²_F
 *
 * This is the canonical feature-compression / denoising / visualization
 * primitive: reduce a high-dimensional telemetry/feature vector to its few
 * dominant modes before clustering (`ml_clustering`/`ml_dbscan`), regression,
 * or GNN feature projection. Composes the truncated-SVD engine
 * (`LowRankApproximation`) rather than re-deriving an eigensolver — algorithm
 * reuse over duplication (tango's prime directive).
 *
 * Optional `scale: true` standardizes each feature to unit variance first
 * (correlation-PCA), so features on different units contribute comparably.
 *
 * Why NEW (grep 2026-05-29): no PCA / principal-component / explained-variance
 * primitive exists in the 120-file algorithms/ directory (TSNE is non-linear).
 *
 * @module algorithms/PrincipalComponentAnalysis
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — ml dimensionality reduction
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";
import { LowRankApproximation } from "./LowRankApproximation.js";

export interface PCAInput {
  /** Data matrix [n samples × d features]. */
  data: number[][];
  /** Number of principal components k (clamped to min(n,d)). */
  components: number;
  /** Subtract per-feature mean before SVD (default true; PCA assumes this). */
  center?: boolean;
  /** Also divide each feature by its std (correlation-PCA; default false). */
  scale?: boolean;
  /** Power-iteration cap forwarded to the SVD (default 200). */
  maxIter?: number;
  /** Deterministic SVD seed (default 1). */
  seed?: number;
}

export interface PCAOutput {
  /** Principal axes: k × d (each row a unit-length direction in feature space). */
  components: number[][];
  /** Singular values of the centered data (descending), length k. */
  singularValues: number[];
  /** Variance captured by each component: σ_i²/(n−1), length k. */
  explainedVariance: number[];
  /** Fraction of total variance per component: σ_i²/‖X_c‖²_F, length k. */
  explainedVarianceRatio: number[];
  /** Cumulative explained-variance ratio, length k. */
  cumulativeRatio: number[];
  /** Sample projections onto the components: n × k. */
  scores: number[][];
  /** Per-feature mean removed (length d; zeros if center=false). */
  mean: number[];
  /** Per-feature scale divisor (length d; ones if scale=false). */
  scale: number[];
  k: number;
  nSamples: number;
  nFeatures: number;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

export const PrincipalComponentAnalysis: Algorithm<PCAInput, PCAOutput> = {
  validate(input: PCAInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { data, components } = input ?? ({} as PCAInput);

    if (!isMatrix(data)) {
      issues.push({ field: "data", message: "data must be a non-empty [n × d] matrix.", severity: "error" });
    } else {
      if (data.length < 2) {
        issues.push({ field: "data", message: "PCA needs ≥2 samples to estimate variance.", severity: "error" });
      }
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (!isFiniteNumber(data[i][j])) {
            issues.push({ field: `data[${i}][${j}]`, message: "data values must be finite.", severity: "error" });
            break;
          }
        }
      }
    }
    if (!Number.isInteger(components) || components < 1) {
      issues.push({ field: "components", message: "components must be an integer ≥ 1.", severity: "error" });
    } else if (isMatrix(data)) {
      const maxK = Math.min(data.length, data[0].length);
      if (components > maxK) {
        issues.push({ field: "components", message: `components ${components} > min(n,d)=${maxK}; will be clamped.`, severity: "warning" });
      }
    }
    if (input?.maxIter !== undefined && (!Number.isInteger(input.maxIter) || input.maxIter < 1)) {
      issues.push({ field: "maxIter", message: "maxIter must be an integer ≥ 1.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: PCAInput): PCAOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`PrincipalComponentAnalysis: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [...(v0.warnings ?? [])];
    const n = input.data.length;
    const d = input.data[0].length;
    const center = input.center !== false; // default true
    const doScale = input.scale === true;
    const k = Math.min(input.components, Math.min(n, d));

    // per-feature mean
    const mean = new Array<number>(d).fill(0);
    if (center) {
      for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) mean[j] += input.data[i][j];
      for (let j = 0; j < d; j++) mean[j] /= n;
    }
    // per-feature scale (population std over centered values) if requested
    const scaleVec = new Array<number>(d).fill(1);
    if (doScale) {
      let zeroVar = 0;
      for (let j = 0; j < d; j++) {
        let s2 = 0;
        for (let i = 0; i < n; i++) { const c = input.data[i][j] - mean[j]; s2 += c * c; }
        const std = Math.sqrt(s2 / n);
        if (std === 0) { scaleVec[j] = 1; zeroVar++; }
        else scaleVec[j] = std;
      }
      if (zeroVar > 0) warnings.push(`${zeroVar} feature(s) have zero variance — left unscaled (divisor 1).`);
    }

    // centered (+scaled) matrix
    const Xc: number[][] = new Array(n);
    for (let i = 0; i < n; i++) {
      const row = new Array<number>(d);
      for (let j = 0; j < d; j++) row[j] = (input.data[i][j] - mean[j]) / scaleVec[j];
      Xc[i] = row;
    }

    // total variance = ‖Xc‖²_F  (Σ σ²)
    let totalSq = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) totalSq += Xc[i][j] * Xc[i][j];

    // delegate the truncated SVD
    const svd = LowRankApproximation.calculate({
      matrix: Xc,
      rank: k,
      maxIter: input.maxIter,
      seed: input.seed,
    });
    if (svd.warnings.length) warnings.push(...svd.warnings.map((w) => `[svd] ${w}`));

    const singularValues = svd.S.slice(0, k);
    // components = Vᵀ rows (V columns are svd.V[c], each length d)
    const components: number[][] = [];
    for (let c = 0; c < k; c++) components.push(svd.V[c].slice());

    const explainedVariance = singularValues.map((s) => (n > 1 ? (s * s) / (n - 1) : 0));
    const explainedVarianceRatio = singularValues.map((s) => (totalSq === 0 ? 0 : (s * s) / totalSq));
    const cumulativeRatio: number[] = [];
    let acc = 0;
    for (const r of explainedVarianceRatio) { acc += r; cumulativeRatio.push(acc); }

    // scores = Xc · V  (n × k); equals U·diag(S) but recompute via V for fidelity
    const scores: number[][] = new Array(n);
    for (let i = 0; i < n; i++) {
      const out = new Array<number>(k).fill(0);
      const xrow = Xc[i];
      for (let c = 0; c < k; c++) {
        const vc = svd.V[c];
        let dot = 0;
        for (let j = 0; j < d; j++) dot += xrow[j] * vc[j];
        out[c] = dot;
      }
      scores[i] = out;
    }

    return {
      components, singularValues, explainedVariance, explainedVarianceRatio, cumulativeRatio,
      scores, mean, scale: scaleVec, k, nSamples: n, nFeatures: d, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "principal_component_analysis",
      name: "Principal Component Analysis (PCA)",
      version: "1.0.0",
      domain: "ml",
      category: "dimensionality-reduction",
      description:
        "Linear dimensionality reduction via truncated SVD of mean-centered (optionally standardized) data. Returns principal axes, sample scores, and explained-variance ratios. Composes LowRankApproximation.",
      equation_plain: "X_c = X − mean; X_c = U·diag(σ)·V^T; components = V^T; scores = X_c·V; EVR_i = σ_i²/‖X_c‖²_F",
      assumptions: [
        "Variance is a meaningful proxy for signal (linear structure).",
        "Centering applied (PCA on the covariance unless scale:true → correlation).",
      ],
      limitations: [
        "Linear only — non-linear manifolds need kernel-PCA / TSNE.",
        "Sensitive to feature scaling unless scale:true.",
      ],
      reference: "Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. Philosophical Magazine; Hotelling (1933).",
      inputs: {
        data: { type: "number[][]", description: "[n × d] sample matrix" },
        components: { type: "number", description: "k principal components (clamped to min(n,d))" },
        center: { type: "boolean", description: "subtract per-feature mean (default true)" },
        scale: { type: "boolean", description: "standardize features (correlation-PCA)" },
      },
      outputs: {
        components: { type: "number[][]", description: "k×d principal axes" },
        explainedVarianceRatio: { type: "number[]", description: "variance fraction per component" },
        scores: { type: "number[][]", description: "n×k projected samples" },
      },
      last_validated: "2026-05-29",
    };
  },
};
