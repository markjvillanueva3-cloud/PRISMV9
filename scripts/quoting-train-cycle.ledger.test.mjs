/**
 * quoting-train-cycle.ledger — iter10 unit test for buildLedgerRow.
 *
 * Pins the JSONL row shape every train-cycle invocation appends to
 * state/shared/quoting/train-cycle-history.jsonl. Downstream drift-audit
 * tools depend on this shape staying stable.
 *
 * Run: node --test scripts/quoting-train-cycle.ledger.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAIN-CYCLE-LEDGER (charlie /goal-yolo iter10)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLedgerRow } from "./quoting-train-cycle.mjs";

const FIXED_TS = "2026-05-26T04:30:00.000Z";

// ---------- happy path: full success result ----------
test("buildLedgerRow: full success result yields complete row", () => {
  const result = {
    ok: true,
    reason: undefined,
    report: { total_predicted: 50, metrics: { mape_pct: 12.5 } },
    safe_to_activate: true,
    active_factor_written: true,
    active_factor_path: "H:/prism/state/shared/quoting/active-calibration.json",
    psi_delta_fed_count: 3,
    warnings: [],
  };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.deepEqual(row, {
    ts_iso: FIXED_TS,
    ok: true,
    reason: null,
    total_predicted: 50,
    mape_pct: 12.5,
    safe_to_activate: true,
    active_factor_written: true,
    active_factor_path: "H:/prism/state/shared/quoting/active-calibration.json",
    psi_delta_fed_count: 3,
    skip_reason: null,
    warnings_count: 0,
    reference_reliable: null,
    reliability_verdict: null,
  });
});

// ---------- failure mode 1: GATED (CoV failed, no factor written) ----------
test("buildLedgerRow: CoV-gated result preserves skip_reason + zero-effect flags", () => {
  const result = {
    ok: true,
    report: { total_predicted: 20, metrics: { mape_pct: 312 } },
    safe_to_activate: false,
    active_factor_written: false,
    active_factor_path: null,
    psi_delta_fed_count: 0,
    skip_reason: "cov-gate-failed: cov_pct=85.4 > threshold=50",
    warnings: ["High variance in per-customer factors"],
  };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.equal(row.ok, true);
  assert.equal(row.safe_to_activate, false);
  assert.equal(row.active_factor_written, false);
  assert.equal(row.skip_reason, "cov-gate-failed: cov_pct=85.4 > threshold=50");
  assert.equal(row.warnings_count, 1);
  assert.equal(row.mape_pct, 312);
});

// ---------- failure mode 2: engine error / ok=false ----------
test("buildLedgerRow: engine error result yields ok=false + reason", () => {
  const result = {
    ok: false,
    reason: "training engine threw: TypeError baseline.records.map is not a function",
    report: undefined,
  };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.equal(row.ok, false);
  assert.equal(row.reason, "training engine threw: TypeError baseline.records.map is not a function");
  assert.equal(row.total_predicted, 0);
  assert.equal(row.mape_pct, null);
  assert.equal(row.warnings_count, 0);
});

// ---------- failure mode 3: empty report shape ----------
test("buildLedgerRow: empty report shape doesn't throw", () => {
  const result = { ok: true, report: {} };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.equal(row.total_predicted, 0);
  assert.equal(row.mape_pct, null);
  assert.equal(row.warnings_count, 0);
});

// ---------- adversarial 1: null result ----------
test("buildLedgerRow: null result still yields a valid row (no throw)", () => {
  const row = buildLedgerRow(null, FIXED_TS);
  assert.equal(row.ts_iso, FIXED_TS);
  assert.equal(row.ok, false);
  assert.equal(row.reason, null);
  assert.equal(row.total_predicted, 0);
  assert.equal(row.mape_pct, null);
  assert.equal(row.safe_to_activate, false);
  assert.equal(row.active_factor_written, false);
});

// ---------- adversarial 2: undefined result ----------
test("buildLedgerRow: undefined result yields valid row", () => {
  const row = buildLedgerRow(undefined, FIXED_TS);
  assert.equal(row.ok, false);
  assert.equal(row.total_predicted, 0);
});

// ---------- adversarial 3: NaN/Infinity in mape_pct ----------
test("buildLedgerRow: NaN mape_pct passes through (typeof number is true for NaN — surfaces the bad signal)", () => {
  const result = { ok: true, report: { metrics: { mape_pct: NaN } } };
  const row = buildLedgerRow(result, FIXED_TS);
  // NaN is typeof number — pass through. Drift-audit tooling can filter Number.isFinite.
  assert.equal(Number.isNaN(row.mape_pct), true);
});

test("buildLedgerRow: Infinity mape_pct passes through", () => {
  const result = { ok: true, report: { metrics: { mape_pct: Infinity } } };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.equal(row.mape_pct, Infinity);
});

// ---------- adversarial 4: string mape_pct rejected (must be null, not "12.5") ----------
test("buildLedgerRow: non-number mape_pct rejected to null", () => {
  const result = { ok: true, report: { metrics: { mape_pct: "12.5" } } };
  const row = buildLedgerRow(result, FIXED_TS);
  assert.equal(row.mape_pct, null);
});

// ---------- adversarial 5: warnings as non-array (string, object) ----------
test("buildLedgerRow: warnings as non-array yields 0", () => {
  for (const bad of ["warn", { length: 5 }, 42, null, undefined]) {
    const row = buildLedgerRow({ warnings: bad }, FIXED_TS);
    assert.equal(row.warnings_count, 0, `warnings=${JSON.stringify(bad)} should yield 0`);
  }
});

// ---------- shape stability: all 13 fields present, no extras ----------
test("buildLedgerRow: stable 13-key shape (no extra keys, no missing keys)", () => {
  const row = buildLedgerRow({}, FIXED_TS);
  const expectedKeys = [
    "ts_iso",
    "ok",
    "reason",
    "total_predicted",
    "mape_pct",
    "safe_to_activate",
    "active_factor_written",
    "active_factor_path",
    "psi_delta_fed_count",
    "skip_reason",
    "warnings_count",
    "reference_reliable",
    "reliability_verdict",
  ];
  assert.deepEqual(Object.keys(row).sort(), [...expectedKeys].sort());
});

// ---------- ts_iso default: when not passed, uses current time ----------
test("buildLedgerRow: ts_iso defaults to now when omitted", () => {
  const before = Date.now();
  const row = buildLedgerRow({});
  const after = Date.now();
  const rowTs = new Date(row.ts_iso).getTime();
  assert.ok(rowTs >= before && rowTs <= after, "ts_iso should be in [before, after] range");
});

// ---------- JSONL roundtrip: row stringifies + parses cleanly ----------
test("buildLedgerRow: row roundtrips through JSON.stringify/parse", () => {
  const result = {
    ok: true,
    report: { total_predicted: 100, metrics: { mape_pct: 8.3 } },
    safe_to_activate: true,
    active_factor_written: true,
    psi_delta_fed_count: 7,
  };
  const row = buildLedgerRow(result, FIXED_TS);
  const jsonl = JSON.stringify(row);
  const parsed = JSON.parse(jsonl);
  assert.deepEqual(parsed, row);
  assert.equal(jsonl.includes("\n"), false, "single-row JSONL must not contain embedded newline");
});

// ---------- iter10: reference-reliability capture (U-QP-LEDGER-REF-RELIABILITY) ----------
test("buildLedgerRow: realMatch populates reference_reliable + reliability_verdict (drift-audit signal)", () => {
  const row = buildLedgerRow({ ok: true }, FIXED_TS, { reference_reliable: false, reliability_verdict: "degenerate-reference" });
  assert.equal(row.reference_reliable, false);
  assert.equal(row.reliability_verdict, "degenerate-reference");
});

test("buildLedgerRow: ok-reliable realMatch records true + ok", () => {
  const row = buildLedgerRow({ ok: true }, FIXED_TS, { reference_reliable: true, reliability_verdict: "ok" });
  assert.equal(row.reference_reliable, true);
  assert.equal(row.reliability_verdict, "ok");
});

test("buildLedgerRow: no realMatch → reliability fields present-as-null (stable schema, not absent)", () => {
  const row = buildLedgerRow({ ok: true }, FIXED_TS);
  assert.equal(row.reference_reliable, null);
  assert.equal(row.reliability_verdict, null);
  assert.equal("reference_reliable" in row, true);
  assert.equal("reliability_verdict" in row, true);
});

test("buildLedgerRow: malformed realMatch fields rejected to null (type-validated, never passes garbage through)", () => {
  const row = buildLedgerRow({}, FIXED_TS, { reference_reliable: "yes", reliability_verdict: 42 });
  assert.equal(row.reference_reliable, null);
  assert.equal(row.reliability_verdict, null);
});
