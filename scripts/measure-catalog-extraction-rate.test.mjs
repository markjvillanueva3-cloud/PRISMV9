// scripts/measure-catalog-extraction-rate.test.mjs
// Tests for the real-data rate measurement (BLACKWELL-DB-GEN-MS0/U-CGP-MEASURE).
// Verifies the MEASURED serial rate is derived honestly from checkpoint deltas (idle gaps
// excluded, failed prints drag the rate) and that projection refuses to fabricate.
// Run: node --test scripts/measure-catalog-extraction-rate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckpointRecords, measureSerialRate, projectFromCheckpoint } from "./measure-catalog-extraction-rate.mjs";

const MIN = 60000; // ms per minute
const bw = { name: "blackwell", concurrency: 3, overnightGated: false };

// ── parseCheckpointRecords ─────────────────────────────────────────
test("parseCheckpointRecords: parses + time-orders records", () => {
  const text = [
    JSON.stringify({ ts: "2026-06-04T00:02:00Z", pages_ok: 3, ok: true }),
    JSON.stringify({ ts: "2026-06-04T00:00:00Z", pages_ok: 2, ok: true }),
  ].join("\n");
  const r = parseCheckpointRecords(text);
  assert.equal(r.length, 2);
  assert.ok(r[0].ts < r[1].ts, "sorted ascending by ts");
  assert.equal(r[0].pages_ok, 2);
});
test("parseCheckpointRecords: skips blank/malformed/unparseable-ts lines", () => {
  const text = [
    "",
    "not json",
    JSON.stringify({ pages_ok: 5 }), // no ts → skipped
    JSON.stringify({ ts: "garbage", pages_ok: 1 }), // unparseable ts → skipped
    JSON.stringify({ ts: "2026-06-04T00:00:00Z", pages_ok: 4, ok: true }),
  ].join("\n");
  const r = parseCheckpointRecords(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].pages_ok, 4);
});
test("parseCheckpointRecords: missing pages_ok defaults to 0; non-string → []", () => {
  assert.deepEqual(parseCheckpointRecords(null), []);
  const r = parseCheckpointRecords(JSON.stringify({ ts: "2026-06-04T00:00:00Z", ok: false }));
  assert.equal(r[0].pages_ok, 0);
});

// ── measureSerialRate ──────────────────────────────────────────────
test("measureSerialRate: <2 records → ok:false (refuses to fabricate)", () => {
  assert.equal(measureSerialRate([]).ok, false);
  assert.equal(measureSerialRate([{ ts: 0, pages_ok: 3 }]).ok, false);
});
test("measureSerialRate: one interval — rate = this print's pages / its wall minutes", () => {
  // 1-min gap, 2nd print produced 3 pages → 3 pages / 1 min = 3 pages/min/worker
  const r = measureSerialRate([{ ts: 0, pages_ok: 2 }, { ts: 1 * MIN, pages_ok: 3 }]);
  assert.equal(r.ok, true);
  assert.equal(r.pagesPerMinPerWorker, 3);
  assert.equal(r.intervals, 1);
  assert.equal(r.pagesMeasured, 3);
});
test("measureSerialRate: between-run idle gap is EXCLUDED from active time", () => {
  const recs = [
    { ts: 0, pages_ok: 2 },
    { ts: 1 * MIN, pages_ok: 2 }, // 1-min interval, counted
    { ts: 1 * MIN + 40 * MIN, pages_ok: 5 }, // 40-min gap > 30 → idle, excluded
  ];
  const r = measureSerialRate(recs, 30);
  assert.equal(r.intervals, 1, "only the contiguous interval counted");
  assert.equal(r.idleSkipped, 1);
  assert.equal(r.pagesPerMinPerWorker, 2); // 2 pages / 1 min
});
test("measureSerialRate: a FAILED print (0 pages) drags the realized rate down", () => {
  // intervals: [0→1min:0 pages][1min→2min:4 pages] → 4 pages / 2 active min = 2 pages/min
  const r = measureSerialRate([{ ts: 0, pages_ok: 9 }, { ts: 1 * MIN, pages_ok: 0 }, { ts: 2 * MIN, pages_ok: 4 }], 30);
  assert.equal(r.intervals, 2);
  assert.equal(r.activeMin, 2);
  assert.equal(r.pagesPerMinPerWorker, 2);
});
test("measureSerialRate: all gaps > threshold → ok:false", () => {
  const r = measureSerialRate([{ ts: 0, pages_ok: 2 }, { ts: 99 * MIN, pages_ok: 2 }], 30);
  assert.equal(r.ok, false);
});
test("measureSerialRate: duplicate/out-of-order ts (dt≤0) skipped, not negative time", () => {
  const r = measureSerialRate([{ ts: 5 * MIN, pages_ok: 2 }, { ts: 5 * MIN, pages_ok: 3 }, { ts: 6 * MIN, pages_ok: 4 }], 30);
  assert.equal(r.ok, true);
  assert.equal(r.intervals, 1); // the dt=0 pair skipped, only 5→6min counted
  assert.equal(r.pagesPerMinPerWorker, 4);
});
test("measureSerialRate: zero-pages-everywhere → ok:false (no real throughput)", () => {
  const r = measureSerialRate([{ ts: 0, pages_ok: 0 }, { ts: 1 * MIN, pages_ok: 0 }], 30);
  assert.equal(r.ok, false);
});

// ── projectFromCheckpoint (real-data → Blackwell projection) ────────
const goodRecs = [
  { ts: 0, pages_ok: 2 },
  { ts: 1 * MIN, pages_ok: 2 },
  { ts: 2 * MIN, pages_ok: 2 },
]; // 2 intervals, 4 pages / 2 min → 2 pages/min/worker

test("projectFromCheckpoint: measured rate feeds estimateExtractionPlan, bounded by ollamaParallel", () => {
  const res = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: 2, totalPages: 300 });
  assert.equal(res.ok, true);
  assert.equal(res.measured.pagesPerMinPerWorker, 2);
  assert.equal(res.plan.workers, 3);
  assert.equal(res.plan.effectiveWorkers, 2, "bounded by OLLAMA_NUM_PARALLEL=2");
  assert.equal(res.plan.concurrencySpeedup, 2);
  assert.equal(res.ollamaParallelVerified, true);
});
test("projectFromCheckpoint: ollamaParallel ≥ workers → full worker speedup", () => {
  const res = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: 4, totalPages: 300 });
  assert.equal(res.plan.effectiveWorkers, 3);
  assert.equal(res.plan.concurrencySpeedup, 3);
});
test("projectFromCheckpoint: ollamaParallel null/omitted → optimistic (== workers), flagged unverified", () => {
  const res = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: null, totalPages: 300 });
  assert.equal(res.plan.effectiveWorkers, 3); // optimistic
  assert.equal(res.ollamaParallelVerified, false);
});
test("projectFromCheckpoint: defaults totalPages to the measured page count when not given", () => {
  const res = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: 2 });
  assert.equal(res.ok, true);
  assert.equal(res.totalPages, res.measured.pagesMeasured);
});
test("projectFromCheckpoint: surfaces recommendedParallel + underProvisioned (the config lever)", () => {
  // blackwell recommends 4 slots; live=2 → under-provisioned (the lever between measured 2× and 3×)
  const under = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: 2, totalPages: 300 });
  assert.equal(under.recommendedParallel, 4);
  assert.equal(under.underProvisioned, true);
  // live=4 ≥ recommended → not under
  assert.equal(projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: 4, totalPages: 300 }).underProvisioned, false);
  // unset (null) is UNVERIFIED, not underProvisioned (don't false-warn)
  const unset = projectFromCheckpoint({ records: goodRecs, profile: bw, ollamaParallel: null, totalPages: 300 });
  assert.equal(unset.underProvisioned, false);
  assert.equal(unset.recommendedParallel, 4);
});
test("projectFromCheckpoint: insufficient checkpoint data → ok:false (never invents a rate)", () => {
  assert.equal(projectFromCheckpoint({ records: [{ ts: 0, pages_ok: 2 }], profile: bw, ollamaParallel: 2 }).ok, false);
  assert.equal(projectFromCheckpoint({ records: [], profile: bw, ollamaParallel: 2 }).ok, false);
});
