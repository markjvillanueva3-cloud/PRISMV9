/**
 * PrincipalComponentEngine — Principal Component Analysis
 *
 * Models: SVD-backed PCA, kernel PCA (RBF/polynomial/linear),
 *         incremental PCA (streaming), robust PCA (principal component pursuit)
 *
 * Upgrade: SCIMATH-MS0 P3-U02 — replaced ad-hoc power iteration with SVDEngine
 *          for numerical stability; added kernel/incremental/robust variants.
 *
 * References:
 *   - Jolliffe, "Principal Component Analysis" 2nd ed. (2002)
 *   - Schölkopf, Smola, Müller (1998) "Nonlinear Component Analysis as a Kernel Eigenvalue Problem"
 *   - Ross, Lim, Lin, Yang (2008) "Incremental Learning for Robust Visual Tracking"
 *   - Candès, Li, Ma, Wright (2011) "Robust Principal Component Analysis?"
 *
 * @engine PrincipalComponentEngine
 * @milestone SCIMATH-MS0
 * @unit P3-U02
 */

import { SVDEngine } from "./SVDEngine.js";
import { EigensolverEngine } from "./EigensolverEngine.js";
import { EPS_RANK } from "../physics/constants.js";

// ============================================================================
// INTERFACES
// ============================================================================

export interface PrincipalComponentInput {
  data: number[][];                    // rows = observations, cols = variables
  num_components?: number;             // default all
  standardize?: boolean;               // default true
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PrincipalComponentResult {
  num_components_retained: AtomicValue;
  total_variance_explained_pct: AtomicValue;
  first_pc_variance_pct: AtomicValue;
  second_pc_variance_pct: AtomicValue;
  kaiser_components: AtomicValue;
  condition_number: AtomicValue;
  num_variables: AtomicValue;
  num_observations: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

/** Full PCA result with loadings and scores */
export interface SVDPCAResult {
  /** Eigenvalues of covariance matrix (descending) */
  eigenvalues: number[];
  /** Loadings: right singular vectors V (p × k), columns = principal directions */
  loadings: number[][];
  /** Scores: U * diag(sigma) (n × k), projected data */
  scores: number[][];
  /** Fraction of total variance explained by each component */
  explainedVarianceRatio: number[];
  /** Cumulative variance explained */
  cumulativeVariance: number[];
  /** Condition number sigma_max / sigma_min */
  conditionNumber: number;
}

/** Kernel PCA options */
export interface KernelPCAOptions {
  /** Kernel type (default: "rbf") */
  kernel?: "rbf" | "polynomial" | "linear";
  /** RBF gamma: K(x,y) = exp(-gamma * ||x-y||²). Default: 1/p */
  gamma?: number;
  /** Polynomial degree. Default: 3 */
  degree?: number;
  /** Number of components to retain. Default: min(n, 10) */
  num_components?: number;
}

/** Kernel PCA result */
export interface KernelPCAResult {
  /** Eigenvalues of centered kernel matrix (descending) */
  eigenvalues: number[];
  /** Alpha coefficients: eigenvectors scaled by 1/sqrt(eigenvalue). Shape n × k */
  alphas: number[][];
  /** Fraction of total variance explained per component */
  explainedVarianceRatio: number[];
}

/** Incremental PCA state — carry between batches for streaming */
export interface IncrementalPCAState {
  /** Running column mean */
  mean: number[];
  /** Principal directions, each a p-dimensional vector */
  components: number[][];
  /** Singular values corresponding to each component */
  singularValues: number[];
  /** Total observations processed */
  nSamplesSeen: number;
  /** Estimated variance explained per component */
  explainedVariance: number[];
}

/** Robust PCA result (Principal Component Pursuit) */
export interface RobustPCAResult {
  /** Low-rank component L */
  lowRank: number[][];
  /** Sparse outlier component S */
  sparse: number[][];
  /** Estimated rank of L */
  rank: number;
  /** Fraction of non-zero entries in S */
  sparsity: number;
  /** ADMM iterations used */
  iterations: number;
  /** Whether convergence was achieved */
  converged: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

function columnMeans(data: number[][]): number[] {
  const n = data.length;
  const p = data[0].length;
  const means = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) means[j] += data[i][j];
    means[j] /= n;
  }
  return means;
}

function columnStds(data: number[][], means: number[]): number[] {
  const n = data.length;
  const p = means.length;
  const stds = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (data[i][j] - means[j]) ** 2;
    stds[j] = Math.sqrt(ss / n) || 1;
  }
  return stds;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PrincipalComponentEngine {

  /**
   * Standard PCA — backward-compatible interface.
   * Internally uses SVDEngine for numerical stability (replaces power iteration).
   *
   * @param input Data matrix and options
   * @returns PrincipalComponentResult with AtomicValue fields
   */
  calculate(input: PrincipalComponentInput): PrincipalComponentResult {
    const { data, standardize = true } = input;
    const recs: string[] = [];
    const n = data.length;
    const p = data[0]?.length ?? 0;
    if (n === 0 || p === 0) {
      return {
        num_components_retained: mkAv(0, "count", 0, "svd", "Empty data"),
        total_variance_explained_pct: mkAv(0, "%", 0, "svd"),
        first_pc_variance_pct: mkAv(0, "%", 0, "svd"),
        second_pc_variance_pct: mkAv(0, "%", 0, "svd"),
        kaiser_components: mkAv(0, "count", 0, "kaiser_criterion"),
        condition_number: mkAv(0, "ratio", 0, "svd_condition"),
        num_variables: mkAv(p, "count", 0, "input"),
        num_observations: mkAv(n, "count", 0, "input"),
        is_safe: false,
        recommendations: ["Empty or zero-dimension data — PCA not possible"],
      };
    }
    const k = input.num_components ?? p;

    const means = columnMeans(data);
    const stds = standardize ? columnStds(data, means) : new Array(p).fill(1);

    // Center and standardize
    const X: number[][] = data.map(row =>
      row.map((val, j) => (val - means[j]) / stds[j])
    );

    // SVD of centered data — eigenvalues of covariance = sigma² / n
    // NOTE: Uses population variance (÷n), matching the original power-iteration implementation.
    // For sample variance, use ÷(n-1). Ratios and rankings are unaffected by this choice.
    const svd = SVDEngine.decompose(X, { truncateK: Math.min(k, p) });
    const eigenvalues = svd.sigma.map(s => (s * s) / n);

    const totalVar = eigenvalues.reduce((s, e) => s + e, 0);
    const pc1Pct = totalVar > 0 ? (eigenvalues[0] / totalVar) * 100 : 0;
    const pc2Pct = eigenvalues.length > 1 && totalVar > 0 ? (eigenvalues[1] / totalVar) * 100 : 0;

    const kaiserK = standardize
      ? eigenvalues.filter(e => e > 1).length
      : eigenvalues.filter(e => e > totalVar / p).length;

    const retainedK = Math.min(k, eigenvalues.length);
    const cumVar = eigenvalues.slice(0, retainedK).reduce((s, e) => s + e, 0);
    const cumPct = totalVar > 0 ? (cumVar / totalVar) * 100 : 0;

    const maxEig = eigenvalues[0] || 1;
    const minEig = eigenvalues[eigenvalues.length - 1] || 0.001;
    const condNum = maxEig / Math.max(minEig, EPS_RANK);

    const isSafe = n > p && p >= 2 && eigenvalues[0] > 0;

    if (n < p) recs.push(`More variables (${p}) than observations (${n}) — results unstable`);
    if (pc1Pct > 90) recs.push(`PC1 explains ${pc1Pct.toFixed(0)}% — data nearly 1-dimensional`);
    if (kaiserK < p * 0.3) recs.push(`Kaiser suggests ${kaiserK}/${p} components — significant reduction possible`);
    if (condNum > 1000) recs.push(`High condition number ${condNum.toFixed(0)} — multicollinearity present`);
    if (recs.length === 0) recs.push(`PCA — ${kaiserK} Kaiser components, PC1=${pc1Pct.toFixed(0)}%, PC2=${pc2Pct.toFixed(0)}%`);

    return {
      num_components_retained: mkAv(retainedK, "count", 0, "svd"),
      total_variance_explained_pct: mkAv(Math.round(cumPct * 10) / 10, "%", cumPct * 0.02, "svd"),
      first_pc_variance_pct: mkAv(Math.round(pc1Pct * 10) / 10, "%", pc1Pct * 0.05, "svd"),
      second_pc_variance_pct: mkAv(Math.round(pc2Pct * 10) / 10, "%", pc2Pct * 0.05, "svd"),
      kaiser_components: mkAv(kaiserK, "count", 0, "kaiser_criterion"),
      condition_number: mkAv(Math.round(condNum * 10) / 10, "ratio", condNum * 0.10, "svd_condition"),
      num_variables: mkAv(p, "count", 0, "input"),
      num_observations: mkAv(n, "count", 0, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }

  /**
   * Full SVD-backed PCA returning loadings, scores, and explained variance.
   *
   * @param data Data matrix (n observations × p variables)
   * @param options num_components, standardize
   * @returns SVDPCAResult with eigenvalues, loadings, scores
   */
  static svdPCA(
    data: number[][],
    options: { num_components?: number; standardize?: boolean } = {}
  ): SVDPCAResult {
    const n = data.length;
    const p = data[0].length;
    const k = options.num_components ?? Math.min(n, p);
    const standardize = options.standardize ?? false;

    const means = columnMeans(data);
    const stds = standardize ? columnStds(data, means) : new Array(p).fill(1);
    const X = data.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

    const svd = SVDEngine.decompose(X, { truncateK: k });
    // Population variance (÷n). Variance ratios and component rankings are identical for ÷n vs ÷(n-1).
    const eigenvalues = svd.sigma.map(s => (s * s) / n);
    const totalVar = eigenvalues.reduce((s, e) => s + e, 0);
    const ratios = eigenvalues.map(e => totalVar > 0 ? e / totalVar : 0);

    const cumulative: number[] = [];
    let cum = 0;
    for (const r of ratios) { cum += r; cumulative.push(cum); }

    // Scores: U * diag(sigma) (n × k)
    const scores = svd.U.map(row => row.map((u, j) => u * svd.sigma[j]));

    return {
      eigenvalues,
      loadings: svd.V,    // p × k, columns = principal directions
      scores,
      explainedVarianceRatio: ratios,
      cumulativeVariance: cumulative,
      conditionNumber: svd.conditionNumber,
    };
  }

  /**
   * Kernel PCA for nonlinear dimensionality reduction.
   * Maps data to high-dimensional feature space via kernel trick, then extracts
   * principal components.
   *
   * RBF kernel: K(x,y) = exp(-gamma * ||x-y||²)
   * Polynomial kernel: K(x,y) = (x·y + 1)^degree
   * Linear kernel: K(x,y) = x·y
   *
   * Reference: Schölkopf, Smola, Müller (1998)
   *
   * @param data Data matrix (n × p)
   * @param options Kernel type, gamma, degree, num_components
   * @returns KernelPCAResult with eigenvalues and alpha coefficients
   */
  static kernelPCA(data: number[][], options: KernelPCAOptions = {}): KernelPCAResult {
    const n = data.length;
    const p = data[0].length;
    const kernel = options.kernel ?? "rbf";
    const gamma = options.gamma ?? (1 / p);
    const k = options.num_components ?? Math.min(n, 10);

    // Compute kernel matrix K (n × n)
    const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let val: number;
        if (kernel === "rbf") {
          let dist2 = 0;
          for (let d = 0; d < p; d++) dist2 += (data[i][d] - data[j][d]) ** 2;
          val = Math.exp(-gamma * dist2);
        } else if (kernel === "polynomial") {
          let dot = 0;
          for (let d = 0; d < p; d++) dot += data[i][d] * data[j][d];
          val = (dot + 1) ** (options.degree ?? 3);
        } else {
          // linear
          let dot = 0;
          for (let d = 0; d < p; d++) dot += data[i][d] * data[j][d];
          val = dot;
        }
        K[i][j] = val;
        K[j][i] = val;
      }
    }

    // Center kernel in feature space: K_c = HKH, H = I - (1/n)11^T
    // K_c[i][j] = K[i][j] - rowMean[i] - rowMean[j] + totalMean
    const rowMeans = K.map(row => row.reduce((s, v) => s + v, 0) / n);
    const totalMean = rowMeans.reduce((s, v) => s + v, 0) / n;

    const Kc: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        K[i][j] - rowMeans[i] - rowMeans[j] + totalMean
      )
    );

    // Eigendecompose symmetric centered kernel matrix
    const eigen = EigensolverEngine.symmetricQR(Kc, {
      maxIterations: 300,
      tolerance: 1e-10,
    });

    // Keep top k positive eigenvalues
    const posIdx: number[] = [];
    for (let i = 0; i < eigen.eigenvalues.length && posIdx.length < k; i++) {
      if (eigen.eigenvalues[i] > EPS_RANK) posIdx.push(i);
    }

    const eigenvalues = posIdx.map(i => eigen.eigenvalues[i]);
    const totalVar = eigenvalues.reduce((s, e) => s + e, 0);

    // Alpha coefficients: eigenvectors normalized by 1/sqrt(eigenvalue)
    const alphas: number[][] = [];
    for (let row = 0; row < n; row++) {
      const alpha: number[] = [];
      for (const idx of posIdx) {
        alpha.push(eigen.eigenvectors[row][idx] / Math.sqrt(eigen.eigenvalues[idx]));
      }
      alphas.push(alpha);
    }

    return {
      eigenvalues,
      alphas,
      explainedVarianceRatio: eigenvalues.map(e => totalVar > 0 ? e / totalVar : 0),
    };
  }

  /**
   * Incremental PCA for streaming sensor data.
   * Processes data in batches without storing the full dataset.
   * Uses augmented SVD update: [diag(s_old)*V_old^T; X_new_centered; meanCorr] → SVD.
   *
   * Reference: Ross, Lim, Lin, Yang (2008) "Incremental Learning for Robust Visual Tracking"
   *
   * @param state Previous PCA state, or null for first batch
   * @param batch New data batch (m × p)
   * @param options num_components to retain
   * @returns Updated IncrementalPCAState
   */
  static incrementalPCA(
    state: IncrementalPCAState | null,
    batch: number[][],
    options: { num_components?: number } = {}
  ): IncrementalPCAState {
    const m = batch.length;
    const p = batch[0].length;
    const k = options.num_components ?? Math.min(m, p);

    const batchMean = columnMeans(batch);

    if (!state) {
      // First batch — standard SVD PCA
      const centered = batch.map(row => row.map((v, j) => v - batchMean[j]));
      const svd = SVDEngine.decompose(centered, { truncateK: k });

      const numComp = Math.min(k, svd.sigma.length);
      const components: number[][] = [];
      for (let c = 0; c < numComp; c++) {
        components.push(svd.V.map(row => row[c]));
      }

      return {
        mean: batchMean,
        components,
        singularValues: svd.sigma.slice(0, numComp),
        nSamplesSeen: m,
        explainedVariance: svd.sigma.slice(0, numComp).map(s => (s * s) / m),
      };
    }

    // Incremental update
    const nOld = state.nSamplesSeen;
    const nTotal = nOld + m;
    const newMean = state.mean.map((mu, j) =>
      (nOld * mu + m * batchMean[j]) / nTotal
    );

    // Center new data with combined mean
    const centered = batch.map(row => row.map((v, j) => v - newMean[j]));

    // Mean correction vector — accounts for shift in mean
    const meanCorr = state.mean.map((mu, j) =>
      Math.sqrt(nOld * m / nTotal) * (batchMean[j] - mu)
    );

    // Build augmented matrix:
    // [s_i * component_i (each as a p-dim row); centered rows; meanCorr row]
    const kOld = state.singularValues.length;
    const augmented: number[][] = [];

    for (let i = 0; i < kOld; i++) {
      augmented.push(state.components[i].map(v => v * state.singularValues[i]));
    }
    for (const row of centered) {
      augmented.push([...row]);
    }
    augmented.push(meanCorr);

    // SVD of augmented matrix → updated components
    const svd = SVDEngine.decompose(augmented, { truncateK: k });
    const numComp = Math.min(k, svd.sigma.length);

    const components: number[][] = [];
    for (let c = 0; c < numComp; c++) {
      components.push(svd.V.map(row => row[c]));
    }

    return {
      mean: newMean,
      components,
      singularValues: svd.sigma.slice(0, numComp),
      nSamplesSeen: nTotal,
      explainedVariance: svd.sigma.slice(0, numComp).map(s => (s * s) / nTotal),
    };
  }

  /**
   * Robust PCA via Principal Component Pursuit (ADMM).
   * Decomposes X = L + S where L is low-rank and S is sparse (outliers).
   *
   * Uses SVD thresholding for the nuclear norm proximal operator and
   * soft thresholding for the L1 proximal operator.
   *
   * lambda = 1/sqrt(max(n,p)) is the theoretically optimal trade-off.
   *
   * Reference: Candès, Li, Ma, Wright (2011) "Robust Principal Component Analysis?"
   *
   * @param data Data matrix (n × p)
   * @param options lambda, maxIterations, tolerance
   * @returns RobustPCAResult with low-rank and sparse components
   */
  static robustPCA(
    data: number[][],
    options: { lambda?: number; maxIterations?: number; tolerance?: number } = {}
  ): RobustPCAResult {
    const n = data.length;
    const p = data[0].length;
    const lambda = options.lambda ?? 1 / Math.sqrt(Math.max(n, p));
    const maxIter = options.maxIterations ?? 100;
    const tol = options.tolerance ?? 1e-7;

    // mu = n*p / (4 * ||X||_1), standard ADMM penalty
    let norm1 = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < p; j++) norm1 += Math.abs(data[i][j]);
    const mu = (n * p) / (4 * (norm1 || 1));
    const muInv = 1 / mu;

    let S: number[][] = Array.from({ length: n }, () => new Array(p).fill(0));
    let Y: number[][] = Array.from({ length: n }, () => new Array(p).fill(0));
    let L: number[][] = data.map(row => [...row]);
    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      // L-step: SVD thresholding on (X - S + Y/mu)
      const ML: number[][] = data.map((row, i) =>
        row.map((v, j) => v - S[i][j] + Y[i][j] * muInv)
      );
      const svd = SVDEngine.decompose(ML);
      const threshSigma = svd.sigma.map(s => Math.max(s - muInv, 0));
      const rank = threshSigma.filter(s => s > 0).length;

      // Reconstruct L = U * diag(threshSigma) * V^T
      L = Array.from({ length: n }, (_, i) => {
        const row = new Array(p).fill(0);
        for (let r = 0; r < rank; r++) {
          const uir = svd.U[i][r] * threshSigma[r];
          for (let j = 0; j < p; j++) {
            row[j] += uir * svd.V[j][r];
          }
        }
        return row;
      });

      // S-step: soft thresholding on (X - L + Y/mu)
      const thresh = lambda * muInv;
      S = data.map((row, i) =>
        row.map((v, j) => {
          const val = v - L[i][j] + Y[i][j] * muInv;
          return Math.sign(val) * Math.max(Math.abs(val) - thresh, 0);
        })
      );

      // Dual update: Y = Y + mu * (X - L - S)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          Y[i][j] += mu * (data[i][j] - L[i][j] - S[i][j]);
        }
      }

      // Convergence: ||X - L - S||_F / ||X||_F < tol
      let residNorm = 0, dataNorm = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          residNorm += (data[i][j] - L[i][j] - S[i][j]) ** 2;
          dataNorm += data[i][j] ** 2;
        }
      }
      if (Math.sqrt(residNorm) / Math.sqrt(dataNorm || 1) < tol) {
        converged = true;
        iter++;
        break;
      }
    }

    // Final rank and sparsity
    const svdL = SVDEngine.decompose(L);
    const finalRank = svdL.sigma.filter(s => s > EPS_RANK).length;
    let nnzS = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < p; j++) if (Math.abs(S[i][j]) > EPS_RANK) nnzS++;

    return {
      lowRank: L,
      sparse: S,
      rank: finalRank,
      sparsity: nnzS / (n * p),
      iterations: iter,
      converged,
    };
  }
}

export const principalComponentEngine = new PrincipalComponentEngine();
