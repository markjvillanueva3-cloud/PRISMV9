/**
 * EigensolverEngine — Eigenvalue/Eigenvector Computation
 *
 * Multiple algorithms for different matrix types and problem sizes:
 *   - Power iteration: dominant eigenvalue (simple, robust)
 *   - Inverse iteration: eigenvalue nearest a target shift
 *   - QR algorithm: full spectrum for dense symmetric matrices
 *   - Lanczos: large sparse symmetric (FEM modal analysis)
 *   - Generalized eigenvalue: A*x = lambda*B*x (FEM vibration)
 *
 * Used by: FEM modal analysis, PCA (covariance spectrum), chatter stability
 *   (eigenvalue of dynamic system), sensor noise floor (random matrix theory).
 *
 * Reference:
 *   - Golub & Van Loan, "Matrix Computations" 4th ed., Chapters 7-8
 *   - Parlett, "The Symmetric Eigenvalue Problem" (1998)
 *   - Demmel, "Applied Numerical Linear Algebra" (1997)
 *
 * @engine EigensolverEngine
 * @milestone SCIMATH-MS0
 * @unit P0-U04
 * @courses MIT 18.06, MIT 18.065
 */

// ============================================================================
// TYPES
// ============================================================================

/** Single eigenvalue-eigenvector pair */
export interface EigenPair {
  /** Eigenvalue (real part) */
  eigenvalue: number;
  /** Eigenvector (normalized to unit length) */
  eigenvector: number[];
}

/** Result of full eigendecomposition */
export interface EigenResult {
  /** Eigenvalues in descending order of magnitude */
  eigenvalues: number[];
  /** Eigenvectors as columns (row-major: eigenvectors[i][j] = component i of eigenvector j) */
  eigenvectors: number[][];
  /** Number of iterations used */
  iterations: number;
  /** Whether convergence was achieved */
  converged: boolean;
}

/** Result of generalized eigenvalue problem A*x = lambda*B*x */
export interface GeneralizedEigenResult extends EigenResult {
  /** Whether B was successfully factored (SPD check) */
  bFactored: boolean;
}

/** Options for eigenvalue computation */
export interface EigenOptions {
  /** Maximum iterations (default 200) */
  maxIterations?: number;
  /** Convergence tolerance (default 1e-12) */
  tolerance?: number;
  /** Number of eigenvalues to compute (for Lanczos, default: all) */
  numEigenvalues?: number;
  /** Shift for inverse iteration (target eigenvalue) */
  shift?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

import { EPS_MACHINE, EPS_EIGEN } from "../physics/constants.js";
const EPS = EPS_MACHINE;
const DEFAULT_MAX_ITER = 200;
const DEFAULT_TOL = EPS_EIGEN;

// ============================================================================
// MATRIX HELPERS
// ============================================================================

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array(m).fill(0));
}

function identity(n: number): number[][] {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function copyMatrix(A: number[][]): number[][] {
  return A.map(row => row.slice());
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C = zeros(m, n);
  for (let i = 0; i < m; i++)
    for (let k = 0; k < p; k++) {
      const aik = A[i][k];
      for (let j = 0; j < n; j++)
        C[i][j] += aik * B[k][j];
    }
  return C;
}

function matVecMul(A: number[][], x: number[]): number[] {
  const m = A.length;
  const y = new Array(m).fill(0);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < x.length; j++)
      y[i] += A[i][j] * x[j];
  return y;
}

function vecNorm(x: number[]): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s);
}

function vecDot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function vecScale(x: number[], s: number): number[] {
  return x.map(v => v * s);
}

function vecSub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

/** Check if matrix is symmetric within tolerance */
function isSymmetric(A: number[][], tol: number = EPS * 100): boolean {
  const n = A.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.abs(A[i][j] - A[j][i]) > tol * (Math.abs(A[i][j]) + Math.abs(A[j][i]) + 1))
        return false;
  return true;
}

/** Symmetrize a matrix: (A + A^T) / 2 */
function symmetrize(A: number[][]): number[][] {
  const n = A.length;
  const S = zeros(n, n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      S[i][j] = (A[i][j] + A[j][i]) / 2;
  return S;
}

/** Solve (A - shift*I)*x = b via LU with partial pivoting */
function solveShifted(A: number[][], b: number[], shift: number): number[] {
  const n = A.length;
  // Build shifted matrix
  const M = copyMatrix(A);
  for (let i = 0; i < n; i++) M[i][i] -= shift;

  // LU decomposition with partial pivoting
  const perm = Array.from({ length: n }, (_, i) => i);
  const LU = copyMatrix(M);

  for (let k = 0; k < n - 1; k++) {
    // Find pivot
    let maxVal = Math.abs(LU[k][k]), maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(LU[i][k]) > maxVal) { maxVal = Math.abs(LU[i][k]); maxRow = i; }
    }
    if (maxRow !== k) {
      [LU[k], LU[maxRow]] = [LU[maxRow], LU[k]];
      [perm[k], perm[maxRow]] = [perm[maxRow], perm[k]];
    }

    if (Math.abs(LU[k][k]) < EPS) continue; // singular

    for (let i = k + 1; i < n; i++) {
      LU[i][k] /= LU[k][k];
      for (let j = k + 1; j < n; j++) LU[i][j] -= LU[i][k] * LU[k][j];
    }
  }

  // Forward substitution
  const pb = perm.map(i => b[i]);
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = pb[i];
    for (let j = 0; j < i; j++) sum -= LU[i][j] * y[j];
    y[i] = sum;
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) sum -= LU[i][j] * x[j];
    x[i] = Math.abs(LU[i][i]) > EPS ? sum / LU[i][i] : 0;
  }

  return x;
}

// ============================================================================
// HOUSEHOLDER TRIDIAGONALIZATION
// ============================================================================

/**
 * Reduce symmetric A to tridiagonal form T = Q^T * A * Q via Householder.
 * Returns T (stored as diag + subdiag) and accumulated Q.
 * Reference: Golub & Van Loan, Algorithm 8.3.1
 */
function tridiagonalize(A: number[][]): { diag: number[]; subdiag: number[]; Q: number[][] } {
  const n = A.length;
  const T = copyMatrix(A);
  const Q = identity(n);

  for (let k = 0; k < n - 2; k++) {
    // Extract column below diagonal
    const x = new Array(n - k - 1);
    for (let i = k + 1; i < n; i++) x[i - k - 1] = T[i][k];

    const normX = vecNorm(x);
    if (normX < EPS) continue;

    // Householder vector
    const v = x.slice();
    v[0] += Math.sign(x[0] || 1) * normX;
    const normV = vecNorm(v);
    if (normV < EPS) continue;
    for (let i = 0; i < v.length; i++) v[i] /= normV;

    // Apply: T = (I - 2vv^T) * T * (I - 2vv^T)
    // p = 2 * T[k+1:n, k+1:n] * v
    const p = new Array(v.length).fill(0);
    for (let i = 0; i < v.length; i++)
      for (let j = 0; j < v.length; j++)
        p[i] += T[i + k + 1][j + k + 1] * v[j];
    for (let i = 0; i < v.length; i++) p[i] *= 2;

    // K = p - (v^T * p) * v  (Golub & Van Loan, Algorithm 8.3.1)
    // With normalized v (||v||=1), beta=2, so K = 2*S*v - (v^T * 2*S*v) * v
    const vTp = vecDot(v, p);
    const K = new Array(v.length);
    for (let i = 0; i < v.length; i++) K[i] = p[i] - vTp * v[i];

    // T[k+1:n, k+1:n] -= v*K^T + K*v^T
    for (let i = 0; i < v.length; i++)
      for (let j = 0; j < v.length; j++)
        T[i + k + 1][j + k + 1] -= v[i] * K[j] + K[i] * v[j];

    // Fix subdiagonal elements
    T[k + 1][k] = -Math.sign(x[0] || 1) * normX;
    T[k][k + 1] = T[k + 1][k];
    for (let i = k + 2; i < n; i++) { T[i][k] = 0; T[k][i] = 0; }

    // Accumulate Q = Q * (I - 2vv^T)
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < v.length; j++) dot += Q[i][j + k + 1] * v[j];
      dot *= 2;
      for (let j = 0; j < v.length; j++) Q[i][j + k + 1] -= dot * v[j];
    }
  }

  const diag = new Array(n);
  const subdiag = new Array(n - 1);
  for (let i = 0; i < n; i++) diag[i] = T[i][i];
  for (let i = 0; i < n - 1; i++) subdiag[i] = T[i + 1][i];

  return { diag, subdiag, Q };
}

// ============================================================================
// IMPLICIT QR STEP (WILKINSON SHIFT)
// ============================================================================

/**
 * Implicit symmetric QR step with Wilkinson shift on tridiagonal matrix.
 * Operates on diag[lo:hi+1], subdiag[lo:hi] in-place.
 * Also updates eigenvector accumulator Q.
 */
function implicitQRStep(
  diag: number[], subdiag: number[],
  lo: number, hi: number,
  Q: number[][]
): void {
  const n = Q.length;

  // Wilkinson shift: eigenvalue of trailing 2×2 closest to diag[hi]
  const d = (diag[hi - 1] - diag[hi]) / 2;
  const mu = diag[hi] - subdiag[hi - 1] ** 2 /
    (d + Math.sign(d || 1) * Math.sqrt(d * d + subdiag[hi - 1] ** 2));

  let x = diag[lo] - mu;
  let z = subdiag[lo];

  for (let k = lo; k < hi; k++) {
    // Givens rotation to zero z
    let c: number, s: number;
    if (Math.abs(z) < EPS) {
      c = 1; s = 0;
    } else {
      const r = Math.sqrt(x * x + z * z);
      if (r < EPS) { c = 1; s = 0; }
      else { c = x / r; s = z / r; }
    }

    // Apply to tridiagonal
    if (k > lo) subdiag[k - 1] = Math.sqrt(x * x + z * z);

    const d1 = diag[k], d2 = diag[k + 1], e = subdiag[k];
    diag[k] = c * c * d1 + 2 * c * s * e + s * s * d2;
    diag[k + 1] = s * s * d1 - 2 * c * s * e + c * c * d2;
    subdiag[k] = c * s * (d2 - d1) + (c * c - s * s) * e;

    if (k + 1 < hi) {
      z = s * subdiag[k + 1];
      subdiag[k + 1] *= c;
      x = subdiag[k];
    }

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const qi1 = Q[i][k], qi2 = Q[i][k + 1];
      Q[i][k] = c * qi1 + s * qi2;
      Q[i][k + 1] = -s * qi1 + c * qi2;
    }
  }
}

// ============================================================================
// EIGENSOLVER ENGINE
// ============================================================================

export class EigensolverEngine {

  /**
   * Power iteration: find the dominant eigenvalue and eigenvector.
   * Converges to the eigenvalue with largest absolute value.
   *
   * @param A Square matrix (n×n)
   * @param options maxIterations, tolerance
   * @returns Dominant eigenvalue and eigenvector
   */
  static powerIteration(A: number[][], options: EigenOptions = {}): EigenPair & { iterations: number; converged: boolean } {
    const n = A.length;
    if (n === 0) throw new Error("Eigensolver: empty matrix");
    const maxIter = options.maxIterations ?? DEFAULT_MAX_ITER;
    const tol = options.tolerance ?? DEFAULT_TOL;

    // Start with deterministic but non-degenerate vector
    let v = new Array(n);
    for (let i = 0; i < n; i++) v[i] = 1 + 0.3 * Math.sin(i + 1);
    let norm = vecNorm(v);
    v = vecScale(v, 1 / norm);

    let eigenvalue = 0;
    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      const w = matVecMul(A, v);
      const newEigenvalue = vecDot(v, w); // Rayleigh quotient
      norm = vecNorm(w);

      if (norm < EPS) {
        // Zero vector — matrix has zero eigenvalue
        eigenvalue = 0;
        converged = true;
        break;
      }

      const newV = vecScale(w, 1 / norm);

      if (Math.abs(newEigenvalue - eigenvalue) < tol * (Math.abs(eigenvalue) + 1)) {
        eigenvalue = newEigenvalue;
        v = newV;
        converged = true;
        break;
      }

      eigenvalue = newEigenvalue;
      v = newV;
    }

    return { eigenvalue, eigenvector: v, iterations: iter + 1, converged };
  }

  /**
   * Inverse iteration: find eigenvalue nearest to a given shift.
   * Solves (A - shift*I)*w = v at each step.
   *
   * @param A Square matrix (n×n)
   * @param options shift (target eigenvalue), maxIterations, tolerance
   * @returns Eigenvalue nearest shift and corresponding eigenvector
   */
  static inverseIteration(A: number[][], options: EigenOptions = {}): EigenPair & { iterations: number; converged: boolean } {
    const n = A.length;
    if (n === 0) throw new Error("Eigensolver: empty matrix");
    const maxIter = options.maxIterations ?? DEFAULT_MAX_ITER;
    const tol = options.tolerance ?? DEFAULT_TOL;
    const shift = options.shift ?? 0;

    let v = new Array(n);
    for (let i = 0; i < n; i++) v[i] = 1 / Math.sqrt(n) + (i % 3 - 1) * 0.1;
    let norm0 = vecNorm(v);
    v = vecScale(v, 1 / norm0);

    let eigenvalue = shift;
    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      const w = solveShifted(A, v, shift);
      const norm = vecNorm(w);

      if (norm < EPS) {
        // shift is exactly an eigenvalue
        eigenvalue = shift;
        converged = true;
        break;
      }

      const newV = vecScale(w, 1 / norm);
      const newEigenvalue = vecDot(newV, matVecMul(A, newV)); // Rayleigh quotient

      if (Math.abs(newEigenvalue - eigenvalue) < tol * (Math.abs(eigenvalue) + 1)) {
        eigenvalue = newEigenvalue;
        v = newV;
        converged = true;
        break;
      }

      eigenvalue = newEigenvalue;
      v = newV;
    }

    return { eigenvalue, eigenvector: v, iterations: iter + 1, converged };
  }

  /**
   * Symmetric QR algorithm: full eigendecomposition of symmetric matrices.
   * Reduces to tridiagonal form via Householder, then applies implicit QR
   * steps with Wilkinson shift.
   *
   * @param A Symmetric matrix (n×n) — will be symmetrized if slightly asymmetric
   * @param options maxIterations, tolerance
   * @returns All eigenvalues (descending) and eigenvectors
   */
  static symmetricQR(A: number[][], options: EigenOptions = {}): EigenResult {
    const n = A.length;
    if (n === 0) throw new Error("Eigensolver: empty matrix");
    if (n === 1) {
      return { eigenvalues: [A[0][0]], eigenvectors: [[1]], iterations: 0, converged: true };
    }

    const maxIter = options.maxIterations ?? (DEFAULT_MAX_ITER * n);
    const tol = options.tolerance ?? DEFAULT_TOL;

    // Symmetrize if needed
    const S = isSymmetric(A) ? A : symmetrize(A);

    // Reduce to tridiagonal
    const { diag, subdiag, Q } = tridiagonalize(S);

    // Implicit QR iteration on tridiagonal
    let totalIter = 0;
    let converged = true;

    let lo = 0, hi = n - 1;

    while (hi > 0 && totalIter < maxIter) {
      // Check for deflation: small subdiagonal elements
      for (let i = lo; i < hi; i++) {
        if (Math.abs(subdiag[i]) < tol * (Math.abs(diag[i]) + Math.abs(diag[i + 1]) + EPS)) {
          subdiag[i] = 0;
        }
      }

      // Find active block (unreduced submatrix)
      while (hi > 0 && Math.abs(subdiag[hi - 1]) < tol * (Math.abs(diag[hi - 1]) + Math.abs(diag[hi]) + EPS)) {
        subdiag[hi - 1] = 0;
        hi--;
      }
      if (hi === 0) break;

      lo = hi - 1;
      while (lo > 0 && Math.abs(subdiag[lo - 1]) >= tol * (Math.abs(diag[lo - 1]) + Math.abs(diag[lo]) + EPS)) {
        lo--;
      }

      implicitQRStep(diag, subdiag, lo, hi, Q);
      totalIter++;
    }

    if (totalIter >= maxIter) converged = false;

    // Sort eigenvalues descending by magnitude
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => Math.abs(diag[b]) - Math.abs(diag[a]));

    const eigenvalues = indices.map(i => diag[i]);
    const eigenvectors = zeros(n, n);
    for (let j = 0; j < n; j++) {
      const src = indices[j];
      for (let i = 0; i < n; i++) eigenvectors[i][j] = Q[i][src];
    }

    return { eigenvalues, eigenvectors, iterations: totalIter, converged };
  }

  /**
   * Lanczos algorithm for large sparse symmetric matrices.
   * Computes k extremal eigenvalues without forming full matrix.
   * Uses full reorthogonalization for numerical stability.
   *
   * @param A Symmetric matrix (n×n) or matrix-vector product function
   * @param options numEigenvalues (default min(n, 20)), maxIterations, tolerance
   * @returns Top-k eigenvalues and eigenvectors
   */
  static lanczos(
    A: number[][] | ((x: number[]) => number[]),
    n: number,
    options: EigenOptions = {}
  ): EigenResult {
    const matvec = typeof A === "function" ? A : (x: number[]) => matVecMul(A, x);
    const k = Math.min(options.numEigenvalues ?? Math.min(n, 20), n);
    const maxIter = Math.min(options.maxIterations ?? Math.max(2 * k, 50), n);
    const tol = options.tolerance ?? DEFAULT_TOL;

    // Lanczos vectors
    const V: number[][] = [];
    const alphas: number[] = [];
    const betas: number[] = [0]; // beta[0] unused

    // Initial vector — varied to avoid orthogonality to any eigenvector
    let v = new Array(n);
    for (let i = 0; i < n; i++) v[i] = 1 + 0.3 * Math.sin(i + 1);
    const v0norm = vecNorm(v);
    v = vecScale(v, 1 / v0norm);
    V.push(v.slice());

    let vPrev = new Array(n).fill(0);

    for (let j = 0; j < maxIter; j++) {
      let w = matvec(V[j]);

      // alpha_j = v_j^T * w
      const alpha = vecDot(V[j], w);
      alphas.push(alpha);

      // w = w - alpha_j * v_j - beta_j * v_{j-1}
      w = vecSub(w, vecAdd(vecScale(V[j], alpha), vecScale(vPrev, betas[j])));

      // Full reorthogonalization against all previous Lanczos vectors
      for (let i = 0; i <= j; i++) {
        const h = vecDot(w, V[i]);
        w = vecSub(w, vecScale(V[i], h));
      }

      const beta = vecNorm(w);
      betas.push(beta);

      if (beta < tol || j >= maxIter - 1) break;

      vPrev = V[j];
      const vNew = vecScale(w, 1 / beta);
      V.push(vNew);
    }

    const m = alphas.length;

    // Build tridiagonal matrix and solve with symmetric QR
    if (m === 1) {
      return {
        eigenvalues: [alphas[0]],
        eigenvectors: [V[0]],
        iterations: 1,
        converged: true,
      };
    }

    const T = zeros(m, m);
    for (let i = 0; i < m; i++) T[i][i] = alphas[i];
    for (let i = 0; i < m - 1; i++) {
      T[i][i + 1] = betas[i + 1];
      T[i + 1][i] = betas[i + 1];
    }

    const triResult = EigensolverEngine.symmetricQR(T, { tolerance: tol });

    // Transform eigenvectors back: z = V * y
    const numReturn = Math.min(k, triResult.eigenvalues.length);
    const eigenvalues = triResult.eigenvalues.slice(0, numReturn);
    const eigenvectors = zeros(n, numReturn);

    for (let j = 0; j < numReturn; j++) {
      for (let i = 0; i < V.length; i++) {
        const coeff = triResult.eigenvectors[i]?.[j] ?? 0;
        for (let r = 0; r < n; r++) {
          eigenvectors[r][j] += coeff * V[i][r];
        }
      }
      // Normalize
      let norm = 0;
      for (let r = 0; r < n; r++) norm += eigenvectors[r][j] ** 2;
      norm = Math.sqrt(norm);
      if (norm > EPS) {
        for (let r = 0; r < n; r++) eigenvectors[r][j] /= norm;
      }
    }

    return {
      eigenvalues,
      eigenvectors,
      iterations: m,
      converged: triResult.converged,
    };
  }

  /**
   * Generalized eigenvalue problem: A*x = lambda*B*x
   * Reduces to standard form via Cholesky: B = L*L^T, solve L^{-1}*A*L^{-T}*y = lambda*y.
   * B must be symmetric positive-definite.
   *
   * @param A Symmetric matrix (n×n)
   * @param B Symmetric positive-definite matrix (n×n)
   * @param options Standard eigen options
   * @returns Generalized eigenvalues and eigenvectors
   */
  static generalizedEigen(A: number[][], B: number[][], options: EigenOptions = {}): GeneralizedEigenResult {
    const n = A.length;
    if (n === 0) throw new Error("Eigensolver: empty matrix");

    // Cholesky factor B = L * L^T
    const L = choleskyFactor(B);
    if (!L) {
      return {
        eigenvalues: [],
        eigenvectors: [],
        iterations: 0,
        converged: false,
        bFactored: false,
      };
    }

    // Transform to standard form: D = L^{-1} * A * L^{-T}
    const Linv = forwardSolveMatrix(L, identity(n));
    const C = matMul(Linv, A);
    const D = matMul(C, transposeMatrix(Linv));

    // Symmetrize D (numerical errors can break symmetry)
    const Ds = symmetrize(D);

    // Solve standard eigenvalue problem
    const result = EigensolverEngine.symmetricQR(Ds, options);

    // Transform back: x = L^{-T} * y
    const eigenvectors = zeros(n, n);
    const LinvTrans = transposeMatrix(Linv);
    for (let j = 0; j < result.eigenvalues.length; j++) {
      const y = new Array(n);
      for (let i = 0; i < n; i++) y[i] = result.eigenvectors[i][j];
      const x = matVecMul(LinvTrans, y);
      // Normalize
      const norm = vecNorm(x);
      for (let i = 0; i < n; i++) eigenvectors[i][j] = norm > EPS ? x[i] / norm : 0;
    }

    return {
      eigenvalues: result.eigenvalues,
      eigenvectors,
      iterations: result.iterations,
      converged: result.converged,
      bFactored: true,
    };
  }

  /**
   * Convenience: compute eigenvalues only (no eigenvectors) — faster for large matrices.
   *
   * @param A Symmetric matrix
   * @param options Standard eigen options
   * @returns Eigenvalues in descending order of magnitude
   */
  static eigenvaluesOnly(A: number[][], options: EigenOptions = {}): { eigenvalues: number[]; converged: boolean } {
    const result = EigensolverEngine.symmetricQR(A, options);
    return { eigenvalues: result.eigenvalues, converged: result.converged };
  }

  /**
   * Spectral radius: largest absolute eigenvalue.
   * Uses power iteration for efficiency.
   *
   * @param A Square matrix
   * @returns Spectral radius rho(A) = max(|lambda_i|)
   */
  static spectralRadius(A: number[][]): number {
    const { eigenvalue } = EigensolverEngine.powerIteration(A, { maxIterations: 300 });
    return Math.abs(eigenvalue);
  }
}

// ============================================================================
// CHOLESKY HELPERS (lightweight, avoids circular dependency)
// ============================================================================

function choleskyFactor(A: number[][]): number[][] | null {
  const n = A.length;
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) return null;
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

function forwardSolveMatrix(L: number[][], B: number[][]): number[][] {
  const n = L.length, m = B[0].length;
  const X = zeros(n, m);
  for (let col = 0; col < m; col++) {
    for (let i = 0; i < n; i++) {
      let sum = B[i][col];
      for (let j = 0; j < i; j++) sum -= L[i][j] * X[j][col];
      X[i][col] = Math.abs(L[i][i]) > EPS ? sum / L[i][i] : 0;
    }
  }
  return X;
}

function transposeMatrix(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T = zeros(n, m);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      T[j][i] = A[i][j];
  return T;
}

// Singleton
export const eigensolverEngine = new EigensolverEngine();
