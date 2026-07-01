/**
 * Tests for cad-dimtol-ks-validate.mjs (U-DELTA-DIMTOL-DB / T-DIMTOL gate, slot:delta).
 * Run: node scripts/lib/cad-dimtol-ks-validate.test.mjs   (node:test auto-runs on exit)
 *
 * R9: KS has EXACT reference points -- Q_KS(1.358) ~= 0.05 (the alpha=0.05 critical lambda),
 * Q_KS(1.0) ~= 0.27, Q_KS(0) = 1. The drift gate's intent (flag a part whose dims don't match
 * its class) is encoded by disjoint->drawn:false / consistent->drawn:true, not a hardcoded p.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { kolmogorovQ, ksStatistic, validateDimDrift } from "./cad-dimtol-ks-validate.mjs";

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- kolmogorovQ: exact reference values ----
test("kolmogorovQ: known reference points (Q(0)=1, Q(1.358)~=0.05, Q(1.0)~=0.27, Q(0.5)~=0.96)", () => {
  assert.equal(kolmogorovQ(0), 1, "lambda<=0 -> identical CDFs -> p=1");
  assert.equal(kolmogorovQ(-3), 1, "negative lambda guarded to p=1");
  assert.ok(near(kolmogorovQ(1.358), 0.05, 0.005), `Q(1.358)=${kolmogorovQ(1.358)} should be ~0.05 (the alpha critical value)`);
  assert.ok(near(kolmogorovQ(1.0), 0.27, 0.01), `Q(1.0)=${kolmogorovQ(1.0)} should be ~0.27`);
  assert.ok(near(kolmogorovQ(0.5), 0.964, 0.01), `Q(0.5)=${kolmogorovQ(0.5)} should be ~0.964`);
  assert.ok(kolmogorovQ(2.0) < 0.001, `Q(2.0)=${kolmogorovQ(2.0)} should be ~0.00067`);
});

test("kolmogorovQ: monotonically decreasing in lambda + clamped to [0,1]", () => {
  assert.ok(kolmogorovQ(0.5) > kolmogorovQ(1.0), "monotone decreasing");
  assert.ok(kolmogorovQ(1.0) > kolmogorovQ(2.0), "monotone decreasing");
  for (const l of [0, 0.1, 1, 5, 50]) { const q = kolmogorovQ(l); assert.ok(q >= 0 && q <= 1, `Q(${l})=${q} in [0,1]`); }
});

// ---- ksStatistic: exact D values ----
test("ksStatistic: identical samples -> D=0; disjoint -> D=1; known partial -> D=0.5", () => {
  assert.equal(ksStatistic([1, 2, 3], [1, 2, 3]).D, 0, "identical empirical CDFs");
  assert.equal(ksStatistic([1, 2, 3], [10, 11, 12]).D, 1, "fully disjoint ranges");
  assert.equal(ksStatistic([1, 2, 3, 4], [3, 4, 5, 6]).D, 0.5, "max CDF gap is 0.5 at x in [2,3)");
});

test("ksStatistic: CROSS-SAMPLE TIES are coalesced (no mid-tie D inflation) -- regression for the 3-of-3 P0", () => {
  // [5] vs [2,5,5,5,5]: the true D measures the CDF gap only AFTER all copies of a value are
  // consumed on both sides. At x=2: F1=0, F2=1/5 -> gap 0.2. At x=5: F1=1, F2=1 -> gap 0. So D=0.2.
  // The buggy mid-tie walk returned 0.6 (measured between the 2 and the first of four 5s).
  assert.equal(ksStatistic([5], [2, 5, 5, 5, 5]).D, 0.2, "tied value must not inflate D (buggy walk gave 0.6)");
  // same single value on both sides -> CDFs identical -> D=0. The buggy mid-tie walk gave 0.75
  // (it measured the gap after advancing F1 to 1 but F2 only to 1/4).
  assert.equal(ksStatistic([5], [5, 5, 5, 5]).D, 0, "all-tied identical value -> no drift, D=0");
});

test("ksStatistic: empty side -> D null with the real counts", () => {
  assert.deepEqual(ksStatistic([], [1, 2]), { D: null, n1: 0, n2: 2 });
  assert.deepEqual(ksStatistic([1, 2], []), { D: null, n1: 2, n2: 0 });
});

// ---- validateDimDrift: the gate behavior (happy + failure modes) ----
test("happy: a held-out part consistent with its class distribution PASSES (drawn:true, p>alpha)", () => {
  const learned = Array.from({ length: 201 }, (_, i) => i); // 0..200
  const heldout = [40, 80, 120, 160]; // evenly spans the class range
  const r = validateDimDrift(learned, heldout);
  assert.ok(r.drawn, `consistent part should pass; got p=${r.pValue}`);
  assert.ok(r.pValue > 0.05);
});

test("failure 1: a drifted held-out part (dims outside class range) is FLAGGED (drawn:false)", () => {
  const learned = Array.from({ length: 201 }, (_, i) => i); // 0..200
  const heldout = [400, 420, 440, 460, 480, 500]; // entirely above the class -> drift
  const r = validateDimDrift(learned, heldout);
  assert.equal(r.D, 1, "disjoint -> D=1");
  assert.ok(!r.drawn, "drifted part must be flagged");
  assert.ok(r.pValue < 0.05);
});

test("failure 2: identical distributions -> D=0, p=1, drawn:true (no false drift)", () => {
  const s = Array.from({ length: 100 }, (_, i) => i + 1);
  const r = validateDimDrift(s, s.slice());
  assert.equal(r.D, 0);
  assert.equal(r.pValue, 1);
  assert.ok(r.drawn);
});

test("failure 3: empty held-out -> drawn:false + reason, NEVER a fabricated p (R12)", () => {
  const r = validateDimDrift([1, 2, 3], []);
  assert.equal(r.drawn, false);
  assert.equal(r.pValue, null);
  assert.equal(r.reason, "empty-sample");
});

test("failure 4: n<2 on a side -> computed but flagged insufficient-sample", () => {
  const r = validateDimDrift([5], [5, 6, 7]);
  assert.equal(r.reason, "insufficient-sample");
  assert.ok(typeof r.pValue === "number", "still returns a number, just flagged unreliable");
});

// ---- adversarial ----
test("adversarial: NaN/Infinity/non-array are filtered, never throw", () => {
  const r = validateDimDrift([1, 2, NaN, 3, Infinity], [1, 2, 3, -Infinity]);
  assert.ok(typeof r.pValue === "number", "non-finite values filtered out, computation proceeds");
  const r2 = validateDimDrift(null, undefined);
  assert.equal(r2.drawn, false);
  assert.equal(r2.reason, "empty-sample");
});

test("adversarial: alpha override changes the gate boundary", () => {
  const learned = Array.from({ length: 60 }, (_, i) => i);
  const heldout = [5, 15, 25, 35, 45]; // mildly consistent
  const lax = validateDimDrift(learned, heldout, { alpha: 0.0001 });
  const strict = validateDimDrift(learned, heldout, { alpha: 0.999 });
  assert.ok(lax.drawn, "a near-zero alpha makes almost everything 'drawn'");
  assert.ok(!strict.drawn, "an alpha near 1 flags almost everything as drift");
});
