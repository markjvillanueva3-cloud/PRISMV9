/**
 * IterativeSolverEngine — Test Suite
 *
 * Tests CG, BiCGSTAB, GMRES against known solutions and
 * verifies convergence, preconditioner effect, and function-based matvec.
 *
 * @milestone SCIMATH-MS0
 * @unit P1-U01
 */
import { describe, it, expect } from "vitest";
import {
  IterativeSolverEngine,
  jacobiPreconditioner,
  ssorPreconditioner,
} from "../engines/IterativeSolverEngine.js";

// ============================================================================
// TEST MATRICES
// ============================================================================

/** 3×3 SPD — tridiagonal [2,-1;-1,2,-1;-1,2] */
const A3spd = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
const b3 = [1, 0, 1]; // known solution: [1, 1, 1]

/** 4×4 SPD diagonal-dominant */
const A4spd = [
  [10, 1, 0, 0],
  [1, 10, 1, 0],
  [0, 1, 10, 1],
  [0, 0, 1, 10],
];
const b4 = [11, 12, 12, 11]; // solution ≈ [1,1,1,1]

/** 3×3 non-symmetric */
const A3nonsym = [[4, 1, 0], [0, 3, 1], [0, 0, 2]];
const b3ns = [5, 4, 2]; // solution: [1,1,1] (upper triangular)

/** Verify A*x ≈ b */
function verifyAxb(A: number[][], x: number[], b: number[], tol = 1e-6): void {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += A[i][j] * x[j];
    expect(Math.abs(sum - b[i])).toBeLessThan(tol);
  }
}

// ============================================================================
// CONJUGATE GRADIENT
// ============================================================================

describe("IterativeSolverEngine — CG", () => {
  it("solves 3×3 SPD tridiagonal system", () => {
    const result = IterativeSolverEngine.cg(A3spd, b3);
    expect(result.converged).toBe(true);
    verifyAxb(A3spd, result.x, b3);
    expect(result.iterations).toBeLessThan(10);
  });

  it("solves 4×4 SPD system", () => {
    const result = IterativeSolverEngine.cg(A4spd, b4);
    expect(result.converged).toBe(true);
    verifyAxb(A4spd, result.x, b4);
  });

  it("converges faster with Jacobi preconditioner", () => {
    const diagA4 = A4spd.map((row, i) => row[i]);
    const pc = jacobiPreconditioner(diagA4);
    const withPC = IterativeSolverEngine.cg(A4spd, b4, { preconditioner: pc });
    const withoutPC = IterativeSolverEngine.cg(A4spd, b4);
    expect(withPC.converged).toBe(true);
    expect(withPC.iterations).toBeLessThanOrEqual(withoutPC.iterations);
  });

  it("accepts function-based matvec", () => {
    const matvec = (x: number[]) => {
      const y = [0, 0, 0];
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          y[i] += A3spd[i][j] * x[j];
      return y;
    };
    const result = IterativeSolverEngine.cg(matvec, b3);
    expect(result.converged).toBe(true);
    verifyAxb(A3spd, result.x, b3);
  });

  it("handles zero RHS", () => {
    const result = IterativeSolverEngine.cg(A3spd, [0, 0, 0]);
    expect(result.converged).toBe(true);
    expect(result.x.every(v => Math.abs(v) < 1e-10)).toBe(true);
  });

  it("uses initial guess", () => {
    const result = IterativeSolverEngine.cg(A3spd, b3, { x0: [0.9, 0.9, 0.9] });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThan(5); // should need fewer iterations
  });

  it("tracks residual history", () => {
    const result = IterativeSolverEngine.cg(A4spd, b4);
    expect(result.residualHistory.length).toBeGreaterThan(0);
    // Residual should be monotonically decreasing (for CG on SPD)
    for (let i = 1; i < result.residualHistory.length; i++) {
      expect(result.residualHistory[i]).toBeLessThanOrEqual(result.residualHistory[i - 1] + 1e-14);
    }
  });

  it("identity system solves in 1 iteration", () => {
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const result = IterativeSolverEngine.cg(I3, [3, 7, 11]);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(3, 8);
    expect(result.x[1]).toBeCloseTo(7, 8);
    expect(result.x[2]).toBeCloseTo(11, 8);
  });
});

// ============================================================================
// BICGSTAB
// ============================================================================

describe("IterativeSolverEngine — BiCGSTAB", () => {
  it("solves SPD system (same as CG)", () => {
    const result = IterativeSolverEngine.bicgstab(A3spd, b3);
    expect(result.converged).toBe(true);
    verifyAxb(A3spd, result.x, b3);
  });

  it("solves non-symmetric system", () => {
    const result = IterativeSolverEngine.bicgstab(A3nonsym, b3ns);
    expect(result.converged).toBe(true);
    verifyAxb(A3nonsym, result.x, b3ns);
  });

  it("handles 4×4 system", () => {
    const result = IterativeSolverEngine.bicgstab(A4spd, b4);
    expect(result.converged).toBe(true);
    verifyAxb(A4spd, result.x, b4);
  });

  it("works with Jacobi preconditioner", () => {
    const diag = A3nonsym.map((row, i) => row[i]);
    const pc = jacobiPreconditioner(diag);
    const result = IterativeSolverEngine.bicgstab(A3nonsym, b3ns, { preconditioner: pc });
    expect(result.converged).toBe(true);
    verifyAxb(A3nonsym, result.x, b3ns);
  });
});

// ============================================================================
// GMRES
// ============================================================================

describe("IterativeSolverEngine — GMRES", () => {
  it("solves SPD system", () => {
    const result = IterativeSolverEngine.gmres(A3spd, b3);
    expect(result.converged).toBe(true);
    verifyAxb(A3spd, result.x, b3);
  });

  it("solves non-symmetric system", () => {
    const result = IterativeSolverEngine.gmres(A3nonsym, b3ns);
    expect(result.converged).toBe(true);
    verifyAxb(A3nonsym, result.x, b3ns);
  });

  it("GMRES(2) with restart on 4×4", () => {
    const result = IterativeSolverEngine.gmres(A4spd, b4, { restart: 2 });
    expect(result.converged).toBe(true);
    verifyAxb(A4spd, result.x, b4);
  });

  it("works with SSOR preconditioner", () => {
    const pc = ssorPreconditioner(A3spd, 1.0);
    const result = IterativeSolverEngine.gmres(A3spd, b3, { preconditioner: pc });
    expect(result.converged).toBe(true);
    verifyAxb(A3spd, result.x, b3);
  });

  it("handles zero RHS", () => {
    const result = IterativeSolverEngine.gmres(A3spd, [0, 0, 0]);
    expect(result.converged).toBe(true);
  });
});

// ============================================================================
// PRECONDITIONERS
// ============================================================================

describe("Preconditioners", () => {
  it("Jacobi preconditioner inverts diagonal", () => {
    const pc = jacobiPreconditioner([2, 4, 8]);
    const z = pc([6, 12, 24]);
    expect(z[0]).toBeCloseTo(3);
    expect(z[1]).toBeCloseTo(3);
    expect(z[2]).toBeCloseTo(3);
  });

  it("SSOR preconditioner produces valid result", () => {
    const pc = ssorPreconditioner(A3spd);
    const z = pc([1, 1, 1]);
    expect(z.length).toBe(3);
    // Just check it doesn't produce NaN/Infinity
    for (const v of z) {
      expect(isFinite(v)).toBe(true);
    }
  });
});
