// Tests for quantize-vecs-to-ghost-embeddings (slot:india, A2 GNN re-embed join).
// Real reference-value assertions (R9): concrete int8 quantization, strict ref-set
// filtering, dim-mismatch + missing-meta handling, and JSONL meta/blank/corrupt skip.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readJsonl, buildCandidate } from "./quantize-vecs-to-ghost-embeddings.mjs";

test("readJsonl skips __meta header, blanks, and corrupt lines; parses valid", () => {
  const p = path.join(os.tmpdir(), `qv-readjsonl-${process.pid}.jsonl`);
  fs.writeFileSync(p, [
    '{"__meta":true,"model":"x"}',
    "",
    '{not valid json',
    '{"id":"a","vec":[1,0]}',
    "   ",
    '{"id":"b","vec":[0,1]}',
  ].join("\n") + "\n");
  try {
    const rows = readJsonl(p);
    assert.equal(rows.length, 2, "only the 2 valid body rows survive");
    assert.deepEqual(rows.map((r) => r.id), ["a", "b"]);
  } finally {
    fs.rmSync(p, { force: true });
  }
});

test("buildCandidate quantizes via deployed quantize() with correct int8 reference values", () => {
  // [3,4,0,0] -> unit [0.6,0.8,0,0]; maxAbs 0.8; scale 0.8/127; q = round(unit/scale)
  // = [round(95.25)=95, 127, 0, 0]. This pins the exact deployed quantization path.
  const vecById = new Map([["g1", [3, 4, 0, 0]]]);
  const metaById = new Map([["g1", { n: "Eng1", h: "hh", k: "ghost.unwired-engine" }]]);
  const { records, stats } = buildCandidate(vecById, metaById, null, { model: "m@4", dim: 4 });
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.q.length, 4, "quantized vector preserves dimension");
  assert.equal(r.q[1], 127, "largest-magnitude component scales to 127");
  assert.equal(r.q[0], 95, "0.6/0.8*127 rounds to 95");
  assert.equal(r.q[2], 0);
  assert.ok(typeof r.s === "number" && r.s > 0, "scale is a positive number");
  assert.equal(r.src, "m@4");
  assert.equal(r.n, "Eng1");
  assert.equal(r.h, "hh");
  assert.equal(r.k, "ghost.unwired-engine");
  assert.equal(stats.written, 1);
  assert.equal(stats.dimMismatch, 0);
  assert.equal(stats.missingMeta, 0);
});

test("buildCandidate restricts strictly to refIds (apples-to-apples ghost set)", () => {
  const vecById = new Map([["a", [1, 0]], ["b", [0, 1]], ["c", [1, 1]]]);
  const metaById = new Map([
    ["a", { n: "A", h: "1", k: "ghost.unwired-engine" }],
    ["b", { n: "B", h: "2", k: "ghost.unwired-engine" }],
    ["c", { n: "C", h: "3", k: "ghost.unwired-engine" }],
  ]);
  const refIds = new Set(["a", "b", "zz"]); // zz not embedded
  const { records, stats } = buildCandidate(vecById, metaById, refIds, { model: "m", dim: 2 });
  assert.deepEqual(records.map((r) => r.id).sort(), ["a", "b"], "only ref ids that have a vector");
  assert.equal(stats.refSkipped, 1, "c is dropped (not in ref set)");
  assert.equal(stats.refTotal, 3);
  assert.equal(stats.refCovered, 2, "a,b covered; zz has no vec");
  assert.equal(stats.refUncovered, 1, "zz is an uncovered deployed id (must be surfaced)");
});

test("buildCandidate skips dim-mismatch vectors and counts them", () => {
  const vecById = new Map([["good", [1, 0, 0]], ["bad", [1, 0]]]); // dim 3 expected
  const metaById = new Map();
  const { records, stats } = buildCandidate(vecById, metaById, null, { model: "m", dim: 3 });
  assert.deepEqual(records.map((r) => r.id), ["good"]);
  assert.equal(stats.dimMismatch, 1, "the 2-d vector is rejected against dim=3");
  assert.equal(stats.written, 1);
});

test("buildCandidate writes a record even when meta is missing, with safe fallbacks", () => {
  const vecById = new Map([["orphan", [1, 0]]]);
  const { records, stats } = buildCandidate(vecById, new Map(), null, { model: "m", dim: 2 });
  assert.equal(records.length, 1);
  assert.equal(records[0].n, "orphan", "name falls back to id");
  assert.equal(records[0].k, "ghost.unwired-engine", "kind falls back to ghost kind");
  assert.equal(records[0].h, null);
  assert.equal(stats.missingMeta, 1);
});
