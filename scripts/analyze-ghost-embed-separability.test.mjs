// Tests for analyze-ghost-embed-separability.mjs -- the pure separability primitives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLabeledVectors, meanIntraCosine, meanInterCosine, classSeparability } from "./analyze-ghost-embed-separability.mjs";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("loadLabeledVectors -- reconstructs q*s, keys by engine name, skips meta/blank/non-vector", () => {
  const text = [
    JSON.stringify({ __meta: true, model: "nomic" }),
    JSON.stringify({ id: "ghost.codebase-wired.FooEngine", n: "FooEngine", q: [2, -4], s: 0.5 }),
    "",
    JSON.stringify({ id: "ghost.codebase-wired.BarEngine", n: "BarEngine", q: [1, 1], s: 1 }),
    JSON.stringify({ id: "x", text: "no q" }), // skipped
  ].join("\n");
  const m = loadLabeledVectors(text);
  assert.equal(m.size, 2);
  assert.deepEqual(m.get("FooEngine"), [1, -2], "q*s = [2,-4]*0.5");
  assert.deepEqual(m.get("BarEngine"), [1, 1]);
});

test("loadLabeledVectors -- falls back to id trailing segment when n is absent", () => {
  const text = JSON.stringify({ id: "ghost.codebase-wired.BazEngine", q: [1, 0], s: 1 });
  const m = loadLabeledVectors(text);
  assert.ok(m.has("BazEngine"), "engine derived from id when n missing");
});

test("meanIntraCosine -- identical unit vectors = 1, orthogonal = 0, <2 -> null", () => {
  assert.ok(close(meanIntraCosine([[1, 0], [1, 0]]), 1));
  assert.ok(close(meanIntraCosine([[1, 0], [0, 1]]), 0));
  // 3 vectors: pairs (a,b)=1, (a,c)=0, (b,c)=0 -> mean 1/3
  assert.ok(close(meanIntraCosine([[1, 0], [1, 0], [0, 1]]), 1 / 3));
  assert.equal(meanIntraCosine([[1, 0]]), null, "single vector -> null");
  assert.equal(meanIntraCosine([]), null);
});

test("meanInterCosine -- cross-set mean; empty -> null", () => {
  assert.ok(close(meanInterCosine([[1, 0]], [[0, 1]]), 0));
  assert.ok(close(meanInterCosine([[1, 0], [1, 0]], [[1, 0]]), 1), "all aligned -> 1");
  assert.equal(meanInterCosine([], [[1, 0]]), null);
  assert.equal(meanInterCosine([[1, 0]], []), null);
});

test("classSeparability -- well-separated classes give a large positive margin", () => {
  // Class A clusters near [1,0]; class B near [0,1]. intra ~ 1, inter ~ 0 -> margin ~ 1.
  const byClass = new Map([
    ["prism_a", [[1, 0], [1, 0]]],
    ["prism_b", [[0, 1], [0, 1]]],
  ]);
  const { perClass, summary } = classSeparability(byClass, 2);
  assert.equal(perClass.length, 2);
  for (const p of perClass) assert.ok(p.margin > 0.9, `${p.class} margin ${p.margin} should be ~1`);
  assert.equal(summary.separableClasses, 2);
  assert.ok(summary.meanMargin > 0.9);
});

test("classSeparability -- entangled classes give a near-zero margin", () => {
  // Both classes drawn from the SAME direction -> intra ~ inter -> margin ~ 0.
  const byClass = new Map([
    ["prism_a", [[1, 0], [1, 0]]],
    ["prism_b", [[1, 0], [1, 0]]],
  ]);
  const { perClass, summary } = classSeparability(byClass, 2);
  for (const p of perClass) assert.ok(Math.abs(p.margin) < 1e-6, `${p.class} margin ~0`);
  assert.equal(summary.separableClasses, 0, "no class clears the 0.05 separability bar");
});

test("classSeparability -- classes below minClass are excluded from scoring", () => {
  const byClass = new Map([
    ["prism_a", [[1, 0], [1, 0], [1, 0]]],
    ["prism_b", [[0, 1]]], // only 1 member -> excluded at minClass 2
  ]);
  const { perClass } = classSeparability(byClass, 2);
  assert.equal(perClass.length, 1);
  assert.equal(perClass[0].class, "prism_a");
});
