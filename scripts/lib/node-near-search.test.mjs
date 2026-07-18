// Tests for node-near-search.mjs -- cosine correctness + top-K ordering + the
// file-backed nearById contract. Run: node scripts/lib/node-near-search.test.mjs
// (node:test auto-runs on exit). Reference values are hand-computable invariants,
// not stubs (R9): cosine of identical=1, orthogonal=0, opposite=-1, zero-norm=0.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  cosineSim, parseEmbeddingRecord, findVector, topKFromRecords, makeTopK, loadRecords, nearById, parseNearArgs,
} from "./node-near-search.mjs";

test("cosineSim: identical vectors = 1", () => {
  assert.equal(cosineSim([1, 2, 3], [1, 2, 3]), 1);
  // scale-invariant: a vector and its positive multiple are identical in direction
  assert.equal(cosineSim([1, 2, 3], [2, 4, 6]), 1);
});

test("cosineSim: orthogonal = 0, opposite = -1", () => {
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 0], [-1, 0]), -1);
});

test("cosineSim: a 45deg pair ~ 0.7071 (algebraic check)", () => {
  // [1,0] vs [1,1]: dot=1, norms 1 and sqrt(2) -> 1/sqrt(2)
  assert.ok(Math.abs(cosineSim([1, 0], [1, 1]) - 1 / Math.SQRT2) < 1e-12);
});

test("cosineSim: zero-norm / mismatch / non-finite all return 0 (never NaN)", () => {
  assert.equal(cosineSim([0, 0], [1, 1]), 0);   // zero vector -> undefined cosine -> 0
  assert.equal(cosineSim([1, 1], [0, 0]), 0);
  assert.equal(cosineSim([1, 2, 3], [1, 2]), 0); // length mismatch
  assert.equal(cosineSim([], []), 0);            // empty
  assert.equal(cosineSim([1, NaN], [1, 1]), 0);  // NaN component
  assert.equal(cosineSim([1, Infinity], [1, 1]), 0);
  assert.equal(cosineSim(null, [1]), 0);
});

test("parseEmbeddingRecord: skips meta/blank/malformed, accepts {n,q}", () => {
  assert.equal(parseEmbeddingRecord(""), null);
  assert.equal(parseEmbeddingRecord("not json"), null);
  // the real file's first line is a meta header with no n/q -> must be skipped
  assert.equal(parseEmbeddingRecord(JSON.stringify({ __meta: true, model: "nomic", dim: 768 })), null);
  assert.equal(parseEmbeddingRecord(JSON.stringify({ n: "x", q: "not-array" })), null);
  assert.deepEqual(parseEmbeddingRecord(JSON.stringify({ n: "p.boss", q: [1, 2] })), { n: "p.boss", q: [1, 2] });
});

test("findVector: present returns vec, absent returns null", () => {
  const recs = [{ n: "a", q: [1, 0] }, { n: "b", q: [0, 1] }];
  assert.deepEqual(findVector(recs, "b"), [0, 1]);
  assert.equal(findVector(recs, "zzz"), null);
});

test("topKFromRecords: orders by cosine desc, honors k and excludeId", () => {
  const q = [1, 0];
  const recs = [
    { n: "self", q: [1, 0] },     // sim 1.0 (excluded)
    { n: "near", q: [2, 0.1] },   // very close
    { n: "mid", q: [1, 1] },      // ~0.707
    { n: "far", q: [-1, 0] },     // -1
  ];
  const top = topKFromRecords(q, recs, { k: 2, excludeId: "self" });
  assert.equal(top.length, 2);              // k bound
  assert.equal(top[0].id, "near");          // best first
  assert.equal(top[1].id, "mid");
  assert.ok(top[0].score > top[1].score);   // strictly descending
  assert.ok(!top.some((t) => t.id === "self")); // self excluded
});

test("topKFromRecords: k larger than pool returns all available", () => {
  const top = topKFromRecords([1, 0], [{ n: "a", q: [1, 0] }, { n: "b", q: [0, 1] }], { k: 99 });
  assert.equal(top.length, 2);
});

test("parseNearArgs: bare id, flag before/after, bad/missing k (regression for the index-0 bug)", () => {
  // THE bug this guards: `near <id>` with no --k must still extract the id.
  assert.deepEqual(parseNearArgs(["p.operator"]), { id: "p.operator", k: 10 });
  // --json is stripped by the caller before params reaches here -> bare id again
  assert.deepEqual(parseNearArgs(["p.operator"]), { id: "p.operator", k: 10 });
  assert.deepEqual(parseNearArgs(["p.operator", "--k", "5"]), { id: "p.operator", k: 5 });
  assert.deepEqual(parseNearArgs(["--k", "8", "eng.X"]), { id: "eng.X", k: 8 }); // flag before id
  assert.deepEqual(parseNearArgs(["id", "--k", "notnum"]), { id: "id", k: 10 }); // bad k -> default
  assert.deepEqual(parseNearArgs(["id", "--k", "0"]), { id: "id", k: 10 });      // non-positive -> default
  assert.deepEqual(parseNearArgs(["id", "--k", "-3"]), { id: "id", k: 10 });
  assert.deepEqual(parseNearArgs([]), { id: null, k: 10 });                      // no id
  assert.deepEqual(parseNearArgs(["--k", "5"]), { id: null, k: 5 });             // flag only, no id
});

test("makeTopK: bounded accumulator keeps best k desc, drops excludeId", () => {
  const acc = makeTopK(2, "self");
  acc.push("self", 1.0);  // excluded
  acc.push("a", 0.2);
  acc.push("b", 0.9);
  acc.push("c", 0.5);
  const top = acc.result();
  assert.equal(top.length, 2);
  assert.deepEqual(top.map((t) => t.id), ["b", "c"]); // best two, desc
});

test("nearById: temp-file integration -- nearest is the aligned node, self excluded", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "near-test-"));
  const file = path.join(dir, "emb.jsonl");
  const lines = [
    JSON.stringify({ __meta: true, model: "nomic-768d", dim: 3, count: 4 }), // header skipped
    JSON.stringify({ n: "query", q: [10, 0, 0] }),
    JSON.stringify({ n: "twin", q: [5, 0, 0] }),    // same direction -> sim 1.0
    JSON.stringify({ n: "ortho", q: [0, 7, 0] }),   // sim 0
    JSON.stringify({ n: "anti", q: [-3, 0, 0] }),   // sim -1
    "",                                              // blank skipped
    "garbage-not-json",                              // malformed skipped
  ];
  fs.writeFileSync(file, lines.join("\n"));
  try {
    const out = await nearById("query", { path: file, k: 3 });
    assert.equal(out.total, 4);                       // 4 valid records (header/blank/garbage skipped)
    assert.equal(out.neighbors[0].id, "twin");        // direction-aligned wins
    assert.ok(Math.abs(out.neighbors[0].score - 1) < 1e-12);
    assert.equal(out.neighbors.at(-1).id, "anti");    // opposite ranks last
    assert.ok(!out.neighbors.some((n) => n.id === "query")); // self excluded
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("nearById: missing id rejects with ENOEMBED (R12 -- not a silent empty)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "near-test-"));
  const file = path.join(dir, "emb.jsonl");
  fs.writeFileSync(file, JSON.stringify({ n: "only", q: [1, 1] }));
  try {
    await assert.rejects(nearById("ghost-id", { path: file, k: 5 }), (e) => e.code === "ENOEMBED");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("loadRecords: skips the meta header line", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "near-test-"));
  const file = path.join(dir, "emb.jsonl");
  fs.writeFileSync(file, [
    JSON.stringify({ __meta: true, dim: 2 }),
    JSON.stringify({ n: "a", q: [1, 0] }),
  ].join("\n"));
  try {
    const recs = loadRecords(file);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].n, "a");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
