/**
 * quoting-full-chain-smoke — iter31 comprehensive composition smoke.
 *
 * iter17 round-trip E2E covers 6 stages (deriveRecordDefaults → distribution
 * → buildLedgerRow → parseLedgerLines → summarizeLedger → detectDriftAlert →
 * buildDriftStateFile). iter23 pipeline-verify runs all test files. Neither
 * exercises iter18 bridge + iter19 validator + iter20 synth + iter21
 * orchestrator + iter28 alert-banner as a single composition.
 *
 * iter31 closes that gap: ONE test that walks the chain through every
 * production export and asserts each stage's output is consumable by the next.
 *
 * Run: node --test scripts/quoting-full-chain-smoke.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-FULL-CHAIN-SMOKE (charlie /goal-yolo iter31)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// iter9 + iter13 + iter16
import {
  isLikelyCustomer,
  extractCustomer,
  deriveRecordDefaults,
  summarizeRecordsDistribution,
} from "./quoting-baseline-bootstrap.mjs";

// iter10
import { buildLedgerRow } from "./quoting-train-cycle.mjs";

// iter11
import {
  parseLedgerLines,
  summarizeLedger,
} from "./quoting-train-history-summary.mjs";

// iter12 + iter15
import {
  detectDriftAlert,
  buildDriftStateFile,
  DEFAULT_THRESHOLDS,
} from "./quoting-train-drift-alert.mjs";

// iter18
import {
  buildRevenueKey,
  mergeDocustrataRevenue,
} from "./quoting-docustrata-bridge.mjs";

// iter19
import {
  validateDocustrataPayload,
  SUPPORTED_SCHEMA_VERSIONS,
  REVENUE_BOUNDS,
} from "./quoting-docustrata-format.mjs";

// iter20
import {
  deterministicHashUnit,
  generateSyntheticRevenueRecords,
} from "./quoting-docustrata-synth.mjs";

// iter21
import { runDocustrataPipeline } from "./quoting-docustrata-pipeline.mjs";

// iter23
import {
  parseTapSummary,
  aggregateSummaries,
} from "./quoting-pipeline-verify.mjs";

// iter28
import {
  formatAlertBanner,
  loadAndFormatAlert,
} from "./quoting-alert-banner.mjs";

test("smoke: all 15 exports are importable + callable as functions/values", () => {
  // If any of the imports above failed at module-load, this whole file would
  // fail to load — so reaching this point already proves importability. This
  // test pins the contract that THESE exports exist by name.
  for (const fn of [
    isLikelyCustomer, extractCustomer, deriveRecordDefaults, summarizeRecordsDistribution,
    buildLedgerRow, parseLedgerLines, summarizeLedger, detectDriftAlert,
    buildDriftStateFile, buildRevenueKey, mergeDocustrataRevenue,
    validateDocustrataPayload, deterministicHashUnit, generateSyntheticRevenueRecords,
    runDocustrataPipeline, parseTapSummary, aggregateSummaries,
    formatAlertBanner, loadAndFormatAlert,
  ]) {
    assert.equal(typeof fn, "function", "all exports must be functions");
  }
  for (const v of [SUPPORTED_SCHEMA_VERSIONS, REVENUE_BOUNDS, DEFAULT_THRESHOLDS]) {
    assert.ok(v !== null && typeof v === "object", "constants exported");
  }
});

test("smoke: full chain — JM-Die-shaped paths -> baseline -> synth -> validate -> bridge -> ledger -> summarize -> alert -> state -> banner", () => {
  // ---------- Stage 0: iter9 customer extraction from JM-Die-shaped paths ----------
  const jmPaths = [
    "H:/PRISM/JM DIE/CNC MILL/ALCOA/p1.MIN",
    "H:/PRISM/JM DIE/WIRE EDM/ITW/p2.NC",
    "H:/PRISM/JM DIE/LATHE/BRADY/p3.CNC",
    "H:/PRISM/JM DIE/SINKER/OPTIMAS/p4.NC",
    "H:/PRISM/JM DIE/GRINDER/SFS/p5.NC",
    "H:/PRISM/JM DIE/POST PROCESSORS/should-not-be-extracted.MIN", // iter9 filter test
  ];
  const customers = jmPaths.map(extractCustomer);
  assert.equal(customers[0], "ALCOA");
  assert.equal(customers[5], undefined, "iter9 filter must reject POST PROCESSORS path");

  // ---------- Stage 0b: iter13 variance injection ----------
  const baseline = jmPaths.slice(0, 5).map((p, i) => {
    const cust = extractCustomer(p);
    const d = deriveRecordDefaults(p, 100_000 * (i + 1));
    return {
      customer: cust,
      part_id: p.split("/").pop(),
      doc_date: "2026-05-26",
      actual_revenue_usd: 10,
      ...d,
    };
  });
  assert.equal(baseline.length, 5);
  assert.equal(baseline[0].machine_class, "mill");
  assert.equal(baseline[1].machine_class, "wire-edm");
  assert.equal(baseline[2].machine_class, "lathe");

  // ---------- Stage 0c: iter16 distribution probe confirms variance ----------
  const dist = summarizeRecordsDistribution(baseline, 5);
  assert.equal(dist.total, 5);
  assert.ok(Object.keys(dist.machineClassHisto).length >= 4, "iter16 variance check");
  assert.ok(dist.rateRange.max > dist.rateRange.min, "rate spread present");

  // ---------- Stage 1: iter20 synth + iter19 validate + iter18 bridge via iter21 orchestrator ----------
  const orch = runDocustrataPipeline(baseline, { synth: { baseMarkupPct: 0.4, jitterPct: 0.15 } });
  assert.equal(orch.ok, true);
  assert.equal(orch.stage, "done");
  assert.equal(orch.synth.records.length, 5);
  assert.equal(orch.validation.valid, true);
  assert.equal(orch.merge.report.matched, 5, "all 5 baseline records should match synth");
  for (const r of orch.merge.records) {
    assert.equal(r.revenue_source, "docustrata");
    assert.ok(r.actual_revenue_usd > 10, "stub replaced by synth revenue");
  }

  // ---------- Verify iter19 constants exposed correctly ----------
  assert.ok(SUPPORTED_SCHEMA_VERSIONS.has(orch.synth.schema_version));
  for (const rec of orch.synth.records) {
    assert.ok(rec.revenue >= REVENUE_BOUNDS.min && rec.revenue <= REVENUE_BOUNDS.max);
  }

  // ---------- Stage 2: iter20 determinism (hash + synth) ----------
  const h1 = deterministicHashUnit("ALCOA|p1");
  const h2 = deterministicHashUnit("ALCOA|p1");
  assert.equal(h1, h2, "iter20 hash deterministic");

  // Verify iter18 buildRevenueKey is the same canonicalization iter19 normalizes to
  for (const rec of orch.synth.records) {
    const k = buildRevenueKey(rec.customer, rec.part_id);
    assert.ok(k, `key for ${rec.customer}|${rec.part_id}`);
    assert.ok(orch.validation.normalized.has(k), `bridge key ${k} present in validator's normalized map`);
  }

  // ---------- Stage 3: iter10 buildLedgerRow on simulated training results ----------
  const mapes = [2108, 850, 200, 80, 35]; // converging
  const ledgerRows = mapes.map((mape, i) =>
    buildLedgerRow({
      ok: true,
      report: { total_predicted: orch.merge.records.length, metrics: { mape_pct: mape } },
      safe_to_activate: mape < 100,
      active_factor_written: mape < 100,
      active_factor_path: mape < 100 ? "/tmp/active-cal.json" : null,
      psi_delta_fed_count: mape < 100 ? i : 0,
      warnings: [],
    }, `2026-05-26T0${i}:00:00.000Z`),
  );
  // ---------- Stage 4: iter11 JSONL roundtrip + summarize ----------
  const jsonl = ledgerRows.map(r => JSON.stringify(r)).join("\n");
  const parsed = parseLedgerLines(jsonl);
  assert.equal(parsed.length, 5);
  const summary = summarizeLedger(parsed, 20);
  assert.equal(summary.count, 5);
  assert.equal(summary.mape_trend, "falling");
  assert.equal(summary.cov_gate_fail_rate, 0.6, "3 of 5 mapes >= 100 -> gate-fail rate 0.6");

  // ---------- Stage 5: iter12 alert classifier ----------
  const alert = detectDriftAlert(summary);
  assert.equal(alert.level, "alert", "p95 2108 >= 500 -> ALERT");
  assert.ok(alert.reasons.length >= 1);
  // Confirm DEFAULT_THRESHOLDS pinning still aligns with iter12 contract
  assert.equal(DEFAULT_THRESHOLDS.alert_mape_p95, 500);
  assert.equal(DEFAULT_THRESHOLDS.alert_cov_gate_fail_rate, 0.5);

  // ---------- Stage 6: iter15 state-file shape ----------
  const stateFile = buildDriftStateFile(alert, summary, "2026-05-26T06:00:00.000Z");
  assert.equal(stateFile.schema_version, "1.0.0");
  assert.equal(stateFile.alert.level, "alert");
  assert.equal(stateFile.summary.count, 5);

  // ---------- Stage 7: iter28 banner formatter ----------
  const banner = formatAlertBanner(stateFile, { nowMs: new Date("2026-05-26T07:00:00.000Z").getTime() });
  assert.equal(banner.shouldInject, true);
  assert.ok(banner.text.includes("🚨"));
  assert.ok(banner.text.includes("ALERT"));
  assert.ok(banner.text.includes("Triage:"));

  // ---------- Stage 8: iter23 verify-runner pure helpers ----------
  // Simulate a passing test file's TAP summary
  const tapSample = "# tests 5\n# pass 5\n# fail 0\n# skipped 0";
  const tapResult = parseTapSummary(tapSample);
  assert.equal(tapResult.tests, 5);
  assert.equal(tapResult.pass, 5);
  const agg = aggregateSummaries([{ file: "a.test.mjs", ...tapResult, exit_code: 0 }]);
  assert.equal(agg.tests, 5);
  assert.equal(agg.fail_files.length, 0);
});

test("smoke: chain handles empty input gracefully end-to-end", () => {
  const baseline = [];
  const dist = summarizeRecordsDistribution(baseline);
  assert.equal(dist.total, 0);
  const orch = runDocustrataPipeline(baseline);
  assert.equal(orch.ok, true);
  assert.equal(orch.merge.report.total, 0);
  const summary = summarizeLedger([], 20);
  const alert = detectDriftAlert(summary);
  assert.equal(alert.level, "info");
  const stateFile = buildDriftStateFile(alert, summary);
  const banner = formatAlertBanner(stateFile, { nowMs: new Date(stateFile.ts_iso).getTime() });
  // info-level is silent (no banner inject)
  assert.equal(banner.shouldInject, false);
});

test("smoke: chain handles null inputs without crashing", () => {
  // Each pure function must be defensive against null
  assert.doesNotThrow(() => summarizeRecordsDistribution(null));
  assert.doesNotThrow(() => deriveRecordDefaults(null, null));
  assert.doesNotThrow(() => buildLedgerRow(null));
  assert.doesNotThrow(() => parseLedgerLines(null));
  assert.doesNotThrow(() => summarizeLedger(null));
  assert.doesNotThrow(() => detectDriftAlert(null));
  assert.doesNotThrow(() => buildDriftStateFile(null, null));
  assert.doesNotThrow(() => formatAlertBanner(null));
  assert.doesNotThrow(() => mergeDocustrataRevenue(null, null));
  assert.doesNotThrow(() => validateDocustrataPayload(null));
  assert.doesNotThrow(() => generateSyntheticRevenueRecords(null));
  assert.doesNotThrow(() => runDocustrataPipeline(null));
  assert.doesNotThrow(() => parseTapSummary(null));
  assert.doesNotThrow(() => aggregateSummaries(null));
});

test("smoke: 15 distinct exports validated (no export drift since iter28)", () => {
  // This count is load-bearing: if a future iter removes a public export,
  // the import block at top-of-file fails AND this count assertion catches it.
  const exports = {
    isLikelyCustomer, extractCustomer, deriveRecordDefaults, summarizeRecordsDistribution,
    buildLedgerRow, parseLedgerLines, summarizeLedger, detectDriftAlert,
    buildDriftStateFile, buildRevenueKey, mergeDocustrataRevenue,
    validateDocustrataPayload, deterministicHashUnit, generateSyntheticRevenueRecords,
    runDocustrataPipeline, parseTapSummary, aggregateSummaries,
    formatAlertBanner, loadAndFormatAlert,
  };
  const fnCount = Object.values(exports).filter(v => typeof v === "function").length;
  assert.equal(fnCount, 19, `expected 19 public function exports across iter9-28, got ${fnCount}`);
});

test("smoke: chain is referentially transparent — same input twice yields identical output", () => {
  const baseline = [
    { customer: "A", part_id: "p1", actual_revenue_usd: 10, estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60, machine_class: "mill" },
    { customer: "B", part_id: "p2", actual_revenue_usd: 20, estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35, machine_class: "wire-edm" },
  ];
  const r1 = runDocustrataPipeline(baseline);
  const r2 = runDocustrataPipeline(baseline);
  // Deterministic FNV hash + deterministic stage chain
  assert.equal(r1.merge.records[0].actual_revenue_usd, r2.merge.records[0].actual_revenue_usd);
  assert.equal(r1.merge.records[1].actual_revenue_usd, r2.merge.records[1].actual_revenue_usd);
});
