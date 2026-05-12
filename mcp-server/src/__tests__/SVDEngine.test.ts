import { describe, it, expect, beforeEach } from "vitest";
import { SVDEngine } from "../engines/SVDEngine.js";

describe("SVDEngine", () => {
  // SVDEngine uses static methods — no instance needed

  // ── Helper: check A ≈ U * diag(sigma) * V^T ──
  function reconstructAndCompare(A: number[][], U: number[][], sigma: number[], V: number[][], tol = 1e-6) {
    const m = A.length, n = A[0].length;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let val = 0;
        for (let k = 0; k < sigma.length; k++) {
          val += U[i][k] * sigma[k] * V[j][k];
        }
        expect(val).toBeCloseTo(A[i][j], 4);
      }
    }
  }

  describe("Full SVD", () => {
    it("decomposes a 2x2 identity matrix", () => {
      const A = [[1, 0], [0, 1]];
      const { sigma, rank, conditionNumber } = SVDEngine.decompose(A);
      expect(sigma).toHaveLength(2);
      expect(sigma[0]).toBeCloseTo(1, 8);
      expect(sigma[1]).toBeCloseTo(1, 8);
      expect(rank).toBe(2);
      expect(conditionNumber).toBeCloseTo(1, 8);
    });

    it("decomposes a 2x2 diagonal matrix", () => {
      const A = [[3, 0], [0, 5]];
      const { U, sigma, V, rank } = SVDEngine.decompose(A);
      expect(sigma[0]).toBeCloseTo(5, 6);
      expect(sigma[1]).toBeCloseTo(3, 6);
      expect(rank).toBe(2);
      reconstructAndCompare(A, U, sigma, V);
    });

    it("decomposes a 3x2 tall matrix", () => {
      const A = [[1, 2], [3, 4], [5, 6]];
      const { U, sigma, V, rank } = SVDEngine.decompose(A);
      expect(sigma).toHaveLength(2);
      expect(rank).toBe(2);
      expect(sigma[0]).toBeGreaterThan(sigma[1]);
      reconstructAndCompare(A, U, sigma, V);
    });

    it("decomposes a 2x3 wide matrix", () => {
      const A = [[1, 2, 3], [4, 5, 6]];
      const { U, sigma, V, rank } = SVDEngine.decompose(A);
      expect(sigma).toHaveLength(2);
      expect(rank).toBe(2);
      reconstructAndCompare(A, U, sigma, V);
    });

    it("detects rank-1 matrix", () => {
      // Rank 1: [1,2; 2,4] = [1;2] * [1,2]
      const A = [[1, 2], [2, 4]];
      const { sigma, rank } = SVDEngine.decompose(A);
      expect(rank).toBe(1);
      expect(sigma[0]).toBeGreaterThan(1);
      expect(sigma[1]).toBeCloseTo(0, 8);
    });

    it("handles zero matrix", () => {
      const A = [[0, 0], [0, 0]];
      const { sigma, rank, conditionNumber } = SVDEngine.decompose(A);
      expect(rank).toBe(0);
      expect(sigma[0]).toBeCloseTo(0, 10);
      expect(conditionNumber).toBe(Infinity);
    });

    it("handles 1x1 matrix", () => {
      const { sigma, rank } = SVDEngine.decompose([[7]]);
      expect(sigma[0]).toBeCloseTo(7, 8);
      expect(rank).toBe(1);
    });

    it("decomposes a 4x4 symmetric matrix", () => {
      const A = [
        [2, -1, 0, 0],
        [-1, 2, -1, 0],
        [0, -1, 2, -1],
        [0, 0, -1, 2],
      ];
      const { U, sigma, V, rank } = SVDEngine.decompose(A);
      expect(rank).toBe(4);
      expect(sigma[0]).toBeGreaterThan(sigma[3]);
      reconstructAndCompare(A, U, sigma, V);
    });
  });

  describe("Condition number", () => {
    it("reports condition number 1 for identity", () => {
      const { conditionNumber } = SVDEngine.conditionNumber([[1, 0], [0, 1]]);
      expect(conditionNumber).toBeCloseTo(1, 8);
    });

    it("reports high condition number for near-singular matrix", () => {
      const A = [[1, 1], [1, 1.0001]];
      const { conditionNumber } = SVDEngine.conditionNumber(A);
      expect(conditionNumber).toBeGreaterThan(1e3);
    });

    it("reports condition number for 3x3 Hilbert matrix", () => {
      // Hilbert matrices are notoriously ill-conditioned
      const H3 = [
        [1, 1/2, 1/3],
        [1/2, 1/3, 1/4],
        [1/3, 1/4, 1/5],
      ];
      const { conditionNumber, rank } = SVDEngine.conditionNumber(H3);
      expect(conditionNumber).toBeGreaterThan(500);
      expect(rank).toBe(3);
    });
  });

  describe("Pseudo-inverse", () => {
    it("computes pseudo-inverse of square non-singular matrix", () => {
      const A = [[1, 2], [3, 4]];
      const { matrix: Aplus, rank } = SVDEngine.pseudoInverse(A);
      expect(rank).toBe(2);
      // A * A+ * A ≈ A (Moore-Penrose condition 1)
      const AAp = matMul(A, Aplus);
      const AApA = matMul(AAp, A);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
          expect(AApA[i][j]).toBeCloseTo(A[i][j], 4);
    });

    it("computes pseudo-inverse of tall matrix", () => {
      const A = [[1, 0], [0, 1], [0, 0]];
      const { matrix: Aplus, rank } = SVDEngine.pseudoInverse(A);
      expect(rank).toBe(2);
      expect(Aplus).toHaveLength(2); // n×m = 2×3
      expect(Aplus[0]).toHaveLength(3);
    });

    it("computes pseudo-inverse of rank-deficient matrix", () => {
      const A = [[1, 2], [2, 4]]; // rank 1
      const { rank } = SVDEngine.pseudoInverse(A);
      expect(rank).toBe(1);
    });
  });

  describe("Least squares", () => {
    it("solves overdetermined system", () => {
      // y = 2x + 1 from points (0,1), (1,3), (2,5)
      const A = [[1, 0], [1, 1], [1, 2]]; // [1, x]
      const b = [1, 3, 5];
      const { x, residualNorm, rank } = SVDEngine.leastSquares(A, b);
      expect(x[0]).toBeCloseTo(1, 4); // intercept
      expect(x[1]).toBeCloseTo(2, 4); // slope
      expect(residualNorm).toBeCloseTo(0, 4); // exact fit
      expect(rank).toBe(2);
    });

    it("solves noisy overdetermined system", () => {
      const A = [[1, 1], [1, 2], [1, 3], [1, 4]];
      const b = [2.1, 3.9, 6.2, 7.8]; // y ≈ 2x with noise
      const { x, residualNorm } = SVDEngine.leastSquares(A, b);
      expect(x[1]).toBeCloseTo(2, 0); // slope near 2
      expect(residualNorm).toBeGreaterThan(0);
    });
  });

  describe("Truncated SVD", () => {
    it("returns only top-k singular values", () => {
      const A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]; // rank 2
      const { sigma } = SVDEngine.decompose(A, { truncateK: 1 });
      expect(sigma).toHaveLength(1);
    });
  });

  describe("Low-rank approximation", () => {
    it("rank-1 approximation of a rank-2 matrix has nonzero error", () => {
      const A = [[1, 0], [0, 1]];
      const { frobenius_error } = SVDEngine.lowRankApprox(A, 1);
      expect(frobenius_error).toBeCloseTo(1, 4); // ||I - rank1(I)|| = 1
    });

    it("rank-2 approximation of rank-2 matrix is exact", () => {
      const A = [[3, 0], [0, 7]];
      const { matrix, frobenius_error } = SVDEngine.lowRankApprox(A, 2);
      expect(frobenius_error).toBeCloseTo(0, 6);
      expect(matrix[0][0]).toBeCloseTo(3, 4);
      expect(matrix[1][1]).toBeCloseTo(7, 4);
    });
  });

  describe("Numerical rank", () => {
    it("determines rank of full-rank matrix", () => {
      expect(SVDEngine.numericalRank([[1, 0], [0, 1]])).toBe(2);
    });

    it("determines rank of rank-deficient matrix", () => {
      expect(SVDEngine.numericalRank([[1, 2], [2, 4]])).toBe(1);
    });

    it("determines rank of zero matrix", () => {
      expect(SVDEngine.numericalRank([[0, 0], [0, 0]])).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("throws on empty matrix", () => {
      expect(() => SVDEngine.decompose([])).toThrow("empty matrix");
    });

    it("handles single-row matrix", () => {
      const { sigma, rank } = SVDEngine.decompose([[3, 4]]);
      expect(sigma[0]).toBeCloseTo(5, 4); // sqrt(9+16) = 5
      expect(rank).toBe(1);
    });

    it("handles single-column matrix", () => {
      const { sigma, rank } = SVDEngine.decompose([[3], [4]]);
      expect(sigma[0]).toBeCloseTo(5, 4);
      expect(rank).toBe(1);
    });
  });
});

// Minimal matrix multiply for test assertions
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let k = 0; k < p; k++)
      for (let j = 0; j < n; j++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}
