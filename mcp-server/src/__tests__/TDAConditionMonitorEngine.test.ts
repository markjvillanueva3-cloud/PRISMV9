/**
 * TDAConditionMonitorEngine — topological-data-analysis condition-monitor tests.
 *
 * Reference geometry (all hand-derivable, closed-form Euclidean distances --
 * see module doc + engine source for the Takens/Vietoris-Rips/persistence
 * pipeline this validates):
 *
 *   - Unit square (4 points, dimension 2): the Vietoris-Rips H1 loop is born
 *     when the 4 side-edges (length 1) close the 4-cycle, and dies when the
 *     first diagonal (length sqrt(2)) triangulates it -- birth=1, death=sqrt(2),
 *     persistence=sqrt(2)-1, normalized=1-1/sqrt(2). Hand-derived via the
 *     standard mod-2 boundary-matrix reduction (Edelsbrunner & Harer, 2010)
 *     and cross-checked bit-for-bit against the engine's own output.
 *   - Regular n-gon inscribed in a unit circle: the Rips-complex loop is born
 *     at the side-chord length 2*sin(pi/n) and dies at the k-step short-diagonal
 *     chord 2*sin(k*pi/n) once enough triangles fill in (Adamaszek & Adams,
 *     "The Vietoris-Rips complexes of a circle," 2013) -- verified for a
 *     hexagon (k=2, death=sqrt(3)) and an octagon (k=3).
 *   - A pure sinusoid, adequately delay-embedded (Takens 1981), reconstructs a
 *     topological circle: exactly one dominant, well-separated H1 loop whose
 *     normalized lifetime clears CONFIG.SIGNIFICANCE_RATIO by a wide margin
 *     over Gaussian-noise trials seeded with a deterministic PRNG (no flakiness).
 *   - A constant series has zero variation -> the delay-embedded point cloud
 *     collapses to a single point -> "degenerate" regime, no cycles possible.
 *
 * Regression coverage: the engine originally mis-computed h0Components by
 * comparing a *finite* (already-merged) dim-0 pair's death against
 * `maxEpsilon - EPS_MACHINE`, which can coincidentally tie with maxEpsilon
 * when the last component-merging edge happens to equal the point cloud's own
 * diameter -- double-counting a component that was already merged, alongside
 * the one true survivor. Fixed to count the true essential (never-paired)
 * dim-0 classes directly; see the adversarial "tied-diameter" test below,
 * which reproduces the exact failure and pins the fix (Betti0 must always be
 * 1 at the filtration ceiling, since maxEpsilon is defined as the cloud's own
 * diameter, so the 1-skeleton at that scale is always the complete graph K_n).
 *
 * Tests verify intent (R9): exact/closed-form geometric reference values, not
 * `toBeDefined()` stubs. No `.skip`/`.only`. RNG (Gaussian-noise generation)
 * is a seeded mulberry32 PRNG for full determinism -- never `Math.random()`.
 */

import { describe, it, expect } from "vitest";
import { tdamonitorEngine } from "../engines/TDAConditionMonitorEngine.js";
import { EPS_MACHINE } from "../physics/constants.js";

// ─── Deterministic helpers (no Math.random -- fixed/seeded, per task rules) ─

/** mulberry32 -- small, fast, seedable PRNG (public-domain algorithm). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform over a seeded uniform PRNG -- deterministic "Gaussian" noise. */
function seededGaussianSeries(n: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(rnd(), 1e-12);
    const u2 = rnd();
    out.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
  }
  return out;
}

function sineSeries(n: number, period: number, amp = 1, phase = 0): number[] {
  const out: number[] = [];
  for (let t = 0; t < n; t++) out.push(amp * Math.sin((2 * Math.PI * t) / period + phase));
  return out;
}

function regularPolygon(n: number, r = 1, cx = 0, cy = 0): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n;
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  return pts;
}

/** Chord length between two vertices k steps apart on a regular n-gon of radius r. */
function chord(n: number, k: number, r = 1): number {
  return 2 * r * Math.sin((k * Math.PI) / n);
}

// ═════════════════════════════════════════════════════════════════════════
// embed() -- Takens time-delay embedding
// ═════════════════════════════════════════════════════════════════════════

describe("TDAConditionMonitorEngine.embed()", () => {
  it("embeds a known series into R^3 exactly (hand-computed, delay=2)", () => {
    const series = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = tdamonitorEngine.embed(series, 3, 2);
    expect(result.dimension).toBe(3);
    expect(result.delay).toBe(2);
    expect(result.sourceLength).toBe(10);
    // pointCount = N - (d-1)*tau = 10 - 4 = 6
    expect(result.pointCount).toBe(6);
    expect(result.points).toEqual([
      [1, 3, 5],
      [2, 4, 6],
      [3, 5, 7],
      [4, 6, 8],
      [5, 7, 9],
      [6, 8, 10],
    ]);
  });

  it("returns pointCount=0 (empty points) when the series is shorter than the embedding span", () => {
    const result = tdamonitorEngine.embed([1, 2, 3], 3, 5); // span = 2*5=10 > 3
    expect(result.pointCount).toBe(0);
    expect(result.points).toEqual([]);
  });

  it("throws on dimension < 2 (adversarial: invalid embedding dimension)", () => {
    expect(() => tdamonitorEngine.embed([1, 2, 3, 4], 1, 1)).toThrow(/dimension/);
    expect(() => tdamonitorEngine.embed([1, 2, 3, 4], 2.5, 1)).toThrow(/dimension/);
  });

  it("throws on delay < 1 (adversarial: invalid delay)", () => {
    expect(() => tdamonitorEngine.embed([1, 2, 3, 4], 2, 0)).toThrow(/delay/);
  });

  it("throws on empty or non-finite series (adversarial: malformed input)", () => {
    expect(() => tdamonitorEngine.embed([], 2, 1)).toThrow(/non-empty/);
    expect(() => tdamonitorEngine.embed([1, NaN, 3], 2, 1)).toThrow(/finite/);
    expect(() => tdamonitorEngine.embed([1, Infinity, 3], 2, 1)).toThrow(/finite/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// suggestDelay()
// ═════════════════════════════════════════════════════════════════════════

describe("TDAConditionMonitorEngine.suggestDelay()", () => {
  it("returns 1 for a constant series (no autocorrelation structure)", () => {
    expect(tdamonitorEngine.suggestDelay([5, 5, 5, 5, 5, 5])).toBe(1);
  });

  it("returns 1 for a too-short series (n < 4)", () => {
    expect(tdamonitorEngine.suggestDelay([1, 2, 3])).toBe(1);
  });

  it("suggests a delay in a sane quarter-period neighborhood for a clean sinusoid", () => {
    const period = 20;
    const delay = tdamonitorEngine.suggestDelay(sineSeries(200, period));
    // Continuous theory gives exactly period/4; the finite, boundary-biased
    // autocorrelation estimator used here is documented as approximate --
    // assert it lands within +/-2 samples of the theoretical quarter period.
    expect(Math.abs(delay - period / 4)).toBeLessThanOrEqual(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// computePersistence() -- Vietoris-Rips + mod-2 persistence, hand-derived refs
// ═════════════════════════════════════════════════════════════════════════

describe("TDAConditionMonitorEngine.computePersistence()", () => {
  it("unit square: H1 loop born at side length 1, dies at diagonal sqrt(2) (hand-derived boundary-matrix reduction)", () => {
    const square = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const p = tdamonitorEngine.computePersistence(square, 48);
    expect(p.h1Features).toHaveLength(1);
    const loop = p.h1Features[0];
    expect(loop.birth).toBeCloseTo(1, 12);
    expect(loop.death).toBeCloseTo(Math.sqrt(2), 12);
    expect(loop.persistence).toBeCloseTo(Math.sqrt(2) - 1, 12);
    expect(loop.persistence).toBeGreaterThan(EPS_MACHINE); // clears the engine's own keep-vs-discard floor
    expect(loop.normalizedPersistence).toBeCloseTo(1 - 1 / Math.sqrt(2), 12);
    expect(p.h0Components).toBe(1); // the complete graph K_4 is always connected at maxEpsilon
    expect(p.maxEpsilon).toBeCloseTo(Math.sqrt(2), 12);
    // 4 vertices + C(4,2)=6 edges + C(4,3)=4 triangles = 14
    expect(p.simplexCount).toBe(14);
  });

  it("regular hexagon on a unit circle: H1 loop born at the side chord, dies at the k=2 short-diagonal chord (sqrt(3))", () => {
    const hex = regularPolygon(6, 1);
    const p = tdamonitorEngine.computePersistence(hex, 48);
    expect(p.h1Features).toHaveLength(1);
    const loop = p.h1Features[0];
    expect(loop.birth).toBeCloseTo(chord(6, 1), 10);
    expect(loop.death).toBeCloseTo(chord(6, 2), 10);
    expect(loop.death).toBeCloseTo(Math.sqrt(3), 10);
    expect(p.h0Components).toBe(1);
    expect(p.maxEpsilon).toBeCloseTo(2, 10); // diameter of a unit-radius hexagon = 2r
  });

  it("regular octagon on a unit circle: H1 loop born/dies at the analytically predicted chord lengths", () => {
    const oct = regularPolygon(8, 1);
    const p = tdamonitorEngine.computePersistence(oct, 48);
    expect(p.h1Features).toHaveLength(1);
    expect(p.h1Features[0].birth).toBeCloseTo(chord(8, 1), 10);
    expect(p.h1Features[0].death).toBeCloseTo(chord(8, 3), 10);
    expect(p.h0Components).toBe(1);
  });

  it("REGRESSION (adversarial): a tied-diameter last-merge must NOT double-count Betti0", () => {
    // A is equidistant from B and C, and that shared distance is ALSO the
    // global diameter (bigger than B-C) -- the last component-merge event
    // (A joining {B,C}) lands exactly at maxEpsilon. Before the fix this
    // produced h0Components=2; the true answer is always 1, because
    // maxEpsilon is defined as the cloud's own diameter, so at that scale
    // every pairwise edge exists (complete graph K_3), which is always
    // fully connected.
    const A = [0, 0];
    const B = [10, 0.00005];
    const C = [10, -0.00005];
    const dAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const dAC = Math.hypot(C[0] - A[0], C[1] - A[1]);
    const dBC = Math.hypot(C[0] - B[0], C[1] - B[1]);
    expect(dAB).toBe(dAC); // construction precondition: exact float tie
    expect(dBC).toBeLessThan(dAB); // B-C must NOT be the diameter

    const p = tdamonitorEngine.computePersistence([A, B, C], 48);
    expect(p.h0Components).toBe(1);
    expect(p.maxEpsilon).toBeCloseTo(dAB, 12);
  });

  it("ADVERSARIAL: two well-separated but comparable-scale loops both register as significant H1 features", () => {
    // Two octagons of unit radius, centers 3 apart -- comparable to each
    // loop's own scale (unlike a 100-unit offset, which would swamp the
    // normalization and hide both loops below the significance floor).
    const c1 = regularPolygon(8, 1, 0, 0);
    const c2 = regularPolygon(8, 1, 3, 0);
    const p = tdamonitorEngine.computePersistence([...c1, ...c2], 48);
    expect(p.h1Features.length).toBeGreaterThanOrEqual(2);
    const [first, second] = p.h1Features;
    expect(first.normalizedPersistence).toBeGreaterThanOrEqual(tdamonitorEngine.config.SIGNIFICANCE_RATIO);
    expect(second.normalizedPersistence).toBeGreaterThanOrEqual(tdamonitorEngine.config.SIGNIFICANCE_RATIO);
    // Both octagons are geometrically identical -> symmetric persistence.
    expect(first.persistence).toBeCloseTo(second.persistence, 9);
  });

  it("collapsed (all-identical) point cloud returns the degenerate empty summary", () => {
    const collapsed = [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
    ];
    const p = tdamonitorEngine.computePersistence(collapsed, 48);
    expect(p.h1Features).toEqual([]);
    expect(p.maxEpsilon).toBe(0);
    expect(p.dominantLoopLifetime).toBe(0);
  });

  it("fewer than 3 points returns the trivial empty summary (documented fallback, not a crash)", () => {
    const p = tdamonitorEngine.computePersistence(
      [
        [0, 0],
        [1, 1],
      ],
      48,
    );
    expect(p.h0Components).toBe(2);
    expect(p.h1Features).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// monitor() -- end-to-end regime classification (reference signals)
// ═════════════════════════════════════════════════════════════════════════

describe("TDAConditionMonitorEngine.monitor()", () => {
  it("pure sine wave (adequate tau) -> one dominant persistent H1 loop, stable_limit_cycle, low chatter risk", () => {
    const sine = sineSeries(200, 20);
    const result = tdamonitorEngine.monitor(sine);
    expect(result.regime).toBe("stable_limit_cycle");
    expect(result.significantLoopCount).toBe(1);
    expect(result.chatterRisk).toBe("low");
    expect(result.persistence.h0Components).toBe(1);
    expect(result.persistence.normalizedDominantLifetime).toBeGreaterThan(
      tdamonitorEngine.config.SIGNIFICANCE_RATIO,
    );
    expect(result.dominantLoop.value).toBe(result.persistence.normalizedDominantLifetime);
  });

  it("constant signal -> degenerate regime, zero persistent loops", () => {
    const result = tdamonitorEngine.monitor(new Array(100).fill(42));
    expect(result.regime).toBe("degenerate");
    expect(result.significantLoopCount).toBe(0);
    expect(result.dominantLoop.value).toBe(0);
    expect(result.persistence.h1Features).toEqual([]);
  });

  it("Gaussian noise (seeded, deterministic) -> no loop above the significance floor, across multiple seeds", () => {
    const seeds = [12345, 999, 42424242];
    for (const seed of seeds) {
      const noise = seededGaussianSeries(200, seed);
      const result = tdamonitorEngine.monitor(noise);
      expect(result.regime).toBe("no_periodicity");
      expect(result.significantLoopCount).toBe(0);
      expect(result.chatterRisk).toBe("low");
      expect(result.persistence.normalizedDominantLifetime).toBeLessThan(
        tdamonitorEngine.config.SIGNIFICANCE_RATIO,
      );
    }
  });

  it("sine dominant loop lifetime is far greater than Gaussian-noise dominant loop lifetime", () => {
    const sineResult = tdamonitorEngine.monitor(sineSeries(200, 20));
    const noiseResult = tdamonitorEngine.monitor(seededGaussianSeries(200, 12345));
    expect(sineResult.persistence.normalizedDominantLifetime).toBeGreaterThan(
      3 * noiseResult.persistence.normalizedDominantLifetime,
    );
    // Sine clears the significance gate; noise does not.
    expect(sineResult.significantLoopCount).toBeGreaterThanOrEqual(1);
    expect(noiseResult.significantLoopCount).toBe(0);
  });

  it("determinism: repeated monitor() calls on the identical series produce identical results (fixed/seeded subsample, no RNG)", () => {
    const sine = sineSeries(200, 20);
    const a = tdamonitorEngine.monitor(sine);
    const b = tdamonitorEngine.monitor(sine);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Also true for an oversized series (exercises the even-stride subsample path).
    const longNoise = seededGaussianSeries(500, 7);
    const c = tdamonitorEngine.monitor(longNoise, { maxPoints: 48 });
    const d = tdamonitorEngine.monitor(longNoise, { maxPoints: 48 });
    expect(JSON.stringify(c)).toBe(JSON.stringify(d));
  });

  it("insufficient_data regime for too-short embeddings (below MIN_POINTS)", () => {
    // dimension=3 (default), delay=1 explicit -> span=2, need series length
    // such that pointCount < MIN_POINTS(6): length=7 -> pointCount=5.
    const result = tdamonitorEngine.monitor([1, 2, 3, 2, 1, 2, 3], { delay: 1 });
    expect(result.regime).toBe("insufficient_data");
    expect(result.significantLoopCount).toBe(0);
    expect(result.embedding.pointCount).toBe(5);
  });

  it("boundary: exactly MIN_POINTS embedded points does not trigger insufficient_data", () => {
    // dimension=3, delay=1 -> span=2; need pointCount=6 exactly -> length=8.
    const result = tdamonitorEngine.monitor(sineSeries(8, 6), { delay: 1 });
    expect(result.regime).not.toBe("insufficient_data");
    expect(result.embedding.pointCount).toBe(6);
  });

  it("throws on invalid dimension/delay/maxPoints options (adversarial: malformed config)", () => {
    const series = sineSeries(50, 10);
    expect(() => tdamonitorEngine.monitor(series, { dimension: 1 })).toThrow(/dimension/);
    expect(() => tdamonitorEngine.monitor(series, { maxPoints: 3 })).toThrow(/maxPoints/);
    expect(() => tdamonitorEngine.monitor(series, { delay: 0 })).toThrow(/delay/);
  });

  it("throws on empty or non-finite series (adversarial: malformed input)", () => {
    expect(() => tdamonitorEngine.monitor([])).toThrow(/non-empty/);
    expect(() => tdamonitorEngine.monitor([1, NaN, 3, 4, 5, 6, 7, 8])).toThrow(/finite/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// detectRegimeChange()
// ═════════════════════════════════════════════════════════════════════════

describe("TDAConditionMonitorEngine.detectRegimeChange()", () => {
  it("flags no change when regime and loop count are identical", () => {
    const baseline = tdamonitorEngine.monitor(sineSeries(200, 20));
    const current = tdamonitorEngine.monitor(sineSeries(200, 20, 1, 0.001));
    const change = tdamonitorEngine.detectRegimeChange(baseline, current);
    expect(change.changed).toBe(false);
    expect(change.loopCountDelta).toBe(0);
    expect(change.reason).toMatch(/unchanged/);
  });

  it("flags a chatter-onset change when the significant loop count rises", () => {
    const baseline = tdamonitorEngine.monitor(sineSeries(200, 20));
    // Construct a "current" result via a stable_limit_cycle-shaped object with
    // an injected second significant loop to exercise the comparison contract
    // directly (deterministic, no dependency on finding a natural multi_loop
    // signal through the full embedding pipeline).
    const current = {
      ...baseline,
      regime: "multi_loop" as const,
      significantLoopCount: 2,
    };
    const change = tdamonitorEngine.detectRegimeChange(baseline, current);
    expect(change.changed).toBe(true);
    expect(change.loopCountDelta).toBe(1);
    expect(change.reason).toMatch(/chatter|period-doubling/);
  });

  it("flags loss of the stable limit cycle when the loop count falls", () => {
    const baseline = tdamonitorEngine.monitor(sineSeries(200, 20));
    const current = tdamonitorEngine.monitor(seededGaussianSeries(200, 12345));
    const change = tdamonitorEngine.detectRegimeChange(baseline, current);
    expect(change.changed).toBe(true);
    expect(change.loopCountDelta).toBeLessThan(0);
    expect(change.reason).toMatch(/loss of the stable limit cycle/);
  });
});
