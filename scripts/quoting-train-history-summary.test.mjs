/**
 * quoting-train-history-summary — iter11 unit test for closed-loop ledger reader.
 *
 * Run: node --test scripts/quoting-train-history-summary.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAIN-HISTORY-SUMMARY (charlie /goal-yolo iter11)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLedgerLines, summarizeLedger } from "./quoting-train-history-summary.mjs";

const r = (overrides = {}) => ({
  ts_iso: "2026-05-26T04:30:00.000Z",
  ok: true,
  reason: null,
  total_predicted: 50,
  mape_pct: 15,
  safe_to_activate: true,
  active_factor_written: true,
  active_factor_path: "H:/prism/state/shared/quoting/active-calibration.json",
  psi_delta_fed_count: 0,
  skip_reason: null,
  warnings_count: 0,
  ...overrides,
});

// ---------- parseLedgerLines ----------

test("parseLedgerLines: empty string yields []", () => {
  assert.deepEqual(parseLedgerLines(""), []);
});

test("parseLedgerLines: non-string yields []", () => {
  assert.deepEqual(parseLedgerLines(null), []);
  assert.deepEqual(parseLedgerLines(undefined), []);
  assert.deepEqual(parseLedgerLines(42), []);
  assert.deepEqual(parseLedgerLines({}), []);
});

test("parseLedgerLines: valid JSONL yields rows", () => {
  const text = JSON.stringify({ ok: true, mape_pct: 10 }) + "\n" + JSON.stringify({ ok: false });
  const rows = parseLedgerLines(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].mape_pct, 10);
  assert.equal(rows[1].ok, false);
});

test("parseLedgerLines: corrupt lines silently dropped", () => {
  const text = [
    JSON.stringify({ ok: true }),
    "{not valid json}",
    JSON.stringify({ ok: false }),
    "",
    "  ",
    "null",          // valid JSON but not an object — dropped
    "[1,2,3]",       // valid JSON array — dropped (we want objects)
    JSON.stringify({ ok: true, mape_pct: 5 }),
  ].join("\n");
  const rows = parseLedgerLines(text);
  assert.equal(rows.length, 3, "3 valid object rows survive");
});

test("parseLedgerLines: trailing newline tolerated", () => {
  const text = JSON.stringify({ ok: true }) + "\n\n\n";
  assert.equal(parseLedgerLines(text).length, 1);
});

// ---------- summarizeLedger: happy path ----------

test("summarizeLedger: clean run of 5 safe rows", () => {
  const rows = [
    r({ mape_pct: 20, safe_to_activate: true, psi_delta_fed_count: 1 }),
    r({ mape_pct: 18, safe_to_activate: true, psi_delta_fed_count: 1 }),
    r({ mape_pct: 16, safe_to_activate: true, psi_delta_fed_count: 2 }),
    r({ mape_pct: 14, safe_to_activate: true, psi_delta_fed_count: 1 }),
    r({ mape_pct: 12, safe_to_activate: true, psi_delta_fed_count: 1, ts_iso: "2026-05-26T05:00:00.000Z" }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.count, 5);
  assert.equal(s.window_n, 20);
  assert.equal(s.mape_pct_avg, 16);
  assert.equal(s.mape_trend, "falling"); // 20->12 monotone decrease
  assert.equal(s.cov_gate_fail_rate, 0);
  assert.equal(s.safe_to_activate_rate, 1);
  assert.equal(s.psi_delta_fed_total, 6);
  assert.equal(s.last_run_iso, "2026-05-26T05:00:00.000Z");
});

// ---------- failure mode 1: all CoV-gated ----------

test("summarizeLedger: all-gated yields cov_gate_fail_rate=1, safe_rate=0", () => {
  const rows = [
    r({ ok: true, safe_to_activate: false, active_factor_written: false, mape_pct: 300 }),
    r({ ok: true, safe_to_activate: false, active_factor_written: false, mape_pct: 312 }),
    r({ ok: true, safe_to_activate: false, active_factor_written: false, mape_pct: 280 }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.cov_gate_fail_rate, 1);
  assert.equal(s.safe_to_activate_rate, 0);
  assert.equal(s.mape_pct_p95, 312);
});

// ---------- failure mode 2: ok=false (engine error) doesn't count as gate-fail ----------

test("summarizeLedger: ok=false (engine error) is NOT a gate-fail (different signal class)", () => {
  const rows = [
    r({ ok: false, safe_to_activate: false }),
    r({ ok: false, safe_to_activate: false }),
    r({ ok: true, safe_to_activate: true }),
  ];
  const s = summarizeLedger(rows, 20);
  // Gate-fail = engine ran (ok=true) but CoV refused. Engine error (ok=false)
  // is a different failure class — must not be conflated.
  assert.equal(s.cov_gate_fail_rate, 0);
  assert.equal(s.safe_to_activate_rate, Math.round((1 / 3) * 1000) / 1000);
});

// ---------- failure mode 3: rising MAPE trend ----------

test("summarizeLedger: rising MAPE detected", () => {
  const rows = [
    r({ mape_pct: 10 }),
    r({ mape_pct: 15 }),
    r({ mape_pct: 20 }),
    r({ mape_pct: 25 }),
    r({ mape_pct: 30 }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.mape_trend, "rising");
});

// ---------- adversarial 1: NaN/Infinity mape_pct filtered ----------

test("summarizeLedger: NaN + Infinity mape_pct filtered from stats", () => {
  const rows = [
    r({ mape_pct: 10 }),
    r({ mape_pct: NaN }),
    r({ mape_pct: Infinity }),
    r({ mape_pct: 20 }),
    r({ mape_pct: null }),
    r({ mape_pct: "12.5" }), // wrong type
  ];
  const s = summarizeLedger(rows, 20);
  // Only 10 + 20 are finite numbers
  assert.equal(s.mape_pct_avg, 15);
});

// ---------- adversarial 2: null/undefined/empty rows ----------

test("summarizeLedger: null rows array yields zeroed summary", () => {
  const s = summarizeLedger(null, 20);
  assert.equal(s.count, 0);
  assert.equal(s.mape_pct_avg, null);
  assert.equal(s.cov_gate_fail_rate, 0);
});

test("summarizeLedger: empty rows array yields zeroed summary", () => {
  const s = summarizeLedger([], 20);
  assert.equal(s.count, 0);
  assert.equal(s.window_n, 20);
  assert.equal(s.mape_trend, "insufficient");
});

// ---------- adversarial 3: invalid windowN coerced to default ----------

test("summarizeLedger: NaN/negative/0/Infinity windowN coerced to 20", () => {
  for (const bad of [NaN, -5, 0, Infinity, "30", null]) {
    const s = summarizeLedger([r()], bad);
    assert.equal(s.window_n, 20, `windowN=${bad} should fall back to 20`);
  }
});

test("summarizeLedger: fractional windowN floored", () => {
  const s = summarizeLedger([r()], 5.7);
  assert.equal(s.window_n, 5);
});

// ---------- window: takes most-recent N ----------

test("summarizeLedger: window slices LAST N rows", () => {
  const rows = [];
  for (let i = 0; i < 30; i++) rows.push(r({ mape_pct: i, ts_iso: `2026-05-26T${String(i).padStart(2, "0")}:00:00.000Z` }));
  const s = summarizeLedger(rows, 5);
  assert.equal(s.count, 5);
  assert.equal(s.mape_pct_avg, (25 + 26 + 27 + 28 + 29) / 5);
  assert.equal(s.last_run_iso, "2026-05-26T29:00:00.000Z");
});

// ---------- boundary: single row ----------

test("summarizeLedger: single row yields trend=insufficient, valid percentiles", () => {
  const s = summarizeLedger([r({ mape_pct: 42, safe_to_activate: true })], 20);
  assert.equal(s.count, 1);
  assert.equal(s.mape_pct_avg, 42);
  assert.equal(s.mape_pct_p50, 42);
  assert.equal(s.mape_pct_p95, 42);
  assert.equal(s.mape_trend, "insufficient");
  assert.equal(s.safe_to_activate_rate, 1);
});

// ---------- boundary: 2 rows -> trend insufficient (need >= 3) ----------

test("summarizeLedger: 2 rows -> trend=insufficient", () => {
  const s = summarizeLedger([r({ mape_pct: 10 }), r({ mape_pct: 20 })], 20);
  assert.equal(s.mape_trend, "insufficient");
});

// ---------- boundary: flat trend (all same value) ----------

test("summarizeLedger: flat MAPE yields trend=flat", () => {
  const rows = Array.from({ length: 5 }, () => r({ mape_pct: 15 }));
  const s = summarizeLedger(rows, 20);
  assert.equal(s.mape_trend, "flat");
});

// ---------- shape stability: exact 16-key summary ----------

test("summarizeLedger: stable 16-key summary shape", () => {
  const s = summarizeLedger([r()], 20);
  const expected = [
    "count",
    "window_n",
    "mape_pct_avg",
    "mape_pct_p50",
    "mape_pct_p95",
    "mape_trend",
    "cov_gate_fail_rate",
    "safe_to_activate_rate",
    "psi_delta_fed_total",
    "latest_factor_path",
    "last_run_iso",
    // U-QP-DRIFT-REF-RELIABILITY: calibration-reference health trend (from the iter10 ledger fields)
    "reference_measured_count",
    "reference_unreliable_count",
    "reference_unreliable_rate",
    "latest_reliability_verdict",
    "reference_drift_alert",
  ];
  assert.deepEqual(Object.keys(s).sort(), [...expected].sort());
});

// ---------- iter12: reference-reliability trend + drift alert (U-QP-DRIFT-REF-RELIABILITY) ----------

test("summarizeLedger: counts only MEASURED reference rows (boolean), excludes null/unmeasured", () => {
  const rows = [
    r({ reference_reliable: true, reliability_verdict: "ok" }),
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
    r({}), // unmeasured (no reference_reliable) — must NOT count toward measured
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.reference_measured_count, 2);
  assert.equal(s.reference_unreliable_count, 1);
  assert.equal(s.reference_unreliable_rate, 0.5);
});

test("summarizeLedger: all-unmeasured window → rate null + no drift alert (never fabricates a signal)", () => {
  const rows = [r({}), r({}), r({})]; // no reference_reliable on any row
  const s = summarizeLedger(rows, 20);
  assert.equal(s.reference_measured_count, 0);
  assert.equal(s.reference_unreliable_rate, null);
  assert.equal(s.reference_drift_alert, false);
});

test("summarizeLedger: reference_drift_alert fires when a majority of >=3 measured cycles are unreliable", () => {
  const rows = [
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
    r({ reference_reliable: false, reliability_verdict: "insufficient-reference" }),
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
    r({ reference_reliable: true, reliability_verdict: "ok" }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.reference_measured_count, 4);
  assert.equal(s.reference_unreliable_count, 3);
  assert.equal(s.reference_unreliable_rate, 0.75);
  assert.equal(s.reference_drift_alert, true);
});

test("summarizeLedger: drift alert does NOT fire below the 3-measured minimum (even at 100% unreliable)", () => {
  const rows = [
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.reference_measured_count, 2);
  assert.equal(s.reference_unreliable_rate, 1);
  assert.equal(s.reference_drift_alert, false); // 2 measured < 3 minimum → no fabricated alert
});

test("summarizeLedger: latest_reliability_verdict reflects the most recent row", () => {
  const rows = [
    r({ reference_reliable: false, reliability_verdict: "degenerate-reference" }),
    r({ reference_reliable: true, reliability_verdict: "ok", ts_iso: "2026-05-26T06:00:00.000Z" }),
  ];
  const s = summarizeLedger(rows, 20);
  assert.equal(s.latest_reliability_verdict, "ok");
});

// ---------- variability: 3 distinct scenario shapes ----------

test("summarizeLedger: variability — improving / regressing / stalled scenarios distinct", () => {
  const improving = summarizeLedger(
    Array.from({ length: 5 }, (_, i) => r({ mape_pct: 50 - i * 8, safe_to_activate: true })),
    20,
  );
  const regressing = summarizeLedger(
    Array.from({ length: 5 }, (_, i) => r({ mape_pct: 10 + i * 8, safe_to_activate: false, ok: true })),
    20,
  );
  const stalled = summarizeLedger(
    Array.from({ length: 5 }, () => r({ ok: false, safe_to_activate: false, mape_pct: null })),
    20,
  );

  assert.equal(improving.mape_trend, "falling");
  assert.equal(improving.safe_to_activate_rate, 1);
  assert.equal(improving.cov_gate_fail_rate, 0);

  assert.equal(regressing.mape_trend, "rising");
  assert.equal(regressing.safe_to_activate_rate, 0);
  assert.equal(regressing.cov_gate_fail_rate, 1);

  assert.equal(stalled.mape_pct_avg, null);
  assert.equal(stalled.mape_trend, "insufficient");
  assert.equal(stalled.safe_to_activate_rate, 0);
  assert.equal(stalled.cov_gate_fail_rate, 0); // ok=false so not gate-fail
});

// ---------- integration: parseLedgerLines + summarizeLedger roundtrip ----------

test("integration: write JSONL -> parse -> summarize round-trip", () => {
  const original = [r({ mape_pct: 10 }), r({ mape_pct: 20 }), r({ mape_pct: 30 })];
  const jsonl = original.map(o => JSON.stringify(o)).join("\n") + "\n";
  const parsed = parseLedgerLines(jsonl);
  assert.equal(parsed.length, 3);
  const s = summarizeLedger(parsed, 20);
  assert.equal(s.count, 3);
  assert.equal(s.mape_pct_avg, 20);
  assert.equal(s.mape_trend, "rising");
});
