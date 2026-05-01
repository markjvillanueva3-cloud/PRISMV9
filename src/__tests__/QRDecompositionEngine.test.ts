import { describe, it, expect } from "vitest";
import { QRDecompositionEngine, QRPivotResult } from "../engines/QRDecompositionEngine.js";

describe("QRDecompositionEngine", () => {

  function matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length, n = B[0].length, p = B.length;
    const C = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let i = 0; i < m; i++)
      for (let k = 0; k < p; k++)
        for (let j = 0; j < n; j++)
          C[i][j] += A[i][k] * B[k][j];
    return C;
  }

  function isUpperTriangular(R: number[][], tol = 1e-10): boolean {
    for (let i = 0; i < R.length; i++)
      for (let j = 0; j < Math.min(i, R[0].length); j++)
        if (Math.abs(R[i][j]) > tol) return false;
    return true;
  }

  function isOrthogonal(Q: number[][], tol = 1e-8): boolean {
    const n = Q[0].length;
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let dot = 0;
        for (let k = 0; k < Q.length; k++) dot += Q[k][i] * Q[k][j];
        const expected = i === j ? 1 : 0;
        if (Math.abs(dot - expected) > tol) return false;
      }
    }
    return true;
  }

  describe("Householder QR", () => {
    it("decomposes 2x2 identity", () => {
      const { Q, R } = QRDecompositionEngine.householderQR([[1, 0], [0, 1]], false);
      expect(isOrthogonal(Q)).toBe(true);
      expect(isUpperTriangular(R)).toBe(true);
    });

    it("decomposes 3x2 tall matrix and reconstructs", () => {
      const A = [[1, 2], [3, 4], [5, 6]];
      const { Q, R } = QRDecompositionEngine.householderQR(A, true);
      expect(Q).toHaveLength(3);
      expect(Q[0]).toHaveLength(2);
      expect(R).toHaveLength(2);
      expect(isOrthogonal(Q)).toBe(true);
      expect(isUpperTriangular(R)).toBe(true);
      const QR = matMul(Q, R);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          expect(QR[i][j]).toBeCloseTo(A[i][j], 8);
    });

    it("decomposes 3x3 symmetric matrix", () => {
      const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
      const { Q, R } = QRDecompositionEngine.householderQR(A, false);
      expect(isOrthogonal(Q)).toBe(true);
      expect(isUpperTriangular(R)).toBe(true);
      const QR = matMul(Q, R);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          expect(QR[i][j]).toBeCloseTo(A[i][j], 8);
    });

    it("handles 1x1 matrix", () => {
      const { Q, R } = QRDecompositionEngine.householderQR([[5]], false);
      expect(Math.abs(Q[0][0])).toBeCloseTo(1, 8);
      expect(Math.abs(R[0][0])).toBeCloseTo(5, 8);
    });
  });

  describe("Column-pivoted QR", () => {
    it("detects rank of full-rank matrix", () => {
      const A = [[1, 0], [0, 1], [0, 0]];
      const result = QRDecompositionEngine.decompose(A, { pivoting: true }) as QRPivotResult;
      expect(result.rank).toBe(2);
      expect(result.permutation).toHaveLength(2);
    });

    it("detects rank-1 matrix", () => {
      const A = [[1, 2], [2, 4], [3, 6]];
      const result = QRDecompositionEngine.decompose(A, { pivoting: true }) as QRPivotResult;
      expect(result.rank).toBe(1);
    });

    it("puts largest-norm column first", () => {
      const A = [[0, 0, 5], [0, 0, 0]]; // column 2 has largest norm
      const result = QRDecompositionEngine.decompose(A, { pivoting: true }) as QRPivotResult;
      expect(result.permutation[0]).toBe(2);
    });
  });

  describe("Least squares", () => {
    it("fits y = 2x + 1 exactly", () => {
      const A = [[1, 0], [1, 1], [1, 2]];
      const b = [1, 3, 5];
      const { x, residualNorm } = QRDecompositionEngine.leastSquares(A, b);
      expect(x[0]).toBeCloseTo(1, 6);
      expect(x[1]).toBeCloseTo(2, 6);
      expect(residualNorm).toBeCloseTo(0, 6);
    });

    it("fits noisy data with nonzero residual", () => {
      const A = [[1, 1], [1, 2], [1, 3], [1, 4]];
      const b = [2.1, 4.0, 5.9, 8.1]; // y ≈ 2x
      const { x, residualNorm } = QRDecompositionEngine.leastSquares(A, b);
      expect(x[1]).toBeCloseTo(2, 0);
      expect(residualNorm).toBeGreaterThan(0);
    });
  });

  describe("Givens QR", () => {
    it("decomposes 3x2 matrix correctly", () => {
      const A = [[1, 2], [3, 4], [5, 6]];
      const { Q, R } = QRDecompositionEngine.givensQR(A);
      expect(isUpperTriangular(R)).toBe(true);
      const QR = matMul(Q, R);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          expect(QR[i][j]).toBeCloseTo(A[i][j], 6);
    });
  });

  describe("Back-substitution", () => {
    it("solves simple upper triangular system", () => {
      const R = [[2, 1], [0, 3]];
      const b = [5, 6];
      const x = QRDecompositionEngine.backSubstitute(R, b);
      expect(x[1]).toBeCloseTo(2, 8);
      expect(x[0]).toBeCloseTo(1.5, 8);
    });
  });

  describe("Edge cases", () => {
    it("throws on empty matrix", () => {
      expect(() => QRDecompositionEngine.decompose([])).toThrow("empty");
    });

    it("handles 4x4 identity", () => {
      const I = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
      const { Q, R } = QRDecompositionEngine.householderQR(I, false);
      expect(isOrthogonal(Q)).toBe(true);
      for (let i = 0; i < 4; i++)
        expect(Math.abs(R[i][i])).toBeCloseTo(1, 8);
    });
  });
});
