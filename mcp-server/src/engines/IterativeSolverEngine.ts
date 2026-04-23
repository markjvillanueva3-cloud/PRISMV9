/**
 * IterativeSolverEngine — Krylov Subspace Solvers
 *
 * Solves A*x = b iteratively for large/sparse systems where direct methods are too expensive.
 *
 * Capabilities:
 *   - Conjugate Gradient (CG) for symmetric positive-definite systems
 *   - BiCGSTAB for general non-symmetric systems
 *   - GMRES(m) with restart for general systems
 *   - Preconditioner interface (Jacobi, SSOR built-in)
 *   - Convergence history tracking (residual per iteration)
 *
 * Used by: FEM large systems, iterative refinement, sparse least-squares,
 *   thermal/structural equilibrium solvers.
 *
 * References:
 *   - Saad, "Iterative Methods for Sparse Linear Systems" 2nd ed. (2003)
 *   - Barrett et al., "Templates for the Solution of Linear Systems" (1994)
 *   - Golub & Van Loan, "Matrix Computations" 4th ed., Chapter 11
 *
 * @engine IterativeSolverEngine
 * @milestone SCIMATH-MS0
 * @unit P1-U01
 * @courses MIT 18.335, MIT 18.085
 */

// ============================================================================
// TYPES
// ============================================================================

/** Matrix-vector product function: y = A*x */
export type MatVecFn = (x: number[]) => number[];

/** Preconditioner: solves M*z = r approximately */
export type PreconditionerFn = (r: number[]) => number[];

/** Result of iterative solve */
export interface IterativeSolveResult {
  /** Solution vector */
  x: number[];
  /** Final relative residual ||b - Ax|| / ||b|| */
  relativeResidual: number;
  /** Number of iterations performed */
  iterations: number;
  /** Whether convergence was achieved */
  converged: boolean;
  /** Residual history (relative residual at each iteration) */
  residualHistory: number[];
}

/** Options for iterative solvers */
export interface IterativeSolverOptions {
  /** Maximum iterations (default 1000) */
  maxIterations?: number;
  /** Convergence tolerance on relative residual (default 1e-10) */
  tolerance?: number;
  /** Initial guess x0 (default: zero vector) */
  x0?: number[];
  /** Preconditioner function */
  preconditioner?: PreconditionerFn;
  /** Restart parameter for GMRES (default 30) */
  restart?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

import { EPS_MACHINE } from "../physics/constants.js";
const EPS = EPS_MACHINE;

// ============================================================================
// VECTOR HELPERS
// ============================================================================

function vecDot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function vecNorm(x: number[]): number {
  return Math.sqrt(vecDot(x, x));
}

function vecAxpy(a: number, x: number[], y: number[]): number[] {
  // y + a*x
  return y.map((yi, i) => yi + a * x[i]);
}

function vecSub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function vecScale(x: number[], s: number): number[] {
  return x.map(v => v * s);
}

function vecCopy(x: number[]): number[] {
  return x.slice();
}

// ============================================================================
// PRECONDITIONERS
// ============================================================================

/**
 * Jacobi (diagonal) preconditioner: M = diag(A).
 * Cheapest preconditioner, effective when A is diagonally dominant.
 */
export function jacobiPreconditioner(diag: number[]): PreconditionerFn {
  return (r: number[]) => r.map((ri, i) =>
    Math.abs(diag[i]) > EPS ? ri / diag[i] : ri
  );
}

/**
 * SSOR preconditioner: M = (D + omega*L) * D^{-1} * (D + omega*U)
 * More effective than Jacobi for elliptic PDEs. omega=1 gives symmetric Gauss-Seidel.
 *
 * @param A Dense matrix (for simplicity; sparse version would use CSR)
 * @param omega Relaxation parameter (default 1.0)
 */
export function ssorPreconditioner(A: number[][], omega: number = 1.0): PreconditionerFn {
  const n = A.length;
  return (r: number[]) => {
    const z = new Array(n).fill(0);

    // Forward sweep: (D + omega*L) * z_half = omega * r
    const zHalf = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = omega * r[i];
      for (let j = 0; j < i; j++) sum -= omega * A[i][j] * zHalf[j];
      zHalf[i] = Math.abs(A[i][i]) > EPS ? sum / A[i][i] : sum;
    }

    // Scale: z_mid = D * z_half / omega
    const zMid = zHalf.map((v, i) => A[i][i] * v / omega);

    // Backward sweep: (D + omega*U) * z = omega * z_mid
    for (let i = n - 1; i >= 0; i--) {
      let sum = omega * zMid[i];
      for (let j = i + 1; j < n; j++) sum -= omega * A[i][j] * z[j];
      z[i] = Math.abs(A[i][i]) > EPS ? sum / A[i][i] : sum;
    }

    return z;
  };
}

// ============================================================================
// ITERATIVE SOLVER ENGINE
// ============================================================================

export class IterativeSolverEngine {

  /**
   * Conjugate Gradient (CG) for symmetric positive-definite A*x = b.
   *
   * Algorithm (Hestenes & Stiefel 1952, per Saad Algorithm 6.18):
   *   r = b - A*x; z = M^{-1}*r; p = z
   *   repeat: alpha = (r,z)/(p,A*p); x += alpha*p; r -= alpha*A*p
   *           z = M^{-1}*r; beta = (r_new,z_new)/(r_old,z_old); p = z + beta*p
   *
   * @param matvec Matrix-vector product function (or dense matrix)
   * @param b Right-hand side vector
   * @param options Solver options
   * @returns IterativeSolveResult
   */
  static cg(
    matvec: MatVecFn | number[][],
    b: number[],
    options: IterativeSolverOptions = {}
  ): IterativeSolveResult {
    const mv = typeof matvec === "function" ? matvec : (x: number[]) => denseMatVec(matvec, x);
    const n = b.length;
    const maxIter = options.maxIterations ?? 1000;
    const tol = options.tolerance ?? 1e-10;
    const pc = options.preconditioner ?? ((r: number[]) => r);

    const x = options.x0 ? vecCopy(options.x0) : new Array(n).fill(0);
    let r = vecSub(b, mv(x));
    const bnorm = vecNorm(b);
    if (bnorm < EPS) return { x, relativeResidual: 0, iterations: 0, converged: true, residualHistory: [0] };

    let z = pc(r);
    let p = vecCopy(z);
    let rzOld = vecDot(r, z);
    const history: number[] = [];

    let iter = 0;
    for (iter = 0; iter < maxIter; iter++) {
      const relRes = vecNorm(r) / bnorm;
      history.push(relRes);
      if (relRes < tol) {
        return { x, relativeResidual: relRes, iterations: iter, converged: true, residualHistory: history };
      }

      const Ap = mv(p);
      const pAp = vecDot(p, Ap);
      if (Math.abs(pAp) < EPS) break; // breakdown

      const alpha = rzOld / pAp;
      for (let i = 0; i < n; i++) x[i] += alpha * p[i];
      for (let i = 0; i < n; i++) r[i] -= alpha * Ap[i];

      z = pc(r);
      const rzNew = vecDot(r, z);
      const beta = rzNew / (rzOld + EPS);
      for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
      rzOld = rzNew;
    }

    const finalRes = vecNorm(r) / bnorm;
    history.push(finalRes);
    return { x, relativeResidual: finalRes, iterations: iter, converged: finalRes < tol, residualHistory: history };
  }

  /**
   * BiCGSTAB for general (non-symmetric) A*x = b.
   *
   * Algorithm (van der Vorst 1992, per Saad Algorithm 7.7):
   *   Combines bi-conjugate gradient with GMRES-like stabilization.
   *   More robust than plain BiCG, avoids transpose of A.
   *
   * @param matvec Matrix-vector product function (or dense matrix)
   * @param b Right-hand side
   * @param options Solver options
   * @returns IterativeSolveResult
   */
  static bicgstab(
    matvec: MatVecFn | number[][],
    b: number[],
    options: IterativeSolverOptions = {}
  ): IterativeSolveResult {
    const mv = typeof matvec === "function" ? matvec : (x: number[]) => denseMatVec(matvec, x);
    const n = b.length;
    const maxIter = options.maxIterations ?? 1000;
    const tol = options.tolerance ?? 1e-10;
    const pc = options.preconditioner ?? ((r: number[]) => r);

    const x = options.x0 ? vecCopy(options.x0) : new Array(n).fill(0);
    let r = vecSub(b, mv(x));
    const bnorm = vecNorm(b);
    if (bnorm < EPS) return { x, relativeResidual: 0, iterations: 0, converged: true, residualHistory: [0] };

    const r0hat = vecCopy(r); // shadow residual (fixed)
    let rho = 1, alpha = 1, omega = 1;
    let v = new Array(n).fill(0);
    let p = new Array(n).fill(0);
    const history: number[] = [];

    let iter = 0;
    for (iter = 0; iter < maxIter; iter++) {
      const relRes = vecNorm(r) / bnorm;
      history.push(relRes);
      if (relRes < tol) {
        return { x, relativeResidual: relRes, iterations: iter, converged: true, residualHistory: history };
      }

      const rhoNew = vecDot(r0hat, r);
      if (Math.abs(rhoNew) < EPS) break; // breakdown

      const beta = (rhoNew / (rho + EPS)) * (alpha / (omega + EPS));
      // p = r + beta*(p - omega*v)
      for (let i = 0; i < n; i++) p[i] = r[i] + beta * (p[i] - omega * v[i]);

      // v = A * M^{-1} * p
      const pHat = pc(p);
      v = mv(pHat);

      alpha = rhoNew / (vecDot(r0hat, v) + EPS);

      // s = r - alpha*v
      const s = vecAxpy(-alpha, v, r);
      const sNorm = vecNorm(s);

      if (sNorm / bnorm < tol) {
        // Early convergence
        for (let i = 0; i < n; i++) x[i] += alpha * pHat[i];
        const finalRes = sNorm / bnorm;
        history.push(finalRes);
        return { x, relativeResidual: finalRes, iterations: iter + 1, converged: true, residualHistory: history };
      }

      // t = A * M^{-1} * s
      const sHat = pc(s);
      const t = mv(sHat);

      omega = vecDot(t, s) / (vecDot(t, t) + EPS);

      // x = x + alpha*pHat + omega*sHat
      for (let i = 0; i < n; i++) x[i] += alpha * pHat[i] + omega * sHat[i];

      // r = s - omega*t
      r = vecAxpy(-omega, t, s);

      rho = rhoNew;
    }

    const finalRes = vecNorm(r) / bnorm;
    history.push(finalRes);
    return { x, relativeResidual: finalRes, iterations: iter, converged: finalRes < tol, residualHistory: history };
  }

  /**
   * GMRES(m) — Generalized Minimal Residual with restart.
   *
   * Algorithm (Saad & Schultz 1986, per Saad Algorithm 6.9):
   *   Builds orthonormal Krylov basis via Arnoldi; minimizes ||b - Ax||
   *   over the Krylov subspace. Restarts every m iterations.
   *
   * @param matvec Matrix-vector product function (or dense matrix)
   * @param b Right-hand side
   * @param options Solver options (restart = m)
   * @returns IterativeSolveResult
   */
  static gmres(
    matvec: MatVecFn | number[][],
    b: number[],
    options: IterativeSolverOptions = {}
  ): IterativeSolveResult {
    const mv = typeof matvec === "function" ? matvec : (x: number[]) => denseMatVec(matvec, x);
    const n = b.length;
    const maxIter = options.maxIterations ?? 1000;
    const tol = options.tolerance ?? 1e-10;
    const pc = options.preconditioner ?? ((r: number[]) => r);
    const m = options.restart ?? 30;

    let x = options.x0 ? vecCopy(options.x0) : new Array(n).fill(0);
    const bnorm = vecNorm(b);
    if (bnorm < EPS) return { x, relativeResidual: 0, iterations: 0, converged: true, residualHistory: [0] };

    const history: number[] = [];
    let totalIter = 0;

    // Outer loop: restarts
    while (totalIter < maxIter) {
      let r = pc(vecSub(b, mv(x)));
      const beta = vecNorm(r);
      const relRes = beta / bnorm;
      history.push(relRes);
      if (relRes < tol) {
        return { x, relativeResidual: relRes, iterations: totalIter, converged: true, residualHistory: history };
      }

      // Arnoldi process
      const V: number[][] = [vecScale(r, 1 / beta)]; // orthonormal basis
      const H: number[][] = []; // upper Hessenberg
      const cs: number[] = []; // Givens cosines
      const sn: number[] = []; // Givens sines
      const g = [beta]; // right-hand side for least squares

      let innerIter = 0;
      for (innerIter = 0; innerIter < Math.min(m, maxIter - totalIter); innerIter++) {
        // w = A * M^{-1} * V[j]
        const w = mv(pc(V[innerIter]));

        // Orthogonalize: modified Gram-Schmidt
        const h = new Array(innerIter + 2).fill(0);
        let wCopy = vecCopy(w);
        for (let i = 0; i <= innerIter; i++) {
          h[i] = vecDot(wCopy, V[i]);
          wCopy = vecAxpy(-h[i], V[i], wCopy);
        }
        h[innerIter + 1] = vecNorm(wCopy);
        H.push(h);

        // Apply previous Givens rotations to h
        for (let i = 0; i < innerIter; i++) {
          const temp = cs[i] * h[i] + sn[i] * h[i + 1];
          h[i + 1] = -sn[i] * h[i] + cs[i] * h[i + 1];
          h[i] = temp;
        }

        // Compute new Givens rotation to zero h[j+1]
        const hj = h[innerIter], hjp1 = h[innerIter + 1];
        const rr = Math.sqrt(hj * hj + hjp1 * hjp1);
        if (rr > EPS) {
          cs.push(hj / rr);
          sn.push(hjp1 / rr);
        } else {
          cs.push(1);
          sn.push(0);
        }

        h[innerIter] = cs[innerIter] * hj + sn[innerIter] * hjp1;
        h[innerIter + 1] = 0;

        // Update g
        g.push(-sn[innerIter] * g[innerIter]);
        g[innerIter] *= cs[innerIter];

        const innerRelRes = Math.abs(g[innerIter + 1]) / bnorm;
        history.push(innerRelRes);
        totalIter++;

        if (innerRelRes < tol || h[innerIter + 1] < EPS) {
          innerIter++;
          break;
        }

        // New basis vector
        if (h[innerIter + 1] > EPS) {
          V.push(vecScale(wCopy, 1 / h[innerIter + 1]));
        } else {
          break;
        }
      }

      // Back-substitution: solve upper-triangular (Givens-rotated H) * y = g
      // H is stored column-wise: H[k][i] = entry at row i, column k
      const j = innerIter;
      const y = new Array(j).fill(0);
      for (let i = j - 1; i >= 0; i--) {
        let sum = g[i];
        for (let k = i + 1; k < j; k++) sum -= H[k][i] * y[k];
        y[i] = Math.abs(H[i][i]) > EPS ? sum / H[i][i] : 0;
      }

      // Update solution: x = x + V * y (using preconditioner)
      for (let i = 0; i < j; i++) {
        const pv = pc(V[i]);
        for (let k = 0; k < n; k++) x[k] += y[i] * pv[k];
      }
    }

    const r = vecSub(b, mv(x));
    const finalRes = vecNorm(r) / bnorm;
    return { x, relativeResidual: finalRes, iterations: totalIter, converged: finalRes < tol, residualHistory: history };
  }
}

// ============================================================================
// HELPER
// ============================================================================

function denseMatVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const y = new Array(m).fill(0);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < x.length; j++)
      y[i] += A[i][j] * x[j];
  return y;
}

export const iterativeSolverEngine = new IterativeSolverEngine();
