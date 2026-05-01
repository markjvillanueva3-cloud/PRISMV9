import { describe, it, expect } from "vitest";
import { CholeskyEngine } from "../engines/CholeskyEngine.js";

describe("CholeskyEngine", () => {

  describe("LL^T factorization", () => {
    it("factors 2x2 SPD matrix", () => {
      const A = [[4, 2], [2, 3]];
      const { L, isPositiveDefinite } = CholeskyEngine.factorize(A);
      expect(isPositiveDefinite).toBe(true);
      // Verify L * L^T = A
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          let sum = 0;
          for (let k = 0; k < 2; k++) sum += L[i][k] * L[j][k];
          expect(sum).toBeCloseTo(A[i][j], 10);
        }
    });

    it("factors 3x3 SPD matrix", () => {
      const A = [[25, 15, -5], [15, 18, 0], [-5, 0, 11]];
      const { L, isPositiveDefinite } = CholeskyEngine.factorize(A);
      expect(isPositiveDefinite).toBe(true);
      // Verify reconstruction
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          let sum = 0;
          for (let k = 0; k < 3; k++) sum += L[i][k] * L[j][k];
          expect(sum).toBeCloseTo(A[i][j], 8);
        }
    });

    it("detects non-SPD matrix", () => {
      const A = [[1, 2], [2, 1]]; // eigenvalues: 3, -1 → not SPD
      const { isPositiveDefinite } = CholeskyEngine.factorize(A);
      expect(isPositiveDefinite).toBe(false);
    });

    it("factors identity matrix", () => {
      const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const { L, isPositiveDefinite } = CholeskyEngine.factorize(I);
      expect(isPositiveDefinite).toBe(true);
      for (let i = 0; i < 3; i++) expect(L[i][i]).toBeCloseTo(1, 10);
    });

    it("factors 1x1 matrix", () => {
      const { L, isPositiveDefinite } = CholeskyEngine.factorize([[9]]);
      expect(isPositiveDefinite).toBe(true);
      expect(L[0][0]).toBeCloseTo(3, 10);
    });
  });

  describe("LDLT factorization", () => {
    it("factors SPD matrix", () => {
      const A = [[4, 2], [2, 3]];
      const { L, d, isPositiveDefinite } = CholeskyEngine.ldlt(A);
      expect(isPositiveDefinite).toBe(true);
      expect(d[0]).toBeGreaterThan(0);
      expect(d[1]).toBeGreaterThan(0);
      // Verify L * diag(d) * L^T = A
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          let sum = 0;
          for (let k = 0; k < 2; k++) sum += L[i][k] * d[k] * L[j][k];
          expect(sum).toBeCloseTo(A[i][j], 8);
        }
    });

    it("handles semi-definite matrix", () => {
      // [[1,1],[1,1]] has eigenvalues 0 and 2 → positive semi-definite
      const A = [[1, 1], [1, 1]];
      const { isPositiveDefinite, isPositiveSemiDefinite } = CholeskyEngine.ldlt(A);
      expect(isPositiveDefinite).toBe(false);
      expect(isPositiveSemiDefinite).toBe(true);
    });
  });

  describe("Solve A*x = b", () => {
    it("solves 2x2 system", () => {
      const A = [[4, 2], [2, 3]];
      const { L } = CholeskyEngine.factorize(A);
      const b = [1, 2];
      const x = CholeskyEngine.solve(L, b);
      // Verify A*x = b
      for (let i = 0; i < 2; i++) {
        let ax = 0;
        for (let j = 0; j < 2; j++) ax += A[i][j] * x[j];
        expect(ax).toBeCloseTo(b[i], 8);
      }
    });

    it("solves 3x3 system", () => {
      const A = [[25, 15, -5], [15, 18, 0], [-5, 0, 11]];
      const b = [40, 15, 10];
      const { L } = CholeskyEngine.factorize(A);
      const x = CholeskyEngine.solve(L, b);
      for (let i = 0; i < 3; i++) {
        let ax = 0;
        for (let j = 0; j < 3; j++) ax += A[i][j] * x[j];
        expect(ax).toBeCloseTo(b[i], 6);
      }
    });
  });

  describe("isPositiveDefinite", () => {
    it("returns true for SPD matrix", () => {
      expect(CholeskyEngine.isPositiveDefinite([[4, 2], [2, 3]])).toBe(true);
    });

    it("returns false for indefinite matrix", () => {
      expect(CholeskyEngine.isPositiveDefinite([[1, 2], [2, 1]])).toBe(false);
    });

    it("returns false for negative definite matrix", () => {
      expect(CholeskyEngine.isPositiveDefinite([[-1, 0], [0, -1]])).toBe(false);
    });
  });

  describe("Determinant", () => {
    it("computes determinant of 2x2 SPD", () => {
      const A = [[4, 2], [2, 3]]; // det = 12 - 4 = 8
      expect(CholeskyEngine.determinant(A)).toBeCloseTo(8, 8);
    });

    it("computes determinant of identity", () => {
      expect(CholeskyEngine.determinant([[1, 0], [0, 1]])).toBeCloseTo(1, 10);
    });

    it("returns 0 for non-SPD", () => {
      expect(CholeskyEngine.determinant([[1, 2], [2, 1]])).toBe(0);
    });
  });

  describe("Incomplete Cholesky", () => {
    it("produces a valid preconditioner for sparse SPD", () => {
      // Tridiagonal SPD: [2,-1,0; -1,2,-1; 0,-1,2]
      const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
      const { L, isPositiveDefinite } = CholeskyEngine.incompleteCholesky(A);
      expect(isPositiveDefinite).toBe(true);
      // IC(0) preserves sparsity: L[2][0] should be 0 since A[2][0]=0
      expect(L[2][0]).toBeCloseTo(0, 10);
    });
  });

  describe("Multivariate normal sampling", () => {
    it("shifts mean correctly with zero noise", () => {
      const mu = [1, 2];
      const L = [[1, 0], [0.5, 0.866]];
      const z = [0, 0]; // no noise
      const sample = CholeskyEngine.sampleMultivariateNormal(mu, L, z);
      expect(sample[0]).toBeCloseTo(1, 10);
      expect(sample[1]).toBeCloseTo(2, 10);
    });

    it("applies covariance structure", () => {
      const mu = [0, 0];
      const L = [[2, 0], [1, 1]]; // Sigma = [[4,2],[2,2]]
      const z = [1, 0];
      const sample = CholeskyEngine.sampleMultivariateNormal(mu, L, z);
      expect(sample[0]).toBeCloseTo(2, 10); // L[0][0]*z[0] = 2
      expect(sample[1]).toBeCloseTo(1, 10); // L[1][0]*z[0] = 1
    });
  });

  describe("Edge cases", () => {
    it("throws on empty matrix", () => {
      expect(() => CholeskyEngine.factorize([])).toThrow("empty");
    });

    it("throws on non-square matrix", () => {
      expect(() => CholeskyEngine.factorize([[1, 2]])).toThrow("square");
    });
  });
});
