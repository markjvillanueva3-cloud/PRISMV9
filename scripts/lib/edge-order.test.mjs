#!/usr/bin/env node
/**
 * edge-order.test.mjs — hermetic tests for the U-RAG-4 lost-in-the-middle
 * reordering utility. No I/O, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeOrder, edgeOrderByScore } from "./edge-order.mjs";

test("edgeOrder — even length: best at front, 2nd-best at end, weak in middle", () => {
  assert.deepEqual(edgeOrder([1, 2, 3, 4, 5, 6]), [1, 3, 5, 6, 4, 2]);
});

test("edgeOrder — odd length", () => {
  assert.deepEqual(edgeOrder([1, 2, 3, 4, 5]), [1, 3, 5, 4, 2]);
});

test("edgeOrder — rank 1 is always first, rank 2 always last", () => {
  const out = edgeOrder(["a", "b", "c", "d", "e", "f", "g"]);
  assert.equal(out[0], "a");                 // best → front
  assert.equal(out[out.length - 1], "b");    // 2nd best → very end
});

test("edgeOrder — length <= 2 returned as-is (no middle to protect)", () => {
  assert.deepEqual(edgeOrder([]), []);
  assert.deepEqual(edgeOrder([1]), [1]);
  assert.deepEqual(edgeOrder([1, 2]), [1, 2]);
});

test("edgeOrder — total + stable: every element appears exactly once", () => {
  const input = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const out = edgeOrder(input);
  assert.equal(out.length, input.length);
  assert.deepEqual([...out].sort((a, b) => a - b), [...input].sort((a, b) => a - b));
});

test("edgeOrder — does not mutate the input", () => {
  const input = [1, 2, 3, 4, 5];
  const copy = [...input];
  edgeOrder(input);
  assert.deepEqual(input, copy);
});

test("edgeOrder — non-array input returns []", () => {
  assert.deepEqual(edgeOrder(null), []);
  assert.deepEqual(edgeOrder(undefined), []);
  assert.deepEqual(edgeOrder("nope"), []);
});

test("edgeOrder — works on objects", () => {
  const items = [{ id: "x" }, { id: "y" }, { id: "z" }, { id: "w" }];
  const out = edgeOrder(items);
  assert.deepEqual(out.map((o) => o.id), ["x", "z", "w", "y"]);
});

test("edgeOrderByScore — sorts best→worst then edge-orders", () => {
  const items = [
    { id: "lo", s: 0.1 }, { id: "hi", s: 0.9 }, { id: "mid", s: 0.5 },
    { id: "hi2", s: 0.8 }, { id: "lo2", s: 0.2 },
  ];
  // ranked best→worst: hi(.9), hi2(.8), mid(.5), lo2(.2), lo(.1)
  // edgeOrder → [hi, mid, lo, lo2, hi2]
  const out = edgeOrderByScore(items, (it) => it.s).map((o) => o.id);
  assert.deepEqual(out, ["hi", "mid", "lo", "lo2", "hi2"]);
});

test("edgeOrderByScore — non-array input returns []", () => {
  assert.deepEqual(edgeOrderByScore(null, (x) => x), []);
});

test("edgeOrderByScore — missing score selector returns a copy unchanged", () => {
  assert.deepEqual(edgeOrderByScore([3, 1, 2], null), [3, 1, 2]);
});

test("edgeOrderByScore — non-numeric scores treated as 0", () => {
  const items = [{ id: "a", s: "bad" }, { id: "b", s: 5 }, { id: "c", s: 3 }];
  const out = edgeOrderByScore(items, (it) => it.s).map((o) => o.id);
  assert.equal(out[0], "b"); // highest real score → front
});
