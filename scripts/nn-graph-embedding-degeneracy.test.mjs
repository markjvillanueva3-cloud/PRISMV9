// scripts/nn-graph-embedding-degeneracy.test.mjs — node:test for the embedding-degeneracy diagnostic.
// Reference values hand-computed (cosine = dot of unit vectors); no stubs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pairwiseCosineStats, centroidCollapse, gradeDegeneracy, analyze } from "./nn-graph-embedding-degeneracy.mjs";

const closeTo = (a, e, dp = 5) => assert.ok(Math.abs(a - e) < 0.5 * 10 ** -dp, `${a} !~= ${e}`);

// ── pairwiseCosineStats ──────────────────────────────────────────────────────
test("orthogonal pair → cosine 0", () => {
  const s = pairwiseCosineStats([[1, 0], [0, 1]]);
  assert.equal(s.pairs, 1);
  closeTo(s.meanCosine, 0);
  closeTo(s.maxCosine, 0);
  assert.equal(s.fracSaturated, 0);
  assert.equal(s.sampled, false);
});

test("identical pair → cosine 1, saturated", () => {
  const s = pairwiseCosineStats([[1, 0], [1, 0]]);
  closeTo(s.meanCosine, 1);
  closeTo(s.maxCosine, 1);
  assert.equal(s.fracSaturated, 1); // |1| > 0.99
});

test("three vectors → 3 pairs; mean/median/p99 are DISTINCT (locks median+p99, R9)", () => {
  // pairs: (0,1)=0, (0,2)=1, (1,2)=0 → sorted cosines [0,0,1]
  const s = pairwiseCosineStats([[1, 0], [0, 1], [1, 0]]);
  assert.equal(s.pairs, 3);
  closeTo(s.meanCosine, 1 / 3); // (0+1+0)/3
  closeTo(s.medianCosine, 0); // sorted[1] = 0 (distinct from mean → discriminates median())
  closeTo(s.p99Cosine, 1); // floor(3*0.99)=2 → sorted[2] = 1 (distinct from median → discriminates p99 index)
  closeTo(s.maxCosine, 1);
  closeTo(s.fracSaturated, 1 / 3);
});

test("<2 vectors / non-array → empty zeros", () => {
  assert.equal(pairwiseCosineStats([[1, 0]]).pairs, 0);
  assert.equal(pairwiseCosineStats([]).pairs, 0);
  assert.equal(pairwiseCosineStats(null).pairs, 0);
});

test("maxPairs cap → sampled=true, fewer pairs than total", () => {
  const vecs = Array.from({ length: 50 }, (_, i) => (i % 2 ? [1, 0] : [0, 1])); // 50 vectors → 1225 pairs
  const s = pairwiseCosineStats(vecs, { maxPairs: 100 });
  assert.equal(s.sampled, true);
  assert.ok(s.pairs <= 1225 && s.pairs > 0);
});

// ── centroidCollapse ─────────────────────────────────────────────────────────
test("collapsed (all same direction) → centroidNorm 1, meanCosToCentroid 1", () => {
  const c = centroidCollapse([[1, 0], [1, 0], [1, 0]]);
  closeTo(c.centroidNorm, 1);
  closeTo(c.meanCosToCentroid, 1);
  assert.equal(c.dim, 2);
});

test("opposed vectors → zero centroid → norm 0, meanCosToCentroid 0 (no preferred direction)", () => {
  const c = centroidCollapse([[1, 0], [-1, 0]]);
  closeTo(c.centroidNorm, 0);
  closeTo(c.meanCosToCentroid, 0);
});

test("orthogonal pair → centroid [0.5,0.5], norm 1/√2, meanCosToCentroid 1/√2", () => {
  const c = centroidCollapse([[1, 0], [0, 1]]);
  closeTo(c.centroidNorm, Math.SQRT1_2); // ||[0.5,0.5]|| = √0.5
  closeTo(c.meanCosToCentroid, Math.SQRT1_2);
});

test("empty → zeros", () => {
  const c = centroidCollapse([]);
  assert.equal(c.centroidNorm, 0);
  assert.equal(c.dim, 0);
});

// ── gradeDegeneracy ──────────────────────────────────────────────────────────
test("high meanCosine → degenerate", () => {
  assert.equal(gradeDegeneracy({ meanCosine: 0.6, centroidNorm: 0.1, fracSaturated: 0 }).verdict, "degenerate");
});

test("moderate meanCosine → mild", () => {
  assert.equal(gradeDegeneracy({ meanCosine: 0.3, centroidNorm: 0.1, fracSaturated: 0 }).verdict, "mild");
});

test("low everything → healthy", () => {
  assert.equal(gradeDegeneracy({ meanCosine: 0.05, centroidNorm: 0.1, fracSaturated: 0 }).verdict, "healthy");
});

test("high centroidNorm alone → degenerate", () => {
  assert.equal(gradeDegeneracy({ meanCosine: 0, centroidNorm: 0.8, fracSaturated: 0 }).verdict, "degenerate");
});

test("high fracSaturated alone → degenerate", () => {
  const g = gradeDegeneracy({ meanCosine: 0, centroidNorm: 0, fracSaturated: 0.1 });
  assert.equal(g.verdict, "degenerate");
  assert.ok(g.reasons.some((r) => r.includes("fracSaturated")));
});

// ── analyze (integration of the three) ───────────────────────────────────────
test("analyze on collapsed set → degenerate verdict + counts", () => {
  const r = analyze([[1, 0], [1, 0], [1, 0]]);
  assert.equal(r.count, 3);
  assert.equal(r.grade.verdict, "degenerate");
  closeTo(r.cosine.meanCosine, 1);
  closeTo(r.centroid.centroidNorm, 1);
});

test("analyze on a WELL-SPREAD set (8-d orthonormal) → healthy", () => {
  // centroidNorm is N-sensitive: ||mean of N orthonormal vectors|| = 1/√N, so a representative
  // spread set needs enough vectors that the baseline is below the threshold. 8 orthonormal in
  // 8-d → centroidNorm = 1/√8 ≈ 0.354 (< 0.4 mild), meanCosine 0 → healthy. (A 2-vector set has
  // centroidNorm 0.707 and is correctly NOT representative of a spread embedding set — see the
  // N-sensitivity note in the source; thresholds target the live N≳50 regime.)
  const eye8 = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => (i === j ? 1 : 0)));
  const r = analyze(eye8);
  closeTo(r.cosine.meanCosine, 0);
  closeTo(r.centroid.centroidNorm, 1 / Math.sqrt(8));
  assert.equal(r.grade.verdict, "healthy");
});
