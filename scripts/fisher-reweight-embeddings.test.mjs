// Tests for fisher-reweight-embeddings.mjs -- the pure diagonal-LDA dimension-weighting helpers.
// Run: node --test scripts/fisher-reweight-embeddings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fisherDimWeights, applyDimWeights } from "./fisher-reweight-embeddings.mjs";

test("fisherDimWeights -- discriminative dim gets HIGH weight, non-discriminative (noise) dim gets ~0", () => {
  // dim0 separates the classes (A at +1, B at -1, zero within-class variance);
  // dim1 is pure within-class noise (same spread in both classes, zero between-class).
  const vectors = [
    [1, 0], [1, 10],   // class A
    [-1, 0], [-1, 10],  // class B
  ];
  const labels = ["A", "A", "B", "B"];
  const w = fisherDimWeights(vectors, labels);
  assert.equal(w.length, 2);
  assert.ok(w[0] > w[1], `discriminative dim0 (${w[0]}) > noise dim1 (${w[1]})`);
  assert.ok(w[1] < 0.05, `noise dim1 weight ~0 (${w[1]})`);
  assert.ok(w[0] > 1.5, `discriminative dim0 weight boosted above mean-1 (${w[0]})`);
});

test("fisherDimWeights -- weights normalize to mean 1 (redistribute, don't inflate)", () => {
  const vectors = [[2, 1], [2, -1], [-2, 1], [-2, -1]];
  const labels = ["A", "A", "B", "B"];
  const w = fisherDimWeights(vectors, labels);
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  assert.ok(Math.abs(mean - 1) < 1e-9, `mean weight is 1 (${mean})`);
});

test("fisherDimWeights -- both dims equally discriminative -> roughly equal weights", () => {
  // class A clustered at (1,1), class B at (-1,-1): both dims separate identically.
  const vectors = [[1, 1], [1, 1], [-1, -1], [-1, -1]];
  const labels = ["A", "A", "B", "B"];
  const w = fisherDimWeights(vectors, labels);
  assert.ok(Math.abs(w[0] - w[1]) < 1e-6, `symmetric separation -> equal weights (${w[0]} vs ${w[1]})`);
});

test("fisherDimWeights -- empty / mismatched-length inputs -> []", () => {
  assert.deepEqual(fisherDimWeights([], []), []);
  assert.deepEqual(fisherDimWeights([[1, 2]], ["A", "B"]), [], "labels.length != vectors.length");
  assert.deepEqual(fisherDimWeights(null, null), []);
});

test("applyDimWeights -- scales each dim; truncates to the shorter length", () => {
  assert.deepEqual(applyDimWeights([2, 3, 4], [10, 1, 0.5]), [20, 3, 2]);
  assert.deepEqual(applyDimWeights([2, 3, 4], [10, 1]), [20, 3], "truncates to weights length");
  assert.deepEqual(applyDimWeights([2], [10, 1, 1]), [20], "truncates to vec length");
});
