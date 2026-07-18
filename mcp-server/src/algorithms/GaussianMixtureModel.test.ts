import { describe, it, expect } from "vitest";
import { GaussianMixtureModel as GMM, type GMMInput } from "./GaussianMixtureModel.js";

/** A tight cluster of 5 points around a centre. */
const blob = (cx: number, cy: number): number[][] => [
  [cx, cy], [cx + 0.1, cy + 0.1], [cx - 0.1, cy + 0.1], [cx + 0.1, cy - 0.1], [cx - 0.1, cy - 0.1],
];

describe("GaussianMixtureModel — two well-separated blobs", () => {
  const data = [...blob(0, 0), ...blob(10, 10)];

  it("recovers two component means at the blob centres", () => {
    const out = GMM.calculate({ data, k: 2, seed: 1 });
    expect(out.converged).toBe(true);
    // sort components by x so the assertion is init-order-independent
    const sorted = out.means.slice().sort((a, b) => a[0] - b[0]);
    expect(sorted[0][0]).toBeCloseTo(0, 1);
    expect(sorted[0][1]).toBeCloseTo(0, 1);
    expect(sorted[1][0]).toBeCloseTo(10, 1);
    expect(sorted[1][1]).toBeCloseTo(10, 1);
  });

  it("splits the points 5/5 into the two components", () => {
    const out = GMM.calculate({ data, k: 2, seed: 1 });
    const counts = [0, 0];
    out.labels.forEach((l) => counts[l]++);
    expect(counts.slice().sort()).toEqual([5, 5]);
    // the first 5 points (blob A) all share one label, the last 5 the other
    expect(new Set(out.labels.slice(0, 5)).size).toBe(1);
    expect(new Set(out.labels.slice(5)).size).toBe(1);
    expect(out.labels[0]).not.toBe(out.labels[5]);
  });

  it("mixture weights are ≈ 0.5 / 0.5 and sum to 1", () => {
    const out = GMM.calculate({ data, k: 2, seed: 1 });
    expect(out.weights[0] + out.weights[1]).toBeCloseTo(1, 10);
    expect(out.weights[0]).toBeCloseTo(0.5, 2);
    expect(out.weights[1]).toBeCloseTo(0.5, 2);
  });

  it("each responsibility row is a valid distribution (sums to 1)", () => {
    const out = GMM.calculate({ data, k: 2, seed: 1 });
    out.responsibilities.forEach((row) => {
      const s = row.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 10);
      row.forEach((r) => { expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(1); });
    });
  });

  it("is deterministic for a fixed seed", () => {
    const a = GMM.calculate({ data, k: 2, seed: 7 });
    const b = GMM.calculate({ data, k: 2, seed: 7 });
    expect(a.means).toEqual(b.means);
    expect(a.logLikelihood).toEqual(b.logLikelihood);
  });
});

describe("GaussianMixtureModel — single component (k=1)", () => {
  it("reduces to the global mean and variance", () => {
    const data = [[0, 0], [2, 4], [4, 8], [6, 12]];
    const out = GMM.calculate({ data, k: 1, seed: 1 });
    expect(out.weights).toEqual([1]);
    // global mean = (3, 6)
    expect(out.means[0][0]).toBeCloseTo(3, 8);
    expect(out.means[0][1]).toBeCloseTo(6, 8);
    expect(out.labels).toEqual([0, 0, 0, 0]);
    out.responsibilities.forEach((row) => expect(row[0]).toBeCloseTo(1, 12));
  });
});

describe("GaussianMixtureModel — soft membership at a midpoint", () => {
  it("a point equidistant between two clusters has near-equal responsibility", () => {
    // two clusters + one ambiguous point in the middle
    const data = [...blob(0, 0), ...blob(10, 0), [5, 0]];
    const out = GMM.calculate({ data, k: 2, seed: 3 });
    const mid = out.responsibilities[out.responsibilities.length - 1];
    expect(Math.abs(mid[0] - mid[1])).toBeLessThan(0.2); // genuinely soft, not 0/1
  });
});

describe("GaussianMixtureModel — failure modes", () => {
  it("rejects k > n", () => {
    expect(GMM.validate({ data: [[1], [2]], k: 5 }).valid).toBe(false);
    expect(() => GMM.calculate({ data: [[1], [2]], k: 5 })).toThrow(/invalid/i);
  });
  it("rejects k < 1", () => {
    expect(GMM.validate({ data: [[1], [2]], k: 0 }).valid).toBe(false);
  });
  it("rejects an empty / non-matrix data", () => {
    expect(GMM.validate({ data: [] as unknown as number[][], k: 1 }).valid).toBe(false);
    expect(GMM.validate({ data: [[1, 2], [3]], k: 1 }).valid).toBe(false); // ragged
  });
  it("rejects non-positive tol / varianceFloor", () => {
    expect(GMM.validate({ data: [[1], [2]], k: 1, tol: 0 }).valid).toBe(false);
    expect(GMM.validate({ data: [[1], [2]], k: 1, varianceFloor: -1 }).valid).toBe(false);
  });
});

describe("GaussianMixtureModel — adversarial inputs", () => {
  it("rejects NaN in data", () => {
    expect(GMM.validate({ data: [[1, NaN], [3, 4]], k: 1 }).valid).toBe(false);
  });
  it("rejects Infinity in data", () => {
    expect(GMM.validate({ data: [[1, 2], [Infinity, 4]], k: 1 }).valid).toBe(false);
  });
  it("identical points (zero-variance) stay finite via the variance floor", () => {
    const data = [[5, 5], [5, 5], [5, 5], [5, 5]];
    const out = GMM.calculate({ data, k: 1, seed: 1 });
    expect(Number.isFinite(out.logLikelihood)).toBe(true);
    out.variances[0].forEach((v) => expect(v).toBeGreaterThan(0));
  });
});

describe("GaussianMixtureModel — metadata", () => {
  it("exposes ml/clustering metadata with the EM reference", () => {
    const m = GMM.getMetadata();
    expect(m.id).toBe("gaussian_mixture_model");
    expect(m.domain).toBe("ml");
    expect(m.category).toBe("clustering");
    expect(m.reference).toMatch(/EM Algorithm/i);
  });
});
