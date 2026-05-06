/**
 * CrossProcessPrototypicalNetEngine.test.ts — XPROC-NEURAL Tier 7 (T7-02)
 *
 * Verifies Snell 2017 prototypical networks math + Tier 7 R2 acceptance:
 * "classification accuracy >=90% on 5-shot 5-way."
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessPrototypicalNetEngine,
  crossProcessPrototypicalNet,
} from "../engines/CrossProcessPrototypicalNetEngine.js";

// Deterministic LCG for reproducible synthetic embeddings.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return ((s & 0xFFFFFF) / 0x1000000); // [0, 1)
  };
}

// Box-Muller normal sampler from a uniform PRNG.
function gaussFromUniform(uniform: () => number, mean: number, sigma: number): number {
  let u1 = uniform();
  let u2 = uniform();
  while (u1 < 1e-10) u1 = uniform(); // avoid log(0)
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function noisyVector(rng: () => number, center: number[], sigma: number): number[] {
  return center.map((c) => gaussFromUniform(rng, c, sigma));
}

describe("prototype() — input validation", () => {
  it("rejects empty embeddings", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "P", embeddings: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects embedding dim mismatch within batch", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "P", embeddings: [[1, 2, 3], [1, 2]],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN in embedding", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "P", embeddings: [[1, Number.NaN, 3]],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("prototype() — math", () => {
  it("single embedding: prototype = embedding, variance = 0, warns", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "M", embeddings: [[1.5, -2.0, 0.3]],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prototype).toEqual([1.5, -2.0, 0.3]);
      expect(r.perDimVariance.every((v) => v === 0)).toBe(true);
      expect(r.warnings.some((w) => w.includes("single support sample"))).toBe(true);
    }
  });

  it("3 embeddings: prototype is element-wise mean", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "K",
      embeddings: [
        [1, 2, 3],
        [3, 6, 9],
        [5, 10, 15],
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prototype).toEqual([3, 6, 9]);
    }
  });

  it("variance is unbiased sample variance (N-1 denominator)", () => {
    // 3 embeddings (1, 2, 3) along dim 0: mean=2, deviations=[-1,0,1],
    // sum_sq=2, /(N-1)=2/2=1.0
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "x", embeddings: [[1], [2], [3]],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.perDimVariance[0]).toBeCloseTo(1.0, 9);
    }
  });

  it("supportSize reflects number of embeddings", () => {
    const r = CrossProcessPrototypicalNetEngine.computePrototype({
      classId: "x", embeddings: [[0], [0], [0], [0]],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.supportSize).toBe(4);
  });
});

describe("classify() — input validation", () => {
  it("rejects empty prototypes", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [1, 2, 3], prototypes: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects prototype dim mismatch with query", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [1, 2, 3],
      prototypes: [{ classId: "P", prototype: [1, 2] }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("classify() — math", () => {
  it("query at prototype P → P has highest probability + nearestDistance=0", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [0, 0, 0],
      prototypes: [
        { classId: "P", prototype: [0, 0, 0] },
        { classId: "M", prototype: [10, 0, 0] },
        { classId: "K", prototype: [0, 10, 0] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.predicted).toBe("P");
      expect(r.nearestDistance).toBe(0);
      const pProb = r.probabilities.find((p) => p.classId === "P")!;
      expect(pProb.probability).toBeGreaterThan(0.99);
    }
  });

  it("equidistant query → uniform probabilities", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "A", prototype: [1, 0] },
        { classId: "B", prototype: [-1, 0] },
        { classId: "C", prototype: [0, 1] },
        { classId: "D", prototype: [0, -1] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const p of r.probabilities) {
        expect(p.probability).toBeCloseTo(0.25, 6);
      }
    }
  });

  it("dedupes duplicate classIds with warning", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "P", prototype: [1, 0] },
        { classId: "P", prototype: [-1, 0] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.probabilities.length).toBe(1);
      expect(r.warnings.some((w) => w.includes("duplicate"))).toBe(true);
    }
  });

  it("squaredDistance reported per prototype matches manual calc", () => {
    const r = CrossProcessPrototypicalNetEngine.classify({
      queryEmbedding: [3, 4],
      prototypes: [
        { classId: "X", prototype: [0, 0] },
        { classId: "Y", prototype: [3, 0] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const x = r.probabilities.find((p) => p.classId === "X")!;
      const y = r.probabilities.find((p) => p.classId === "Y")!;
      expect(x.squaredDistance).toBe(25); // 3² + 4²
      expect(y.squaredDistance).toBe(16); // 0² + 4²
    }
  });
});

describe("Tier 7 R2 acceptance: 5-shot 5-way classification ≥90% accuracy", () => {
  it("synthetic 5-class 8-D embedding task achieves ≥90% accuracy", () => {
    // 5 well-separated class centers in 8-D space.
    const trueCenters: number[][] = [];
    const rng = lcg(0xCAFEBABE);
    for (let c = 0; c < 5; c++) {
      const center = new Array<number>(8);
      for (let d = 0; d < 8; d++) center[d] = c * 2.5 + (d === c ? 1 : 0); // separated
      trueCenters.push(center);
    }

    // 5-shot support: 5 noisy samples per class.
    const prototypes: { classId: string; prototype: number[] }[] = [];
    for (let c = 0; c < 5; c++) {
      const supportEmbeddings: number[][] = [];
      for (let s = 0; s < 5; s++) {
        supportEmbeddings.push(noisyVector(rng, trueCenters[c], 0.2));
      }
      const proto = CrossProcessPrototypicalNetEngine.computePrototype({
        classId: `class-${c}`, embeddings: supportEmbeddings,
      });
      expect(proto.ok).toBe(true);
      if (proto.ok) {
        prototypes.push({ classId: `class-${c}`, prototype: proto.prototype });
      }
    }

    // 50 queries (10 per class), measure accuracy.
    let correct = 0;
    let total = 0;
    for (let c = 0; c < 5; c++) {
      for (let q = 0; q < 10; q++) {
        const queryEmbedding = noisyVector(rng, trueCenters[c], 0.2);
        const r = CrossProcessPrototypicalNetEngine.classify({
          queryEmbedding, prototypes,
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
          if (r.predicted === `class-${c}`) correct++;
          total++;
        }
      }
    }

    expect(correct / total).toBeGreaterThanOrEqual(0.90);
  });
});

describe("regress() — input validation", () => {
  it("rejects values.length != prototypes.length", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "P", prototype: [1, 0] },
        { classId: "M", prototype: [-1, 0] },
      ],
      values: [10],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative temperature", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0],
      prototypes: [{ classId: "P", prototype: [0] }],
      values: [1],
      temperature: -0.5,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("regress() — Nadaraya-Watson math", () => {
  it("query at prototype → returns its value (weight ≈ 1)", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0, 0, 0],
      prototypes: [
        { classId: "P", prototype: [0, 0, 0] },
        { classId: "M", prototype: [10, 10, 10] },
      ],
      values: [3.14, 99.0],
      temperature: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.predictedValue).toBeCloseTo(3.14, 4);
      const pWeight = r.weights.find((w) => w.classId === "P")!;
      expect(pWeight.weight).toBeGreaterThan(0.999);
    }
  });

  it("equidistant query → average of values", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "A", prototype: [1, 0] },
        { classId: "B", prototype: [-1, 0] },
        { classId: "C", prototype: [0, 1] },
        { classId: "D", prototype: [0, -1] },
      ],
      values: [10, 20, 30, 40],
      temperature: 1.0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.predictedValue).toBeCloseTo(25, 6); // simple mean
      for (const w of r.weights) expect(w.weight).toBeCloseTo(0.25, 6);
    }
  });

  it("auto-temperature uses median of squared distances", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "near", prototype: [1, 0] },   // d²=1
        { classId: "mid", prototype: [2, 0] },    // d²=4
        { classId: "far", prototype: [3, 0] },    // d²=9
      ],
      values: [10, 20, 30],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.temperature).toBe(4); // median of [1, 4, 9]
    }
  });

  it("kernelMass low but finite → returns weights (in-band OOD)", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [3, 0],
      prototypes: [{ classId: "P", prototype: [0, 0] }],
      values: [42],
      temperature: 1.0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // d²=9, kernel = exp(-9) ≈ 1.23e-4 — small but well above SOFTMAX_EPS.
      expect(r.kernelMass).toBeLessThan(0.01);
      expect(r.kernelMass).toBeGreaterThan(0);
      expect(r.predictedValue).toBeCloseTo(42, 6); // single proto → unit weight
    }
  });

  it("kernelMass underflow (extreme OOD) → invalid_state safety error", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [100, 100, 100],
      prototypes: [{ classId: "P", prototype: [0, 0, 0] }],
      values: [42],
      temperature: 1.0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_state" });
    if (!r.ok) expect(r.message).toMatch(/kernel mass/);
  });

  it("weights sum to 1.0", () => {
    const r = CrossProcessPrototypicalNetEngine.regress({
      queryEmbedding: [0.5, 0.5],
      prototypes: [
        { classId: "A", prototype: [0, 0] },
        { classId: "B", prototype: [1, 0] },
        { classId: "C", prototype: [0, 1] },
      ],
      values: [1, 2, 3],
      temperature: 1.0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      let sum = 0;
      for (const w of r.weights) sum += w.weight;
      expect(sum).toBeCloseTo(1.0, 9);
    }
  });
});

describe("constants() + dispatcher wrapper", () => {
  it("constants snapshot exposes bounds", () => {
    const c = CrossProcessPrototypicalNetEngine.constants();
    expect(c.MAX_EMBEDDING_DIM).toBe(4096);
    expect(c.MAX_PROTOTYPES).toBe(1024);
  });

  it("dispatcher wrapper routes xproc_proto_compute", () => {
    const r = crossProcessPrototypicalNet("xproc_proto_compute", {
      classId: "P", embeddings: [[1, 2], [3, 4], [5, 6]],
    }) as { ok: boolean; prototype?: number[] };
    expect(r.ok).toBe(true);
    expect(r.prototype).toEqual([3, 4]);
  });

  it("dispatcher wrapper routes xproc_proto_classify", () => {
    const r = crossProcessPrototypicalNet("xproc_proto_classify", {
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "near", prototype: [0.1, 0] },
        { classId: "far", prototype: [10, 10] },
      ],
    }) as { ok: boolean; predicted?: string };
    expect(r.ok).toBe(true);
    expect(r.predicted).toBe("near");
  });

  it("dispatcher wrapper routes xproc_proto_regress", () => {
    const r = crossProcessPrototypicalNet("xproc_proto_regress", {
      queryEmbedding: [0, 0],
      prototypes: [
        { classId: "X", prototype: [0, 0] },
      ],
      values: [42],
      temperature: 1.0,
    }) as { ok: boolean; predictedValue?: number };
    expect(r.ok).toBe(true);
    expect(r.predictedValue).toBe(42);
  });

  it("dispatcher wrapper rejects unknown action", () => {
    expect(() => crossProcessPrototypicalNet("xproc_proto_bogus", {})).toThrow(/unknown action/);
  });
});
