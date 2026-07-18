import { describe, it, expect } from "vitest";
import { DynamicTimeWarping as DTW, type DTWInput } from "./DynamicTimeWarping.js";

// scalar series helper → [T × 1]
const s = (...xs: number[]): number[][] => xs.map((x) => [x]);

describe("DynamicTimeWarping — reference values", () => {
  it("identical series → distance 0 + pure diagonal path", () => {
    const out = DTW.calculate({ a: s(1, 2, 3), b: s(1, 2, 3) });
    expect(out.distance).toBe(0);
    expect(out.path).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(out.normalizedDistance).toBe(0);
  });

  it("time-shifted identical pattern warps to near-zero cost (vs Euclidean)", () => {
    // b is a one-step-stretched version of a; DTW absorbs the warp
    const a = s(1, 2, 3, 4);
    const b = s(1, 2, 2, 3, 4); // value 2 held an extra step
    const out = DTW.calculate({ a, b });
    expect(out.distance).toBe(0); // every matched pair is equal under warp
  });

  it("computes the exact warping cost on a known small case", () => {
    // a=[1,3], b=[2,2]: best align (0,0)+(1,1) → |1-2|+|3-2| = 2 (manhattan, d=1)
    const out = DTW.calculate({ a: s(1, 3), b: s(2, 2), metric: "manhattan" });
    expect(out.distance).toBe(2);
  });

  it("multivariate (d=2) euclidean per-step distance", () => {
    // single-step series: dist = ‖[3,4]−[0,0]‖ = 5
    const out = DTW.calculate({ a: [[3, 4]], b: [[0, 0]] });
    expect(out.distance).toBeCloseTo(5, 12);
    expect(out.dim).toBe(2);
  });
});

describe("DynamicTimeWarping — properties", () => {
  it("distance is symmetric: DTW(a,b) == DTW(b,a)", () => {
    const a = s(1, 4, 2, 5, 3);
    const b = s(1, 2, 4, 3, 5, 2);
    expect(DTW.calculate({ a, b }).distance).toBeCloseTo(DTW.calculate({ a: b, b: a }).distance, 12);
  });

  it("path is monotone non-decreasing in both indices and spans both endpoints", () => {
    const out = DTW.calculate({ a: s(1, 2, 3, 4), b: s(1, 1, 2, 4) });
    expect(out.path[0]).toEqual([0, 0]);
    expect(out.path[out.path.length - 1]).toEqual([3, 3]);
    for (let k = 1; k < out.path.length; k++) {
      expect(out.path[k][0]).toBeGreaterThanOrEqual(out.path[k - 1][0]);
      expect(out.path[k][1]).toBeGreaterThanOrEqual(out.path[k - 1][1]);
    }
  });

  it("Sakoe-Chiba window constrains the warp (band ≥ |Ta−Tb|)", () => {
    const a = s(1, 2, 3, 4, 5);
    const b = s(1, 2, 3, 4, 5);
    const out = DTW.calculate({ a, b, window: 1 });
    expect(out.window).toBe(1);
    expect(out.distance).toBe(0); // diagonal fits in band
  });

  it("metric=sqeuclidean squares the per-step cost", () => {
    const out = DTW.calculate({ a: [[0]], b: [[3]], metric: "sqeuclidean" });
    expect(out.distance).toBe(9); // 3² (vs 3 euclidean)
  });
});

describe("DynamicTimeWarping — failure modes", () => {
  it("rejects feature-dimension mismatch", () => {
    const bad: DTWInput = { a: [[1, 2]], b: [[1]] };
    expect(DTW.validate(bad).valid).toBe(false);
    expect(() => DTW.calculate(bad)).toThrow(/dim mismatch|invalid/i);
  });
  it("rejects empty series", () => {
    expect(DTW.validate({ a: [], b: s(1) }).valid).toBe(false);
  });
  it("rejects window smaller than |Ta−Tb| (no spanning path)", () => {
    expect(DTW.validate({ a: s(1, 2, 3, 4, 5), b: s(1), window: 1 }).valid).toBe(false);
  });
  it("rejects negative window", () => {
    expect(DTW.validate({ a: s(1), b: s(1), window: -1 }).valid).toBe(false);
  });
});

describe("DynamicTimeWarping — adversarial inputs", () => {
  it("rejects NaN values", () => {
    expect(DTW.validate({ a: [[NaN]], b: [[1]] }).valid).toBe(false);
  });
  it("rejects Infinity values", () => {
    expect(DTW.validate({ a: [[Infinity]], b: [[1]] }).valid).toBe(false);
  });
  it("rejects unknown metric", () => {
    expect(DTW.validate({ a: s(1), b: s(1), metric: "cosine" as DTWInput["metric"] }).valid).toBe(false);
  });
});

describe("DynamicTimeWarping — metadata", () => {
  it("exposes ml/sequence-alignment metadata with the Sakoe-Chiba reference", () => {
    const m = DTW.getMetadata();
    expect(m.id).toBe("dynamic_time_warping");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Sakoe/i);
  });
});
