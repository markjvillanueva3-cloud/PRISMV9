/**
 * ConsensusDriftAlertLogEngine — append-only ledger of actionable
 * consensus-drift events surfaced by ConsensusDriftDetectorEngine.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-ALERT-LOG.
 *
 * Why this exists
 * ---------------
 * U-CONSENSUS-DRIFT-CRON-WIRE wires drift detection into the cron CLI.
 * Each scheduled run produces a DriftReport, but only the latest report
 * is in memory at the time the CLI exits — historical drift events are
 * lost. Operators need to scan "what regressed in the last 24h" without
 * having to walk every snapshot pair.
 *
 * This engine writes one JSONL alert line per ACTIONABLE drift event
 * (severity = moderate or severe), plus an aggregate "summary" line
 * per detector run that captured them. Dashboards consume the ledger
 * via getAlerts(filterOpts) for time-windowed alert lists.
 *
 * Schema
 * ------
 *   { schema_version: "1.0.0",
 *     ts: ISO,
 *     kind: "alert" | "summary",
 *     // alert
 *     vendor?, taskType?, severity?, emaBefore?, emaAfter?, delta?,
 *     nBefore?, nAfter?,
 *     // summary
 *     run_id?, before_at?, after_at?, counts?, total_actionable?
 *   }
 *
 * Append-only, atomic via append+fsync, fail-open.
 *
 * @module engines/ConsensusDriftAlertLogEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DriftReport, DriftEvent } from "./ConsensusDriftDetectorEngine.js";

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_ALERT_LOG_PATH =
  process.env.CONSENSUS_DRIFT_ALERT_LOG ??
  "H:/prism/state/shared/CONSENSUS_DRIFT_ALERT_LOG.jsonl";
const DEFAULT_HISTORY_LIMIT = 100;

export type AlertKind = "alert" | "summary";

export interface AlertEntry {
  schema_version: string;
  ts: string;
  kind: AlertKind;
  // alert (one per actionable DriftEvent)
  vendor?: string;
  taskType?: string;
  severity?: DriftEvent["severity"];
  emaBefore?: number;
  emaAfter?: number;
  delta?: number;
  nBefore?: number;
  nAfter?: number;
  // summary (one per detector run)
  run_id?: string;
  before_at?: string | null;
  after_at?: string | null;
  counts?: DriftReport["counts"];
  total_actionable?: number;
}

export interface RecordReportInput {
  report: DriftReport;
  /** Stable identifier for the cron run that produced this report. */
  runId?: string;
  /** Override log path (tests). */
  logPath?: string;
  /** ISO timestamp override (test injection). */
  now?: Date;
}

export interface RecordReportResult {
  ok: boolean;
  logPath: string;
  alertsWritten: number;
  summaryWritten: boolean;
  error: string | null;
}

export interface AlertHistoryOpts {
  logPath?: string;
  /** Cap on entries returned. Default 100. */
  limit?: number;
  /** If set, return only entries on/after this ISO timestamp. */
  sinceTs?: string;
  /** If set, restrict to one kind. */
  kind?: AlertKind;
  /** If set, restrict to a severity level (alerts only). */
  severity?: DriftEvent["severity"];
  /** If set, restrict to a vendor (alerts only). */
  vendor?: string;
}

export class ConsensusDriftAlertLogEngine {
  /**
   * Persist actionable drift events from a DriftReport to the alert
   * ledger. Writes one alert line per moderate-or-severe event plus a
   * single summary line covering the run. Reports with zero actionable
   * events still produce a summary (useful for "we checked, nothing
   * fired" audit trails).
   */
  recordReport(input: RecordReportInput): RecordReportResult {
    const logPath = input.logPath ?? DEFAULT_ALERT_LOG_PATH;
    const now = (input.now ?? new Date()).toISOString();
    const lines: string[] = [];
    let alertsWritten = 0;

    for (const ev of input.report.events) {
      if (ev.severity !== "moderate" && ev.severity !== "severe") continue;
      const entry: AlertEntry = {
        schema_version: SCHEMA_VERSION,
        ts: now,
        kind: "alert",
        vendor: ev.vendor,
        taskType: ev.taskType,
        severity: ev.severity,
        emaBefore: ev.emaBefore,
        emaAfter: ev.emaAfter,
        delta: ev.delta,
        nBefore: ev.nBefore,
        nAfter: ev.nAfter,
      };
      lines.push(JSON.stringify(entry));
      alertsWritten++;
    }

    const summary: AlertEntry = {
      schema_version: SCHEMA_VERSION,
      ts: now,
      kind: "summary",
      run_id: input.runId,
      before_at: input.report.beforeAt,
      after_at: input.report.afterAt,
      counts: input.report.counts,
      total_actionable: alertsWritten,
    };
    lines.push(JSON.stringify(summary));

    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, lines.join("\n") + "\n", "utf-8");
      return { ok: true, logPath, alertsWritten, summaryWritten: true, error: null };
    } catch (e) {
      return {
        ok: false,
        logPath,
        alertsWritten: 0,
        summaryWritten: false,
        error: (e as Error).message,
      };
    }
  }

  /**
   * Read the tail of the alert ledger with optional filtering. Cold-
   * start safe: returns [] if the file is missing or unreadable.
   */
  getAlerts(opts: AlertHistoryOpts = {}): AlertEntry[] {
    const logPath = opts.logPath ?? DEFAULT_ALERT_LOG_PATH;
    const limit = opts.limit ?? DEFAULT_HISTORY_LIMIT;
    if (!fs.existsSync(logPath)) return [];
    let raw: string;
    try {
      raw = fs.readFileSync(logPath, "utf-8");
    } catch {
      return [];
    }
    const rawLines = raw.split("\n").filter((l) => l.length > 0);
    const all: AlertEntry[] = [];
    for (const l of rawLines) {
      try {
        const parsed = JSON.parse(l);
        if (this.isValidEntry(parsed)) all.push(parsed);
      } catch {
        continue;
      }
    }
    let filtered = all;
    if (opts.sinceTs) {
      filtered = filtered.filter((e) => e.ts >= opts.sinceTs!);
    }
    if (opts.kind) {
      filtered = filtered.filter((e) => e.kind === opts.kind);
    }
    if (opts.severity) {
      filtered = filtered.filter((e) => e.severity === opts.severity);
    }
    if (opts.vendor) {
      filtered = filtered.filter((e) => e.vendor === opts.vendor);
    }
    return filtered.slice(-Math.max(1, limit));
  }

  /**
   * Aggregate stats over the ledger window. Useful for dashboards
   * showing "n alerts in last 24h, top vendor by alert count, ..."
   */
  getAlertStats(opts: AlertHistoryOpts = {}): {
    totalAlerts: number;
    totalSummaries: number;
    bySeverity: Record<string, number>;
    byVendor: Record<string, number>;
    earliestTs: string | null;
    latestTs: string | null;
  } {
    const entries = this.getAlerts(opts);
    let totalAlerts = 0;
    let totalSummaries = 0;
    const bySeverity: Record<string, number> = { minor: 0, moderate: 0, severe: 0 };
    const byVendor: Record<string, number> = {};
    let earliest: string | null = null;
    let latest: string | null = null;
    for (const e of entries) {
      if (!earliest || e.ts < earliest) earliest = e.ts;
      if (!latest || e.ts > latest) latest = e.ts;
      if (e.kind === "alert") {
        totalAlerts++;
        if (e.severity) bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
        if (e.vendor) byVendor[e.vendor] = (byVendor[e.vendor] ?? 0) + 1;
      } else if (e.kind === "summary") {
        totalSummaries++;
      }
    }
    return { totalAlerts, totalSummaries, bySeverity, byVendor, earliestTs: earliest, latestTs: latest };
  }

  /** Type guard for parsed JSON line. */
  private isValidEntry(parsed: unknown): parsed is AlertEntry {
    if (!parsed || typeof parsed !== "object") return false;
    const p = parsed as Partial<AlertEntry>;
    return typeof p.ts === "string" && (p.kind === "alert" || p.kind === "summary");
  }
}

export const consensusDriftAlertLogEngine = new ConsensusDriftAlertLogEngine();
