import { describe, it, expect } from "vitest";
import { KNearestNeighbors as KNN, type KNNInput } from "./KNearestNeighbors.js";

describe("KNearestNeighbors — search (reference values)", () => {
  it("euclidean: returns the k nearest corpus indices nearest-first", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[10, 10], [1, 0], [0, 1], [5, 5]],
      k: 2,
      metric: "euclidean",
      task: "search",
    });
    // distances from origin: idx1=1, idx2=1, idx3=√50, idx0=√200 → nearest [1,2]
    expect(out.results[0].indices).toEqual([1, 2]);
    expect(out.results[0].distances[0]).toBeCloseTo(1, 12);
  });

  it("cosine: ranks by direction, not magnitude", () => {
    const out = KNN.calculate({
      queries: [[1, 0]],
      corpus: [[100, 0], [0, 5], [-3, 0]], // same dir / orthogonal / opposite
      k: 3,
      metric: "cosine",
    });
    expect(out.results[0].indices[0]).toBe(0); // same direction → distance 0
    expect(out.results[0].distances[0]).toBeCloseTo(0, 12);
    expect(out.results[0].indices[2]).toBe(2); // opposite → distance 2 (farthest)
    expect(out.results[0].distances[2]).toBeCloseTo(2, 12);
  });

  it("manhattan distance is computed correctly", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[1, 2], [3, 0]],
      k: 1,
      metric: "manhattan",
    });
    expect(out.results[0].indices).toEqual([0]); // |1|+|2|=3 < |3|+0... both 3 → tie→lower idx
    expect(out.results[0].distances[0]).toBe(3);
  });
});

describe("KNearestNeighbors — classify / regress", () => {
  it("classify: majority vote of k nearest labels", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[1, 0], [0, 1], [10, 10]],
      labels: ["A", "A", "B"],
      k: 2,
      metric: "euclidean",
      task: "classify",
    });
    expect(out.results[0].prediction).toBe("A"); // two nearest are both A
  });

  it("regress: mean of k nearest numeric labels", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[1, 0], [0, 1], [10, 10]],
      labels: [10, 20, 1000],
      k: 2,
      metric: "euclidean",
      task: "regress",
    });
    expect(out.results[0].prediction).toBeCloseTo(15, 12); // mean(10,20)
  });

  it("weighted regress favours the nearer neighbour", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[1, 0], [3, 0]],
      labels: [10, 20],
      k: 2,
      metric: "euclidean",
      task: "regress",
      weighted: true,
    });
    // weights 1/1 and 1/3 → (10·1 + 20·(1/3)) / (1 + 1/3) = 12.5
    expect(out.results[0].prediction).toBeCloseTo(12.5, 6);
  });
});

describe("KNearestNeighbors — properties", () => {
  it("multiple queries each get their own result row", () => {
    const out = KNN.calculate({
      queries: [[0, 0], [10, 10]],
      corpus: [[0, 1], [10, 9]],
      k: 1,
      metric: "euclidean",
    });
    expect(out.results).toHaveLength(2);
    expect(out.results[0].indices).toEqual([0]);
    expect(out.results[1].indices).toEqual([1]);
  });

  it("distances come out ascending; ties break to lower index (deterministic)", () => {
    const out = KNN.calculate({
      queries: [[0, 0]],
      corpus: [[2, 0], [0, 2], [1, 0]],
      k: 3,
      metric: "euclidean",
    });
    const d = out.results[0].distances;
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1]);
    expect(out.results[0].indices[0]).toBe(2); // dist 1 nearest
  });

  it("k > corpus is clamped with a warning", () => {
    const out = KNN.calculate({ queries: [[1]], corpus: [[1], [2]], k: 9, metric: "euclidean" });
    expect(out.k).toBe(2);
    expect(out.warnings.join(" ")).toMatch(/clamp/i);
  });

  it("zero-norm vector under cosine → distance 1 + warning (no NaN)", () => {
    const out = KNN.calculate({ queries: [[0, 0]], corpus: [[1, 1]], k: 1, metric: "cosine" });
    expect(out.results[0].distances[0]).toBe(1);
    expect(out.results[0].distances.every((x) => Number.isFinite(x))).toBe(true);
    expect(out.warnings.join(" ")).toMatch(/zero-norm/i);
  });
});

describe("KNearestNeighbors — failure modes", () => {
  it("rejects dim mismatch between queries and corpus", () => {
    const bad: KNNInput = { queries: [[1, 2]], corpus: [[1]], k: 1 };
    expect(KNN.validate(bad).valid).toBe(false);
    expect(() => KNN.calculate(bad)).toThrow(/dim mismatch|invalid/i);
  });
  it("rejects k < 1", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[1]], k: 0 }).valid).toBe(false);
  });
  it("classify without labels is rejected", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[1], [2]], k: 1, task: "classify" }).valid).toBe(false);
  });
  it("regress with non-numeric labels is rejected", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[1], [2]], k: 1, task: "regress", labels: ["a", "b"] }).valid).toBe(false);
  });
  it("labels length mismatch is rejected", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[1], [2]], k: 1, task: "classify", labels: ["a"] }).valid).toBe(false);
  });
});

describe("KNearestNeighbors — adversarial inputs", () => {
  it("rejects NaN in queries", () => {
    expect(KNN.validate({ queries: [[NaN]], corpus: [[1]], k: 1 }).valid).toBe(false);
  });
  it("rejects Infinity in corpus", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[Infinity]], k: 1 }).valid).toBe(false);
  });
  it("rejects unknown metric", () => {
    expect(KNN.validate({ queries: [[1]], corpus: [[1]], k: 1, metric: "hamming" as KNNInput["metric"] }).valid).toBe(false);
  });
});

describe("KNearestNeighbors — metadata", () => {
  it("exposes ml/retrieval metadata with the Cover–Hart reference", () => {
    const m = KNN.getMetadata();
    expect(m.id).toBe("k_nearest_neighbors");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Cover/i);
  });
});
