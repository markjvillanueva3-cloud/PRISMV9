/**
 * AsyncHookDispatcherEngine — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
 *
 * Decouples Tier-4 (async/background) hooks from the synchronous Stop critical
 * path. The Stop hook in PRISM's harness blocks the session until every wired
 * Stop hook returns; a single slow hook (vitest gate, deep-test-sweep,
 * git-sync) can push wall-time past 30s. This engine offers two surfaces:
 *
 *   1. `enqueue(job)` — append a job descriptor to `async-hook-queue.jsonl`
 *      and spawn a *detached* child process (`scripts/async-hook-runner.mjs`)
 *      that will pick the job up, execute the wrapped hook, and append the
 *      outcome to `async-hook-results.jsonl`. Returns in <2 ms; the actual
 *      hook can take minutes without blocking the parent.
 *
 *   2. `runJob(jobId, env?, opts?)` — used *inside* the detached child. Reads
 *      the queue for the matching jobId, spawns the wrapped hook (synchronously
 *      this time — the runner process is already detached), forwards stdin
 *      passthrough if recorded, writes the timed result to the results JSONL,
 *      removes the entry from the queue.
 *
 * READ SURFACES (consumed by SessionStart hooks + nightly digest):
 *   - `getPendingJobs()`        — current queue contents (oldest first)
 *   - `getResults(filter)`      — past run results filtered by status/window
 *   - `getStats(windowMs)`      — per-hook fire counts, P95 duration, failure rate
 *   - `purgeOlderThan(ms)`      — janitor for both JSONLs
 *   - `isAvailable()`           — cheap file existence check
 *
 * SCHEMA — JSONL records carry `schemaVersion: 1` so future migrations can add
 * fields without breaking existing readers.
 *
 * SAFETY
 *   - Never throws on a missing JSONL — empty arrays / empty stats instead.
 *   - Malformed JSONL lines are skipped silently (one-time warn per session).
 *   - JSONLs auto-rotate at 50 MiB (same pattern as _envelope.mjs).
 *   - `spawnFn` is dependency-injectable so tests can verify spawn was called
 *     without actually forking a real subprocess.
 *
 * BACK-PRESSURE
 *   - `enqueue()` caps the live queue at MAX_QUEUE_DEPTH (default 200). When
 *     exceeded, the oldest entry is purged and the warning is reflected in
 *     the return payload (so the caller can surface the over-pressure event
 *     in telemetry).
 *
 * THIS FILE IS PURE — no top-level side effects beyond constructing the
 * singleton. All disk I/O happens inside methods. Constants are module-local;
 * physics constants are NOT relevant here (this is infrastructure, not
 * manufacturing physics), so the canonical-constants rule does not apply.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawn as defaultSpawn, type SpawnOptions, type ChildProcess } from "node:child_process";

// ── PATHS / CAPS / DEFAULTS ──────────────────────────────────────────────────

const HARNESS_ROOT = "H:/prism";
const DEFAULT_QUEUE_PATH = path.join(HARNESS_ROOT, "state/shared/async-hook-queue.jsonl");
const DEFAULT_RESULTS_PATH = path.join(HARNESS_ROOT, "state/shared/async-hook-results.jsonl");
const DEFAULT_RUNNER_SCRIPT = path.join(HARNESS_ROOT, "scripts/async-hook-runner.mjs");
const DEFAULT_NODE_BIN = "H:/.claude/bin/portable-node";

const SCHEMA_VERSION = 1;

const ROTATE_BYTES_DEFAULT = 50 * 1024 * 1024; // 50 MiB
const MAX_RECORD_BYTES = 8192;                  // hook ctx can be larger than latency rows
const MAX_QUEUE_DEPTH = 200;                    // back-pressure ceiling
const DEFAULT_HOOK_TIMEOUT_MS = 5 * 60 * 1000;  // 5 min — sane cap; can be overridden per-job
const ABSOLUTE_HOOK_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — even a "background" hook should never run longer
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;  // 24 h stats window by default
const MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 d cap
const DEFAULT_RESULT_LIMIT = 50;
const ABSOLUTE_RESULT_LIMIT = 1000;

// ── PUBLIC TYPES ─────────────────────────────────────────────────────────────

/** Job descriptor written to the queue JSONL. */
export interface AsyncHookJob {
  schemaVersion: number;
  jobId: string;             // sortable + unique: <ts-base36>-<rand4hex>
  hookPath: string;          // absolute path to the .mjs to invoke
  tier: string;              // T0|T1|T2|T3|T4|untagged|unknown — passed through, not validated
  event: string;             // e.g. "Stop", "PostToolUse"
  matcher: string;           // matcher that triggered the parent (Stop has no matcher → "")
  tool: string;              // tool name (Stop has no tool → "")
  timeoutMs: number;         // per-job timeout (capped at ABSOLUTE_HOOK_TIMEOUT_MS)
  enqueuedAt: string;        // ISO timestamp
  ctx?: unknown;             // arbitrary JSON-safe context the runner forwards as JSON stdin
}

/** Result record written to the results JSONL after runJob completes. */
export interface AsyncHookResult {
  schemaVersion: number;
  jobId: string;
  hookPath: string;
  tier: string;
  event: string;
  status: "succeeded" | "failed" | "timeout" | "skipped";
  exitCode: number;          // -1 if spawn failed; 124 if timeout (POSIX convention)
  signal: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stdoutBytes: number;       // size only — don't store full output (use the latency log for that)
  stderrBytes: number;
  error?: string;            // short message for failed/timeout/skipped
}

/** Per-hook aggregate over the requested window. */
export interface AsyncHookStats {
  hook: string;              // basename (no .mjs)
  fires: number;
  succeeded: number;
  failed: number;
  timeouts: number;
  p50DurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
  lastSeen: string;          // ISO of newest sample
}

/** Top-level stats summary returned by `getStats()`. */
export interface AsyncHookStatsSummary {
  totalFires: number;
  uniqueHooks: number;
  failureRate: number;       // fraction in [0, 1]
  windowMs: number;
  generatedAt: string;
  perHook: AsyncHookStats[];
}

/** Filters accepted by `getResults()`. */
export interface ResultsFilter {
  status?: "succeeded" | "failed" | "timeout" | "skipped" | "any";
  hook?: string;             // basename match (no .mjs)
  windowMs?: number;
  limit?: number;
}

/** Result returned by `enqueue()`. */
export interface EnqueueResult {
  ok: boolean;
  jobId: string;
  enqueuedAt: string;
  queueDepth: number;
  pressureWarning?: string;  // populated if back-pressure trimmed older entries
  spawnError?: string;       // populated if the detached runner spawn failed; job still queued
}

/** Engine construction options — tests pass `spawnFn` to avoid actual forks. */
export interface AsyncHookDispatcherOptions {
  queuePath?: string;
  resultsPath?: string;
  runnerScript?: string;
  nodeBin?: string;
  spawnFn?: (cmd: string, args: readonly string[], opts?: SpawnOptions) => ChildProcess;
  /** Optional clock injection — tests use this to make jobId deterministic. */
  now?: () => number;
  /** Optional jobId override for hermetic tests. */
  jobIdFn?: () => string;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class AsyncHookDispatcherEngine {
  private readonly queuePath: string;
  private readonly resultsPath: string;
  private readonly runnerScript: string;
  private readonly nodeBin: string;
  private readonly spawnFn: (cmd: string, args: readonly string[], opts?: SpawnOptions) => ChildProcess;
  private readonly now: () => number;
  private readonly jobIdFn?: () => string;

  // mtime-keyed caches for the read-path methods (pure derivations of disk content).
  private queueCache: AsyncHookJob[] | null = null;
  private queueCacheMtimeMs = 0;
  private queueCacheSize = 0;
  private resultsCache: AsyncHookResult[] | null = null;
  private resultsCacheMtimeMs = 0;
  private resultsCacheSize = 0;
  private readonly warned = new Set<string>();

  constructor(opts: AsyncHookDispatcherOptions = {}) {
    this.queuePath = opts.queuePath ?? DEFAULT_QUEUE_PATH;
    this.resultsPath = opts.resultsPath ?? DEFAULT_RESULTS_PATH;
    this.runnerScript = opts.runnerScript ?? DEFAULT_RUNNER_SCRIPT;
    this.nodeBin = opts.nodeBin ?? DEFAULT_NODE_BIN;
    // defaultSpawn is Node's spawn overload-union; pin to the narrow signature
    // the class field declares so TS picks the (cmd, args, opts) overload.
    this.spawnFn = opts.spawnFn ?? ((cmd, args, o) => defaultSpawn(cmd, [...args], o ?? {}));
    this.now = opts.now ?? Date.now;
    this.jobIdFn = opts.jobIdFn;
  }

  // ── enqueue ─────────────────────────────────────────────────────────────────

  /**
   * Append a job to the queue and spawn a detached runner. Returns immediately;
   * the runner does the heavy lifting in the background.
   *
   * @param input  Partial job descriptor — `hookPath` is required. `tier`,
   *               `event`, `matcher`, `tool` default to empty strings;
   *               `timeoutMs` defaults to DEFAULT_HOOK_TIMEOUT_MS (capped at
   *               ABSOLUTE_HOOK_TIMEOUT_MS).
   * @returns      `{ ok, jobId, queueDepth, [pressureWarning], [spawnError] }`
   * @throws       Never — invalid inputs return `{ ok: false, ... }` so the
   *               caller (a hook) can keep going without breaking the chain.
   */
  enqueue(input: {
    hookPath: string;
    tier?: string;
    event?: string;
    matcher?: string;
    tool?: string;
    timeoutMs?: number;
    ctx?: unknown;
  }): EnqueueResult {
    const enqueuedAt = new Date(this.now()).toISOString();
    const jobId = this.jobIdFn ? this.jobIdFn() : makeJobId(this.now());

    // Validation — return a structured failure, do not throw (we are in a hook).
    if (typeof input.hookPath !== "string" || input.hookPath.length === 0) {
      return {
        ok: false,
        jobId,
        enqueuedAt,
        queueDepth: this.safeQueueDepth(),
        spawnError: "invalid_hook_path",
      };
    }

    // Resolve and validate timeout — clamp to absolute ceiling, fall back to default.
    const rawTimeout = Number(input.timeoutMs);
    const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0
      ? Math.min(rawTimeout, ABSOLUTE_HOOK_TIMEOUT_MS)
      : DEFAULT_HOOK_TIMEOUT_MS;

    const job: AsyncHookJob = {
      schemaVersion: SCHEMA_VERSION,
      jobId,
      hookPath: input.hookPath,
      tier: typeof input.tier === "string" ? input.tier : "",
      event: typeof input.event === "string" ? input.event : "",
      matcher: typeof input.matcher === "string" ? input.matcher : "",
      tool: typeof input.tool === "string" ? input.tool : "",
      timeoutMs,
      enqueuedAt,
      ctx: input.ctx,
    };

    // Apply back-pressure BEFORE writing — keeps disk bounded.
    let pressureWarning: string | undefined;
    const trimmed = this.applyBackPressureIfNeeded();
    if (trimmed > 0) {
      pressureWarning = `purged_${trimmed}_older_entries_at_max_depth_${MAX_QUEUE_DEPTH}`;
    }

    // Best-effort write — failures here are reported but never throw.
    const writeError = this.appendJSONL(this.queuePath, job);
    if (writeError) {
      return {
        ok: false,
        jobId,
        enqueuedAt,
        queueDepth: this.safeQueueDepth(),
        pressureWarning,
        spawnError: `queue_write_failed:${writeError}`,
      };
    }

    // Spawn the detached runner. We don't wait — the runner will read the queue
    // entry on its own and write the result.
    let spawnError: string | undefined;
    try {
      const child = this.spawnFn(
        this.nodeBin,
        [this.runnerScript, "--job-id", jobId],
        {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        },
      );
      // .unref() detaches from the parent's event loop; without this the parent
      // would wait for the child to exit on its own clean shutdown. With it,
      // the child outlives the parent freely.
      if (child && typeof (child as ChildProcess).unref === "function") {
        (child as ChildProcess).unref();
      }
    } catch (err) {
      // The job is already queued — a later runner sweep can pick it up. Surface
      // the spawn error so the caller can flag it but consider the enqueue OK.
      spawnError = String((err as Error)?.message ?? err).slice(0, 200);
    }

    // Invalidate read-cache so subsequent reads pick up the new entry.
    this.invalidateQueueCache();

    return {
      ok: true,
      jobId,
      enqueuedAt,
      queueDepth: this.safeQueueDepth(),
      pressureWarning,
      spawnError,
    };
  }

  // ── runJob (called by the detached runner) ──────────────────────────────────

  /**
   * Execute a queued job synchronously inside the detached runner process.
   * Removes the entry from the queue (whether the run succeeds or not) and
   * appends a result row to the results JSONL.
   *
   * @param jobId  ID returned by enqueue()
   * @param opts.spawnFn  Optional override of the *child-spawn* used to run
   *                      the wrapped hook (separate from this.spawnFn which
   *                      spawns the runner itself).
   * @param opts.timeoutMs Per-call override of the job's timeoutMs.
   * @returns      The AsyncHookResult that was written.
   */
  async runJob(
    jobId: string,
    opts: { spawnFn?: AsyncHookDispatcherOptions["spawnFn"]; timeoutMs?: number } = {},
  ): Promise<AsyncHookResult> {
    const pending = this.loadQueue();
    const job = pending.find((j) => j.jobId === jobId);
    const startedAt = new Date(this.now()).toISOString();

    if (!job) {
      const skipped: AsyncHookResult = {
        schemaVersion: SCHEMA_VERSION,
        jobId,
        hookPath: "",
        tier: "",
        event: "",
        status: "skipped",
        exitCode: -1,
        signal: null,
        startedAt,
        completedAt: startedAt,
        durationMs: 0,
        stdoutBytes: 0,
        stderrBytes: 0,
        error: "job_not_found_in_queue",
      };
      this.appendJSONL(this.resultsPath, skipped);
      return skipped;
    }

    const runSpawn = opts.spawnFn ?? defaultSpawn;
    const timeoutMs = Math.min(
      Math.max(1, Number.isFinite(Number(opts.timeoutMs)) ? Number(opts.timeoutMs) : job.timeoutMs),
      ABSOLUTE_HOOK_TIMEOUT_MS,
    );

    const hrStart = process.hrtime.bigint();
    const startMs = this.now();

    // Execute via promise so we can race against the timeout cleanly.
    const result = await new Promise<{
      exitCode: number;
      signal: string | null;
      stdoutBytes: number;
      stderrBytes: number;
      timedOut: boolean;
      spawnErr?: string;
    }>((resolve) => {
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let timedOut = false;
      let settled = false;

      let child: ChildProcess;
      try {
        child = runSpawn(this.nodeBin, [job.hookPath], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (err) {
        resolve({
          exitCode: -1,
          signal: null,
          stdoutBytes: 0,
          stderrBytes: 0,
          timedOut: false,
          spawnErr: String((err as Error)?.message ?? err).slice(0, 200),
        });
        return;
      }

      // Forward ctx as JSON on stdin so wrapped hooks see exactly what a
      // synchronous fire would have given them.
      if (child.stdin && job.ctx !== undefined) {
        try { child.stdin.write(JSON.stringify(job.ctx)); } catch { /* pipe may already be closed */ }
      }
      if (child.stdin) {
        try { child.stdin.end(); } catch { /* same */ }
      }

      // Count bytes without storing — that's the latency log's job, not ours.
      if (child.stdout) child.stdout.on("data", (chunk: Buffer) => { stdoutBytes += chunk.length; });
      if (child.stderr) child.stderr.on("data", (chunk: Buffer) => { stderrBytes += chunk.length; });

      const timer = setTimeout(() => {
        timedOut = true;
        // Best-effort kill — child may already be done.
        try { child.kill("SIGTERM"); } catch { /* ignore */ }
        // Give it 500ms to die gracefully, then SIGKILL.
        setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* ignore */ } }, 500);
      }, timeoutMs);

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          signal: null,
          stdoutBytes,
          stderrBytes,
          timedOut: false,
          spawnErr: String(err?.message ?? err).slice(0, 200),
        });
      });

      child.on("close", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          exitCode: typeof code === "number" ? code : -1,
          signal: signal ? String(signal) : null,
          stdoutBytes,
          stderrBytes,
          timedOut,
        });
      });
    });

    const completedAt = new Date(this.now()).toISOString();
    const durationMs = Math.max(0, Number((process.hrtime.bigint() - hrStart) / 1_000_000n));

    let status: AsyncHookResult["status"];
    if (result.timedOut) status = "timeout";
    else if (result.spawnErr) status = "failed";
    else if (result.exitCode === 0) status = "succeeded";
    else status = "failed";

    const errorMessage = result.spawnErr
      ?? (result.timedOut ? `timeout_after_${timeoutMs}_ms` : (status === "failed" ? `exit_${result.exitCode}` : undefined));

    const out: AsyncHookResult = {
      schemaVersion: SCHEMA_VERSION,
      jobId: job.jobId,
      hookPath: job.hookPath,
      tier: job.tier,
      event: job.event,
      status,
      exitCode: result.timedOut ? 124 : result.exitCode,
      signal: result.signal,
      startedAt,
      completedAt,
      durationMs,
      stdoutBytes: result.stdoutBytes,
      stderrBytes: result.stderrBytes,
      error: errorMessage,
    };

    // Persist before removing from queue — if anything later fails we still
    // have a record. Removal failure is non-fatal (the queue just keeps the
    // entry; next runner will see it's been resulted and short-circuit).
    this.appendJSONL(this.resultsPath, out);
    this.removeFromQueue(job.jobId);

    // void the start-ms — kept only so the timing variable is logically used
    // even if some future caller wants to print started-at as a number.
    void startMs;

    return out;
  }

  // ── read surfaces ───────────────────────────────────────────────────────────

  /** Current pending jobs (oldest first). */
  getPendingJobs(): AsyncHookJob[] {
    return this.loadQueue().slice();
  }

  /**
   * Filter past results. Defaults: status=any, windowMs=24h, limit=50.
   * Returns newest first — the typical surfacing order for a SessionStart hook.
   */
  getResults(filter: ResultsFilter = {}): AsyncHookResult[] {
    const records = this.loadResults();
    const windowMs = clampWindow(filter.windowMs);
    const limit = clampLimit(filter.limit);
    const cutoff = this.now() - windowMs;
    const statusFilter = filter.status && filter.status !== "any" ? filter.status : undefined;
    const hookFilter = typeof filter.hook === "string" && filter.hook.length > 0 ? filter.hook : undefined;

    const out: AsyncHookResult[] = [];
    // Iterate from newest to oldest so we can short-circuit at limit.
    for (let i = records.length - 1; i >= 0 && out.length < limit; i--) {
      const r = records[i];
      const t = Date.parse(r.completedAt);
      if (!Number.isFinite(t) || t < cutoff) continue;
      if (statusFilter && r.status !== statusFilter) continue;
      if (hookFilter && hookBasename(r.hookPath) !== hookFilter) continue;
      out.push(r);
    }
    return out;
  }

  /** Per-hook aggregate stats over the requested window. */
  getStats(windowMs?: number): AsyncHookStatsSummary {
    const records = this.loadResults();
    const window = clampWindow(windowMs);
    const cutoff = this.now() - window;
    const filtered = records.filter((r) => {
      const t = Date.parse(r.completedAt);
      return Number.isFinite(t) && t >= cutoff;
    });

    const byHook = new Map<string, AsyncHookResult[]>();
    for (const r of filtered) {
      const k = hookBasename(r.hookPath);
      const arr = byHook.get(k) ?? [];
      arr.push(r);
      byHook.set(k, arr);
    }

    const perHook: AsyncHookStats[] = [];
    let totalFires = 0;
    let totalFailures = 0;
    for (const [hook, rows] of byHook) {
      const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
      const succeeded = rows.filter((r) => r.status === "succeeded").length;
      const failed = rows.filter((r) => r.status === "failed").length;
      const timeouts = rows.filter((r) => r.status === "timeout").length;
      const newest = rows.reduce((acc, r) => (Date.parse(r.completedAt) > Date.parse(acc.completedAt) ? r : acc), rows[0]);
      perHook.push({
        hook,
        fires: rows.length,
        succeeded,
        failed,
        timeouts,
        p50DurationMs: percentile(durations, 0.5),
        p95DurationMs: percentile(durations, 0.95),
        maxDurationMs: durations.length > 0 ? durations[durations.length - 1] : 0,
        lastSeen: newest.completedAt,
      });
      totalFires += rows.length;
      totalFailures += failed + timeouts;
    }
    perHook.sort((a, b) => b.p95DurationMs - a.p95DurationMs);

    return {
      totalFires,
      uniqueHooks: byHook.size,
      failureRate: totalFires > 0 ? totalFailures / totalFires : 0,
      windowMs: window,
      generatedAt: new Date(this.now()).toISOString(),
      perHook,
    };
  }

  /** Cheap availability check — no parse. */
  isAvailable(): boolean {
    return existsFile(this.queuePath) || existsFile(this.resultsPath);
  }

  /**
   * Drop queue + results entries older than `olderThanMs` ago. Returns the
   * counts purged. Safe to call concurrently with enqueue — append-only
   * semantics on the writers means the rewrite race is purely a no-op risk,
   * not a corruption risk.
   */
  purgeOlderThan(olderThanMs: number): { queuePurged: number; resultsPurged: number } {
    const ms = Math.max(0, Number.isFinite(olderThanMs) ? olderThanMs : 0);
    const cutoff = this.now() - ms;

    const queue = this.loadQueue();
    const keptQueue = queue.filter((j) => Date.parse(j.enqueuedAt) >= cutoff);
    const queuePurged = queue.length - keptQueue.length;
    if (queuePurged > 0) this.rewriteJSONL(this.queuePath, keptQueue);

    const results = this.loadResults();
    const keptResults = results.filter((r) => Date.parse(r.completedAt) >= cutoff);
    const resultsPurged = results.length - keptResults.length;
    if (resultsPurged > 0) this.rewriteJSONL(this.resultsPath, keptResults);

    this.invalidateQueueCache();
    this.invalidateResultsCache();
    return { queuePurged, resultsPurged };
  }

  /** Test/admin helper — drops every cached parse. */
  clearCache(): void {
    this.invalidateQueueCache();
    this.invalidateResultsCache();
    this.warned.clear();
  }

  // ── disk helpers ─────────────────────────────────────────────────────────────

  private loadQueue(): AsyncHookJob[] {
    const records = this.readJSONLCached(
      this.queuePath,
      "queue",
      () => this.queueCache,
      () => this.queueCacheMtimeMs,
      () => this.queueCacheSize,
      (v) => { this.queueCache = v as AsyncHookJob[]; },
      (v) => { this.queueCacheMtimeMs = v; },
      (v) => { this.queueCacheSize = v; },
    );
    return (records as AsyncHookJob[]);
  }

  private loadResults(): AsyncHookResult[] {
    const records = this.readJSONLCached(
      this.resultsPath,
      "results",
      () => this.resultsCache,
      () => this.resultsCacheMtimeMs,
      () => this.resultsCacheSize,
      (v) => { this.resultsCache = v as AsyncHookResult[]; },
      (v) => { this.resultsCacheMtimeMs = v; },
      (v) => { this.resultsCacheSize = v; },
    );
    return (records as AsyncHookResult[]);
  }

  /**
   * Generic mtime-keyed JSONL reader. Re-parses only when the file mtime/size
   * has changed since the cached snapshot — typical read-paths return the cache
   * intact. Malformed lines are skipped (one warn per file per process).
   */
  private readJSONLCached(
    file: string,
    kind: string,
    getCache: () => unknown[] | null,
    getMtime: () => number,
    getSize: () => number,
    setCache: (v: unknown[]) => void,
    setMtime: (v: number) => void,
    setSize: (v: number) => void,
  ): unknown[] {
    let stat: fs.Stats;
    try { stat = fs.statSync(file); }
    catch { return []; }

    const cached = getCache();
    if (cached && stat.mtimeMs === getMtime() && stat.size === getSize()) {
      return cached;
    }

    let raw: string;
    try { raw = fs.readFileSync(file, "utf8"); }
    catch { return []; }

    const out: unknown[] = [];
    const lines = raw.split(/\r?\n/);
    let badLines = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try { out.push(JSON.parse(t)); }
      catch { badLines++; }
    }
    if (badLines > 0 && !this.warned.has(file)) {
      this.warned.add(file);
      // One-time, non-fatal warning; never throws.
      try { process.stderr.write(`[AsyncHookDispatcherEngine] skipped ${badLines} malformed ${kind} lines in ${file}\n`); } catch { /* ignore */ }
    }

    setCache(out);
    setMtime(stat.mtimeMs);
    setSize(stat.size);
    return out;
  }

  /** Append a single record. Returns an error message string on failure (never throws). */
  private appendJSONL(file: string, record: unknown): string | null {
    try {
      this.rotateIfNeeded(file);
      try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch { /* ignore */ }
      const line = JSON.stringify(record).slice(0, MAX_RECORD_BYTES);
      fs.appendFileSync(file, line + "\n", { encoding: "utf8" });
      return null;
    } catch (err) {
      return String((err as Error)?.message ?? err).slice(0, 200);
    }
  }

  /** Atomic-ish rewrite of a JSONL (used for removal + purge). */
  private rewriteJSONL(file: string, records: readonly unknown[]): void {
    try {
      try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch { /* ignore */ }
      const body = records.map((r) => JSON.stringify(r).slice(0, MAX_RECORD_BYTES)).join("\n");
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, records.length > 0 ? body + "\n" : "", { encoding: "utf8" });
      fs.renameSync(tmp, file);
    } catch {
      // Rewrite failure is non-fatal — the next purge or runner will retry.
    }
  }

  private rotateIfNeeded(file: string): void {
    try {
      const st = fs.statSync(file);
      if (st.size > ROTATE_BYTES_DEFAULT) {
        const archive = file + ".1";
        try { fs.rmSync(archive, { force: true }); } catch { /* ignore */ }
        try { fs.renameSync(file, archive); } catch { /* concurrent rotate — ignore */ }
      }
    } catch {
      // ENOENT — first write, nothing to rotate.
    }
  }

  private applyBackPressureIfNeeded(): number {
    const queue = this.loadQueue();
    if (queue.length < MAX_QUEUE_DEPTH) return 0;
    const dropCount = queue.length - MAX_QUEUE_DEPTH + 1; // +1 leaves room for the about-to-be-appended job
    const kept = queue.slice(dropCount);
    this.rewriteJSONL(this.queuePath, kept);
    this.invalidateQueueCache();
    return dropCount;
  }

  private removeFromQueue(jobId: string): void {
    const queue = this.loadQueue();
    const kept = queue.filter((j) => j.jobId !== jobId);
    if (kept.length !== queue.length) {
      this.rewriteJSONL(this.queuePath, kept);
      this.invalidateQueueCache();
    }
  }

  private safeQueueDepth(): number {
    try { return this.loadQueue().length; } catch { return 0; }
  }

  private invalidateQueueCache(): void {
    this.queueCache = null;
    this.queueCacheMtimeMs = 0;
    this.queueCacheSize = 0;
  }

  private invalidateResultsCache(): void {
    this.resultsCache = null;
    this.resultsCacheMtimeMs = 0;
    this.resultsCacheSize = 0;
  }
}

// ── PURE HELPERS (exported for tests) ────────────────────────────────────────

/**
 * Build a jobId from a timestamp + 4 random hex bytes. The base-36 timestamp
 * prefix keeps the IDs naturally sortable by enqueue order — handy when a
 * SessionStart hook surfaces the most-recent N results.
 */
export function makeJobId(nowMs: number): string {
  const ts = Math.floor(nowMs).toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `${ts}-${rand}`;
}

/** Basename of a hook path with the `.mjs` suffix removed (consistent with HookLatencyEngine). */
export function hookBasename(p: string): string {
  if (typeof p !== "string" || p.length === 0) return "";
  const norm = p.replace(/\\/g, "/");
  const last = norm.split("/").pop() ?? norm;
  return last.replace(/\.mjs$/i, "");
}

/** Nearest-rank percentile (same definition as HookLatencyEngine for consistency). */
export function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const clamped = Math.min(Math.max(p, 0), 1);
  const idx = Math.min(sortedAsc.length - 1, Math.floor(clamped * sortedAsc.length));
  return sortedAsc[idx];
}

/** Window-ms clamp shared across read surfaces. */
export function clampWindow(input: number | undefined): number {
  if (input == null) return DEFAULT_WINDOW_MS;
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WINDOW_MS;
  return Math.min(n, MAX_WINDOW_MS);
}

/** Result-limit clamp shared across read surfaces. */
export function clampLimit(input: number | undefined): number {
  if (input == null) return DEFAULT_RESULT_LIMIT;
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RESULT_LIMIT;
  return Math.min(Math.floor(n), ABSOLUTE_RESULT_LIMIT);
}

// ── SINGLETON + FACTORY ─────────────────────────────────────────────────────

let singleton: AsyncHookDispatcherEngine | null = null;

/**
 * Standard singleton accessor — the dispatcher and helpers use this. Tests
 * should construct fresh instances via `new AsyncHookDispatcherEngine({...})`
 * so their disk paths and spawnFn are hermetic.
 */
export function getAsyncHookDispatcherEngine(): AsyncHookDispatcherEngine {
  if (singleton === null) singleton = new AsyncHookDispatcherEngine();
  return singleton;
}

/** Convenience export so callers can `import { asyncHookDispatcherEngine } from ...`. */
export const asyncHookDispatcherEngine = getAsyncHookDispatcherEngine();

// ── CAP EXPORTS (for test introspection + dispatcher doc strings) ───────────

export const ASYNC_HOOK_LIMITS = Object.freeze({
  SCHEMA_VERSION,
  ROTATE_BYTES_DEFAULT,
  MAX_RECORD_BYTES,
  MAX_QUEUE_DEPTH,
  DEFAULT_HOOK_TIMEOUT_MS,
  ABSOLUTE_HOOK_TIMEOUT_MS,
  DEFAULT_WINDOW_MS,
  MAX_WINDOW_MS,
  DEFAULT_RESULT_LIMIT,
  ABSOLUTE_RESULT_LIMIT,
} as const);

// ── INTERNAL UTILITY ────────────────────────────────────────────────────────

function existsFile(p: string): boolean {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}
