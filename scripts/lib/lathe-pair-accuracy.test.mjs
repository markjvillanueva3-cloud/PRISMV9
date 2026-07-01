/**
 * lathe-pair-accuracy.test.mjs -- slot:whiskey  [exact per-PAIR closeness scorer tests]
 * Real reference-value + algebraic-invariant tests. Run: node scripts/lib/lathe-pair-accuracy.test.mjs
 * R9: each test encodes WHY the value matters (a hardcoded-return impl fails).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TOL_PCT, relErrorPct, withinTol, medianFinite, scoreOpPair, scorePairSet, matchOpPairsByType,
  representativeRefByBand, matchOpBandRepresentative,
} from "./lathe-pair-accuracy.mjs";

const op = (operation_type, v, f) => ({ operation_type, cutting_speed_m_min: v, feed_mm_rev: f });
const opD = (operation_type, v, f, dia_in) => ({ operation_type, cutting_speed_m_min: v, feed_mm_rev: f, dia_in });

test("matchOpPairsByType: pairs the k-th op of each type; drops unmatched extras", () => {
  const gen = [op("od_rough", 200, 0.3), op("od_rough", 180, 0.28), op("od_finish", 240, 0.1)];
  const ref = [op("od_rough", 205, 0.31), op("od_finish", 235, 0.105)];
  const pairs = matchOpPairsByType(gen, ref);
  // rough: min(2,1)=1 pair; finish: min(1,1)=1 pair -> 2 total; the extra gen rough is dropped.
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].generated.cutting_speed_m_min, 200);
  assert.equal(pairs[0].reference.cutting_speed_m_min, 205);
  assert.equal(pairs[1].generated.operation_type, "od_finish");
});

test("matchOpPairsByType: no common type / empty -> no pairs (no fabricated comparison)", () => {
  assert.equal(matchOpPairsByType([op("od_rough", 200, 0.3)], [op("od_finish", 240, 0.1)]).length, 0);
  assert.equal(matchOpPairsByType([], []).length, 0);
  assert.equal(matchOpPairsByType(null, undefined).length, 0);
});

test("matchOpPairsByType + scorePairSet: end-to-end pairs an aligned set to a 'match' verdict", () => {
  const gen = [op("od_rough", 200, 0.30), op("od_finish", 240, 0.10)];
  const ref = [op("od_rough", 205, 0.31), op("od_finish", 235, 0.105)];
  const r = scorePairSet(matchOpPairsByType(gen, ref));
  assert.equal(r.n_ops_scored, 2);
  assert.equal(r.verdict, "match");
});

test("relErrorPct: symmetric magnitude, reference-relative", () => {
  assert.equal(relErrorPct(110, 100), 10);          // +10%
  assert.equal(relErrorPct(90, 100), 10);           // -10% -> same magnitude
  assert.equal(relErrorPct(100, 100), 0);           // exact match
  assert.equal(relErrorPct(150, 100), 50);
});

test("relErrorPct: unscoreable inputs -> null (never NaN/Infinity)", () => {
  assert.equal(relErrorPct(100, 0), null);          // zero reference -> no ratio
  assert.equal(relErrorPct(NaN, 100), null);
  assert.equal(relErrorPct(100, Infinity), null);
  assert.equal(relErrorPct(Infinity, 100), null);
});

test("withinTol: boundary is inclusive at exactly the tolerance", () => {
  assert.equal(withinTol(110, 100, 10), true);      // exactly 10% <= 10%
  assert.equal(withinTol(105, 100, 10), true);
  assert.equal(withinTol(120, 100, 10), false);     // 20% > 10%
  assert.equal(withinTol(100, 0, 10), null);        // unscoreable
  assert.equal(DEFAULT_TOL_PCT, 10);
});

test("medianFinite: odd/even/empty + ignores non-finite", () => {
  assert.equal(medianFinite([1, 2, 3]), 2);
  assert.equal(medianFinite([1, 2, 3, 4]), 2.5);
  assert.equal(medianFinite([]), null);
  assert.equal(medianFinite([NaN, 1, Infinity, 3]), 2); // only 1,3 finite -> median 2
});

test("scoreOpPair: rough op SFM+IPR closeness vs a specific reference (metric->imperial)", () => {
  const s = scoreOpPair(
    { operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.3 },
    { operation_type: "od_rough", cutting_speed_m_min: 210, feed_mm_rev: 0.32 },
  );
  assert.equal(s.scored, true);
  assert.equal(s.band, "rough");
  // SFM: 200 vs 210 m/min -> ~4.76% error (ratio is unit-invariant after the shared conversion).
  assert.ok(Math.abs(s.sfm.rel_error_pct - 4.7619) < 0.01);
  assert.equal(s.sfm.within_tol, true);
  // IPR: 0.30 vs 0.32 mm/rev -> ~6.25% error.
  assert.ok(Math.abs(s.ipr.rel_error_pct - 6.25) < 0.01);
  assert.equal(s.ipr.within_tol, true);
});

test("scoreOpPair: specialty ops (thread/part-off/groove) are NOT closeness-scored (R12)", () => {
  for (const op of ["thread_single_point", "part_off", "groove"]) {
    const s = scoreOpPair(
      { operation_type: op, cutting_speed_m_min: 50, feed_mm_rev: 1.5 },
      { operation_type: op, cutting_speed_m_min: 60, feed_mm_rev: 0.1 },
    );
    assert.equal(s.scored, false, `${op} must be excluded`);
  }
});

test("scorePairSet: a within-tolerance pair-set verdicts 'match' with 100% within bands", () => {
  const r = scorePairSet([
    { generated: { operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.30 },
      reference: { operation_type: "od_rough", cutting_speed_m_min: 205, feed_mm_rev: 0.31 } },
    { generated: { operation_type: "od_finish", cutting_speed_m_min: 240, feed_mm_rev: 0.10 },
      reference: { operation_type: "od_finish", cutting_speed_m_min: 235, feed_mm_rev: 0.105 } },
  ]);
  assert.equal(r.n_ops_scored, 2);
  assert.equal(r.verdict, "match");
  assert.equal(r.sfm_within_pct, 100);
  assert.equal(r.ipr_within_pct, 100);
  assert.ok(r.median_sfm_error_pct <= DEFAULT_TOL_PCT);
});

test("scorePairSet: a far-off pair-set verdicts 'divergent'", () => {
  const r = scorePairSet([
    { generated: { operation_type: "od_rough", cutting_speed_m_min: 120, feed_mm_rev: 0.15 },
      reference: { operation_type: "od_rough", cutting_speed_m_min: 240, feed_mm_rev: 0.40 } }, // ~50% / ~62% off
  ]);
  assert.equal(r.n_ops_scored, 1);
  assert.equal(r.verdict, "divergent");
});

test("scorePairSet: all-specialty or empty -> 'no-scoreable-ops' (honest, not a fake 100%)", () => {
  const empty = scorePairSet([]);
  assert.equal(empty.n_ops_scored, 0);
  assert.equal(empty.verdict, "no-scoreable-ops");
  const allThread = scorePairSet([
    { generated: { operation_type: "thread_single_point", cutting_speed_m_min: 50, feed_mm_rev: 1.5 },
      reference: { operation_type: "thread_single_point", cutting_speed_m_min: 60, feed_mm_rev: 1.5 } },
  ]);
  assert.equal(allThread.n_ops_scored, 0);
  assert.equal(allThread.verdict, "no-scoreable-ops");
});

test("scorePairSet: adversarial NaN/zero params do not poison the aggregate (excluded, not NaN)", () => {
  const r = scorePairSet([
    { generated: { operation_type: "od_rough", cutting_speed_m_min: NaN, feed_mm_rev: 0.3 },
      reference: { operation_type: "od_rough", cutting_speed_m_min: 0, feed_mm_rev: 0.32 } },
  ]);
  // The single op is scoreable-by-band but its params are unscoreable -> medians null -> divergent (not match, not NaN).
  assert.equal(r.n_ops_scored, 1);
  assert.equal(r.median_sfm_error_pct, null);
  assert.notEqual(r.verdict, "match");
});

test("representativeRefByBand: median over a band's OD ops; near-center ops excluded by dia_in", () => {
  // 3 rough OD ops (dia 1.5in) at Vc 70/76/82 -> median 76; plus 1 near-center 'rough' at Vc 8 (dia 0.04in) MUST be dropped.
  const ref = [opD("rough", 70, 0.25, 1.5), opD("rough", 76, 0.25, 1.5), opD("rough", 82, 0.25, 1.5), opD("rough", 8, 0.25, 0.04)];
  const rep = representativeRefByBand(ref);
  assert.equal(rep.get("rough").cutting_speed_m_min, 76, "median of OD ops (70,76,82) -- the near-center 8 m/min op is excluded");
  assert.equal(rep.get("rough").n_band, 4);
  assert.equal(rep.get("rough").n_used, 3, "only the 3 OD ops contribute to the median");
});

test("representativeRefByBand: a band whose every op is near-center yields NO representative (R12, no fabrication)", () => {
  // The classic confounder: every 'finish' op is a near-center G97 cut (dia < 0.2in) -> no OD finish exists.
  const ref = [opD("finish", 2.2, 0.11, 0.04), opD("finish", 2.4, 0.14, 0.03)];
  const rep = representativeRefByBand(ref);
  assert.equal(rep.has("finish"), false, "no OD finish op -> band dropped, not a fabricated 2 m/min comparison");
});

test("representativeRefByBand: ops with UNKNOWN dia_in are kept (missing data must not silently drop)", () => {
  const ref = [op("rough", 150, 0.3), op("rough", 160, 0.3)]; // no dia_in field at all
  const rep = representativeRefByBand(ref);
  assert.equal(rep.get("rough").cutting_speed_m_min, 155);
  assert.equal(rep.get("rough").n_used, 2);
});

test("representativeRefByBand: specialty bands (thread/part-off/groove) are excluded", () => {
  const rep = representativeRefByBand([opD("thread_single_point", 50, 1.5, 1.0), opD("part_off", 30, 0.1, 0.5)]);
  assert.equal(rep.size, 0);
});

test("matchOpBandRepresentative: PRISM's single OD op pairs to JM's MEDIAN OD op (not the k-th near-center one)", () => {
  // PRISM: one od_rough at 210 m/min. JM: a near-center 'rough' FIRST (8 m/min) then OD rough ops (median 76).
  // k-th pairing would hit the 8 m/min op; representative correctly pairs to the 76 m/min median.
  const gen = [op("od_rough", 210, 0.30)];
  const ref = [opD("rough", 8, 0.25, 0.04), opD("rough", 70, 0.25, 1.5), opD("rough", 82, 0.25, 1.5)];
  const pairs = matchOpBandRepresentative(gen, ref);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].reference.cutting_speed_m_min, 76, "paired against the OD median, not the leading near-center op");
  // and the scored result is divergent in the HONEST direction (210 vs 76 ~ 2.8x), not a fake match vs 8.
  const r = scorePairSet(pairs);
  assert.equal(r.verdict, "divergent");
});

test("matchOpBandRepresentative: at most one pairing per band; bands with no OD rep are dropped", () => {
  const gen = [op("od_rough", 210, 0.3), op("od_rough", 180, 0.3), op("od_finish", 320, 0.12)];
  const ref = [opD("rough", 70, 0.25, 1.5), opD("rough", 82, 0.25, 1.5), opD("finish", 2.2, 0.11, 0.04)]; // finish only near-center
  const pairs = matchOpBandRepresentative(gen, ref);
  assert.equal(pairs.length, 1, "one rough pairing (median 76); finish dropped -- no OD finish in ref");
  assert.equal(pairs[0].generated.cutting_speed_m_min, 210, "the FIRST gen rough is the one paired");
});

test("matchOpBandRepresentative: empty / mismatched inputs -> no pairs (no crash)", () => {
  assert.equal(matchOpBandRepresentative([], []).length, 0);
  assert.equal(matchOpBandRepresentative(null, undefined).length, 0);
  assert.equal(matchOpBandRepresentative([op("od_rough", 200, 0.3)], [op("od_finish", 240, 0.1)]).length, 0);
});
