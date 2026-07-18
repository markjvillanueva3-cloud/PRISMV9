#!/usr/bin/env node
/**
 * Tests for measure-edge-class-homophily.mjs (slot:india 2026-06-21).
 *
 * Real reference-value coverage: every expected number is hand-computed in the test
 * body (R9 -- a test that would fail if the homophily math drifted), with happy paths,
 * >=3 failure modes, and >=2 adversarial inputs per exported function. node:test
 * convention (matches engine-import-fingerprint.test.mjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractStem,
  buildStemToClass,
  classDistributionBaseline,
  directHomophily,
  sharedIntermediateHomophily,
  LEAK_FREE_EDGE_FILES,
} from "./measure-edge-class-homophily.mjs";

// ---------------------------------------------------------------------------
// extractStem
// ---------------------------------------------------------------------------

test("extractStem: happy -- 3-segment eng id returns lowercased stem", () => {
  assert.equal(extractStem("eng.mill.foopumpengine"), "foopumpengine");
});

test("extractStem: normalizes case (PascalCase stem -> lower)", () => {
  assert.equal(extractStem("eng.mill.FooPumpEngine"), "foopumpengine");
});

test("extractStem: failure -- non-eng prefix (dispatcher action id) -> null", () => {
  assert.equal(extractStem("disp.calcdispatcher.action.x"), null);
});

test("extractStem: failure -- wrong depth (2 segments) -> null", () => {
  assert.equal(extractStem("eng.mill"), null);
});

test("extractStem: failure -- wrong depth (4 segments) -> null", () => {
  assert.equal(extractStem("eng.a.b.c"), null);
});

test("extractStem: adversarial -- non-string / null / schema id -> null", () => {
  assert.equal(extractStem(null), null);
  assert.equal(extractStem(123), null);
  assert.equal(extractStem("schema.loraschema.cfg"), null);
  assert.equal(extractStem(""), null);
});

// ---------------------------------------------------------------------------
// buildStemToClass
// ---------------------------------------------------------------------------

test("buildStemToClass: happy -- single-dispatcher engine mapped, stem lowercased", () => {
  const in_ = new Map([["FooEngine", new Set(["prism_calc"])]]);
  const out = buildStemToClass(in_);
  assert.equal(out.get("fooengine"), "prism_calc");
  assert.equal(out.size, 1);
});

test("buildStemToClass: failure -- multi-dispatcher engine EXCLUDED (ambiguous label)", () => {
  const in_ = new Map([["BarEngine", new Set(["prism_calc", "prism_cam"])]]);
  assert.equal(buildStemToClass(in_).size, 0);
});

test("buildStemToClass: failure -- empty Set excluded", () => {
  const in_ = new Map([["BazEngine", new Set()]]);
  assert.equal(buildStemToClass(in_).size, 0);
});

test("buildStemToClass: failure -- non-Map input -> empty Map", () => {
  assert.equal(buildStemToClass(null).size, 0);
  assert.equal(buildStemToClass([["A", new Set(["x"])]]).size, 0);
});

test("buildStemToClass: adversarial -- stem collision is first-wins (deterministic)", () => {
  // Two distinct PascalCase classes lowercasing to the same stem.
  const in_ = new Map([
    ["FooEngine", new Set(["prism_calc"])],
    ["Fooengine", new Set(["prism_cam"])],
  ]);
  const out = buildStemToClass(in_);
  assert.equal(out.size, 1);
  assert.equal(out.get("fooengine"), "prism_calc"); // first insertion wins
});

// ---------------------------------------------------------------------------
// classDistributionBaseline (random-pair null)
// ---------------------------------------------------------------------------

test("classDistributionBaseline: happy -- [A,A,B,B] -> 4/12", () => {
  // same = 2*1 + 2*1 = 4 ; pairs-denominator = 4*3 = 12 -> 1/3
  assert.equal(classDistributionBaseline(["A", "A", "B", "B"]), 4 / 12);
});

test("classDistributionBaseline: all-same -> 1.0", () => {
  // same = 3*2 = 6 ; denom = 3*2 = 6 -> 1.0
  assert.equal(classDistributionBaseline(["A", "A", "A"]), 1);
});

test("classDistributionBaseline: all-distinct -> 0", () => {
  assert.equal(classDistributionBaseline(["A", "B", "C", "D"]), 0);
});

test("classDistributionBaseline: failure -- N<2 / empty / non-array -> null", () => {
  assert.equal(classDistributionBaseline(["A"]), null);
  assert.equal(classDistributionBaseline([]), null);
  assert.equal(classDistributionBaseline(null), null);
});

test("classDistributionBaseline: reference -- [A,A,A,B] -> 6/12 = 0.5", () => {
  // A:3 -> 3*2=6 ; B:1 -> 0 ; denom 4*3=12
  assert.equal(classDistributionBaseline(["A", "A", "A", "B"]), 0.5);
});

// ---------------------------------------------------------------------------
// directHomophily (1-hop engine<->engine)
// ---------------------------------------------------------------------------

test("directHomophily: happy -- hand graph, exact ratio + dedup + skips", () => {
  const cls = new Map([
    ["a", "X"], ["b", "X"], ["c", "Y"], ["d", "Y"], ["e", "Z"],
  ]);
  const edges = [
    { from: "eng.m.a", to: "eng.m.b" }, // same X
    { from: "eng.m.c", to: "eng.m.d" }, // same Y
    { from: "eng.m.a", to: "eng.m.c" }, // cross X/Y
    { from: "eng.m.b", to: "eng.m.a" }, // mutual import -> dedup with {a,b}
    { from: "eng.m.a", to: "eng.m.e" }, // cross X/Z
    { from: "eng.m.a", to: "eng.m.a" }, // self-loop -> skip
    { from: "eng.m.a", to: "eng.m.unknownstem" }, // unclassifiable -> skip
    null,                               // malformed -> skip
    { from: "eng.m.a" },                // missing `to` -> skip
  ];
  const r = directHomophily(edges, cls);
  // unordered pairs: {a,b}=same, {c,d}=same, {a,c}=cross, {a,e}=cross
  assert.equal(r.pairs, 4);
  assert.equal(r.sameClass, 2);
  assert.equal(r.ratio, 0.5);
  assert.equal(r.participants.size, 5); // a,b,c,d,e
});

test("directHomophily: failure -- empty edges -> ratio null, pairs 0", () => {
  const r = directHomophily([], new Map([["a", "X"]]));
  assert.equal(r.pairs, 0);
  assert.equal(r.sameClass, 0);
  assert.equal(r.ratio, null);
});

test("directHomophily: failure -- all-cross-class -> ratio 0", () => {
  const cls = new Map([["a", "X"], ["b", "Y"]]);
  const r = directHomophily([{ from: "eng.m.a", to: "eng.m.b" }], cls);
  assert.equal(r.pairs, 1);
  assert.equal(r.sameClass, 0);
  assert.equal(r.ratio, 0);
});

test("directHomophily: failure -- non-array edges / non-Map map -> safe empty", () => {
  const r1 = directHomophily(null, new Map());
  assert.equal(r1.pairs, 0);
  assert.equal(r1.ratio, null);
  const r2 = directHomophily([{ from: "eng.m.a", to: "eng.m.b" }], null);
  assert.equal(r2.pairs, 0); // no classes -> nothing classifiable
});

test("directHomophily: adversarial -- a schema endpoint is not an engine (skipped)", () => {
  const cls = new Map([["a", "X"], ["b", "X"]]);
  const edges = [
    { from: "eng.m.a", to: "schema.s1" }, // `to` not an engine -> not a direct pair
    { from: "eng.m.a", to: "eng.m.b" },   // valid same-class pair
  ];
  const r = directHomophily(edges, cls);
  assert.equal(r.pairs, 1);
  assert.equal(r.sameClass, 1);
  assert.equal(r.ratio, 1);
});

// ---------------------------------------------------------------------------
// sharedIntermediateHomophily (2-hop via shared schema/physics/test)
// ---------------------------------------------------------------------------

test("sharedIntermediateHomophily: happy -- exact pairs across two intermediates", () => {
  const cls = new Map([["a", "X"], ["b", "X"], ["c", "Y"]]);
  const edges = [
    // schema s1 shared by a(X), b(X), c(Y): C(3,2)=3 pairs; same = C(2,2 of X)=1
    { from: "eng.m.a", to: "schema.s1" },
    { from: "eng.m.b", to: "schema.s1" },
    { from: "eng.m.c", to: "schema.s1" },
    // test t1 shared by a(X), b(X) via the `to` endpoint: 1 pair, same=1
    { from: "test.t1", to: "eng.m.a" },
    { from: "test.t1", to: "eng.m.b" },
    // both-engine edge -> skipped (handled by directHomophily, not here)
    { from: "eng.m.a", to: "eng.m.b" },
    // singleton intermediate -> 0 pairs
    { from: "eng.m.a", to: "schema.s2" },
    // unclassifiable engine on s1 -> ignored (does not inflate s1)
    { from: "eng.m.zzz", to: "schema.s1" },
    // duplicate engine on the same intermediate -> deduped (m.has guard)
    { from: "eng.m.a", to: "schema.s1" },
  ];
  const r = sharedIntermediateHomophily(edges, cls);
  assert.equal(r.sharedIntermediates, 2); // s1 + t1
  assert.equal(r.pairs, 3 + 1);           // 4
  assert.equal(r.sameClass, 1 + 1);       // 2
  assert.equal(r.ratio, 0.5);
  assert.equal(r.participants.size, 3);   // a,b,c
});

test("sharedIntermediateHomophily: failure -- no intermediate shared by >=2 -> ratio null", () => {
  const cls = new Map([["a", "X"], ["b", "Y"]]);
  const edges = [
    { from: "eng.m.a", to: "schema.s1" },
    { from: "eng.m.b", to: "schema.s2" },
  ];
  const r = sharedIntermediateHomophily(edges, cls);
  assert.equal(r.sharedIntermediates, 0);
  assert.equal(r.pairs, 0);
  assert.equal(r.ratio, null);
});

test("sharedIntermediateHomophily: failure -- empty edges -> ratio null", () => {
  const r = sharedIntermediateHomophily([], new Map([["a", "X"]]));
  assert.equal(r.pairs, 0);
  assert.equal(r.ratio, null);
});

test("sharedIntermediateHomophily: failure -- all same-class intermediate -> ratio 1", () => {
  const cls = new Map([["a", "X"], ["b", "X"]]);
  const r = sharedIntermediateHomophily(
    [{ from: "eng.m.a", to: "schema.s1" }, { from: "eng.m.b", to: "schema.s1" }],
    cls,
  );
  assert.equal(r.pairs, 1);
  assert.equal(r.sameClass, 1);
  assert.equal(r.ratio, 1);
});

test("sharedIntermediateHomophily: adversarial -- both-engine + neither-engine edges skipped", () => {
  const cls = new Map([["a", "X"], ["b", "X"]]);
  const edges = [
    { from: "eng.m.a", to: "eng.m.b" },     // both engines -> skip
    { from: "schema.s1", to: "schema.s2" }, // neither engine -> skip
    null,                                   // malformed -> skip
    { from: "test.t1", to: "eng.m.a" },     // only one engine, singleton -> 0 pairs
  ];
  const r = sharedIntermediateHomophily(edges, cls);
  assert.equal(r.sharedIntermediates, 0);
  assert.equal(r.pairs, 0);
  assert.equal(r.ratio, null);
});

// ---------------------------------------------------------------------------
// LEAK_FREE_EDGE_FILES contract (action-engine must NEVER appear -- it leaks)
// ---------------------------------------------------------------------------

test("LEAK_FREE_EDGE_FILES: action-engine edges are EXCLUDED (leak discipline)", () => {
  const files = LEAK_FREE_EDGE_FILES.map((s) => s.file);
  assert.ok(!files.some((f) => f.includes("action-engine")), "action-engine must not be measured (leaks the dispatcher label)");
  // engine_import is the only "direct" 1-hop type (the message-passing layer-1 driver).
  const direct = LEAK_FREE_EDGE_FILES.filter((s) => s.mode === "direct");
  assert.equal(direct.length, 1);
  assert.equal(direct[0].type, "engine_import");
});
