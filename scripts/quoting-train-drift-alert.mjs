#!/usr/bin/env node
/**
 * quoting-train-drift-alert — alert-classifier for iter11 summarizeLedger output.
 *
 * summarizeLedger produces a 16-field summary (11 base + 5 reference-reliability fields
 * added by U-QP-DRIFT-REF-RELIABILITY); humans/dashboards need ONE flag to know
 * whether to act. iter12 ships detectDriftAlert(summary, thresholds?) -> Alert
 * with deterministic rule precedence:
 *
 *   ALERT  (P0 — needs human now)
 *     - cov_gate_fail_rate >= 0.5 (CoV refusing >=50% of cycles = bad calibration)
 *     - mape_pct_p95 >= 500   (catastrophic prediction error)
 *     - mape_trend === "rising" AND mape_pct_avg >= 100 (regressing while bad)
 *
 *   WARN   (P1 — investigate next maintenance window)
 *     - cov_gate_fail_rate >= 0.25
 *     - mape_pct_p95 >= 100
 *     - mape_trend === "rising"
 *     - safe_to_activate_rate < 0.5
 *
 *   INFO   (P2 — not actionable but worth noting)
 *     - count < 3 (insufficient history)
 *     - psi_delta_fed_total === 0 across the window (PSN autonomy loop unfed)
 *
 *   OK     (none of the above)
 *
 * Highest-precedence label wins; all matching reasons are listed.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DRIFT-ALERT (charlie /goal-yolo iter12)
 */

import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseLedgerLines, summarizeLedger } from "./quoting-train-history-summary.mjs";

/**
 * iter15: pure state-file shape — every drift-alert run emits this payload to
 * state/shared/quoting/latest-drift-alert.json so dashboards / PSN legs can
 * read the current alert level WITHOUT re-running the chain. Exported so the
 * test file pins the on-disk contract.
 *
 * Fixed 4-key shape: { ts_iso, alert, summary, schema_version }.
 * schema_version bumps on any breaking field change downstream depends on.
 */
export function buildDriftStateFile(alert, summary, tsIso = new Date().toISOString()) {
  return {
    schema_version: "1.0.0",
    ts_iso: tsIso,
    alert: alert ?? { level: "info", reasons: ["alert input missing"], counts: { alerts: 0, warns: 0, infos: 1 } },
    summary: summary ?? null,
  };
}

/**
 * Default thresholds — overridable per-call. Sourced from the chain's
 * observed behavior pre-Docustrata-bridge (MAPE 2108% stub, 0/50 records gated,
 * 1 cycle in history) so defaults align with realistic ranges.
 */
export const DEFAULT_THRESHOLDS = Object.freeze({
  alert_cov_gate_fail_rate: 0.5,
  alert_mape_p95: 500,
  alert_mape_avg_when_rising: 100,
  warn_cov_gate_fail_rate: 0.25,
  warn_mape_p95: 100,
  warn_safe_rate: 0.5,
  info_min_count: 3,
});

/**
 * Pure classifier. Defensive against null/undefined summary, non-finite stats.
 */
export function detectDriftAlert(summary, thresholds = DEFAULT_THRESHOLDS) {
  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds ?? {}) };
  const s = summary ?? {};
  const alerts = [];
  const warns = [];
  const infos = [];

  const count = typeof s.count === "number" ? s.count : 0;
  const covFail = typeof s.cov_gate_fail_rate === "number" ? s.cov_gate_fail_rate : 0;
  const safeRate = typeof s.safe_to_activate_rate === "number" ? s.safe_to_activate_rate : 0;
  const mapeAvg = typeof s.mape_pct_avg === "number" && Number.isFinite(s.mape_pct_avg) ? s.mape_pct_avg : null;
  const mapeP95 = typeof s.mape_pct_p95 === "number" && Number.isFinite(s.mape_pct_p95) ? s.mape_pct_p95 : null;
  const trend = s.mape_trend;
  const psiTotal = typeof s.psi_delta_fed_total === "number" ? s.psi_delta_fed_total : 0;

  // ALERT rules (P0)
  if (covFail >= t.alert_cov_gate_fail_rate) {
    alerts.push(`cov_gate_fail_rate=${(covFail * 100).toFixed(1)}% (>=${(t.alert_cov_gate_fail_rate * 100).toFixed(0)}% threshold)`);
  }
  if (mapeP95 !== null && mapeP95 >= t.alert_mape_p95) {
    alerts.push(`mape_pct_p95=${mapeP95.toFixed(1)}% (>=${t.alert_mape_p95}% threshold — catastrophic)`);
  }
  if (trend === "rising" && mapeAvg !== null && mapeAvg >= t.alert_mape_avg_when_rising) {
    alerts.push(`MAPE rising while avg=${mapeAvg.toFixed(1)}% already high (>=${t.alert_mape_avg_when_rising}%)`);
  }

  // WARN rules (P1) — only surface if not already in ALERT for the same axis
  if (alerts.length === 0 || !alerts.some(a => a.startsWith("cov_gate_fail_rate"))) {
    if (covFail >= t.warn_cov_gate_fail_rate) {
      warns.push(`cov_gate_fail_rate=${(covFail * 100).toFixed(1)}% (>=${(t.warn_cov_gate_fail_rate * 100).toFixed(0)}% threshold)`);
    }
  }
  if (alerts.length === 0 || !alerts.some(a => a.startsWith("mape_pct_p95"))) {
    if (mapeP95 !== null && mapeP95 >= t.warn_mape_p95) {
      warns.push(`mape_pct_p95=${mapeP95.toFixed(1)}% (>=${t.warn_mape_p95}% threshold)`);
    }
  }
  if (alerts.length === 0 || !alerts.some(a => a.startsWith("MAPE rising"))) {
    if (trend === "rising") {
      warns.push(`MAPE trend rising (avg=${mapeAvg !== null ? mapeAvg.toFixed(1) + "%" : "n/a"})`);
    }
  }
  if (safeRate < t.warn_safe_rate && count > 0) {
    warns.push(`safe_to_activate_rate=${(safeRate * 100).toFixed(1)}% (<${(t.warn_safe_rate * 100).toFixed(0)}% — calibrations rarely safe)`);
  }

  // INFO rules (P2)
  if (count < t.info_min_count) {
    infos.push(`count=${count} (<${t.info_min_count} — insufficient history)`);
  }
  if (count >= t.info_min_count && psiTotal === 0) {
    infos.push(`psi_delta_fed_total=0 across ${count}-row window (PSN autonomy loop unfed)`);
  }

  const level =
    alerts.length > 0 ? "alert"
    : warns.length > 0 ? "warn"
    : infos.length > 0 ? "info"
    : "ok";

  return {
    level,
    reasons: [...alerts, ...warns, ...infos],
    counts: { alerts: alerts.length, warns: warns.length, infos: infos.length },
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
    const payload = { level: "info", reasons: [`ledger missing: ${ledgerPath}`], counts: { alerts: 0, warns: 0, infos: 1 } };
    if (jsonOut) process.stdout.write(JSON.stringify(payload) + "\n");
    else process.stdout.write(`[drift-alert] INFO ledger missing: ${ledgerPath}\n`);
    process.exit(0);
  }

  const rows = parseLedgerLines(raw);
  const summary = summarizeLedger(rows, windowN);
  const alert = detectDriftAlert(summary);

  // iter15: emit latest-drift-alert.json (atomic tmp+rename, non-fatal).
  // Dashboards / PSN legs read this without re-running the chain.
  try {
    const statePath = resolve(process.cwd(), val("state-out", "state/shared/quoting/latest-drift-alert.json"));
    await fs.mkdir(dirname(statePath), { recursive: true });
    const payload = buildDriftStateFile(alert, summary);
    const tmp = `${statePath}.tmp-${Date.now()}-${process.pid}`;
    await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf-8");
    await fs.rename(tmp, statePath);
  } catch (e) {
    process.stderr.write(`[drift-alert] state-file emit failed (non-fatal): ${e}\n`);
  }

  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ...alert, summary }) + "\n");
  } else {
    const tag = alert.level.toUpperCase().padEnd(5);
    process.stdout.write(`[drift-alert] ${tag} | ${alert.reasons.join(" · ") || "all clear"}\n`);
  }
  // exit 2 for alert (so cron can grep), 1 for warn, 0 for ok/info
  process.exit(alert.level === "alert" ? 2 : alert.level === "warn" ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[drift-alert] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
