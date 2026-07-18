#!/usr/bin/env node
/**
 * Tests for measure-confidence-hybrid.mjs (slot:india 2026-06-21).
 *
 * Real reference-value coverage (R9): hand-computed hybrid rule + sweep values, happy +
 * >=3 failure + >=2 adversarial per exported function. node:test convention. sweepHybrid
 * is tested via injected votesByStem (no I/O, deterministic).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  confidenceHybridVote,
  sweepHybrid,
  bestThreshold,
  TAU_GRID,
} from "./measure-confidence-hybrid.mjs";

// ---------------------------------------------------------------------------
// confidenceHybridVote
// ---------------------------------------------------------------------------

const NV = (p, c) => ({ predicted: p, confidence: c });
const DV = (p) => ({ predicted: p, confidence: 1 });

test("confidenceHybridVote: happy -- neighbor cleared tau is trusted", () => {
  const r = confidenceHybridVote(NV("X", 0.8), DV("Y"), 0.7);
  assert.equal(r.predicted, "X");
  assert.equal(r.source, "neighbor");
});

test("confidenceHybridVote: neighbor BELOW tau falls back to direct-embed", () => {
  const r = confidenceHybridVote(NV("X", 0.6), DV("Y"), 0.7);
  assert.equal(r.predicted, "Y");
  assert.equal(r.source, "direct");
});

test("confidenceHybridVote: tau=0 always trusts a present neighbor (naive hybrid)", () => {
  const r = confidenceHybridVote(NV("X", 0.01), DV("Y"), 0);
  assert.equal(r.predicted, "X");
  assert.equal(r.source, "neighbor");
});

test("confidenceHybridVote: tau>1 never trusts neighbor -> pure direct", () => {
  const r = confidenceHybridVote(NV("X", 1.0), DV("Y"), 1.01);
  assert.equal(r.predicted, "Y");
  assert.equal(r.source, "direct");
});

test("confidenceHybridVote: boundary -- confidence == tau is trusted (>=)", () => {
  const r = confidenceHybridVote(NV("X", 0.7), DV("Y"), 0.7);
  assert.equal(r.predicted, "X");
  assert.equal(r.source, "neighbor");
});

test("confidenceHybridVote: failure -- no neighbor -> direct", () => {
  const r = confidenceHybridVote(null, DV("Y"), 0.7);
  assert.equal(r.predicted, "Y");
  assert.equal(r.source, "direct");
});

test("confidenceHybridVote: failure -- no direct, low-purity neighbor -> neighbor-fallback", () => {
  const r = confidenceHybridVote(NV("X", 0.3), null, 0.7);
  assert.equal(r.predicted, "X");
  assert.equal(r.source, "neighbor-fallback");
});

test("confidenceHybridVote: failure -- neither arm -> null", () => {
  assert.equal(confidenceHybridVote(null, null, 0.7), null);
});

test("confidenceHybridVote: adversarial -- non-finite tau treated as 0 (trust neighbor)", () => {
  const r = confidenceHybridVote(NV("X", 0.01), DV("Y"), NaN);
  assert.equal(r.predicted, "X");
});

// ---------------------------------------------------------------------------
// sweepHybrid (injected votes -> deterministic, no I/O)
// ---------------------------------------------------------------------------

// 4 engines. true labels a,b->X ; c,d->Y.
// a: neighbor X@0.9 (right, high purity), direct X
// b: neighbor X@0.55 (right, low purity), direct Y (WRONG)
// c: neighbor X@0.55 (WRONG, low purity), direct Y (right)
// d: neighbor Y@0.95 (right), direct Y
const CLS = () => new Map([["a", "X"], ["b", "X"], ["c", "Y"], ["d", "Y"]]);
const VECS = () => new Map([["a", null], ["b", null], ["c", null], ["d", null]]); // membership only
const VOTES = () => new Map([
  ["a", { nv: NV("X", 0.9), dv: DV("X"), truth: "X" }],
  ["b", { nv: NV("X", 0.55), dv: DV("Y"), truth: "X" }],
  ["c", { nv: NV("X", 0.55), dv: DV("Y"), truth: "Y" }],
  ["d", { nv: NV("Y", 0.95), dv: DV("Y"), truth: "Y" }],
]);

test("sweepHybrid: tau=0 (naive) -- trusts all neighbor votes", () => {
  const r = sweepHybrid(CLS(), VECS(), new Map(), { taus: [0], votesByStem: VOTES() });
  // naive: a=X(right), b=X(right), c=X(WRONG), d=Y(right) -> 3/4
  assert.equal(r.rows[0].accuracy, 0.75);
  assert.equal(r.rows[0].coverage, 1);
  assert.equal(r.rows[0].neighborUsed, 4);
});

test("sweepHybrid: tau=0.7 -- gates out low-purity neighbor votes, uses direct there", () => {
  const r = sweepHybrid(CLS(), VECS(), new Map(), { taus: [0.7], votesByStem: VOTES() });
  // tau=0.7: a neighbor X@0.9>=0.7 -> X(right); b neighbor 0.55<0.7 -> direct Y(WRONG);
  //          c neighbor 0.55<0.7 -> direct Y(right); d neighbor 0.95 -> Y(right) -> 3/4.
  // Same 3/4 here BUT the b/c swap shows the mechanism: c fixed, b broken.
  assert.equal(r.rows[0].accuracy, 0.75);
  assert.equal(r.rows[0].neighborUsed, 2); // only a,d cleared 0.7
});

test("sweepHybrid: a higher-purity-correct fixture -- gating IMPROVES accuracy", () => {
  // Make c's WRONG neighbor low-purity (gated out -> direct fixes it) while keeping b's
  // RIGHT neighbor high-purity (kept). tau=0.7 should beat tau=0.
  const cls = new Map([["a", "X"], ["b", "X"], ["c", "Y"]]);
  const votes = new Map([
    ["a", { nv: NV("X", 0.9), dv: DV("X"), truth: "X" }],   // both right
    ["b", { nv: NV("X", 0.8), dv: DV("Y"), truth: "X" }],   // neighbor right (high), direct wrong
    ["c", { nv: NV("X", 0.5), dv: DV("Y"), truth: "Y" }],   // neighbor WRONG (low), direct right
  ]);
  const vecs = new Map([["a", null], ["b", null], ["c", null]]);
  const naive = sweepHybrid(cls, vecs, new Map(), { taus: [0], votesByStem: votes }).rows[0];
  const gated = sweepHybrid(cls, vecs, new Map(), { taus: [0.7], votesByStem: votes }).rows[0];
  assert.equal(naive.accuracy, 2 / 3);  // a right, b right(neighbor), c WRONG(neighbor) -> 2/3
  assert.equal(gated.accuracy, 1);      // a right, b right(neighbor kept), c right(direct) -> 3/3
  assert.ok(gated.accuracy > naive.accuracy);
});

test("sweepHybrid: failure -- empty population -> null metrics", () => {
  const r = sweepHybrid(new Map(), new Map(), new Map(), { taus: [0, 0.7] });
  assert.equal(r.population, 0);
  assert.equal(r.rows[0].accuracy, null);
  assert.equal(r.rows[0].coverage, null);
});

test("sweepHybrid: failure -- engines without vectors excluded from population", () => {
  const cls = new Map([["a", "X"], ["q", "Y"]]);
  const vecs = new Map([["a", null]]); // q has no vector entry
  const votes = new Map([["a", { nv: NV("X", 0.9), dv: DV("X"), truth: "X" }]]);
  const r = sweepHybrid(cls, vecs, new Map(), { taus: [0], votesByStem: votes });
  assert.equal(r.population, 1);
});

// ---------------------------------------------------------------------------
// bestThreshold
// ---------------------------------------------------------------------------

test("bestThreshold: happy -- picks max accuracy", () => {
  const rows = [{ tau: 0, accuracy: 0.7 }, { tau: 0.7, accuracy: 0.8 }, { tau: 1.01, accuracy: 0.6 }];
  assert.equal(bestThreshold(rows).tau, 0.7);
});

test("bestThreshold: tie -> lower tau (more neighbor usage)", () => {
  const rows = [{ tau: 0.6, accuracy: 0.8 }, { tau: 0.8, accuracy: 0.8 }];
  assert.equal(bestThreshold(rows).tau, 0.6);
});

test("bestThreshold: failure -- no finite accuracy -> null", () => {
  assert.equal(bestThreshold([{ tau: 0, accuracy: null }]), null);
  assert.equal(bestThreshold([]), null);
  assert.equal(bestThreshold(null), null);
});

// ---------------------------------------------------------------------------
// TAU_GRID contract
// ---------------------------------------------------------------------------

test("TAU_GRID: includes naive(0), the production gate(0.7), and a >1 pure-direct sentinel", () => {
  assert.ok(TAU_GRID.includes(0));
  assert.ok(TAU_GRID.includes(0.7));
  assert.ok(TAU_GRID.some((t) => t > 1));
});
