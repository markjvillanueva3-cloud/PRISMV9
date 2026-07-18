/**
 * EigensolverEngine — Comprehensive Test Suite
 *
 * Tests power iteration, inverse iteration, symmetric QR, Lanczos,
 * and generalized eigenvalue against known analytical results.
 *
 * @milestone SCIMATH-MS0
 * @unit P0-U04
 */
import { describe, it, expect } from "vitest";
import { EigensolverEngine } from "../engines/EigensolverEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

/** Check eigenpair: A*v ≈ lambda*v */
function verifyEigenPair(A: number[][], eigenvalue: number, eigenvector: number[], tol = 1e-8): void {
  const n = A.length;
  const Av = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      Av[i] += A[i][j] * eigenvector[j];
  const lambdaV = eigenvector.map(v => v * eigenvalue);
  for (let i = 0; i < n; i++) {
    expect(Math.abs(Av[i] - lambdaV[i])).toBeLessThan(tol * (Math.abs(eigenvalue) + 1));
  }
}

/** Check vector is unit length */
function verifyUnitVector(v: number[], tol = 1e-10): void {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  expect(Math.abs(norm - 1)).toBeLessThan(tol);
}

/** Check orthogonality of eigenvectors */
function verifyOrthogonal(V: number[][], i: number, j: number, tol = 1e-8): void {
  const n = V.length;
  let dot = 0;
  for (let r = 0; r < n; r++) dot += V[r][i] * V[r][j];
  expect(Math.abs(dot)).toBeLessThan(tol);
}

// ============================================================================
// TEST MATRICES WITH KNOWN EIGENVALUES
// ============================================================================

/** 2×2 with eigenvalues 1, 3 */
const A2 = [[2, 1], [1, 2]];

/** 3×3 diagonal — eigenvalues are the diagonal entries */
const A3diag = [[5, 0, 0], [0, 3, 0], [0, 0, 1]];

/** 3×3 symmetric — eigenvalues: 6, 3, 0 */
const A3sym = [[2, 2, 2], [2, 2, 2], [2, 2, 2]]; // rank 1, eigenvalues: 6, 0, 0

/** 4×4 symmetric tridiagonal — Toeplitz [2, -1; -1, 2, -1; ...] */
const A4tri = [
  [2, -1, 0, 0],
  [-1, 2, -1, 0],
  [0, -1, 2, -1],
  [0, 0, -1, 2],
];
// Known eigenvalues: 2 - 2*cos(k*pi/5) for k=1..4
const A4triEigenvalues = [1, 2, 3, 4].map(k => 2 - 2 * Math.cos(k * Math.PI / 5));

/** 3×3 Hilbert matrix — known to be ill-conditioned */
const hilbert3 = [
  [1, 1/2, 1/3],
  [1/2, 1/3, 1/4],
  [1/3, 1/4, 1/5],
];

/** 5×5 identity — all eigenvalues = 1 */
const I5 = Array.from({ length: 5 }, (_, i) =>
  Array.from({ length: 5 }, (_, j) => i === j ? 1 : 0)
);

// ============================================================================
// POWER ITERATION
// ============================================================================

describe("EigensolverEngine — Power Iteration", () => {
  it("finds dominant eigenvalue of 2×2 symmetric", () => {
    const result = EigensolverEngine.powerIteration(A2);
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(3, 8);
    verifyUnitVector(result.eigenvector);
    verifyEigenPair(A2, result.eigenvalue, result.eigenvector, 1e-6);
  });

  it("finds dominant eigenvalue of 3×3 diagonal", () => {
    const result = EigensolverEngine.powerIteration(A3diag);
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(5, 8);
  });

  it("finds dominant eigenvalue of rank-1 matrix", () => {
    const result = EigensolverEngine.powerIteration(A3sym);
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(6, 6);
  });

  it("handles identity matrix", () => {
    const result = EigensolverEngine.powerIteration(I5);
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(1, 8);
  });

  it("handles 1×1 matrix", () => {
    const result = EigensolverEngine.powerIteration([[7.5]]);
    expect(result.eigenvalue).toBeCloseTo(7.5, 8);
  });

  it("throws on empty matrix", () => {
    expect(() => EigensolverEngine.powerIteration([])).toThrow("empty matrix");
  });
});

// ============================================================================
// INVERSE ITERATION
// ============================================================================

describe("EigensolverEngine — Inverse Iteration", () => {
  it("finds eigenvalue nearest shift=0 for 2×2", () => {
    const result = EigensolverEngine.inverseIteration(A2, { shift: 0.5 });
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(1, 6);
  });

  it("finds eigenvalue nearest shift=2.8 for 2×2", () => {
    const result = EigensolverEngine.inverseIteration(A2, { shift: 2.8 });
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(3, 6);
  });

  it("finds smallest eigenvalue of diagonal matrix", () => {
    const result = EigensolverEngine.inverseIteration(A3diag, { shift: 0.5 });
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(1, 6);
  });

  it("finds middle eigenvalue of diagonal matrix", () => {
    const result = EigensolverEngine.inverseIteration(A3diag, { shift: 3.1 });
    expect(result.converged).toBe(true);
    expect(result.eigenvalue).toBeCloseTo(3, 6);
  });
});

// ============================================================================
// SYMMETRIC QR ALGORITHM
// ============================================================================

describe("EigensolverEngine — Symmetric QR", () => {
  it("decomposes 2×2 symmetric matrix", () => {
    const result = EigensolverEngine.symmetricQR(A2);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(3, 8);
    expect(sorted[1]).toBeCloseTo(1, 8);

    // Verify eigenpairs
    for (let j = 0; j < 2; j++) {
      const v = [result.eigenvectors[0][j], result.eigenvectors[1][j]];
      verifyEigenPair(A2, result.eigenvalues[j], v);
      verifyUnitVector(v);
    }
  });

  it("decomposes 3×3 diagonal — eigenvalues match diagonal", () => {
    const result = EigensolverEngine.symmetricQR(A3diag);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(5, 8);
    expect(sorted[1]).toBeCloseTo(3, 8);
    expect(sorted[2]).toBeCloseTo(1, 8);
  });

  it("decomposes rank-1 matrix — one nonzero eigenvalue", () => {
    const result = EigensolverEngine.symmetricQR(A3sym);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(6, 6);
    expect(Math.abs(sorted[1])).toBeLessThan(1e-6);
    expect(Math.abs(sorted[2])).toBeLessThan(1e-6);
  });

  it("decomposes 4×4 tridiagonal Toeplitz — analytical eigenvalues", () => {
    const result = EigensolverEngine.symmetricQR(A4tri);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => a - b);
    const expected = A4triEigenvalues.sort((a, b) => a - b);
    for (let i = 0; i < 4; i++) {
      expect(sorted[i]).toBeCloseTo(expected[i], 6);
    }
  });

  it("handles identity matrix — all eigenvalues = 1", () => {
    const result = EigensolverEngine.symmetricQR(I5);
    expect(result.converged).toBe(true);
    for (const ev of result.eigenvalues) {
      expect(ev).toBeCloseTo(1, 8);
    }
  });

  it("handles 1×1 matrix", () => {
    const result = EigensolverEngine.symmetricQR([[42]]);
    expect(result.converged).toBe(true);
    expect(result.eigenvalues[0]).toBeCloseTo(42, 10);
  });

  it("eigenvectors are orthonormal for 4×4", () => {
    const result = EigensolverEngine.symmetricQR(A4tri);
    // Check orthogonality of distinct eigenvectors
    for (let i = 0; i < 4; i++) {
      const v = Array.from({ length: 4 }, (_, r) => result.eigenvectors[r][i]);
      verifyUnitVector(v, 1e-6);
      for (let j = i + 1; j < 4; j++) {
        verifyOrthogonal(result.eigenvectors, i, j, 1e-6);
      }
    }
  });

  it("decomposes Hilbert 3×3 (ill-conditioned)", () => {
    const result = EigensolverEngine.symmetricQR(hilbert3);
    expect(result.converged).toBe(true);
    // Known: eigenvalues ≈ 1.4083, 0.1223, 0.002687
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(1.4083, 3);
    expect(sorted[1]).toBeCloseTo(0.1223, 3);
    expect(sorted[2]).toBeCloseTo(0.002687, 4);
  });

  it("handles negative eigenvalues", () => {
    const A = [[0, 1], [1, 0]]; // eigenvalues: 1, -1
    const result = EigensolverEngine.symmetricQR(A);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(1, 8);
    expect(sorted[1]).toBeCloseTo(-1, 8);
  });

  it("reconstructs A = Q * diag(lambda) * Q^T for 3×3", () => {
    const A = [[4, 1, 1], [1, 3, 0], [1, 0, 2]];
    const result = EigensolverEngine.symmetricQR(A);
    const n = 3;
    // Reconstruct: A_recon = Q * diag(lambda) * Q^T
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += result.eigenvectors[i][k] * result.eigenvalues[k] * result.eigenvectors[j][k];
        }
        expect(sum).toBeCloseTo(A[i][j], 6);
      }
    }
  });
});

// ============================================================================
// LANCZOS
// ============================================================================

describe("EigensolverEngine — Lanczos", () => {
  it("finds top eigenvalue of 4×4 tridiagonal", () => {
    const result = EigensolverEngine.lanczos(A4tri, 4, { numEigenvalues: 2 });
    expect(result.converged).toBe(true);
    const maxExpected = Math.max(...A4triEigenvalues);
    // Should find the largest eigenvalue
    expect(Math.abs(result.eigenvalues[0])).toBeCloseTo(maxExpected, 4);
  });

  it("accepts function-based matvec", () => {
    const matvec = (x: number[]): number[] => {
      // A = diag(10, 5, 1)
      return [10 * x[0], 5 * x[1], 1 * x[2]];
    };
    const result = EigensolverEngine.lanczos(matvec, 3, { numEigenvalues: 2 });
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(10, 4);
  });

  it("handles identity matrix", () => {
    const result = EigensolverEngine.lanczos(I5, 5, { numEigenvalues: 3 });
    for (const ev of result.eigenvalues) {
      expect(ev).toBeCloseTo(1, 6);
    }
  });
});

// ============================================================================
// GENERALIZED EIGENVALUE
// ============================================================================

describe("EigensolverEngine — Generalized Eigenvalue", () => {
  it("solves A*x = lambda*B*x with B = I (reduces to standard)", () => {
    const B = [[1, 0], [0, 1]];
    const result = EigensolverEngine.generalizedEigen(A2, B);
    expect(result.converged).toBe(true);
    expect(result.bFactored).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(3, 6);
    expect(sorted[1]).toBeCloseTo(1, 6);
  });

  it("solves A*x = lambda*B*x with non-identity SPD B", () => {
    const A = [[6, 2], [2, 4]];
    const B = [[2, 0], [0, 2]]; // B = 2I, so generalized eigenvalues = standard / 2
    const result = EigensolverEngine.generalizedEigen(A, B);
    expect(result.converged).toBe(true);
    expect(result.bFactored).toBe(true);
    // Standard eigenvalues of A: 2, 8 → generalized: 1, 4 (approximately)
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    // A has eigenvalues ~6.83 and ~3.17, divided by 2: ~3.41 and ~1.59
    // Let's just verify the eigenpair identity: A*x = lambda*B*x
    for (let j = 0; j < 2; j++) {
      const x = [result.eigenvectors[0][j], result.eigenvectors[1][j]];
      const lambda = result.eigenvalues[j];
      const Ax = [A[0][0]*x[0] + A[0][1]*x[1], A[1][0]*x[0] + A[1][1]*x[1]];
      const Bx = [B[0][0]*x[0] + B[0][1]*x[1], B[1][0]*x[0] + B[1][1]*x[1]];
      for (let i = 0; i < 2; i++) {
        expect(Ax[i]).toBeCloseTo(lambda * Bx[i], 6);
      }
    }
  });

  it("returns bFactored=false when B is not SPD", () => {
    const A = [[1, 0], [0, 1]];
    const B = [[1, 2], [2, 1]]; // eigenvalues 3, -1 → not SPD
    const result = EigensolverEngine.generalizedEigen(A, B);
    expect(result.bFactored).toBe(false);
  });
});

// ============================================================================
// SPECTRAL RADIUS
// ============================================================================

describe("EigensolverEngine — Spectral Radius", () => {
  it("spectral radius of diagonal matrix", () => {
    const rho = EigensolverEngine.spectralRadius(A3diag);
    expect(rho).toBeCloseTo(5, 6);
  });

  it("spectral radius of identity", () => {
    const rho = EigensolverEngine.spectralRadius(I5);
    expect(rho).toBeCloseTo(1, 6);
  });
});

// ============================================================================
// EIGENVALUES ONLY
// ============================================================================

describe("EigensolverEngine — Eigenvalues Only", () => {
  it("returns eigenvalues without eigenvectors", () => {
    const result = EigensolverEngine.eigenvaluesOnly(A4tri);
    expect(result.converged).toBe(true);
    expect(result.eigenvalues.length).toBe(4);
    const sorted = result.eigenvalues.slice().sort((a, b) => a - b);
    const expected = A4triEigenvalues.sort((a, b) => a - b);
    for (let i = 0; i < 4; i++) {
      expect(sorted[i]).toBeCloseTo(expected[i], 6);
    }
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("EigensolverEngine — Edge Cases", () => {
  it("handles zero matrix", () => {
    const Z = [[0, 0], [0, 0]];
    const result = EigensolverEngine.symmetricQR(Z);
    expect(result.converged).toBe(true);
    for (const ev of result.eigenvalues) {
      expect(Math.abs(ev)).toBeLessThan(1e-10);
    }
  });

  it("handles large diagonal spread", () => {
    const A = [[1e6, 0, 0], [0, 1, 0], [0, 0, 1e-6]];
    const result = EigensolverEngine.symmetricQR(A);
    expect(result.converged).toBe(true);
    const sorted = result.eigenvalues.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(1e6, 0);
    expect(sorted[1]).toBeCloseTo(1, 6);
    expect(sorted[2]).toBeCloseTo(1e-6, 12);
  });

  it("handles negative-definite matrix", () => {
    const A = [[-4, -1], [-1, -3]]; // eigenvalues: -2.38, -4.62 approximately
    const result = EigensolverEngine.symmetricQR(A);
    expect(result.converged).toBe(true);
    for (const ev of result.eigenvalues) {
      expect(ev).toBeLessThan(0);
    }
  });
});
