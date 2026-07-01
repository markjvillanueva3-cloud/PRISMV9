/**
 * CholeskyEngine — Cholesky Factorization
 *
 * Computes A = L * L^T for symmetric positive-definite (SPD) matrices.
 * Also supports LDLT for symmetric semi-definite and incomplete Cholesky for preconditioning.
 *
 * Capabilities:
 *   - LL^T factorization for SPD matrices
 *   - LDLT factorization for symmetric (possibly semi-definite) matrices
 *   - Incomplete Cholesky IC(0) for sparse preconditioning
 *   - Positive-definiteness validation before factoring
 *   - Forward/back substitution for L*L^T*x = b systems
 *   - Determinant computation via Cholesky (det = product of L[i][i]^2)
 *
 * Used by: Bayesian posterior covariance, Kalman filter gain, FEM stiffness matrix
 *   solving, Monte Carlo sampling from multivariate normal (L * z where z ~ N(0,I)).
 *
 * Reference: Golub & Van Loan, "Matrix Computations" 4th ed., Chapter 4.2.
 *
 * @engine CholeskyEngine
 * @milestone SCIMATH-MS0
 * @unit P0-U03
 * @courses MIT 18.06, MIT 18.335
 */

// ============================================================================
// TYPES
// ============================================================================

/** Result of Cholesky LL^T decomposition */
export interface CholeskyResult {
  /** Lower triangular factor L such that A = L * L^T */
  L: number[][];
  /** Whether the matrix was SPD */
  isPositiveDefinite: boolean;
}

/** Result of LDLT decomposition */
export interface LDLTResult {
  /** Unit lower triangular L (diagonal = 1) */
  L: number[][];
  /** Diagonal vector d such that A = L * diag(d) * L^T */
  d: number[];
  /** Whether all diagonal entries are positive (SPD) */
  isPositiveDefinite: boolean;
  /** Whether all diagonal entries are non-negative (semi-definite) */
  isPositiveSemiDefinite: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

import { EPS_MACHINE } from "../physics/constants.js";
const EPS = EPS_MACHINE;

// ============================================================================
// CHOLESKY ENGINE
// ============================================================================

export class CholeskyEngine {

  /**
   * Cholesky LL^T factorization: A = L * L^T.
   * A must be symmetric positive-definite.
   *
   * @param A Symmetric positive-definite matrix (n×n)
   * @returns CholeskyResult with L and SPD check
   * @throws Error if matrix is not SPD (negative diagonal encountered)
   */
  static factorize(A: number[][]): CholeskyResult {
    const n = A.length;
    if (n === 0) throw new Error("Cholesky: empty matrix");
    if (A[0].length !== n) throw new Error("Cholesky: matrix must be square");

    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];

        if (i === j) {
          const diag = A[i][i] - sum;
          if (diag <= 0) {
            return { L, isPositiveDefinite: false };
          }
          L[i][j] = Math.sqrt(diag);
        } else {
          L[i][j] = (A[i][j] - sum) / L[j][j];
        }
      }
    }

    return { L, isPositiveDefinite: true };
  }

  /**
   * LDLT factorization: A = L * diag(d) * L^T.
   * L is unit lower triangular (diagonal = 1). Works for symmetric semi-definite.
   *
   * @param A Symmetric matrix (n×n)
   * @returns LDLTResult with L, d, and definiteness checks
   */
  static ldlt(A: number[][]): LDLTResult {
    const n = A.length;
    if (n === 0) throw new Error("LDLT: empty matrix");
    if (A[0].length !== n) throw new Error("LDLT: matrix must be square");

    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const d = new Array(n).fill(0);

    for (let i = 0; i < n; i++) L[i][i] = 1; // unit lower triangular

    for (let j = 0; j < n; j++) {
      // Compute d[j]
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[j][k] * L[j][k] * d[k];
      d[j] = A[j][j] - sum;

      // Compute L[i][j] for i > j
      for (let i = j + 1; i < n; i++) {
        let s = 0;
        for (let k = 0; k < j; k++) s += L[i][k] * d[k] * L[j][k];
        L[i][j] = Math.abs(d[j]) > EPS ? (A[i][j] - s) / d[j] : 0;
      }
    }

    const isPositiveDefinite = d.every(v => v > EPS);
    const isPositiveSemiDefinite = d.every(v => v >= -EPS);

    return { L, d, isPositiveDefinite, isPositiveSemiDefinite };
  }

  /**
   * Incomplete Cholesky IC(0): sparse Cholesky with no fill-in.
   * Only computes entries where the original matrix is nonzero.
   * Used as a preconditioner for iterative solvers (CG, GMRES).
   *
   * @param A Sparse SPD matrix (n×n) — stored as dense for simplicity
   * @returns Lower triangular factor L (same sparsity pattern as lower(A))
   */
  static incompleteCholesky(A: number[][]): CholeskyResult {
    const n = A.length;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        // Only compute if A[i][j] != 0 (IC(0) rule)
        if (Math.abs(A[i][j]) < EPS && i !== j) continue;

        let sum = 0;
        for (let k = 0; k < j; k++) {
          if (L[i][k] !== 0 && L[j][k] !== 0) {
            sum += L[i][k] * L[j][k];
          }
        }

        if (i === j) {
          const diag = A[i][i] - sum;
          if (diag <= 0) {
            return { L, isPositiveDefinite: false };
          }
          L[i][j] = Math.sqrt(diag);
        } else {
          L[i][j] = (A[i][j] - sum) / L[j][j];
        }
      }
    }

    return { L, isPositiveDefinite: true };
  }

  /**
   * Check if a matrix is symmetric positive-definite without full factorization.
   * Attempts Cholesky; returns false on first negative diagonal.
   *
   * @param A Matrix to check
   * @returns true if SPD, false otherwise
   */
  static isPositiveDefinite(A: number[][]): boolean {
    return CholeskyEngine.factorize(A).isPositiveDefinite;
  }

  /**
   * Solve A*x = b where A = L*L^T using forward and back substitution.
   * Requires L from prior Cholesky factorization.
   *
   * @param L Lower triangular Cholesky factor
   * @param b Right-hand side vector
   * @returns Solution vector x
   */
  static solve(L: number[][], b: number[]): number[] {
    const n = L.length;

    // Forward substitution: L * y = b
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
      y[i] = (b[i] - sum) / L[i][i];
    }

    // Back substitution: L^T * x = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j]; // L^T[i][j] = L[j][i]
      x[i] = (y[i] - sum) / L[i][i];
    }

    return x;
  }

  /**
   * Compute determinant via Cholesky: det(A) = (product of L[i][i])^2.
   * Much more stable than cofactor expansion for large matrices.
   *
   * @param A Symmetric positive-definite matrix
   * @returns Determinant value, or 0 if not SPD
   */
  static determinant(A: number[][]): number {
    const { L, isPositiveDefinite } = CholeskyEngine.factorize(A);
    if (!isPositiveDefinite) return 0;

    let logDet = 0;
    for (let i = 0; i < L.length; i++) logDet += Math.log(L[i][i]);
    return Math.exp(2 * logDet); // det = (prod L[i][i])^2
  }

  /**
   * Sample from multivariate normal N(mu, Sigma) using Cholesky.
   * x = mu + L * z where z ~ N(0, I) and Sigma = L * L^T.
   *
   * @param mu Mean vector (length n)
   * @param L Cholesky factor of covariance (n×n lower triangular)
   * @param z Standard normal samples (length n) — caller provides randomness
   * @returns Sample from N(mu, Sigma)
   */
  static sampleMultivariateNormal(mu: number[], L: number[][], z: number[]): number[] {
    const n = mu.length;
    const result = mu.slice();
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        result[i] += L[i][j] * z[j];
      }
    }
    return result;
  }
}

export const choleskyEngine = new CholeskyEngine();
