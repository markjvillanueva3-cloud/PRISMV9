/**
 * Tests for cad-dim-scale-buckets.mjs (U-DELTA-DIMTOL-SCALE-BUCKET, slot:delta).
 * Run: node scripts/lib/cad-dim-scale-buckets.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketRadii, bucketedDrift, DEFAULT_SCALE_BUCKETS } from "./cad-dim-scale-buckets.mjs";

// ---- bucketRadii ----
test("bucketRadii: partitions by scale band; boundaries land in the lower band", () => {
  const b = bucketRadii([0.5, 1.5, 2, 5, 10, 15, 20, 50]);
  assert.deepEqual(b.fillet, [0.5, 1.5, 2], "r<=2 -> fillet (boundary inclusive)");
  assert.deepEqual(b.hole, [5, 10, 15], "2<r<=15 -> hole");
  assert.deepEqual(b.bore, [20, 50], "r>15 -> bore");
});

test("bucketRadii: empty / null / non-finite-and-negative filtered", () => {
  assert.deepEqual(bucketRadii([]), { fillet: [], hole: [], bore: [] });
  assert.deepEqual(bucketRadii(null), { fillet: [], hole: [], bore: [] });
  assert.deepEqual(bucketRadii([NaN, -3, Infinity, 0, 1]), { fillet: [1], hole: [], bore: [] });
});

// ---- bucketedDrift ----
const wide = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + (i * (hi - lo)) / (n - 1));

test("bucketedDrift: per-band consistent part -> drawn:true (all co-populated buckets pass)", () => {
  // learned spans all 3 bands; heldout draws a few from each band, in-range -> each band consistent.
  const learned = [...wide(0.3, 1.9, 20), ...wide(3, 14, 20), ...wide(18, 80, 20)];
  const heldout = [0.8, 1.2, 1.6, 5, 8, 11, 25, 40, 60];
  const r = bucketedDrift(learned, heldout);
  assert.ok(r.drawn, `consistent per-band part should pass; byBucket=${JSON.stringify(r.byBucket)}`);
  assert.equal(r.bucketsTested, 3);
});

test("bucketedDrift: a single drifted band flags the whole part (drawn:false)", () => {
  const learned = [...wide(0.3, 1.9, 20), ...wide(3, 14, 20), ...wide(18, 80, 20)];
  // fillet+hole consistent, but the 'bore' band is way out of the learned 18..80 range (all ~500)
  const heldout = [0.8, 1.2, 1.6, 5, 8, 11, 500, 510, 520, 530];
  const r = bucketedDrift(learned, heldout);
  assert.ok(!r.drawn, "a drifted bore band must flag the part");
  assert.equal(r.byBucket.bore.drawn, false);
  assert.ok(r.byBucket.fillet.drawn, "fillet band still consistent");
});

test("bucketedDrift: no co-populated bucket -> drawn:false + reason (R12, no fabricated pass)", () => {
  const learned = wide(18, 80, 30);   // all bore
  const heldout = [0.5, 1.0, 1.5];    // all fillet
  const r = bucketedDrift(learned, heldout);
  assert.equal(r.drawn, false);
  assert.equal(r.bucketsTested, 0);
  assert.equal(r.reason, "no-co-populated-bucket");
});

test("bucketedDrift: a band below minPerBucket is skipped (reason), not counted", () => {
  const learned = [...wide(3, 14, 20), 0.5]; // hole band populated, fillet band has only 1
  const heldout = [5, 8, 11, 1.0];           // hole band populated, fillet band has only 1
  const r = bucketedDrift(learned, heldout);
  assert.equal(r.byBucket.fillet.reason, "insufficient-bucket-sample");
  assert.equal(r.bucketsTested, 1, "only the hole band is testable");
});

test("DEFAULT_SCALE_BUCKETS: ordered ascending, last is open-ended", () => {
  assert.equal(DEFAULT_SCALE_BUCKETS.length, 3);
  assert.equal(DEFAULT_SCALE_BUCKETS[DEFAULT_SCALE_BUCKETS.length - 1].maxMm, Infinity);
});
