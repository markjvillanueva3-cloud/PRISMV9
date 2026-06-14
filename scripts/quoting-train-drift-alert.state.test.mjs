/**
 * quoting-train-drift-alert.state — iter15 unit test for buildDriftStateFile.
 *
 * Pins the 4-key state-file shape downstream (dashboards / PSN legs / Stop
 * hook injection) depends on. schema_version is load-bearing — consumers
 * that read this file MUST check it before parsing.
 *
 * Run: node --test scripts/quoting-train-drift-alert.state.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DRIFT-STATE-FILE (charlie /goal-yolo iter15)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDriftStateFile, detectDriftAlert } from "./quoting-train-drift-alert.mjs";

const FIXED_TS = "2026-05-26T05:30:00.000Z";

test("buildDriftStateFile: stable 4-key shape", () => {
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: { alerts: 0, warns: 0, infos: 0 } }, { count: 3 }, FIXED_TS);
  assert.deepEqual(Object.keys(f).sort(), ["alert", "schema_version", "summary", "ts_iso"]);
});

test("buildDriftStateFile: schema_version pinned to 1.0.0 (downstream contract)", () => {
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: {} }, {}, FIXED_TS);
  assert.equal(f.schema_version, "1.0.0");
});

test("buildDriftStateFile: ts_iso passed through verbatim", () => {
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: {} }, {}, FIXED_TS);
  assert.equal(f.ts_iso, FIXED_TS);
});

test("buildDriftStateFile: alert payload preserved", () => {
  const alert = { level: "alert", reasons: ["cov 80%"], counts: { alerts: 1, warns: 0, infos: 0 } };
  const f = buildDriftStateFile(alert, { count: 5 }, FIXED_TS);
  assert.equal(f.alert.level, "alert");
  assert.equal(f.alert.reasons.length, 1);
});

test("buildDriftStateFile: summary preserved", () => {
  const summary = { count: 10, mape_pct_avg: 15, mape_trend: "flat" };
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: {} }, summary, FIXED_TS);
  assert.equal(f.summary.count, 10);
  assert.equal(f.summary.mape_pct_avg, 15);
});

test("buildDriftStateFile: null/undefined alert -> safe default info-level", () => {
  for (const bad of [null, undefined]) {
    const f = buildDriftStateFile(bad, {}, FIXED_TS);
    assert.equal(f.alert.level, "info");
    assert.ok(f.alert.reasons.includes("alert input missing"));
  }
});

test("buildDriftStateFile: null summary -> stored as null (don't fake data)", () => {
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: {} }, null, FIXED_TS);
  assert.equal(f.summary, null);
});

test("buildDriftStateFile: ts_iso defaults to now() when omitted", () => {
  const before = Date.now();
  const f = buildDriftStateFile({ level: "ok", reasons: [], counts: {} }, {});
  const after = Date.now();
  const ts = new Date(f.ts_iso).getTime();
  assert.ok(ts >= before && ts <= after);
});

test("buildDriftStateFile: result roundtrips JSON.stringify/parse cleanly", () => {
  const alert = detectDriftAlert({ count: 5, mape_pct_p95: 600, safe_to_activate_rate: 0.3 });
  const summary = { count: 5, mape_pct_p95: 600, mape_trend: "flat" };
  const f = buildDriftStateFile(alert, summary, FIXED_TS);
  const json = JSON.stringify(f);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, f);
});

test("buildDriftStateFile: integration with detectDriftAlert output", () => {
  // Realistic chain: summarize a degraded scenario -> alert -> state file
  const summary = {
    count: 15,
    cov_gate_fail_rate: 0.6, // ALERT-grade
    safe_to_activate_rate: 0.4, // WARN-grade
    mape_pct_p95: 200,
    mape_pct_avg: 50,
    mape_trend: "rising", // WARN
    psi_delta_fed_total: 0, // INFO (but count>=3 so will fire)
  };
  const alert = detectDriftAlert(summary);
  const f = buildDriftStateFile(alert, summary, FIXED_TS);
  assert.equal(f.alert.level, "alert"); // ALERT precedence wins
  assert.equal(f.summary.count, 15);
  assert.equal(f.schema_version, "1.0.0");
});
