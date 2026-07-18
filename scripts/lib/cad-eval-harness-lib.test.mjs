#!/usr/bin/env node
/**
 * Tests for cad-eval-harness-lib.mjs (U-DELTA-EVAL-HARNESS, dimension modality).
 * node:test. Run: node scripts/lib/cad-eval-harness-lib.test.mjs
 *
 * R9: reference values derived from the known dimension-set-score behavior (exact-match dims -> F1 1.0;
 * partial -> computed F1). Covers held-out discipline (non-held predictions flagged), missing pred/truth,
 * and the deterministic gate (pass + each fail reason). Happy + >=3 failure + >=2 adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heldEntryKey, heldKeySet, evalHeldOut, gateEval,
  DEFAULT_MIN_F1, DEFAULT_MAX_MAE_MM,
} from "./cad-eval-harness-lib.mjs";

// ---------- heldEntryKey / heldKeySet ----------
test("heldEntryKey: ocr part_number_normalized; geom abs_path -> FULL normalized path (not stem); null-safe", () => {
  assert.equal(heldEntryKey({ part_number_normalized: "PD-1083" }), "pd1083");
  // geom: full normalized path so distinct files never collide (NOT the basename stem). normIdentity
  // strips /._- but keeps ':' -> "H:/p/Blisk.stp" -> "h:pbliskstp" (unique per path; the value is the
  // collision-freeness, asserted by the regression test below, not the exact token).
  assert.equal(heldEntryKey({ abs_path: "H:/p/Blisk.stp", part_class: "blisk" }), "h:pbliskstp");
  assert.equal(heldEntryKey({}), "");
  assert.equal(heldEntryKey(null), "");
});
test("heldEntryKey: distinct files sharing a stem do NOT collide (P1 regression -- eval denominator)", () => {
  // test_box.step and test_box.iges are distinct held parts (stem 'testbox'); full-path keying keeps them apart.
  const a = heldEntryKey({ abs_path: "H:/p/test_box.step" });
  const b = heldEntryKey({ abs_path: "H:/p/test_box.iges" });
  assert.notEqual(a, b);
  const set = heldKeySet([{ abs_path: "H:/p/test_box.step" }, { abs_path: "H:/p/test_box.iges" }]);
  assert.equal(set.size, 2, "two distinct files must yield two distinct held keys (no coverage inflation)");
});
test("heldKeySet: from a frozen split object (.held) or a bare entry array", () => {
  const split = { held: [{ part_number_normalized: "P1" }, { abs_path: "x/widget.step" }] };
  const set = heldKeySet(split);
  assert.ok(set.has("p1") && set.has("xwidgetstep"));
  assert.equal(heldKeySet([{ part_number_normalized: "Z9" }]).has("z9"), true);
  assert.equal(heldKeySet(null).size, 0);
});

// ---------- evalHeldOut: happy path (exact-match dims -> F1 1.0) ----------
test("evalHeldOut: all held parts scored, exact dims -> micro_f1 1.0", () => {
  const held = [{ part_number_normalized: "P1" }, { part_number_normalized: "P2" }];
  const pred = { P1: [10, 20], P2: [5] };
  const truth = { P1: [10, 20], P2: [5] };
  const r = evalHeldOut(pred, truth, held);
  assert.equal(r.scored, 2);
  assert.equal(r.heldTotal, 2);
  assert.equal(r.aggregate.micro_f1, 1);
  assert.equal(r.aggregate.micro_recall, 1);
  assert.equal(r.missingPrediction.length, 0);
  assert.equal(r.nonHeldPredictions.length, 0);
  assert.equal(r.perPart.find((p) => p.part === "p1").f1, 1);
});

// ---------- evalHeldOut: held-out discipline (non-held prediction flagged) ----------
test("evalHeldOut: a prediction for a NON-held part is flagged (eval contamination)", () => {
  const held = [{ part_number_normalized: "P1" }];
  const pred = { P1: [10], P3_NOT_HELD: [99] };
  const truth = { P1: [10] };
  const r = evalHeldOut(pred, truth, held);
  assert.equal(r.scored, 1);
  assert.deepEqual(r.nonHeldPredictions, ["p3notheld"]);
});

// ---------- evalHeldOut: missing prediction / missing truth ----------
test("evalHeldOut: held part with truth but no prediction -> missingPrediction", () => {
  const held = [{ part_number_normalized: "P1" }, { part_number_normalized: "P2" }];
  const pred = { P1: [10] };
  const truth = { P1: [10], P2: [5] };
  const r = evalHeldOut(pred, truth, held);
  assert.equal(r.scored, 1);
  assert.deepEqual(r.missingPrediction, ["p2"]);
});
test("evalHeldOut: held part with prediction but no truth -> missingTruth (unscorable)", () => {
  const held = [{ part_number_normalized: "P1" }];
  const r = evalHeldOut({ P1: [10] }, {}, held);
  assert.equal(r.scored, 0);
  assert.deepEqual(r.missingTruth, ["p1"]);
});

// ---------- evalHeldOut: partial match -> computed F1 (real reference value) ----------
test("evalHeldOut: partial match yields the exact dimension-set-score F1", () => {
  // pred [10] vs truth [10,20]: matched 1, precision 1, recall 0.5 -> f1 = 2*1*0.5/1.5 = 0.6667
  const r = evalHeldOut({ P1: [10] }, { P1: [10, 20] }, [{ part_number_normalized: "P1" }]);
  assert.equal(r.aggregate.micro_recall, 0.5);
  assert.equal(r.aggregate.micro_precision, 1);
  assert.equal(r.aggregate.micro_f1, 0.6667);
});

// ---------- gateEval: pass + each fail reason ----------
test("gateEval: clean high-F1 full-coverage eval -> PASS", () => {
  const held = [{ part_number_normalized: "P1" }, { part_number_normalized: "P2" }];
  const r = evalHeldOut({ P1: [10], P2: [5] }, { P1: [10], P2: [5] }, held);
  const g = gateEval(r);
  assert.equal(g.pass, true);
  assert.equal(g.reasons.length, 0);
  assert.equal(g.micro_f1, 1);
  assert.equal(g.coverage, 1);
});
test("gateEval: low F1 fails with a reason", () => {
  // 1 of 2 dims per part matched -> f1 0.6667 < default 0.9
  const held = [{ part_number_normalized: "P1" }];
  const r = evalHeldOut({ P1: [10] }, { P1: [10, 20] }, held);
  const g = gateEval(r);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((x) => x.includes("micro_f1")));
});
test("gateEval: low coverage + non-held contamination + zero-scored all fail loud", () => {
  // 1 held scored of 4 -> coverage 0.25 < 0.5
  const held = [{ part_number_normalized: "P1" }, { part_number_normalized: "P2" }, { part_number_normalized: "P3" }, { part_number_normalized: "P4" }];
  const lowCov = evalHeldOut({ P1: [10], XX_NOT_HELD: [1] }, { P1: [10] }, held);
  const g = gateEval(lowCov);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((x) => x.includes("coverage")));
  assert.ok(g.reasons.some((x) => x.includes("NON-held")));
  // zero-scored
  const none = evalHeldOut({}, {}, held);
  assert.equal(gateEval(none).pass, false);
  assert.ok(gateEval(none).reasons.some((x) => x.includes("no held parts were scorable")));
});

// ---------- adversarial: empties never throw ----------
test("adversarial: null/empty inputs are safe (no throw)", () => {
  const r = evalHeldOut(null, null, null);
  assert.equal(r.scored, 0);
  assert.equal(r.heldTotal, 0);
  const g = gateEval(r);
  assert.equal(g.pass, false); // 0 scorable -> fails loud
  assert.equal(gateEval({}).pass, false);
});

test("defaults exported", () => {
  assert.equal(DEFAULT_MIN_F1, 0.9);
  assert.equal(DEFAULT_MAX_MAE_MM, 0.5);
});
