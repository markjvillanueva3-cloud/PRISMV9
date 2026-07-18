// Tests for cad-print-dim-match.mjs -- the pure 2D-print comparison core (U-DELTA-CAD-PRINT-COMPARE, slot:delta).
// Real reference values + the headline manufacturing failure modes the operator's architecture must catch:
// missing feature (2-hole bracket generated 1 hole), out-of-tolerance dim, extra spurious feature, GD&T band.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  toleranceBand, gradeDimension, matchDimSets, scorePrintMatch, loadPrintDims, DEFAULT_REL_TOL,
} from "./cad-print-dim-match.mjs";

test("toleranceBand: asymmetric GD&T band -> exact [lo,hi]; banded=true", () => {
  const b = toleranceBand({ nominal: 25.0, tolPlus: 0.02, tolMinus: 0.0 });
  assert.equal(b.lo, 25.0);
  assert.equal(Math.round(b.hi * 1e6) / 1e6, 25.02);
  assert.equal(b.banded, true);
});
test("toleranceBand: symmetric plusMinus + relative fallback (no band) + null nominal", () => {
  const s = toleranceBand({ nominal: 10, plusMinus: 0.1 });
  assert.deepEqual([s.lo, s.hi, s.banded], [9.9, 10.1, true]);
  const rel = toleranceBand({ nominal: 100 }, 0.02); // 2% rel
  assert.deepEqual([rel.lo, rel.hi, rel.banded], [98, 102, false]);
  assert.equal(toleranceBand({ nominal: "x" }), null);
});

test("gradeDimension: in-band passes; just outside the band fails (the GD&T accept/reject boundary)", () => {
  const dim = { nominal: 25.0, tolPlus: 0.02, tolMinus: 0.0 };
  assert.equal(gradeDimension(25.015, dim).pass, true, "inside +0.02 band");
  assert.equal(gradeDimension(25.03, dim).pass, false, "above the band");
  assert.equal(gradeDimension(24.99, dim).pass, false, "below the -0.00 band");
});
test("gradeDimension: relErr math + no-band relative tolerance + 0/0 edge", () => {
  const g = gradeDimension(51, { nominal: 50 }, 0.02); // 2% err exactly == tol
  assert.equal(g.relErr, 0.02);
  assert.equal(g.pass, true);
  assert.equal(gradeDimension(52, { nominal: 50 }, 0.02).pass, false, "4% > 2% tol");
  assert.equal(gradeDimension(0, { nominal: 0 }).relErr, 0);
  assert.equal(gradeDimension("nan", { nominal: 50 }).pass, false);
});

test("matchDimSets: matches by type, surfaces a MISSING feature (2 holes original, 1 generated)", () => {
  const original = [
    { type: "hole", view: "top", nominal: 8 },
    { type: "hole", view: "top", nominal: 8 },
    { type: "length", nominal: 60 },
  ];
  const generated = [
    { type: "hole", view: "top", nominal: 8 },
    { type: "length", nominal: 60 },
  ];
  const { matched, missing, extra } = matchDimSets(original, generated);
  assert.equal(matched.length, 2, "one hole + the length matched");
  assert.equal(missing.length, 1, "the second hole is MISSING");
  assert.equal(missing[0].type, "hole");
  assert.equal(extra.length, 0);
});
test("matchDimSets: surfaces an EXTRA spurious feature; view mismatch blocks a match", () => {
  const original = [{ type: "length", nominal: 60 }];
  const generated = [{ type: "length", nominal: 60 }, { type: "hole", nominal: 5 }];
  const r = matchDimSets(original, generated);
  assert.equal(r.matched.length, 1);
  assert.equal(r.extra.length, 1, "the spurious hole is EXTRA");
  // both name a view and they differ -> incompatible -> no match -> missing + extra
  const v = matchDimSets([{ type: "width", view: "front", nominal: 40 }], [{ type: "width", view: "top", nominal: 40 }]);
  assert.equal(v.matched.length, 0);
  assert.equal(v.missing.length, 1);
  assert.equal(v.extra.length, 1);
});
test("matchDimSets: tightest-tolerance dim claims its best match first (precise feature not robbed)", () => {
  // two 'distance' dims at 10.00; a tight one (+/-0.01) and a loose one (+/-1). Generated 10.005 and 10.9.
  // The tight dim must take 10.005 (in its band); the loose dim takes 10.9.
  const original = [
    { type: "distance", nominal: 10.0, plusMinus: 1.0, id: "loose" },
    { type: "distance", nominal: 10.0, plusMinus: 0.01, id: "tight" },
  ];
  const generated = [{ type: "distance", nominal: 10.9 }, { type: "distance", nominal: 10.005 }];
  const { matched } = matchDimSets(original, generated);
  const tight = matched.find((m) => m.orig.id === "tight");
  assert.equal(tight.gen.nominal, 10.005, "tight dim claimed the closest value");
  assert.equal(tight.grade.pass, true);
});

test("scorePrintMatch: perfect match -> accurate, score 1, completeness 1, dimAccuracy 1", () => {
  const print = [
    { type: "length", nominal: 60 },
    { type: "width", nominal: 40 },
    { type: "hole", view: "top", nominal: 8 },
    { type: "hole", view: "top", nominal: 8 },
  ];
  const r = scorePrintMatch(print, print.map((d) => ({ ...d })));
  assert.equal(r.accurate, true);
  assert.equal(r.score, 1);
  assert.equal(r.completeness, 1);
  assert.equal(r.dimAccuracy, 1);
  assert.equal(r.missingCount, 0);
  assert.equal(r.extraCount, 0);
});
test("scorePrintMatch: MISSING feature (2-hole bracket -> 1 hole) is NOT accurate and drops completeness", () => {
  const original = [
    { type: "length", nominal: 60 }, { type: "width", nominal: 40 },
    { type: "hole", view: "top", nominal: 8 }, { type: "hole", view: "top", nominal: 8 },
  ];
  const generated = [ // the real observed gap: envelope right, only ONE hole
    { type: "length", nominal: 60 }, { type: "width", nominal: 40 },
    { type: "hole", view: "top", nominal: 8 },
  ];
  const r = scorePrintMatch(original, generated);
  assert.equal(r.accurate, false, "a missing feature must FAIL the gate even though every present dim is perfect");
  assert.equal(r.missingCount, 1);
  assert.equal(r.completeness, 0.75, "3 of 4 features present");
  assert.equal(r.dimAccuracy, 1, "the dims that ARE present are all correct");
  assert.equal(r.missing[0].type, "hole");
  assert.ok(r.score < 1 && r.score > 0, "graded, not zero -- it is a near-miss");
});
test("scorePrintMatch: OUT-OF-TOLERANCE dim is not accurate and is reported in failures", () => {
  const original = [{ type: "length", nominal: 50 }, { type: "width", nominal: 30 }];
  const generated = [{ type: "length", nominal: 50 }, { type: "width", nominal: 33 }]; // 10% off, > 2% tol
  const r = scorePrintMatch(original, generated);
  assert.equal(r.accurate, false);
  assert.equal(r.completeness, 1, "both features present");
  assert.equal(r.dimAccuracy, 0.5, "1 of 2 in tolerance");
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].type, "width");
  assert.equal(r.failures[0].actual, 33);
});
test("scorePrintMatch: EXTRA spurious feature penalizes score and fails the strict gate", () => {
  const original = [{ type: "length", nominal: 50 }];
  const generated = [{ type: "length", nominal: 50 }, { type: "hole", nominal: 5 }, { type: "hole", nominal: 6 }];
  const r = scorePrintMatch(original, generated, { extraPenalty: 0.1 });
  assert.equal(r.accurate, false, "extra geometry is a defect");
  assert.equal(r.extraCount, 2);
  assert.equal(r.completeness, 1);
  assert.equal(r.dimAccuracy, 1);
  assert.equal(r.score, 0.8, "1 * 1 * (1 - 2*0.1) = 0.8");
});
test("scorePrintMatch: GD&T tolerance band drives accept -- in-band passes where naive 2% would fail", () => {
  // nominal 100 with a generous +/-3 band: 102.5 is in-band (accept) though it is 2.5% off (a naive 2% rel check fails)
  const original = [{ type: "length", nominal: 100, plusMinus: 3 }];
  const r = scorePrintMatch(original, [{ type: "length", nominal: 102.5 }]);
  assert.equal(r.accurate, true, "tolerance band, not a flat 2%, governs the accept");
});
test("scorePrintMatch: empty original + empty generated -> accurate:false (nothing to verify, never fabricate a pass)", () => {
  const r = scorePrintMatch([], []);
  assert.equal(r.accurate, false);
  assert.equal(r.completeness, 1);
  assert.deepEqual([r.missingCount, r.extraCount], [0, 0]);
});

test("loadPrintDims: reads {dims:[...]} and bare [...]; throws on missing file + garbage shape", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-print-compare-"));
  try {
    const a = path.join(dir, "wrapped.json"); fs.writeFileSync(a, JSON.stringify({ dims: [{ type: "length", nominal: 50 }] }));
    const b = path.join(dir, "bare.json"); fs.writeFileSync(b, JSON.stringify([{ type: "width", nominal: 30 }]));
    const c = path.join(dir, "garbage.json"); fs.writeFileSync(c, JSON.stringify({ notDims: 1 }));
    assert.equal(loadPrintDims(a)[0].nominal, 50);
    assert.equal(loadPrintDims(b)[0].type, "width");
    assert.throws(() => loadPrintDims(c), /no dims array/);
    assert.throws(() => loadPrintDims(path.join(dir, "nope.json")));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("DEFAULT_REL_TOL is 2%", () => assert.equal(DEFAULT_REL_TOL, 0.02));
