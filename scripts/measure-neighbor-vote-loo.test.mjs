#!/usr/bin/env node
/**
 * Tests for measure-neighbor-vote-loo.mjs (slot:india 2026-06-21).
 *
 * Real reference-value coverage (R9): every expected number is hand-computed in the
 * test body, with happy paths, >=3 failure modes, and >=2 adversarial inputs per
 * exported function. node:test convention.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildNeighborIndex,
  neighborVote,
  baseRatePrior,
  looEvaluate,
  NEIGHBOR_EDGE_FILES,
} from "./measure-neighbor-vote-loo.mjs";

// Shared fixture: classes a,b -> X ; c -> Y.
const CLS = () => new Map([["a", "X"], ["b", "X"], ["c", "Y"]]);

// import a-b (w1) + schema s1 over {a,b,c} (pairwise w1) ->
//   a: {b:2, c:1}   b: {a:2, c:1}   c: {a:1, b:1}
const GROUPS = () => [
  { mode: "direct", edges: [{ from: "eng.m.a", to: "eng.m.b" }, { from: "eng.m.a", to: "eng.m.zzz" }] },
  {
    mode: "shared",
    edges: [
      { from: "eng.m.a", to: "schema.s1" },
      { from: "eng.m.b", to: "schema.s1" },
      { from: "eng.m.c", to: "schema.s1" },
    ],
  },
];

// ---------------------------------------------------------------------------
// buildNeighborIndex
// ---------------------------------------------------------------------------

test("buildNeighborIndex: happy -- import + shared accumulate weights, undirected", () => {
  const idx = buildNeighborIndex(GROUPS(), CLS());
  assert.equal(idx.get("a").get("b"), 2); // import(1) + schema(1)
  assert.equal(idx.get("a").get("c"), 1); // schema only
  assert.equal(idx.get("b").get("a"), 2); // symmetric
  assert.equal(idx.get("c").get("a"), 1);
  assert.equal(idx.get("c").get("b"), 1);
  assert.equal(idx.get("a").has("zzz"), false); // unclassifiable endpoint never linked
});

test("buildNeighborIndex: failure -- self-loop skipped", () => {
  const idx = buildNeighborIndex([{ mode: "direct", edges: [{ from: "eng.m.a", to: "eng.m.a" }] }], CLS());
  assert.equal(idx.has("a"), false);
});

test("buildNeighborIndex: failure -- unclassifiable endpoints not linked", () => {
  const idx = buildNeighborIndex([{ mode: "direct", edges: [{ from: "eng.m.a", to: "eng.m.zzz" }] }], CLS());
  assert.equal(idx.size, 0);
});

test("buildNeighborIndex: failure -- non-array groups / non-Map map -> empty", () => {
  assert.equal(buildNeighborIndex(null, CLS()).size, 0);
  assert.equal(buildNeighborIndex(GROUPS(), null).size, 0);
});

test("buildNeighborIndex: adversarial -- engine endpoint in `to` (test-coverage style)", () => {
  const idx = buildNeighborIndex(
    [{ mode: "shared", edges: [{ from: "test.t1", to: "eng.m.a" }, { from: "test.t1", to: "eng.m.b" }] }],
    CLS(),
  );
  assert.equal(idx.get("a").get("b"), 1);
  assert.equal(idx.get("b").get("a"), 1);
});

test("buildNeighborIndex: adversarial -- both-engine edge in a shared group is skipped", () => {
  // A shared-mode edge with BOTH endpoints engines is not a shared-intermediate edge.
  const idx = buildNeighborIndex([{ mode: "shared", edges: [{ from: "eng.m.a", to: "eng.m.b" }, null] }], CLS());
  assert.equal(idx.size, 0);
});

// ---------------------------------------------------------------------------
// neighborVote
// ---------------------------------------------------------------------------

test("neighborVote: happy -- weighted majority + purity confidence", () => {
  const idx = buildNeighborIndex(GROUPS(), CLS());
  // a's neighbors: b(X,w2), c(Y,w1) -> X=2, Y=1, total 3 -> X @ 2/3.
  const v = neighborVote("a", idx, CLS());
  assert.equal(v.predicted, "X");
  assert.equal(v.confidence, 2 / 3);
  assert.equal(v.neighborCount, 2);
  assert.equal(v.totalWeight, 3);
});

test("neighborVote: a minority node is OUT-VOTED by its majority neighbors (LOO, no self-leak)", () => {
  const idx = buildNeighborIndex(GROUPS(), CLS());
  // c's neighbors: a(X,w1), b(X,w1) -> X=2, total 2 -> predicts X though c is truly Y.
  const v = neighborVote("c", idx, CLS());
  assert.equal(v.predicted, "X");
  assert.equal(v.confidence, 1);
});

test("neighborVote: failure -- no neighbors -> null", () => {
  assert.equal(neighborVote("nonexistent", buildNeighborIndex(GROUPS(), CLS()), CLS()), null);
});

test("neighborVote: failure -- all neighbors unclassifiable -> null", () => {
  // d links to e, neither in the class map.
  const idx = buildNeighborIndex([{ mode: "direct", edges: [{ from: "eng.m.d", to: "eng.m.e" }] }], new Map([["d", "X"], ["e", "Y"]]));
  // Now query d with a class map that drops e -> e's vote is unclassifiable.
  const v = neighborVote("d", idx, new Map([["d", "X"]]));
  assert.equal(v, null);
});

test("neighborVote: adversarial -- deterministic sorted tie-break", () => {
  // p neighbors q(A,w1), r(B,w1) -> A=1,B=1 tie -> sorted -> A wins, conf 0.5.
  const idx = new Map([["p", new Map([["q", 1], ["r", 1]])]]);
  const cls = new Map([["p", "Z"], ["q", "A"], ["r", "B"]]);
  const v = neighborVote("p", idx, cls);
  assert.equal(v.predicted, "A");
  assert.equal(v.confidence, 0.5);
});

// ---------------------------------------------------------------------------
// baseRatePrior
// ---------------------------------------------------------------------------

test("baseRatePrior: happy -- most-common class accuracy", () => {
  const r = baseRatePrior(["X", "X", "Y"]);
  assert.equal(r.accuracy, 2 / 3);
  assert.equal(r.topClass, "X");
  assert.equal(r.total, 3);
});

test("baseRatePrior: failure -- empty -> null accuracy", () => {
  const r = baseRatePrior([]);
  assert.equal(r.accuracy, null);
  assert.equal(r.topClass, null);
  assert.equal(r.total, 0);
});

test("baseRatePrior: failure -- null iterable -> null accuracy", () => {
  assert.equal(baseRatePrior(null).accuracy, null);
});

test("baseRatePrior: adversarial -- tie broken by sorted class name", () => {
  const r = baseRatePrior(["B", "A"]);
  assert.equal(r.topClass, "A"); // sorted -> A wins the tie
  assert.equal(r.accuracy, 0.5);
});

// ---------------------------------------------------------------------------
// looEvaluate
// ---------------------------------------------------------------------------

test("looEvaluate: happy -- exact accuracy / coverage / lift / banded", () => {
  const idx = buildNeighborIndex(GROUPS(), CLS());
  const r = looEvaluate(idx, CLS());
  // a -> X (true X, correct, conf 2/3); b -> X (true X, correct, conf 2/3);
  // c -> X (true Y, WRONG, conf 1.0). covered 3, correct 2.
  assert.equal(r.total, 3);
  assert.equal(r.covered, 3);
  assert.equal(r.correct, 2);
  assert.equal(r.accuracy, 2 / 3);
  assert.equal(r.coverage, 1);
  assert.equal(r.baseRate, 2 / 3); // [X,X,Y] -> 2/3
  assert.equal(r.baseClass, "X");
  assert.equal(r.lift, 1); // (2/3)/(2/3)
  assert.equal(r.avgNeighbors, 2); // each of a,b,c has 2 classifiable neighbors
  // banded: tau 0.5 -> all 3 covered, correct 2 (a,b right; c wrong) -> 2/3;
  //         tau 0.7 -> only c (conf 1.0), correct 0 -> 0/1.
  const b05 = r.perConfidence.find((b) => b.tau === 0.5);
  const b07 = r.perConfidence.find((b) => b.tau === 0.7);
  assert.equal(b05.coverage, 1);
  assert.equal(b05.accuracy, 2 / 3);
  assert.equal(b07.coverage, 1 / 3);
  assert.equal(b07.accuracy, 0);
});

test("looEvaluate: failure -- empty class map -> null metrics", () => {
  const r = looEvaluate(new Map(), new Map());
  assert.equal(r.total, 0);
  assert.equal(r.covered, 0);
  assert.equal(r.accuracy, null);
  assert.equal(r.coverage, null);
  assert.equal(r.lift, null);
});

test("looEvaluate: failure -- engines with no edges are uncovered", () => {
  // class map has 3 engines but the index links only a-b.
  const idx = buildNeighborIndex([{ mode: "direct", edges: [{ from: "eng.m.a", to: "eng.m.b" }] }], CLS());
  const r = looEvaluate(idx, CLS());
  assert.equal(r.total, 3);
  assert.equal(r.covered, 2); // a,b covered; c has no edge
  assert.ok(r.coverage < 1);
});

test("looEvaluate: adversarial -- a perfectly homophilous graph scores accuracy 1, lift > 1", () => {
  // Two same-class clusters, each fully connected; no cross-class edge.
  const cls = new Map([["a", "X"], ["b", "X"], ["c", "X"], ["d", "Y"], ["e", "Y"], ["f", "Y"]]);
  const groups = [{
    mode: "direct",
    edges: [
      { from: "eng.m.a", to: "eng.m.b" }, { from: "eng.m.b", to: "eng.m.c" }, { from: "eng.m.a", to: "eng.m.c" },
      { from: "eng.m.d", to: "eng.m.e" }, { from: "eng.m.e", to: "eng.m.f" }, { from: "eng.m.d", to: "eng.m.f" },
    ],
  }];
  const r = looEvaluate(buildNeighborIndex(groups, cls), cls);
  assert.equal(r.accuracy, 1);   // every node's neighbors are all same-class
  assert.equal(r.coverage, 1);
  assert.equal(r.baseRate, 0.5); // 3 X, 3 Y -> base rate 0.5
  assert.equal(r.lift, 2);       // 1.0 / 0.5
});

// ---------------------------------------------------------------------------
// NEIGHBOR_EDGE_FILES contract
// ---------------------------------------------------------------------------

test("NEIGHBOR_EDGE_FILES: only homophilous leak-free types (no physics, no action-engine)", () => {
  const files = NEIGHBOR_EDGE_FILES.map((s) => s.file);
  assert.ok(!files.some((f) => f.includes("action-engine")), "action-engine leaks the label");
  assert.ok(!files.some((f) => f.includes("physics")), "physics is class-agnostic (lift 1.01x)");
  assert.deepEqual(NEIGHBOR_EDGE_FILES.map((s) => s.type).sort(), ["engine_import", "shared_schema", "shared_test"]);
});
