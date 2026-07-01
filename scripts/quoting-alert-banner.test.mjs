/**
 * quoting-alert-banner — iter28 unit test for formatAlertBanner.
 *
 * Run: node --test scripts/quoting-alert-banner.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-ALERT-BANNER (charlie /goal-yolo iter28)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAlertBanner, loadAndFormatAlert } from "./quoting-alert-banner.mjs";

// Fixed "now" in ms for deterministic staleness tests
const NOW = new Date("2026-05-26T12:00:00.000Z").getTime();

const baseState = (overrides = {}) => ({
  schema_version: "1.0.0",
  ts_iso: "2026-05-26T11:00:00.000Z", // 1h ago — fresh
  alert: { level: "ok", reasons: [], counts: { alerts: 0, warns: 0, infos: 0 } },
  summary: { count: 10, mape_pct_avg: 15, mape_trend: "flat", cov_gate_fail_rate: 0, safe_to_activate_rate: 1 },
  ...overrides,
});

// ---------- silent paths ----------

test("formatAlertBanner: level=ok is silent (shouldInject=false)", () => {
  const r = formatAlertBanner(baseState(), { nowMs: NOW });
  assert.equal(r.shouldInject, false);
  assert.equal(r.text, "");
});

test("formatAlertBanner: level=info silent by default", () => {
  const s = baseState({ alert: { level: "info", reasons: ["count=2 (<3 insufficient)"], counts: {} } });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, false);
});

test("formatAlertBanner: level=info verbose=true emits", () => {
  const s = baseState({ alert: { level: "info", reasons: ["seed"], counts: {} } });
  const r = formatAlertBanner(s, { nowMs: NOW, verbose: true });
  assert.equal(r.shouldInject, true);
});

test("formatAlertBanner: null state -> silent no-state-file", () => {
  const r = formatAlertBanner(null);
  assert.equal(r.shouldInject, false);
  assert.equal(r.reason, "no-state-file");
});

test("formatAlertBanner: undefined state -> silent", () => {
  const r = formatAlertBanner(undefined);
  assert.equal(r.shouldInject, false);
});

test("formatAlertBanner: non-object state -> silent", () => {
  for (const bad of ["string", 42, true, []]) {
    const r = formatAlertBanner(bad);
    assert.equal(r.shouldInject, false, `${typeof bad} should be silent`);
  }
});

// ---------- ALERT level emits + contains reasons ----------

test("formatAlertBanner: level=alert emits header + reasons + triage pointer", () => {
  const s = baseState({
    alert: {
      level: "alert",
      reasons: ["cov_gate_fail_rate=80.0% (>=50% threshold)", "mape_pct_p95=2108 (>=500%)"],
      counts: { alerts: 2, warns: 0, infos: 0 },
    },
  });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
  assert.ok(r.text.includes("🚨"));
  assert.ok(r.text.includes("ALERT"));
  assert.ok(r.text.includes("cov_gate_fail_rate=80.0%"));
  assert.ok(r.text.includes("mape_pct_p95=2108"));
  assert.ok(r.text.includes("Triage:"));
  assert.ok(r.text.includes("PIPELINE-RUNBOOK.md"));
});

// ---------- WARN level emits with lighter tone ----------

test("formatAlertBanner: level=warn emits with ⚠ icon", () => {
  const s = baseState({
    alert: { level: "warn", reasons: ["MAPE trend rising"], counts: {} },
  });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
  assert.ok(r.text.includes("⚠"));
  assert.ok(r.text.includes("WARN"));
});

// ---------- summary block included ----------

test("formatAlertBanner: summary stats included in body when ALERT", () => {
  const s = baseState({
    alert: { level: "alert", reasons: ["cov >50%"], counts: {} },
    summary: { count: 20, mape_pct_avg: 312, mape_trend: "rising", cov_gate_fail_rate: 0.8, safe_to_activate_rate: 0.2 },
  });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.ok(r.text.includes("count=20"));
  assert.ok(r.text.includes("MAPE avg=312%"));
  assert.ok(r.text.includes("trend=rising"));
  assert.ok(r.text.includes("cov_gate_fail=80.0%"));
  assert.ok(r.text.includes("safe=20.0%"));
});

// ---------- staleness detection ----------

test("formatAlertBanner: stale state (>48h) emits stale banner", () => {
  const s = baseState({
    ts_iso: "2026-05-22T12:00:00.000Z", // 96h ago
    alert: { level: "ok", reasons: [], counts: {} },
  });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
  assert.equal(r.reason, "stale");
  assert.ok(r.text.includes("STALE"));
  assert.ok(r.text.includes("96h"));
});

test("formatAlertBanner: fresh state (<48h) does NOT trigger stale", () => {
  const s = baseState({
    ts_iso: "2026-05-26T00:00:00.000Z", // 12h ago — within threshold
    alert: { level: "ok", reasons: [], counts: {} },
  });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, false);
});

test("formatAlertBanner: 48h+1m is stale (boundary check)", () => {
  // 48h60m ago exact
  const stamp = new Date(NOW - (48 * 3600 * 1000 + 60_000)).toISOString();
  const s = baseState({ ts_iso: stamp, alert: { level: "ok", reasons: [], counts: {} } });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
  assert.equal(r.reason, "stale");
});

test("formatAlertBanner: invalid ts_iso doesn't crash, no stale flag", () => {
  const s = baseState({ ts_iso: "not a date", alert: { level: "ok", reasons: [], counts: {} } });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, false);
});

// ---------- adversarial: missing alert ----------

test("formatAlertBanner: missing alert field defaults to info-silent", () => {
  const s = { schema_version: "1.0.0", ts_iso: "2026-05-26T11:00:00.000Z", summary: null };
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, false);
});

test("formatAlertBanner: missing reasons array doesn't crash", () => {
  const s = baseState({ alert: { level: "alert", counts: {} } }); // no reasons
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
});

test("formatAlertBanner: non-array reasons treated as empty", () => {
  const s = baseState({ alert: { level: "alert", reasons: "not an array", counts: {} } });
  const r = formatAlertBanner(s, { nowMs: NOW });
  assert.equal(r.shouldInject, true);
  assert.ok(!r.text.includes("not an array"));
});

// ---------- result shape stability ----------

test("formatAlertBanner: stable 3-key result shape", () => {
  const r = formatAlertBanner(null);
  assert.deepEqual(Object.keys(r).sort(), ["reason", "shouldInject", "text"]);
});

// ---------- loadAndFormatAlert: missing file is silent ----------

test("loadAndFormatAlert: missing file -> silent no-state-file", async () => {
  const r = await loadAndFormatAlert("H:/this/path/does/not/exist.json");
  assert.equal(r.shouldInject, false);
  assert.equal(r.reason, "no-state-file");
});

// ---------- loadAndFormatAlert: roundtrip from a synthetic state ----------

test("loadAndFormatAlert: parse error emits diagnostic banner", async () => {
  // Write a deliberately corrupt JSON file to tmp + load
  const tmpPath = `${process.cwd()}/.tmp-quoting-alert-banner-test-${process.pid}.json`;
  const { promises: fs } = await import("node:fs");
  await fs.writeFile(tmpPath, "{not valid json");
  try {
    const r = await loadAndFormatAlert(tmpPath);
    assert.equal(r.shouldInject, true);
    assert.equal(r.reason, "parse-error");
    assert.ok(r.text.includes("unparseable"));
  } finally {
    try { await fs.unlink(tmpPath); } catch {}
  }
});

// ---------- variability: 4 alert levels distinct ----------

test("formatAlertBanner: 4 levels yield distinct shouldInject/icons", () => {
  const ok = formatAlertBanner(baseState({ alert: { level: "ok", reasons: [], counts: {} } }), { nowMs: NOW });
  const info = formatAlertBanner(baseState({ alert: { level: "info", reasons: ["seed"], counts: {} } }), { nowMs: NOW });
  const warn = formatAlertBanner(baseState({ alert: { level: "warn", reasons: ["trend rising"], counts: {} } }), { nowMs: NOW });
  const alert = formatAlertBanner(baseState({ alert: { level: "alert", reasons: ["cov 80%"], counts: {} } }), { nowMs: NOW });

  assert.equal(ok.shouldInject, false);
  assert.equal(info.shouldInject, false);
  assert.equal(warn.shouldInject, true);
  assert.equal(alert.shouldInject, true);

  assert.ok(warn.text.includes("⚠"));
  assert.ok(alert.text.includes("🚨"));
  assert.ok(!alert.text.includes("⚠")); // alert is its own icon
});
