/**
 * Tests for cam-retrain-order-run.mjs pure core (planRetrain + buildRetrainArtifact). The IO main()
 * (corpus read + persist) is exercised live; here we lock the decision + artifact logic with synthetic
 * corpora so a regression in the retrain math fails offline.
 *
 *   node --test scripts/cam-retrain-order-run.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderMap, LEARNED_ORDER_KIND } from "./lib/cam-learned-order-store.mjs";
import { planRetrain, buildRetrainArtifact } from "./cam-retrain-order-run.mjs";

const BASE = { facing: 10, OD_roughing: 20, chamfer: 30, grooving: 40, OD_finishing: 50, parting_cutoff: 99 };
const corpus = (seq, n) => Array.from({ length: n }, () => [...seq]);
// JM consistently does grooving BEFORE chamfer — contradicts BASE (chamfer 30 < grooving 40).
const JM_GROOVE_FIRST = ["facing", "OD_roughing", "grooving", "chamfer", "OD_finishing", "parting_cutoff"];
// JM matches BASE exactly (chamfer before grooving).
const JM_MATCHES_BASE = ["facing", "OD_roughing", "chamfer", "grooving", "OD_finishing", "parting_cutoff"];

test("planRetrain finds the disagreement and PROMOTES an improving merge", () => {
  const { disagreements, evaluation } = planRetrain({
    refSeqs: corpus(JM_GROOVE_FIRST, 30),
    currentOrder: BASE,
    minSupport: 5, minConfidence: 0.7,
  });
  assert.ok(disagreements.length >= 1, "corpus disagrees with BASE on grooving/chamfer");
  assert.equal(evaluation.promote, true, evaluation.reason);
  assert.ok(evaluation.candidateFidelity > evaluation.currentFidelity);
  assert.equal(validateOrderMap(evaluation.candidateOrder).valid, true);
  // grooving moved before chamfer in the candidate
  assert.ok(evaluation.candidateOrder.grooving < evaluation.candidateOrder.chamfer);
});

test("planRetrain is a NO-OP when the corpus already agrees with the persisted order", () => {
  const { disagreements, evaluation } = planRetrain({
    refSeqs: corpus(JM_MATCHES_BASE, 30),
    currentOrder: BASE,
    minSupport: 5, minConfidence: 0.7,
  });
  assert.equal(disagreements.length, 0, "no high-confidence contradiction");
  assert.equal(evaluation.promote, false);
  assert.match(evaluation.reason, /no-op/);
});

test("planRetrain throws on a non-array corpus", () => {
  assert.throws(() => planRetrain({ refSeqs: "nope", currentOrder: BASE }), /refSeqs\[\]\[\] is required/);
});

test("buildRetrainArtifact produces a valid, well-provenanced artifact", () => {
  const { evaluation } = planRetrain({ refSeqs: corpus(JM_GROOVE_FIRST, 30), currentOrder: BASE, minSupport: 5, minConfidence: 0.7 });
  const iso = "2026-06-03T05:30:00.000Z";
  const art = buildRetrainArtifact(evaluation, { sampled: 30, programsWithOps: 30, minSupport: 5, minConfidence: 0.7, baseSource: "learned-artifact" }, iso);
  assert.equal(art.kind, LEARNED_ORDER_KIND);
  assert.equal(art.learnedAt, iso);
  assert.equal(validateOrderMap(art.order).valid, true);
  assert.equal(art.provenance.disagreements_applied, evaluation.applied.length);
  assert.equal(art.provenance.fidelity_before, evaluation.currentFidelity);
  assert.equal(art.provenance.fidelity_after, evaluation.candidateFidelity);
  assert.equal(art.provenance.base_order_source, "learned-artifact");
  assert.equal(art.provenance.persisted_by, "cam-retrain-order-run.mjs");
});

test("buildRetrainArtifact fails loud without an injected timestamp", () => {
  const { evaluation } = planRetrain({ refSeqs: corpus(JM_GROOVE_FIRST, 30), currentOrder: BASE, minSupport: 5, minConfidence: 0.7 });
  assert.throws(() => buildRetrainArtifact(evaluation, { sampled: 30 }), /nowIso/);
});
