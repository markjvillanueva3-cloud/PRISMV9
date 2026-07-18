/**
 * quoting-pipeline-e2e — round-trip composition test across iter9-16.
 *
 * Per COMPREHENSIVE-BUILD-ENFORCEMENT R2: every new engine ships with a round-trip
 * E2E assertion. iter9-16 each had unit tests in isolation; iter17 ships the
 * E2E chain test that proves they compose correctly end-to-end.
 *
 * Pipeline under test (pure-function half — no FS):
 *   1. deriveRecordDefaults (iter13) — synthesize a per-record variance from path+size
 *   2. summarizeRecordsDistribution (iter16) — verify variance was actually injected
 *   3. buildLedgerRow (iter10) — convert a training result into a JSONL row
 *   4. parseLedgerLines (iter11) — round-trip the JSONL serialization
 *   5. summarizeLedger (iter11) — aggregate the parsed rows
 *   6. detectDriftAlert (iter12) — classify the summary
 *   7. buildDriftStateFile (iter15) — emit the on-disk state-file shape
 *
 * No FS, no main()-triggering. Pure composition. If this fails, one of the
 * shape contracts between iters has drifted.
 *
 * Run: node --test scripts/quoting-pipeline-e2e.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-PIPELINE-E2E-TEST (charlie /goal-yolo iter17)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { deriveRecordDefaults, summarizeRecordsDistribution } from "./quoting-baseline-bootstrap.mjs";
import { buildLedgerRow } from "./quoting-train-cycle.mjs";
import { parseLedgerLines, summarizeLedger } from "./quoting-train-history-summary.mjs";
import { detectDriftAlert } from "./quoting-train-drift-alert.mjs";
import { buildDriftStateFile } from "./quoting-train-drift-alert.mjs";

// ---------- Synthetic JM-Die-shaped fixtures ----------

const synthFilePaths = [
  { abs_path: "H:/PRISM/JM DIE/CNC MILL/ALCOA/p1.MIN", size_bytes: 30_000, customer: "ALCOA" },
  { abs_path: "H:/PRISM/JM DIE/WIRE EDM/ITW/p2.NC", size_bytes: 200_000, customer: "ITW" },
  { abs_path: "H:/PRISM/JM DIE/LATHE/BRADY/p3.CNC", size_bytes: 2_000_000, customer: "BRADY" },
  { abs_path: "H:/PRISM/JM DIE/SINKER/OPTIMAS/p4.NC", size_bytes: 100_000, customer: "OPTIMAS" },
  { abs_path: "H:/PRISM/JM DIE/GRINDER/SFS/p5.NC", size_bytes: 30_000, customer: "SFS" },
  { abs_path: "H:/PRISM/JM DIE/CNC MILL/ALCOA/p6.MIN", size_bytes: 10_000_000, customer: "ALCOA" },
];

function syntheticBaselineRecords() {
  return synthFilePaths.map(f => {
    const d = deriveRecordDefaults(f.abs_path, f.size_bytes);
    return {
      customer: f.customer,
      part_id: f.abs_path.split("/").pop().replace(/\.[A-Z]+$/i, ""),
      doc_date: "2026-05-26",
      actual_revenue_usd: Math.max(10, Math.round(f.size_bytes * 0.0001 * 100) / 100),
      ...d,
    };
  });
}

function syntheticTrainingResults(records) {
  // Simulate a 5-cycle history: cycle 1 catastrophic (cold start), cycles 2-5
  // converging (typical training-loop trajectory).
  const mapes = [2108, 850, 200, 80, 35];
  return mapes.map((mape, i) => ({
    ok: true,
    reason: undefined,
    report: { total_predicted: records.length, metrics: { mape_pct: mape } },
    safe_to_activate: mape < 100,
    active_factor_written: mape < 100,
    active_factor_path: mape < 100 ? "H:/prism/state/shared/quoting/active-calibration.json" : null,
    psi_delta_fed_count: mape < 100 ? i : 0,
    skip_reason: mape >= 100 ? `cov-gate-failed: mape=${mape}` : null,
    warnings: [],
  }));
}

// ---------- E2E composition test ----------

test("E2E: iter9-16 chain composes end-to-end against synthetic JM-Die cohort", () => {
  // Stage 1: iter13 — synthesize per-record defaults from path + size
  const records = syntheticBaselineRecords();
  assert.equal(records.length, 6);
  assert.equal(records[0].machine_class, "mill", "ALCOA mill record");
  assert.equal(records[1].machine_class, "wire-edm", "ITW wire-EDM record");
  assert.equal(records[2].machine_class, "lathe", "BRADY lathe record");
  assert.equal(records[5].estimated_time_in_cut_s, 7200, "10MB ALCOA -> 5-axis time bucket");

  // Stage 2: iter16 — confirm variance ACTUALLY exists in the cohort
  const dist = summarizeRecordsDistribution(records, 5);
  assert.equal(dist.total, 6);
  assert.ok(Object.keys(dist.machineClassHisto).length >= 4, "must span >=4 machine classes");
  assert.ok(Object.keys(dist.timeBucketHisto).length >= 3, "must span >=3 time buckets");
  assert.ok(dist.rateRange.max > dist.rateRange.min, "rate range must be non-degenerate");
  assert.ok(dist.materialRange.max > dist.materialRange.min, "material range must be non-degenerate");
  assert.equal(dist.topCustomers[0].customer, "ALCOA", "ALCOA appears twice, top customer");
  assert.equal(dist.topCustomers[0].count, 2);

  // Stage 3: iter10 — convert 5 simulated training results to JSONL rows
  const results = syntheticTrainingResults(records);
  const rows = results.map((r, i) =>
    buildLedgerRow(r, `2026-05-26T0${i}:00:00.000Z`),
  );
  assert.equal(rows.length, 5);
  assert.equal(rows[0].mape_pct, 2108, "cycle 1 cold-start MAPE");
  assert.equal(rows[4].mape_pct, 35, "cycle 5 converged MAPE");
  assert.equal(rows[0].active_factor_written, false, "cycle 1 gated");
  assert.equal(rows[4].active_factor_written, true, "cycle 5 wrote");

  // Stage 4: iter11 — JSONL serialize + parse roundtrip
  const jsonl = rows.map(r => JSON.stringify(r)).join("\n") + "\n";
  const parsed = parseLedgerLines(jsonl);
  assert.equal(parsed.length, 5, "all 5 rows survive JSONL roundtrip");
  assert.equal(parsed[0].mape_pct, 2108);

  // Stage 5: iter11 — summarize the parsed window
  const summary = summarizeLedger(parsed, 20);
  assert.equal(summary.count, 5);
  assert.equal(summary.mape_trend, "falling", "MAPE 2108 -> 35 must register as falling");
  // safe_to_activate := mape < 100. mapes=[2108,850,200,80,35] -> safe=[F,F,F,T,T].
  // gate_fail = ok=true AND safe_to_activate=false -> 3 of 5 = 0.6.
  assert.equal(summary.cov_gate_fail_rate, 0.6, "3 of 5 cycles gated (mape 2108/850/200 >= 100)");
  assert.equal(summary.safe_to_activate_rate, 0.4, "2 of 5 cycles safe (mape 80/35 < 100)");
  // psi_delta_fed_count = i ONLY when safe (mape<100). i=3 (80) + i=4 (35) = 7.
  assert.equal(summary.psi_delta_fed_total, 3 + 4, "psi fed on safe cycles 3+4 (i=3,4)");

  // Stage 6: iter12 — classify the summary into an alert level
  const alert = detectDriftAlert(summary);
  // p95 of [35,80,200,850,2108] = 2108 (>= 500 threshold) -> ALERT
  assert.equal(alert.level, "alert", "p95 2108 >= 500 -> ALERT precedence");
  assert.ok(alert.reasons.some(r => r.includes("mape_pct_p95")), "must cite p95");
  // mape_trend is "falling" (improving), so MAPE-rising alert must NOT fire
  assert.ok(!alert.reasons.some(r => r.includes("MAPE rising")), "falling MAPE must not trigger rising alert");

  // Stage 7: iter15 — wrap into the on-disk state-file shape
  const state = buildDriftStateFile(alert, summary, "2026-05-26T06:00:00.000Z");
  assert.equal(state.schema_version, "1.0.0");
  assert.equal(state.ts_iso, "2026-05-26T06:00:00.000Z");
  assert.equal(state.alert.level, "alert");
  assert.equal(state.summary.count, 5);
  assert.equal(state.summary.mape_trend, "falling");
});

// ---------- Steady-state happy path: pipeline must not over-alert ----------

test("E2E: steady-state cohort (post-Docustrata) yields level=ok, no false alarms", () => {
  // Simulate the future: real Docustrata invoices land, MAPE settles to ~10-15%
  // across a 15-row window. The full pipeline must NOT fire alerts on this.
  const rows = [];
  for (let i = 0; i < 15; i++) {
    const result = {
      ok: true,
      report: { total_predicted: 100, metrics: { mape_pct: 12 + (i % 3) } }, // 12-14% range
      safe_to_activate: true,
      active_factor_written: true,
      active_factor_path: "H:/prism/state/shared/quoting/active-calibration.json",
      psi_delta_fed_count: 2,
      warnings: [],
    };
    rows.push(buildLedgerRow(result, `2026-05-26T${String(i).padStart(2, "0")}:00:00.000Z`));
  }
  const jsonl = rows.map(r => JSON.stringify(r)).join("\n");
  const parsed = parseLedgerLines(jsonl);
  const summary = summarizeLedger(parsed, 20);
  const alert = detectDriftAlert(summary);
  const state = buildDriftStateFile(alert, summary, "2026-05-26T15:00:00.000Z");

  assert.equal(summary.count, 15);
  assert.ok(summary.mape_pct_p95 < 20, "p95 in 12-14% range");
  assert.equal(summary.cov_gate_fail_rate, 0, "no gating in steady state");
  assert.equal(summary.safe_to_activate_rate, 1, "all 15 cycles safe");
  assert.equal(alert.level, "ok", "steady state must NOT trigger any alert/warn/info");
  assert.equal(alert.reasons.length, 0);
  assert.equal(state.alert.level, "ok");
});

// ---------- Empty pipeline: no records -> info level (insufficient history) ----------

test("E2E: empty pipeline (no records) lands at info-level not crash", () => {
  const records = [];
  const dist = summarizeRecordsDistribution(records, 5);
  assert.equal(dist.total, 0);

  const summary = summarizeLedger([], 20);
  assert.equal(summary.count, 0);
  assert.equal(summary.mape_trend, "insufficient");

  const alert = detectDriftAlert(summary);
  assert.equal(alert.level, "info"); // count<3 -> insufficient-history INFO

  const state = buildDriftStateFile(alert, summary);
  assert.equal(state.alert.level, "info");
  assert.equal(state.summary.count, 0);
});

// ---------- Degraded pipeline: rising MAPE while still bad -> ALERT ----------

test("E2E: degraded scenario — rising MAPE while above 100 triggers ALERT precedence", () => {
  const mapes = [80, 100, 120, 150, 200, 280, 400]; // rising AND avg >= 100
  const rows = mapes.map((mape, i) =>
    buildLedgerRow({
      ok: true,
      report: { total_predicted: 50, metrics: { mape_pct: mape } },
      safe_to_activate: false,
      active_factor_written: false,
      psi_delta_fed_count: 0,
      warnings: [],
    }, `2026-05-26T${String(i).padStart(2, "0")}:00:00.000Z`),
  );
  const summary = summarizeLedger(rows, 20);
  const alert = detectDriftAlert(summary);

  assert.equal(summary.mape_trend, "rising");
  assert.ok(summary.mape_pct_avg >= 100);
  assert.equal(alert.level, "alert");
  // Multiple ALERT-grade triggers possible (CoV-gated 100% + rising-high-avg + p95-high)
  assert.ok(alert.reasons.length >= 1);
  assert.ok(alert.counts.alerts >= 1);
});
