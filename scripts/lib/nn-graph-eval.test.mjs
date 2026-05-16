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
import path from "node:path";

import {
  GATE_THRESHOLDS,
  HARNESS_DEFAULTS,
  computeAUROC,
  computeMacroF1,
  computeBrier,
  bucketize,
  gradeMetrics,
  buildHoldout,
  assessHoldout,
  runAssessment,
  renderReport,
  parseArgs,
  main,
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
