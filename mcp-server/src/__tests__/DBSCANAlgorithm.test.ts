/**
 * DBSCANAlgorithm — clustering correctness tests.
 * U-EXTRACT-DBSCAN (slot:golf 2026-05-24 iter17).
 *
 * Pins (per R9 — tests verify intent):
 *  - Two well-separated clusters of 3 → 2 clusters, 0 noise
 *  - Single isolated point with minPts>1 → noise
 *  - High eps merges everything → 1 cluster
 *  - Low eps → all points are noise
 *  - Boundary: eps=0, minPts=0 rejected loudly
 *  - n-D support (3-D) round-trips
 *  - Ragged-dim input throws
 *  - Non-finite coordinate throws
 *  - Empty input → empty labels (no NaN, no throw)
 *  - clusterCount + noiseCount accuracy
 */

import { describe, it, expect } from "vitest";
import { DBSCANAlgorithm } from "../algorithms/DBSCANAlgorithm.js";

describe("DBSCANAlgorithm.cluster — happy paths", () => {
  it("HAPPY: 2 well-separated clusters of 3 points each → 2 clusters, 0 noise", () => {
    const points = [
      [0, 0], [0.5, 0.5], [0.2, 0.3],   // cluster A
      [10, 10], [10.5, 10.5], [10.2, 10.3], // cluster B
    ];
    const labels = DBSCANAlgorithm.cluster(points, 1.0, 2);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(2);
    expect(DBSCANAlgorithm.noiseCount(labels)).toBe(0);
    // Within-cluster labels match
    expect(labels[0]).toBe(labels[1]);
    expect(labels[3]).toBe(labels[4]);
    // Between-cluster labels differ
    expect(labels[0]).not.toBe(labels[3]);
  });

  it("HAPPY: single dense cluster + isolated outlier", () => {
    const points = [[0, 0], [0.1, 0.1], [0.2, 0.0], [0.0, 0.2], [100, 100]];
    const labels = DBSCANAlgorithm.cluster(points, 1.0, 3);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(1);
    expect(labels[4]).toBe(0); // isolated point is noise
  });

  it("HAPPY: large eps collapses everything into one cluster", () => {
    const points = [[0, 0], [5, 5], [10, 10], [15, 15]];
    const labels = DBSCANAlgorithm.cluster(points, 100, 1);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(1);
    expect(DBSCANAlgorithm.noiseCount(labels)).toBe(0);
  });

  it("HAPPY: tiny eps marks everything as noise", () => {
    const points = [[0, 0], [5, 5], [10, 10]];
    const labels = DBSCANAlgorithm.cluster(points, 0.001, 2);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(0);
    expect(DBSCANAlgorithm.noiseCount(labels)).toBe(3);
  });

  it("HAPPY: 3-D points cluster correctly", () => {
    const points = [
      [0, 0, 0], [0.1, 0.1, 0.1], [0.2, 0.0, 0.0],
      [5, 5, 5], [5.1, 5.0, 5.0],
    ];
    const labels = DBSCANAlgorithm.cluster(points, 0.5, 2);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(2);
  });
});

describe("DBSCANAlgorithm.cluster — boundary + error cases", () => {
  it("BOUNDARY: empty input → empty labels (no throw)", () => {
    expect(DBSCANAlgorithm.cluster([], 1.0, 2)).toEqual([]);
  });

  it("BOUNDARY: single point with minPts=1 → 1 cluster", () => {
    const labels = DBSCANAlgorithm.cluster([[1, 1]], 1.0, 1);
    expect(DBSCANAlgorithm.clusterCount(labels)).toBe(1);
  });

  it("BOUNDARY: single point with minPts=2 → noise", () => {
    const labels = DBSCANAlgorithm.cluster([[1, 1]], 1.0, 2);
    expect(labels[0]).toBe(0);
  });

  it("FAIL-LOUD: non-array input throws", () => {
    expect(() => DBSCANAlgorithm.cluster(null as never, 1, 1)).toThrow(/array/);
  });

  it("FAIL-LOUD: ragged dims throw", () => {
    expect(() => DBSCANAlgorithm.cluster([[1, 2], [1]], 1, 1)).toThrow(/ragged/);
  });

  it("FAIL-LOUD: non-finite coordinate throws", () => {
    expect(() => DBSCANAlgorithm.cluster([[1, NaN]], 1, 1)).toThrow(/non-finite/);
    expect(() => DBSCANAlgorithm.cluster([[1, Infinity]], 1, 1)).toThrow(/non-finite/);
  });

  it("FAIL-LOUD: eps <= 0 throws", () => {
    expect(() => DBSCANAlgorithm.cluster([[1, 1]], 0, 1)).toThrow(/eps/);
    expect(() => DBSCANAlgorithm.cluster([[1, 1]], -1, 1)).toThrow(/eps/);
  });

  it("FAIL-LOUD: minPts non-integer or < 1 throws", () => {
    expect(() => DBSCANAlgorithm.cluster([[1, 1]], 1, 0)).toThrow(/minPts/);
    expect(() => DBSCANAlgorithm.cluster([[1, 1]], 1, 1.5)).toThrow(/minPts/);
  });

  it("FAIL-LOUD: zero-dim points throw", () => {
    expect(() => DBSCANAlgorithm.cluster([[], []], 1, 1)).toThrow(/dimension/);
  });
});

describe("DBSCANAlgorithm.clusterCount + noiseCount", () => {
  it("clusterCount handles all-noise labels", () => {
    expect(DBSCANAlgorithm.clusterCount([0, 0, 0])).toBe(0);
  });
  it("clusterCount counts distinct positive ids", () => {
    expect(DBSCANAlgorithm.clusterCount([1, 1, 2, 2, 3])).toBe(3);
  });
  it("noiseCount counts label === 0 only", () => {
    expect(DBSCANAlgorithm.noiseCount([0, 0, 1, 2])).toBe(2);
  });
  it("BOUNDARY: empty/non-array → 0", () => {
    expect(DBSCANAlgorithm.clusterCount([])).toBe(0);
    expect(DBSCANAlgorithm.noiseCount(null as never)).toBe(0);
  });
});
