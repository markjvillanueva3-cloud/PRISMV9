/**
 * KMedoidsAlgorithm — PAM correctness tests.
 * U-EXTRACT-KMEDOIDS (slot:golf 2026-05-24 iter18).
 */

import { describe, it, expect } from "vitest";
import { KMedoidsAlgorithm } from "../algorithms/KMedoidsAlgorithm.js";

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

describe("KMedoidsAlgorithm.cluster — happy paths", () => {
  it("HAPPY: 2 well-separated clusters → 2 labels, medoids match cluster ids", () => {
    const points = [
      [0, 0], [0.1, 0.1], [0.2, 0.0],
      [10, 10], [10.1, 10.0], [10.0, 10.1],
    ];
    const r = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(42) });
    expect(r.medoids).toHaveLength(2);
    expect(r.labels).toHaveLength(6);
    const labelA = r.labels[0];
    const labelB = r.labels[3];
    expect(labelA).not.toBe(labelB);
    expect(r.labels.slice(0, 3).every(l => l === labelA)).toBe(true);
    expect(r.labels.slice(3).every(l => l === labelB)).toBe(true);
    const aIdx = r.medoids[labelA];
    const bIdx = r.medoids[labelB];
    expect(aIdx).toBeLessThan(3);
    expect(bIdx).toBeGreaterThanOrEqual(3);
  });

  it("HAPPY: k=1 reduces to single best-medoid (center of uniform line is index 2)", () => {
    const points = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
    const r = KMedoidsAlgorithm.cluster(points, 1, { rng: seededRng(1) });
    expect(r.medoids).toEqual([2]);
    expect(r.cost).toBeCloseTo(6, 6);
  });

  it("HAPPY: k=n → every point its own medoid → cost=0", () => {
    const points = [[0, 0], [1, 1], [2, 2]];
    const r = KMedoidsAlgorithm.cluster(points, 3, { rng: seededRng(1) });
    expect(r.medoids).toHaveLength(3);
    expect(new Set(r.medoids).size).toBe(3);
    expect(r.cost).toBe(0);
  });

  it("HAPPY: ROBUSTNESS TO OUTLIER — one medoid is in dense cluster (0..3), one is the outlier (4)", () => {
    const points = [
      [0, 0], [0.1, 0.1], [0.2, 0.0], [0.0, 0.2],
      [1000, 1000],
    ];
    const r = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(7) });
    expect(r.medoids).toContain(4);
    const denseMedoid = r.medoids.find(m => m < 4);
    expect(denseMedoid).toBeGreaterThanOrEqual(0);
    expect(denseMedoid).toBeLessThan(4);
  });

  it("HAPPY: 3-D points cluster correctly", () => {
    const points = [
      [0, 0, 0], [0.1, 0.1, 0.1], [0.2, 0.0, 0.0],
      [5, 5, 5], [5.1, 5.0, 5.0],
    ];
    const r = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(3) });
    expect(r.medoids).toHaveLength(2);
    expect(r.labels[0]).toBe(r.labels[1]);
    expect(r.labels[0]).toBe(r.labels[2]);
    expect(r.labels[3]).toBe(r.labels[4]);
    expect(r.labels[0]).not.toBe(r.labels[3]);
  });

  it("DETERMINISM: same seed → same medoids + labels + cost", () => {
    const points = [[0, 0], [0.1, 0.1], [10, 10], [10.1, 10.1], [10.0, 10.2]];
    const r1 = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(99) });
    const r2 = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(99) });
    expect(r1.medoids).toEqual(r2.medoids);
    expect(r1.labels).toEqual(r2.labels);
    expect(r1.cost).toBeCloseTo(r2.cost, 10);
  });

  it("HAPPY: well-separated 4+4 clusters → final cost ≤ 8 (only intra-cluster distances ~1)", () => {
    const points = [
      [0, 0], [1, 0], [0, 1], [1, 1],
      [10, 10], [11, 10], [10, 11], [11, 11],
    ];
    const r = KMedoidsAlgorithm.cluster(points, 2, { rng: seededRng(5) });
    expect(r.cost).toBeLessThanOrEqual(8);
  });
});

describe("KMedoidsAlgorithm.cluster — fail-loud + boundary", () => {
  it("FAIL: non-array points throws", () => {
    expect(() => KMedoidsAlgorithm.cluster(null as never, 1)).toThrow(/array/);
  });

  it("FAIL: k non-integer / < 1 throws", () => {
    expect(() => KMedoidsAlgorithm.cluster([[1]], 0)).toThrow(/k/);
    expect(() => KMedoidsAlgorithm.cluster([[1]], 1.5)).toThrow(/k/);
  });

  it("FAIL: k > n throws", () => {
    expect(() => KMedoidsAlgorithm.cluster([[1], [2]], 3)).toThrow(/need ≥k=3/);
  });

  it("FAIL: zero-dim points throw", () => {
    expect(() => KMedoidsAlgorithm.cluster([[], []], 1)).toThrow(/dimension/);
  });

  it("FAIL: ragged dims throw", () => {
    expect(() => KMedoidsAlgorithm.cluster([[1, 2], [1]], 1)).toThrow(/ragged/);
  });

  it("FAIL: non-finite coordinate throws", () => {
    expect(() => KMedoidsAlgorithm.cluster([[NaN]], 1)).toThrow(/non-finite/);
    expect(() => KMedoidsAlgorithm.cluster([[Infinity]], 1)).toThrow(/non-finite/);
  });

  it("BOUNDARY: maxIter=1 returns a valid result with iterations<=1", () => {
    const points = [[0], [1], [10], [11]];
    const r = KMedoidsAlgorithm.cluster(points, 2, { maxIter: 1, rng: seededRng(2) });
    expect(r.iterations).toBeLessThanOrEqual(1);
    expect(r.medoids).toHaveLength(2);
  });
});
