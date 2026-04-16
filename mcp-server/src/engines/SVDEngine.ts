/**
 * SVDEngine — Singular Value Decomposition
 *
 * Computes the thin SVD: A = U * diag(sigma) * V^T for arbitrary m×n matrices.
 * Implementation: One-sided Jacobi SVD — robust, self-correcting, ideal for
 * manufacturing-sized matrices (1×1 to ~1000×1000).
 *
 * Capabilities:
 *   - Full SVD for dense matrices (any m×n)
 *   - Truncated SVD (rank-k approximation)
 *   - Condition number estimation (sigma_max / sigma_min)
 *   - Pseudo-inverse via SVD (A+ = V * diag(1/sigma) * U^T)
 *   - Numerical rank determination with tolerance
 *   - Low-rank approximation (Eckart-Young theorem)
 *   - Least-squares solver (overdetermined, underdetermined, rank-deficient)
 *
 * Used by: PCA (process monitoring), least-squares (Kienzle/Taylor regression),
 *   system identification, FEM conditioning, sensor fusion.
 *
 * Reference: Demmel & Veselic (1992), Jacobi's method is more accurate than QR.
 *
 * @engine SVDEngine
 * @milestone SCIMATH-MS0
 * @unit P0-U01
 * @courses MIT 18.06, MIT 18.065
 */

// ============================================================================
// TYPES
// ============================================================================

/** Result of SVD decomposition A = U * diag(sigma) * V^T */
export interface SVDResult {
  /** Left singular vectors (m × k) stored row-major */
  U: number[][];
  /** Singular values in descending order (length k where k = min(m,n)) */
  sigma: number[];
  /** Right singular vectors (n × k) stored row-major — columns are right singular vectors */
  V: number[][];
  /** Numerical rank (count of sigma > tolerance) */
  rank: number;
  /** Condition number: sigma[0] / sigma[rank-1], or Infinity if rank=0 */
  conditionNumber: number;
}

/** Options for SVD computation */
export interface SVDOptions {
  /** Maximum Jacobi sweeps (default 100) */
  maxSweeps?: number;
  /** Convergence tolerance: stop when off-diagonal energy < tol * diagonal energy (default 1e-14) */
  tolerance?: number;
  /** If set, return only the top-k singular triplets (truncated SVD) */
  truncateK?: number;
  /** Tolerance for rank determination (default: max(m,n) * eps * sigma[0]) */
  rankTolerance?: number;
}

/** Result of pseudo-inverse computation */
export interface PseudoInverseResult {
  /** The pseudo-inverse matrix (n × m) */
  matrix: number[][];
  /** Effective rank used */
  rank: number;
  /** Singular values that were inverted (above tolerance) */
  sigmaUsed: number[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

import { EPS_MACHINE, EPS_SVD } from "../physics/constants.js";
const EPS = EPS_MACHINE;
const DEFAULT_MAX_SWEEPS = 100;
const DEFAULT_TOL = EPS_SVD;

// ============================================================================
// MATRIX HELPERS
// ============================================================================

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function identity(n: number): number[][] {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T = zeros(n, m);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      T[j][i] = A[i][j];
  return T;
}

function copyMatrix(A: number[][]): number[][] {
  return A.map(row => row.slice());
}

function columnNorm(A: number[][], col: number): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) s += A[i][col] * A[i][col];
  return Math.sqrt(s);
}

function columnDot(A: number[][], c1: number, c2: number): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) s += A[i][c1] * A[i][c2];
  return s;
}

// ============================================================================
// ONE-SIDED JACOBI SVD
// ============================================================================

/**
 * One-sided Jacobi SVD: iteratively apply Givens rotations to columns of A
 * until A^T*A is diagonal. Then column norms = singular values,
 * normalized columns = U, accumulated rotations = V.
 *
 * For m×n with m >= n:
 *   1. W = copy(A), V = I_n
 *   2. For each column pair (i,j), compute Jacobi rotation that zeroes (A^TA)_{ij}
 *   3. Apply rotation to columns i,j of W and V
 *   4. Repeat until convergence
 *   5. sigma[k] = ||W[:,k]||, U[:,k] = W[:,k] / sigma[k], V accumulated
 */
function jacobiSVD(
  A: number[][],
  maxSweeps: number,
  tol: number
): { U: number[][]; sigma: number[]; V: number[][] } {
  const m = A.length;
  const n = A[0].length;

  // Work on a copy
  const W = copyMatrix(A);
  const V = identity(n);

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    // Check convergence: off-diagonal energy of W^T*W
    let offDiag = 0, diag = 0;
    for (let i = 0; i < n; i++) {
      diag += columnDot(W, i, i);
      for (let j = i + 1; j < n; j++) {
        const wij = columnDot(W, i, j);
        offDiag += 2 * wij * wij;
      }
    }
    if (offDiag <= tol * tol * diag) break;

    // Sweep: apply Jacobi rotation for each pair (i,j)
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const aii = columnDot(W, i, i);
        const ajj = columnDot(W, j, j);
        const aij = columnDot(W, i, j);

        // Skip if already nearly zero
        if (Math.abs(aij) < EPS * Math.sqrt(aii * ajj)) continue;

        // Compute Jacobi rotation angle
        const tau = (ajj - aii) / (2 * aij);
        const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        // Apply rotation to columns i,j of W
        for (let r = 0; r < m; r++) {
          const wi = W[r][i], wj = W[r][j];
          W[r][i] = c * wi - s * wj;
          W[r][j] = s * wi + c * wj;
        }

        // Accumulate into V
        for (let r = 0; r < n; r++) {
          const vi = V[r][i], vj = V[r][j];
          V[r][i] = c * vi - s * vj;
          V[r][j] = s * vi + c * vj;
        }
      }
    }
  }

  // Extract singular values (column norms of W) and left singular vectors (normalized columns)
  const sigma = new Array(n);
  const U = zeros(m, n);
  for (let j = 0; j < n; j++) {
    sigma[j] = columnNorm(W, j);
    if (sigma[j] > EPS) {
      for (let i = 0; i < m; i++) U[i][j] = W[i][j] / sigma[j];
    } else {
      // Zero singular value: set U column to zero
      sigma[j] = 0;
    }
  }

  // Sort by descending singular value
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => sigma[b] - sigma[a]);
  const sortedSigma = indices.map(i => sigma[i]);
  const sortedU = zeros(m, n);
  const sortedV = zeros(n, n);
  for (let j = 0; j < n; j++) {
    const src = indices[j];
    for (let i = 0; i < m; i++) sortedU[i][j] = U[i][src];
    for (let i = 0; i < n; i++) sortedV[i][j] = V[i][src];
  }

  return { U: sortedU, sigma: sortedSigma, V: sortedV };
}

// ============================================================================
// SVD ENGINE CLASS
// ============================================================================

export class SVDEngine {

  /**
   * Compute the Singular Value Decomposition: A = U * diag(sigma) * V^T
   *
   * @param A Input matrix (m×n), arbitrary dimensions
   * @param options SVD computation options
   * @returns SVDResult with U, sigma, V, rank, conditionNumber
   */
  static decompose(A: number[][], options: SVDOptions = {}): SVDResult {
    const maxSweeps = options.maxSweeps ?? DEFAULT_MAX_SWEEPS;
    const tol = options.tolerance ?? DEFAULT_TOL;
    const m = A.length;
    if (m === 0) throw new Error("SVD: empty matrix");
    const n = A[0].length;
    if (n === 0) throw new Error("SVD: empty matrix");

    let U: number[][], sigma: number[], V: number[][];

    if (m >= n) {
      // Standard case: m >= n
      ({ U, sigma, V } = jacobiSVD(A, maxSweeps, tol));
    } else {
      // Wide matrix: decompose A^T, swap U and V
      const At = transpose(A);
      const result = jacobiSVD(At, maxSweeps, tol);
      U = result.V;  // swap
      sigma = result.sigma;
      V = result.U;  // swap
      // Trim U to m columns, V to m columns (thin SVD)
      U = U.map(row => row.slice(0, m));
      sigma = sigma.slice(0, m);
      V = V.map(row => row.slice(0, m));
    }

    const k = sigma.length;

    // Determine rank
    const sigmaMax = k > 0 ? sigma[0] : 0;
    const rankTol = options.rankTolerance ?? (Math.max(m, n) * EPS * sigmaMax);
    let rank = 0;
    for (let i = 0; i < k; i++) {
      if (sigma[i] > rankTol) rank++;
      else break;
    }

    const condNum = rank > 0 ? sigma[0] / sigma[rank - 1] : Infinity;

    // Truncate if requested
    const truncK = options.truncateK;
    if (truncK !== undefined && truncK < k) {
      sigma = sigma.slice(0, truncK);
      U = U.map(row => row.slice(0, truncK));
      V = V.map(row => row.slice(0, truncK));
    }

    return { U, sigma, V, rank, conditionNumber: condNum };
  }

  /**
   * Compute the Moore-Penrose pseudo-inverse: A+ = V * diag(1/sigma) * U^T
   * Only inverts singular values above the rank tolerance.
   *
   * @param A Input matrix (m×n)
   * @param options SVD options (rankTolerance controls which sigmas are inverted)
   * @returns PseudoInverseResult with matrix, rank, sigmaUsed
   */
  static pseudoInverse(A: number[][], options: SVDOptions = {}): PseudoInverseResult {
    const { U, sigma, V, rank } = SVDEngine.decompose(A, options);
    const m = A.length;
    const n = A[0].length;

    // A+ = V * diag(1/sigma_i for i < rank) * U^T
    const result = zeros(n, m);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < Math.min(rank, sigma.length); k++) {
          if (sigma[k] > EPS) {
            sum += V[i][k] * (1 / sigma[k]) * U[j][k];
          }
        }
        result[i][j] = sum;
      }
    }

    return { matrix: result, rank, sigmaUsed: sigma.slice(0, rank) };
  }

  /**
   * Best rank-k approximation via truncated SVD (Eckart-Young theorem).
   * Minimizes ||A - A_k||_F over all rank-k matrices.
   *
   * @param A Input matrix
   * @param k Target rank
   * @returns Approximation matrix and Frobenius error
   */
  static lowRankApprox(A: number[][], k: number): { matrix: number[][]; frobenius_error: number } {
    const full = SVDEngine.decompose(A);
    const m = A.length, n = A[0].length;
    const actualK = Math.min(k, full.sigma.length);

    // A_k = sum_{i=0}^{k-1} sigma[i] * U[:,i] * V[:,i]^T
    const result = zeros(m, n);
    for (let r = 0; r < actualK; r++) {
      const s = full.sigma[r];
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          result[i][j] += s * full.U[i][r] * full.V[j][r];
        }
      }
    }

    // Error = sqrt(sum of sigma[k:]^2)
    let errSq = 0;
    for (let i = actualK; i < full.sigma.length; i++) {
      errSq += full.sigma[i] * full.sigma[i];
    }

    return { matrix: result, frobenius_error: Math.sqrt(errSq) };
  }

  /**
   * Solve least-squares: min ||Ax - b||_2 via SVD.
   * Works for overdetermined, underdetermined, and rank-deficient systems.
   *
   * @param A Coefficient matrix (m×n)
   * @param b Right-hand side vector (length m)
   * @returns Solution x, residual norm, and rank
   */
  static leastSquares(A: number[][], b: number[]): { x: number[]; residualNorm: number; rank: number } {
    const { matrix: Aplus, rank } = SVDEngine.pseudoInverse(A);
    const m = A.length, n = A[0].length;

    // x = A+ * b
    const x = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        x[i] += Aplus[i][j] * b[j];
      }
    }

    // Residual = ||Ax - b||_2
    let residSq = 0;
    for (let i = 0; i < m; i++) {
      let ax = 0;
      for (let j = 0; j < n; j++) ax += A[i][j] * x[j];
      residSq += (ax - b[i]) ** 2;
    }

    return { x, residualNorm: Math.sqrt(residSq), rank };
  }

  /**
   * Condition number of matrix A: sigma_max / sigma_min.
   * Near 1 = well-conditioned. > 10^12 = ill-conditioned (warn user).
   *
   * @param A Input matrix
   * @returns Condition number, rank, and extreme singular values
   */
  static conditionNumber(A: number[][]): { conditionNumber: number; rank: number; sigmaMax: number; sigmaMin: number } {
    const { sigma, rank, conditionNumber: cn } = SVDEngine.decompose(A);
    return {
      conditionNumber: cn,
      rank,
      sigmaMax: sigma[0] ?? 0,
      sigmaMin: rank > 0 ? sigma[rank - 1] : 0,
    };
  }

  /**
   * Numerical rank: count of singular values above tolerance.
   *
   * @param A Input matrix
   * @param tolerance Custom tolerance (default: max(m,n) * eps * sigma_max)
   * @returns Numerical rank
   */
  static numericalRank(A: number[][], tolerance?: number): number {
    return SVDEngine.decompose(A, { rankTolerance: tolerance }).rank;
  }
}

// Singleton for backward compatibility
export const svdEngine = new SVDEngine();
