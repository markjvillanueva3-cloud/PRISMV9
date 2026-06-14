import { describe, it, expect } from "vitest";
import { RANSACHyperplane as RH, type RANSACInput } from "./RANSACHyperplane.js";

const SQRT5 = Math.sqrt(5);

describe("RANSACHyperplane — clean 2D line (y = 2x + 1)", () => {
  // line 2x − y + 1 = 0 → unit normal (2,−1)/√5, direction (1,2)/√5
  const points = [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9]];

  it("fits all 5 points as inliers with ~0 residual", () => {
    const out = RH.calculate({ points, threshold: 0.01, seed: 1 });
    expect(out.inlierCount).toBe(5);
    expect(out.outliers).toEqual([]);
    expect(out.inlierRMS).toBeLessThan(1e-9);
    expect(out.dimension).toBe(2);
  });

  it("recovers the correct unit normal (canonical sign) and offset", () => {
    const out = RH.calculate({ points, threshold: 0.01, seed: 1 });
    expect(out.normal[0]).toBeCloseTo(2 / SQRT5, 6);
    expect(out.normal[1]).toBeCloseTo(-1 / SQRT5, 6);
    // normal ⟂ line direction (1,2)
    expect(out.normal[0] * 1 + out.normal[1] * 2).toBeCloseTo(0, 9);
    // every point satisfies n·p = c
    for (const p of points) expect(out.normal[0] * p[0] + out.normal[1] * p[1]).toBeCloseTo(out.offset, 6);
  });
});

describe("RANSACHyperplane — outlier rejection", () => {
  it("rejects 2 gross outliers, keeps the 5-point line consensus", () => {
    const points = [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9], [2, -10], [0, 20]];
    const out = RH.calculate({ points, threshold: 0.05, seed: 1, iterations: 200 });
    expect(out.inlierCount).toBe(5);
    expect(out.inliers).toEqual([0, 1, 2, 3, 4]);
    expect(out.outliers.sort((a, b) => a - b)).toEqual([5, 6]);
    expect(out.inlierRMS).toBeLessThan(1e-6);
  });
});

describe("RANSACHyperplane — 3D plane (z = 0)", () => {
  it("recovers normal (0,0,1), offset 0, excludes the off-plane outlier", () => {
    const points = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [2, 3, 0], [0, 0, 5]];
    const out = RH.calculate({ points, threshold: 0.01, seed: 2, iterations: 200 });
    expect(out.dimension).toBe(3);
    expect(out.normal[0]).toBeCloseTo(0, 6);
    expect(out.normal[1]).toBeCloseTo(0, 6);
    expect(out.normal[2]).toBeCloseTo(1, 6); // canonical sign → +z
    expect(out.offset).toBeCloseTo(0, 6);
    expect(out.inlierCount).toBe(5);
    expect(out.outliers).toEqual([5]);
  });
});

describe("RANSACHyperplane — refit + determinism", () => {
  const points = [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9]];
  it("applies the TLS refit on clean data (refined=true)", () => {
    const out = RH.calculate({ points, threshold: 0.01, seed: 1 });
    expect(out.refined).toBe(true);
  });
  it("is deterministic for a fixed seed", () => {
    const a = RH.calculate({ points, threshold: 0.01, seed: 5 });
    const b = RH.calculate({ points, threshold: 0.01, seed: 5 });
    expect(a.normal).toEqual(b.normal);
    expect(a.offset).toEqual(b.offset);
    expect(a.inliers).toEqual(b.inliers);
  });
  it("refit can be disabled", () => {
    const out = RH.calculate({ points, threshold: 0.01, seed: 1, refit: false });
    expect(out.refined).toBe(false);
    expect(out.inlierCount).toBe(5); // minimal-sample fit is already exact on clean data
  });
});

describe("RANSACHyperplane — failure modes", () => {
  it("rejects fewer points than the dimension", () => {
    expect(RH.validate({ points: [[0, 1]], threshold: 0.1 }).valid).toBe(false); // 1 < d=2
  });
  it("rejects d < 2 (scalar points)", () => {
    expect(RH.validate({ points: [[1], [2], [3]], threshold: 0.1 }).valid).toBe(false);
  });
  it("rejects non-positive threshold", () => {
    expect(RH.validate({ points: [[0, 0], [1, 1]], threshold: 0 }).valid).toBe(false);
    expect(RH.validate({ points: [[0, 0], [1, 1]], threshold: -1 }).valid).toBe(false);
  });
  it("rejects iterations < 1", () => {
    expect(RH.validate({ points: [[0, 0], [1, 1]], threshold: 0.1, iterations: 0 }).valid).toBe(false);
  });
  it("rejects ragged points", () => {
    expect(RH.validate({ points: [[0, 0], [1]], threshold: 0.1 }).valid).toBe(false);
  });
  it("throws on calculate with invalid input", () => {
    expect(() => RH.calculate({ points: [[0, 1]], threshold: 0.1 })).toThrow(/invalid/i);
  });
});

describe("RANSACHyperplane — adversarial inputs", () => {
  it("rejects NaN / Infinity in points", () => {
    expect(RH.validate({ points: [[0, NaN], [1, 1], [2, 2]], threshold: 0.1 }).valid).toBe(false);
    expect(RH.validate({ points: [[0, 0], [Infinity, 1], [2, 2]], threshold: 0.1 }).valid).toBe(false);
  });
  it("throws when all points are coincident (no hyperplane defined)", () => {
    expect(() => RH.calculate({ points: [[3, 3], [3, 3], [3, 3], [3, 3]], threshold: 0.1, seed: 1 })).toThrow(/no valid hyperplane|degenerate/i);
  });
});

describe("RANSACHyperplane — metadata", () => {
  it("exposes spatial/robust-estimation metadata with the Fischler-Bolles reference", () => {
    const m = RH.getMetadata();
    expect(m.id).toBe("ransac_hyperplane");
    expect(m.domain).toBe("spatial");
    expect(m.category).toBe("robust-estimation");
    expect(m.reference).toMatch(/Random Sample Consensus/i);
  });
});
