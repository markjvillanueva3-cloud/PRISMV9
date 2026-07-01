// Tests for binary-embed-quantize.mjs (U-EMBED-BINARY-QUANTIZE, slot:india).
// Real reference values: known bit patterns, popcount Hamming, two-stage recall, int8 round-trip,
// and the article's exact 32x/4x footprint ratios. Run: `node scripts/lib/binary-embed-quantize.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  binarize,
  hammingDistance,
  hammingSearch,
  cosineSim,
  twoStageSearch,
  calibrateInt8,
  quantizeInt8,
  dequantizeInt8,
  footprintBytes,
} from "./binary-embed-quantize.mjs";

test("binarize -- sign bits packed MSB-first; 0 is positive; pads a partial final byte", () => {
  // [+,-,+,-,+,-,+,-] -> bits set at dims 0,2,4,6 -> 0x80|0x20|0x08|0x02 = 0xAA
  assert.deepEqual([...binarize([1, -1, 1, -1, 1, -1, 1, -1])], [0xaa]);
  // 0 >= 0 counts as positive (bit set); a lone negative clears its bit
  assert.deepEqual([...binarize([0, -0.1])], [0x80], "dim0=0 set, dim1<0 clear, rest padded 0");
  // one dim -> one byte (ceil(1/8)), MSB set
  assert.deepEqual([...binarize([5])], [0x80]);
  // 768-d float32 (3072 bytes) -> 96 packed bytes = 32x
  assert.equal(binarize(new Array(768).fill(0.1)).length, 96);
  assert.throws(() => binarize(null), TypeError);
});

test("hammingDistance -- popcount of XOR; throws on a length mismatch (no silent truncation)", () => {
  assert.equal(hammingDistance(new Uint8Array([0xff]), new Uint8Array([0x00])), 8);
  assert.equal(hammingDistance(new Uint8Array([0xaa]), new Uint8Array([0xab])), 1, "differ in the last bit");
  assert.equal(hammingDistance(new Uint8Array([0xf0, 0x0f]), new Uint8Array([0x00, 0x00])), 8);
  assert.equal(hammingDistance(new Uint8Array([0x55]), new Uint8Array([0x55])), 0, "identical -> 0");
  assert.throws(() => hammingDistance(new Uint8Array([0x00]), new Uint8Array([0x00, 0x00])), RangeError);
});

test("hammingSearch -- returns k nearest ascending by distance, ties broken by index", () => {
  const corpus = [
    new Uint8Array([0x00]), // dist 2 from query 0x03
    new Uint8Array([0x03]), // dist 0
    new Uint8Array([0x01]), // dist 1
    new Uint8Array([0xff]), // dist 6
  ];
  const res = hammingSearch(new Uint8Array([0x03]), corpus, 2);
  assert.deepEqual(res, [{ index: 1, distance: 0 }, { index: 2, distance: 1 }]);
});

test("cosineSim -- identical=1, orthogonal=0, opposite=-1; throws on mismatch", () => {
  assert.equal(cosineSim([1, 0], [1, 0]), 1);
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 0], [-1, 0]), -1);
  assert.ok(Math.abs(cosineSim([1, 0], [1, 1]) - Math.SQRT1_2) < 1e-12);
  assert.equal(cosineSim([0, 0], [1, 1]), 0, "zero vector -> 0 (no div-by-zero)");
  assert.throws(() => cosineSim([1, 0], [1, 0, 0]), RangeError);
});

test("twoStageSearch -- binary prefilter + float rescore recovers the true nearest (the 32x quality claim)", () => {
  const query = [0.9, -0.3, 0.5, -0.7, 0.2, -0.1, 0.4, -0.6];
  const near = [0.8, -0.2, 0.6, -0.5, 0.3, -0.2, 0.5, -0.4]; // same sign pattern -> Hamming 0
  const opposite = query.map((v) => -v);                       // all signs flipped -> Hamming 8
  const halfFlipped = [0.9, -0.3, 0.5, -0.7, -0.2, 0.1, -0.4, 0.6]; // last 4 flipped -> Hamming 4
  const floats = [opposite, near, halfFlipped];
  const packed = floats.map(binarize);
  const res = twoStageSearch(query, { packed, floats }, { k: 1, rescoreCandidates: 3 });
  assert.equal(res.length, 1);
  assert.equal(res[0].index, 1, "two-stage returns the float-nearest (the same-sign neighbour)");
  // matches brute-force float cosine top-1 (no quality regression on this set)
  const brute = floats.map((f, i) => ({ i, s: cosineSim(query, f) })).sort((a, b) => b.s - a.s)[0].i;
  assert.equal(res[0].index, brute);
  assert.throws(() => twoStageSearch(query, { packed, floats: floats.slice(1) }), RangeError);
});

test("int8 -- calibrate/quantize/dequantize round-trips within one quantization step; empty sample throws", () => {
  const vec = [0.5, -0.5, 0.25, -0.25, 0.1, -0.9, 0.7, -0.3];
  const params = calibrateInt8(vec);
  const deq = dequantizeInt8(quantizeInt8(vec, params), params);
  for (let i = 0; i < vec.length; i++) {
    assert.ok(Math.abs(deq[i] - vec[i]) <= params.scale + 1e-9, `dim ${i} within one step (${params.scale})`);
  }
  // degenerate (all-equal) range -> scale 1, no div-by-zero
  assert.equal(calibrateInt8([0.3, 0.3, 0.3]).scale, 1);
  assert.throws(() => calibrateInt8([]), RangeError);
});

test("footprintBytes -- the article's exact 32x (binary) and 4x (int8) ratios for a 768-d vector", () => {
  const f32 = footprintBytes(1, 768, "float32");
  assert.equal(f32, 3072);
  assert.equal(footprintBytes(1, 768, "int8"), 768);
  assert.equal(footprintBytes(1, 768, "binary"), 96);
  assert.equal(f32 / footprintBytes(1, 768, "binary"), 32, "binary = 32x smaller than float32");
  assert.equal(f32 / footprintBytes(1, 768, "int8"), 4, "int8 = 4x smaller than float32");
  // a 536MB float index (the tribal-embed-index V8-cap pain) -> ~16.75MB binary
  assert.ok(footprintBytes(1, 768, "binary") * (536e6 / f32) < 17e6);
  assert.throws(() => footprintBytes(1, 768, "f16"), RangeError);
});
