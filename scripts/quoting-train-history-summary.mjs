#!/usr/bin/env node
/**
 * quoting-train-history-summary — closed-loop reader for the iter10 ledger.
 *
 * iter10 shipped state/shared/quoting/train-cycle-history.jsonl as a write-only
 * audit trail. iter11 closes the loop: pure-function summarizer aggregates the
 * last N rows into rolling-window calibration-drift metrics any dashboard /
 * chat / PSN leg can consume.
 *
 * Exports:
 *   summarizeLedger(rows, windowN=20) -> Summary
 *     { count, window_n, mape_pct_avg, mape_pct_p50, mape_pct_p95,
 *       mape_trend, cov_gate_fail_rate, safe_to_activate_rate,
 *       psi_delta_fed_total, latest_factor_path, last_run_iso }
 *   parseLedgerLines(text) -> Row[]  (corrupt-line tolerant)
 *
 * Usage (CLI):
 *   node H:/prism/scripts/quoting-train-history-summary.mjs
 *   node H:/prism/scripts/quoting-train-history-summary.mjs --json --window 50
 *   node H:/prism/scripts/quoting-train-history-summary.mjs --ledger <path>
 *
 * Exit codes: 0 = read ok (summary printed) · 1 = ledger missing/empty
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAIN-HISTORY-SUMMARY (charlie /goal-yolo iter11)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Parse JSONL text into Row[] — corrupt-line tolerant (silent-skip per line).
 * Trailing newlines OK. Empty input -> [].
 */
export function parseLedgerLines(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t);
      if (row && typeof row === "object" && !Array.isArray(row)) out.push(row);
    } catch { /* drop corrupt */ }
  }
  return out;
}

/**
 * Compute simple Pearson-direction trend on a numeric series — returns
 * "rising", "falling", or "flat" based on least-squares slope sign. Used for
 * mape_trend so dashboards know if MAPE is improving (falling) or regressing
 * (rising). Flat band defined as |slope/avg| < 0.01.
 */
function trendOf(series) {
  const n = series.length;
  if (n < 3) return "insufficient";
  const xs = series.map((_, i) => i);
  const xBar = (n - 1) / 2;
  const yBar = series.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xBar) * (series[i] - yBar);
    den += (xs[i] - xBar) ** 2;
  }
  if (den === 0) return "flat";
  const slope = num / den;
  const denom = Math.abs(yBar) > 1e-9 ? Math.abs(yBar) : 1;
  const rel = Math.abs(slope) / denom;
  if (rel < 0.01) return "flat";
  return slope > 0 ? "rising" : "falling";
}

function percentile(sortedNums, p) {
  // Nearest-rank method: idx = ceil(p * N / 100) - 1, clamped to [0, N-1].
  // For p95 of [280, 300, 312]: ceil(0.95*3)-1 = 2 -> 312 (tail tracks worst,
  // not floor-interp-middle which gave 300). Standard NIST handbook 1.3.5.6.
  if (sortedNums.length === 0) return null;
  if (sortedNums.length === 1) return sortedNums[0];
  const raw = Math.ceil((p / 100) * sortedNums.length) - 1;
  const idx = Math.min(sortedNums.length - 1, Math.max(0, raw));
  return sortedNums[idx];
}

/**
 * Pure summarizer — Row[] -> Summary. Defensive: accepts non-array, returns
 * empty-zero summary. Window slices the LAST N rows (most-recent).
 */
// Reference-drift advisory thresholds (dimensionless sample-quality bounds, NOT price constants).
// Alert when >= half of MEASURED cycles had an unreliable calibration reference, with >= 3 measured.
const REF_DRIFT_MIN_MEASURED = 3;
const REF_DRIFT_RATE_THRESHOLD = 0.5;

export function summarizeLedger(rows, windowN = 20) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeWindow = Number.isFinite(windowN) && windowN > 0 ? Math.floor(windowN) : 20;
  const window = safeRows.slice(-safeWindow);
  const count = window.length;

  if (count === 0) {
    return {
      count: 0,
      window_n: safeWindow,
      mape_pct_avg: null,
      mape_pct_p50: null,
      mape_pct_p95: null,
      mape_trend: "insufficient",
      cov_gate_fail_rate: 0,
      safe_to_activate_rate: 0,
      psi_delta_fed_total: 0,
      latest_factor_path: null,
      last_run_iso: null,
      reference_measured_count: 0,
      reference_unreliable_count: 0,
      reference_unreliable_rate: null,
      latest_reliability_verdict: null,
      reference_drift_alert: false,
    };
  }

  // mape_pct: only finite numbers count (NaN/Infinity from buildLedgerRow's
  // pass-through gets filtered here, where dashboards expect clean stats).
  const finiteMape = window
    .map(r => r?.mape_pct)
    .filter(v => typeof v === "number" && Number.isFinite(v));
  const mapeAvg = finiteMape.length > 0
    ? finiteMape.reduce((s, v) => s + v, 0) / finiteMape.length
    : null;
  const sortedMape = [...finiteMape].sort((a, b) => a - b);
  const mapeP50 = percentile(sortedMape, 50);
  const mapeP95 = percentile(sortedMape, 95);
  const mapeTrend = trendOf(finiteMape);

  // gate failure = ok=true (engine ran) AND safe_to_activate=false (CoV gated)
  let gateFailCount = 0;
  let safeCount = 0;
  let psiSum = 0;
  // U-QP-DRIFT-REF-RELIABILITY: track calibration-reference health over the window.
  // reference_reliable is a tri-state in the ledger: true / false / null (not measured —
  // no real_distribution_match this cycle). Only boolean rows count as "measured"; nulls
  // are excluded from the rate so an all-unmeasured window never fabricates a drift signal.
  let refReliableCount = 0;
  let refUnreliableCount = 0;
  let refMeasuredCount = 0;
  for (const r of window) {
    const ok = r?.ok === true;
    const safe = r?.safe_to_activate === true;
    if (ok && !safe) gateFailCount++;
    if (safe) safeCount++;
    if (typeof r?.psi_delta_fed_count === "number" && Number.isFinite(r.psi_delta_fed_count)) {
      psiSum += r.psi_delta_fed_count;
    }
    if (r?.reference_reliable === true) { refReliableCount++; refMeasuredCount++; }
    else if (r?.reference_reliable === false) { refUnreliableCount++; refMeasuredCount++; }
  }
  // Drift alert: the reference has been unreliable in a MAJORITY of measured cycles, with
  // enough measured cycles to be meaningful. Read-only advisory — never gates a factor.
  const refUnreliableRate = refMeasuredCount > 0
    ? Math.round((refUnreliableCount / refMeasuredCount) * 1000) / 1000
    : null;
  const referenceDriftAlert = refMeasuredCount >= REF_DRIFT_MIN_MEASURED
    && refUnreliableRate !== null
    && refUnreliableRate >= REF_DRIFT_RATE_THRESHOLD;

  const latest = window[window.length - 1];
  return {
    count,
    window_n: safeWindow,
    mape_pct_avg: mapeAvg !== null ? Math.round(mapeAvg * 100) / 100 : null,
    mape_pct_p50: mapeP50 !== null ? Math.round(mapeP50 * 100) / 100 : null,
    mape_pct_p95: mapeP95 !== null ? Math.round(mapeP95 * 100) / 100 : null,
    mape_trend: mapeTrend,
    cov_gate_fail_rate: Math.round((gateFailCount / count) * 1000) / 1000,
    safe_to_activate_rate: Math.round((safeCount / count) * 1000) / 1000,
    psi_delta_fed_total: psiSum,
    latest_factor_path: latest?.active_factor_path ?? null,
    last_run_iso: latest?.ts_iso ?? null,
    reference_measured_count: refMeasuredCount,
    reference_unreliable_count: refUnreliableCount,
    reference_unreliable_rate: refUnreliableRate,
    latest_reliability_verdict: latest?.reliability_verdict ?? null,
    reference_drift_alert: referenceDriftAlert,
  };
}

// ---------- CLI ----------
const ARGS = process.argv.slice(2);
function flag(name) { return ARGS.includes(`--${name}`); }
function val(name, dflt) {
  const i = ARGS.indexOf(`--${name}`);
  return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : dflt;
}

async function main() {
  const ledgerPath = resolve(process.cwd(), val("ledger", "state/shared/quoting/train-cycle-history.jsonl"));
  const windowN = parseInt(val("window", "20"), 10);
  const jsonOut = flag("json");

  let raw;
  try {
    raw = await fs.readFile(ledgerPath, "utf-8");
  } catch (e) {
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "ledger read failed", path: ledgerPath, error: String(e) }) + "\n");
    } else {
      process.stderr.write(`[train-history-summary] FAIL: ${ledgerPath}: ${e}\n`);
    }
    process.exit(1);
  }

  const rows = parseLedgerLines(raw);
  if (rows.length === 0) {
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "no parseable rows", path: ledgerPath }) + "\n");
    } else {
      process.stderr.write(`[train-history-summary] FAIL: 0 parseable rows in ${ledgerPath}\n`);
    }
    process.exit(1);
  }

  const summary = summarizeLedger(rows, windowN);
  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ok: true, total_rows: rows.length, ...summary }) + "\n");
  } else {
    process.stdout.write(
      `[train-history-summary] window=${summary.count}/${summary.window_n} ` +
      `(total ${rows.length}) | MAPE avg=${summary.mape_pct_avg}% p50=${summary.mape_pct_p50}% p95=${summary.mape_pct_p95}% trend=${summary.mape_trend} | ` +
      `cov_gate_fail=${(summary.cov_gate_fail_rate * 100).toFixed(1)}% safe_rate=${(summary.safe_to_activate_rate * 100).toFixed(1)}% | ` +
      `psi_fed=${summary.psi_delta_fed_total} | last=${summary.last_run_iso}\n`,
    );
  }
  process.exit(0);
}

// iter11: only run main() when invoked as CLI, not when imported as a library.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[train-history-summary] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
