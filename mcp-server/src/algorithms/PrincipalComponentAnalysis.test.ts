import { describe, it, expect } from "vitest";
import { PrincipalComponentAnalysis as PCA, type PCAInput } from "./PrincipalComponentAnalysis.js";

describe("PrincipalComponentAnalysis — reference values", () => {
  it("collinear data → PC1 captures ~100% of the variance", () => {
    // points on the line y = 2x → variance is one-dimensional
    const data = [[0, 0], [1, 2], [2, 4], [3, 6], [4, 8]];
    const out = PCA.calculate({ data, components: 2 });
    expect(out.explainedVarianceRatio[0]).toBeGreaterThan(0.999);
    expect(out.explainedVarianceRatio[1]).toBeLessThan(1e-6);
    expect(out.cumulativeRatio[1]).toBeCloseTo(1, 6);
  });

  it("PC1 axis points along the data direction (unit length)", () => {
    const data = [[0, 0], [1, 2], [2, 4], [3, 6], [4, 8]];
    const pc1 = PCA.calculate({ data, components: 1 }).components[0];
    const norm = Math.sqrt(pc1[0] * pc1[0] + pc1[1] * pc1[1]);
    expect(norm).toBeCloseTo(1, 6);
    // direction ∝ [1,2] → |pc1[1]/pc1[0]| ≈ 2
    expect(Math.abs(pc1[1] / pc1[0])).toBeCloseTo(2, 4);
  });

  it("centers data: mean is removed (reported in output)", () => {
    const data = [[10, 0], [12, 0], [14, 0]];
    const out = PCA.calculate({ data, components: 1 });
    expect(out.mean[0]).toBeCloseTo(12, 12);
    expect(out.mean[1]).toBeCloseTo(0, 12);
  });

  it("explained-variance ratios sum to 1 over a full-rank decomposition", () => {
    const data = [[1, 0, 0], [0, 2, 0], [0, 0, 3], [1, 1, 1]];
    const out = PCA.calculate({ data, components: 3 });
    const sum = out.explainedVarianceRatio.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe("PrincipalComponentAnalysis — properties", () => {
  it("scores have the expected shape n×k and components k×d", () => {
    const data = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [2, 0, 1]];
    const out = PCA.calculate({ data, components: 2 });
    expect(out.scores).toHaveLength(4);
    expect(out.scores.every((r) => r.length === 2)).toBe(true);
    expect(out.components).toHaveLength(2);
    expect(out.components.every((r) => r.length === 3)).toBe(true);
    expect([out.k, out.nSamples, out.nFeatures]).toEqual([2, 4, 3]);
  });

  it("explained variance is descending", () => {
    const data = [[1, 2, 0], [4, 1, 1], [7, 8, 0], [2, 0, 3], [3, 3, 3]];
    const out = PCA.calculate({ data, components: 3 });
    for (let i = 1; i < out.explainedVariance.length; i++)
      expect(out.explainedVariance[i]).toBeLessThanOrEqual(out.explainedVariance[i - 1] + 1e-9);
  });

  it("scale:true standardizes features (correlation-PCA) — large-unit feature stops dominating", () => {
    // feature 1 has huge scale; without scaling it would dominate PC1
    const data = [[1, 1000], [2, 2000], [1, 3000], [2, 4000], [1, 5000]];
    const raw = PCA.calculate({ data, components: 2, scale: false });
    const std = PCA.calculate({ data, components: 2, scale: true });
    // standardized PC1 gives feature 0 meaningfully more weight than the raw run
    expect(Math.abs(std.components[0][0])).toBeGreaterThan(Math.abs(raw.components[0][0]));
  });

  it("composes LowRankApproximation deterministically (same seed → same axes)", () => {
    const data = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [2, 0, 1]];
    const a = PCA.calculate({ data, components: 2, seed: 5 });
    const b = PCA.calculate({ data, components: 2, seed: 5 });
    expect(a.singularValues).toEqual(b.singularValues);
  });
});

describe("PrincipalComponentAnalysis — boundary + robustness", () => {
  it("components > min(n,d) is clamped with a warning", () => {
    const out = PCA.calculate({ data: [[1, 2], [3, 4], [5, 6]], components: 9 });
    expect(out.k).toBe(2); // min(3,2)
    expect(out.warnings.join(" ")).toMatch(/clamp/i);
  });

  it("constant data (zero variance) → zero explained variance, no NaN", () => {
    const out = PCA.calculate({ data: [[5, 5], [5, 5], [5, 5]], components: 1 });
    expect(out.explainedVariance[0]).toBe(0);
    expect(out.explainedVarianceRatio.every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe("PrincipalComponentAnalysis — failure modes", () => {
  it("rejects fewer than 2 samples", () => {
    expect(PCA.validate({ data: [[1, 2]], components: 1 }).valid).toBe(false);
  });
  it("rejects components < 1", () => {
    expect(PCA.validate({ data: [[1, 2], [3, 4]], components: 0 }).valid).toBe(false);
    expect(() => PCA.calculate({ data: [[1, 2], [3, 4]], components: 0 })).toThrow(/components|invalid/i);
  });
  it("rejects ragged data", () => {
    expect(PCA.validate({ data: [[1, 2], [3]], components: 1 } as PCAInput).valid).toBe(false);
  });
});

describe("PrincipalComponentAnalysis — adversarial inputs", () => {
  it("rejects NaN entries", () => {
    expect(PCA.validate({ data: [[NaN, 1], [2, 3]], components: 1 }).valid).toBe(false);
  });
  it("rejects Infinity entries", () => {
    expect(PCA.validate({ data: [[Infinity, 0], [1, 1]], components: 1 }).valid).toBe(false);
  });
});

describe("PrincipalComponentAnalysis — metadata", () => {
  it("exposes ml/dimensionality-reduction metadata with the Pearson reference", () => {
    const m = PCA.getMetadata();
    expect(m.id).toBe("principal_component_analysis");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Pearson/i);
  });
});
