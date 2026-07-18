// Tests for lathe-closed-loop-test.mjs — CLOSED-LOOP-MS0/U-CL4
// Real fail-on-revert assertions: the composed PASS/FAIL verdict (safety AND tooling),
// G-code→op inference, and the three FAIL paths (unsafe / tooling-gap / informational-no-data).
import { test } from "node:test";
import assert from "node:assert/strict";
import { closedLoopTest, inferOpsFromGcodes } from "./lathe-closed-loop-test.mjs";

// Proper roughing program: G50 caps the G96 CSS, G95 declares feed, G71 longitudinal rough.
const ROUGH_CLEAN = "G95\nG50 S2000\nG96 S200 M03\nG71 P1 Q2 U0.5 W0.1 D2000 F0.3\nG00 X5.0\nM30\n";
// Unsafe: G96 CSS with NO G50 cap → css-no-rpm-cap ERROR.
const CSS_BAD = "G95\nG96 S200 M03\nG01 X2.0 Z-0.5 F0.01\nG00 X5.0\nM30\n";
const INSERTS_ON_HAND = { insert: { count: 212, spend: 53090 }, "carbide-blank": { count: 5372, spend: 4338880 } };

test("inferOpsFromGcodes maps canned cycles to operations", () => {
  assert.deepEqual(inferOpsFromGcodes(ROUGH_CLEAN), { od_rough: 1 });
  assert.deepEqual(inferOpsFromGcodes("G97 S800\nG76 X1 Z-10\nM30"), { od_thread: 1 });
  assert.deepEqual(inferOpsFromGcodes("G74 X0 Z-20 D500\nM30"), { drill_axial: 1 });
  assert.deepEqual(inferOpsFromGcodes(""), {});
  assert.deepEqual(inferOpsFromGcodes(null), {});
});

test("PASS: proper program + needed tool types on hand", () => {
  const r = closedLoopTest({ programText: ROUGH_CLEAN, purchaseByType: INSERTS_ON_HAND });
  assert.equal(r.proper, true);
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.toolTypesMissing, []);
  assert.ok(r.toolTypesNeeded.includes("insert"));
});

test("FAIL (safety): unsafe program → FAIL with an unsafe reason", () => {
  const r = closedLoopTest({ programText: CSS_BAD, purchaseByType: INSERTS_ON_HAND });
  assert.equal(r.proper, false);
  assert.equal(r.verdict, "FAIL");
  assert.ok(r.reasons.some((x) => /unsafe/.test(x)));
});

test("FAIL (tooling): proper program but the needed tool type was never purchased", () => {
  const r = closedLoopTest({ programText: ROUGH_CLEAN, purchaseByType: { drill: { count: 149 } } });
  assert.equal(r.proper, true);                 // safe...
  assert.equal(r.verdict, "FAIL");              // ...but tooling gap fails the closed-loop test
  assert.ok(r.toolTypesMissing.includes("insert"));
  assert.ok(r.reasons.some((x) => /tooling gap/.test(x)));
});

test("no purchase data → tooling is informational (not a FAIL); a proper program still PASSES", () => {
  const r = closedLoopTest({ programText: ROUGH_CLEAN });
  assert.equal(r.proper, true);
  assert.equal(r.verdict, "PASS");
  assert.equal(r.reasons.length, 0);
});

test("explicit opFrequencies override the G-code inference", () => {
  const r = closedLoopTest({ programText: ROUGH_CLEAN, purchaseByType: INSERTS_ON_HAND, opFrequencies: { od_thread: 5 } });
  // od_thread→insert only; carbide-blank no longer demanded
  assert.ok(r.toolTypesNeeded.includes("insert"));
  assert.equal(r.verdict, "PASS");
});
