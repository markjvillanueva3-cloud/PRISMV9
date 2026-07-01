/**
 * lathe-min-op-params.test.mjs -- slot:whiskey  [reference-side .MIN extractor tests]
 * Real reference-value tests on a known .MIN snippet. Run: node scripts/lib/lathe-min-op-params.test.mjs
 * R9: each test encodes WHY the value matters (a hardcoded-return impl fails).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SFM_PER_M_MIN } from "./lathe-band-score.mjs";
import { parseMinOpParams, classifyMinOp, MM_PER_INCH } from "./lathe-min-op-params.mjs";

test("classifyMinOp: thread/drill explicit; IPR magnitude splits rough vs finish", () => {
  assert.equal(classifyMinOp({ feedIpr: 0.008, isThread: false, isDrill: false }), "rough");  // >= 0.006
  assert.equal(classifyMinOp({ feedIpr: 0.003, isThread: false, isDrill: false }), "finish"); // 0 < f < 0.006
  assert.equal(classifyMinOp({ feedIpr: 0.05, isThread: true, isDrill: false }), "thread");   // thread wins
  assert.equal(classifyMinOp({ feedIpr: 0.005, isThread: false, isDrill: true }), "drill");   // drill wins
  assert.equal(classifyMinOp({ feedIpr: null, isThread: false, isDrill: false }), "rapid");   // no feed
});

test("parseMinOpParams: G96 CSS program -> per-op SFM=G96 value + metric conversion", () => {
  const min = [
    "G50 S3000",
    "G96 S400 M3",
    "G0 X1.05 Z0.1",
    "G1 X1.0 Z-0.5 F0.008",   // rough cut (css SFM 400)
    "G1 X0.98 Z-0.6 F0.003",  // finish cut
  ].join("\n");
  const r = parseMinOpParams(min);
  assert.equal(r.usesG96, true);
  assert.equal(r.usesG97, false);
  assert.equal(r.g50cap, 3000);
  assert.equal(r.ops.length, 2);

  const rough = r.ops[0];
  assert.equal(rough.operation_type, "rough");
  assert.equal(rough.sfm, 400);
  assert.equal(rough.feed_ipr, 0.008);
  assert.ok(Math.abs(rough.cutting_speed_m_min - 400 / SFM_PER_M_MIN) < 1e-6); // ~121.92 m/min
  assert.ok(Math.abs(rough.feed_mm_rev - 0.008 * MM_PER_INCH) < 1e-9);          // 0.2032 mm/rev

  assert.equal(r.ops[1].operation_type, "finish");
  assert.equal(r.ops[1].feed_ipr, 0.003);
});

test("parseMinOpParams: G97 RPM program -> SFM = pi*D*RPM/12 at cut diameter", () => {
  const min = ["G97 S2000 M3", "G0 X1.0 Z0.1", "G1 X1.0 Z-0.5 F0.005"].join("\n");
  const r = parseMinOpParams(min);
  assert.equal(r.usesG97, true);
  assert.equal(r.ops.length, 1);
  // pi * 1.0in * 2000rpm / 12 = 523.60 SFM
  assert.ok(Math.abs(r.ops[0].sfm - (Math.PI * 1.0 * 2000) / 12) < 1e-6);
  assert.equal(r.ops[0].operation_type, "finish");
});

test("parseMinOpParams: a THREAD-commented cut is classified specialty (thread), not rough", () => {
  const r = parseMinOpParams(["G97 S800", "G1 X0.5 Z-1.0 F0.05 (THREAD)"].join("\n"));
  assert.equal(r.ops.length, 1);
  assert.equal(r.ops[0].operation_type, "thread");
});

test("parseMinOpParams: a Z-only linear plunge on center is a centerline DRILL, not a turning pass", () => {
  // lastX set to 0.02 (< 0.03) by the prior rapid, then a G1 Z-only move with no restated X.
  const r = parseMinOpParams(["G97 S1500", "G0 X0.02 Z0.1", "G1 Z-1.0 F0.005"].join("\n"));
  assert.equal(r.ops.length, 1);
  assert.equal(r.ops[0].operation_type, "drill");
});

test("parseMinOpParams: rapids (G0) are not cuts; metric round-trips back to SFM", () => {
  const r = parseMinOpParams(["G96 S300", "G0 X2.0 Z0.5", "G1 X2.0 Z-1.0 F0.01"].join("\n"));
  assert.equal(r.ops.length, 1); // only the G1 cut
  // round-trip: cutting_speed_m_min * SFM_PER_M_MIN == sfm
  assert.ok(Math.abs(r.ops[0].cutting_speed_m_min * SFM_PER_M_MIN - r.ops[0].sfm) < 1e-6);
});

test("parseMinOpParams: empty / null input -> no ops, no crash", () => {
  assert.deepEqual(parseMinOpParams("").ops, []);
  assert.deepEqual(parseMinOpParams(null).ops, []);
  assert.equal(parseMinOpParams("").usesG96, false);
});

test("parseMinOpParams: a large F (mm/min, not per-rev) is rejected as IPR -> feed null", () => {
  // F250 (>1) is not a sane IPR -> feed_ipr null -> op 'rapid' (no scoreable feed).
  const r = parseMinOpParams(["G97 S1000", "G1 X1.0 Z-0.5 F250"].join("\n"));
  assert.equal(r.ops.length, 1);
  assert.equal(r.ops[0].feed_ipr, null);
  assert.equal(r.ops[0].feed_mm_rev, null);
});

test("parseMinOpParams: per-op cut DIAMETER (dia_in/dia_mm) is exposed for OD-vs-near-center discrimination", () => {
  // An OD cut at X1.5 and a near-center cut at X0.04 -- the representative scorer needs to tell them apart.
  const r = parseMinOpParams([
    "G97 S680 M3",
    "G0 X1.5 Z0.1",
    "G1 X1.5 Z-0.5 F0.01",   // OD cut: dia_in 1.5
    "G0 X0.04 Z0.1",
    "G1 X0.04 Z-0.2 F0.003", // near-center cut: dia_in 0.04 (~7 SFM at 680rpm -- genuinely low, not a bug)
  ].join("\n"));
  assert.equal(r.ops.length, 2);
  assert.equal(r.ops[0].dia_in, 1.5);
  assert.ok(Math.abs(r.ops[0].dia_mm - 1.5 * MM_PER_INCH) < 1e-9); // 38.1 mm
  assert.equal(r.ops[1].dia_in, 0.04, "near-center op carries its tiny diameter so the OD filter can drop it");
});
