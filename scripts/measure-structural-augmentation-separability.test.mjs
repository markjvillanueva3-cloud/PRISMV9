#!/usr/bin/env node
/**
 * measure-structural-augmentation-separability.test.mjs -- R9 intent tests for the pure measurement
 * core augmentedSeparability (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
 *
 * The intent the harness must encode: when the TEXT embeddings are non-separable but same-class
 * engines form import cliques (the structural signal), augmenting LIFTS the per-class separability
 * margin over the text-only baseline -- and a feature absent for a node degrades gracefully to text.
 * These tests pin that with controlled corpora so a regression in the fusion/leakage logic is caught
 * without depending on the live 3206-engine cache.
 *
 * Run: node scripts/measure-structural-augmentation-separability.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { augmentedSeparability } from "./measure-structural-augmentation-separability.mjs";

// Two classes, 5 engines each (>= minClass). TEXT is identical for every engine -> text-only margin
// is ~0 (non-separable). Each engine imports 2 SAME-CLASS siblings -> the structural histogram is a
// clean class one-hot, so augmentation should separate the classes.
function cliqueCorpus() {
  const text = [1, 0, 0]; // identical text for all -> baseline margin ~0
  const vecByEngine = new Map();
  const engineToDisp = new Map();
  const adjacency = new Map();
  const A = ["A1", "A2", "A3", "A4", "A5"];
  const B = ["B1", "B2", "B3", "B4", "B5"];
  for (const e of A) { vecByEngine.set(e, text.slice()); engineToDisp.set(e, "prism_calc"); }
  for (const e of B) { vecByEngine.set(e, text.slice()); engineToDisp.set(e, "prism_cam"); }
  // intra-class import cliques (ring of same-class siblings)
  const ring = (arr) => arr.forEach((e, i) => adjacency.set(e, new Set([arr[(i + 1) % arr.length], arr[(i + 2) % arr.length]])));
  ring(A); ring(B);
  return { vecByEngine, engineToDisp, adjacency };
}

test("augmentedSeparability: non-separable text + same-class cliques -> augmentation LIFTS margin", () => {
  const { vecByEngine, engineToDisp, adjacency } = cliqueCorpus();
  const classList = ["prism_calc", "prism_cam"];
  const base = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 0, includeDegree: false, minClass: 5 });
  const aug = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 0.7, includeDegree: false, minClass: 5 });
  assert.ok((base.summary.meanMargin ?? 0) < 0.05, `text-only baseline should be non-separable, got ${base.summary.meanMargin}`);
  assert.ok((aug.summary.meanMargin ?? 0) > (base.summary.meanMargin ?? 0) + 0.3,
    `augmentation must lift margin: base ${base.summary.meanMargin} -> aug ${aug.summary.meanMargin}`);
  assert.equal(aug.summary.separableClasses, 2, "both classes separable after augmentation");
  assert.equal(base.summary.separableClasses, 0, "neither class separable on identical text");
});

test("augmentedSeparability: structCoverage reflects fraction with a non-zero struct block", () => {
  const { vecByEngine, engineToDisp, adjacency } = cliqueCorpus();
  const classList = ["prism_calc", "prism_cam"];
  const full = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 0.5, includeDegree: false, minClass: 5 });
  assert.equal(full.structCoverage, 1, "every engine has import edges -> 100% coverage");
  assert.equal(full.labeled, 10);
  assert.equal(full.structHit, 10);
});

test("augmentedSeparability: ZERO structural coverage -> augmented == text-only baseline (graceful)", () => {
  // DISTINCT per-class text (so the baseline is genuinely separable) + NO adjacency edges: every
  // struct block is zero -> concatWeighted must fall back to text WITHOUT corrupting the signal.
  // (Identical text would make this vacuous -- both sides ~0; distinct text proves text survives.)
  const vecByEngine = new Map();
  const engineToDisp = new Map();
  for (const e of ["A1", "A2", "A3", "A4", "A5"]) { vecByEngine.set(e, [1, 0, 0]); engineToDisp.set(e, "prism_calc"); }
  for (const e of ["B1", "B2", "B3", "B4", "B5"]) { vecByEngine.set(e, [0, 1, 0]); engineToDisp.set(e, "prism_cam"); }
  const emptyAdj = new Map([...vecByEngine.keys()].map((e) => [e, new Set()]));
  const classList = ["prism_calc", "prism_cam"];
  const base = augmentedSeparability(vecByEngine, engineToDisp, emptyAdj, classList, { alpha: 0, includeDegree: false, minClass: 5 });
  const aug = augmentedSeparability(vecByEngine, engineToDisp, emptyAdj, classList, { alpha: 0.7, includeDegree: false, minClass: 5 });
  assert.equal(aug.structCoverage, 0, "no edges -> 0% struct coverage");
  assert.ok((base.summary.meanMargin ?? 0) > 0.5, "distinct per-class text is genuinely separable (real baseline)");
  assert.equal(aug.summary.meanMargin, base.summary.meanMargin, "zero struct signal -> text signal survives UNCHANGED (graceful fallback)");
});

test("augmentedSeparability: alpha=1 (struct-only) collapses when most nodes lack a struct block", () => {
  // Mirror the live finding: only 1 class has cliques; the other class has NO edges. Struct-only
  // makes the edge-less class all-zero -> undefined direction -> separability degrades vs fused.
  const { vecByEngine, engineToDisp, adjacency } = cliqueCorpus();
  // Strip class B's edges (B engines become struct-less).
  for (const e of ["B1", "B2", "B3", "B4", "B5"]) adjacency.set(e, new Set());
  const classList = ["prism_calc", "prism_cam"];
  const fused = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 0.7, includeDegree: false, minClass: 5 });
  const structOnly = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 1, includeDegree: false, minClass: 5 });
  assert.ok((fused.summary.meanMargin ?? 0) >= (structOnly.summary.meanMargin ?? 0),
    `fusion (alpha<1) must not be worse than struct-only when coverage is partial: fused ${fused.summary.meanMargin} vs structOnly ${structOnly.summary.meanMargin}`);
});

test("augmentedSeparability: unlabeled engines are skipped, invalid maps -> empty", () => {
  const vecByEngine = new Map([["X", [1, 0]], ["Y", [0, 1]]]);
  const engineToDisp = new Map([["X", "prism_calc"]]); // Y unlabeled
  const r = augmentedSeparability(vecByEngine, engineToDisp, new Map(), ["prism_calc"], { alpha: 0.5, minClass: 1 });
  assert.equal(r.labeled, 1, "only labeled engines counted");
  const empty = augmentedSeparability(new Map(), new Map(), new Map(), [], { alpha: 0.5 });
  assert.equal(empty.labeled, 0);
  assert.equal(empty.structCoverage, 0);
});
