/**
 * Tests for cam-retrain-order-merge.mjs — the WRITE side of the offline self-improving loop.
 * Verifies the load-bearing safety property: corpus disagreements are merged ONLY when they keep the
 * order manufacturing-valid AND do not regress sequence fidelity. The invariants always beat the
 * corpus statistic (a fluke can never produce a parting-first / finish-before-rough order).
 *
 *   node --test scripts/lib/cam-retrain-order-merge.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderMap } from "./cam-learned-order-store.mjs";
import {
  orderToList, listToOrder, mergeDisagreements, scoreOrderAgainstCorpus, evaluateRetrain,
} from "./cam-retrain-order-merge.mjs";

// A minimal but VALID base order (passes validateOrderMap): facing first, parting last,
// OD_roughing < OD_finishing. chamfer(30) currently sits before grooving(40).
const BASE = { facing: 10, OD_roughing: 20, chamfer: 30, grooving: 40, OD_finishing: 50, parting_cutoff: 99 };
const dis = (first, second, support = 100, confidence = 0.9) =>
  ({ jm_dominant: [first, second], jm_support: support, jm_confidence: confidence });
// JM's "real" order used as the scoring corpus (grooving BEFORE chamfer).
const JM_SEQ = ["facing", "OD_roughing", "grooving", "chamfer", "OD_finishing", "parting_cutoff"];
const corpus = (seq, n = 50) => Array.from({ length: n }, () => [...seq]);

// ---- orderToList / listToOrder ------------------------------------------------------------------

test("orderToList sorts by rank then name; listToOrder round-trips relative order", () => {
  assert.deepEqual(orderToList(BASE), ["facing", "OD_roughing", "chamfer", "grooving", "OD_finishing", "parting_cutoff"]);
  const ro = listToOrder(orderToList(BASE));
  assert.deepEqual(orderToList(ro), orderToList(BASE)); // relative order preserved
  assert.equal(ro.facing, 10);              // 1-based × step 10
  assert.equal(ro.parting_cutoff, 60);      // 6th family
});

// ---- mergeDisagreements: happy path -------------------------------------------------------------

test("applies a valid disagreement (move grooving before chamfer) and stays valid", () => {
  const r = mergeDisagreements(BASE, [dis("grooving", "chamfer")]);
  assert.equal(r.applied.length, 1);
  assert.equal(r.skipped.length, 0);
  assert.ok(orderToList(r.order).indexOf("grooving") < orderToList(r.order).indexOf("chamfer"), "grooving now before chamfer");
  assert.equal(validateOrderMap(r.order).valid, true);
  assert.equal(r.netSatisfied, 1);
});

// ---- mergeDisagreements: invariant guards (the load-bearing safety) ------------------------------

test("REJECTS a disagreement that would put parting_cutoff before facing (catastrophe)", () => {
  const r = mergeDisagreements(BASE, [dis("parting_cutoff", "facing")]);
  assert.equal(r.applied.length, 0, "must NOT apply the parting-first move");
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /invariant-violation/);
  assert.deepEqual(r.order, mergeDisagreements(BASE, []).order, "order unchanged");
  assert.equal(validateOrderMap(r.order).valid, true);
});

test("REJECTS finish-before-rough (OD_finishing before OD_roughing)", () => {
  const r = mergeDisagreements(BASE, [dis("OD_finishing", "OD_roughing")]);
  assert.equal(r.applied.length, 0);
  assert.match(r.skipped[0].reason, /invariant-violation/);
});

test("the merged order ALWAYS passes validateOrderMap, even with a mixed adversarial disagreement set", () => {
  const mixed = [
    dis("grooving", "chamfer"),          // valid
    dis("parting_cutoff", "facing"),     // catastrophic — must reject
    dis("OD_finishing", "OD_roughing"),  // invariant — must reject
    dis("chamfer", "OD_finishing"),      // valid-ish
  ];
  const r = mergeDisagreements(BASE, mixed);
  assert.equal(validateOrderMap(r.order).valid, true, "result is ALWAYS a valid order");
  assert.ok(r.applied.length >= 1 && r.skipped.length >= 2);
});

test("Condorcet cycle: netSatisfied < applied.length (an accepted move is undone by a later one) — honest accounting", () => {
  // Cyclic JM prefs over interior families: grooving<chamfer, OD_finishing<grooving, chamfer<OD_finishing.
  // Each move is individually valid + accepted, but the three cannot all hold — the persisted order
  // satisfies only 2. Support-ordered so they apply d1->d2->d3 deterministically.
  const cyclic = [
    dis("grooving", "chamfer", 300),
    dis("OD_finishing", "grooving", 200),
    dis("chamfer", "OD_finishing", 100),
  ];
  const r = mergeDisagreements(BASE, cyclic);
  assert.equal(r.applied.length, 3, "all three moves are accepted (each individually valid)");
  assert.equal(r.netSatisfied, 2, "only two hold in the final order — the cycle drops one");
  assert.ok(r.netSatisfied < r.applied.length, "honest accounting: net < accepted");
  assert.equal(validateOrderMap(r.order).valid, true, "still a valid order");
});

// ---- mergeDisagreements: skip reasons ------------------------------------------------------------

test("skips an already-satisfied disagreement (no churn)", () => {
  const r = mergeDisagreements(BASE, [dis("chamfer", "grooving")]); // BASE already has chamfer<grooving
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped[0].reason, "already-satisfied");
});

test("skips a disagreement referencing an unknown family", () => {
  const r = mergeDisagreements(BASE, [dis("threading", "facing")]); // threading not in BASE
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped[0].reason, "family-not-in-order");
});

test("skips a malformed disagreement (no jm_dominant)", () => {
  const r = mergeDisagreements(BASE, [{ jm_support: 10 }]);
  assert.equal(r.skipped[0].reason, "bad-disagreement-shape");
});

// ---- mergeDisagreements: fail-loud on bad inputs ------------------------------------------------

test("THROWS on a broken base order (facing not first) — refuse to merge onto a broken order", () => {
  const broken = { OD_roughing: 5, facing: 10, parting_cutoff: 99 };
  assert.throws(() => mergeDisagreements(broken, []), /base order is invalid/);
});

test("THROWS on non-object currentOrder / non-array disagreements", () => {
  assert.throws(() => mergeDisagreements(null, []), /family->rank object/);
  assert.throws(() => mergeDisagreements(BASE, "nope"), /disagreements\[\] is required/);
});

// ---- scoreOrderAgainstCorpus --------------------------------------------------------------------

test("perfect-match order scores fidelity 1.0 with zero inversions", () => {
  const perfect = listToOrder(JM_SEQ); // ranks exactly JM's order
  const s = scoreOrderAgainstCorpus(perfect, corpus(JM_SEQ, 20));
  assert.equal(s.meanFidelity, 1);
  assert.equal(s.totalInversions, 0);
  assert.equal(s.programsScored, 20);
  assert.equal(s.perfectPrograms, 20);
});

test("a one-pair inversion lowers fidelity below 1 and counts inversions", () => {
  // BASE has chamfer<grooving but JM_SEQ has grooving<chamfer => exactly one inverted pair / program.
  const s = scoreOrderAgainstCorpus(BASE, corpus(JM_SEQ, 10));
  assert.ok(s.meanFidelity < 1, "fidelity reflects the inversion");
  assert.equal(s.totalInversions, 10, "one inverted pair in each of 10 programs");
});

test("empty / adversarial corpus is handled (no signal => fidelity 1, nothing scored)", () => {
  const s = scoreOrderAgainstCorpus(BASE, [null, [], [undefined]]);
  assert.equal(s.programsScored, 0);
  assert.equal(s.meanFidelity, 1);
  assert.throws(() => scoreOrderAgainstCorpus(BASE, "nope"), /refSequences\[\]\[\] is required/);
  assert.throws(() => scoreOrderAgainstCorpus(null, []), /family->rank object/);
});

// ---- evaluateRetrain: the promote-IFF gate ------------------------------------------------------

test("PROMOTES when a disagreement applies AND fidelity improves", () => {
  const r = evaluateRetrain({
    currentOrder: BASE,
    disagreements: [dis("grooving", "chamfer")],
    refSequences: corpus(JM_SEQ, 30),
  });
  assert.equal(r.promote, true, r.reason);
  assert.equal(r.applied.length, 1);
  assert.ok(r.candidateFidelity > r.currentFidelity, "fidelity strictly improved");
  assert.ok(r.fidelityDelta > 0);
  assert.equal(validateOrderMap(r.candidateOrder).valid, true);
  assert.ok(orderToList(r.candidateOrder).indexOf("grooving") < orderToList(r.candidateOrder).indexOf("chamfer"));
});

test("NO-OP when there are no disagreements to apply", () => {
  const r = evaluateRetrain({ currentOrder: BASE, disagreements: [], refSequences: corpus(JM_SEQ, 10) });
  assert.equal(r.promote, false);
  assert.match(r.reason, /no-op/);
  assert.equal(r.fidelityDelta, 0);
});

test("REGRESSION-GUARD: refuses to promote a merge that lowers fidelity on the scoring corpus", () => {
  // The disagreement says move grooving<chamfer, but the SCORING corpus actually does chamfer<grooving
  // (JM_SEQ reversed for that pair). Applying it regresses => must NOT promote (gate protects).
  const chamferFirstSeq = ["facing", "OD_roughing", "chamfer", "grooving", "OD_finishing", "parting_cutoff"];
  const r = evaluateRetrain({
    currentOrder: BASE,                          // already chamfer<grooving (matches this corpus)
    disagreements: [dis("grooving", "chamfer")], // would move grooving first (wrong for THIS corpus)
    refSequences: corpus(chamferFirstSeq, 30),
  });
  assert.equal(r.applied.length, 1, "the merge is attempted (valid order)...");
  assert.equal(r.promote, false, "...but rejected because it regresses fidelity");
  assert.match(r.reason, /regression-guard/);
  assert.ok(r.fidelityDelta < 0);
});

test("minImprove threshold blocks a non-improving (equal-fidelity) promotion", () => {
  // Disagreement applies and order changes, but on a corpus indifferent to the chamfer/grooving pair
  // the fidelity is unchanged (delta 0). With minImprove > 0 that must NOT promote.
  const indifferent = ["facing", "OD_roughing", "OD_finishing", "parting_cutoff"]; // no chamfer/grooving
  const r = evaluateRetrain({
    currentOrder: BASE,
    disagreements: [dis("grooving", "chamfer")],
    refSequences: corpus(indifferent, 10),
    minImprove: 0.0001,
  });
  assert.equal(r.fidelityDelta, 0);
  assert.equal(r.promote, false);
  assert.match(r.reason, /regression-guard/);
});
