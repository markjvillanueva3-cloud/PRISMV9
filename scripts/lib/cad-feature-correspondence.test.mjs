/**
 * Tests for cad-feature-correspondence.mjs (U-INDIA-CAD-FEATURE-CORRESPOND).
 * Reference-value assertions (no toBeDefined stubs): exact deltas, exact match assignments,
 * missing/extra/ranking semantics, type-gating, and edge cases. Run: node --test scripts/lib/cad-feature-correspondence.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { correspondFeatures, featureCost, parameterDeltas } from "./cad-feature-correspondence.mjs";

const F = (id, featureType, parameters) => ({ id, featureType, parameters });

test("matches same-type features + computes exact per-parameter delta (WHERE + how much)", () => {
  const ref = [F("R1", "hole", { diameter: 10, depth: 20, x: 0, y: 0 }), F("R2", "pocket", { width: 50, depth: 12 })];
  const gen = [F("G1", "hole", { diameter: 10.2, depth: 20, x: 0, y: 0 }), F("G2", "pocket", { width: 50, depth: 12 })];
  const res = correspondFeatures(gen, ref);
  assert.equal(res.summary.matchedCount, 2);
  assert.equal(res.summary.missingCount, 0);
  assert.equal(res.summary.extraCount, 0);
  const hole = res.matched.find((m) => m.reference.id === "R1");
  assert.equal(hole.generated.id, "G1"); // hole matched to hole, never to pocket
  const dia = hole.parameterDeltas.find((d) => d.key === "diameter");
  assert.ok(Math.abs(dia.numericDelta - 0.2) < 1e-9, "drawn 0.2 oversized");
  assert.ok(Math.abs(dia.percentDelta - 2) < 1e-9, "(10.2-10)/10*100 = 2%");
  // identical params produce no delta entry (depth/x/y unchanged)
  assert.equal(hole.parameterDeltas.length, 1);
});

test("type-gated: a hole never matches a pocket even when params are numerically identical", () => {
  assert.equal(featureCost(F("g", "hole", { d: 10 }), F("r", "pocket", { d: 10 })), Infinity);
});

test("missing = reference feature the generator FAILED to draw", () => {
  const ref = [F("R1", "hole", { diameter: 10 }), F("R2", "fillet", { radius: 5 })];
  const gen = [F("G1", "hole", { diameter: 10 })];
  const res = correspondFeatures(gen, ref);
  assert.equal(res.summary.missingCount, 1);
  assert.equal(res.missing[0].id, "R2");
  assert.equal(res.summary.extraCount, 0);
});

test("extra = generated feature not in the original (hallucinated)", () => {
  const ref = [F("R1", "hole", { diameter: 10 })];
  const gen = [F("G1", "hole", { diameter: 10 }), F("G2", "chamfer", { size: 1 })];
  const res = correspondFeatures(gen, ref);
  assert.equal(res.summary.extraCount, 1);
  assert.equal(res.extra[0].id, "G2");
});

test("rankedErrors puts the MOST-wrong matched feature first (localizes the worst error)", () => {
  const ref = [F("R1", "hole", { diameter: 10 }), F("R2", "hole", { diameter: 20 })];
  const gen = [F("G1", "hole", { diameter: 10.1 }), F("G2", "hole", { diameter: 25 })]; // G2 way off
  const res = correspondFeatures(gen, ref);
  assert.equal(res.summary.matchedCount, 2);
  assert.equal(res.rankedErrors[0].reference.id, "R2"); // 20->25 (25%) worse than 10->10.1 (1%)
  assert.ok(res.rankedErrors[0].cost > res.rankedErrors[1].cost);
  assert.equal(res.summary.worstCost, res.rankedErrors[0].cost);
});

test("greedy assignment prefers the globally-lowest-cost pairing (no cross-swap)", () => {
  const ref = [F("R1", "hole", { diameter: 10 }), F("R2", "hole", { diameter: 20 })];
  const gen = [F("G1", "hole", { diameter: 19.9 }), F("G2", "hole", { diameter: 10.1 })];
  const res = correspondFeatures(gen, ref);
  assert.equal(res.matched.find((m) => m.reference.id === "R1").generated.id, "G2"); // 10 <-> 10.1
  assert.equal(res.matched.find((m) => m.reference.id === "R2").generated.id, "G1"); // 20 <-> 19.9
});

test("perfect one-shot: everything matched near-zero, nothing missing/extra", () => {
  const res = correspondFeatures([F("G1", "hole", { diameter: 10 })], [F("R1", "hole", { diameter: 10 })]);
  assert.equal(res.summary.perfect, true);
});

test("edge: empty inputs -> empty result (no throw); non-array -> TypeError", () => {
  const res = correspondFeatures([], []);
  assert.equal(res.summary.matchedCount, 0);
  assert.equal(res.summary.worstFeatureId, null);
  assert.throws(() => correspondFeatures(null, []), TypeError);
  assert.throws(() => correspondFeatures([], "nope"), TypeError);
});

test("parameterDeltas: one-sided key -> before/after null; no numericDelta for non-numeric", () => {
  const d = parameterDeltas({ a: 1, tag: "x" }, { a: 1, b: 2, tag: "y" });
  const bd = d.find((x) => x.key === "b");
  assert.equal(bd.before, null);
  assert.equal(bd.after, 2);
  const tag = d.find((x) => x.key === "tag");
  assert.equal(tag.numericDelta, undefined); // string change -> no numeric delta
  assert.equal(d.find((x) => x.key === "a"), undefined); // unchanged -> omitted
});

test("maxCost rejects a too-different same-type pair -> becomes missing+extra, not a bad match", () => {
  const ref = [F("R1", "hole", { diameter: 10 })];
  const gen = [F("G1", "hole", { diameter: 1000 })]; // wildly off
  const res = correspondFeatures(gen, ref, { maxCost: 0.1 });
  assert.equal(res.summary.matchedCount, 0);
  assert.equal(res.summary.missingCount, 1);
  assert.equal(res.summary.extraCount, 1);
});
