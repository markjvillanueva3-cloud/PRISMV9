#!/usr/bin/env node
/**
 * Tests for nn-graph-health-inject.mjs (/goal synergy iter 18, echo).
 *
 * Run: node --test .claude/hooks/nn-graph-health-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEval, classifyGnn, formatDigest } from "./nn-graph-health-inject.mjs";

// Fixture: the live first-run state — GNN dormant, AUROC far below gate.
const EVAL_DORMANT = Object.freeze({
  deferred: true,
  reason: "insufficient-reference-pool",
  checkpointPresent: true,
  poolSize: 0,
  checkpointMeta: {
    trainedAt: "2026-05-16T21:34:13.774Z",
    auroc: 0.09607579891061868,
    brierRaw: 0.3252856030347025,
    brierCalibrated: 0.24947944373141195,
    nodeCount: 20460,
    epochs: 30,
  },
});

// Fixture: GNN live + past both promotion gates → healthy.
const EVAL_HEALTHY = Object.freeze({
  deferred: false,
  reason: "",
  checkpointPresent: true,
  poolSize: 1200,
  checkpointMeta: {
    trainedAt: "2026-05-21T00:00:00.000Z",
    auroc: 0.82,
    brierCalibrated: 0.12,
  },
});

// Fixture: GNN live but below the AUROC gate → not healthy, not dormant.
const EVAL_BELOW_GATE = Object.freeze({
  deferred: false,
  checkpointPresent: true,
  poolSize: 800,
  checkpointMeta: { auroc: 0.61, brierCalibrated: 0.18 },
});

// Fixture: the GRADED report shape (runAssessment's scored path, U-NN-REFPOOL-
// REEVAL). NO checkpointMeta / checkpointPresent — `metrics.auroc/brier` carry
// the REAL deploy-gate holdout numbers and `grade.verdict` the pass/fail. This
// is the shape the perma-deferred eval finally produced once the live graph
// yielded a non-empty reference pool; the prior classifyGnn was blind to it and
// mis-reported it as "dormant / AUROC n/a".
const EVAL_GRADED_BELOW = Object.freeze({
  deferred: false,
  assessedAt: "2026-06-03T03:23:36.331Z",
  holdoutN: 62,
  gates: { auroc: 0.78, macroF1: 0.55, brier: 0.15 },
  metrics: { auroc: 0.5, macroF1: 0.1333, brier: 0.26, accuracy: 0.5 },
  grade: { pass: false, verdict: "shipped-research-only", failures: ["AUROC 0.5000 < 0.78"] },
});

// Fixture: a GRADED report that clears both deploy gates → healthy via metrics.
const EVAL_GRADED_HEALTHY = Object.freeze({
  deferred: false,
  holdoutN: 140,
  gates: { auroc: 0.78, macroF1: 0.55, brier: 0.15 },
  metrics: { auroc: 0.86, macroF1: 0.61, brier: 0.11, accuracy: 0.84 },
  grade: { pass: true, verdict: "deploy-ready", failures: [] },
});

// Fixture: the live failure mode — a GRADED below-gate report the eval marked
// DEGENERATE (constant-vote collapse). U-NN-DEGENERACY-HOOK-SURFACE.
const EVAL_GRADED_DEGENERATE = Object.freeze({
  deferred: false,
  holdoutN: 62,
  gates: { auroc: 0.78, macroF1: 0.55, brier: 0.15 },
  metrics: { auroc: 0.5, macroF1: 0.1333, brier: 0.26, accuracy: 0.5 },
  degeneracy: { isDegenerate: true, mode: "constant-vote", distinctConfidences: 1,
    distinctPredictions: 1, dominantClass: "prism_turning", dominantShare: 1, detail: "..." },
  grade: { pass: false, verdict: "shipped-research-only", failures: ["AUROC 0.5000 < 0.78"] },
});

// Fixture: GRADED below FULL gate (Brier fails) but DEPLOY-READY-SELECTIVE at the
// production confidence gate — the live state after U-GNN-SELECTIVE-DEPLOY.
const EVAL_GRADED_SELECTIVE = Object.freeze({
  deferred: false,
  holdoutN: 62,
  gates: { auroc: 0.78, macroF1: 0.55, brier: 0.15 },
  metrics: { auroc: 0.8084, macroF1: 0.4389, brier: 0.179, accuracy: 0.6613 },
  grade: { pass: false, verdict: "shipped-research-only", failures: ["macro-F1 0.4389 < 0.55", "Brier 0.1790 > 0.15"] },
  selective: {
    deployGrade: {
      pass: true, verdict: "deploy-ready-selective", productionGate: 0.7, robustAboveGate: true, globalAuroc: 0.8084, concentrated: true,
      operatingPoint: { tau: 0.7, coverage: 0.3226, emitted: 20, brier: 0.0406, macroF1: 1, accuracy: 1, classesEmitted: 2, totalClasses: 6 },
    },
  },
});

// ─────────────── classifyGnn / formatDigest: selective deploy ───────────────

test("classifyGnn: GRADED-selective report → selectiveDeployReady + operating point (U-GNN-SELECTIVE-DEPLOY)", () => {
  const g = classifyGnn(EVAL_GRADED_SELECTIVE);
  assert.equal(g.healthy, false, "full-coverage gate still fails (Brier)");
  assert.equal(g.dormant, false, "graded → not dormant");
  assert.equal(g.selectiveDeployReady, true);
  assert.equal(g.selectiveOperatingPoint.tau, 0.7);
  assert.equal(g.selectiveOperatingPoint.coverage, 0.3226);
  assert.equal(g.selectiveOperatingPoint.brier, 0.0406);
  // class concentration carried through (the emitted set spans 2 of 6 classes)
  assert.equal(g.selectiveOperatingPoint.classesEmitted, 2);
  assert.equal(g.selectiveOperatingPoint.totalClasses, 6);
  assert.equal(g.selectiveOperatingPoint.concentrated, true);
});

test("classifyGnn: graded-below WITHOUT selective → selectiveDeployReady false, op null (back-compat)", () => {
  const g = classifyGnn(EVAL_GRADED_BELOW);
  assert.equal(g.selectiveDeployReady, false);
  assert.equal(g.selectiveOperatingPoint, null);
});

test("classifyGnn: selective.deployGrade.pass=false → not deploy-ready", () => {
  const doc = { ...EVAL_GRADED_SELECTIVE, selective: { deployGrade: { pass: false, operatingPoint: null } } };
  const g = classifyGnn(doc);
  assert.equal(g.selectiveDeployReady, false);
  assert.equal(g.selectiveOperatingPoint, null);
});

test("formatDigest: GRADED-selective → DEPLOY-READY-SELECTIVE line (not the false 'not contributing')", () => {
  const md = formatDigest(EVAL_GRADED_SELECTIVE, 1000, { staleHrs: 9999 });
  assert.ok(md);
  assert.match(md, /DEPLOY-READY-SELECTIVE/);
  assert.match(md, /τ=0\.7/);
  assert.match(md, /32% of ghosts/);
  assert.match(md, /Spans 2\/6 classes \(concentrated\)/);
  assert.doesNotMatch(md, /not yet contributing to wiring inference/);
});

// ───────────────────────── loadEval ─────────────────────────

test("loadEval: valid JSON → { evalReport, ageMs }", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nng-"));
  const f = path.join(dir, "NN-EVAL.json");
  writeFileSync(f, JSON.stringify(EVAL_DORMANT));
  const r = loadEval(f, Date.now() + 1000);
  assert.ok(r);
  assert.equal(r.evalReport.deferred, true);
  assert.ok(r.ageMs >= 0);
  rmSync(dir, { recursive: true, force: true });
});

test("loadEval: missing / corrupt / zero-byte → null", () => {
  assert.equal(loadEval("/no/such/file.json"), null);
  const dir = mkdtempSync(path.join(tmpdir(), "nng-bad-"));
  const c = path.join(dir, "c.json");
  writeFileSync(c, "{not json");
  assert.equal(loadEval(c), null);
  const z = path.join(dir, "z.json");
  writeFileSync(z, "");
  assert.equal(loadEval(z), null);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── classifyGnn ─────────────────────────

test("classifyGnn: dormant fixture → dormant=true, healthy=false", () => {
  const g = classifyGnn(EVAL_DORMANT);
  assert.equal(g.dormant, true);
  assert.equal(g.healthy, false);
  assert.equal(g.poolSize, 0);
  assert.equal(g.reason, "insufficient-reference-pool");
  assert.ok(Math.abs(g.auroc - 0.0960758) < 1e-4);
});

test("classifyGnn: healthy fixture → healthy=true, dormant=false", () => {
  const g = classifyGnn(EVAL_HEALTHY);
  assert.equal(g.dormant, false);
  assert.equal(g.healthy, true);
  assert.equal(g.auroc, 0.82);
  assert.equal(g.brier, 0.12);
});

test("classifyGnn: live but below AUROC gate → not healthy, not dormant", () => {
  const g = classifyGnn(EVAL_BELOW_GATE);
  assert.equal(g.dormant, false);
  assert.equal(g.healthy, false, "0.61 AUROC < 0.78 gate");
});

test("classifyGnn: GRADED below-gate report → reads metrics, NOT dormant", () => {
  // The regression this fix exists for: a graded report (deferred:false, no
  // checkpointMeta) must classify from `metrics.auroc/brier`, not collapse to
  // dormant/null. Pre-fix this returned {dormant:true, auroc:null}.
  const g = classifyGnn(EVAL_GRADED_BELOW);
  assert.equal(g.graded, true, "metrics present + not deferred → graded");
  assert.equal(g.dormant, false, "a scored holdout has a checkpoint — never dormant");
  assert.equal(g.healthy, false, "0.5 AUROC < 0.78 gate");
  assert.equal(g.auroc, 0.5, "deploy-gate holdout AUROC, not null");
  assert.equal(g.brier, 0.26, "deploy-gate holdout Brier");
  assert.equal(g.verdict, "shipped-research-only");
});

test("classifyGnn: GRADED report clearing both gates → healthy via metrics", () => {
  const g = classifyGnn(EVAL_GRADED_HEALTHY);
  assert.equal(g.graded, true);
  assert.equal(g.dormant, false);
  assert.equal(g.healthy, true, "0.86 AUROC ≥ 0.78 AND 0.11 Brier ≤ 0.15");
  assert.equal(g.auroc, 0.86);
  assert.equal(g.brier, 0.11);
});

test("classifyGnn: GRADED degenerate report → degenerate=true + mode (U-NN-DEGENERACY-HOOK-SURFACE)", () => {
  const g = classifyGnn(EVAL_GRADED_DEGENERATE);
  assert.equal(g.degenerate, true);
  assert.equal(g.degenerateMode, "constant-vote");
  assert.equal(g.dormant, false, "graded report is live, not dormant");
  assert.equal(g.auroc, 0.5);
});

test("classifyGnn: report without a degeneracy field → degenerate=false (additive, back-compat)", () => {
  assert.equal(classifyGnn(EVAL_GRADED_BELOW).degenerate, false);
  assert.equal(classifyGnn(EVAL_DORMANT).degenerate, false);
  assert.equal(classifyGnn(EVAL_GRADED_BELOW).degenerateMode, "");
});

test("formatDigest: GRADED degenerate → DEGENERATE line (not the generic below-gate line)", () => {
  const out = formatDigest(EVAL_GRADED_DEGENERATE, 0);
  assert.ok(out, "degenerate state always surfaces");
  assert.ok(out.includes("DEGENERATE"), "names the degeneracy");
  assert.ok(out.includes("constant-vote"));
  assert.ok(out.includes("tie-break artifact") || out.includes("not a near-miss"));
  assert.ok(!out.includes("below promotion gate"), "degenerate replaces the generic below-gate line");
  assert.ok(out.includes("0.500"), "real AUROC still rendered");
});

test("formatDigest: degenerate mode is rendered verbatim (constant-confidence, not hardcoded constant-vote)", () => {
  const cc = { ...EVAL_GRADED_DEGENERATE,
    degeneracy: { isDegenerate: true, mode: "constant-confidence", distinctConfidences: 1,
      distinctPredictions: 4, dominantClass: "prism_cam", dominantShare: 0.3, detail: "..." } };
  const out = formatDigest(cc, 0);
  assert.ok(out.includes("constant-confidence"), "renders the real mode, not a hardcoded one");
  assert.ok(!out.includes("DEGENERATE ()"), "never empty parens");
});

test("classifyGnn: metrics-first precedence — graded metrics win over stale checkpointMeta", () => {
  // A report carrying BOTH a graded metrics block and a legacy checkpointMeta
  // pretext AUROC must prefer the deploy-gate metric (R7: don't blend signals).
  const g = classifyGnn({
    deferred: false,
    metrics: { auroc: 0.83, brier: 0.10 },
    checkpointMeta: { auroc: 0.096, brierRaw: 0.33 },
  });
  assert.equal(g.auroc, 0.83, "metrics.auroc (deploy gate) preferred over pretext 0.096");
  assert.equal(g.brier, 0.10, "metrics.brier preferred over meta brier");
  assert.equal(g.graded, true);
});

test("classifyGnn: deferred report with a metrics block stays dormant (deferred wins)", () => {
  // Defensive: deferred:true must never be flipped live by a stray metrics field.
  const g = classifyGnn({ deferred: true, reason: "insufficient-reference-pool", metrics: { auroc: 0.9 } });
  assert.equal(g.dormant, true);
  assert.equal(g.graded, false, "deferred is authoritative — not graded");
});

test("classifyGnn: live, AUROC ok but Brier over gate → not healthy", () => {
  const g = classifyGnn({ deferred: false, checkpointPresent: true, poolSize: 5, checkpointMeta: { auroc: 0.80, brierCalibrated: 0.30 } });
  assert.equal(g.healthy, false, "Brier 0.30 > 0.15 gate");
});

test("classifyGnn: no checkpoint → dormant (cannot vote)", () => {
  const g = classifyGnn({ deferred: false, checkpointPresent: false, poolSize: 0 });
  assert.equal(g.dormant, true);
  assert.equal(g.healthy, false);
});

test("classifyGnn: missing auroc → healthy=false (fail-closed, cannot certify)", () => {
  const g = classifyGnn({ deferred: false, checkpointPresent: true, poolSize: 10, checkpointMeta: {} });
  assert.equal(g.auroc, null);
  assert.equal(g.healthy, false, "unmeasurable tier is not certified healthy");
});

test("classifyGnn: brierCalibrated preferred, brierRaw fallback", () => {
  const withCal = classifyGnn({ checkpointPresent: true, checkpointMeta: { auroc: 0.5, brierCalibrated: 0.2, brierRaw: 0.9 } });
  assert.equal(withCal.brier, 0.2, "calibrated preferred");
  const rawOnly = classifyGnn({ checkpointPresent: true, checkpointMeta: { auroc: 0.5, brierRaw: 0.33 } });
  assert.equal(rawOnly.brier, 0.33, "raw fallback when calibrated absent");
});

test("classifyGnn: null/garbage input → safe defaults (no throw)", () => {
  for (const bad of [null, undefined, 42, "x", {}]) {
    const g = classifyGnn(bad);
    assert.equal(g.dormant, true, "no checkpoint → dormant");
    assert.equal(g.healthy, false);
    assert.equal(g.poolSize, 0);
  }
});

// ───────────────────────── formatDigest ─────────────────────────

test("formatDigest: dormant → DORMANT digest with reason + poolSize + gates", () => {
  const out = formatDigest(EVAL_DORMANT, 0);
  assert.ok(out);
  assert.ok(out.includes("NN-GRAPH"));
  assert.ok(out.includes("DORMANT"));
  assert.ok(out.includes("insufficient-reference-pool"));
  assert.ok(out.includes("poolSize 0"));
  assert.ok(out.includes("0.096"), "AUROC rendered");
  assert.ok(out.includes("0.78"), "promotion gate rendered");
});

test("formatDigest: healthy + showOk=false → null (silent)", () => {
  assert.equal(formatDigest(EVAL_HEALTHY, 0), null);
});

test("formatDigest: healthy + showOk=true → ✓ LIVE line", () => {
  const out = formatDigest(EVAL_HEALTHY, 0, { showOk: true });
  assert.ok(out);
  assert.ok(out.includes("✓"));
  assert.ok(out.includes("LIVE"));
  assert.ok(out.includes("0.820"));
});

test("formatDigest: live below gate → 'below promotion gate' digest (not silent)", () => {
  const out = formatDigest(EVAL_BELOW_GATE, 0);
  assert.ok(out, "below-gate state always surfaces");
  assert.ok(out.includes("below promotion gate"));
  assert.ok(!out.includes("DORMANT"), "not dormant — it has a checkpoint");
});

test("formatDigest: GRADED below-gate → honest 'below promotion gate' with real AUROC (not n/a, not DORMANT)", () => {
  const out = formatDigest(EVAL_GRADED_BELOW, 0);
  assert.ok(out, "graded below-gate always surfaces");
  assert.ok(out.includes("below promotion gate"));
  assert.ok(!out.includes("DORMANT"), "graded report is live, not dormant");
  assert.ok(out.includes("0.500"), "real deploy-gate AUROC rendered");
  assert.ok(out.includes("0.260"), "real deploy-gate Brier rendered");
  assert.ok(!out.includes("AUROC **n/a**"), "must NOT mis-render a measured grade as n/a");
});

test("formatDigest: GRADED deploy-ready + showOk=false → null (silent — tier contributing)", () => {
  assert.equal(formatDigest(EVAL_GRADED_HEALTHY, 0), null, "healthy graded tier is silent");
});

test("formatDigest: stale report → null", () => {
  const ageMs = 31 * 24 * 3600_000;
  assert.equal(formatDigest(EVAL_DORMANT, ageMs, { staleHrs: 720 }), null);
});

test("formatDigest: null/garbage → null", () => {
  assert.equal(formatDigest(null, 0), null);
  assert.equal(formatDigest(42, 0), null);
});

test("formatDigest: age label fresh / Nh old / Nd old", () => {
  assert.ok(formatDigest(EVAL_DORMANT, 20 * 60_000).includes("fresh"));
  assert.ok(formatDigest(EVAL_DORMANT, 5 * 3600_000).includes("5h old"));
  assert.ok(formatDigest(EVAL_DORMANT, 5 * 24 * 3600_000).includes("5d old"));
});

test("formatDigest: deterministic — same input twice → identical", () => {
  assert.equal(formatDigest(EVAL_DORMANT, 1000), formatDigest(EVAL_DORMANT, 1000));
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live NN-EVAL.json parses + classifies", () => {
  const live = "H:/prism/state/shared/nn-graph/NN-EVAL.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live NN-EVAL.json missing");
    return;
  }
  const r = loadEval(live);
  assert.ok(r, "live eval parses");
  const g = classifyGnn(r.evalReport);
  // The live first-run state has the GNN dormant (AUROC 0.096). Tolerate
  // either path though — a future retrain may flip it.
  assert.equal(typeof g.dormant, "boolean");
  assert.equal(typeof g.healthy, "boolean");
  const out = formatDigest(r.evalReport, 0, { showOk: true });
  if (out !== null) assert.ok(out.includes("NN-GRAPH"));
});
