/**
 * MatrixFactorizationEngine — Test Suite
 *
 * Tests NMF, CSR/CSC/COO sparse storage, matrix exponential,
 * Kronecker product, and LU decomposition.
 *
 * @milestone SCIMATH-MS0
 * @unit P0-U05
 */
import { describe, it, expect } from "vitest";
import { MatrixFactorizationEngine } from "../engines/MatrixFactorizationEngine.js";

// ============================================================================
// NMF
// ============================================================================

describe("MatrixFactorizationEngine — NMF", () => {
  it("factorizes simple non-negative matrix", () => {
    const V = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const result = MatrixFactorizationEngine.nmf(V, { rank: 2, maxIterations: 500 });
    expect(result.converged).toBe(true);
    expect(result.error).toBeLessThan(1); // rank-2 approx of rank-2 matrix should be close
    expect(result.W.length).toBe(3);
    expect(result.W[0].length).toBe(2);
    expect(result.H.length).toBe(2);
    expect(result.H[0].length).toBe(3);
  });

  it("W and H are non-negative", () => {
    const V = [[3, 1, 0], [0, 2, 4], [1, 0, 3]];
    const result = MatrixFactorizationEngine.nmf(V, { rank: 2 });
    for (const row of result.W) for (const v of row) expect(v).toBeGreaterThanOrEqual(0);
    for (const row of result.H) for (const v of row) expect(v).toBeGreaterThanOrEqual(0);
  });

  it("rank-1 NMF of rank-1 matrix is near-exact", () => {
    // V = [1,2,3]^T * [1,1,1] = [[1,1,1],[2,2,2],[3,3,3]]
    const V = [[1, 1, 1], [2, 2, 2], [3, 3, 3]];
    const result = MatrixFactorizationEngine.nmf(V, { rank: 1, maxIterations: 500 });
    expect(result.error).toBeLessThan(0.01);
  });

  it("throws on empty matrix", () => {
    expect(() => MatrixFactorizationEngine.nmf([])).toThrow("empty");
  });
});

// ============================================================================
// SPARSE STORAGE
// ============================================================================

describe("MatrixFactorizationEngine — Sparse CSR", () => {
  const A = [[1, 0, 0], [0, 2, 0], [3, 0, 4]];

  it("converts dense to CSR", () => {
    const csr = MatrixFactorizationEngine.toCSR(A);
    expect(csr.rows).toBe(3);
    expect(csr.cols).toBe(3);
    expect(csr.nnz).toBe(4);
    expect(csr.values).toEqual([1, 2, 3, 4]);
    expect(csr.colIndices).toEqual([0, 1, 0, 2]);
    expect(csr.rowPtr).toEqual([0, 1, 2, 4]);
  });

  it("CSR round-trips to dense", () => {
    const csr = MatrixFactorizationEngine.toCSR(A);
    const B = MatrixFactorizationEngine.csrToDense(csr);
    expect(B).toEqual(A);
  });

  it("CSR matvec matches dense matvec", () => {
    const x = [1, 2, 3];
    const csr = MatrixFactorizationEngine.toCSR(A);
    const y = MatrixFactorizationEngine.csrMatVec(csr, x);
    // Dense: [1*1, 2*2, 3*1+4*3] = [1, 4, 15]
    expect(y[0]).toBeCloseTo(1);
    expect(y[1]).toBeCloseTo(4);
    expect(y[2]).toBeCloseTo(15);
  });

  it("memory savings for sparse matrix", () => {
    const sparse = Array.from({ length: 100 }, (_, i) =>
      Array.from({ length: 100 }, (_, j) => i === j ? 1 : 0)
    );
    const csr = MatrixFactorizationEngine.toCSR(sparse);
    const savings = MatrixFactorizationEngine.memorySavings(csr);
    expect(savings.ratio).toBeGreaterThan(5); // 100x100 identity: dense=80KB, CSR~1.6KB
  });
});

describe("MatrixFactorizationEngine — Sparse CSC", () => {
  it("converts dense to CSC", () => {
    const A = [[1, 0], [0, 2], [3, 0]];
    const csc = MatrixFactorizationEngine.toCSC(A);
    expect(csc.rows).toBe(3);
    expect(csc.cols).toBe(2);
    expect(csc.nnz).toBe(3);
    expect(csc.values).toEqual([1, 3, 2]);
    expect(csc.rowIndices).toEqual([0, 2, 1]);
    expect(csc.colPtr).toEqual([0, 2, 3]);
  });
});

describe("MatrixFactorizationEngine — COO to CSR", () => {
  it("assembles COO with duplicates (FEM pattern)", () => {
    // Simulate FEM assembly: element 1 contributes to (0,0),(0,1),(1,0),(1,1)
    // Element 2 contributes to (1,1),(1,2),(2,1),(2,2)
    // (1,1) gets summed from both elements
    const coo = {
      rowIndices: [0, 0, 1, 1, 1, 1, 2, 2],
      colIndices: [0, 1, 0, 1, 1, 2, 1, 2],
      values:     [4, -1, -1, 2, 2, -1, -1, 4],
      rows: 3, cols: 3,
    };
    const csr = MatrixFactorizationEngine.cooToCSR(coo);
    const dense = MatrixFactorizationEngine.csrToDense(csr);
    expect(dense[0][0]).toBeCloseTo(4);
    expect(dense[0][1]).toBeCloseTo(-1);
    expect(dense[1][1]).toBeCloseTo(4); // 2+2 summed
    expect(dense[1][2]).toBeCloseTo(-1);
    expect(dense[2][2]).toBeCloseTo(4);
  });
});

// ============================================================================
// MATRIX EXPONENTIAL
// ============================================================================

describe("MatrixFactorizationEngine — Matrix Exponential", () => {
  it("exp(0) = I", () => {
    const Z = [[0, 0], [0, 0]];
    const E = MatrixFactorizationEngine.matrixExp(Z);
    expect(E[0][0]).toBeCloseTo(1, 10);
    expect(E[0][1]).toBeCloseTo(0, 10);
    expect(E[1][0]).toBeCloseTo(0, 10);
    expect(E[1][1]).toBeCloseTo(1, 10);
  });

  it("exp(diag(a,b)) = diag(e^a, e^b)", () => {
    const A = [[1, 0], [0, 2]];
    const E = MatrixFactorizationEngine.matrixExp(A);
    expect(E[0][0]).toBeCloseTo(Math.E, 4);
    expect(E[1][1]).toBeCloseTo(Math.exp(2), 4);
    expect(Math.abs(E[0][1])).toBeLessThan(1e-6);
    expect(Math.abs(E[1][0])).toBeLessThan(1e-6);
  });

  it("exp([[0,t],[-t,0]]) = rotation matrix", () => {
    const t = Math.PI / 4; // 45 degrees
    const A = [[0, t], [-t, 0]];
    const E = MatrixFactorizationEngine.matrixExp(A);
    // exp = [[cos(t), sin(t)], [-sin(t), cos(t)]]
    expect(E[0][0]).toBeCloseTo(Math.cos(t), 4);
    expect(E[0][1]).toBeCloseTo(Math.sin(t), 4);
    expect(E[1][0]).toBeCloseTo(-Math.sin(t), 4);
    expect(E[1][1]).toBeCloseTo(Math.cos(t), 4);
  });

  it("exp(1×1 matrix)", () => {
    const E = MatrixFactorizationEngine.matrixExp([[3]]);
    expect(E[0][0]).toBeCloseTo(Math.exp(3), 6);
  });

  it("exp of nilpotent: [[0,1],[0,0]] -> [[1,1],[0,1]]", () => {
    const A = [[0, 1], [0, 0]];
    const E = MatrixFactorizationEngine.matrixExp(A);
    expect(E[0][0]).toBeCloseTo(1, 8);
    expect(E[0][1]).toBeCloseTo(1, 8);
    expect(E[1][0]).toBeCloseTo(0, 8);
    expect(E[1][1]).toBeCloseTo(1, 8);
  });
});

// ============================================================================
// KRONECKER PRODUCT
// ============================================================================

describe("MatrixFactorizationEngine — Kronecker Product", () => {
  it("I2 ⊗ I2 = I4", () => {
    const I2 = [[1, 0], [0, 1]];
    const K = MatrixFactorizationEngine.kronecker(I2, I2);
    expect(K.length).toBe(4);
    expect(K[0].length).toBe(4);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        expect(K[i][j]).toBeCloseTo(i === j ? 1 : 0);
  });

  it("scalar ⊗ A = scalar * A", () => {
    const s = [[3]];
    const A = [[1, 2], [3, 4]];
    const K = MatrixFactorizationEngine.kronecker(s, A);
    expect(K).toEqual([[3, 6], [9, 12]]);
  });

  it("dimension check: (2×3) ⊗ (4×2) = (8×6)", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const B = [[1, 0], [0, 1], [1, 1], [0, 0]];
    const K = MatrixFactorizationEngine.kronecker(A, B);
    expect(K.length).toBe(8);
    expect(K[0].length).toBe(6);
  });

  it("mixed product property: (A⊗B)(C⊗D) = (AC)⊗(BD)", () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    const C = [[1, 0], [0, 1]]; // Identity — simplifies check
    const D = [[2, 1], [1, 2]];

    const lhs = matMul4(MatrixFactorizationEngine.kronecker(A, B), MatrixFactorizationEngine.kronecker(C, D));
    const rhs = MatrixFactorizationEngine.kronecker(matMul4(A, C), matMul4(B, D));

    for (let i = 0; i < lhs.length; i++)
      for (let j = 0; j < lhs[0].length; j++)
        expect(lhs[i][j]).toBeCloseTo(rhs[i][j], 8);
  });
});

// Helper for test
function matMul4(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let k = 0; k < p; k++)
      for (let j = 0; j < n; j++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

// ============================================================================
// LU DECOMPOSITION
// ============================================================================

describe("MatrixFactorizationEngine — LU Decomposition", () => {
  it("decomposes 2×2 matrix", () => {
    const A = [[2, 1], [4, 3]];
    const { L, U, permutation } = MatrixFactorizationEngine.lu(A);
    // Verify P*A = L*U
    const PA = permutation.map(i => A[i]);
    const LU = matMul4(L, U);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        expect(LU[i][j]).toBeCloseTo(PA[i][j], 10);
  });

  it("decomposes 3×3 with pivoting", () => {
    const A = [[0, 1, 2], [1, 0, 3], [4, 5, 6]];
    const { L, U, permutation } = MatrixFactorizationEngine.lu(A);
    const PA = permutation.map(i => A[i]);
    const LU = matMul4(L, U);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(LU[i][j]).toBeCloseTo(PA[i][j], 10);
  });

  it("determinant of 2×2", () => {
    const A = [[3, 7], [1, 5]];
    const det = MatrixFactorizationEngine.determinant(A);
    expect(det).toBeCloseTo(3 * 5 - 7 * 1, 10); // 8
  });

  it("determinant of singular matrix is 0", () => {
    const A = [[1, 2], [2, 4]];
    const det = MatrixFactorizationEngine.determinant(A);
    expect(Math.abs(det)).toBeLessThan(1e-10);
  });

  it("solve A*x = b", () => {
    const A = [[2, 1], [5, 3]];
    const b = [4, 7];
    const x = MatrixFactorizationEngine.solve(A, b);
    // Verify: A*x ≈ b
    for (let i = 0; i < 2; i++) {
      let sum = 0;
      for (let j = 0; j < 2; j++) sum += A[i][j] * x[j];
      expect(sum).toBeCloseTo(b[i], 8);
    }
  });
});
