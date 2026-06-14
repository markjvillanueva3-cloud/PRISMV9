#!/usr/bin/env node
/**
 * Tests for build-viz-adjacency.mjs buildAdjacency (U-VIZ-NODE-NEIGHBORS, sierra).
 * Real algebraic invariants: directionality, per-direction cap, skip rules,
 * isolated-node absence — NOT toBeDefined stubs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdjacency } from "./build-viz-adjacency.mjs";

test("basic in/out adjacency + directionality", () => {
  const { adjacency, nodeCount, used, skipped } = buildAdjacency([
    { from: "a", to: "b", type: "invokes" },
    { from: "b", to: "c", type: "imports" },
  ], 8);
  assert.equal(used, 2);
  assert.equal(skipped, 0);
  assert.equal(nodeCount, 3);
  assert.deepEqual(adjacency.a.out, [{ id: "b", type: "invokes" }]);
  assert.deepEqual(adjacency.a.in, []);
  assert.deepEqual(adjacency.b.in, [{ id: "a", type: "invokes" }]);
  assert.deepEqual(adjacency.b.out, [{ id: "c", type: "imports" }]);
  assert.deepEqual(adjacency.c.in, [{ id: "b", type: "imports" }]);
  assert.deepEqual(adjacency.c.out, []);
});

test("caps out/in neighbors at K (deterministic first-K retained)", () => {
  const edges = [];
  for (let i = 0; i < 20; i++) edges.push({ from: "hub", to: "n" + i, type: "x" });
  for (let i = 0; i < 20; i++) edges.push({ from: "m" + i, to: "sink", type: "y" });
  const { adjacency } = buildAdjacency(edges, 5);
  assert.equal(adjacency.hub.out.length, 5, "out capped at K=5");
  assert.equal(adjacency.sink.in.length, 5, "in capped at K=5");
  assert.deepEqual(adjacency.hub.out.map((e) => e.id), ["n0", "n1", "n2", "n3", "n4"]);
});

test("skips self-loops + malformed edges; isolated nodes absent", () => {
  const { adjacency, used, skipped, nodeCount } = buildAdjacency([
    { from: "a", to: "a", type: "self" },   // self-loop
    { from: "a" },                          // missing to
    { to: "b" },                            // missing from
    null,                                   // null edge
    { from: "", to: "b", type: "x" },       // empty from
    { from: "a", to: "b", type: "real" },   // the only valid edge
  ], 8);
  assert.equal(used, 1);
  assert.equal(skipped, 5);
  assert.equal(nodeCount, 2);
  assert.ok(!("z" in adjacency), "node that never appears is absent");
  assert.deepEqual(adjacency.a.out, [{ id: "b", type: "real" }]);
  assert.deepEqual(adjacency.b.in, [{ id: "a", type: "real" }]);
});

test("missing edge.type coerces to empty string", () => {
  const { adjacency } = buildAdjacency([{ from: "a", to: "b" }], 8);
  assert.equal(adjacency.a.out[0].type, "");
});

test("empty edge list → empty adjacency", () => {
  const r = buildAdjacency([], 8);
  assert.equal(r.nodeCount, 0);
  assert.equal(r.used, 0);
  assert.equal(r.skipped, 0);
  assert.deepEqual(r.adjacency, {});
});
