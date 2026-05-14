/**
 * ModelTelemetryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01
 *
 * Per-call telemetry logger for LLM/Ollama invocations. Captures
 * `{ts, model, backend, taskKind, promptTokens, completionTokens, latencyMs, outcome, errorBrief}`
 * per call and persists to a JSONL store on disk. Read-side surfaces
 * (`getRecentCalls`, `getStats`) feed the adaptive-routing tuner
 * (P23-U02, `scripts/adapt-router-thresholds.mjs`) that periodically
 * adjusts `ModelRoutingEngine` thresholds based on observed reality.
 *
 * Design rules:
 *   1. Sync I/O on the hot path. Logging a call MUST NOT introduce
 *      async coupling — many callers (hooks, sync dispatchers) cannot
 *      await. `appendFileSync` is intentional.
 *   2. JSONL with one record per line, append-only. Rotation at 50 MiB
 *      (mirrors `HookLatencyEngine` pattern) so a runaway logger never
 *      eats disk.
 *   3. Pure read methods are mtime-agnostic — the file is small enough
 *      and reads are infrequent enough (cron + on-demand reports) that
 *      caching offers no win. Re-parse on every call.
 *   4. Reset / purge are explicit operations — never silently drop data.
 *   5. Errors in malformed lines are TOLERATED, not thrown. A corrupt
 *      line (mid-write crash) must not prevent reading the rest.
 *
 * References:
 *   INTEL-OLLAMA-OBSIDIAN-MS0 envelope P23 §rationale: "Without telemetry,
 *   multi-model routing is guesswork. Track per-model: latency, output
 *   quality (Claude scored), token cost (vs Claude baseline), success
 *   rate. Use telemetry to refine ModelRouterEngine tier assignments
 *   over time."
 *
 *   JSONL rotation cap is borrowed from `HookLatencyEngine` (50 MiB).
 *   Percentile is nearest-rank linear interpolation (Hyndman–Fan
 *   "Type 7", same as numpy/pandas default).
 *
 * @module engines/ModelTelemetryEngine
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P23-U01
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ── public types ──────────────────────────────────────────────────────────

export type ModelTelemetryOutcome = "ok" | "fail" | "timeout";

export interface ModelTelemetryEntry {
  /**
   * Schema version stamped at log time. Bumped on a breaking change to
   * the entry shape. Readers should tolerate missing field on older
   * entries (pre-v1) by treating it as `1`.
   *
   * JSONL note: this engine writes camelCase keys (e.g. `promptTokens`)
   * per `HookLatencyEngine` / `AsyncHookDispatcherEngine` convention.
   * The unit spec uses snake_case in prose (`prompt_tokens`); JSONL
   * consumers map at read time.
   */
  schemaVersion: number;
  /** ISO-8601 UTC timestamp at log-call time. */
  ts: string;
  /** Canonical model id, e.g. "qwen2.5-coder:7b" / "claude-sonnet-4-6". */
  model: string;
  /**
   * Optional backend tag. Free-form so non-ModelRoutingEngine callers
   * (e.g. a fine-tuned API) don't have to extend the union. The
   * dispatcher wrapper (`prism_dev:model_telemetry_report`) tightens
   * this to the `ModelRoutingEngine.Backend` union at the wire boundary.
   */
  backend?: string;
  /** Optional task-kind tag (chat/code/embed/...). */
  taskKind?: string;
  /** Input tokens. Non-negative integer. */
  promptTokens: number;
  /** Completion tokens. Non-negative integer. */
  completionTokens: number;
  /** Wall latency in ms. Non-negative. */
  latencyMs: number;
  /** Call outcome — defaults to "ok" when omitted at log time. */
  outcome: ModelTelemetryOutcome;
  /** Optional short error description for fail/timeout entries. Capped at 500 chars (throws on overflow rather than truncate). */
  errorBrief?: string;
}

const LogCallSchema = z.object({
  model: z.string().min(1).max(128),
  backend: z.string().max(64).optional(),
  taskKind: z.string().max(64).optional(),
  promptTokens: z.number().int().nonnegative().finite(),
  completionTokens: z.number().int().nonnegative().finite(),
  latencyMs: z.number().nonnegative().finite(),
  outcome: z.enum(["ok", "fail", "timeout"]).optional(),
  errorBrief: z.string().max(500).optional(),
});

export type LogCallInput = z.infer<typeof LogCallSchema>;

export interface ModelStats {
  model: string;
  calls: number;
  failures: number;
  /** Failures / calls, in [0, 1]. 0 when calls=0. */
  failureRate: number;
  /** Latency percentiles (ms). */
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  /** Earliest entry ts in window, ISO. */
  firstSeen: string;
  /** Latest entry ts in window, ISO. */
  lastSeen: string;
}

export interface ModelTelemetryStats {
  /**
   * Window (ms) used to compute the report. `0` means "no temporal
   * filter — full history was scanned". A positive value means
   * entries with `ts < now - windowMs` were excluded. Picked over
   * `Number.POSITIVE_INFINITY` because `Infinity` serializes to
   * `null` in JSON.
   */
  windowMs: number;
  totalCalls: number;
  byModel: Record<string, ModelStats>;
}

export interface ModelTelemetryEngineOptions {
  /** Override the JSONL store path. Default: <prism-root>/mcp-server/data/state/model-telemetry.jsonl. */
  jsonlPath?: string;
  /** Rotate when file exceeds this many bytes. Default 50 MiB. */
  maxJsonlBytes?: number;
  /** Injectable clock for hermetic tests. */
  nowFn?: () => Date;
}

// ── defaults ───────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;

/** Rotation threshold — mirrors HookLatencyEngine. */
const MAX_JSONL_BYTES_DEFAULT = 50 * 1024 * 1024;

/** Maximum directory levels we'll walk up looking for the `mcp-server` anchor. */
const MCP_SERVER_WALK_DEPTH = 8;

/** Percentile thresholds reported by `getStats`. */
const LATENCY_P50 = 0.5;
const LATENCY_P95 = 0.95;

/** Override the default JSONL path entirely via env. Useful for cron + ops tooling. */
const TELEMETRY_PATH_ENV = "PRISM_MODEL_TELEMETRY_PATH";

/**
 * Sentinel returned when no `mcp-server` anchor is found and no env
 * override is set. Exported so callers (and tests) can probe `getStorePath()`
 * to detect a misconfigured singleton without forcing an I/O exception.
 */
export const UNRESOLVED_JSONL_SENTINEL = "<UNRESOLVED:PRISM_MODEL_TELEMETRY_PATH>";

/**
 * Default JSONL store path. Resolves to
 * `<prism-root>/mcp-server/data/state/model-telemetry.jsonl`.
 *
 * Resolution order:
 *   1. `process.env.PRISM_MODEL_TELEMETRY_PATH` if set
 *   2. Walk up from `process.cwd()` looking for a `mcp-server` directory
 *      (works whether the process started at repo root or inside `mcp-server/`)
 *   3. Return a sentinel string — callers (`ensureDir` + I/O methods)
 *      then throw on use so a misconfigured cwd cannot silently spray
 *      telemetry into an unrelated directory.
 *
 * We deliberately avoid `__dirname` — under ESM (vitest) it's undefined;
 * esbuild's banner shim provides it in the bundled build but the source-run
 * path (vitest, tsx) doesn't. cwd is universal.
 */
function resolveDefaultJsonlPath(): string {
  const envOverride = process.env[TELEMETRY_PATH_ENV];
  if (envOverride && envOverride.length > 0) return envOverride;

  let dir = process.cwd();
  for (let i = 0; i < MCP_SERVER_WALK_DEPTH; i++) {
    if (path.basename(dir) === "mcp-server") {
      return path.join(dir, "data", "state", "model-telemetry.jsonl");
    }
    const candidate = path.join(dir, "mcp-server");
    if (fs.existsSync(candidate)) {
      return path.join(candidate, "data", "state", "model-telemetry.jsonl");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return UNRESOLVED_JSONL_SENTINEL;
}

// ── engine ────────────────────────────────────────────────────────────────

/**
 * Synchronous telemetry logger. One instance per JSONL store path; the
 * exported singleton points at the canonical mcp-server location, but
 * tests should construct their own instance with a temp `jsonlPath` so
 * production telemetry isn't polluted.
 */
export class ModelTelemetryEngine {
  private readonly jsonlPath: string;
  private readonly maxBytes: number;
  private readonly nowFn: () => Date;

  constructor(opts: ModelTelemetryEngineOptions = {}) {
    // Treat empty-string jsonlPath as "use default" so an unset env var or
    // a `{jsonlPath: ""}` test slip-up hits the sentinel-throw path with a
    // helpful message instead of a cryptic fs ENOENT on `path.dirname("")`.
    this.jsonlPath = opts.jsonlPath && opts.jsonlPath.length > 0
      ? opts.jsonlPath
      : resolveDefaultJsonlPath();
    this.maxBytes = opts.maxJsonlBytes ?? MAX_JSONL_BYTES_DEFAULT;
    this.nowFn = opts.nowFn ?? (() => new Date());
  }

  /** Schema version stamped on every record. Bumped on a breaking change to the entry shape. */
  static readonly schemaVersion = SCHEMA_VERSION;

  /** Path to the on-disk JSONL store. */
  getStorePath(): string {
    return this.jsonlPath;
  }

  /**
   * Log one model call. Synchronous append. Throws on invalid input
   * (Zod parse error). Returns the persisted entry for diagnostics.
   *
   * Concurrency note: `appendFileSync` is atomic per-record on POSIX
   * for writes ≤ PIPE_BUF (~4096 bytes). Our entries are well under
   * that. On Windows, byte-level interleaving across processes is
   * possible but bounded — a single corrupted line is tolerated by the
   * read path (`getRecentCalls` skips JSON-parse failures). Telemetry
   * is intentionally best-effort; do not use this as an audit log.
   */
  logCall(input: LogCallInput): ModelTelemetryEntry {
    const parsed = LogCallSchema.parse(input);
    const entry: ModelTelemetryEntry = {
      schemaVersion: SCHEMA_VERSION,
      ts: this.nowFn().toISOString(),
      model: parsed.model,
      promptTokens: parsed.promptTokens,
      completionTokens: parsed.completionTokens,
      latencyMs: parsed.latencyMs,
      outcome: parsed.outcome ?? "ok",
    };
    if (parsed.backend !== undefined) entry.backend = parsed.backend;
    if (parsed.taskKind !== undefined) entry.taskKind = parsed.taskKind;
    if (parsed.errorBrief !== undefined) entry.errorBrief = parsed.errorBrief;

    this.ensureDir();
    this.rotateIfNeeded();
    fs.appendFileSync(this.jsonlPath, JSON.stringify(entry) + "\n", "utf8");
    return entry;
  }

  /**
   * Return recent entries, oldest→newest. `windowMs` filters by ts;
   * `model` filters by exact id; `limit` keeps only the *latest* N
   * entries (after filtering) — useful for tail-style dashboards.
   *
   * Reads merge `jsonlPath` AND `jsonlPath + ".1"` (the rotated tail).
   * The rotated file's entries are emitted before the live file's, so
   * the result stays in oldest→newest order. This gives consumers
   * roughly `2 × maxJsonlBytes` of visible history regardless of when
   * rotation last fired — critical for the P23-U02 7-day window.
   *
   * Malformed JSONL lines and entries that fail the per-field shape
   * guard are silently skipped (intentional — telemetry must tolerate
   * crash-mid-write corruption, multi-process interleave on Windows,
   * and hand-edited records).
   */
  getRecentCalls(opts: { windowMs?: number; model?: string; limit?: number } = {}): ModelTelemetryEntry[] {
    const cutoff = opts.windowMs !== undefined
      ? this.nowFn().getTime() - opts.windowMs
      : null;
    const out: ModelTelemetryEntry[] = [];

    // Rotated file is older — emit first so order is oldest→newest.
    this.readJsonlInto(this.jsonlPath + ".1", out, cutoff, opts.model);
    this.readJsonlInto(this.jsonlPath, out, cutoff, opts.model);

    if (opts.limit !== undefined && opts.limit > 0 && out.length > opts.limit) {
      return out.slice(out.length - opts.limit);
    }
    return out;
  }

  /** Internal: read one JSONL file, append shape-valid entries to `out`. */
  private readJsonlInto(
    file: string,
    out: ModelTelemetryEntry[],
    cutoff: number | null,
    modelFilter: string | undefined,
  ): void {
    if (!fs.existsSync(file)) return;
    const raw = fs.readFileSync(file, "utf8");
    if (raw.length === 0) return;
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue; // tolerate malformed line (mid-write crash, manual edit)
      }
      const entry = coerceEntry(parsed);
      if (!entry) continue;
      if (cutoff !== null) {
        const t = Date.parse(entry.ts);
        if (!Number.isFinite(t) || t < cutoff) continue;
      }
      if (modelFilter !== undefined && entry.model !== modelFilter) continue;
      out.push(entry);
    }
  }

  /**
   * Aggregate per-model statistics over the optional time window.
   * Percentiles use Hyndman–Fan Type 7 (numpy default). Empty windows
   * return `{totalCalls:0, byModel:{}}` — never throw.
   *
   * The returned `windowMs` is `0` when no window was applied (i.e. the
   * full history was scanned). We use `0` rather than
   * `Number.POSITIVE_INFINITY` because the latter doesn't round-trip
   * through `JSON.stringify` (becomes `null` — ambiguous with a
   * missing field). Callers should treat `windowMs === 0` as "no
   * temporal filter" not "zero-length window".
   */
  getStats(opts: { windowMs?: number } = {}): ModelTelemetryStats {
    const windowMs = opts.windowMs ?? 0;
    const entries = this.getRecentCalls({
      windowMs: windowMs > 0 ? windowMs : undefined,
    });

    const grouped: Record<string, ModelTelemetryEntry[]> = {};
    for (const e of entries) {
      (grouped[e.model] ??= []).push(e);
    }

    const byModel: Record<string, ModelStats> = {};
    for (const [model, list] of Object.entries(grouped)) {
      const latencies = list.map((e) => e.latencyMs).sort((a, b) => a - b);
      const failures = list.reduce((n, e) => n + (e.outcome === "ok" ? 0 : 1), 0);
      const sumIn = list.reduce((s, e) => s + e.promptTokens, 0);
      const sumOut = list.reduce((s, e) => s + e.completionTokens, 0);
      const tsList = list.map((e) => e.ts).sort();
      byModel[model] = {
        model,
        calls: list.length,
        failures,
        failureRate: list.length > 0 ? failures / list.length : 0,
        latencyP50Ms: percentile(latencies, LATENCY_P50),
        latencyP95Ms: percentile(latencies, LATENCY_P95),
        latencyMaxMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
        avgPromptTokens: list.length > 0 ? sumIn / list.length : 0,
        avgCompletionTokens: list.length > 0 ? sumOut / list.length : 0,
        firstSeen: tsList[0] ?? "",
        lastSeen: tsList[tsList.length - 1] ?? "",
      };
    }

    return { windowMs, totalCalls: entries.length, byModel };
  }

  /**
   * Remove entries with `ts < now - olderThanMs`. Malformed lines are
   * preserved (defensive — never silently drop something we can't
   * parse). Returns the number of entries deleted.
   *
   * Atomicity: writes go through `<jsonlPath>.tmp` + `fs.renameSync`
   * over the live file. On any modern filesystem (NTFS, ext4, APFS)
   * `rename` is atomic when source and target sit on the same volume —
   * a crash between the temp write and the rename leaves the live
   * file untouched. This guarantees the documented
   * "never silently drop" contract even under kill-signal mid-purge.
   */
  purgeOlderThan(olderThanMs: number): number {
    if (!Number.isFinite(olderThanMs) || olderThanMs < 0) {
      throw new Error(`invalid olderThanMs: ${olderThanMs}`);
    }
    if (!fs.existsSync(this.jsonlPath)) return 0;
    const cutoff = this.nowFn().getTime() - olderThanMs;
    const raw = fs.readFileSync(this.jsonlPath, "utf8");
    if (raw.length === 0) return 0;
    const lines = raw.split(/\r?\n/);
    const kept: string[] = [];
    let removed = 0;
    for (const line of lines) {
      if (!line) continue; // truly-empty lines never carry data — drop without count
      let t = Number.NaN;
      try {
        const e = JSON.parse(line);
        if (e && typeof e.ts === "string") t = Date.parse(e.ts);
      } catch {
        kept.push(line); // preserve malformed (could be a mid-write crash record)
        continue;
      }
      if (!Number.isFinite(t)) {
        kept.push(line); // ts unparseable — keep
      } else if (t >= cutoff) {
        kept.push(line);
      } else {
        removed++;
      }
    }
    const next = kept.length > 0 ? kept.join("\n") + "\n" : "";
    const tmp = this.jsonlPath + ".tmp";
    fs.writeFileSync(tmp, next, "utf8");
    fs.renameSync(tmp, this.jsonlPath); // atomic on same volume
    return removed;
  }

  /**
   * Delete the JSONL store (live, rotated `.1`, and any leftover `.tmp`).
   * Tests only — the singleton anchors at the production JSONL path; do
   * not call from a wired dispatcher action.
   */
  reset(): void {
    for (const suffix of ["", ".1", ".tmp"]) {
      const p = this.jsonlPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private ensureDir(): void {
    if (this.jsonlPath === UNRESOLVED_JSONL_SENTINEL) {
      throw new Error(
        `ModelTelemetryEngine could not resolve a JSONL path — cwd '${process.cwd()}' is not inside a PRISM mcp-server tree and ${TELEMETRY_PATH_ENV} is not set. Pass {jsonlPath} to the constructor for tests, or set the env var.`,
      );
    }
    const dir = path.dirname(this.jsonlPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private rotateIfNeeded(): void {
    try {
      const st = fs.statSync(this.jsonlPath);
      if (st.size > this.maxBytes) {
        const rotated = this.jsonlPath + ".1";
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
        fs.renameSync(this.jsonlPath, rotated);
      }
    } catch {
      // file doesn't exist yet — fine
    }
  }
}

/**
 * Strict runtime shape guard for one telemetry entry. Validates every
 * field that downstream stats math touches, so a corrupted or
 * malicious JSONL line cannot poison percentile/sum/failure-rate
 * calculations. Returns the entry on success, `null` on shape
 * mismatch — callers skip null entries.
 *
 * `outcome` is checked against the literal union. `schemaVersion` is
 * tolerated when missing (older pre-v1 records read as `1`).
 */
function coerceEntry(raw: unknown): ModelTelemetryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.ts !== "string") return null;
  // Reject unparseable ts up-front so getStats.firstSeen/lastSeen + filter math stay sane.
  if (!Number.isFinite(Date.parse(r.ts))) return null;
  if (typeof r.model !== "string" || r.model.length === 0) return null;
  // Symmetry with LogCallSchema: non-negative integer counts, non-negative finite latency.
  const promptTokens = r.promptTokens;
  const completionTokens = r.completionTokens;
  const latencyMs = r.latencyMs;
  if (typeof promptTokens !== "number" || !Number.isInteger(promptTokens) || promptTokens < 0) return null;
  if (typeof completionTokens !== "number" || !Number.isInteger(completionTokens) || completionTokens < 0) return null;
  if (typeof latencyMs !== "number" || !Number.isFinite(latencyMs) || latencyMs < 0) return null;
  const outcome = r.outcome;
  if (outcome !== "ok" && outcome !== "fail" && outcome !== "timeout") return null;
  const entry: ModelTelemetryEntry = {
    schemaVersion: typeof r.schemaVersion === "number" && Number.isFinite(r.schemaVersion)
      ? r.schemaVersion
      : 1,
    ts: r.ts,
    model: r.model,
    promptTokens: r.promptTokens as number,
    completionTokens: r.completionTokens as number,
    latencyMs: r.latencyMs as number,
    outcome: outcome as ModelTelemetryOutcome,
  };
  if (typeof r.backend === "string") entry.backend = r.backend;
  if (typeof r.taskKind === "string") entry.taskKind = r.taskKind;
  if (typeof r.errorBrief === "string") entry.errorBrief = r.errorBrief;
  return entry;
}

/**
 * Hyndman–Fan Type 7 percentile (numpy / pandas default).
 * Sorted input expected. Returns 0 for empty arrays.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const w = rank - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/** Default singleton — anchored at canonical mcp-server JSONL path. */
export const modelTelemetryEngine = new ModelTelemetryEngine();
