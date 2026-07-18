// scripts/lib/dimension-set-score.test.mjs
// Tests for the OCR closed-loop dimension-set scorer (U-PSGB-XRAY-CLOSED-LOOP).
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dimToMm, dimMatches, dimType, typesCompatible, scoreDimensionSet, aggregateScores,
  DEFAULT_TOL_PCT, DEFAULT_TOL_ABS_MM, DEFAULT_TYPE_AWARE,
} from "./dimension-set-score.mjs";

test("constants: 1% relative + 0.05mm absolute floor", () => {
  assert.equal(DEFAULT_TOL_PCT, 1.0);
  assert.equal(DEFAULT_TOL_ABS_MM, 0.05);
});

test("dimToMm: number / {nominal_mm} / {mm} / {value} / string; NaN+Infinity+junk → null", () => {
  assert.equal(dimToMm(25.4), 25.4);
  assert.equal(dimToMm({ nominal_mm: 12.7 }), 12.7);
  assert.equal(dimToMm({ mm: 3 }), 3);
  assert.equal(dimToMm({ value: 5 }), 5);
  assert.equal(dimToMm("2.5"), 2.5);
  assert.equal(dimToMm(NaN), null);
  assert.equal(dimToMm(Infinity), null);
  assert.equal(dimToMm({ nominal_mm: "abc" }), null);
  assert.equal(dimToMm(null), null);
  assert.equal(dimToMm({}), null);
});

test("dimMatches: relative tolerance, absolute floor, NaN never matches", () => {
  assert.equal(dimMatches(25.4, 25.404), true);   // 0.016% < 1%
  assert.equal(dimMatches(25.4, 26.0), false);     // 2.36% > 1%
  assert.equal(dimMatches(0.5, 0.54), true);        // |0.04| <= max(0.05, 0.005)=0.05 → abs floor saves it
  assert.equal(dimMatches(0.5, 0.6), false);        // |0.1| > 0.05 floor
  assert.equal(dimMatches(NaN, 5), false);
  assert.equal(dimMatches(5, Infinity), false);
  assert.equal(dimMatches(100, 100.5, { pct: 1 }), true);  // 0.5% < 1%
  assert.equal(dimMatches(100, 100.5, { pct: 0.1 }), false); // 0.5% > 0.1%
});

test("scoreDimensionSet: perfect match → P=R=F1=1, mae=0", () => {
  const s = scoreDimensionSet([10, 20, 30], [10, 20, 30]);
  assert.equal(s.precision, 1); assert.equal(s.recall, 1); assert.equal(s.f1, 1);
  assert.equal(s.mae_mm, 0); assert.equal(s.matched, 3);
  assert.deepEqual(s.missed_mm, []); assert.deepEqual(s.extra_mm, []);
});

test("scoreDimensionSet: partial recall (OCR missed a dim)", () => {
  const s = scoreDimensionSet([10, 20], [10, 20, 30]);
  assert.equal(s.matched, 2);
  assert.equal(s.recall, 0.6667);   // 2/3
  assert.equal(s.precision, 1);     // 2/2
  assert.deepEqual(s.missed_mm, [30]);
});

test("scoreDimensionSet: extra/hallucinated dim drops precision", () => {
  const s = scoreDimensionSet([10, 99], [10]);
  assert.equal(s.recall, 1);        // found the 1 real dim
  assert.equal(s.precision, 0.5);   // 1 of 2 extracted is real
  assert.deepEqual(s.extra_mm, [99]);
});

test("scoreDimensionSet: tolerance-band match counts; out-of-band does not", () => {
  const within = scoreDimensionSet([25.404], [25.4]);
  assert.equal(within.matched, 1); assert.equal(within.mae_mm, 0.004);
  const outside = scoreDimensionSet([26.0], [25.4]);
  assert.equal(outside.matched, 0); assert.equal(outside.recall, 0);
  assert.deepEqual(outside.missed_mm, [25.4]); assert.deepEqual(outside.extra_mm, [26]);
});

// ── failure modes ──
test("scoreDimensionSet: empty truth → recall null (cannot score), precision 0 if extracted", () => {
  const s = scoreDimensionSet([10, 20], []);
  assert.equal(s.recall, null);
  assert.equal(s.precision, 0);
  assert.equal(s.n_truth, 0);
});
test("scoreDimensionSet: empty extracted → precision null, recall 0", () => {
  const s = scoreDimensionSet([], [10, 20]);
  assert.equal(s.precision, null);
  assert.equal(s.recall, 0);
  assert.deepEqual(s.missed_mm, [10, 20]);
});
test("scoreDimensionSet: both empty → all null, no crash", () => {
  const s = scoreDimensionSet([], []);
  assert.equal(s.precision, null); assert.equal(s.recall, null); assert.equal(s.f1, null);
  assert.equal(s.mae_mm, null); assert.equal(s.matched, 0);
});

// ── adversarial ──
test("scoreDimensionSet: NaN/Infinity/junk entries are filtered, not matched", () => {
  const s = scoreDimensionSet([10, NaN, Infinity, "bad", { nominal_mm: 20 }], [10, 20]);
  assert.equal(s.n_extracted, 2);   // only 10 and 20 survive coercion
  assert.equal(s.matched, 2); assert.equal(s.precision, 1); assert.equal(s.recall, 1);
});
test("scoreDimensionSet: duplicate truth values consume one extracted each", () => {
  const s = scoreDimensionSet([10], [10, 10]);
  assert.equal(s.matched, 1);       // one extracted can't satisfy two truth dims
  assert.equal(s.recall, 0.5); assert.deepEqual(s.missed_mm, [10]);
});
test("scoreDimensionSet: non-array inputs → safe null result", () => {
  const s = scoreDimensionSet(null, undefined);
  assert.equal(s.matched, 0); assert.equal(s.precision, null); assert.equal(s.recall, null);
});
test("dimToMm: boolean is NOT a dimension (Number(true)===1 footgun)", () => {
  assert.equal(dimToMm(true), null);
  assert.equal(dimToMm(false), null);
});
test("scoreDimensionSet: OPTIMAL matching fixes the old greedy-undercount (truth dims closer than tol band)", () => {
  // truth [100,100.9] within a ~1mm band; got [100.5,101.4]. Feasible edges:
  // 100↔100.5 (Δ0.5), 100.9↔100.5 (Δ0.4), 100.9↔101.4 (Δ0.5). The OLD greedy took the
  // global-min 100.9↔100.5 first → orphaned 101.4 (1 match). Kuhn's max-cardinality finds
  // 100↔100.5 + 100.9↔101.4 = 2 matches. This is the recall-honesty fix (greedy biased recall DOWN).
  const s = scoreDimensionSet([100.5, 101.4], [100, 100.9]);
  assert.equal(s.matched, 2, "optimal assignment recovers both — the documented greedy bug is fixed");
  assert.equal(s.recall, 1);
  assert.equal(s.precision, 1);
  // well-separated dims (the real-print common case) still match cleanly:
  const ok = scoreDimensionSet([25.4, 50.8], [25.4, 50.8]);
  assert.equal(ok.matched, 2); assert.equal(ok.recall, 1);
});

// ── type-aware matching (the value-only false-positive fix) ──
test("dimType: reads type / legacy kind alias / normalizes case; bare number → null", () => {
  assert.equal(dimType({ nominal_mm: 10, type: "Diameter" }), "diameter");
  assert.equal(dimType({ nominal_mm: 10, kind: "LINEAR" }), "linear"); // legacy alias
  assert.equal(dimType({ nominal_mm: 10 }), null);
  assert.equal(dimType(10), null);
  assert.equal(dimType({ nominal_mm: 10, type: "  " }), null);
});

test("dimType: producer sentinel 'unknown' (and friends) collapse to null → value-only fallback", () => {
  // parseVisionResponse defaults a missing type to the literal string "unknown" — it MUST be
  // treated as unknown, not a distinct type, or a real OCR extraction scores 0 vs typed truth.
  assert.equal(dimType({ nominal_mm: 10, type: "unknown" }), null);
  assert.equal(dimType({ nominal_mm: 10, type: "UNKNOWN" }), null);
  assert.equal(dimType({ nominal_mm: 10, type: "unspecified" }), null);
  assert.equal(dimType({ nominal_mm: 10, type: "n/a" }), null);
  assert.equal(dimType({ nominal_mm: 10, type: "linear" }), "linear"); // a real type is NOT a sentinel
});

test("REGRESSION: real-producer shape (extracted type 'unknown') still matches typed truth by value", () => {
  // The exact production seam: parseVisionResponse emits type:"unknown" when the VLM omits a type;
  // ground truth is typed "linear"/"diameter". Type-aware default MUST fall back to value-only here,
  // NOT score 0 — otherwise the live training signal collapses. This is the scrutiny-caught P0.
  const truth = [{ nominal_mm: 25.4, type: "linear" }, { nominal_mm: 12.7, type: "diameter" }];
  const extracted = [{ nominal_mm: 25.4, type: "unknown" }, { nominal_mm: 12.7, type: "unknown" }];
  const s = scoreDimensionSet(extracted, truth);   // default type-aware
  assert.equal(s.matched, 2, "unknown-type extraction falls back to value-only, does NOT zero the signal");
  assert.equal(s.recall, 1); assert.equal(s.precision, 1);
});

test("typesCompatible: unknown on either side is permissive; two known types must be equal", () => {
  assert.equal(typesCompatible(null, "diameter"), true);  // value-only fallback
  assert.equal(typesCompatible("linear", null), true);
  assert.equal(typesCompatible("diameter", "diameter"), true);
  assert.equal(typesCompatible("diameter", "linear"), false);
  assert.equal(DEFAULT_TYPE_AWARE, true);
});

test("type-aware (default): a diameter does NOT match a linear of equal magnitude; value-only opt-out does", () => {
  const dia = [{ nominal_mm: 45, type: "diameter" }];
  const lin = [{ nominal_mm: 45, type: "linear" }];
  const aware = scoreDimensionSet(dia, lin);                       // default typeAware
  assert.equal(aware.matched, 0, "different known types never match by value alone");
  assert.equal(aware.type_aware, true);
  assert.deepEqual(aware.missed_mm, [45]); assert.deepEqual(aware.extra_mm, [45]);
  const valueOnly = scoreDimensionSet(dia, lin, { typeAware: false });
  assert.equal(valueOnly.matched, 1, "legacy value-only metric still available via opt-out");
  assert.equal(valueOnly.type_aware, false);
});

test("type-aware: angular (degrees) never matches a linear (mm) of equal magnitude — the units-confusion guard", () => {
  // 45° is NOT 45mm; value-only would falsely pair them and inflate the score.
  const s = scoreDimensionSet([{ nominal_mm: 45, type: "angular" }], [{ nominal_mm: 45, type: "linear" }]);
  assert.equal(s.matched, 0);
});

test("type-aware: same type + value match counts; an unknown-type side falls back to value-only", () => {
  const same = scoreDimensionSet([{ nominal_mm: 12.7, type: "diameter" }], [{ nominal_mm: 12.7, type: "diameter" }]);
  assert.equal(same.matched, 1); assert.equal(same.pairs[0].truth_type, "diameter");
  // truth typed, extracted bare number → unknown type → value-only fallback (back-compat)
  const mixed = scoreDimensionSet([12.7], [{ nominal_mm: 12.7, type: "diameter" }]);
  assert.equal(mixed.matched, 1);
});

test("type-aware + optimal: correct cross-type pairing when values collide (diameter↔diameter, not by position)", () => {
  // both dims share value 10 but differ in type; value-only could mis-pair them. Type-aware
  // forces diameter↔diameter and linear↔linear — 2 correct matches, right pairing.
  const truth = [{ nominal_mm: 10, type: "diameter" }, { nominal_mm: 10, type: "linear" }];
  const got = [{ nominal_mm: 10, type: "linear" }, { nominal_mm: 10, type: "diameter" }];
  const s = scoreDimensionSet(got, truth);
  assert.equal(s.matched, 2); assert.equal(s.recall, 1);
  // every pair is type-consistent
  for (const p of s.pairs) assert.equal(p.truth_type, p.got_type, "matched pair shares a type");
});

// ── aggregate ──
test("aggregateScores: micro P/R/F1 over the corpus", () => {
  const a = aggregateScores([
    scoreDimensionSet([10, 20], [10, 20, 30]), // m=2 t=3 e=2
    scoreDimensionSet([5, 99], [5]),            // m=1 t=1 e=2
  ]);
  assert.equal(a.prints, 2);
  assert.equal(a.total_matched, 3);
  assert.equal(a.total_truth, 4);
  assert.equal(a.total_extracted, 4);
  assert.equal(a.micro_recall, 0.75);   // 3/4
  assert.equal(a.micro_precision, 0.75); // 3/4
});
test("aggregateScores: empty / non-array → zeroed, no crash", () => {
  assert.equal(aggregateScores([]).prints, 0);
  assert.equal(aggregateScores(null).micro_recall, null);
});
