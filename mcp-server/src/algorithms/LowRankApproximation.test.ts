import { describe, it, expect } from "vitest";
import {
  LowRankApproximation as LRA,
  type LowRankInput,
} from "./LowRankApproximation.js";

describe("LowRankApproximation — reference values", () => {
  it("rank-1 matrix is recovered exactly by a rank-1 approximation", () => {
    // A = [1,2,3]^T · [1,1] = outer product → true rank 1
    const A = [[1, 1], [2, 2], [3, 3]];
    const out = LRA.calculate({ matrix: A, rank: 1 });
    // σ1 = ‖[1,2,3]‖·‖[1,1]‖ = √14·√2 = √28
    expect(out.S[0]).toBeCloseTo(Math.sqrt(28), 6);
    expect(out.relativeError).toBeLessThan(1e-8); // exact recovery
    // reconstruction ≈ A
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++)
        expect(out.approximation[i][j]).toBeCloseTo(A[i][j], 6);
  });

  it("diagonal matrix → singular values are the diagonal (descending)", () => {
    const A = [[3, 0, 0], [0, 2, 0], [0, 0, 1]];
    const out = LRA.calculate({ matrix: A, rank: 3 });
    expect(out.S[0]).toBeCloseTo(3, 6);
    expect(out.S[1]).toBeCloseTo(2, 6);
    expect(out.S[2]).toBeCloseTo(1, 6);
    expect(out.relativeError).toBeLessThan(1e-8);
  });

  it("rank-2 truncation of diag(3,2,1) drops σ3=1 → exact Frobenius error 1", () => {
    const A = [[3, 0, 0], [0, 2, 0], [0, 0, 1]];
    const out = LRA.calculate({ matrix: A, rank: 2 });
    expect(out.reconstructionError).toBeCloseTo(1, 6); // ‖A − A_2‖_F = σ3
    expect(out.relativeError).toBeCloseTo(1 / Math.sqrt(14), 6); // 1/√(9+4+1)
  });

  it("identity (degenerate spectrum σ=[1,1]) reconstructs exactly", () => {
    const out = LRA.calculate({ matrix: [[1, 0], [0, 1]], rank: 2 });
    expect(out.S[0]).toBeCloseTo(1, 6);
    expect(out.S[1]).toBeCloseTo(1, 6);
    expect(out.relativeError).toBeLessThan(1e-8);
  });
});

describe("LowRankApproximation — properties", () => {
  it("reconstruction error is non-increasing as rank grows (Eckart–Young)", () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2], [2, 0, 1]];
    const e1 = LRA.calculate({ matrix: A, rank: 1 }).reconstructionError;
    const e2 = LRA.calculate({ matrix: A, rank: 2 }).reconstructionError;
    const e3 = LRA.calculate({ matrix: A, rank: 3 }).reconstructionError;
    expect(e2).toBeLessThanOrEqual(e1 + 1e-9);
    expect(e3).toBeLessThanOrEqual(e2 + 1e-9);
    expect(e3).toBeLessThan(1e-6); // full rank → near-exact
  });

  it("singular values come out in descending order", () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const out = LRA.calculate({ matrix: A, rank: 3 });
    for (let i = 1; i < out.S.length; i++) expect(out.S[i]).toBeLessThanOrEqual(out.S[i - 1] + 1e-9);
  });

  it("U columns are unit-norm left singular vectors", () => {
    const out = LRA.calculate({ matrix: [[1, 1], [2, 2], [3, 3]], rank: 1 });
    const u = out.U[0];
    const norm = Math.sqrt(u.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("is deterministic — same seed yields identical singular values", () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const a = LRA.calculate({ matrix: A, rank: 3, seed: 7 });
    const b = LRA.calculate({ matrix: A, rank: 3, seed: 7 });
    expect(a.S).toEqual(b.S);
  });
});

describe("LowRankApproximation — boundary + robustness", () => {
  it("zero matrix → all-zero singular values, no NaN", () => {
    const out = LRA.calculate({ matrix: [[0, 0], [0, 0]], rank: 2 });
    expect(out.S.every((s) => s === 0)).toBe(true);
    expect(out.relativeError).toBe(0);
    expect(out.approximation.flat().every((x) => Number.isFinite(x))).toBe(true);
  });

  it("rank > min(m,n) is clamped with a warning", () => {
    const out = LRA.calculate({ matrix: [[1, 2], [3, 4]], rank: 9 });
    expect(out.rank).toBe(2);
    expect(out.warnings.join(" ")).toMatch(/clamp/i);
  });
});

describe("LowRankApproximation — failure modes", () => {
  it("rejects rank < 1", () => {
    expect(LRA.validate({ matrix: [[1, 2]], rank: 0 }).valid).toBe(false);
    expect(() => LRA.calculate({ matrix: [[1, 2]], rank: 0 })).toThrow(/rank|invalid/i);
  });
  it("rejects ragged matrix", () => {
    expect(LRA.validate({ matrix: [[1, 2], [3]], rank: 1 }).valid).toBe(false);
  });
  it("rejects empty matrix", () => {
    expect(LRA.validate({ matrix: [], rank: 1 }).valid).toBe(false);
  });
  it("rejects non-positive tol", () => {
    expect(LRA.validate({ matrix: [[1, 2]], rank: 1, tol: 0 }).valid).toBe(false);
  });
});

describe("LowRankApproximation — adversarial inputs", () => {
  it("rejects NaN entries", () => {
    expect(LRA.validate({ matrix: [[NaN, 1], [2, 3]], rank: 1 }).valid).toBe(false);
  });
  it("rejects Infinity entries", () => {
    expect(LRA.validate({ matrix: [[Infinity, 0], [0, 1]], rank: 1 }).valid).toBe(false);
  });
});

describe("LowRankApproximation — metadata", () => {
  it("exposes ml/matrix-factorization metadata with the Eckart–Young reference", () => {
    const m = LRA.getMetadata();
    expect(m.id).toBe("low_rank_approximation");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Eckart/i);
  });
});
