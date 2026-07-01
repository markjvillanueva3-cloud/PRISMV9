// Tests for quoting-actuals-match.mjs (node:test). Real-value assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeDistribution,
  matchPredictedToActuals,
  loadActualPrices,
} from "./quoting-actuals-match.mjs";

// --- summarizeDistribution --------------------------------------------------
test("summarizeDistribution: median/mean/quartiles/total on a known set", () => {
  const s = summarizeDistribution([100, 200, 300, 400]);
  assert.equal(s.n, 4);
  assert.equal(s.total, 1000);
  assert.equal(s.mean, 250);
  assert.equal(s.median, 250);      // (200+300)/2
  assert.equal(s.min, 100);
  assert.equal(s.max, 400);
});

test("summarizeDistribution: filters non-positive/NaN, coerces strings", () => {
  const s = summarizeDistribution(["50", 0, -10, NaN, 150, Infinity]);
  assert.equal(s.n, 2);            // 50 + 150
  assert.equal(s.total, 200);
});

test("summarizeDistribution: empty / non-array -> null", () => {
  assert.equal(summarizeDistribution([]), null);
  assert.equal(summarizeDistribution(null), null);
  assert.equal(summarizeDistribution([0, -1, NaN]), null);
});

// --- matchPredictedToActuals (advisory calibration) -------------------------
test("match: predicted median == actual median -> ratio 1.0, calibrated", () => {
  const m = matchPredictedToActuals([90, 100, 110], [90, 100, 110]);
  assert.equal(m.ok, true);
  assert.equal(m.advisory, true);
  assert.equal(m.median_ratio, 1);
  assert.equal(m.verdict, "calibrated");
  assert.equal(m.actual_total_usd, 300);
});

test("match: predicted 2x actual -> over-quoting", () => {
  const m = matchPredictedToActuals([200, 200, 200], [100, 100, 100]);
  assert.equal(m.median_ratio, 2);
  assert.equal(m.verdict, "over-quoting");
});

test("match: predicted 0.5x actual -> under-quoting", () => {
  const m = matchPredictedToActuals([50, 50, 50], [100, 100, 100]);
  assert.equal(m.median_ratio, 0.5);
  assert.equal(m.verdict, "under-quoting");
});

test("match: within_band_pct counts predictions inside +/-25% of actual median", () => {
  // actual median 100 -> band [75,125]. predicted: 80(in),100(in),200(out) -> 2/3.
  const m = matchPredictedToActuals([80, 100, 200], [100, 100, 100]);
  assert.ok(Math.abs(m.within_band_pct - 2 / 3) < 1e-9);
});

test("match: missing side -> ok:false with reason (no throw)", () => {
  assert.equal(matchPredictedToActuals([], [100]).reason, "no-predictions");
  assert.equal(matchPredictedToActuals([100], []).reason, "no-actuals");
  assert.equal(matchPredictedToActuals(null, null).ok, false);
});

// --- loadActualPrices -------------------------------------------------------
const FIXTURE = JSON.stringify({
  schema_version: "1.0.0",
  actuals: [
    { actual_invoice_usd: 1400, extraction_confidence: 0.98 },
    { actual_invoice_usd: 350, extraction_confidence: 0.6 },
    { actual_invoice_usd: 90, extraction_confidence: 0.4 },   // below a 0.6 floor
    { actual_invoice_usd: 0, extraction_confidence: 0.9 },    // non-positive dropped
    { actual_invoice_usd: "bad", extraction_confidence: 0.9 }, // non-numeric dropped
  ],
});

test("loadActualPrices: parses {actuals:[]}, drops non-positive/non-numeric", () => {
  const r = loadActualPrices("x.jsonl", { readImpl: () => FIXTURE });
  assert.equal(r.count, 5);
  assert.deepEqual(r.prices.sort((a, b) => a - b), [90, 350, 1400]);
});

test("loadActualPrices: minConfidence floor filters low-confidence rows", () => {
  const r = loadActualPrices("x.jsonl", { readImpl: () => FIXTURE, minConfidence: 0.6 });
  assert.equal(r.withMinConf, 4); // the two real >=0.6 + the 0/bad (conf 0.9) survive the conf gate...
  // ...but only the priceable ones reach prices: 1400 (0.98) + 350 (0.6).
  assert.deepEqual(r.prices.sort((a, b) => a - b), [350, 1400]);
});

test("loadActualPrices: malformed / unreadable -> null (no throw)", () => {
  assert.equal(loadActualPrices("x", { readImpl: () => "not json" }), null);
  assert.equal(loadActualPrices("x", { readImpl: () => { throw new Error("enoent"); } }), null);
  // valid JSON but no actuals[] -> empty prices, not null
  assert.deepEqual(loadActualPrices("x", { readImpl: () => "{}" }).prices, []);
});

// --- real-data integration (the $355M dataset, if present) ------------------
test("loadActualPrices + match on the LIVE orders-closed-actuals.jsonl (if present)", () => {
  let r;
  try { r = loadActualPrices("H:/PRISM/state/shared/quoting/orders-closed-actuals.jsonl", { minConfidence: 0.6 }); }
  catch { r = null; }
  if (!r || r.prices.length === 0) { return; } // skip-soft when the dataset is absent
  const s = summarizeDistribution(r.prices);
  assert.ok(s.n > 0 && s.total > 0);
  // A predicted distribution offset 2x should read as over-quoting vs the real actuals.
  const m = matchPredictedToActuals(r.prices.map((p) => p * 2), r.prices);
  assert.equal(m.verdict, "over-quoting");
});
