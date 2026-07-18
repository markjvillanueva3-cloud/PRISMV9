// scripts/lib/graph-stream-degree.test.mjs
// U-GRAPH-STREAM-DEGREE (2026-06-09, slot:alpha): the streaming degree-0 pass must
// match the materializing reader's semantics (escape-aware, depth-tracked byte-walk)
// WITHOUT accumulating the node/edge arrays -- order-independent, nesting-safe.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  streamGraphElements,
  minimalNodeRecord,
  degreeZeroFromBuffer,
  streamDegreeZeroNodeIds,
} from "./graph-stream-degree.mjs";

const B = (obj) => Buffer.from(JSON.stringify(obj), "utf8");

test("streamGraphElements: streams each large-array element, never accumulates", () => {
  const seen = [];
  streamGraphElements(B({ schemaVersion: 1, nodes: [{ id: "a" }, { id: "b" }], edges: [{ from: "a", to: "b" }] }), {
    onLargeElement: (key, el) => seen.push([key, el]),
  });
  assert.equal(seen.length, 3, "2 nodes + 1 edge streamed");
  assert.deepEqual(seen[0], ["nodes", { id: "a" }]);
  assert.deepEqual(seen[2], ["edges", { from: "a", to: "b" }]);
});

test("streamGraphElements: passes small top-level values to onSmallValue", () => {
  const small = {};
  streamGraphElements(B({ schemaVersion: 3, meta: { k: 1 }, nodes: [{ id: "a" }] }), {
    onLargeElement: () => {},
    onSmallValue: (k, v) => { small[k] = v; },
  });
  assert.equal(small.schemaVersion, 3);
  assert.deepEqual(small.meta, { k: 1 });
});

test("streamGraphElements: nesting + escaped quotes inside elements don't break the walk", () => {
  const seen = [];
  // node.info has a nested object, a bracket, and an escaped quote + a comma inside a string
  const buf = B({ nodes: [{ id: "x", info: { tags: ["a,b"], note: "he said \"hi\", ok" } }, { id: "y" }], edges: [] });
  streamGraphElements(buf, { onLargeElement: (_k, el) => seen.push(el) });
  assert.equal(seen.length, 2, "both nodes parsed despite nested object + escaped quote + comma-in-string");
  assert.equal(seen[0].id, "x");
  assert.equal(seen[0].info.tags[0], "a,b");
  assert.equal(seen[1].id, "y");
});

test("streamGraphElements: throws on a non-object root (fail loud)", () => {
  assert.throws(() => streamGraphElements(Buffer.from("[1,2,3]", "utf8")), /expected '\{'/);
  assert.throws(() => streamGraphElements("not a buffer"), /expected a Buffer/);
});

test("minimalNodeRecord: extracts only id/layer/kind/parent; kind falls back subgroup->type", () => {
  assert.deepEqual(minimalNodeRecord({ id: "a", layer: "L3", kind: "engine", parent: "p", info: "huge" }),
    { id: "a", layer: "L3", kind: "engine", parent: "p" });
  assert.equal(minimalNodeRecord({ id: "b", subgroup: "sg" }).kind, "sg", "kind <- subgroup");
  assert.equal(minimalNodeRecord({ id: "c", type: "ty" }).kind, "ty", "kind <- type");
  assert.equal(minimalNodeRecord({ id: "d" }).kind, "?", "kind default");
});

test("degreeZeroFromBuffer: a node in NO edge is degree-0; edge endpoints are not (order-independent)", () => {
  // edges BEFORE nodes -- result must not depend on order
  const buf = B({
    edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "orphan1", parent: "a" }, { id: "orphan2" }],
  });
  const r = degreeZeroFromBuffer(buf);
  assert.equal(r.totalNodes, 5);
  assert.equal(r.totalEdges, 2);
  const ids = r.degreeZero.map((n) => n.id).sort();
  assert.deepEqual(ids, ["orphan1", "orphan2"], "a/b/c are edge endpoints; only orphans are degree-0");
  assert.equal(r.withParent, 1, "orphan1 carries a parent");
});

test("degreeZeroFromBuffer: empty graph + all-connected graph", () => {
  assert.deepEqual(degreeZeroFromBuffer(B({ nodes: [], edges: [] })).degreeZero, []);
  const allConnected = degreeZeroFromBuffer(B({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ from: "a", to: "b" }] }));
  assert.equal(allConnected.degreeZero.length, 0, "no orphans when every node is an endpoint");
});

test("streamDegreeZeroNodeIds: file wrapper uses injected readImpl (no real I/O)", () => {
  const fakeBuf = B({ nodes: [{ id: "a" }, { id: "lonely" }], edges: [{ from: "a", to: "a" }] });
  const r = streamDegreeZeroNodeIds("/fake/path", { readImpl: () => fakeBuf });
  assert.deepEqual(r.degreeZero.map((n) => n.id), ["lonely"]);
});
