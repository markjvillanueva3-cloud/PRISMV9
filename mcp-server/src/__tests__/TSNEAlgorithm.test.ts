/**
 * TSNEAlgorithm — embedding correctness tests.
 * U-EXTRACT-TSNE (slot:golf 2026-05-24 iter19).
 */

import { describe, it, expect } from "vitest";
import { TSNEAlgorithm } from "../algorithms/TSNEAlgorithm.js";

/** Tiny deterministic RNG for tests (mulberry32). */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Euclidean distance helper. */
function dist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

describe("TSNEAlgorithm.embed — happy paths", () => {
  it("HAPPY: 2 well-separated clusters in 4-D embed to 2-D — intra-cluster distance < inter-cluster", () => {
    // Cluster A around (0,0,0,0); cluster B around (10,10,10,10).
    const points = [
      [0, 0, 0, 0], [0.1, 0.1, 0.0, 0.1], [0.0, 0.2, 0.1, 0.0], [0.1, 0.0, 0.2, 0.1],
      [10, 10, 10, 10], [10.1, 10.0, 10.1, 10.0], [10.0, 10.1, 10.0, 10.1], [10.2, 10.0, 10.0, 10.1],
    ];
    const { Y } = TSNEAlgorithm.embed(points, {
      perplexity: 3, maxIter: 300, rng: seededRng(42),
    });
    expect(Y).toHaveLength(8);
    expect(Y[0]).toHaveLength(2);
    // mean intra-cluster distance in 2-D should be smaller than mean inter-cluster.
    let intra = 0, intraN = 0;
    let inter = 0, interN = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const sameCluster = (i < 4) === (j < 4);
        const d = dist(Y[i], Y[j]);
        if (sameCluster) { intra += d; intraN++; }
        else { inter += d; interN++; }
      }
    }
    const meanIntra = intra / intraN;
    const meanInter = inter / interN;
    expect(meanInter).toBeGreaterThan(meanIntra);
  });

  it("HAPPY: dims=3 produces 3-D embedding", () => {
    const points = [
      [0, 0], [0.1, 0.0], [0.0, 0.1],
      [5, 5], [5.0, 5.1], [5.1, 5.0],
    ];
    const { Y } = TSNEAlgorithm.embed(points, {
      dims: 3, perplexity: 2, maxIter: 150, rng: seededRng(1),
    });
    expect(Y[0]).toHaveLength(3);
    expect(Y).toHaveLength(6);
    for (const y of Y) {
      for (const v of y) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("HAPPY: embedding is centered at origin (mean ≈ 0)", () => {
    const points = [
      [0, 0], [0.1, 0.1], [0.2, 0.0],
      [5, 5], [5.1, 5.1], [5.0, 5.2],
    ];
    const { Y } = TSNEAlgorithm.embed(points, {
      perplexity: 2, maxIter: 100, rng: seededRng(7),
    });
    const dims = Y[0].length;
    const center = new Array(dims).fill(0);
    for (const y of Y) for (let d = 0; d < dims; d++) center[d] += y[d];
    for (let d = 0; d < dims; d++) center[d] /= Y.length;
    // After recentering each iteration, sum should be near zero.
    for (const c of center) expect(Math.abs(c)).toBeLessThan(1e-6);
  });

  it("DETERMINISM: same seed → same embedding + iterations", () => {
    const points = [
      [0, 0, 0], [0.1, 0.0, 0.1], [0.0, 0.1, 0.0],
      [5, 5, 5], [5.1, 5.0, 5.1], [5.0, 5.1, 5.0],
    ];
    const r1 = TSNEAlgorithm.embed(points, { perplexity: 2, maxIter: 50, rng: seededRng(99) });
    const r2 = TSNEAlgorithm.embed(points, { perplexity: 2, maxIter: 50, rng: seededRng(99) });
    expect(r1.iterations).toBe(r2.iterations);
    expect(r1.Y).toEqual(r2.Y);
  });

  it("HAPPY: iterations returned matches maxIter", () => {
    const points = [[0, 0], [1, 1], [2, 2], [3, 3]];
    const r = TSNEAlgorithm.embed(points, { perplexity: 2, maxIter: 25, rng: seededRng(3) });
    expect(r.iterations).toBe(25);
  });
});

describe("TSNEAlgorithm.embed — fail-loud + boundary", () => {
  it("FAIL: non-array X throws", () => {
    expect(() => TSNEAlgorithm.embed(null as never)).toThrow(/array/);
  });

  it("FAIL: <2 points throws", () => {
    expect(() => TSNEAlgorithm.embed([[1, 2]])).toThrow(/≥2 points/);
  });

  it("FAIL: zero-dim points throw", () => {
    expect(() => TSNEAlgorithm.embed([[], []])).toThrow(/dimension/);
  });

  it("FAIL: ragged dims throw", () => {
    expect(() => TSNEAlgorithm.embed([[1, 2], [1]])).toThrow(/ragged/);
  });

  it("FAIL: non-finite coordinate throws", () => {
    expect(() => TSNEAlgorithm.embed([[1, 2], [NaN, 0]])).toThrow(/non-finite/);
    expect(() => TSNEAlgorithm.embed([[1, 2], [Infinity, 0]])).toThrow(/non-finite/);
  });

  it("FAIL: perplexity ≥ n throws (binary search would degenerate)", () => {
    const points = [[0, 0], [1, 1], [2, 2]];
    expect(() => TSNEAlgorithm.embed(points, { perplexity: 3 })).toThrow(/perplexity/);
    expect(() => TSNEAlgorithm.embed(points, { perplexity: 100 })).toThrow(/perplexity/);
  });

  it("BOUNDARY: maxIter=1 produces 1 iteration and valid finite output", () => {
    const points = [[0, 0], [1, 1], [5, 5], [6, 6]];
    const r = TSNEAlgorithm.embed(points, { perplexity: 2, maxIter: 1, rng: seededRng(2) });
    expect(r.iterations).toBe(1);
    for (const y of r.Y) for (const v of y) expect(Number.isFinite(v)).toBe(true);
  });

  it("BOUNDARY: default options (dims=2, perplexity=30) require n>30 — verify default with n=40", () => {
    const points = Array.from({ length: 40 }, (_, i) => [i, i * 0.5]);
    const r = TSNEAlgorithm.embed(points, { maxIter: 10, rng: seededRng(5) });
    expect(r.Y[0]).toHaveLength(2);
    expect(r.iterations).toBe(10);
  });
});

describe("TSNEAlgorithm internal helpers — invariants", () => {
  it("_pairwiseDistances: symmetric and zero-diagonal", () => {
    const X = [[0, 0], [3, 4], [6, 8]];
    const D = TSNEAlgorithm._pairwiseDistances(X);
    expect(D[0][0]).toBe(0);
    expect(D[1][1]).toBe(0);
    expect(D[2][2]).toBe(0);
    expect(D[0][1]).toBeCloseTo(5, 10);
    expect(D[1][0]).toBeCloseTo(5, 10);
    expect(D[0][2]).toBeCloseTo(10, 10);
  });

  it("_computeP: rows sum to a positive value and matrix is symmetric", () => {
    const X = [[0, 0], [1, 0], [0, 1], [10, 10]];
    const D = TSNEAlgorithm._pairwiseDistances(X);
    const P = TSNEAlgorithm._computeP(D, 2);
    for (let i = 0; i < 4; i++) expect(P[i][i]).toBe(0);
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(P[i][j]).toBeCloseTo(P[j][i], 12);
      }
    }
    let total = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) total += P[i][j];
    expect(total).toBeGreaterThan(0);
  });

  it("_computeQ: all entries ≥ Q_FLOOR (1e-12) and symmetric", () => {
    const Y = [[0, 0], [1, 1], [5, 5]];
    const Q = TSNEAlgorithm._computeQ(Y);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(Q[i][j]).toBeGreaterThanOrEqual(1e-12);
      }
    }
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        expect(Q[i][j]).toBeCloseTo(Q[j][i], 12);
      }
    }
  });
});
