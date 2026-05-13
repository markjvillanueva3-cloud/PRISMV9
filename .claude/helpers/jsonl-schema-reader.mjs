#!/usr/bin/env node
/**
 * jsonl-schema-reader.mjs — versioned JSONL line dispatch (CLEANUP-MS0/U-CLEANUP-SCHEMA-READER)
 *
 * Reads a JSONL file (or any iterable of strings) line-by-line, parses
 * each line as JSON, looks at `schemaVersion` (default 1 when absent),
 * and dispatches to a per-version reader function. Lines that fail to
 * parse OR that lack a registered reader are surfaced as errors but
 * do NOT halt the read — the dispatch is fault-tolerant by design
 * (JSONL files in PRISM are append-only and may have partial writes
 * from in-progress writers).
 *
 * KNOWN LIMITS / OPERATOR NOTES:
 *   - readFile loads the whole file into memory via readFileSync. Designed
 *     for ≤50 MB JSONL files (the PRISM typical). Above that, stream the
 *     file yourself and feed lines into readLines(). A future stream API
 *     is tracked separately.
 *   - JSONL spec forbids embedded newlines in JSON string values. If a
 *     producer emits one anyway, raw.split("\n") will break the row in
 *     half and both halves surface as parse-failed errors. The helper
 *     does NOT auto-stitch — the producer is the bug.
 *   - Concurrent writers of `.schema-active-versions.json` are safe ONLY
 *     because each writer reads → unions → writes (idempotent set-union).
 *     Do NOT add a non-union write op without re-validating the invariant.
 *   - Handlers can be sync OR async — async handlers are awaited and their
 *     errors captured into result.errors[] (P0-1 fix below).
 *
 * Schema-evolution discipline (enforced by `validateAdditiveOnly`):
 *   - v(N+1) MUST keep every field name present in vN (no rename / no remove).
 *   - v(N+1) MAY add new fields.
 *   - Field type changes (string → number) are allowed but flagged.
 *   - Value-shape changes (object → array) are forbidden.
 *
 * Active-version tracking (`recordActiveVersion` / `loadActiveVersions`):
 *   The reader can record which versions it actually saw on disk for
 *   each schema name, so the operator can decommission readers for
 *   versions that haven't been observed in N release cycles.
 *
 * Usage (programmatic):
 *   const reader = createReader();
 *   reader.register(1, (row) => doV1(row));
 *   reader.register(2, (row) => doV2(row));
 *   const out = await reader.readFile("state/shared/AGENT_CHAT.jsonl");
 *   // out = { ok, totalLines, parsed, dispatched, errors[], counts: {1: N, 2: M} }
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-SCHEMA-READER.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

// Default schema version assumed when a line lacks the `schemaVersion` field.
// Pre-versioning JSONL files emit lines without it; treating them as v1 lets
// us add v2 fields incrementally without rewriting historical state.
export const DEFAULT_SCHEMA_VERSION = 1;

// Hard ceiling on a single line's byte length — defends against runaway
// writers / accidentally-concatenated files. 1 MB is generous; current
// PRISM JSONL lines run ~200 bytes typical, ~10 KB max observed.
export const MAX_LINE_BYTES = 1024 * 1024;

// ──────────────────────────────────────────────────────────────────────
// Default per-line tolerant parsers
// ──────────────────────────────────────────────────────────────────────

/**
 * Parse a single JSONL line. Returns { ok, value, schemaVersion, reason }.
 * - Empty / whitespace-only lines: ok:true, value:null (caller skips).
 * - JSON parse failure: ok:false with reason string.
 * - Non-object root (number / null / array): ok:false with reason.
 * - Missing schemaVersion: defaults to DEFAULT_SCHEMA_VERSION.
 */
export function parseJsonlLine(rawLine, opts = {}) {
  if (typeof rawLine !== "string") {
    return { ok: false, reason: `non-string line (typeof ${typeof rawLine})` };
  }
  const trimmed = rawLine.replace(/[\r\n]+$/, "");
  if (trimmed.length === 0) return { ok: true, value: null, schemaVersion: null, empty: true };
  if (Buffer.byteLength(trimmed, "utf8") > MAX_LINE_BYTES) {
    return { ok: false, reason: `line exceeds ${MAX_LINE_BYTES}-byte ceiling` };
  }
  let value;
  try {
    value = JSON.parse(trimmed);
  } catch (err) {
    return { ok: false, reason: `parse failed: ${String(err && err.message || err).slice(0, 200)}` };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: `non-object root (${Array.isArray(value) ? "array" : typeof value})` };
  }
  const schemaVersion = typeof value.schemaVersion === "number" && Number.isFinite(value.schemaVersion)
    ? Math.max(1, Math.floor(value.schemaVersion))
    : (opts.defaultVersion || DEFAULT_SCHEMA_VERSION);
  return { ok: true, value, schemaVersion };
}

// ──────────────────────────────────────────────────────────────────────
// Reader registry — per-schema, per-version dispatcher
// ──────────────────────────────────────────────────────────────────────

export function createReader(opts = {}) {
  // Map<version, handler>
  const handlers = new Map();
  // Track active versions seen per schema name across this reader's lifetime.
  const observedVersions = new Map(); // Map<schemaName, Set<version>>

  function register(version, handler) {
    if (typeof version !== "number" || version < 1 || !Number.isInteger(version)) {
      throw new Error(`register: version must be a positive integer, got ${version}`);
    }
    if (typeof handler !== "function") {
      throw new Error(`register: handler must be a function, got ${typeof handler}`);
    }
    handlers.set(version, handler);
  }

  function hasReader(version) { return handlers.has(version); }
  function listVersions() { return [...handlers.keys()].sort((a, b) => a - b); }
  function observed(schemaName) {
    if (!schemaName) return [];
    const s = observedVersions.get(schemaName);
    return s ? [...s].sort((a, b) => a - b) : [];
  }
  /**
   * Clear the observed-versions tracker. Use between logical "runs" of a
   * long-lived watcher / daemon process so promote/decommission decisions
   * reflect only the current cycle, not the lifetime of the helper.
   */
  function reset() { observedVersions.clear(); }

  /**
   * Dispatch a single parsed value to the registered reader for its version.
   * Returns { ok, dispatched, version, reason }.
   * - dispatched:true means a handler ran (with whatever return value was discarded).
   * - dispatched:false + reason="no_reader_for_version" means the line was skipped
   *   intentionally (caller may still want to count it).
   * - Handler may be sync or async — async returns are detected via thenable
   *   shape and the caller can `await` the returned promise, OR ignore it
   *   and accept the rejection-into-errors[] semantics (P0-1 fix).
   */
  function dispatch(parsed, opts = {}) {
    const v = parsed.schemaVersion;
    if (opts.schemaName) {
      if (!observedVersions.has(opts.schemaName)) observedVersions.set(opts.schemaName, new Set());
      observedVersions.get(opts.schemaName).add(v);
    }
    if (!handlers.has(v)) {
      return { ok: false, dispatched: false, version: v, reason: "no_reader_for_version" };
    }
    try {
      const ret = handlers.get(v)(parsed.value, { schemaVersion: v });
      // Async-handler safety (B-P0-1): if the handler returned a thenable,
      // attach a catch so a rejection doesn't escape as an unhandled
      // promise rejection. The caller of readLines/readFile gets a sync
      // best-effort result — async errors land in result.asyncErrors[]
      // via the closure on `out` below.
      if (ret && typeof ret.then === "function") {
        const promise = ret.catch((err) => ({
          __asyncHandlerError: true,
          version: v,
          reason: `handler async-threw: ${String(err && err.message || err).slice(0, 200)}`,
        })).then((r) => {
          if (r && r.__asyncHandlerError && currentAsyncErrors) currentAsyncErrors.push(r);
        });
        // Track so awaitAsync() can drain.
        if (currentPendingAsync) currentPendingAsync.push(promise);
      }
      return { ok: true, dispatched: true, version: v };
    } catch (err) {
      return { ok: false, dispatched: false, version: v, reason: `handler threw: ${String(err && err.message || err).slice(0, 200)}` };
    }
  }

  // Closure-scoped buffers: dispatch() pushes async errors here; readLines
  // resets them per-call so callers get a clean slate per readFile invocation.
  let currentAsyncErrors = null;
  let currentPendingAsync = null;
  /**
   * After readLines/readFile, await any in-flight async handlers so their
   * errors land in result.asyncErrors[]. No-op if all handlers were sync.
   */
  async function awaitAsync() {
    if (!currentPendingAsync || currentPendingAsync.length === 0) return [];
    await Promise.allSettled(currentPendingAsync);
    return currentAsyncErrors || [];
  }

  function readLines(linesIterable, opts = {}) {
    const out = {
      ok: true,
      totalLines: 0,
      parsed: 0,
      dispatched: 0,
      empty: 0,
      errors: [],
      asyncErrors: [],
      counts: {},
    };
    // Bind closure buffers for THIS read so async errors flow back to `out`.
    currentAsyncErrors = out.asyncErrors;
    currentPendingAsync = [];
    let idx = 0;
    for (const raw of linesIterable) {
      idx++;
      out.totalLines++;
      const p = parseJsonlLine(raw, opts);
      if (p.empty) { out.empty++; continue; }
      if (!p.ok) {
        out.errors.push({ line: idx, reason: p.reason });
        continue;
      }
      out.parsed++;
      const v = p.schemaVersion;
      out.counts[v] = (out.counts[v] || 0) + 1;
      const d = dispatch(p, opts);
      if (d.dispatched) out.dispatched++;
      else out.errors.push({ line: idx, reason: d.reason, version: d.version });
    }
    // Expose pending-async drain on the result so callers can await if needed.
    const pending = currentPendingAsync;
    out.awaitAsync = async () => {
      if (pending.length > 0) await Promise.allSettled(pending);
      return out.asyncErrors;
    };
    return out;
  }

  function readFile(absPath, opts = {}) {
    if (!existsSync(absPath)) {
      return { ok: false, reason: `file not found: ${absPath}`, totalLines: 0, parsed: 0, dispatched: 0, empty: 0, errors: [], counts: {} };
    }
    let raw;
    try { raw = readFileSync(absPath, "utf8"); }
    catch (err) {
      return { ok: false, reason: `read failed: ${String(err && err.message || err).slice(0, 200)}`, totalLines: 0, parsed: 0, dispatched: 0, empty: 0, errors: [], counts: {} };
    }
    // Split on LF — works for CRLF too (parseJsonlLine strips trailing CR).
    const lines = raw.split("\n");
    return readLines(lines, opts);
  }

  return { register, hasReader, listVersions, observed, reset, dispatch, readLines, readFile, awaitAsync };
}

// ──────────────────────────────────────────────────────────────────────
// Additive-only schema validation
// ──────────────────────────────────────────────────────────────────────

/**
 * Compare two schema "shape" descriptors and return a verdict whether
 * the upgrade from `prev` to `next` is "additive-only" per the discipline:
 *   - PASS: prev fields are all present in next (rename / removal forbidden).
 *           type changes flagged as warnings.
 *           value-shape changes (object↔array) → fail.
 *   - FAIL: rename / remove / object↔array shape change.
 *
 * Schema descriptor shape: { schemaVersion: number, fields: {[name]: typeString} }.
 * Where typeString is one of "string"|"number"|"boolean"|"object"|"array"|"null"|"any".
 *
 * Returns { ok, warnings:[], errors:[] }.
 */
export function validateAdditiveOnly(prev, next) {
  const warnings = [];
  const errors = [];
  if (!prev || !next || typeof prev !== "object" || typeof next !== "object") {
    return { ok: false, warnings, errors: [{ kind: "missing_descriptor", reason: "prev or next descriptor missing" }] };
  }
  const prevFields = (prev.fields && typeof prev.fields === "object" && !Array.isArray(prev.fields)) ? prev.fields : {};
  const nextFields = (next.fields && typeof next.fields === "object" && !Array.isArray(next.fields)) ? next.fields : {};
  for (const name of Object.keys(prevFields)) {
    if (!Object.prototype.hasOwnProperty.call(nextFields, name)) {
      errors.push({ kind: "field_removed", field: name });
      continue;
    }
    const prevType = prevFields[name];
    const nextType = nextFields[name];
    if (prevType === nextType) continue;
    // object ↔ array is a value-shape change — forbidden.
    const isObjectArrayFlip =
      (prevType === "object" && nextType === "array") ||
      (prevType === "array" && nextType === "object");
    if (isObjectArrayFlip) {
      errors.push({ kind: "object_array_flip", field: name, prev: prevType, next: nextType });
    } else {
      warnings.push({ kind: "type_changed", field: name, prev: prevType, next: nextType });
    }
  }
  // Detect additions (informational only — additive is the whole point).
  const additions = [];
  for (const name of Object.keys(nextFields)) {
    if (!Object.prototype.hasOwnProperty.call(prevFields, name)) additions.push(name);
  }
  return { ok: errors.length === 0, warnings, errors, additions, prev_version: prev.schemaVersion, next_version: next.schemaVersion };
}

// ──────────────────────────────────────────────────────────────────────
// Active-version tracking (.schema-active-versions.json)
// ──────────────────────────────────────────────────────────────────────

/**
 * Load the active-versions registry. Shape:
 *   { schemaVersion: 1, schemas: { [schemaName]: { active_versions:[N], last_seen:{N: ISO}, last_updated: ISO } } }
 * Missing / corrupt → returns empty-but-valid shape.
 */
export function loadActiveVersions(absPath) {
  if (!existsSync(absPath)) return { schemaVersion: 1, schemas: {} };
  let raw;
  try { raw = readFileSync(absPath, "utf8"); }
  catch { return { schemaVersion: 1, schemas: {} }; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { schemaVersion: 1, schemas: {} }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { schemaVersion: 1, schemas: {} };
  return {
    schemaVersion: parsed.schemaVersion || 1,
    schemas: parsed.schemas && typeof parsed.schemas === "object" && !Array.isArray(parsed.schemas) ? parsed.schemas : {},
  };
}

/**
 * Record that schemaName at version N was observed at timestamp.
 * Mutates the in-memory registry; caller writes back via writeActiveVersions.
 */
export function recordActiveVersion(registry, schemaName, version, timestamp) {
  if (!registry || !schemaName || typeof version !== "number") return registry;
  if (!registry.schemas) registry.schemas = {};
  if (!registry.schemas[schemaName]) {
    registry.schemas[schemaName] = { active_versions: [], last_seen: {}, last_updated: timestamp };
  }
  const entry = registry.schemas[schemaName];
  if (!Array.isArray(entry.active_versions)) entry.active_versions = [];
  if (!entry.last_seen || typeof entry.last_seen !== "object") entry.last_seen = {};
  if (!entry.active_versions.includes(version)) entry.active_versions.push(version);
  entry.active_versions.sort((a, b) => a - b);
  entry.last_seen[version] = timestamp;
  entry.last_updated = timestamp;
  return registry;
}

export function writeActiveVersions(absPath, registry) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  writeFileSync(tmp, JSON.stringify(registry, null, 2) + "\n", "utf8");
  renameSync(tmp, absPath);
}

/**
 * Convenience: drop versions that haven't been seen in `staleAfterMs` from
 * the active list. Returns the prune verdict so callers can log.
 */
export function pruneStaleVersions(registry, schemaName, nowMs, staleAfterMs) {
  if (!registry || !registry.schemas || !registry.schemas[schemaName]) return { pruned: [] };
  const entry = registry.schemas[schemaName];
  if (!Array.isArray(entry.active_versions) || !entry.last_seen) return { pruned: [] };
  const pruned = [];
  const remaining = [];
  for (const v of entry.active_versions) {
    const ts = entry.last_seen[v];
    const tsMs = ts ? Date.parse(ts) : NaN;
    if (Number.isFinite(tsMs) && nowMs - tsMs > staleAfterMs) {
      pruned.push({ version: v, last_seen: ts });
      delete entry.last_seen[v];
    } else {
      remaining.push(v);
    }
  }
  entry.active_versions = remaining;
  return { pruned, remaining };
}
