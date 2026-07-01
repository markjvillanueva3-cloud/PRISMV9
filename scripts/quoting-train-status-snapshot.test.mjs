#!/usr/bin/env node
/**
 * quoting-train-status-snapshot.test.mjs — unit tests for buildTrainingStatusSnapshot
 * (U-QP-TRAINING-STATUS-SNAPSHOT, slot:charlie 2026-06-02).
 *
 * The snapshot is the front-to-back data-synergy surface: the single-object latest-cycle
 * status the PRISM app frontend + backend consumers poll. These tests pin its STABLE
 * shape (a frontend contract) and its defensiveness against partial/short-circuited
 * cycles — a consumer must never crash on a degraded snapshot.
 *
 * Run: node --test scripts/quoting-train-status-snapshot.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrainingStatusSnapshot, TRAINING_STATUS_SCHEMA_VERSION } from "./quoting-train-cycle.mjs";

const TS = "2026-06-02T00:00:00.000Z";

const FULL_RESULT = {
  ok: true,
  reason: null,
  report: { total_predicted: 47905, metrics: { mape_pct: 71.0996 } },
  safe_to_activate: true,
  active_factor_written: false,
  active_factor_path: null,
  skip_reason: "writeIfSafe=false (dry-run mode)",
  psi_delta_fed_count: 3,
};
const FULL_OPTS = {
  tsIso: TS,
  baselineProvenance: {
    baseline_source: "state/shared/quoting/baseline-records-corpus-with-real.json",
    baseline_fallback: { configured: "state/shared/quoting/baseline-records.json", used: "state/shared/quoting/baseline-records-corpus-with-real.json", configured_refused: true, configured_reasons: ["machine_name_customers"] },
  },
  dataCoverage: { consumed_count: 2, available_count: 5, coverage_pct: 40, unconsumed_available: ["vendor_cost_index", "tool_purchases", "docustrata_invoices"] },
  realMatch: { ok: true, verdict: "predicted-high", median_ratio: 194.07, reference_reliable: true, reliability_verdict: "ok" },
  baselineWarnings: ["synthetic_revenue_dominant=..."],
};

// The full set of keys a frontend consumer may rely on. Adding a key is fine; REMOVING
// or renaming one is a breaking contract change that must fail this test.
const REQUIRED_KEYS = [
  "schemaVersion", "ts_iso", "ok", "reason", "baseline_source", "baseline_fallback",
  "total_predicted", "mape_pct", "safe_to_activate", "active_factor_written",
  "active_factor_path", "skip_reason", "psi_delta_fed_count", "baseline_warnings",
  "data_source_coverage", "real_distribution_match", "docustrata_actuals_match",
];

test("full cycle → complete, correctly-typed snapshot", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, FULL_OPTS);
  assert.equal(s.schemaVersion, TRAINING_STATUS_SCHEMA_VERSION);
  assert.equal(s.schemaVersion, "1.0.0");
  assert.equal(s.ts_iso, TS);
  assert.equal(s.ok, true);
  assert.equal(s.total_predicted, 47905);
  assert.equal(s.mape_pct, 71.0996);
  assert.equal(s.safe_to_activate, true);
  assert.equal(s.active_factor_written, false);
  assert.equal(s.skip_reason, "writeIfSafe=false (dry-run mode)");
  assert.equal(s.psi_delta_fed_count, 3);
  assert.equal(s.baseline_source, "state/shared/quoting/baseline-records-corpus-with-real.json");
  assert.equal(s.baseline_fallback.configured_refused, true);
  assert.deepEqual(s.baseline_warnings, ["synthetic_revenue_dominant=..."]);
  assert.equal(s.data_source_coverage.coverage_pct, 40);
  assert.deepEqual(s.data_source_coverage.unconsumed_available, ["vendor_cost_index", "tool_purchases", "docustrata_invoices"]);
  assert.equal(s.real_distribution_match.verdict, "predicted-high");
  assert.equal(s.real_distribution_match.advisory, true);
  // FULL_OPTS supplies no docustrataMatch -> the advisory key is present but null (not omitted).
  assert.equal(s.docustrata_actuals_match, null);
});

// U-QP-TRAINCYCLE-FEED: when the $355M Orders-Closed advisory match runs, the snapshot surfaces it.
test("docustrata-actuals match present -> snapshot surfaces the advisory verdict", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, {
    ...FULL_OPTS,
    docustrataMatch: {
      ok: true,
      verdict: "predicted-low",
      median_ratio: 0.82,
      within_band_pct: 0.41,
      actual_total_usd: 355_000_000,
      actuals_priced: 6718,
    },
  });
  assert.ok(s.docustrata_actuals_match, "advisory match object present");
  assert.equal(s.docustrata_actuals_match.verdict, "predicted-low");
  assert.equal(s.docustrata_actuals_match.median_ratio, 0.82);
  assert.equal(s.docustrata_actuals_match.within_band_pct, 0.41);
  assert.equal(s.docustrata_actuals_match.actual_total_usd, 355_000_000);
  assert.equal(s.docustrata_actuals_match.actuals_priced, 6718);
  assert.equal(s.docustrata_actuals_match.advisory, true, "advisory flag is always true -- never alters the factor");
});

test("stable shape: every required key is present (frontend contract)", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, FULL_OPTS);
  for (const k of REQUIRED_KEYS) assert.ok(k in s, `missing required key: ${k}`);
  // No extra unexpected top-level keys (catches accidental shape drift both ways).
  assert.deepEqual(Object.keys(s).sort(), [...REQUIRED_KEYS].sort());
});

test("defensive: null result yields a stable, JSON-serializable snapshot (no throw)", () => {
  const s = buildTrainingStatusSnapshot(null, { tsIso: TS });
  for (const k of REQUIRED_KEYS) assert.ok(k in s, `missing required key on null result: ${k}`);
  assert.equal(s.ok, false);
  assert.equal(s.total_predicted, 0);
  assert.equal(s.mape_pct, null);
  assert.equal(s.baseline_source, null);
  assert.equal(s.baseline_fallback, null);
  assert.equal(s.skip_reason, null);
  assert.deepEqual(s.baseline_warnings, []);
  assert.equal(s.data_source_coverage, null);
  assert.equal(s.real_distribution_match, null);
  // must round-trip through JSON (it's persisted + sent to the frontend)
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(s)));
});

test("defensive: partial result (no report.metrics) → mape_pct null, total 0", () => {
  const s = buildTrainingStatusSnapshot({ ok: false, reason: "engine load failed" }, { tsIso: TS });
  assert.equal(s.ok, false);
  assert.equal(s.reason, "engine load failed");
  assert.equal(s.mape_pct, null);
  assert.equal(s.total_predicted, 0);
});

test("real_distribution_match is null when the match did not run (rm.ok false)", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, { ...FULL_OPTS, realMatch: { ok: false, reason: "no reference" } });
  assert.equal(s.real_distribution_match, null);
});

test("malformed dataCoverage fields degrade to null, not crash", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, { ...FULL_OPTS, dataCoverage: { consumed_count: "two", coverage_pct: null } });
  assert.equal(s.data_source_coverage.consumed_count, null);
  assert.equal(s.data_source_coverage.coverage_pct, null);
  assert.deepEqual(s.data_source_coverage.unconsumed_available, []);
});

test("non-array baselineWarnings degrades to []", () => {
  const s = buildTrainingStatusSnapshot(FULL_RESULT, { ...FULL_OPTS, baselineWarnings: "oops" });
  assert.deepEqual(s.baseline_warnings, []);
});
