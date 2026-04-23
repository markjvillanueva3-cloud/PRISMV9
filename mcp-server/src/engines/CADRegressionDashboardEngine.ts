/**
 * CADRegressionDashboardEngine — U-CINF08 (CAD-INFRA-MS0)
 *
 * Read-only aggregation layer over the per-batch TestBatch JSON documents
 * written by CADTestCheckpointEngine. Produces dashboard-facing snapshots
 * that the CINF09 web UI can render without owning any state itself.
 *
 * Pure function layer — no writes. Given a batchId, this engine:
 *   1. Loads `{stateDir}/{batchId}.json` via injectable FS
 *   2. Computes top-line counters (pass/fail/error/skip/pending/running)
 *   3. Bins errors by ErrorType (format|parse|generation|comparison|timeout|crash)
 *   4. Estimates ETA from average terminal duration × remaining count
 *   5. Measures throughput over the last N minutes of completedAt timestamps
 *   6. Returns the most recent K failures sorted by completedAt desc
 *
 * Duplication check: existing dashboard/monitor engines are domain-specific
 * (InstructorDashboardEngine, HyperMillJobMonitor, etc.). None of them read
 * the CADTestCheckpointEngine state format. Safe to create.
 *
 * @module engines/CADRegressionDashboardEngine
 */

import * as nodePath from "path";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import {
  parseTestBatch,
  type TestBatch,
  type TestFileEntry,
  type TestStatus,
  type ErrorType,
} from "../schemas/cadRegressionTestSchema.js";

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_STATE_DIR = nodePath.resolve(
  process.cwd(),
  "data/state/cad-regression-tests",
);

/** Default rolling window (minutes) used for throughput calculation. */
export const DEFAULT_THROUGHPUT_WINDOW_MIN = 5;

/** Default number of recent failures returned in a snapshot. */
export const DEFAULT_RECENT_FAILURES = 10;

// ── Injectable FS ─────────────────────────────────────────────────────────────

export interface DashboardFS {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: "utf-8"): string;
  readdirSync(p: string): string[];
}

// ── Output shapes ─────────────────────────────────────────────────────────────

export type BatchLifecycleStatus = "running" | "completed" | "empty";

export interface DashboardCounts {
  total: number;
  completed: number;
  pending: number;
  running: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
}

export interface ErrorBreakdown {
  format: number;
  parse: number;
  generation: number;
  comparison: number;
  timeout: number;
  crash: number;
  /** Count where errorType is "none" but status is fail/error (data bug). */
  unclassified: number;
}

export interface ThroughputEstimate {
  /**
   * Average wall-clock duration over terminal entries (ms). Undefined if no
   * terminal entries exist yet.
   */
  avgTerminalDurationMs: number | null;
  /**
   * Files that reached a terminal state within the rolling window (count).
   */
  windowedCompletedCount: number;
  /** Size of the rolling window in minutes. */
  windowMinutes: number;
  /**
   * Throughput expressed as terminal files per minute over the window.
   * Null if window has no terminal entries.
   */
  filesPerMinute: number | null;
  /**
   * Estimated remaining wall-clock in milliseconds. Null if avg duration
   * is unavailable (no terminal entries yet).
   */
  etaMs: number | null;
}

export interface RecentFailure {
  fileId: string;
  status: Extract<TestStatus, "fail" | "error">;
  errorType: ErrorType;
  durationMs: number;
  retries: number;
  completedAt: string | null;
}

export interface DashboardSnapshot {
  batchId: string;
  schemaVersion: 1;
  lifecycle: BatchLifecycleStatus;
  pctComplete: number;
  counts: DashboardCounts;
  errorBreakdown: ErrorBreakdown;
  throughput: ThroughputEstimate;
  recentFailures: RecentFailure[];
  createdAt: string;
  lastCheckpoint: string;
  updatedAt: string;
  snapshotAt: string;
}

export interface BatchSummary {
  batchId: string;
  lifecycle: BatchLifecycleStatus;
  total: number;
  completed: number;
  pctComplete: number;
  lastCheckpoint: string;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set<TestStatus>(["pass", "fail", "skip", "error"]);

export function isTerminal(status: TestStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Clamp to [0, 100] and round to nearest integer percent. */
export function pctComplete(total: number, completed: number): number {
  if (total <= 0) return 0;
  const raw = (completed / total) * 100;
  const clamped = Math.max(0, Math.min(100, raw));
  return Math.round(clamped);
}

export function tallyCounts(batch: TestBatch): DashboardCounts {
  const c: DashboardCounts = {
    total: 0,
    completed: 0,
    pending: 0,
    running: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errored: 0,
  };
  for (const entry of Object.values(batch.files)) {
    c.total++;
    switch (entry.status) {
      case "pending":
        c.pending++;
        break;
      case "running":
        c.running++;
        break;
      case "pass":
        c.passed++;
        c.completed++;
        break;
      case "fail":
        c.failed++;
        c.completed++;
        break;
      case "skip":
        c.skipped++;
        c.completed++;
        break;
      case "error":
        c.errored++;
        c.completed++;
        break;
    }
  }
  return c;
}

export function aggregateErrors(batch: TestBatch): ErrorBreakdown {
  const b: ErrorBreakdown = {
    format: 0,
    parse: 0,
    generation: 0,
    comparison: 0,
    timeout: 0,
    crash: 0,
    unclassified: 0,
  };
  for (const entry of Object.values(batch.files)) {
    if (entry.status !== "fail" && entry.status !== "error") continue;
    switch (entry.errorType) {
      case "format":
      case "parse":
      case "generation":
      case "comparison":
      case "timeout":
      case "crash":
        b[entry.errorType]++;
        break;
      case "none":
      default:
        b.unclassified++;
    }
  }
  return b;
}

/**
 * Derive a batch lifecycle status:
 *   empty     — zero files
 *   completed — every file in a terminal state
 *   running   — at least one non-terminal file
 */
export function lifecycle(batch: TestBatch): BatchLifecycleStatus {
  const files = Object.values(batch.files);
  if (files.length === 0) return "empty";
  const allTerminal = files.every((f) => isTerminal(f.status));
  return allTerminal ? "completed" : "running";
}

/**
 * Throughput estimator. Looks at entries whose `completedAt` falls within
 * the rolling window ending at `now`. Also computes an ETA using the
 * average terminal duration multiplied by remaining non-terminal count.
 *
 * @param batch         TestBatch document
 * @param now           Reference ISO timestamp (defaults to Date.now())
 * @param windowMinutes Rolling window width in minutes (default 5)
 */
export function throughputEstimate(
  batch: TestBatch,
  now: Date = new Date(),
  windowMinutes: number = DEFAULT_THROUGHPUT_WINDOW_MIN,
): ThroughputEstimate {
  const windowMs = Math.max(0, windowMinutes) * 60_000;
  const windowStart = now.getTime() - windowMs;

  let terminalCount = 0;
  let terminalDurationSum = 0;
  let windowedCompletedCount = 0;
  let remaining = 0;

  for (const entry of Object.values(batch.files)) {
    if (!isTerminal(entry.status)) {
      remaining++;
      continue;
    }
    terminalCount++;
    terminalDurationSum += entry.durationMs;
    if (entry.completedAt) {
      const ts = Date.parse(entry.completedAt);
      if (!Number.isNaN(ts) && ts >= windowStart && ts <= now.getTime()) {
        windowedCompletedCount++;
      }
    }
  }

  const avgTerminalDurationMs =
    terminalCount > 0 ? terminalDurationSum / terminalCount : null;

  const filesPerMinute =
    windowMinutes > 0 && windowedCompletedCount > 0
      ? windowedCompletedCount / windowMinutes
      : null;

  const etaMs =
    avgTerminalDurationMs !== null ? avgTerminalDurationMs * remaining : null;

  return {
    avgTerminalDurationMs,
    windowedCompletedCount,
    windowMinutes,
    filesPerMinute,
    etaMs,
  };
}

/**
 * Return the most recent `limit` failures (status fail|error) sorted by
 * `completedAt` descending. Entries with a missing `completedAt` come last.
 */
export function recentFailures(
  batch: TestBatch,
  limit: number = DEFAULT_RECENT_FAILURES,
): RecentFailure[] {
  const failures: RecentFailure[] = [];
  for (const [fileId, entry] of Object.entries(batch.files)) {
    if (entry.status !== "fail" && entry.status !== "error") continue;
    failures.push({
      fileId,
      status: entry.status,
      errorType: entry.errorType,
      durationMs: entry.durationMs,
      retries: entry.retries,
      completedAt: entry.completedAt ?? null,
    });
  }
  failures.sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return Date.parse(b.completedAt) - Date.parse(a.completedAt);
    }
    if (a.completedAt) return -1;
    if (b.completedAt) return 1;
    return 0;
  });
  return failures.slice(0, Math.max(0, limit));
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class CADRegressionDashboardEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADRegressionDashboardEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Read-only aggregation over cad-regression-tests state files. " +
        "Produces DashboardSnapshot for real-time progress rendering.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "snapshot",
        description: "Full dashboard snapshot for a single batch",
        actions: ["cad_regression_dashboard_snapshot"],
      },
      {
        name: "list",
        description: "Lightweight summary of every batch in the state dir",
        actions: ["cad_regression_dashboard_list"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as { op?: unknown };
    if (typeof o.op !== "string") return "input.op must be a string";
    if (!["snapshot", "list"].includes(o.op as string)) {
      return `input.op must be snapshot|list (got ${o.op})`;
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const o = input as {
      op: "snapshot" | "list";
      batchId?: string;
      stateDir?: string;
      windowMinutes?: number;
      recentLimit?: number;
      now?: string;
      fs?: DashboardFS;
    };
    if (o.op === "snapshot") {
      if (!o.batchId) throw new Error("snapshot requires batchId");
      const now = o.now ? new Date(o.now) : new Date();
      return this.snapshot(
        o.batchId,
        o.stateDir,
        o.windowMinutes,
        o.recentLimit,
        now,
        o.fs,
      );
    }
    if (o.op === "list") {
      return this.listBatches(o.stateDir, o.fs);
    }
    throw new Error(`unknown op ${o.op}`);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Produce a DashboardSnapshot for a single batch.
   *
   * @param batchId       UUID of the batch
   * @param stateDir      Override for DEFAULT_STATE_DIR
   * @param windowMinutes Rolling window for throughput (default 5 min)
   * @param recentLimit   Max recent failures returned (default 10)
   * @param now           Reference clock (default new Date())
   * @param fsImpl        Injectable FS for testing
   */
  async snapshot(
    batchId: string,
    stateDir: string = DEFAULT_STATE_DIR,
    windowMinutes: number = DEFAULT_THROUGHPUT_WINDOW_MIN,
    recentLimit: number = DEFAULT_RECENT_FAILURES,
    now: Date = new Date(),
    fsImpl?: DashboardFS,
  ): Promise<DashboardSnapshot> {
    const fs = fsImpl ?? (await this._defaultFS());
    const batch = this._loadBatch(batchId, stateDir, fs);
    const counts = tallyCounts(batch);
    return {
      batchId: batch.batchId,
      schemaVersion: 1,
      lifecycle: lifecycle(batch),
      pctComplete: pctComplete(counts.total, counts.completed),
      counts,
      errorBreakdown: aggregateErrors(batch),
      throughput: throughputEstimate(batch, now, windowMinutes),
      recentFailures: recentFailures(batch, recentLimit),
      createdAt: batch.createdAt,
      lastCheckpoint: batch.lastCheckpoint,
      updatedAt: batch.updatedAt,
      snapshotAt: now.toISOString(),
    };
  }

  /**
   * List every persisted batch in the state dir (one BatchSummary per file).
   * Returns [] if the dir is missing.
   */
  async listBatches(
    stateDir: string = DEFAULT_STATE_DIR,
    fsImpl?: DashboardFS,
  ): Promise<BatchSummary[]> {
    const fs = fsImpl ?? (await this._defaultFS());
    if (!fs.existsSync(stateDir)) return [];
    const entries = fs.readdirSync(stateDir).filter((n) => n.endsWith(".json"));
    const summaries: BatchSummary[] = [];
    for (const name of entries) {
      const batchId = name.slice(0, -5);
      try {
        const batch = this._loadBatch(batchId, stateDir, fs);
        const counts = tallyCounts(batch);
        summaries.push({
          batchId: batch.batchId,
          lifecycle: lifecycle(batch),
          total: counts.total,
          completed: counts.completed,
          pctComplete: pctComplete(counts.total, counts.completed),
          lastCheckpoint: batch.lastCheckpoint,
        });
      } catch {
        /* corrupt batch file — skip rather than fail the whole list */
      }
    }
    summaries.sort((a, b) =>
      Date.parse(b.lastCheckpoint) - Date.parse(a.lastCheckpoint),
    );
    return summaries;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _loadBatch(
    batchId: string,
    stateDir: string,
    fs: DashboardFS,
  ): TestBatch {
    const path = nodePath.join(stateDir, `${batchId}.json`);
    if (!fs.existsSync(path)) {
      throw new Error(`batch not found: ${batchId} (path=${path})`);
    }
    const raw = fs.readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return parseTestBatch(parsed);
  }

  private async _defaultFS(): Promise<DashboardFS> {
    const mod = await import("fs");
    return mod as unknown as DashboardFS;
  }
}

/** Singleton for dispatcher use. */
export const cadRegressionDashboardEngine = new CADRegressionDashboardEngine();

// Re-export TestFileEntry for consumers constructing fixture data in tests
export type { TestFileEntry };
