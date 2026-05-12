/**
 * SparseMatrixEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P1-U02
 */
import { describe, it, expect } from "vitest";
import { SparseMatrixEngine } from "../engines/SparseMatrixEngine.js";
import { MatrixFactorizationEngine } from "../engines/MatrixFactorizationEngine.js";

// Build a 5×5 FEM-like tridiagonal SPD matrix in CSR
function fem5x5CSR() {
  const A = [
    [4, -1, 0, 0, 0],
    [-1, 4, -1, 0, 0],
    [0, -1, 4, -1, 0],
    [0, 0, -1, 4, -1],
    [0, 0, 0, -1, 4],
  ];
  return MatrixFactorizationEngine.toCSR(A);
}

// A "bad" ordering: arrowhead matrix has high bandwidth
function arrowheadCSR() {
  // Row 0 connects to all, others connect only to 0 and self
  const n = 6;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) { A[i][i] = 10; A[0][i] = 1; A[i][0] = 1; }
  A[0][0] = 10;
  return MatrixFactorizationEngine.toCSR(A);
}

describe("SparseMatrixEngine — Bandwidth & Profile", () => {
  it("bandwidth of tridiagonal = 1", () => {
    const csr = fem5x5CSR();
    expect(SparseMatrixEngine.bandwidth(csr)).toBe(1);
  });

  it("bandwidth of arrowhead = n-1", () => {
    const csr = arrowheadCSR();
    expect(SparseMatrixEngine.bandwidth(csr)).toBe(5);
  });

  it("profile of tridiagonal = n-1", () => {
    const csr = fem5x5CSR();
    expect(SparseMatrixEngine.profile(csr)).toBe(4);
  });
});

describe("SparseMatrixEngine — RCM Ordering", () => {
  it("RCM on tridiagonal keeps or improves bandwidth", () => {
    const csr = fem5x5CSR();
    const result = SparseMatrixEngine.rcmOrdering(csr);
    expect(result.bandwidthAfter).toBeLessThanOrEqual(result.bandwidthBefore);
    expect(result.permutation.length).toBe(5);
  });

  it("RCM on arrowhead reduces bandwidth", () => {
    const csr = arrowheadCSR();
    const result = SparseMatrixEngine.rcmOrdering(csr);
    // Arrowhead with node 0 connected to all has bw=5
    // RCM should reduce it
    expect(result.bandwidthAfter).toBeLessThanOrEqual(result.bandwidthBefore);
  });

  it("permutation is a valid permutation", () => {
    const csr = fem5x5CSR();
    const result = SparseMatrixEngine.rcmOrdering(csr);
    const sorted = result.permutation.slice().sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });

  it("inverse permutation is correct", () => {
    const csr = arrowheadCSR();
    const result = SparseMatrixEngine.rcmOrdering(csr);
    for (let i = 0; i < result.permutation.length; i++) {
      expect(result.inversePermutation[result.permutation[i]]).toBe(i);
    }
  });
});

describe("SparseMatrixEngine — Permute CSR", () => {
  it("permuted matrix preserves structure", () => {
    const csr = fem5x5CSR();
    const { permutation } = SparseMatrixEngine.rcmOrdering(csr);
    const permuted = SparseMatrixEngine.permuteCSR(csr, permutation);
    expect(permuted.rows).toBe(5);
    expect(permuted.cols).toBe(5);
    expect(permuted.nnz).toBe(csr.nnz);
  });

  it("permuted matrix has correct values", () => {
    const A = [[4, -1, 0], [-1, 4, -1], [0, -1, 4]];
    const csr = MatrixFactorizationEngine.toCSR(A);
    const perm = [2, 1, 0]; // reverse order
    const permuted = SparseMatrixEngine.permuteCSR(csr, perm);
    const dense = MatrixFactorizationEngine.csrToDense(permuted);
    // PAP^T with reverse perm should give same tridiagonal
    expect(dense[0][0]).toBeCloseTo(4);
    expect(dense[0][1]).toBeCloseTo(-1);
    expect(dense[1][1]).toBeCloseTo(4);
  });
});

describe("SparseMatrixEngine — SpMM", () => {
  it("identity * A = A", () => {
    const I = MatrixFactorizationEngine.toCSR([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    const A = MatrixFactorizationEngine.toCSR([[1, 2], [3, 4], [5, 6]]);
    const C = SparseMatrixEngine.spMM(I, A);
    const dense = MatrixFactorizationEngine.csrToDense(C);
    expect(dense[0][0]).toBeCloseTo(1);
    expect(dense[1][1]).toBeCloseTo(4);
    expect(dense[2][0]).toBeCloseTo(5);
  });

  it("A * A^T is symmetric", () => {
    const A = MatrixFactorizationEngine.toCSR([[1, 2], [3, 0], [0, 4]]);
    const At = SparseMatrixEngine.transpose(A);
    const AAt = SparseMatrixEngine.spMM(A, At);
    const dense = MatrixFactorizationEngine.csrToDense(AAt);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(dense[i][j]).toBeCloseTo(dense[j][i]);
  });
});

describe("SparseMatrixEngine — Transpose", () => {
  it("transposes rectangular matrix", () => {
    const A = MatrixFactorizationEngine.toCSR([[1, 0, 3], [0, 2, 0]]);
    const At = SparseMatrixEngine.transpose(A);
    expect(At.rows).toBe(3);
    expect(At.cols).toBe(2);
    const dense = MatrixFactorizationEngine.csrToDense(At);
    expect(dense[0][0]).toBeCloseTo(1);
    expect(dense[2][0]).toBeCloseTo(3);
    expect(dense[1][1]).toBeCloseTo(2);
  });

  it("double transpose = original", () => {
    const A = MatrixFactorizationEngine.toCSR([[1, 0, 2], [0, 3, 0], [4, 0, 5]]);
    const Att = SparseMatrixEngine.transpose(SparseMatrixEngine.transpose(A));
    const orig = MatrixFactorizationEngine.csrToDense(A);
    const roundtrip = MatrixFactorizationEngine.csrToDense(Att);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(roundtrip[i][j]).toBeCloseTo(orig[i][j]);
  });
});

describe("SparseMatrixEngine — Sparsity", () => {
  it("identity has high sparsity", () => {
    const I100 = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 10 }, (_, j) => i === j ? 1 : 0)
    );
    const csr = MatrixFactorizationEngine.toCSR(I100);
    expect(SparseMatrixEngine.sparsity(csr)).toBeCloseTo(0.9);
  });

  it("full matrix has zero sparsity", () => {
    const F = [[1, 2], [3, 4]];
    const csr = MatrixFactorizationEngine.toCSR(F);
    expect(SparseMatrixEngine.sparsity(csr)).toBeCloseTo(0);
  });
});
