// scripts/generate-predicted-edges-features.test.mjs — node:test for the path-A system-viz roost generator.
// Tests the pure projection generate() + readAndPredict fail-soft. The live end-to-end (real
// embeddings → augmentation) is validated by running the generator directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { generate, readAndPredict, ROOST_ID, ROOST_LAYER, EDGE_LAYER } from "./generate-predicted-edges-features.mjs";

// ── generate() pure projection ───────────────────────────────────────────────
test("generate([]) → empty roost (no root node emitted), honest stats", () => {
  const { newNodes, newEdges, stats } = generate([]);
  assert.equal(newNodes.length, 0);
  assert.equal(newEdges.length, 0);
  assert.equal(stats.predictions_total, 0);
});

test("generate(null) / non-array → empty (fail-soft)", () => {
  assert.equal(generate(null).newNodes.length, 0);
  assert.equal(generate(undefined).newNodes.length, 0);
  assert.equal(generate("nope").newNodes.length, 0);
});

test("generate(1 prediction) → root + 1 child + 1 contains edge; child carries from/to/score", () => {
  const { newNodes, newEdges } = generate([{ u: "ghost.a", v: "wiki.x", score: 0.7311 }]);
  assert.equal(newNodes.length, 2); // root + 1 child
  assert.equal(newEdges.length, 1);
  const root = newNodes[0];
  assert.equal(root.id, ROOST_ID);
  assert.equal(root.layer, ROOST_LAYER);
  assert.equal(root.kind, "ghost-roost");
  const child = newNodes[1];
  assert.equal(child.id, `${ROOST_ID}.0`);
  assert.equal(child.layer, EDGE_LAYER);
  assert.equal(child.parent, ROOST_ID);
  assert.equal(child.kind, "predicted-edge");
  assert.equal(child.fromNode, "ghost.a");
  assert.equal(child.toNode, "wiki.x");
  assert.equal(child.score, 0.7311); // numeric, NOT a formatted string
  assert.deepEqual(newEdges[0], { from: ROOST_ID, to: child.id, kind: "contains" });
});

test("generate(N) → root + N children + N contains edges, sequential ids", () => {
  const preds = [
    { u: "ghost.a", v: "wiki.x", score: 0.73 },
    { u: "ghost.b", v: "memory_reference.m", score: 0.71 },
    { u: "ghost.c", v: "wiki.y", score: 0.70 },
  ];
  const { newNodes, newEdges, stats } = generate(preds);
  assert.equal(newNodes.length, 4); // root + 3
  assert.equal(newEdges.length, 3);
  assert.equal(stats.emitted, 3);
  assert.deepEqual(newNodes.slice(1).map((n) => n.id), [`${ROOST_ID}.0`, `${ROOST_ID}.1`, `${ROOST_ID}.2`]);
});

test("generate filters malformed predictions (missing u/v) before emitting", () => {
  const { newNodes } = generate([
    { u: "ghost.a", v: "wiki.x", score: 0.73 },
    { u: "ghost.b" }, // no v → dropped
    { v: "wiki.z", score: 0.6 }, // no u → dropped
    { score: 0.9 }, // neither → dropped
  ]);
  assert.equal(newNodes.length, 2); // root + the 1 valid child only
  assert.equal(newNodes[1].fromNode, "ghost.a");
});

test("generate emits ONLY internal contains edges (root→child) — no dangling to real node ids", () => {
  const { newNodes, newEdges } = generate([
    { u: "ghost.a", v: "wiki.x", score: 0.73 },
    { u: "ghost.b", v: "wiki.y", score: 0.71 },
  ]);
  const ids = new Set(newNodes.map((n) => n.id));
  for (const e of newEdges) {
    assert.equal(e.kind, "contains");
    assert.ok(ids.has(e.from) && ids.has(e.to), `edge ${e.from}->${e.to} must be internal (non-dangling)`);
  }
});

test("generate null/non-finite score → score:null, not NaN/string", () => {
  const { newNodes } = generate([{ u: "ghost.a", v: "wiki.x", score: NaN }]);
  assert.equal(newNodes[1].score, null);
});

test("generate ctx flows into stats (embeddings/existingEdges/candidates surfaced)", () => {
  const { stats } = generate([{ u: "ghost.a", v: "wiki.x", score: 0.73 }], {
    embeddings: 543,
    existingEdges: 120,
    existingEdgesLoaded: true,
    candidates: 1687,
  });
  assert.equal(stats.embeddings, 543);
  assert.equal(stats.existingEdges, 120);
  assert.equal(stats.existingEdgesLoaded, true);
  assert.equal(stats.candidates, 1687);
});

// ── readAndPredict fail-soft ─────────────────────────────────────────────────
test("readAndPredict missing embeddings file → empty predictions + ctx.embeddings 0 (no throw)", () => {
  const { predictions, ctx } = readAndPredict({
    embPath: path.join(os.tmpdir(), "__predicted_edges_nonexistent__.jsonl"),
    edgesPath: path.join(os.tmpdir(), "__nope_edges__.json"),
  });
  assert.deepEqual(predictions, []);
  assert.equal(ctx.embeddings, 0);
  assert.equal(ctx.existingEdgesLoaded, false);
});
