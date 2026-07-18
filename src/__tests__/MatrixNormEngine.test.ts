/**
 * MatrixNormEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P1-U03
 */
import { describe, it, expect } from "vitest";
import { MatrixNormEngine } from "../engines/MatrixNormEngine.js";

const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const A2 = [[3, 1], [1, 3]]; // eigenvalues 2, 4
const diag3 = [[5, 0, 0], [0, 3, 0], [0, 0, 1]];

describe("MatrixNormEngine — Frobenius Norm", () => {
  it("identity has Frobenius norm = sqrt(n)", () => {
    expect(MatrixNormEngine.frobeniusNorm(I3)).toBeCloseTo(Math.sqrt(3), 10);
  });
  it("diagonal matrix", () => {
    expect(MatrixNormEngine.frobeniusNorm(diag3)).toBeCloseTo(Math.sqrt(25 + 9 + 1), 10);
  });
  it("zero matrix has norm 0", () => {
    expect(MatrixNormEngine.frobeniusNorm([[0, 0], [0, 0]])).toBeCloseTo(0);
  });
});

describe("MatrixNormEngine — 1-Norm", () => {
  it("identity has 1-norm = 1", () => {
    expect(MatrixNormEngine.oneNorm(I3)).toBeCloseTo(1);
  });
  it("diagonal: max diagonal entry", () => {
    expect(MatrixNormEngine.oneNorm(diag3)).toBeCloseTo(5);
  });
  it("A2: max column sum = 4", () => {
    expect(MatrixNormEngine.oneNorm(A2)).toBeCloseTo(4);
  });
});

describe("MatrixNormEngine — Infinity Norm", () => {
  it("identity has inf-norm = 1", () => {
    expect(MatrixNormEngine.infinityNorm(I3)).toBeCloseTo(1);
  });
  it("symmetric A2: equals 1-norm", () => {
    expect(MatrixNormEngine.infinityNorm(A2)).toBeCloseTo(MatrixNormEngine.oneNorm(A2));
  });
  it("non-symmetric [[1,2],[3,0]]: max row sum = 3", () => {
    expect(MatrixNormEngine.infinityNorm([[1, 2], [3, 0]])).toBeCloseTo(3);
  });
});

describe("MatrixNormEngine — Spectral Norm", () => {
  it("identity has spectral norm = 1", () => {
    expect(MatrixNormEngine.spectralNorm(I3)).toBeCloseTo(1, 6);
  });
  it("diagonal: max |diagonal| = 5", () => {
    expect(MatrixNormEngine.spectralNorm(diag3)).toBeCloseTo(5, 4);
  });
  it("A2: sigma_max = 4", () => {
    expect(MatrixNormEngine.spectralNorm(A2)).toBeCloseTo(4, 4);
  });
  it("norm inequality: ||A||_2 <= ||A||_F", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(MatrixNormEngine.spectralNorm(A)).toBeLessThanOrEqual(MatrixNormEngine.frobeniusNorm(A) + 1e-6);
  });
});

describe("MatrixNormEngine — All Norms", () => {
  it("returns all four norms", () => {
    const r = MatrixNormEngine.allNorms(A2);
    expect(r.frobenius).toBeGreaterThan(0);
    expect(r.spectral).toBeGreaterThan(0);
    expect(r.oneNorm).toBeGreaterThan(0);
    expect(r.infinityNorm).toBeGreaterThan(0);
  });
});

describe("MatrixNormEngine — Condition Number", () => {
  it("identity has condition number 1", () => {
    const r = MatrixNormEngine.conditionNumber(I3);
    expect(r.conditionNumber).toBeCloseTo(1, 0);
  });
  it("well-conditioned matrix has small condition number", () => {
    const r = MatrixNormEngine.conditionNumber(A2);
    expect(r.conditionNumber).toBeLessThan(100);
  });
  it("warns on ill-conditioned matrix", () => {
    const ill = [[1, 0], [0, 1e-15]];
    const r = MatrixNormEngine.conditionNumber(ill);
    expect(r.conditionNumber).toBeGreaterThan(1e10);
  });
  it("works with solver function", () => {
    // Simple 2x2 solver
    const solver = (b: number[]): number[] => {
      // Solve [[3,1],[1,3]]*x = b → x = (1/8)*[[3,-1],[-1,3]]*b
      return [(3 * b[0] - b[1]) / 8, (-b[0] + 3 * b[1]) / 8];
    };
    const r = MatrixNormEngine.conditionNumber(A2, solver);
    expect(r.method).toBe("hager-1norm");
    expect(r.conditionNumber).toBeGreaterThan(0);
  });
});

describe("MatrixNormEngine — Matrix Square Root", () => {
  it("sqrt(I) = I", () => {
    const S = MatrixNormEngine.matrixSqrt(I3);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(S[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
  });
  it("S*S ≈ A for 2×2 SPD", () => {
    const S = MatrixNormEngine.matrixSqrt(A2);
    // Verify S*S = A
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        let sum = 0;
        for (let k = 0; k < 2; k++) sum += S[i][k] * S[k][j];
        expect(sum).toBeCloseTo(A2[i][j], 6);
      }
  });
  it("S*S ≈ diag(5,3,1) for diagonal SPD", () => {
    const S = MatrixNormEngine.matrixSqrt(diag3);
    expect(S[0][0]).toBeCloseTo(Math.sqrt(5), 6);
    expect(S[1][1]).toBeCloseTo(Math.sqrt(3), 6);
    expect(S[2][2]).toBeCloseTo(1, 6);
  });
});

describe("MatrixNormEngine — Stability Diagnostics", () => {
  it("identifies diagonally dominant matrix", () => {
    const d = MatrixNormEngine.stabilityDiagnostics([[10, 1], [1, 10]]);
    expect(d.isDiagonallyDominant).toBe(true);
    expect(d.warnings.length).toBe(0);
  });
  it("flags non-diagonally-dominant matrix", () => {
    const d = MatrixNormEngine.stabilityDiagnostics([[1, 5], [5, 1]]);
    expect(d.isDiagonallyDominant).toBe(false);
    expect(d.warnings.some(w => w.includes("diagonally dominant"))).toBe(true);
  });
  it("flags near-zero diagonal", () => {
    const d = MatrixNormEngine.stabilityDiagnostics([[1e-20, 1], [0, 1]]);
    expect(d.warnings.some(w => w.includes("zero diagonal"))).toBe(true);
  });
});
