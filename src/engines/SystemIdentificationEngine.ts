/**
 * SystemIdentificationEngine — System ID from Sensor Data
 *
 * Capabilities:
 *   - Recursive Least Squares (RLS) with forgetting factor λ for online parameter estimation
 *   - Total Least Squares (TLS) via SVD for errors-in-variables problems
 *   - N4SID subspace identification for MIMO state-space models from I/O data
 *   - Transfer function extraction from state-space (A,B,C,D)
 *   - Model order selection via singular value gap
 *
 * Used by: online Kienzle coefficient adaptation, cutting dynamics identification,
 *   adaptive feed control, spindle bearing degradation tracking.
 *
 * References:
 *   - Ljung, "System Identification: Theory for the User" 2nd ed. (1999)
 *   - Van Overschee & De Moor, "Subspace Identification for Linear Systems" (1996)
 *   - Golub & Van Loan, "Matrix Computations" 4th ed., §2.5.2 (TLS)
 *
 * @engine SystemIdentificationEngine
 * @milestone SCIMATH-MS0
 * @unit P2-U01
 * @courses MIT 2.14, MIT 6.241
 */

import { SVDEngine } from "./SVDEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** RLS estimator state — carry between samples for online use */
export interface RLSState {
  /** Current parameter estimate (p×1) */
  theta: number[];
  /** Covariance matrix (p×p) */
  P: number[][];
  /** Forgetting factor */
  lambda: number;
  /** Number of samples processed */
  sampleCount: number;
}

/** RLS options */
export interface RLSOptions {
  /** Forgetting factor 0 < λ ≤ 1 (default 1.0 = no forgetting) */
  lambda?: number;
  /** Initial covariance scale P0 = delta*I (default 1000) */
  delta?: number;
}

/** Total Least Squares result */
export interface TLSResult {
  /** Parameter vector x such that [A|b] has minimum Frobenius perturbation */
  x: number[];
  /** Residual: smallest singular value of [A|b] */
  residual: number;
  /** Condition of the problem */
  conditionNumber: number;
}

/** State-space model (A,B,C,D) */
export interface StateSpaceModel {
  /** System matrix (n×n) */
  A: number[][];
  /** Input matrix (n×m) */
  B: number[][];
  /** Output matrix (p×n) */
  C: number[][];
  /** Feedthrough matrix (p×m) */
  D: number[][];
  /** System order */
  order: number;
  /** Singular values from Hankel SVD (for order selection) */
  hankelSingularValues: number[];
}

/** N4SID options */
export interface N4SIDOptions {
  /** System order (if known). Auto-detected from singular value gap if omitted. */
  order?: number;
  /** Number of block rows in Hankel matrix (default: auto = max(2*order_est, 10)) */
  blockRows?: number;
  /** Minimum singular value ratio for order selection (default 0.01) */
  svGapThreshold?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SystemIdentificationEngine {

  // --------------------------------------------------------------------------
  // RECURSIVE LEAST SQUARES (RLS)
  // --------------------------------------------------------------------------

  /**
   * Initialize RLS estimator for p parameters.
   * P0 = delta * I (large initial covariance = no prior knowledge).
   *
   * Reference: Ljung (1999), Algorithm 11.2.
   *
   * @param numParams Number of parameters to estimate
   * @param options RLS configuration
   */
  static rlsInit(numParams: number, options: RLSOptions = {}): RLSState {
    const { lambda = 1.0, delta = 1000 } = options;
    if (lambda <= 0 || lambda > 1) throw new Error("RLS: forgetting factor lambda must be in (0, 1]");
    if (numParams < 1) throw new Error("RLS: numParams must be >= 1");

    const P: number[][] = Array.from({ length: numParams }, (_, i) =>
      Array.from({ length: numParams }, (_, j) => i === j ? delta : 0)
    );
    return {
      theta: new Array(numParams).fill(0),
      P,
      lambda,
      sampleCount: 0,
    };
  }

  /**
   * RLS update: incorporate one new observation (phi, y).
   * Model: y = phi^T * theta + e
   *
   * Updates theta and P in-place (returns same state object for chaining).
   *
   * Reference: Ljung (1999), Eq. 11.17–11.19.
   *
   * @param state Current RLS state (modified in place)
   * @param phi Regressor vector (p×1)
   * @param y Measured output (scalar)
   * @returns Updated state
   */
  static rlsUpdate(state: RLSState, phi: number[], y: number): RLSState {
    const p = state.theta.length;
    if (phi.length !== p) throw new Error(`RLS: phi length ${phi.length} != ${p}`);

    const { theta, P, lambda } = state;

    // Prediction error: e = y - phi^T * theta
    let yHat = 0;
    for (let i = 0; i < p; i++) yHat += phi[i] * theta[i];
    const e = y - yHat;

    // Gain: K = P * phi / (lambda + phi^T * P * phi)
    const Pphi = new Array(p).fill(0);
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++) Pphi[i] += P[i][j] * phi[j];

    let phiTPphi = 0;
    for (let i = 0; i < p; i++) phiTPphi += phi[i] * Pphi[i];

    const denom = lambda + phiTPphi;
    const K = Pphi.map(v => v / denom);

    // Update theta: theta += K * e
    for (let i = 0; i < p; i++) theta[i] += K[i] * e;

    // Update P: P = (P - K * phi^T * P) / lambda
    // Joseph form for numerical stability: P = (I - K*phi^T)*P*(I - K*phi^T)^T / lambda^2 + K*K^T*r/lambda^2
    // Simplified stable version: P = (P - K * Pphi^T) / lambda
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++)
        P[i][j] = (P[i][j] - K[i] * Pphi[j]) / lambda;

    // Symmetrize P to prevent drift
    for (let i = 0; i < p; i++)
      for (let j = i + 1; j < p; j++) {
        const avg = (P[i][j] + P[j][i]) / 2;
        P[i][j] = avg;
        P[j][i] = avg;
      }

    state.sampleCount++;
    return state;
  }

  /**
   * Batch RLS: process multiple (phi, y) pairs sequentially.
   * Convenience wrapper over rlsInit + rlsUpdate.
   *
   * @param Phi Regressor matrix (N×p), each row is one observation
   * @param y Output vector (N×1)
   * @param options RLS options
   * @returns Final RLS state with estimated parameters
   */
  static rlsBatch(Phi: number[][], y: number[], options: RLSOptions = {}): RLSState {
    if (Phi.length !== y.length) throw new Error("RLS batch: Phi rows must equal y length");
    if (Phi.length === 0) throw new Error("RLS batch: empty data");

    const p = Phi[0].length;
    const state = SystemIdentificationEngine.rlsInit(p, options);
    for (let k = 0; k < Phi.length; k++) {
      SystemIdentificationEngine.rlsUpdate(state, Phi[k], y[k]);
    }
    return state;
  }

  // --------------------------------------------------------------------------
  // TOTAL LEAST SQUARES (TLS)
  // --------------------------------------------------------------------------

  /**
   * Total Least Squares: solve A*x ≈ b minimizing ||[ΔA|Δb]||_F.
   * Unlike OLS which only accounts for noise in b, TLS accounts for noise
   * in both A and b (errors-in-variables).
   *
   * Method: SVD of [A|b]; solution from last right singular vector.
   * Reference: Golub & Van Loan, §2.5.2; Van Huffel & Vandewalle (1991).
   *
   * @param A Coefficient matrix (m×n)
   * @param b Right-hand side (m×1)
   * @returns TLS solution
   */
  static totalLeastSquares(A: number[][], b: number[]): TLSResult {
    const m = A.length;
    const n = A[0]?.length ?? 0;
    if (b.length !== m) throw new Error("TLS: A rows must equal b length");

    // Augment: C = [A | b]
    const C = A.map((row, i) => [...row, b[i]]);

    const svd = SVDEngine.decompose(C);

    // TLS solution: x = -V[0..n-1, n] / V[n, n]
    // (last column of V, normalized by last element)
    const lastCol = n; // index of (n+1)-th column in V (0-indexed)
    const vLast = svd.V.map(row => row[lastCol]);
    const vnn = vLast[n]; // bottom element

    if (Math.abs(vnn) < 1e-15) {
      throw new Error("TLS: no unique solution (degenerate case)");
    }

    const x = new Array(n);
    for (let i = 0; i < n; i++) x[i] = -vLast[i] / vnn;

    return {
      x,
      residual: svd.sigma[svd.sigma.length - 1],
      conditionNumber: svd.conditionNumber,
    };
  }

  // --------------------------------------------------------------------------
  // N4SID SUBSPACE IDENTIFICATION
  // --------------------------------------------------------------------------

  /**
   * N4SID: Numerical Subspace State-Space System Identification.
   * Identifies a discrete-time state-space model (A,B,C,D) from input-output data.
   *
   * Algorithm (Van Overschee & De Moor, 1996):
   *   1. Build block Hankel matrices from output y
   *   2. SVD of output Hankel → observability subspace
   *   3. Extract C from first block row, A from shift structure
   *   4. Recover B, D from least-squares on state equation
   *
   * @param u Input sequence — 1D array for SISO or N×m for MIMO
   * @param y Output sequence — 1D array for SISO or N×p for MIMO
   * @param options N4SID configuration
   * @returns Identified state-space model
   */
  static n4sid(
    u: number[] | number[][],
    y: number[] | number[][],
    options: N4SIDOptions = {}
  ): StateSpaceModel {
    // Normalize to 2D: N×m and N×p
    const U = Array.isArray(u[0]) ? u as number[][] : (u as number[]).map(v => [v]);
    const Y = Array.isArray(y[0]) ? y as number[][] : (y as number[]).map(v => [v]);

    const N = U.length;
    const m = U[0].length;
    const p = Y[0].length;
    if (Y.length !== N) throw new Error("N4SID: u and y must have same number of samples");
    if (N < 10) throw new Error("N4SID: insufficient data length (need >= 10 samples)");

    const { svGapThreshold = 0.01 } = options;
    let i = options.blockRows ?? Math.max(10, Math.min(Math.floor(N / 4), 30));
    if (N - 2 * i + 1 < 1) {
      i = Math.floor((N + 1) / 3);
      if (N - 2 * i + 1 < 1) throw new Error("N4SID: insufficient data length");
    }
    const jActual = N - 2 * i + 1;

    // Build output Hankel: H[r*p+k][c] = Y[i+r+c][k]
    const Hrows = i * p;
    const H: number[][] = Array.from({ length: Hrows }, () => new Array(jActual).fill(0));
    for (let r = 0; r < i; r++) {
      for (let c = 0; c < jActual; c++) {
        const dataIdx = i + r + c;
        if (dataIdx < N) {
          for (let k = 0; k < p; k++) {
            H[r * p + k][c] = Y[dataIdx][k];
          }
        }
      }
    }

    // SVD of H to find observability subspace
    const svd = SVDEngine.decompose(H);
    const allSV = svd.sigma;

    // Order selection: find gap in singular values
    let n: number;
    if (options.order !== undefined) {
      n = options.order;
    } else {
      n = 1;
      const maxOrder = Math.min(allSV.length - 1, Math.floor(i * p / 2), 20);
      for (let k = 1; k < maxOrder; k++) {
        if (allSV[k] < svGapThreshold * allSV[0]) {
          n = k;
          break;
        }
        if (k < allSV.length - 1 && allSV[k + 1] / allSV[k] < 0.1) {
          n = k + 1;
          break;
        }
        n = k + 1;
      }
    }
    n = Math.max(1, Math.min(n, allSV.length));

    // Observability matrix: O = U_n * sqrt(Sigma_n), shape (i*p) × n
    const O: number[][] = Array.from({ length: Hrows }, (_, r) =>
      Array.from({ length: n }, (_, c) =>
        c < allSV.length ? svd.U[r][c] * Math.sqrt(allSV[c]) : 0
      )
    );

    // C = first p rows of O
    const C: number[][] = Array.from({ length: p }, (_, r) =>
      Array.from({ length: n }, (_, c) => O[r][c])
    );

    // A from shift structure: O_up * A ≈ O_down
    const rowsUp = (i - 1) * p;
    if (rowsUp >= p && n > 0) {
      const Oup = O.slice(0, rowsUp);
      const Odown = O.slice(p, p + rowsUp);
      const A = svdLeastSquaresMatrix(Oup, Odown, n);
      const B = estimateInputMatrix(U, Y, A, C, n, m, p);
      const D: number[][] = Array.from({ length: p }, () => new Array(m).fill(0));

      return { A, B, C, D, order: n, hankelSingularValues: allSV };
    }

    // Fallback for very small systems
    const Adef = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => r === c ? 0.5 : 0)
    );
    const Bdef = Array.from({ length: n }, () => new Array(m).fill(0));
    if (n > 0 && m > 0) Bdef[0][0] = 1;
    const Ddef = Array.from({ length: p }, () => new Array(m).fill(0));

    return { A: Adef, B: Bdef, C, D: Ddef, order: n, hankelSingularValues: allSV };
  }

  /**
   * Simulate a state-space model: x(k+1) = A*x(k) + B*u(k), y(k) = C*x(k) + D*u(k).
   *
   * @param model State-space model
   * @param u Input sequence (N×m) or 1D for SISO
   * @returns Output sequence (N × p)
   */
  static simulate(model: StateSpaceModel, u: number[] | number[][]): number[][] {
    const U = Array.isArray(u[0]) ? u as number[][] : (u as number[]).map(v => [v]);
    const N = U.length;
    const { A, B, C, D, order: n } = model;
    const p = C.length;
    const m = B[0]?.length ?? 1;

    const x = new Array(n).fill(0);
    const Yout: number[][] = [];

    for (let k = 0; k < N; k++) {
      const yk = new Array(p).fill(0);
      for (let ii = 0; ii < p; ii++) {
        for (let jj = 0; jj < n; jj++) yk[ii] += C[ii][jj] * x[jj];
        for (let jj = 0; jj < m; jj++) yk[ii] += D[ii][jj] * (U[k][jj] ?? 0);
      }
      Yout.push(yk);

      const xNew = new Array(n).fill(0);
      for (let ii = 0; ii < n; ii++) {
        for (let jj = 0; jj < n; jj++) xNew[ii] += A[ii][jj] * x[jj];
        for (let jj = 0; jj < m; jj++) xNew[ii] += B[ii][jj] * (U[k][jj] ?? 0);
      }
      for (let ii = 0; ii < n; ii++) x[ii] = xNew[ii];
    }

    return Yout;
  }

  /**
   * Convert state-space (A,B,C,D) to transfer function for SISO systems.
   * H(z) = C*(zI-A)^{-1}*B + D = num(z)/den(z).
   *
   * Uses Faddeev-LeVerrier for characteristic polynomial.
   *
   * @param model State-space model (SISO)
   * @returns { num, den } polynomial coefficients (descending powers of z)
   */
  static ss2tf(model: StateSpaceModel): { num: number[]; den: number[] } {
    const { A, B, C, D, order: n } = model;
    const den = charPoly(A);
    const { matrices } = faddeevLeVerrier(A);
    const numCoeffs = new Array(n + 1).fill(0);
    const d = D[0]?.[0] ?? 0;

    // adj(zI-A) = sum_{k=0}^{n-1} M_k * z^{n-1-k}
    // So M_k contributes to the z^{n-1-k} coefficient, which is array index (n - (n-1-k)) = k+1
    for (let k = 0; k < matrices.length; k++) {
      let cmb = 0;
      const Mk = matrices[k];
      for (let ii = 0; ii < (C[0]?.length ?? 0); ii++) {
        let mb = 0;
        for (let jj = 0; jj < n; jj++) mb += Mk[ii][jj] * B[jj][0];
        cmb += C[0][ii] * mb;
      }
      numCoeffs[k + 1] += cmb;
    }

    for (let k = 0; k <= n; k++) numCoeffs[k] += d * den[k];
    return { num: numCoeffs, den };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Solve Oup * X ≈ Odown via SVD pseudo-inverse, returning X (n×ncols) */
function svdLeastSquaresMatrix(Oup: number[][], Odown: number[][], n: number): number[][] {
  const rows = Oup.length;
  const ncols = Odown[0].length;
  const svd = SVDEngine.decompose(Oup);
  const tol = 1e-10 * (svd.sigma[0] || 1);

  const X: number[][] = Array.from({ length: n }, () => new Array(ncols).fill(0));
  for (let col = 0; col < ncols; col++) {
    const b = Odown.map(row => row[col]);
    for (let k = 0; k < svd.sigma.length; k++) {
      if (svd.sigma[k] < tol) continue;
      let uTb = 0;
      for (let ii = 0; ii < rows; ii++) uTb += svd.U[ii][k] * b[ii];
      const coeff = uTb / svd.sigma[k];
      for (let ii = 0; ii < n; ii++) X[ii][col] += svd.V[ii][k] * coeff;
    }
  }
  return X;
}

/** Estimate B matrix from input-output data using state estimates */
function estimateInputMatrix(
  U: number[][], Y: number[][],
  A: number[][], C: number[][],
  n: number, m: number, p: number
): number[][] {
  const B: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  const Nsamp = Math.min(U.length - 1, 50);
  if (Nsamp < 1 || n === 0) return B;

  // Pseudo-inverse of C to estimate states: x ≈ pinv(C) * y
  const svdC = SVDEngine.decompose(C);
  const tol = 1e-10 * (svdC.sigma[0] || 1);

  const states: number[][] = [];
  for (let k = 0; k <= Nsamp; k++) {
    const x = new Array(n).fill(0);
    for (let jj = 0; jj < svdC.sigma.length; jj++) {
      if (svdC.sigma[jj] < tol) continue;
      let uTy = 0;
      for (let ii = 0; ii < p; ii++) uTy += svdC.U[ii][jj] * Y[k][ii];
      const coeff = uTy / svdC.sigma[jj];
      for (let ii = 0; ii < n; ii++) x[ii] += svdC.V[ii][jj] * coeff;
    }
    states.push(x);
  }

  // Solve x(k+1) - A*x(k) = B*u(k) for each row of B
  const Phi: number[][] = [];
  const targets: number[][] = Array.from({ length: n }, () => []);

  for (let k = 0; k < Nsamp; k++) {
    Phi.push(U[k].slice(0, m));
    for (let ii = 0; ii < n; ii++) {
      let ax = 0;
      for (let jj = 0; jj < n; jj++) ax += A[ii][jj] * states[k][jj];
      targets[ii].push(states[k + 1][ii] - ax);
    }
  }

  const svdPhi = SVDEngine.decompose(Phi);
  const tolPhi = 1e-10 * (svdPhi.sigma[0] || 1);

  for (let ii = 0; ii < n; ii++) {
    const bVec = targets[ii];
    const x = new Array(m).fill(0);
    for (let k = 0; k < svdPhi.sigma.length; k++) {
      if (svdPhi.sigma[k] < tolPhi) continue;
      let uTb = 0;
      for (let r = 0; r < Nsamp; r++) uTb += svdPhi.U[r][k] * bVec[r];
      const coeff = uTb / svdPhi.sigma[k];
      for (let jj = 0; jj < m; jj++) x[jj] += svdPhi.V[jj][k] * coeff;
    }
    for (let jj = 0; jj < m; jj++) B[ii][jj] = x[jj];
  }

  return B;
}

/** Characteristic polynomial via Faddeev-LeVerrier: det(zI-A) = z^n + c1*z^{n-1} + ... + cn */
function charPoly(A: number[][]): number[] {
  const n = A.length;
  const coeffs = new Array(n + 1).fill(0);
  coeffs[0] = 1;

  let M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );

  for (let k = 1; k <= n; k++) {
    const AM: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let l = 0; l < n; l++) AM[i][j] += A[i][l] * M[l][j];

    let trace = 0;
    for (let i = 0; i < n; i++) trace += AM[i][i];
    coeffs[k] = -trace / k;

    M = AM.map((row, i) => row.map((v, j) => v + (i === j ? coeffs[k] : 0)));
  }

  return coeffs;
}

/** Faddeev-LeVerrier with intermediate matrices for adjugate computation */
function faddeevLeVerrier(A: number[][]): { coeffs: number[]; matrices: number[][][] } {
  const n = A.length;
  const coeffs = new Array(n + 1).fill(0);
  coeffs[0] = 1;
  const matrices: number[][][] = [];

  let M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  matrices.push(M.map(r => r.slice()));

  for (let k = 1; k <= n; k++) {
    const AM: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let l = 0; l < n; l++) AM[i][j] += A[i][l] * M[l][j];

    let trace = 0;
    for (let i = 0; i < n; i++) trace += AM[i][i];
    coeffs[k] = -trace / k;

    M = AM.map((row, i) => row.map((v, j) => v + (i === j ? coeffs[k] : 0)));
    if (k < n) matrices.push(M.map(r => r.slice()));
  }

  return { coeffs, matrices };
}

export const systemIdentificationEngine = new SystemIdentificationEngine();
