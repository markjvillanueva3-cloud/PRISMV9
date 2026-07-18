/**
 * lathe-band-score.test.mjs -- slot:whiskey  [U-W2C tests]
 * Real reference-value + algebraic-invariant tests for the Rung C-CAD scoring
 * core. Run: node scripts/lib/lathe-band-score.test.mjs  (node:test auto-runs).
 *
 * R9: each test encodes WHY the value matters (a hardcoded-return impl fails).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  SFM_PER_M_MIN, sfmFromMetric, iprFromMmRev, classifyOpBand,
  bandMembership, scoreOp, scoreProgram,
} from "./lathe-band-score.mjs";

// Illustrative bands -- shape-representative of the live op_parameter_reference
// percentile structure (NOT byte-fidelity to the live percentiles; the lib is
// band-agnostic and loads the real bands in production). Chosen to make the
// in-band/out-of-band test cases unambiguous. A SEPARATE live-schema contract
// test below pins the real-file key/field shape (R9).
const OP_REF = {
  rough:  { feed_ipr: { p05: 0.001, p25: 0.002, p50: 0.004, p75: 0.006, p95: 0.012 },
            sfm:      { p05: 50,    p25: 120,   p50: 200,   p75: 320,   p95: 900 } },
  finish: { feed_ipr: { p05: 0.001, p25: 0.0015, p50: 0.003, p75: 0.0045, p95: 0.005 },
            sfm:      { p05: 10,    p25: 94,     p50: 150,   p75: 250,    p95: 1500 } },
  drill:  { feed_ipr: { p05: 0.002, p25: 0.004, p50: 0.006, p75: 0.008, p95: 0.012 },
            sfm:      { p05: 30,    p25: 60,    p50: 90,    p75: 140,   p95: 300 } },
};

// ---- unit conversions (reference values) -------------------------------
test("sfmFromMetric: 100 m/min = 328.0839895 SFM (exact)", () => {
  assert.ok(Math.abs(sfmFromMetric(100) - 328.0839895) < 1e-6);
  assert.equal(SFM_PER_M_MIN, 3.280839895);
});
test("iprFromMmRev: 0.254 mm/rev = exactly 0.01 IPR", () => {
  assert.ok(Math.abs(iprFromMmRev(0.254) - 0.01) < 1e-12);
  // 0.0762 mm/rev = 0.003 IPR (finish p50)
  assert.ok(Math.abs(iprFromMmRev(0.0762) - 0.003) < 1e-12);
});

// ---- op classification -------------------------------------------------
test("classifyOpBand: maps op types to band keys correctly", () => {
  assert.equal(classifyOpBand("od_rough"), "rough");
  assert.equal(classifyOpBand("bore_rough"), "rough");
  assert.equal(classifyOpBand("id_finish"), "finish");
  assert.equal(classifyOpBand("face_finish"), "finish");
  assert.equal(classifyOpBand("taper"), "finish");
  assert.equal(classifyOpBand("drill"), "drill");
  assert.equal(classifyOpBand("center_drill"), "drill");
  // specialty: specialized feed regimes excluded from the general cloud
  assert.equal(classifyOpBand("od_thread"), "specialty");
  assert.equal(classifyOpBand("thread_single_point"), "specialty");
  assert.equal(classifyOpBand("part_off"), "specialty");
  assert.equal(classifyOpBand("groove"), "specialty");
});
test("classifyOpBand: unknown/empty -> specialty (not falsely band-scored)", () => {
  assert.equal(classifyOpBand("flux_capacitor"), "specialty");
  assert.equal(classifyOpBand(""), "specialty");
  assert.equal(classifyOpBand(null), "specialty");
  assert.equal(classifyOpBand(undefined), "specialty");
});

// ---- band membership (loose vs tight) ----------------------------------
test("bandMembership: p50 value is in both loose and tight bands", () => {
  const m = bandMembership(150, OP_REF.finish.sfm); // 150 = finish sfm p50
  assert.equal(m.valid, true);
  assert.equal(m.in_p05_p95, true);
  assert.equal(m.in_p25_p75, true);
  assert.equal(m.p50, 150);
});
test("bandMembership: a value in the tail is loose-in but tight-out", () => {
  const m = bandMembership(50, OP_REF.finish.sfm); // between p05(10) and p25(94)
  assert.equal(m.in_p05_p95, true);
  assert.equal(m.in_p25_p75, false);
});

// ---- FAILURE MODE 1: value below the whole band ------------------------
test("FAILURE: value below p05 is in neither band", () => {
  const m = bandMembership(5, OP_REF.finish.sfm); // < p05(10)
  assert.equal(m.in_p05_p95, false);
  assert.equal(m.in_p25_p75, false);
});
// ---- FAILURE MODE 2: value above the whole band ------------------------
test("FAILURE: value above p95 is in neither band", () => {
  const m = bandMembership(2000, OP_REF.finish.sfm); // > p95(1500)
  assert.equal(m.in_p05_p95, false);
});
// ---- FAILURE MODE 3: missing band for the op classification ------------
test("FAILURE: op with no matching band -> scored=false, reason no-band", () => {
  const op = { op_number: 1, operation_type: "od_rough", cutting_params: { cutting_speed_m_min: 60, feed_mm_rev: 0.1 } };
  const s = scoreOp(op, { /* rough band absent */ finish: OP_REF.finish });
  assert.equal(s.scored, false);
  assert.equal(s.reason, "no-band-for:rough");
});

// ---- ADVERSARIAL 1: NaN cutting speed ----------------------------------
test("ADVERSARIAL: NaN cutting_speed is never in band", () => {
  const m = bandMembership(NaN, OP_REF.rough.sfm);
  assert.equal(m.valid, false);
  assert.equal(m.in_p05_p95, false);
});
// ---- ADVERSARIAL 2: Infinity / negative feed --------------------------
test("ADVERSARIAL: Infinity and negative values are never in band", () => {
  assert.equal(bandMembership(Infinity, OP_REF.rough.feed_ipr).in_p05_p95, false);
  assert.equal(bandMembership(-5, OP_REF.rough.sfm).in_p05_p95, false);
});

// ---- scoreOp happy path (real values) ----------------------------------
test("scoreOp: a typical rough op scores in-band on SFM and IPR", () => {
  // 60 m/min -> 196.85 SFM (rough band p25..p75 = 120..320 -> tight in)
  // 0.1 mm/rev -> 0.003937 IPR (rough band p25..p75 = 0.002..0.006 -> tight in)
  const op = { op_number: 2, operation_type: "od_rough", cutting_params: { cutting_speed_m_min: 60, feed_mm_rev: 0.1 } };
  const s = scoreOp(op, OP_REF);
  assert.equal(s.scored, true);
  assert.equal(s.band, "rough");
  assert.equal(s.sfm.in_p05_p95, true);
  assert.equal(s.sfm.in_p25_p75, true);
  assert.equal(s.ipr.in_p25_p75, true);
});
test("scoreOp: specialty op (threading) is not band-scored", () => {
  const op = { op_number: 3, operation_type: "od_thread", cutting_params: { cutting_speed_m_min: 30, feed_mm_rev: 1.5 } };
  const s = scoreOp(op, OP_REF);
  assert.equal(s.scored, false);
  assert.equal(s.reason, "specialty-op-not-band-scored");
});

// ---- scoreProgram aggregate (real reference) ---------------------------
test("scoreProgram: aggregates loose/tight in-band rates; excludes specialty", () => {
  const operations = [
    { op_number: 1, operation_type: "od_rough",  cutting_params: { cutting_speed_m_min: 60,  feed_mm_rev: 0.1 } },   // in-band
    { op_number: 2, operation_type: "od_finish", cutting_params: { cutting_speed_m_min: 60,  feed_mm_rev: 0.08 } },  // sfm 196.8 (finish tight 94..250 in); ipr 0.00315 (finish tight 0.0015..0.0045 in)
    { op_number: 3, operation_type: "od_thread", cutting_params: { cutting_speed_m_min: 30,  feed_mm_rev: 1.5 } },   // specialty -> excluded
    { op_number: 4, operation_type: "od_rough",  cutting_params: { cutting_speed_m_min: 400, feed_mm_rev: 0.02 } },  // sfm 1312 (>p95 900 loose-out); ipr 0.000787 (<p05 0.001 loose-out)
  ];
  const r = scoreProgram(operations, OP_REF);
  assert.equal(r.total_ops, 4);
  assert.equal(r.band_scored_ops, 3);  // op3 specialty excluded
  assert.equal(r.specialty_ops, 1);
  // 2 of 3 scored ops have sfm in the loose band -> 66.7%
  assert.equal(r.sfm_in_band_pct, 66.7);
  assert.ok(r.both_in_band_pct !== null);
});

// ---- FAILURE MODE: empty / all-specialty program returns null, not NaN --
test("FAILURE: empty operations -> null rates (never NaN)", () => {
  const r = scoreProgram([], OP_REF);
  assert.equal(r.total_ops, 0);
  assert.equal(r.band_scored_ops, 0);
  assert.equal(r.sfm_in_band_pct, null);
  assert.equal(r.both_in_band_pct, null);
});
test("FAILURE: non-array operations -> null rates (never throws)", () => {
  const r = scoreProgram(null, OP_REF);
  assert.equal(r.total_ops, 0);
  assert.equal(r.sfm_in_band_pct, null);
});

// ---- LIVE-SCHEMA CONTRACT (R9): pin the real op_parameter_reference shape ----
// The lib reads opRef[band].{sfm,feed_ipr}.{p05,p25,p50,p75,p95}. If the live
// Rung A dashboard exists, assert it still exposes that shape for >=1 band so a
// schema drift in the source file fails loudly here (the lib's own guards
// fail-soft to "no-band", which would silently zero the score otherwise).
test("LIVE CONTRACT: real Rung A bands expose the keys/fields the lib reads (skips if absent)", () => {
  const LIVE = "H:/prism/state/shared/dashboards/lathe-jmdie-param-accuracy.json";
  if (!existsSync(LIVE)) return; // hermetic: skip when the corpus dashboard is not present
  const ref = JSON.parse(readFileSync(LIVE, "utf8")).op_parameter_reference;
  assert.ok(ref && typeof ref === "object", "op_parameter_reference present");
  // At least the three bands the lib classifies into must exist with the percentile fields.
  for (const band of ["rough", "finish", "drill"]) {
    assert.ok(ref[band], `band '${band}' present`);
    for (const metric of ["sfm", "feed_ipr"]) {
      const s = ref[band][metric];
      assert.ok(s, `${band}.${metric} present`);
      for (const p of ["p05", "p25", "p50", "p75", "p95"]) {
        assert.ok(Number.isFinite(s[p]), `${band}.${metric}.${p} is finite`);
      }
    }
    // The lib must actually classify+score against this live band shape:
    const op = { operation_type: band === "drill" ? "drill" : `od_${band}`,
      cutting_params: { cutting_speed_m_min: 60, feed_mm_rev: 0.1 } };
    const scored = scoreOp(op, ref);
    assert.equal(scored.scored, true, `lib scores a ${band} op against the live band`);
  }
});
