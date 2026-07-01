/**
 * QRDecompositionEngine — QR Factorization
 *
 * Computes A = Q * R where Q is orthogonal (m×m or m×n thin) and R is upper triangular.
 * Implementation: Householder reflectors (numerically stable, O(2mn² - 2n³/3)).
 *
 * Capabilities:
 *   - Full QR: A = Q * R (Q is m×m)
 *   - Thin QR: A = Q_thin * R_thin (Q is m×n, R is n×n) for m > n
 *   - Column-pivoted QR: A * P = Q * R (rank-revealing)
 *   - Givens rotation QR (for sparse/banded matrices)
 *   - Least-squares solver via QR (more stable than normal equations)
 *   - Back-substitution for triangular systems
 *
 * Used by: Kienzle coefficient regression, Taylor tool life fitting,
 *   overdetermined system solving, rank detection.
 *
 * Reference: Golub & Van Loan, "Matrix Computations" 4th ed., Chapter 5.
 *
 * @engine QRDecompositionEngine
 * @milestone SCIMATH-MS0
 * @unit P0-U02
 * @courses MIT 18.06, MIT 18.335
 */

// ============================================================================
// TYPES
// ============================================================================

/** Result of QR decomposition A = Q * R */
export interface QRResult {
  /** Orthogonal matrix Q (m×m for full, m×n for thin) */
  Q: number[][];
  /** Upper triangular matrix R (m×n for full, n×n for thin) */
  R: number[][];
  /** Whether thin QR was computed */
  thin: boolean;
}

/** Result of column-pivoted QR: A * P = Q * R */
export interface QRPivotResult extends QRResult {
  /** Permutation vector: column j of A*P = column P[j] of A */
  permutation: number[];
  /** Numerical rank (count of |R[i][i]| > tolerance) */
  rank: number;
}

/** Options for QR computation */
export interface QROptions {
  /** Compute thin QR (default true for m > n) */
  thin?: boolean;
  /** Use column pivoting for rank-revealing QR (default false) */
  pivoting?: boolean;
  /** Rank tolerance for pivoted QR (default: m * eps * |R[0][0]|) */
  rankTolerance?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EPS = 2.220446049250313e-16;

// ============================================================================
// HELPERS
// ============================================================================

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function copyMatrix(A: number[][]): number[][] {
  return A.map(row => row.slice());
}

// ============================================================================
// QR ENGINE
// ============================================================================

export class QRDecompositionEngine {

  /**
   * Compute QR decomposition: A = Q * R using Householder reflectors.
   *
   * @param A Input matrix (m×n)
   * @param options QR options (thin, pivoting)
   * @returns QRResult or QRPivotResult if pivoting=true
   */
  static decompose(A: number[][], options: QROptions = {}): QRResult | QRPivotResult {
    const m = A.length;
    if (m === 0) throw new Error("QR: empty matrix");
    const n = A[0].length;
    if (n === 0) throw new Error("QR: empty matrix");

    if (options.pivoting) {
      return QRDecompositionEngine.pivotedQR(A, options);
    }

    return QRDecompositionEngine.householderQR(A, options.thin ?? (m > n));
  }

  /**
   * Householder QR factorization (no pivoting).
   */
  static householderQR(A: number[][], thin: boolean): QRResult {
    const m = A.length;
    const n = A[0].length;
    const k = Math.min(m, n);

    // Work on a copy → becomes R
    const R = copyMatrix(A);
    // Store Householder vectors for deferred Q computation
    const vecs: number[][] = [];
    const betas: number[] = [];

    for (let j = 0; j < k; j++) {
      // Extract column j below diagonal
      const x = new Array(m - j);
      for (let i = j; i < m; i++) x[i - j] = R[i][j];

      // Compute Householder vector v and scalar beta
      const { v, beta } = householder(x);
      vecs.push(v);
      betas.push(beta);

      // Apply H = I - beta * v * v^T to R[j:m, j:n]
      for (let col = j; col < n; col++) {
        let dot = 0;
        for (let i = 0; i < v.length; i++) dot += v[i] * R[i + j][col];
        dot *= beta;
        for (let i = 0; i < v.length; i++) R[i + j][col] -= dot * v[i];
      }
    }

    // Build Q by accumulating Householder reflections: Q = H_1 * H_2 * ... * H_k
    const qCols = thin ? k : m;
    const Q = zeros(m, qCols);
    // Start with identity columns
    for (let i = 0; i < Math.min(m, qCols); i++) Q[i][i] = 1;

    // Apply reflections in reverse order
    for (let j = k - 1; j >= 0; j--) {
      const v = vecs[j];
      const beta = betas[j];
      for (let col = j; col < qCols; col++) {
        let dot = 0;
        for (let i = 0; i < v.length; i++) dot += v[i] * Q[i + j][col];
        dot *= beta;
        for (let i = 0; i < v.length; i++) Q[i + j][col] -= dot * v[i];
      }
    }

    // Trim R for thin QR
    const finalR = thin ? R.slice(0, k).map(row => row.slice(0, n)) : R;

    return { Q, R: finalR, thin };
  }

  /**
   * Column-pivoted QR: A * P = Q * R (rank-revealing).
   * Columns are swapped so |R[i][i]| >= |R[j][j]| for i < j.
   */
  static pivotedQR(A: number[][], options: QROptions = {}): QRPivotResult {
    const m = A.length;
    const n = A[0].length;
    const k = Math.min(m, n);

    const R = copyMatrix(A);
    const perm = Array.from({ length: n }, (_, i) => i);
    const vecs: number[][] = [];
    const betas: number[] = [];

    // Column norms for pivoting
    const colNorms = new Array(n);
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < m; i++) s += R[i][j] ** 2;
      colNorms[j] = s;
    }

    for (let j = 0; j < k; j++) {
      // Find column with largest remaining norm
      let maxNorm = colNorms[j], maxCol = j;
      for (let c = j + 1; c < n; c++) {
        if (colNorms[c] > maxNorm) { maxNorm = colNorms[c]; maxCol = c; }
      }

      // Swap columns j and maxCol
      if (maxCol !== j) {
        [perm[j], perm[maxCol]] = [perm[maxCol], perm[j]];
        [colNorms[j], colNorms[maxCol]] = [colNorms[maxCol], colNorms[j]];
        for (let i = 0; i < m; i++) {
          [R[i][j], R[i][maxCol]] = [R[i][maxCol], R[i][j]];
        }
      }

      // Householder on column j below diagonal
      const x = new Array(m - j);
      for (let i = j; i < m; i++) x[i - j] = R[i][j];
      const { v, beta } = householder(x);
      vecs.push(v);
      betas.push(beta);

      // Apply to R
      for (let col = j; col < n; col++) {
        let dot = 0;
        for (let i = 0; i < v.length; i++) dot += v[i] * R[i + j][col];
        dot *= beta;
        for (let i = 0; i < v.length; i++) R[i + j][col] -= dot * v[i];
      }

      // Update column norms (downdate)
      for (let c = j + 1; c < n; c++) {
        colNorms[c] -= R[j][c] ** 2;
        if (colNorms[c] < 0) colNorms[c] = 0;
      }
    }

    // Build Q
    const thin = options.thin ?? (m > n);
    const qCols = thin ? k : m;
    const Q = zeros(m, qCols);
    for (let i = 0; i < Math.min(m, qCols); i++) Q[i][i] = 1;
    for (let j = k - 1; j >= 0; j--) {
      const v = vecs[j];
      const beta = betas[j];
      for (let col = j; col < qCols; col++) {
        let dot = 0;
        for (let i = 0; i < v.length; i++) dot += v[i] * Q[i + j][col];
        dot *= beta;
        for (let i = 0; i < v.length; i++) Q[i + j][col] -= dot * v[i];
      }
    }

    const finalR = thin ? R.slice(0, k).map(row => row.slice(0, n)) : R;

    // Determine rank from diagonal of R
    const rTol = options.rankTolerance ?? (m * EPS * Math.abs(finalR[0]?.[0] ?? 0));
    let rank = 0;
    for (let i = 0; i < k; i++) {
      if (Math.abs(finalR[i][i]) > rTol) rank++;
      else break;
    }

    return { Q, R: finalR, thin, permutation: perm, rank };
  }

  /**
   * Solve least-squares min ||Ax - b||_2 via QR factorization.
   * More numerically stable than normal equations for ill-conditioned A.
   *
   * @param A Coefficient matrix (m×n, m >= n)
   * @param b Right-hand side (length m)
   * @returns Solution x and residual norm
   */
  static leastSquares(A: number[][], b: number[]): { x: number[]; residualNorm: number } {
    const m = A.length, n = A[0].length;
    if (m < n) throw new Error("QR least-squares requires m >= n (overdetermined)");

    const { Q, R } = QRDecompositionEngine.householderQR(A, true);

    // c = Q^T * b (first n elements, using thin Q)
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) c[i] += Q[j][i] * b[j];
    }

    // Back-substitution: R * x = c
    const x = QRDecompositionEngine.backSubstitute(R, c);

    // Residual via Pythagorean theorem: ||b - Ax||^2 = ||b||^2 - ||c||^2
    // (since Q is orthogonal, ||Q^T b||^2 = ||b||^2, and c captures the first n components)
    let bNormSq = 0;
    for (let i = 0; i < m; i++) bNormSq += b[i] * b[i];
    let cNormSq = 0;
    for (let i = 0; i < n; i++) cNormSq += c[i] * c[i];
    const residSq = Math.max(0, bNormSq - cNormSq);

    return { x, residualNorm: Math.sqrt(residSq) };
  }

  /**
   * Back-substitution for upper triangular system R * x = b.
   *
   * @param R Upper triangular matrix (n×n)
   * @param b Right-hand side (length n)
   * @returns Solution vector x
   */
  static backSubstitute(R: number[][], b: number[]): number[] {
    const n = R.length;
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) sum -= R[i][j] * x[j];
      x[i] = Math.abs(R[i][i]) > EPS ? sum / R[i][i] : 0;
    }
    return x;
  }

  /**
   * QR via Givens rotations — better for sparse/banded matrices.
   * Zeroes elements one at a time using 2×2 rotations.
   *
   * @param A Input matrix (m×n)
   * @returns QRResult with Q and R
   */
  static givensQR(A: number[][]): QRResult {
    const m = A.length, n = A[0].length;
    const R = copyMatrix(A);
    const Q = zeros(m, m);
    for (let i = 0; i < m; i++) Q[i][i] = 1;

    for (let j = 0; j < n; j++) {
      for (let i = m - 1; i > j; i--) {
        if (Math.abs(R[i][j]) < EPS) continue;

        // Compute Givens rotation to zero R[i][j]
        const a = R[i - 1][j], b = R[i][j];
        const r = Math.sqrt(a * a + b * b);
        const c = a / r, s = b / r;

        // Apply to R rows i-1, i
        for (let k = j; k < n; k++) {
          const t1 = R[i - 1][k], t2 = R[i][k];
          R[i - 1][k] = c * t1 + s * t2;
          R[i][k] = -s * t1 + c * t2;
        }

        // Accumulate into Q columns i-1, i
        for (let k = 0; k < m; k++) {
          const t1 = Q[k][i - 1], t2 = Q[k][i];
          Q[k][i - 1] = c * t1 + s * t2;
          Q[k][i] = -s * t1 + c * t2;
        }
      }
    }

    return { Q, R, thin: false };
  }
}

// ============================================================================
// HOUSEHOLDER HELPER
// ============================================================================

/**
 * Compute Householder vector v and scalar beta such that
 * (I - beta * v * v^T) * x = ||x|| * e_1
 */
/**
 * Compute Householder vector v and scalar beta such that
 * (I - beta * v * v^T) * x = alpha * e_1 where alpha = ±||x||
 *
 * Reference: Golub & Van Loan, Algorithm 5.1.1
 */
function householder(x: number[]): { v: number[]; beta: number } {
  const n = x.length;
  if (n === 0) return { v: [], beta: 0 };

  // sigma = x[1]^2 + ... + x[n-1]^2
  let sigma = 0;
  for (let i = 1; i < n; i++) sigma += x[i] * x[i];

  const v = x.slice();
  v[0] = 1; // will be overwritten if needed

  if (sigma < EPS * EPS) {
    // x is essentially [x[0], 0, ..., 0]
    // If x[0] >= 0: H = I (no reflection needed), beta = 0
    // If x[0] < 0: reflect to make it positive, beta = 2
    if (x[0] >= 0) {
      return { v: v.map(() => 0).map((_, i) => i === 0 ? 1 : 0), beta: 0 };
    } else {
      v[0] = 1;
      return { v, beta: 2 };
    }
  }

  const normX = Math.sqrt(x[0] * x[0] + sigma);

  // Choose sign to avoid cancellation
  if (x[0] <= 0) {
    v[0] = x[0] - normX;
  } else {
    v[0] = -sigma / (x[0] + normX);
  }

  // beta = 2 / (v^T v) with the un-normalized v
  const vTv = v[0] * v[0] + sigma; // since v[1:] = x[1:]
  const beta = 2 * v[0] * v[0] / vTv;

  // Normalize v so v[0] = 1
  const v0 = v[0];
  for (let i = n - 1; i >= 0; i--) v[i] /= v0;

  return { v, beta };
}

export const qrDecompositionEngine = new QRDecompositionEngine();
