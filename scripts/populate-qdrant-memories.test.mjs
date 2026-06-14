// Tests for populate-qdrant-memories.mjs pure core (R9: real behavior).
// Run: node --test scripts/populate-qdrant-memories.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeInt8Vec, loadMemorySidecar } from "./populate-qdrant-memories.mjs";

// base64 of a known signed int8 array -> roundtrip must preserve sign.
const b64Of = (ints) => Buffer.from(Int8Array.from(ints).buffer).toString("base64");

test("decodeInt8Vec round-trips signed int8 (byte 200 -> -56)", () => {
  const ints = [1, -56, 127, -128, 0, -1];
  assert.deepEqual(decodeInt8Vec(b64Of(ints)), ints);
});

test("decodeInt8Vec returns null on empty / non-string", () => {
  assert.equal(decodeInt8Vec(""), null);
  assert.equal(decodeInt8Vec(null), null);
  assert.equal(decodeInt8Vec(42), null);
});

test("decodeInt8Vec decodes a full 768-dim vector to the right length", () => {
  const ints = Array.from({ length: 768 }, (_, i) => (i % 256) - 128);
  const out = decodeInt8Vec(b64Of(ints));
  assert.equal(out.length, 768);
  assert.deepEqual(out, ints);
});

// loadMemorySidecar with injected reader (no disk).
function fakeSidecar(records, meta = {}) {
  const json = JSON.stringify({ dim: 768, quant: "int8", model: "nomic-embed-text", count: records.length, ...meta, records });
  return { readImpl: () => json, existsImpl: () => true };
}
const vec768 = (seed) => b64Of(Array.from({ length: 768 }, (_, i) => ((i + seed) % 256) - 128));

test("loadMemorySidecar maps {key,vec} -> {n,q} for valid 768-dim records", () => {
  const recs = [
    { key: "feedback/a", name: "a", namespace: "feedback", vec: vec768(0), norm: 12.3 },
    { key: "reference/b", name: "b", namespace: "reference", vec: vec768(5), norm: 9.9 },
  ];
  const { records, meta, error } = loadMemorySidecar("ignored", fakeSidecar(recs));
  assert.equal(error, null);
  assert.equal(records.length, 2);
  assert.equal(records[0].n, "feedback/a");
  assert.equal(records[0].q.length, 768);
  assert.equal(meta.dropped, 0);
});

test("loadMemorySidecar drops malformed / wrong-dim / no-key records (does not crash)", () => {
  const recs = [
    { key: "ok", vec: vec768(1) },              // good
    { key: "wrongdim", vec: b64Of([1, 2, 3]) }, // 3-dim -> dropped
    { name: "nokey", vec: vec768(2) },          // no key -> dropped
    { key: "novec" },                            // no vec -> dropped
    null,                                        // junk -> dropped
  ];
  const { records, meta } = loadMemorySidecar("ignored", fakeSidecar(recs));
  assert.equal(records.length, 1);
  assert.equal(records[0].n, "ok");
  assert.equal(meta.dropped, 4);
});

test("loadMemorySidecar reports file-missing without throwing", () => {
  const { records, error } = loadMemorySidecar("nope", { existsImpl: () => false });
  assert.equal(error, "file-missing");
  assert.deepEqual(records, []);
});
