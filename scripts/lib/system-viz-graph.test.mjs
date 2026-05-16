import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph, findInGraph } from "./system-viz-graph.mjs";

test("loadGraph returns graph with nodes array >1000", () => {
  const G = loadGraph();
  assert.ok(Array.isArray(G.nodes) && G.nodes.length > 1000, `got ${G?.nodes?.length}`);
});

test("findInGraph kienzle returns ≥1 real match", () => {
  const G = loadGraph();
  const hits = findInGraph(G, "kienzle", { limit: 5 });
  assert.ok(hits.length >= 1);
  assert.ok(hits.every(h => /kienzle/i.test(h.label + " " + h.id + " " + (h.info||""))));
});

test("findInGraph is pure (idempotent)", () => {
  const G = loadGraph();
  assert.deepEqual(findInGraph(G,"tool",{limit:3}), findInGraph(G,"tool",{limit:3}));
});

test("findInGraph respects limit", () => {
  const G = loadGraph();
  assert.ok(findInGraph(G,"engine",{limit:2}).length <= 2);
});
