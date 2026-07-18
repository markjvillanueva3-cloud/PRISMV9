// Tests for cad-self-check.mjs Stage-0 orchestrator (U-DELTA-CAD-SELF-CHECK, slot:delta).
// Focus: the pure runSelfCheck verdict + the BBOX-RELIABILITY advisory gate (point-cloud bbox is unreliable
// for curved/holed parts -> a LINEAR mismatch is advisory, must re-verify vs the Fusion kernel bbox).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSelfCheck } from "./cad-self-check.mjs";

test("runSelfCheck: exact match -> accurate, stage label, bboxAdvisory false", () => {
  const dims = [{ type: "linear", nominal: 50 }, { type: "diameter", nominal: 6 }];
  const v = runSelfCheck({ printDims: dims, partDims: dims.map((d) => ({ ...d })), bboxReliable: true });
  assert.equal(v.stage, "2d-self-check");
  assert.equal(v.accurate, true);
  assert.equal(v.bboxAdvisory, false, "reliable bbox + a match -> no advisory");
});

test("runSelfCheck: a LINEAR mismatch on an UNRELIABLE bbox is flagged ADVISORY (re-verify vs kernel)", () => {
  const print = [{ type: "linear", nominal: 50 }, { type: "diameter", nominal: 6 }];
  const part = [{ type: "linear", nominal: 56 }, { type: "diameter", nominal: 6 }]; // envelope 12% off
  const v = runSelfCheck({ printDims: print, partDims: part, bboxReliable: false });
  assert.equal(v.accurate, false);
  assert.equal(v.bboxAdvisory, true, "curved/holed part: the point-bbox linear miss is advisory, not authoritative");
});
test("runSelfCheck: a FEATURE (diameter) mismatch is NOT softened by the bbox advisory (radii are reliable)", () => {
  const print = [{ type: "linear", nominal: 50 }, { type: "diameter", nominal: 6 }];
  const part = [{ type: "linear", nominal: 50 }, { type: "diameter", nominal: 9 }]; // hole 50% off, envelope exact
  const v = runSelfCheck({ printDims: print, partDims: part, bboxReliable: false });
  assert.equal(v.accurate, false);
  // the only failure is the diameter; linear matched -> the advisory must NOT fire on a pure feature miss
  assert.equal(v.bboxAdvisory, false, "a diameter miss is authoritative even when the bbox is unreliable");
  // compared as radius (circular-normalized) but the original Ø convention is preserved in dimAs for reporting
  assert.equal(v.failures[0].dimAs, "diameter");
});
test("runSelfCheck: circular normalization on -> a Ø print hole matches a STEP radius feature (default)", () => {
  const print = [{ type: "linear", nominal: 50 }, { type: "diameter", nominal: 12 }]; // Ø12 hole
  const part = [{ type: "linear", nominal: 50 }, { type: "radius", nominal: 6 }];       // R6 STEP literal
  const v = runSelfCheck({ printDims: print, partDims: part });
  assert.equal(v.accurate, true, "Ø12 <-> R6 is the same feature with normalizeCircular default-on");
  // with normalization OFF the type mismatch surfaces as a missing diameter + extra radius
  const off = runSelfCheck({ printDims: print, partDims: part, normalizeCircular: false });
  assert.equal(off.accurate, false);
  assert.equal(off.missingCount, 1);
});
test("runSelfCheck: reliable bbox never raises the advisory even on a linear miss", () => {
  const v = runSelfCheck({ printDims: [{ type: "linear", nominal: 50 }], partDims: [{ type: "linear", nominal: 60 }], bboxReliable: true });
  assert.equal(v.accurate, false);
  assert.equal(v.bboxAdvisory, false);
});
