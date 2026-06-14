#!/usr/bin/env node
/**
 * nn-graph-eval.test.mjs — node:test suite for the GNN tier-5 assessment
 * harness (NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS, U7).
 *
 * The pure metric functions are pinned to hand-computed reference values
 * (AUROC via Mann-Whitney, macro-F1, Brier) — a stub returning a constant
 * would fail. The end-to-end paths use a REAL GraphSAGE model from createModel
 * (untrained but seeded → deterministic) so the holdout + scoring machinery is
 * exercised for real. Covers happy path, failure modes, adversarial inputs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

import {
  GATE_THRESHOLDS,
  HARNESS_DEFAULTS,
  computeAUROC,
  computeMacroF1,
  computeBrier,
  bucketize,
  gradeMetrics,
  detectDegeneracy,
  buildHoldout,
  assessHoldout,
  runAssessment,
  renderReport,
  parseArgs,
  main,
  SELECTIVE_THRESHOLDS,
  riskCoverageCurve,
  selectiveDeployPoint,
  gradeSelectiveDeploy,
} from "./nn-graph-eval.mjs";
import { createModel } from "./graphsage-model.mjs";

// --- fixtures --------------------------------------------------------------

function makeGhost(id, label, wiring, confidence) {
  return {
    id, label, kind: "ghost.unwired-engine", layer: "L13",
    subgroup: "unwired-engine", tier: 2, size: 2, ghost: true,
    proposed_wiring: wiring,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

function makePredictor({ inputDim = 8, seed = 9 } = {}) {
  return { model: createModel({ inputDim, hiddenDim: 12, embedDim: 8, seed }), calibrator: null, metadata: null };
}

/** Graph with `n` high-confidence reference ghosts across 3 dispatchers. */
function makeGraph(n = 12) {
  const wirings = ["prism_cam", "prism_calc", "prism_turning"];
  const nodes = [];
  for (let i = 0; i < n; i++) {
    nodes.push(makeGhost(`ghost.unwired.E${i}`, `E${i}Engine`, wirings[i % 3], 0.82 + (i % 5) * 0.02));
  }
  return { nodes, edges: [] };
}

// --- computeAUROC ----------------------------------------------------------

test("computeAUROC — Mann-Whitney reference value 0.75", () => {
  assert.equal(computeAUROC([0.9, 0.8, 0.4, 0.3], [1, 0, 1, 0]), 0.75);
});

test("computeAUROC — perfectly-ranked positives → 1.0", () => {
  assert.equal(computeAUROC([0.9, 0.8, 0.4, 0.3], [1, 1, 0, 0]), 1.0);
});

test("computeAUROC — perfectly-reversed → 0.0", () => {
  assert.equal(computeAUROC([0.9, 0.8, 0.4, 0.3], [0, 0, 1, 1]), 0.0);
});

test("computeAUROC — all-tied scores → 0.5 (average ranks)", () => {
  assert.equal(computeAUROC([5, 5, 5, 5], [1, 1, 0, 0]), 0.5);
});

test("computeAUROC — partial ties handled by average rank", () => {
  // scores 0.5,0.5 tie at top; one pos one neg → AUROC 0.5
  assert.equal(computeAUROC([0.5, 0.5], [1, 0]), 0.5);
});

test("computeAUROC — single class returns null (undefined, not a fake 0.5)", () => {
  assert.equal(computeAUROC([0.9, 0.8], [1, 1]), null);
  assert.equal(computeAUROC([0.9, 0.8], [0, 0]), null);
});

test("computeAUROC — non-0/1 labels return null", () => {
  assert.equal(computeAUROC([0.9, 0.8], [1, 2]), null);
});

test("computeAUROC — non-finite scores return null", () => {
  assert.equal(computeAUROC([0.9, NaN], [1, 0]), null);
  assert.equal(computeAUROC([Infinity, 0.2], [1, 0]), null);
});

test("computeAUROC — empty / mismatched-length / non-array return null", () => {
  assert.equal(computeAUROC([], []), null);
  assert.equal(computeAUROC([0.9], [1, 0]), null);
  assert.equal(computeAUROC("x", [1]), null);
});

// --- computeMacroF1 --------------------------------------------------------

test("computeMacroF1 — reference: predicted[a,a,b] truth[a,b,b] → 2/3", () => {
  const r = computeMacroF1(["a", "a", "b"], ["a", "b", "b"]);
  assert.ok(Math.abs(r.macroF1 - 2 / 3) < 1e-9);
  assert.ok(r.perClass instanceof Map);
  assert.ok(Math.abs(r.perClass.get("a").f1 - 2 / 3) < 1e-9);
  assert.equal(r.perClass.get("a").support, 1);
});

test("computeMacroF1 — perfect prediction → 1.0", () => {
  const r = computeMacroF1(["a", "b", "c"], ["a", "b", "c"]);
  assert.equal(r.macroF1, 1.0);
});

test("computeMacroF1 — a class only in truth (missed entirely) drags macro down", () => {
  // predicted all 'a'; truth has 'b' never predicted → class b F1 = 0
  const r = computeMacroF1(["a", "a"], ["a", "b"]);
  assert.equal(r.perClass.get("b").f1, 0);
  assert.equal(r.perClass.get("b").recall, 0);
});

test("computeMacroF1 — a class only in predicted (spurious) scores 0", () => {
  const r = computeMacroF1(["a", "x"], ["a", "a"]);
  assert.equal(r.perClass.get("x").precision, 0);
  assert.equal(r.perClass.get("x").f1, 0);
});

test("computeMacroF1 — empty / mismatched → null macroF1 + empty Map", () => {
  const r = computeMacroF1([], []);
  assert.equal(r.macroF1, null);
  assert.equal(r.perClass.size, 0);
  assert.equal(computeMacroF1(["a"], ["a", "b"]).macroF1, null);
});

// --- computeBrier ----------------------------------------------------------

test("computeBrier — perfect probabilities → 0", () => {
  assert.equal(computeBrier([1, 1, 0, 0], [1, 1, 0, 0]), 0);
});

test("computeBrier — worst probabilities → 1", () => {
  assert.equal(computeBrier([0, 0], [1, 1]), 1);
});

test("computeBrier — p=0.5 against o=1 → 0.25", () => {
  assert.equal(computeBrier([0.5], [1]), 0.25);
});

test("computeBrier — invalid input returns null", () => {
  assert.equal(computeBrier([0.5, NaN], [1, 0]), null);
  assert.equal(computeBrier([0.5], [2]), null, "non-0/1 outcome");
  assert.equal(computeBrier([], []), null);
  assert.equal(computeBrier([0.5], [1, 0]), null, "length mismatch");
});

// --- bucketize -------------------------------------------------------------

test("bucketize — 5 equal-width buckets, p=1 lands in the last", () => {
  const b = bucketize([0.05, 0.45, 1.0], [1, 0, 1], 5);
  assert.equal(b.length, 5);
  assert.equal(b[0].count, 1, "0.05 → bucket 0");
  assert.equal(b[2].count, 1, "0.45 → bucket 2");
  assert.equal(b[4].count, 1, "1.0 → last bucket, not out of range");
});

test("bucketize — per-bucket Brier + accuracy computed", () => {
  const b = bucketize([0.9, 0.9], [1, 1], 5);
  const last = b[4];
  assert.equal(last.count, 2);
  assert.equal(last.accuracy, 1);
  assert.ok(Math.abs(last.brier - 0.01) < 1e-9, "(0.9-1)^2 = 0.01");
});

test("bucketize — empty input → 5 empty buckets with null stats", () => {
  const b = bucketize([], [], 5);
  assert.equal(b.length, 5);
  assert.ok(b.every((x) => x.count === 0 && x.brier === null && x.accuracy === null));
});

test("bucketize — non-finite probabilities are skipped", () => {
  const b = bucketize([NaN, 0.5], [1, 1], 5);
  assert.equal(b.reduce((s, x) => s + x.count, 0), 1, "only the finite prob counted");
});

// --- gradeMetrics ----------------------------------------------------------

test("gradeMetrics — all gates clear → deploy-ready", () => {
  const g = gradeMetrics({ auroc: 0.8, macroF1: 0.6, brier: 0.1 });
  assert.equal(g.pass, true);
  assert.equal(g.verdict, "deploy-ready");
  assert.equal(g.failures.length, 0);
});

test("gradeMetrics — a failed gate → shipped-research-only", () => {
  const g = gradeMetrics({ auroc: 0.6, macroF1: 0.6, brier: 0.1 });
  assert.equal(g.pass, false);
  assert.equal(g.verdict, "shipped-research-only");
  assert.equal(g.failures.length, 1);
  assert.match(g.failures[0], /AUROC/);
});

test("gradeMetrics — Brier is lower-is-better (over the gate fails)", () => {
  const g = gradeMetrics({ auroc: 0.9, macroF1: 0.9, brier: 0.3 });
  assert.equal(g.pass, false);
  assert.match(g.failures[0], /Brier/);
});

test("gradeMetrics — a non-finite / missing metric is a failure, never silent-pass", () => {
  const g = gradeMetrics({ auroc: null, macroF1: NaN });
  assert.equal(g.pass, false);
  assert.equal(g.failures.length, 3, "auroc + macroF1 + missing brier all fail");
});

test("GATE_THRESHOLDS — frozen, matches the milestone exit gate", () => {
  assert.equal(GATE_THRESHOLDS.auroc, 0.78);
  assert.equal(GATE_THRESHOLDS.macroF1, 0.55);
  assert.equal(GATE_THRESHOLDS.brier, 0.15);
  assert.throws(() => { GATE_THRESHOLDS.auroc = 0; });
});

// --- buildHoldout ----------------------------------------------------------

test("buildHoldout — holds out a seeded slice, capped at half the pool", () => {
  const { holdout, poolSize } = buildHoldout(makeGraph(12), { holdout: 100, seed: 1 });
  assert.equal(poolSize, 12);
  assert.equal(holdout.length, 6, "capped at floor(12/2)");
});

test("buildHoldout — deterministic for a fixed seed, varies with seed", () => {
  const a = buildHoldout(makeGraph(12), { holdout: 4, seed: 1 }).holdout.map((h) => h.id);
  const b = buildHoldout(makeGraph(12), { holdout: 4, seed: 1 }).holdout.map((h) => h.id);
  const c = buildHoldout(makeGraph(12), { holdout: 4, seed: 2 }).holdout.map((h) => h.id);
  assert.deepEqual(a, b, "same seed → same holdout");
  assert.notDeepEqual(a, c, "different seed → different holdout");
});

test("buildHoldout — excludes low-confidence + invalid-dispatcher + non-ghost nodes", () => {
  const graph = {
    nodes: [
      makeGhost("g.ok", "OkEngine", "prism_cam", 0.9),
      makeGhost("g.ok2", "Ok2Engine", "prism_calc", 0.9),
      makeGhost("g.lo", "LoEngine", "prism_cam", 0.5),       // below refMinConf
      makeGhost("g.unk", "UnkEngine", "UNKNOWN", 0.9),       // invalid dispatcher
      { id: "eng.real", kind: "engine", label: "RealEngine" }, // not a ghost
    ],
    edges: [],
  };
  assert.equal(buildHoldout(graph, { holdout: 10, seed: 1 }).poolSize, 2);
});

test("buildHoldout — P1 regression: duplicate-label ghosts are deduped (first wins)", () => {
  const graph = {
    nodes: [
      makeGhost("g1", "DupEngine", "prism_cam", 0.9),
      makeGhost("g2", "DupEngine", "prism_calc", 0.9), // same label, distinct id
      makeGhost("g3", "UniqEngine", "prism_turning", 0.9),
    ],
    edges: [],
  };
  const { holdout, poolSize } = buildHoldout(graph, { holdout: 10, seed: 1 });
  assert.equal(poolSize, 2, "DupEngine collapsed to one pool entry");
  const labels = holdout.map((h) => h.label);
  assert.equal(new Set(labels).size, labels.length, "holdout is label-unique");
});

test("buildHoldout — empty / tiny graph → empty holdout", () => {
  assert.equal(buildHoldout({ nodes: [], edges: [] }, {}).holdout.length, 0);
  assert.equal(buildHoldout({ nodes: [makeGhost("g", "E", "prism_cam", 0.9)] }, {}).holdout.length, 0,
    "pool of 1 → cap floor(1/2)=0");
});

// --- GNN-F0 1b: stratified holdout (default) -------------------------------
// An imbalanced pool: the flat split can leave a minority class with 0 holdout
// samples, which drags macroF1 (a class never in `truth` but sometimes predicted
// scores F1=0 in the union denominator). The stratified split represents every
// >=2-sample class. Verified live: AUROC 0.737(flat)->0.808(stratified, fair).
function makeImbalanced() {
  const nodes = [];
  let i = 0;
  const add = (wiring, count) => { for (let j = 0; j < count; j++) nodes.push(makeGhost(`g${i}`, `E${i++}Engine`, wiring, 0.85)); };
  add("prism_cam", 3);
  add("prism_calc", 3);
  add("prism_turning", 10);
  return { nodes, edges: [] };
}

test("buildHoldout — stratified (default): every >=2-sample class is held out AND keeps a reference", () => {
  const r = buildHoldout(makeImbalanced(), { holdout: 100, seed: 1 });
  assert.equal(r.stratified, true, "default is stratified");
  assert.equal(r.heldClasses, 3, "all three >=2-sample classes are represented");
  const holdoutClasses = new Set(r.holdout.map((h) => h.proposed_wiring));
  assert.deepEqual([...holdoutClasses].sort(), ["prism_calc", "prism_cam", "prism_turning"], "holdout spans every class");
  // each held class leaves >=1 reference: holdout count per class < pool count per class
  assert.ok(r.holdout.filter((h) => h.proposed_wiring === "prism_cam").length <= 2, "cam keeps >=1 reference (3 pool, <=1 held... floor(3/2)=1)");
  assert.equal(r.holdout.filter((h) => h.proposed_wiring === "prism_turning").length, 5, "turning: floor(10/2)=5 held");
});

test("buildHoldout — stratified: a 1-sample class stays reference-only (never in holdout)", () => {
  const graph = { nodes: [
    makeGhost("s", "SafetyOnly", "prism_safety", 0.9),
    ...Array.from({ length: 4 }, (_, j) => makeGhost(`t${j}`, `T${j}`, "prism_turning", 0.9)),
  ], edges: [] };
  const r = buildHoldout(graph, { holdout: 100, seed: 3 });
  assert.equal(r.singletonClasses, 1, "the 1-sample class is counted as singleton");
  assert.equal(r.heldClasses, 1, "only prism_turning (>=2) is held");
  assert.ok(!r.holdout.some((h) => h.proposed_wiring === "prism_safety"), "the singleton class is never held out (no reference left otherwise)");
});

test("buildHoldout — stratify:false reproduces the legacy flat split (flagged stratified:false)", () => {
  const r = buildHoldout(makeImbalanced(), { holdout: 100, seed: 1, stratify: false });
  assert.equal(r.stratified, false, "flat split is flagged");
  assert.equal(r.holdout.length, Math.floor(16 / 2), "flat caps at floor(pool/2)");
});

test("buildHoldout — stratified is deterministic for a fixed seed", () => {
  const a = buildHoldout(makeImbalanced(), { seed: 7 }).holdout.map((h) => h.id);
  const b = buildHoldout(makeImbalanced(), { seed: 7 }).holdout.map((h) => h.id);
  assert.deepEqual(a, b, "same seed → same stratified holdout");
});

// --- assessHoldout (end-to-end with a real model) --------------------------

test("assessHoldout — produces well-formed metrics over a real holdout", () => {
  const r = assessHoldout(makeGraph(16), makePredictor(), { holdout: 6, seed: 3 });
  assert.equal(r.skipped, false);
  assert.equal(r.n, 6);
  assert.equal(r.samples.length, 6);
  const m = r.metrics;
  assert.ok(m.auroc === null || (m.auroc >= 0 && m.auroc <= 1), "auroc in range or null");
  assert.ok(m.macroF1 === null || (m.macroF1 >= 0 && m.macroF1 <= 1));
  assert.ok(m.brier >= 0 && m.brier <= 1, "brier in range");
  assert.ok(m.accuracy >= 0 && m.accuracy <= 1);
  assert.equal(r.buckets.length, HARNESS_DEFAULTS.buckets);
});

test("assessHoldout — every sample carries predicted/truth/confidence/correct", () => {
  const r = assessHoldout(makeGraph(16), makePredictor(), { holdout: 5, seed: 3 });
  for (const s of r.samples) {
    assert.equal(typeof s.engine, "string");
    assert.equal(typeof s.predicted, "string");
    assert.equal(typeof s.truth, "string");
    assert.equal(typeof s.correct, "boolean");
    assert.ok(s.confidence >= 0 && s.confidence <= 1);
  }
});

test("assessHoldout — deterministic for a fixed graph + predictor + seed", () => {
  const a = assessHoldout(makeGraph(16), makePredictor({ seed: 5 }), { holdout: 6, seed: 7 });
  const b = assessHoldout(makeGraph(16), makePredictor({ seed: 5 }), { holdout: 6, seed: 7 });
  assert.deepEqual(a.metrics, b.metrics);
  assert.deepEqual(a.samples, b.samples);
});

test("assessHoldout — skips with a clear reason when the pool is too small", () => {
  const r = assessHoldout({ nodes: [makeGhost("g", "E", "prism_cam", 0.9)], edges: [] }, makePredictor(), {});
  assert.equal(r.skipped, true);
  assert.match(r.reason, /reference-pool|holdout/);
});

// --- runAssessment ---------------------------------------------------------

test("runAssessment — deferred (never throws) when no checkpoint exists", () => {
  const r = runAssessment({
    graph: makeGraph(16),
    checkpoint: path.join(os.tmpdir(), "nn-graph-no-such-checkpoint.json"),
  });
  assert.equal(r.deferred, true);
  assert.equal(r.reason, "no-checkpoint");
  assert.ok(typeof r.note === "string" && r.note.length > 0, "carries an explanatory note");
});

test("runAssessment — deferred on a graph-load failure", () => {
  const r = runAssessment({ graphPath: path.join(os.tmpdir(), "nn-graph-no-graph.json"), predictor: makePredictor() });
  assert.equal(r.deferred, true);
  assert.match(r.reason, /^graph-load-failed:/);
});

test("runAssessment — ERR_STRING_TOO_LONG retry via streaming reader (U-NN-PREDICTOR-EMBED-WIRE follow-up 2026-05-24)", () => {
  // Synthesize a tiny graph on disk + inject a readFileImpl that throws the
  // V8 max-string-length error first. runAssessment must catch it and retry
  // via readGraphStreaming so the eval is no longer deferred — restoring the
  // promotion path that was blocked on this exact crash for 14h+.
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-streaming-"));
  const graphPath = path.join(tmpdir, "graph.json");
  fs.writeFileSync(graphPath, JSON.stringify(makeGraph(8)), "utf8");

  const stringTooLongErr = Object.assign(new Error("Cannot create a string longer than 0x1fffffe8 characters"), {
    code: "ERR_STRING_TOO_LONG",
  });
  let textReads = 0;
  const r = runAssessment({
    graphPath, predictor: makePredictor(),
    readFileImpl: (_p, _enc) => { textReads++; throw stringTooLongErr; },
    // Note: predictor.metadata=null in this test seam — we're proving the
    // graph-load streaming retry; predictor.metadata.embeddingSource forwarding
    // has its own assertion in scripts/seed-ghost-gnn-classify.test.mjs.
    now: "2026-01-01T00:00:00Z",
    holdout: 3,
    seed: 3,
  });
  assert.equal(textReads, 1, "text-mode reader is tried first then aborted");
  assert.equal(r.deferred, false, "streaming-retry path must un-defer the eval");
  assert.equal(r.assessedAt, "2026-01-01T00:00:00Z");
  fs.rmSync(tmpdir, { recursive: true, force: true });
});

// --- detectDegeneracy (U-NN-EVAL-DEGENERATE-GUARD) -------------------------

test("detectDegeneracy — constant confidence + single class → degenerate constant-vote", () => {
  // The live 8-dim/768d failure mode: every target → prism_turning @ 0.4.
  const d = detectDegeneracy([0.4, 0.4, 0.4, 0.4], ["prism_turning", "prism_turning", "prism_turning", "prism_turning"]);
  assert.equal(d.isDegenerate, true);
  assert.equal(d.mode, "constant-vote");
  assert.equal(d.distinctConfidences, 1);
  assert.equal(d.distinctPredictions, 1);
  assert.equal(d.dominantClass, "prism_turning");
  assert.equal(d.dominantShare, 1);
});

test("detectDegeneracy — constant confidence but varied classes → still degenerate (AUROC voided)", () => {
  const d = detectDegeneracy([0.5, 0.5, 0.5], ["prism_cam", "prism_calc", "prism_turning"]);
  assert.equal(d.isDegenerate, true, "constant confidence alone voids the ranking");
  assert.equal(d.mode, "constant-confidence");
});

test("detectDegeneracy — single class but VARIED confidence → not degenerate (still ranks)", () => {
  const d = detectDegeneracy([0.3, 0.6, 0.9], ["prism_cam", "prism_cam", "prism_cam"]);
  assert.equal(d.isDegenerate, false, "varied confidence preserves the AUROC ranking signal");
  assert.equal(d.mode, "single-class");
  assert.equal(d.dominantClass, "prism_cam");
  assert.equal(d.dominantShare, 1);
});

test("detectDegeneracy — genuinely discriminating output → not degenerate", () => {
  const d = detectDegeneracy([0.2, 0.55, 0.8, 0.95], ["prism_cam", "prism_calc", "prism_turning", "prism_cam"]);
  assert.equal(d.isDegenerate, false);
  assert.equal(d.mode, "none");
});

test("detectDegeneracy — < 2 samples → insufficient-holdout, never degenerate", () => {
  assert.equal(detectDegeneracy([], []).mode, "insufficient-holdout");
  assert.equal(detectDegeneracy([0.4], ["prism_turning"]).isDegenerate, false);
  assert.equal(detectDegeneracy([0.4], ["prism_turning"]).mode, "insufficient-holdout");
});

test("detectDegeneracy — null/garbage input → safe (no throw, not degenerate)", () => {
  for (const bad of [null, undefined, 42, "x"]) {
    const d = detectDegeneracy(bad, bad);
    assert.equal(d.isDegenerate, false);
    assert.equal(d.mode, "insufficient-holdout");
  }
});

test("assessHoldout / runAssessment — carries a degeneracy descriptor on a real graded run", () => {
  const r = runAssessment({ graph: makeGraph(16), predictor: makePredictor(), holdout: 6, seed: 3, now: "2026-01-01T00:00:00Z" });
  assert.equal(r.deferred, false);
  assert.ok(r.degeneracy && typeof r.degeneracy === "object", "graded result carries a degeneracy field");
  assert.equal(typeof r.degeneracy.isDegenerate, "boolean");
  assert.equal(typeof r.degeneracy.mode, "string");
});

test("renderReport — degenerate result surfaces the DEGENERATE warning + 'not a small margin'", () => {
  const degenerate = {
    deferred: false, assessedAt: "2026-01-01T00:00:00Z", holdoutN: 62,
    gates: GATE_THRESHOLDS,
    metrics: { auroc: 0.5, macroF1: 0.1333, brier: 0.26, accuracy: 0.5 },
    degeneracy: { isDegenerate: true, mode: "constant-vote", distinctConfidences: 1,
      distinctPredictions: 1, dominantClass: "prism_turning", dominantShare: 1,
      detail: "every target scored at one confidence (0.4) and all predicted `prism_turning` — AUROC carries no ranking signal (artifact of the tie, not a near-miss)" },
    buckets: [], grade: gradeMetrics({ auroc: 0.5, macroF1: 0.1333, brier: 0.26 }), samples: [],
  };
  const out = renderReport(degenerate);
  assert.ok(out.includes("DEGENERATE CLASSIFIER"), "warning header present");
  assert.ok(out.includes("constant-vote"));
  assert.ok(out.includes("not a small margin") || out.includes("not by a small margin"));
  assert.ok(out.includes("prism_turning"), "dominant class named");
});

test("renderReport — non-degenerate graded result has NO degenerate warning", () => {
  const ok = {
    deferred: false, assessedAt: "2026-01-01T00:00:00Z", holdoutN: 40,
    gates: GATE_THRESHOLDS,
    metrics: { auroc: 0.81, macroF1: 0.6, brier: 0.12, accuracy: 0.78 },
    degeneracy: { isDegenerate: false, mode: "none", distinctConfidences: 12,
      distinctPredictions: 4, dominantClass: "prism_cam", dominantShare: 0.4, detail: "discriminating" },
    buckets: [], grade: gradeMetrics({ auroc: 0.81, macroF1: 0.6, brier: 0.12 }), samples: [],
  };
  assert.ok(!renderReport(ok).includes("DEGENERATE CLASSIFIER"), "no false-positive degenerate warning");
});

test("runAssessment — full run with an injected predictor produces a graded result", () => {
  const r = runAssessment({ graph: makeGraph(16), predictor: makePredictor(), holdout: 6, seed: 3, now: "2026-01-01T00:00:00Z" });
  assert.equal(r.deferred, false);
  assert.equal(r.assessedAt, "2026-01-01T00:00:00Z", "now is injectable for determinism");
  assert.equal(r.holdoutN, 6);
  assert.ok(r.grade && typeof r.grade.verdict === "string");
  assert.ok(["deploy-ready", "shipped-research-only"].includes(r.grade.verdict));
  assert.equal(r.gates.auroc, GATE_THRESHOLDS.auroc);
});

test("runAssessment — deferred when the holdout is empty", () => {
  const r = runAssessment({ graph: { nodes: [], edges: [] }, predictor: makePredictor() });
  assert.equal(r.deferred, true);
  assert.match(r.reason, /holdout|reference-pool/);
});

// --- renderReport ----------------------------------------------------------

test("renderReport — deferred result renders a DEFERRED status + the harness note", () => {
  const md = renderReport({ deferred: true, reason: "no-checkpoint", note: "harness ready." });
  assert.match(md, /Status: DEFERRED/);
  assert.match(md, /no-checkpoint/);
  assert.match(md, /harness is built and unit-tested/);
});

test("renderReport — deferred WITH a present checkpoint does NOT claim no checkpoint exists", () => {
  // Regression guard: before the honesty fix, every deferred reason printed
  // "Re-run it once a trained checkpoint exists" — actively false once U4
  // produced a checkpoint that loaded but the graph had no reference pool.
  const md = renderReport({
    deferred: true,
    reason: "insufficient-reference-pool",
    checkpointPresent: true,
    poolSize: 0,
    checkpointMeta: { auroc: 0.0961, brierRaw: 0.3253, brierCalibrated: 0.2495,
      epochs: 30, finalLoss: 0.7373, calibratorReliable: true, calibratorN: 2624 },
  });
  assert.match(md, /Status: DEFERRED/);
  assert.match(md, /insufficient-reference-pool/);
  assert.match(md, /checkpoint \*\*is present and loaded cleanly\*\*/,
    "must state the checkpoint is present");
  assert.match(md, /U4 training-pipeline blocker is resolved/);
  assert.match(md, /Reference pool in the current system-viz graph: \*\*0\*\*/,
    "must report the actual reference-pool size that blocks the holdout");
  assert.match(md, /AUROC 0\.0961/, "link-prediction diagnostic is surfaced");
  assert.match(md, /nn-graph-eval\.mjs --checkpoint/, "exact unblock command is given");
  assert.doesNotMatch(md, /Re-run it once a\s+trained checkpoint exists/,
    "must NOT print the no-checkpoint prose when a checkpoint is present");
});

test("renderReport — present checkpoint WITHOUT metadata softens the claim (no U4-resolved overclaim)", () => {
  // The strong "trained / U4 blocker resolved" claim must be backed by the
  // checkpoint's embedded training metadata. checkpointPresent alone only
  // proves a predictor loaded — an untrained/zero-weight model loads the same.
  const md = renderReport({
    deferred: true, reason: "empty-holdout", checkpointPresent: true, poolSize: 3,
  });
  assert.match(md, /loaded cleanly/);
  assert.match(md, /training provenance is \*\*unverified\*\*/,
    "no-metadata path must explicitly flag training provenance as unverified");
  assert.doesNotMatch(md, /U4 training-pipeline blocker is resolved/,
    "must NOT assert U4 resolved without empirical training metadata");
  assert.doesNotMatch(md, /\*\*is present and loaded cleanly\*\* — the/,
    "the metadata-backed strong phrasing is reserved for the cm-present path");
  assert.match(md, /Reference pool in the current system-viz graph: \*\*3\*\*/);
  assert.doesNotMatch(md, /Re-run it once a\s+trained checkpoint exists/);
});

test("renderReport — graded result renders the gate table + verdict + honesty caveat", () => {
  const result = {
    deferred: false, assessedAt: "2026-01-01T00:00:00Z", holdoutN: 10,
    gates: GATE_THRESHOLDS,
    metrics: { auroc: 0.81, macroF1: 0.6, brier: 0.12, accuracy: 0.7 },
    buckets: bucketize([0.8, 0.9], [1, 1], 5),
    grade: gradeMetrics({ auroc: 0.81, macroF1: 0.6, brier: 0.12 }),
  };
  const md = renderReport(result);
  assert.match(md, /AUROC \| 0\.81 \| >= 0\.78 \| PASS/);
  assert.match(md, /Verdict: DEPLOY-READY/);
  assert.match(md, /NOT verified ground truth/, "honesty caveat is present");
  assert.match(md, /Per-bucket calibration/);
});

test("renderReport — a failing graded result shows FAIL + the failure list", () => {
  const result = {
    deferred: false, assessedAt: "t", holdoutN: 10, gates: GATE_THRESHOLDS,
    metrics: { auroc: 0.5, macroF1: 0.3, brier: 0.4, accuracy: 0.4 },
    buckets: [],
    grade: gradeMetrics({ auroc: 0.5, macroF1: 0.3, brier: 0.4 }),
  };
  const md = renderReport(result);
  assert.match(md, /Verdict: SHIPPED-RESEARCH-ONLY/);
  assert.match(md, /Gate failures:/);
});

// --- selective prediction (risk-coverage) ----------------------------------

/**
 * The live NN-EVAL holdout shape, condensed to a deterministic fixture whose
 * answers are hand-verifiable. 5 samples: a clean confidence ladder where the
 * top is confidently-correct and the bottom is uncertain — the abstaining-tier
 * pattern the curve must surface.
 */
function makeSamples() {
  return [
    { engine: "A", predicted: "prism_cam", truth: "prism_cam", confidence: 0.9, correct: true },
    { engine: "B", predicted: "prism_calc", truth: "prism_calc", confidence: 0.7, correct: true },
    { engine: "C", predicted: "prism_cam", truth: "prism_cam", confidence: 0.55, correct: true },
    { engine: "D", predicted: "prism_calc", truth: "prism_cam", confidence: 0.45, correct: false },
    { engine: "E", predicted: "prism_calc", truth: "prism_turning", confidence: 0.3, correct: false },
  ];
}

test("riskCoverageCurve — coverage shrinks and Brier improves as τ rises", () => {
  const rows = riskCoverageCurve(makeSamples(), GATE_THRESHOLDS, [0.4, 0.6, 0.8]);
  assert.equal(rows.length, 3);
  // τ=0.4 keeps A,B,C,D (4/5); τ=0.6 keeps A,B (2/5); τ=0.8 keeps A (1/5).
  assert.equal(rows[0].emitted, 4);
  assert.equal(rows[0].coverage, 0.8);
  assert.equal(rows[1].emitted, 2);
  assert.equal(rows[2].emitted, 1);
  // Brier strictly improves as the uncertain tail is abstained.
  assert.ok(rows[0].brier > rows[1].brier, "Brier improves shedding the tail");
  assert.ok(rows[1].brier >= rows[2].brier);
});

test("riskCoverageCurve — reference Brier on the τ=0.6 emitted set", () => {
  // emitted A(0.9,1) B(0.7,1): Brier = ((0.9-1)^2 + (0.7-1)^2)/2 = (0.01+0.09)/2 = 0.05
  const rows = riskCoverageCurve(makeSamples(), GATE_THRESHOLDS, [0.6]);
  assert.equal(rows[0].brier, 0.05);
  assert.equal(rows[0].accuracy, 1); // both correct
});

test("riskCoverageCurve — gate flags reflect the harness gates", () => {
  const rows = riskCoverageCurve(makeSamples(), { auroc: 0.78, macroF1: 0.55, brier: 0.15 }, [0.6]);
  assert.equal(rows[0].brierClears, true); // 0.05 <= 0.15
  // emitted A(prism_cam),B(prism_calc) both correct → macro-F1 1.0 ≥ 0.55
  assert.equal(rows[0].macroF1Clears, true);
});

test("riskCoverageCurve — empty / no-confidence samples → []", () => {
  assert.deepEqual(riskCoverageCurve([]), []);
  assert.deepEqual(riskCoverageCurve([{ predicted: "x", truth: "x", correct: true }]), []); // no finite confidence
});

test("selectiveDeployPoint — anchors on the PRODUCTION gate (minConf 0.7), not the most-favorable τ", () => {
  // Default productionMinConf = GNN_DEFAULTS.minConf = 0.7. At τ=0.7 the emitted set is A(0.9),B(0.7):
  // Brier = (0.01+0.09)/2 = 0.05 ≤0.15; predicted [cam,calc] vs truth [cam,calc] → macro-F1 1.0 ≥0.55 → clears.
  const dp = selectiveDeployPoint(makeSamples(), GATE_THRESHOLDS);
  assert.equal(dp.found, true);
  assert.equal(dp.productionMinConf, 0.7);
  assert.equal(dp.productionPoint.tau, 0.7);
  assert.equal(dp.productionPoint.emitted, 2);
  assert.equal(dp.productionPoint.brier, 0.05);
  // every τ at/above the production gate clears → robust regime (not a lone spike)
  assert.equal(dp.robustAboveGate, true);
  // max-coverage tradeoff is surfaced separately: τ=0.4 emits A,B,C,D (Brier 0.12625, macro-F1 0.733)
  assert.ok(dp.maxCoveragePoint && dp.maxCoveragePoint.tau === 0.4);
  assert.equal(dp.maxCoveragePoint.coverage, 0.8);
  // class concentration: full holdout has 3 distinct truth classes {cam,calc,turning};
  // the τ=0.7 emitted set (A,B) spans only 2 → concentrated.
  assert.equal(dp.totalClasses, 3);
  assert.equal(dp.productionPoint.classesEmitted, 2);
});

test("selectiveDeployPoint — honors an explicit productionMinConf override", () => {
  // At τ=0.5 the emitted set A,B,C: Brier=(0.01+0.09+0.2025)/3=0.1008 ≤0.15; all correct → macro-F1 1.0.
  const dp = selectiveDeployPoint(makeSamples(), GATE_THRESHOLDS, { productionMinConf: 0.5 });
  assert.equal(dp.productionMinConf, 0.5);
  assert.equal(dp.productionPoint.tau, 0.5);
  assert.equal(dp.productionPoint.emitted, 3);
  assert.equal(dp.found, true);
});

test("selectiveDeployPoint — fails at the production gate when the emitted set is bad → found:false", () => {
  // All wrong at conf 0.9 → at τ=0.7 the emitted set is all-wrong → Brier 0.81 → does not clear.
  const allWrong = makeSamples().map((s) => ({ ...s, correct: false, confidence: 0.9 }));
  const dp = selectiveDeployPoint(allWrong, GATE_THRESHOLDS);
  assert.equal(dp.found, false);
  assert.equal(dp.robustAboveGate, false);
});

test("gradeSelectiveDeploy — passes when AUROC clears AND the production-gate set clears", () => {
  const dp = selectiveDeployPoint(makeSamples(), GATE_THRESHOLDS);
  const g = gradeSelectiveDeploy({ auroc: 0.81 }, dp);
  assert.equal(g.pass, true);
  assert.equal(g.verdict, "deploy-ready-selective");
  assert.equal(g.productionGate, 0.7);
  assert.ok(g.operatingPoint && g.operatingPoint.tau === 0.7, "operating point is the production gate");
  assert.equal(g.robustAboveGate, true);
  // class-concentration honesty: emitted set spans 2 of 3 truth classes → concentrated,
  // and the note must say so (macro-F1 is over a SUBSET, not all classes).
  assert.equal(g.operatingPoint.classesEmitted, 2);
  assert.equal(g.operatingPoint.totalClasses, 3);
  assert.equal(g.concentrated, true);
  assert.match(g.note, /spans only 2 of 3 dispatcher classes/);
});

test("gradeSelectiveDeploy — concentrated:false when the emitted set predicts every class", () => {
  // 3 high-confidence samples each correctly predicting a DISTINCT class → emitted
  // set predicts all 3 of the 3 truth classes → spans 3/3 → not concentrated.
  const full = [
    { predicted: "a", truth: "a", confidence: 0.9, correct: true },
    { predicted: "b", truth: "b", confidence: 0.85, correct: true },
    { predicted: "c", truth: "c", confidence: 0.8, correct: true },
  ];
  const dp = selectiveDeployPoint(full, { auroc: 0.78, macroF1: 0.0, brier: 1.0 }, { productionMinConf: 0.7 });
  const g = gradeSelectiveDeploy({ auroc: 0.81 }, dp);
  assert.equal(g.operatingPoint.classesEmitted, 3);
  assert.equal(g.operatingPoint.totalClasses, 3);
  assert.equal(g.concentrated, false);
  assert.doesNotMatch(g.note, /spans only/);
});

test("gradeSelectiveDeploy — fails when global AUROC is below gate (ranking unsound)", () => {
  const dp = selectiveDeployPoint(makeSamples(), GATE_THRESHOLDS);
  const g = gradeSelectiveDeploy({ auroc: 0.6 }, dp);
  assert.equal(g.pass, false);
  assert.equal(g.verdict, "no-deployable-operating-point");
  assert.ok(g.failures.some((f) => /AUROC/.test(f)));
});

test("gradeSelectiveDeploy — fails when the production-gate set does not clear", () => {
  const allWrong = makeSamples().map((s) => ({ ...s, correct: false, confidence: 0.9 }));
  const dp = selectiveDeployPoint(allWrong, GATE_THRESHOLDS);
  const g = gradeSelectiveDeploy({ auroc: 0.9 }, dp);
  assert.equal(g.pass, false);
  assert.ok(g.failures.some((f) => /production gate/.test(f)));
});

test("SELECTIVE_THRESHOLDS — ascending, in (0,1)", () => {
  assert.ok(Array.isArray(SELECTIVE_THRESHOLDS) && SELECTIVE_THRESHOLDS.length > 0);
  for (let i = 1; i < SELECTIVE_THRESHOLDS.length; i++) {
    assert.ok(SELECTIVE_THRESHOLDS[i] > SELECTIVE_THRESHOLDS[i - 1]);
  }
  assert.ok(SELECTIVE_THRESHOLDS[0] > 0 && SELECTIVE_THRESHOLDS[SELECTIVE_THRESHOLDS.length - 1] < 1);
});

test("assessHoldout + runAssessment expose the selective section", () => {
  // Real seeded model over a 12-ghost graph — exercises the wired path end-to-end.
  const graph = makeGraph(12);
  const predictor = makePredictor();
  const scored = assessHoldout(graph, predictor, { holdout: 6, seed: 3 });
  assert.ok(scored.selective, "assessHoldout returns selective");
  assert.ok(Array.isArray(scored.selective.curve));
  assert.ok(scored.selective.deployPoint && typeof scored.selective.deployPoint.found === "boolean");
  const res = runAssessment({ graph, predictor, holdout: 6, seed: 3, now: "2026-06-06T00:00:00Z" });
  assert.ok(res.selective && res.selective.deployGrade, "runAssessment includes selective.deployGrade");
  assert.ok(typeof res.selective.deployGrade.pass === "boolean");
  // The full-holdout grade is ALWAYS retained alongside the selective verdict (transparency).
  assert.ok(res.grade, "full-holdout grade retained");
});

// --- parseArgs / main ------------------------------------------------------

test("parseArgs — reads every flag", () => {
  const a = parseArgs(["--checkpoint", "c.json", "--graph", "g.json", "--out-dir", "o", "--holdout", "50", "--seed", "9", "--no-write"]);
  assert.equal(a.checkpoint, "c.json");
  assert.equal(a.graphPath, "g.json");
  assert.equal(a.outDir, "o");
  assert.equal(a.holdout, 50);
  assert.equal(a.seed, 9);
  assert.equal(a.noWrite, true);
});

test("parseArgs — --help sets help; unknown argument throws", () => {
  assert.equal(parseArgs(["--help"]).help, true);
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
});

test("main — returns 0 for --help and 2 for an unknown argument", () => {
  assert.equal(main(["--help"]), 0);
  assert.equal(main(["--nope"]), 2);
});
