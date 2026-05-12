/**
 * HookLatencyEngine — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *
 * Read-only consumer of `state/shared/hook-latency.jsonl` (produced by the
 * `_envelope.mjs` profiling shim). Computes per-hook P50/P95/P99/max + fire
 * counts + recent-failure list, plus top-K offenders for nightly digests.
 *
 * Surfaces:
 *   getSummary(windowMs?, limit?) — every hook seen in the window, sorted by P95 desc
 *   perHook(name, windowMs?)      — one hook's stats (or null if unseen in window)
 *   topByP95(n, windowMs?)        — N slowest hooks by P95
 *   recentSlow(thresholdMs, n)    — most-recent N invocations slower than threshold
 *   recentFailures(n)             — most-recent N non-zero exit codes
 *   totalFires(windowMs?)         — total recorded fires in window
 *   isAvailable()                 — true iff the JSONL file exists (cheap stat)
 *
 * Failure semantics: missing file → all queries return empty / null (no throw).
 * Malformed lines are skipped silently (one-time warn per session).
 *
 * Cache: mtime-keyed. Re-parses only when the JSONL grows or rotates.
 */

import * as fs from "node:fs";

const LATENCY_PATH_DEFAULT = "H:/prism/state/shared/hook-latency.jsonl";

// Sizing caps — defended in tests; documented so digest scripts can rely on them.
const DEFAULT_TOP_K = 20;
const ABSOLUTE_TOP_K = 200;
const DEFAULT_RECENT_K = 20;
const ABSOLUTE_RECENT_K = 500;
const MIN_SAMPLES_FOR_PERCENTILE = 1; // we still report P50 with a single sample; P95/P99 just equal max in that case
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface LatencyRecord {
  ts: string;             // ISO timestamp
  hook: string;           // basename of wrapped hook (no .mjs)
  durationMs: number;
  exitCode: number;       // -1 if spawn failed
  signal: string | null;
  targetPath: string;
}

export interface HookStats {
  hook: string;
  fires: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  failures: number;        // count of non-zero exit codes within window
  lastSeen: string;        // ISO timestamp of the latest sample
}

export interface HookSummary {
  totalFires: number;
  uniqueHooks: number;
  windowMs: number;
  generatedAt: string;
  perHook: HookStats[];
}

export interface HookLatencyOptions {
  latencyPath?: string;
}

export class HookLatencyEngine {
  private readonly latencyPath: string;
  private cache: LatencyRecord[] | null = null;
  private cacheMtimeMs = 0;
  private cacheSize = 0;
  private warned = new Set<string>();

  constructor(opts: HookLatencyOptions = {}) {
    this.latencyPath = opts.latencyPath ?? LATENCY_PATH_DEFAULT;
  }

  /** Cheap availability check — used by the dispatcher to short-circuit before parse. */
  isAvailable(): boolean {
    try { return fs.statSync(this.latencyPath).isFile(); } catch { return false; }
  }

  /** Force cache invalidation; the digest cron + tests bump this. */
  clearCache(): void {
    this.cache = null;
    this.cacheMtimeMs = 0;
    this.cacheSize = 0;
    this.warned.clear();
  }

  /** Top of the dispatcher response — one call returns the full sortable picture. */
  getSummary(windowMs: number = DEFAULT_WINDOW_MS, limit: number = DEFAULT_TOP_K): HookSummary {
    const recs = this.load();
    const cutoff = Date.now() - clampWindow(windowMs);
    const filtered = recs.filter((r) => Date.parse(r.ts) >= cutoff);
    const byHook = groupBy(filtered, (r) => r.hook);
    const cap = clampTopK(limit);
    const perHook: HookStats[] = [];
    for (const [hook, rows] of byHook) {
      perHook.push(statsFor(hook, rows));
    }
    perHook.sort((a, b) => b.p95 - a.p95 || b.fires - a.fires || a.hook.localeCompare(b.hook));
    return {
      totalFires: filtered.length,
      uniqueHooks: byHook.size,
      windowMs: clampWindow(windowMs),
      generatedAt: new Date().toISOString(),
      perHook: perHook.slice(0, cap),
    };
  }

  /** Stats for a single hook, or null if it didn't fire in the window. */
  perHook(name: string, windowMs: number = DEFAULT_WINDOW_MS): HookStats | null {
    const target = String(name || "").trim();
    if (!target) return null;
    const recs = this.load();
    const cutoff = Date.now() - clampWindow(windowMs);
    const rows = recs.filter((r) => r.hook === target && Date.parse(r.ts) >= cutoff);
    if (rows.length < MIN_SAMPLES_FOR_PERCENTILE) return null;
    return statsFor(target, rows);
  }

  /** N slowest hooks by P95 (offender list — drives digest "top regressions"). */
  topByP95(n: number = DEFAULT_TOP_K, windowMs: number = DEFAULT_WINDOW_MS): HookStats[] {
    return this.getSummary(windowMs, n).perHook;
  }

  /** Most-recent N invocations slower than `thresholdMs` — used by the digest's "hot tail". */
  recentSlow(thresholdMs: number, n: number = DEFAULT_RECENT_K): LatencyRecord[] {
    const threshold = Math.max(0, Number(thresholdMs) || 0);
    const cap = clampRecentK(n);
    const recs = this.load();
    const slow = recs.filter((r) => r.durationMs >= threshold);
    // newest first (records are append-only ordered; reverse cheap)
    slow.reverse();
    return slow.slice(0, cap);
  }

  /** Most-recent N non-zero exits (the failure surface; digest flags these). */
  recentFailures(n: number = DEFAULT_RECENT_K): LatencyRecord[] {
    const cap = clampRecentK(n);
    const recs = this.load();
    const fails = recs.filter((r) => r.exitCode !== 0);
    fails.reverse();
    return fails.slice(0, cap);
  }

  /** Total fires across all hooks within window — useful for the digest header. */
  totalFires(windowMs: number = DEFAULT_WINDOW_MS): number {
    const recs = this.load();
    const cutoff = Date.now() - clampWindow(windowMs);
    return recs.filter((r) => Date.parse(r.ts) >= cutoff).length;
  }

  /**
   * Streaming-ish load. Uses readFileSync because the JSONL is bounded to ~50 MiB
   * by the shim's rotation, and the parsed array is cached by mtime+size so we
   * only pay the parse once per file mutation.
   */
  private load(): LatencyRecord[] {
    let st: fs.Stats;
    try { st = fs.statSync(this.latencyPath); }
    catch { return []; }
    if (this.cache && this.cacheMtimeMs === st.mtimeMs && this.cacheSize === st.size) {
      return this.cache;
    }
    let raw: string;
    try { raw = fs.readFileSync(this.latencyPath, "utf8"); }
    catch (e) {
      this.warnOnce("read", `[HookLatencyEngine] read failed: ${errMessage(e)}`);
      return [];
    }
    const recs: LatencyRecord[] = [];
    let malformed = 0;
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(t); }
      catch { malformed++; continue; }
      if (isLatencyRecord(parsed)) recs.push(parsed);
      else malformed++;
    }
    if (malformed > 0) this.warnOnce("malformed", `[HookLatencyEngine] skipped ${malformed} malformed line(s)`);
    this.cache = recs;
    this.cacheMtimeMs = st.mtimeMs;
    this.cacheSize = st.size;
    return recs;
  }

  private warnOnce(key: string, msg: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    if (typeof console !== "undefined" && typeof console.warn === "function") console.warn(msg);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function clampWindow(ms: number): number {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WINDOW_MS;
  return Math.min(n, 90 * 24 * 60 * 60 * 1000); // 90-day max (avoids absurd windows on a long-lived file)
}

function clampTopK(n: number): number {
  const v = Math.floor(Number(n) || DEFAULT_TOP_K);
  if (v <= 0) return DEFAULT_TOP_K;
  return Math.min(v, ABSOLUTE_TOP_K);
}

function clampRecentK(n: number): number {
  const v = Math.floor(Number(n) || DEFAULT_RECENT_K);
  if (v <= 0) return DEFAULT_RECENT_K;
  return Math.min(v, ABSOLUTE_RECENT_K);
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const v of arr) {
    const k = key(v);
    const bucket = out.get(k);
    if (bucket) bucket.push(v);
    else out.set(k, [v]);
  }
  return out;
}

/**
 * Percentile via nearest-rank (Hyndman & Fan type-7 simplification).
 * For p∈[0,1], rank = ceil(p · n); we return the value at rank-1 (0-indexed)
 * after sorting ascending. This matches numpy.quantile(..., method="closest_observation").
 * Choosing nearest-rank (not linear interpolation) avoids fractional ms that obscure
 * the actual observed worst-case latency operators reason about.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[Math.min(rank - 1, sorted.length - 1)];
}

function statsFor(hook: string, rows: LatencyRecord[]): HookStats {
  const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  const failures = rows.reduce((acc, r) => acc + (r.exitCode === 0 ? 0 : 1), 0);
  let lastSeen = rows[0].ts;
  for (const r of rows) if (r.ts > lastSeen) lastSeen = r.ts;
  return {
    hook,
    fires: rows.length,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    max: durations[durations.length - 1],
    failures,
    lastSeen,
  };
}

function isLatencyRecord(v: unknown): v is LatencyRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.ts !== "string") return false;
  if (typeof o.hook !== "string") return false;
  if (typeof o.durationMs !== "number" || !Number.isFinite(o.durationMs)) return false;
  if (typeof o.exitCode !== "number") return false;
  return true;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}

export const hookLatencyEngine = new HookLatencyEngine();
