/**
 * quoting-train-drift-alert — iter12 unit test for detectDriftAlert.
 *
 * Pins precedence + threshold semantics so dashboards / cron / PSN legs
 * relying on the alert level stay aligned with the classifier.
 *
 * Run: node --test scripts/quoting-train-drift-alert.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DRIFT-ALERT (charlie /goal-yolo iter12)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDriftAlert, DEFAULT_THRESHOLDS } from "./quoting-train-drift-alert.mjs";

const baseSummary = (overrides = {}) => ({
  count: 10,
  window_n: 20,
  mape_pct_avg: 15,
  mape_pct_p50: 14,
  mape_pct_p95: 22,
  mape_trend: "flat",
  cov_gate_fail_rate: 0,
  safe_to_activate_rate: 1,
  psi_delta_fed_total: 5,
  latest_factor_path: "H:/prism/state/shared/quoting/active-calibration.json",
  last_run_iso: "2026-05-26T05:00:00.000Z",
  ...overrides,
});

// ---------- OK path ----------
test("detectDriftAlert: healthy summary -> level=ok, empty reasons", () => {
  const a = detectDriftAlert(baseSummary());
  assert.equal(a.level, "ok");
  assert.equal(a.reasons.length, 0);
  assert.equal(a.counts.alerts, 0);
  assert.equal(a.counts.warns, 0);
  assert.equal(a.counts.infos, 0);
});

// ---------- ALERT precedence ----------
test("detectDriftAlert: cov_gate_fail_rate >= 0.5 -> ALERT", () => {
  const a = detectDriftAlert(baseSummary({ cov_gate_fail_rate: 0.6 }));
  assert.equal(a.level, "alert");
  assert.ok(a.reasons.some(r => r.includes("cov_gate_fail_rate")));
});

test("detectDriftAlert: mape_pct_p95 >= 500 -> ALERT (catastrophic)", () => {
  const a = detectDriftAlert(baseSummary({ mape_pct_p95: 2108 }));
  assert.equal(a.level, "alert");
  assert.ok(a.reasons.some(r => r.includes("p95=2108")));
});

test("detectDriftAlert: rising AND avg>=100 -> ALERT (regressing while bad)", () => {
  const a = detectDriftAlert(baseSummary({ mape_trend: "rising", mape_pct_avg: 150 }));
  assert.equal(a.level, "alert");
  assert.ok(a.reasons.some(r => r.includes("MAPE rising")));
});

test("detectDriftAlert: rising AND avg<100 -> WARN only (not ALERT)", () => {
  const a = detectDriftAlert(baseSummary({ mape_trend: "rising", mape_pct_avg: 50 }));
  assert.equal(a.level, "warn");
});

// ---------- WARN rules ----------
test("detectDriftAlert: cov_gate_fail_rate >= 0.25 (but <0.5) -> WARN", () => {
  const a = detectDriftAlert(baseSummary({ cov_gate_fail_rate: 0.3 }));
  assert.equal(a.level, "warn");
});

test("detectDriftAlert: mape_pct_p95 >= 100 (but <500) -> WARN", () => {
  const a = detectDriftAlert(baseSummary({ mape_pct_p95: 200 }));
  assert.equal(a.level, "warn");
});

test("detectDriftAlert: safe_to_activate_rate < 0.5 -> WARN", () => {
  const a = detectDriftAlert(baseSummary({ safe_to_activate_rate: 0.3 }));
  assert.equal(a.level, "warn");
  assert.ok(a.reasons.some(r => r.includes("safe_to_activate_rate")));
});

// ---------- INFO rules ----------
test("detectDriftAlert: count < 3 -> INFO insufficient history", () => {
  const a = detectDriftAlert(baseSummary({ count: 1 }));
  assert.equal(a.level, "info");
  assert.ok(a.reasons.some(r => r.includes("insufficient history")));
});

test("detectDriftAlert: count >= 3 AND psi_delta_fed_total=0 -> INFO psn unfed", () => {
  const a = detectDriftAlert(baseSummary({ psi_delta_fed_total: 0 }));
  assert.equal(a.level, "info");
  assert.ok(a.reasons.some(r => r.includes("psi_delta_fed_total=0")));
});

// ---------- precedence: ALERT wins over WARN wins over INFO ----------
test("detectDriftAlert: ALERT-grade cov AND p95 raise both but DEDUP across alert/warn axes", () => {
  // cov=0.7 triggers ALERT; that SAME axis must NOT also fire a WARN reason
  // for the same axis (avoid double-counting). p95=1500 also triggers ALERT.
  const a = detectDriftAlert(baseSummary({ cov_gate_fail_rate: 0.7, mape_pct_p95: 1500 }));
  assert.equal(a.level, "alert");
  // Should NOT contain a redundant "cov_gate_fail_rate ... 25%" warn line
  const warnLines = a.reasons.filter(r => r.includes(">=25%"));
  assert.equal(warnLines.length, 0, "must not double-report cov in warn after alert");
});

// ---------- adversarial 1: null/undefined summary ----------
test("detectDriftAlert: null summary -> level=info (count=0 -> insufficient)", () => {
  const a = detectDriftAlert(null);
  assert.equal(a.level, "info");
  assert.ok(a.reasons.some(r => r.includes("insufficient")));
});

test("detectDriftAlert: undefined summary -> level=info", () => {
  const a = detectDriftAlert(undefined);
  assert.equal(a.level, "info");
});

// ---------- adversarial 2: empty/null fields don't throw ----------
test("detectDriftAlert: empty {} summary -> level=info, no throw", () => {
  const a = detectDriftAlert({});
  assert.equal(a.level, "info");
  assert.equal(a.counts.alerts, 0);
});

// ---------- adversarial 3: NaN/null mape values don't trigger alerts ----------
test("detectDriftAlert: null mape_pct_p95 doesn't trigger mape alerts/warns", () => {
  const a = detectDriftAlert(baseSummary({ mape_pct_p95: null, mape_pct_avg: null }));
  // No mape-based alerts/warns; level depends only on other axes (here all ok)
  assert.equal(a.level, "ok");
});

test("detectDriftAlert: NaN-style non-number mape_pct_p95 ignored", () => {
  const a = detectDriftAlert(baseSummary({ mape_pct_p95: "500" }));
  assert.equal(a.level, "ok");
});

// ---------- thresholds override ----------
test("detectDriftAlert: custom thresholds override DEFAULT", () => {
  const a = detectDriftAlert(baseSummary({ mape_pct_p95: 50 }), { warn_mape_p95: 30 });
  assert.equal(a.level, "warn");
});

test("detectDriftAlert: thresholds null falls back to DEFAULT", () => {
  const a = detectDriftAlert(baseSummary(), null);
  assert.equal(a.level, "ok");
});

// ---------- shape stability ----------
test("detectDriftAlert: result has stable 3-key shape", () => {
  const a = detectDriftAlert(baseSummary());
  assert.deepEqual(Object.keys(a).sort(), ["counts", "level", "reasons"]);
  assert.deepEqual(Object.keys(a.counts).sort(), ["alerts", "infos", "warns"]);
});

// ---------- DEFAULT_THRESHOLDS pin (downstream consumers depend on these values) ----------
test("DEFAULT_THRESHOLDS: pinned values for downstream contract", () => {
  assert.equal(DEFAULT_THRESHOLDS.alert_cov_gate_fail_rate, 0.5);
  assert.equal(DEFAULT_THRESHOLDS.alert_mape_p95, 500);
  assert.equal(DEFAULT_THRESHOLDS.alert_mape_avg_when_rising, 100);
  assert.equal(DEFAULT_THRESHOLDS.warn_cov_gate_fail_rate, 0.25);
  assert.equal(DEFAULT_THRESHOLDS.warn_mape_p95, 100);
  assert.equal(DEFAULT_THRESHOLDS.warn_safe_rate, 0.5);
  assert.equal(DEFAULT_THRESHOLDS.info_min_count, 3);
});

// ---------- variability: 3 realistic scenarios ----------
test("detectDriftAlert: realistic scenarios — first-cycle / steady-state / degraded", () => {
  // First-cycle (post yolo-iter6 evidence): count=1, MAPE 2108%, gate refused
  const firstCycle = detectDriftAlert({
    count: 1,
    cov_gate_fail_rate: 1,
    safe_to_activate_rate: 0,
    mape_pct_p95: 2108,
    mape_pct_avg: 2108,
    mape_trend: "insufficient",
    psi_delta_fed_total: 0,
  });
  assert.equal(firstCycle.level, "alert"); // CoV 100% + p95 2108% both trigger ALERT

  // Steady-state post-Docustrata-bridge: count=15, MAPE 12%, stable
  const steady = detectDriftAlert({
    count: 15,
    cov_gate_fail_rate: 0.05,
    safe_to_activate_rate: 0.95,
    mape_pct_p95: 18,
    mape_pct_avg: 12,
    mape_trend: "flat",
    psi_delta_fed_total: 12,
  });
  assert.equal(steady.level, "ok");

  // Degraded: MAPE creeping up over the window
  const degraded = detectDriftAlert({
    count: 10,
    cov_gate_fail_rate: 0.1,
    safe_to_activate_rate: 0.8,
    mape_pct_p95: 75,
    mape_pct_avg: 50,
    mape_trend: "rising",
    psi_delta_fed_total: 4,
  });
  assert.equal(degraded.level, "warn");
});
