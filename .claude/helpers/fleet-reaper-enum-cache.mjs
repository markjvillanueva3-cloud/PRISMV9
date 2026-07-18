/**
 * fleet-reaper-enum-cache.mjs — sidecar cache for Win32_Process enumeration.
 *
 * Why: at 12-chat × 2-PC scale, scheduled-task + Stop-hook + in-session Monitor
 * each trigger their own PS5.1 Get-CimInstance pass (2-5s each on a busy box).
 * Dozens of duplicate enumerations/min add up to seconds of wasted CPU and
 * PowerShell start contention. A 60s mtime-gated sidecar cuts the cost ~70%
 * without changing classification correctness (the process table moves slowly
 * enough at 60s granularity that a candidate's "confirm-after-N-ticks" window
 * dominates any per-sweep newness signal).
 *
 * Safety invariants:
 *   1. Per-host keyed (os.hostname()). PC-A's cache is ignored by PC-B.
 *      Cross-PC sharing of process tables would mis-classify.
 *   2. Atomic write (tmp + rename). A reader mid-write never sees half a JSON.
 *   3. Corrupt cache file → enumerate fresh + overwrite. Never throws.
 *   4. Cache stale (>TTL) → enumerate fresh + overwrite.
 *   5. Live enumerate FAILS + cache exists and <5×TTL old → serve stale with
 *      `fromStaleCache: true` flag (fail-soft so reaper isn't blind).
 *      Live enumerate FAILS + no usable cache → preserve current behavior
 *      (return empty + lastEnumerationError-style message).
 *   6. Kill switch: PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE=1 → bypass entirely,
 *      caller gets raw enumerateProcesses() behavior.
 *
 * Pure-core + injected-deps: all decision functions are deterministic and
 * test-friendly. The thin I/O wrapper at the bottom is the only side-effect.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, hostname } from "node:os";
import { randomBytes } from "node:crypto";

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_TTL_MS = 60_000;
/** stale-but-still-usable upper bound when live enumerate is failing. */
export const STALE_FALLBACK_FACTOR = 5;
/** Hard cap so a truncated/garbage cache never balloons memory on parse. */
export const MAX_CACHE_BYTES = 32 * 1024 * 1024;

/**
 * Default cache path is HOST-suffixed: on a shared H:\ drive, PC-A and PC-B
 * would otherwise ping-pong overwriting one cache file (each PC's read of the
 * other's cache fails `different-host` and triggers a fresh enumerate + write,
 * defeating the cache entirely). Suffixing by hostname gives each machine its
 * own file. The `different-host` rejection in decideCacheFresh remains as
 * defense-in-depth in case someone passes an explicit override path.
 */
export function defaultCachePathFor(host = hostname()) {
  const safeHost = String(host || "unknown").replace(/[^A-Za-z0-9_.-]/g, "_");
  return join(
    process.env.PRISM_ROOT || "H:/prism",
    "state",
    "shared",
    `.fleet-reaper-enum-cache-${safeHost}.json`,
  );
}
export const DEFAULT_CACHE_PATH = defaultCachePathFor();

// ─── Pure decision functions ─────────────────────────────────────────────────

/**
 * Decide whether a parsed cache record is usable as a FRESH source for this
 * sweep (i.e. skip enumerate entirely).
 *
 * @param {object|null} cache  — parsed cache object, or null if missing/corrupt
 * @param {object} ctx
 * @param {string} ctx.host    — current host (os.hostname())
 * @param {number} ctx.nowMs   — current epoch ms
 * @param {number} ctx.ttlMs  — freshness window
 * @returns {{useFresh: boolean, reason: string, ageMs: number|null}}
 */
export function decideCacheFresh(cache, ctx) {
  if (!cache || typeof cache !== "object") return { useFresh: false, reason: "no-cache", ageMs: null };
  if (cache.schemaVersion !== SCHEMA_VERSION) return { useFresh: false, reason: "schema-mismatch", ageMs: null };
  if (cache.host !== ctx.host) return { useFresh: false, reason: "different-host", ageMs: null };
  if (!Array.isArray(cache.procs)) return { useFresh: false, reason: "procs-not-array", ageMs: null };
  const writtenMs = Date.parse(cache.writtenAt);
  if (!Number.isFinite(writtenMs)) return { useFresh: false, reason: "writtenAt-bad", ageMs: null };
  const ageMs = ctx.nowMs - writtenMs;
  if (ageMs < 0) return { useFresh: false, reason: "writtenAt-future", ageMs };
  if (ageMs > ctx.ttlMs) return { useFresh: false, reason: "stale", ageMs };
  return { useFresh: true, reason: "fresh", ageMs };
}

/**
 * Decide whether a stale cache is still usable as a FALLBACK when live
 * enumerate just failed. We only fall back within `STALE_FALLBACK_FACTOR × TTL`
 * so a permanent enumerate failure doesn't ride forever on a week-old snapshot.
 *
 * @param {object|null} cache
 * @param {object} ctx
 * @returns {{useStale: boolean, reason: string, ageMs: number|null}}
 */
export function decideStaleFallback(cache, ctx) {
  if (!cache || typeof cache !== "object") return { useStale: false, reason: "no-cache", ageMs: null };
  if (cache.schemaVersion !== SCHEMA_VERSION) return { useStale: false, reason: "schema-mismatch", ageMs: null };
  if (cache.host !== ctx.host) return { useStale: false, reason: "different-host", ageMs: null };
  if (!Array.isArray(cache.procs)) return { useStale: false, reason: "procs-not-array", ageMs: null };
  const writtenMs = Date.parse(cache.writtenAt);
  if (!Number.isFinite(writtenMs)) return { useStale: false, reason: "writtenAt-bad", ageMs: null };
  const ageMs = ctx.nowMs - writtenMs;
  if (ageMs < 0) return { useStale: false, reason: "writtenAt-future", ageMs };
  const maxStaleMs = ctx.ttlMs * STALE_FALLBACK_FACTOR;
  if (ageMs > maxStaleMs) return { useStale: false, reason: "too-stale", ageMs };
  return { useStale: true, reason: "usable-fallback", ageMs };
}

/**
 * Construct the cache record to write.
 *
 * @param {Array} procs  — output of enumerateProcesses()
 * @param {object} ctx
 * @returns {object} cache object ready for JSON.stringify
 */
export function buildCacheRecord(procs, ctx) {
  return {
    schemaVersion: SCHEMA_VERSION,
    writtenAt: new Date(ctx.nowMs).toISOString(),
    host: ctx.host,
    ttlMs: ctx.ttlMs,
    procCount: Array.isArray(procs) ? procs.length : 0,
    procs: Array.isArray(procs) ? procs : [],
  };
}

/** Read knob `PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC` clamped to [5, 3600] s. */
export function ttlFromEnv(env = process.env) {
  const raw = env.PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_MS;
  const clamped = Math.min(3600, Math.max(5, Math.trunc(n)));
  return clamped * 1000;
}

/** Read kill-switch `PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE` (truthy = bypass). */
export function disabledFromEnv(env = process.env) {
  const v = String(env.PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

// ─── Thin I/O wrapper ────────────────────────────────────────────────────────

/**
 * Load + parse the cache JSON. Returns null for any failure mode (missing,
 * corrupt, oversize) — callers treat null identically. Pure-input function:
 * filesystem is the only side effect.
 *
 * @param {string} cachePath
 * @param {object} [io]  — inject readFileImpl / existsImpl for tests
 * @returns {object|null}
 */
export function readCache(cachePath, io = {}) {
  const read = io.readFileImpl || readFileSync;
  const exists = io.existsImpl || existsSync;
  try {
    if (!exists(cachePath)) return null;
    const buf = read(cachePath);
    const text = typeof buf === "string" ? buf : buf.toString("utf-8");
    if (text.length > MAX_CACHE_BYTES) return null; // oversize → ignore
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Atomic write: tmp file + rename. A concurrent reader sees either the OLD
 * complete JSON or the NEW complete JSON, never a half-written file.
 *
 * @param {string} cachePath
 * @param {object} record
 * @param {object} [io]
 * @returns {{ok: boolean, error: string|null}}
 */
export function writeCache(cachePath, record, io = {}) {
  const write = io.writeFileImpl || writeFileSync;
  const rename = io.renameImpl || renameSync;
  const unlink = io.unlinkImpl || unlinkSync;
  const tmp = `${cachePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    write(tmp, JSON.stringify(record), "utf-8");
    rename(tmp, cachePath);
    return { ok: true, error: null };
  } catch (err) {
    try { unlink(tmp); } catch { /* best-effort */ }
    return { ok: false, error: err?.message || String(err) };
  }
}

// ─── The high-level wrapper callers use ──────────────────────────────────────

/**
 * Cached version of enumerateProcesses(). Drop-in usage:
 *
 *   const { procs, fromCache, fromStaleCache, ageMs } = enumerateProcessesCached({
 *     enumerator: enumerateProcesses,   // inject the real one
 *   });
 *
 * Behavior:
 *   1. If disabled via env → call enumerator(), no cache touched.
 *   2. Read cache. If fresh → return cached procs.
 *   3. Else call enumerator(). On success → write cache + return.
 *   4. On enumerator failure (empty + lastEnumerationError-style):
 *        - if a usable stale cache exists → return it with fromStaleCache=true
 *        - else → return empty (preserve current reaper "safe degraded" behavior)
 *
 * @param {object} opts
 * @param {() => Array} opts.enumerator  — typically enumerateProcesses from process-slot-map
 * @param {string} [opts.cachePath]      — override (default DEFAULT_CACHE_PATH)
 * @param {object} [opts.io]             — inject readFileImpl/writeFileImpl/etc for tests
 * @param {object} [opts.env]            — env override for knob reads
 * @param {string} [opts.host]           — host override for tests (default os.hostname())
 * @param {number} [opts.nowMs]          — clock override for tests (default Date.now())
 * @param {(procs:Array)=>boolean} [opts.enumerateFailed] — override the "enumerate failed"
 *   predicate. Default: empty array. (process-slot-map.enumerateProcesses returns []
 *   on failure; the failure flag lives on lastEnumerationError module-level state.)
 * @returns {{
 *   procs: Array,
 *   fromCache: boolean,
 *   fromStaleCache: boolean,
 *   ageMs: number|null,
 *   reason: string,
 *   wroteCache: boolean,
 *   writeError: string|null,
 *   disabled: boolean
 * }}
 */
export function enumerateProcessesCached(opts) {
  if (!opts || typeof opts.enumerator !== "function") {
    throw new TypeError("enumerateProcessesCached requires opts.enumerator (function)");
  }
  const env = opts.env || process.env;
  const cachePath = opts.cachePath || DEFAULT_CACHE_PATH;
  const io = opts.io || {};
  const host = opts.host || hostname();
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const ttlMs = ttlFromEnv(env);
  const enumerateFailed = opts.enumerateFailed || ((procs) => !Array.isArray(procs) || procs.length === 0);

  if (disabledFromEnv(env)) {
    const procs = opts.enumerator() || [];
    return { procs, fromCache: false, fromStaleCache: false, ageMs: null, reason: "disabled", wroteCache: false, writeError: null, disabled: true };
  }

  const cache = readCache(cachePath, io);
  const freshDecision = decideCacheFresh(cache, { host, nowMs, ttlMs });
  if (freshDecision.useFresh) {
    return {
      procs: cache.procs,
      fromCache: true,
      fromStaleCache: false,
      ageMs: freshDecision.ageMs,
      reason: freshDecision.reason,
      wroteCache: false,
      writeError: null,
      disabled: false,
    };
  }

  // Cache miss / stale / corrupt → live enumerate
  const liveProcs = opts.enumerator() || [];
  if (!enumerateFailed(liveProcs)) {
    const record = buildCacheRecord(liveProcs, { host, nowMs, ttlMs });
    const w = writeCache(cachePath, record, io);
    return {
      procs: liveProcs,
      fromCache: false,
      fromStaleCache: false,
      ageMs: null,
      reason: `live-${freshDecision.reason}`,
      wroteCache: w.ok,
      writeError: w.error,
      disabled: false,
    };
  }

  // Live enumerate FAILED — try stale-fallback
  const staleDecision = decideStaleFallback(cache, { host, nowMs, ttlMs });
  if (staleDecision.useStale) {
    return {
      procs: cache.procs,
      fromCache: true,
      fromStaleCache: true,
      ageMs: staleDecision.ageMs,
      reason: "stale-fallback",
      wroteCache: false,
      writeError: null,
      disabled: false,
    };
  }

  // Neither live nor cache → preserve "safe degraded" behavior
  return {
    procs: [],
    fromCache: false,
    fromStaleCache: false,
    ageMs: null,
    reason: `enumerate-failed-${staleDecision.reason}`,
    wroteCache: false,
    writeError: null,
    disabled: false,
  };
}

// Re-export the constant set so callers can reason about what they got.
export const REASONS = Object.freeze({
  FRESH: "fresh",
  STALE: "stale",
  DISABLED: "disabled",
  STALE_FALLBACK: "stale-fallback",
  LIVE_NO_CACHE: "live-no-cache",
  LIVE_STALE: "live-stale",
  LIVE_SCHEMA_MISMATCH: "live-schema-mismatch",
  LIVE_DIFFERENT_HOST: "live-different-host",
});
