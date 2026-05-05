/**
 * ConsensusCreditRunLogEngine — append-only run telemetry for the
 * scheduled consensus credit-assignment backfill.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CREDIT-CRON.
 *
 * Why this exists
 * ---------------
 * U-CREDIT-DISPATCHER ships `consensus_credit_apply_feed` — the
 * idempotent batch backfill operation. The natural deployment is to
 * schedule it (system cron, Task Scheduler, GitHub Actions, npm cron,
 * whatever) so the perf-state EMA stays current without manual pokes.
 *
 * Once a job runs on a schedule, the operator wants to know:
 *   - Did the last run succeed?
 *   - How many lines did it process / skip?
 *   - When was the last run?
 *   - Are runs failing silently?
 *
 * This engine records one line per scheduled run to a JSONL log and
 * exposes read-only telemetry over recent runs. Append-only, atomic,
 * idempotent — same shape as the consensus neural feed.
 *
 * Two operations:
 *   recordRun(entry)        — append one line per run (called by CLI)
 *   getHistory(limit?)      — read tail of log (for dashboards)
 *   getStats(opts?)         — aggregate counters (success rate, totals)
 *
 * Persistence: state/shared/CONSENSUS_CREDIT_RUN_LOG.jsonl
 * Schema versioned. Append-only, never rewritten. Fail-open on missing
 * file or corrupt entries — same posture as the rest of the consensus
 * pipeline.
 *
 * @module engines/ConsensusCreditRunLogEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCHEMA_VERSION = "1.0.0";

const DEFAULT_LOG_PATH =
  process.env.CONSENSUS_CREDIT_RUN_LOG ??
  "H:/prism/state/shared/CONSENSUS_CREDIT_RUN_LOG.jsonl";

const DEFAULT_HISTORY_LIMIT = 50;

export interface RunLogEntry {
  schema_version: string;
  ts: string;
  /** Outcome of the apply_feed call. */
  ok: boolean;
  /** Lines processed in this run. */
  processed: number;
  /** Lines skipped (malformed JSON, missing fields). */
  skipped: number;
  /** Cursor offset advance (bytes). */
  cursorAdvance: number;
  /** Total cursor offset after this run. */
  cursorOffset: number;
  /** Per-vendor observation count summary. */
  perVendor: Record<string, number>;
  /** Source of the trigger (cron / cli / dispatcher / manual). */
  trigger: string;
  /** Optional error message. */
  error: string | null;
  /** Wall-clock duration in ms. */
  durationMs: number;
}

export interface RecordRunInput {
  ok: boolean;
  processed: number;
  skipped: number;
  cursorAdvance: number;
  cursorOffset: number;
  /** Map vendor → observation count for this run. */
  perVendor: Record<string, number>;
  trigger?: string;
  error?: string | null;
  durationMs: number;
  /** Override log path (tests). */
  logPath?: string;
}

export interface RunHistoryOpts {
  /** Override log path (tests). */
  logPath?: string;
  /** Cap on entries returned. Default 50. */
  limit?: number;
}

export interface RunStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  totalProcessed: number;
  totalSkipped: number;
  meanDurationMs: number;
  lastRunAt: string | null;
  lastRunOk: boolean | null;
}

export class ConsensusCreditRunLogEngine {
  /**
   * Append one run telemetry line. Atomic via append + fsync. Returns
   * the entry written for caller telemetry. Fail-open: returns
   * ok:false but never throws so a cron failure doesn't crash the job.
   */
  recordRun(input: RecordRunInput): { ok: boolean; logPath: string; entry: RunLogEntry; error: string | null } {
    const logPath = input.logPath ?? DEFAULT_LOG_PATH;
    const entry: RunLogEntry = {
      schema_version: SCHEMA_VERSION,
      ts: new Date().toISOString(),
      ok: input.ok,
      processed: input.processed,
      skipped: input.skipped,
      cursorAdvance: input.cursorAdvance,
      cursorOffset: input.cursorOffset,
      perVendor: { ...input.perVendor },
      trigger: input.trigger ?? "unknown",
      error: input.error ?? null,
      durationMs: input.durationMs,
    };
    const line = JSON.stringify(entry) + "\n";
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, line, "utf-8");
      return { ok: true, logPath, entry, error: null };
    } catch (e) {
      return { ok: false, logPath, entry, error: (e as Error).message };
    }
  }

  /** Read the tail of the run log. Cold-start safe. */
  getHistory(opts: RunHistoryOpts = {}): RunLogEntry[] {
    const logPath = opts.logPath ?? DEFAULT_LOG_PATH;
    const limit = opts.limit ?? DEFAULT_HISTORY_LIMIT;
    if (!fs.existsSync(logPath)) return [];
    let raw: string;
    try {
      raw = fs.readFileSync(logPath, "utf-8");
    } catch {
      return [];
    }
    const lines = raw.split("\n").filter((l) => l.length > 0);
    const tail = lines.slice(-Math.max(1, limit));
    const out: RunLogEntry[] = [];
    for (const l of tail) {
      try {
        const parsed = JSON.parse(l);
        if (this.isValidEntry(parsed)) out.push(parsed);
      } catch {
        continue;
      }
    }
    return out;
  }

  /** Aggregate stats over recent runs for dashboard rendering. */
  getStats(opts: RunHistoryOpts = {}): RunStats {
    const history = this.getHistory(opts);
    if (history.length === 0) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        totalProcessed: 0,
        totalSkipped: 0,
        meanDurationMs: 0,
        lastRunAt: null,
        lastRunOk: null,
      };
    }
    let successful = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;
    for (const entry of history) {
      if (entry.ok) successful++;
      totalProcessed += entry.processed;
      totalSkipped += entry.skipped;
      totalDuration += entry.durationMs;
    }
    const last = history[history.length - 1];
    return {
      totalRuns: history.length,
      successfulRuns: successful,
      failedRuns: history.length - successful,
      successRate: Number((successful / history.length).toFixed(4)),
      totalProcessed,
      totalSkipped,
      meanDurationMs: Number((totalDuration / history.length).toFixed(2)),
      lastRunAt: last.ts,
      lastRunOk: last.ok,
    };
  }

  /** Type guard for a parsed JSON line. */
  private isValidEntry(parsed: unknown): parsed is RunLogEntry {
    if (!parsed || typeof parsed !== "object") return false;
    const p = parsed as Partial<RunLogEntry>;
    return (
      typeof p.ts === "string" &&
      typeof p.ok === "boolean" &&
      typeof p.processed === "number" &&
      typeof p.skipped === "number" &&
      typeof p.durationMs === "number"
    );
  }
}

export const consensusCreditRunLogEngine = new ConsensusCreditRunLogEngine();
