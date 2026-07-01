#!/usr/bin/env node
/**
 * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
 *
 * Spec: CLEANUP-MS0 / U-CLEANUP-C3
 *
 * Bridges the ~100s latency between full system-viz regenerations
 * (`generate-system-viz.mjs` rebuilds the whole 20K-node graph from
 * scratch) by appending "dashed" provisional nodes to the live graph
 * as soon as new engines / dispatchers / skills are created. The next
 * full regen reconciles them with authoritative live state.
 *
 * Three-tier design:
 *   1. ENQUEUE (always; idempotent against the graph) — append to
 *      staging/add-node-queue.jsonl as one JSONL row per node.
 *   2. FLUSH (rate-limited, default 60s) — splice queued nodes into
 *      system-graph.json, atomic write, truncate queue (also atomic).
 *   3. GUARD (PID file) — prevent concurrent flushes from racing on
 *      the 41MB graph (multi-chat safe). SIGINT/SIGTERM clean it up.
 *
 * Idempotency: re-running with the same --label (or --id) will not
 * produce duplicate nodes IN THE GRAPH. Under heavy concurrent ENQUEUE
 * from multiple chats two rows for the same id can appear in the queue
 * (no inter-process lock on append); the FLUSH step dedupes against
 * the graph's id set so the live graph stays clean. Queue-duplicates
 * are bounded (one row per concurrent call) and reaped on next flush.
 *
 * Invoked by:
 *   - CLEANUP-MS0/U-CLEANUP-C5 watchdog (B1 onNewEngineFile) — fires
 *     this with --engine-file <path> on every fs.watch event.
 *   - Manually:  node scripts/system-viz-add-node.mjs --label Foo --layer L5
 *
 * Env knobs (used by tests + ops):
 *   PRISM_SYSTEM_VIZ_DIR                 override base viz dir (test isolation)
 *   PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS   override flush interval
 *   PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE=1  no-op disable
 *   PRISM_SYSTEM_VIZ_ONCOMMIT_PID        override .system-viz-on-commit.pid path (test isolation)
 *
 * Exit codes:
 *   0  enqueued (and possibly flushed) successfully
 *   1  argument / validation error
 *   2  unexpected runtime error (graph missing, write failure, etc.)
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-C3
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isGraphWriteLockActive,
  graphWriteLockPath,
} from "./lib/system-graph-write-lock.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── exported semantic constants (not magic numbers) ──────────────────────

/** Default flush interval — 60s per spec. Overridable via env for tests + cron. */
export const FLUSH_INTERVAL_MS = 60_000;

/** Max number of nodes flushed in a single batch (caps graph-write cost). */
export const MAX_BATCH = 200;

/**
 * Hard cap on queue-file size before we refuse to parse (DoS guard).
 * A normal queue is <50 KiB even under bursty enqueue; >32 MiB means
 * something is wrong (runaway loop, corrupt append). 32 MiB.
 */
export const MAX_QUEUE_BYTES = 32 * 1024 * 1024;

/** Valid layer ids — must match generate-system-viz.mjs. */
export const VALID_LAYERS = new Set([
  "L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11",
]);

/** Default layer for a newly-detected engine (matches L5 = engines/unwired). */
export const DEFAULT_LAYER = "L5";

/** Default subgroup when --engine flag is set. */
export const ENGINE_SUBGROUP = "unwired";

/** Provisional status — viewer renders these with a dashed border. */
export const DASHED_STATUS = "dashed";

/** Default render size for a dashed node (matches generate-system-viz.mjs L5). */
export const DASHED_SIZE = 0.8;

/** Default render color for a dashed node (slate-400 — neutral pending). */
export const DASHED_COLOR = "#94a3b8";

/** Source-tag default written to every staged node for provenance. */
export const DEFAULT_SOURCE = "system-viz-add-node";

/** Extensions stripped when deriving a node label from a source filename. */
export const SCRIPT_EXTENSIONS_RE = /\.(ts|js|mjs|cjs|tsx|jsx)$/i;

/** Allowed id charset — same regex applied to --label slugify and --id raw input. */
export const ID_VALIDATION_RE = /^[a-z0-9._-]+$/i;

// ─── path helpers ────────────────────────────────────────────────────────

/** Resolve the staging dir, honoring PRISM_SYSTEM_VIZ_DIR for tests. */
export function vizDir() {
  const override = process.env.PRISM_SYSTEM_VIZ_DIR;
  if (override && override.trim()) return path.resolve(override);
  return path.join(ROOT, "state", "shared", "system-viz");
}

export function stagingDir()    { return path.join(vizDir(), "staging"); }
export function queuePath()     { return path.join(stagingDir(), "add-node-queue.jsonl"); }
export function lastFlushPath() { return path.join(stagingDir(), ".last-flush.iso"); }
export function pidFilePath()   { return path.join(stagingDir(), ".system-viz-add-node.pid"); }
export function graphPath()     { return path.join(vizDir(), "system-graph.json"); }

/**
 * Path to `generate-system-viz.mjs`'s PID lock — the FULL-REGEN writer's
 * lock, which lives at the repo root (see `system-viz-on-commit.mjs`).
 * That writer does a non-atomic `writeFileSync` of the same graph, under
 * THIS separate lock; `flushQueue` checks it to avoid a lost-update race.
 * Overridable via PRISM_SYSTEM_VIZ_ONCOMMIT_PID for test isolation.
 */
export function onCommitPidPath() {
  const override = process.env.PRISM_SYSTEM_VIZ_ONCOMMIT_PID;
  if (override && override.trim()) return path.resolve(override);
  return path.join(ROOT, ".system-viz-on-commit.pid");
}

// ─── pure helpers (unit-testable in-process) ─────────────────────────────

/**
 * Slugify a label into a stable node id.
 *   "MyEngine"          → "engine.myengine"
 *   "Foo Bar"           → "engine.foo-bar"
 *   "AlphaBetaGamma.ts" → "engine.alphabetagamma" (extension stripped)
 *
 * Keeps lowercase letters, digits, dot, dash, underscore. Collapses
 * anything else to a single dash. Trims trailing dashes.
 *
 * Throws RangeError if the result post-clean is empty (e.g. non-ASCII
 * label that slugged to nothing) — silent empty would produce ambiguous
 * "engine." ids that collide with each other.
 */
export function slugifyLabel(label, prefix = "engine") {
  if (typeof label !== "string") {
    throw new RangeError(`slugifyLabel: label must be a string, got ${typeof label}`);
  }
  const cleaned = label
    .replace(SCRIPT_EXTENSIONS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleaned) {
    throw new RangeError(`slugifyLabel: label "${label}" produced an empty slug (only non-ASCII chars?)`);
  }
  return `${prefix}.${cleaned}`;
}

/**
 * Normalize a layer arg ("l5", "L5", "  L5  ") → "L5".
 * Throws RangeError if not one of L0..L11.
 */
export function normalizeLayer(raw) {
  if (typeof raw !== "string") {
    throw new RangeError(`layer must be a string, got ${typeof raw}`);
  }
  const layer = raw.trim().toUpperCase();
  if (!VALID_LAYERS.has(layer)) {
    throw new RangeError(`invalid layer "${raw}" — expected one of ${[...VALID_LAYERS].join(", ")}`);
  }
  return layer;
}

/**
 * Validate a raw --id arg against the allowed-charset regex.
 * Throws RangeError otherwise. Prevents stored-XSS-style id injection
 * if a downstream viewer ever templates `node.id` unescaped.
 */
export function validateRawId(raw) {
  if (typeof raw !== "string") {
    throw new RangeError(`--id must be a string, got ${typeof raw}`);
  }
  if (!ID_VALIDATION_RE.test(raw)) {
    throw new RangeError(`--id "${raw}" must match ${ID_VALIDATION_RE} (letters, digits, dot, dash, underscore)`);
  }
  // Defense-in-depth: reject path-traversal-shaped ids even though id is
  // never used as a filesystem path inside this script. Downstream consumers
  // (viewer, graph diff tools) may template id into URLs / data attrs.
  if (raw === "." || raw === ".." || raw.includes("..")) {
    throw new RangeError(`--id "${raw}" must not be "." / ".." or contain ".." (traversal-shaped)`);
  }
  return raw;
}

/**
 * Derive a node-shape entry from CLI args. Pure — no I/O. Throws on
 * validation failure (missing/non-string label, bad layer, bad id).
 */
export function buildNodeEntry(args) {
  if (args == null || typeof args !== "object") {
    throw new RangeError("buildNodeEntry: args must be an object");
  }
  if (typeof args.label !== "string") {
    throw new RangeError(`--label is required and must be a string (got ${typeof args.label})`);
  }
  const label = args.label.trim();
  if (!label) throw new RangeError("--label is required and must be non-empty");

  const layer = normalizeLayer(args.layer ?? DEFAULT_LAYER);

  let id;
  if (args.id !== undefined && args.id !== "") {
    if (typeof args.id !== "string") {
      throw new RangeError(`--id must be a string (got ${typeof args.id})`);
    }
    const trimmed = args.id.trim();
    if (trimmed) {
      validateRawId(trimmed);
      id = trimmed;
    } else {
      id = slugifyLabel(label);
    }
  } else {
    id = slugifyLabel(label);
  }

  const isEngine = !!args.engine;
  const subgroup = (typeof args.subgroup === "string" && args.subgroup.trim())
    ? args.subgroup.trim()
    : (isEngine ? ENGINE_SUBGROUP : "main");
  const source = (typeof args.source === "string" && args.source.trim())
    ? args.source.trim()
    : DEFAULT_SOURCE;
  const stagedAt = args._stagedAt || new Date().toISOString();
  const info = (typeof args.info === "string") ? args.info : "";

  return {
    id,
    label,
    layer,
    subgroup,
    status: DASHED_STATUS,
    size: DASHED_SIZE,
    color: DASHED_COLOR,
    info,
    _stagedAt: stagedAt,
    _source: source,
  };
}

/**
 * Prototype-pollution-safe JSON.parse reviver — drops __proto__ /
 * constructor keys so a malicious queue row can't pollute Object.prototype
 * when the parsed object is later push()'d into the graph nodes array.
 */
const safeReviver = (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype") ? undefined : v;

/**
 * Read JSONL queue safely. Returns `{ entries, corrupt }` where
 * `corrupt` is the count of unparseable lines (skipped, not fatal).
 * Refuses to read if file size exceeds MAX_QUEUE_BYTES (DoS guard).
 */
export function readQueue(qpath) {
  if (!fs.existsSync(qpath)) return { entries: [], corrupt: 0, tooLarge: false };
  const stat = fs.statSync(qpath);
  if (stat.size > MAX_QUEUE_BYTES) {
    return { entries: [], corrupt: 0, tooLarge: true, sizeBytes: stat.size };
  }
  const raw = fs.readFileSync(qpath, "utf8");
  const entries = [];
  let corrupt = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { entries.push(JSON.parse(trimmed, safeReviver)); }
    catch { corrupt++; }
  }
  return { entries, corrupt, tooLarge: false };
}

/**
 * True if `id` is already present in either the queue or the graph nodes.
 * Accepts a precomputed Set for graph ids (caller-built once per run) so
 * the cost is O(1) per dup check vs the 20K-node graph.
 */
export function isDuplicate(id, queueEntries, graphIdSet) {
  if (graphIdSet instanceof Set) {
    if (graphIdSet.has(id)) return true;
  } else if (Array.isArray(graphIdSet)) {
    for (const n of graphIdSet) if (n && n.id === id) return true;
  }
  for (const e of queueEntries) if (e && e.id === id) return true;
  return false;
}

/** Atomic JSON write: temp-file + fs.renameSync (replaces on existing). */
export function atomicWriteJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

/** Atomic text write — same temp+rename pattern but for raw strings (queue, ISO timestamp). */
export function atomicWriteText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, p);
}

/** Append a single node entry to the queue as one JSONL row. */
export function appendQueue(qpath, entry) {
  fs.mkdirSync(path.dirname(qpath), { recursive: true });
  // appendFileSync is best-effort under concurrent writers on Windows;
  // the readQueue corrupt-line skip is the safety net per spec.
  fs.appendFileSync(qpath, JSON.stringify(entry) + "\n");
}

/** Milliseconds since the recorded last flush, or Infinity if never flushed. */
export function msSinceLastFlush(lfPath, now = Date.now()) {
  if (!fs.existsSync(lfPath)) return Infinity;
  const iso = fs.readFileSync(lfPath, "utf8").trim();
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return now - t;
}

// ─── PID-file guard (mirrors system-viz-on-commit.mjs pattern) ───────────

/**
 * Acquire single-writer guard via PID file. Returns true if acquired,
 * false if another live writer is mid-flush (caller should exit cleanly).
 * Crash-safe: dead PIDs are reclaimed via process.kill(pid, 0) probe.
 */
export function acquirePidLock(pPath) {
  fs.mkdirSync(path.dirname(pPath), { recursive: true });
  try {
    const existing = fs.readFileSync(pPath, "utf8").trim();
    const pid = parseInt(existing, 10);
    if (Number.isFinite(pid) && pid > 0 && pid !== process.pid) {
      try {
        process.kill(pid, 0); // liveness probe — throws ESRCH on dead
        return false; // another live writer holds the lock
      } catch { /* dead PID — claim by overwriting */ }
    }
  } catch { /* no PID file or unreadable — proceed to write */ }
  fs.writeFileSync(pPath, String(process.pid));
  return true;
}

export function releasePidLock(pPath) {
  try {
    const existing = fs.readFileSync(pPath, "utf8").trim();
    if (parseInt(existing, 10) === process.pid) fs.unlinkSync(pPath);
  } catch { /* already gone */ }
}

/**
 * True if the full-regen writer (`generate-system-viz.mjs`, via
 * `system-viz-on-commit.mjs`) is currently running — i.e. its PID file
 * exists AND holds a live process. Stale/dead PIDs return false (the
 * regen crashed; safe to flush). `flushQueue` defers when this is true
 * to avoid a lost-update race on the shared 41MB graph.
 */
export function isRegenActive(pidPath = onCommitPidPath()) {
  try {
    if (!fs.existsSync(pidPath)) return false;
    const pid = parseInt(fs.readFileSync(pidPath, "utf8").trim(), 10);
    if (!Number.isFinite(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; }  // alive
    catch { return false; }                      // dead PID — stale lock
  } catch { return false; }
}

/**
 * Compute the set of entries that appeared in the queue file between the
 * original snapshot and the post-graph-write re-read. Excludes entries
 * that were already in the original snapshot (already classified into
 * `batch` or `remaining`) and entries we just flushed into the graph
 * this pass. The leftover set = peer-chat appends that arrived during
 * the flush window.
 *
 * Pure — exported for direct testability (ESM module-internal calls
 * cannot be intercepted by `vi.spyOn` so we test the concurrent-merge
 * logic at the helper level).
 */
export function computeConcurrentAdds(rereadEntries, originalSnapshot, flushedBatch) {
  const flushedIds  = new Set(flushedBatch.map(e => e && e.id).filter(Boolean));
  const originalIds = new Set(originalSnapshot.map(e => e && e.id).filter(Boolean));
  const adds = [];
  for (const e of rereadEntries) {
    if (!e || typeof e.id !== "string") continue;
    if (flushedIds.has(e.id))  continue; // already flushed into graph this pass
    if (originalIds.has(e.id)) continue; // already in pre-flush snapshot
    adds.push(e);
  }
  return adds;
}

// ─── flush logic ─────────────────────────────────────────────────────────

/**
 * Splice up to MAX_BATCH queued nodes into the live graph. Idempotent
 * against the graph (skips ids already present). Returns flushed count.
 *
 * COORDINATION WITH THE FULL-REGEN WRITER — `generate-system-viz.mjs`
 * (invoked by the post-commit hook + hourly cron) does a non-atomic full
 * `writeFileSync` of the SAME `system-graph.json`, under a SEPARATE PID
 * lock (`.system-viz-on-commit.pid`). Our add-node PID lock does not
 * exclude it. Left uncoordinated, our stale read-modify-write would
 * silently clobber a fresh full regen. flushQueue defends in three tiers:
 *   1. DEFER  — if the regen PID lock is held by a live process, skip the
 *               flush entirely (`error: "regen_active"`, `deferred: true`).
 *               lastFlush is NOT touched so the next call retries promptly.
 *   2. CAS    — capture graph mtime at read; if it moved before our
 *               atomicWriteJson, a regen/peer landed mid-window — ABORT
 *               the write (`error: "graph_changed_during_flush"`).
 *   3. VERIFY — after the write, re-read the graph and confirm every id
 *               we added is present; if a regen clobbered us in the
 *               stat->rename gap, some are missing — return
 *               `error: "graph_clobbered_post_write"`.
 * Every abort path is explicit AND non-destructive (the queue is never
 * truncated on abort) — never silent, never lost; the batch retries on
 * the next flush against a stable graph.
 *
 * On graph-missing returns `{ flushed: 0, skipped: 0, error: "graph_missing" }`
 * rather than throwing — callers can keep enqueueing harmlessly.
 *
 * @internal Caller MUST hold `pidFilePath()` lock — `flushQueue` does
 *           not acquire/release it on its own.
 */
export function flushQueue({ gPath, qPath, lfPath, onCommitPid, graphWriteLock, now = new Date() } = {}) {
  gPath  = gPath  || graphPath();
  qPath  = qPath  || queuePath();
  lfPath = lfPath || lastFlushPath();
  onCommitPid = onCommitPid || onCommitPidPath();
  graphWriteLock = graphWriteLock || graphWriteLockPath();

  const { entries: queue, corrupt, tooLarge } = readQueue(qPath);
  if (tooLarge) {
    return { flushed: 0, skipped: 0, corrupt: 0, queueDepth: -1, batch: 0, error: "queue_too_large" };
  }
  if (queue.length === 0) {
    atomicWriteText(lfPath, now.toISOString());
    return { flushed: 0, skipped: 0, corrupt, queueDepth: 0, batch: 0 };
  }

  // TIER 1 — DEFER while the full-regen writer is active. It does a
  // non-atomic 41MB writeFileSync of the same graph under its own lock.
  // Do NOT touch lastFlush — the next call should retry promptly, not
  // wait out the 60s interval.
  if (isRegenActive(onCommitPid)) {
    return { flushed: 0, skipped: 0, corrupt, queueDepth: queue.length, batch: 0, deferred: true, error: "regen_active" };
  }

  // TIER 1b — U-VIZ-F11-CROSS-LOCK. DEFER while the SHARED system-graph.json
  // write-lock is held live by a peer (regen-viz.mjs or system-viz-on-commit.mjs
  // mid-merge). TIER-1 above only fences the generate-system-viz writer
  // (.system-viz-on-commit.pid); F1 isolated that to architecture-graph.json,
  // but regen-viz / on-commit still rewrite system-graph.json under the
  // SEPARATE .system-graph-write.pid. Without this our stale read-modify-
  // atomic-write would silently clobber a fresh regen merge (or be clobbered
  // by it). Same non-destructive defer contract as TIER-1: queue is NOT
  // touched, lastFlush NOT advanced, next call retries promptly. A stale/
  // dead holder self-heals (the lock's process.kill(pid,0) reclaim) so this
  // never permanently wedges flushing.
  if (isGraphWriteLockActive({ pidPath: graphWriteLock })) {
    return { flushed: 0, skipped: 0, corrupt, queueDepth: queue.length, batch: 0, deferred: true, error: "graph_write_locked" };
  }

  if (!fs.existsSync(gPath)) {
    return { flushed: 0, skipped: 0, corrupt, queueDepth: queue.length, batch: 0, error: "graph_missing" };
  }

  // TIER 2 (capture) — graph mtime at read, for the optimistic-CAS check.
  let graphMtimeMs = null;
  try { graphMtimeMs = fs.statSync(gPath).mtimeMs; } catch { graphMtimeMs = null; }

  let graph;
  try { graph = JSON.parse(fs.readFileSync(gPath, "utf8")); }
  catch (e) {
    return { flushed: 0, skipped: 0, corrupt, queueDepth: queue.length, batch: 0, error: `graph_parse_failed: ${e.message}` };
  }
  if (!graph || typeof graph !== "object") {
    return { flushed: 0, skipped: 0, corrupt, queueDepth: queue.length, batch: 0, error: "graph_shape_invalid" };
  }
  if (!Array.isArray(graph.nodes)) graph.nodes = [];

  const existing = new Set(graph.nodes.map(n => n && n.id).filter(Boolean));
  const batch = queue.slice(0, MAX_BATCH);
  const remaining = queue.slice(MAX_BATCH);

  let added = 0;
  let skipped = 0;
  const addedIds = [];
  for (const e of batch) {
    if (!e || typeof e.id !== "string") { skipped++; continue; }
    if (existing.has(e.id)) { skipped++; continue; }
    graph.nodes.push(e);
    existing.add(e.id);
    addedIds.push(e.id);
    added++;
  }

  if (added > 0) {
    // TIER 2 (check) — if the graph mtime moved between our read and now,
    // a regen/peer landed during our read-modify window. Abort the write;
    // the queue is left intact so the batch retries against the fresh graph.
    if (graphMtimeMs !== null) {
      let mtimeNow = null;
      try { mtimeNow = fs.statSync(gPath).mtimeMs; } catch { mtimeNow = null; }
      if (mtimeNow !== null && mtimeNow !== graphMtimeMs) {
        return { flushed: 0, skipped, corrupt, queueDepth: queue.length, batch: batch.length, error: "graph_changed_during_flush" };
      }
    }

    atomicWriteJson(gPath, graph);

    // TIER 3 — post-write verification. Re-read the graph and confirm
    // every id we added is present. If a regen clobbered us in the
    // stat->rename gap, some are missing — leave the queue intact so the
    // batch retries; never truncate on an unverified write.
    try {
      const verify = JSON.parse(fs.readFileSync(gPath, "utf8"));
      const verifyIds = new Set(
        Array.isArray(verify.nodes) ? verify.nodes.map(n => n && n.id).filter(Boolean) : [],
      );
      const missing = addedIds.filter(id => !verifyIds.has(id));
      if (missing.length > 0) {
        return { flushed: 0, skipped, corrupt, queueDepth: queue.length, batch: batch.length, error: "graph_clobbered_post_write", clobberedIds: missing.length };
      }
    } catch {
      // Re-read failed (regen mid-write?) — treat as clobbered, queue intact.
      return { flushed: 0, skipped, corrupt, queueDepth: queue.length, batch: batch.length, error: "graph_clobbered_post_write" };
    }
  }

  // Re-read the queue RIGHT BEFORE truncating to capture any rows a peer
  // chat appended during the graph write (appendQueue is lock-free).
  const reread = readQueue(qPath);
  const concurrentAdds = computeConcurrentAdds(reread.entries, queue, batch);
  const newRemaining = remaining.concat(concurrentAdds);

  // Truncate-with-remainder: atomic rewrite of the queue keeping over-batch entries.
  if (newRemaining.length === 0) {
    try { fs.unlinkSync(qPath); } catch { /* ok if already gone */ }
  } else {
    const body = newRemaining.map(e => JSON.stringify(e)).join("\n") + "\n";
    atomicWriteText(qPath, body);
  }

  atomicWriteText(lfPath, now.toISOString());

  return { flushed: added, skipped, corrupt, queueDepth: newRemaining.length, batch: batch.length, concurrentMerged: concurrentAdds.length };
}

// ─── argv parsing (lightweight — no external dep) ────────────────────────

/**
 * Parse `--flag value` and `--bool` style args. Single-pass.
 * Coerces literal "true"/"false" string values to booleans so
 * `--engine false` actually disables instead of being truthy.
 */
export function parseArgv(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (typeof tok !== "string" || !tok.startsWith("--")) { out._.push(tok); continue; }
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || (typeof next === "string" && next.startsWith("--"))) {
      out[key] = true;
    } else {
      if (next === "true") out[key] = true;
      else if (next === "false") out[key] = false;
      else out[key] = next;
      i++;
    }
  }
  return out;
}

/** Convert a file path (e.g. "src/engines/FooEngine.ts") → label "FooEngine". */
export function labelFromEngineFile(p) {
  const base = path.basename(String(p));
  return base.replace(SCRIPT_EXTENSIONS_RE, "");
}

// ─── entrypoint ──────────────────────────────────────────────────────────

function isMainModule() {
  try {
    const argvPath = process.argv[1];
    if (!argvPath) return false;
    const invokedPath = path.normalize(fs.realpathSync(argvPath));
    const thisPath = path.normalize(fs.realpathSync(fileURLToPath(import.meta.url)));
    if (process.platform === "win32") {
      return invokedPath.toLowerCase() === thisPath.toLowerCase();
    }
    return invokedPath === thisPath;
  } catch { return false; }
}

export function emit(result, useJson) {
  if (useJson) { console.log(JSON.stringify(result)); return; }
  const parts = [
    `enqueued=${result.enqueued ?? 0}`,
    `flushed=${result.flushed ?? 0}`,
    `skipped=${result.skipped ?? 0}`,
    `corrupt=${result.corrupt ?? 0}`,
    `queueDepth=${result.queueDepth ?? 0}`,
  ];
  if (result.error) parts.push(`error=${result.error}`);
  if (result.note)  parts.push(`note=${result.note}`);
  console.log(parts.join(" "));
}

export async function main(argv = process.argv.slice(2)) {
  if (process.env.PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE === "1") {
    emit({ ok: true, disabled: true, enqueued: 0, flushed: 0, skipped: 0, corrupt: 0, queueDepth: 0, note: "disabled-by-env" }, true);
    return 0;
  }

  const args = parseArgv(argv);
  const useJson = !!args.json;

  // Derive label from --engine-file if --label is missing.
  if (typeof args.label !== "string" && typeof args["engine-file"] === "string") {
    args.label = labelFromEngineFile(args["engine-file"]);
    args.engine = true;
  }

  let entry;
  try { entry = buildNodeEntry(args); }
  catch (e) {
    emit({ ok: false, error: e.message }, useJson);
    return 1;
  }

  const qPath  = queuePath();
  const gPath  = graphPath();
  const lfPath = lastFlushPath();
  const pPath  = pidFilePath();

  // SIGINT/SIGTERM cleanup — drop the PID lock if we hold it on Ctrl-C.
  // Guard against listener accumulation when main() is called repeatedly
  // in-process (vitest, /loop): only register once per process.
  const sigHandler = () => { releasePidLock(pPath); process.exit(130); };
  if (process.listenerCount("SIGINT")  === 0) process.on("SIGINT",  sigHandler);
  if (process.listenerCount("SIGTERM") === 0) process.on("SIGTERM", sigHandler);

  // Idempotency check against queue + graph BEFORE writing. Builds the
  // graph id Set once so dup-check is O(1), not O(N).
  let dup = false;
  let preReadCorrupt = 0;
  try {
    const qr = readQueue(qPath);
    preReadCorrupt = qr.corrupt;
    let graphIdSet = new Set();
    if (fs.existsSync(gPath)) {
      try {
        const g = JSON.parse(fs.readFileSync(gPath, "utf8"));
        if (g && Array.isArray(g.nodes)) {
          graphIdSet = new Set(g.nodes.map(n => n && n.id).filter(Boolean));
        }
      } catch { /* graph corrupt — flush will surface graph_parse_failed */ }
    }
    dup = isDuplicate(entry.id, qr.entries, graphIdSet);
  } catch (e) {
    emit({ ok: false, error: `idempotency_check_failed: ${e.message}` }, useJson);
    return 2;
  }

  let enqueued = 0;
  if (!dup) {
    try {
      appendQueue(qPath, entry);
      enqueued = 1;
    } catch (e) {
      emit({ ok: false, error: `enqueue_failed: ${e.message}` }, useJson);
      return 2;
    }
  }

  // Decide whether to flush.
  const envFlushRaw = process.env.PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS;
  let flushInterval = FLUSH_INTERVAL_MS;
  if (envFlushRaw !== undefined) {
    const parsed = Number(envFlushRaw);
    if (Number.isFinite(parsed) && parsed >= 0) flushInterval = parsed;
    // else: silently fall back; ops can see the default in --json output.
  }
  const noFlush    = args["no-flush"] === true;
  const forceFlush = args["force-flush"] === true;
  const elapsed = msSinceLastFlush(lfPath);
  const shouldFlush = !noFlush && (forceFlush || elapsed >= flushInterval);

  let flushResult = { flushed: 0, skipped: 0, corrupt: 0, queueDepth: 0 };
  if (shouldFlush) {
    if (!acquirePidLock(pPath)) {
      const qr = readQueue(qPath);
      emit({ ok: true, enqueued, duplicate: dup, flushed: 0, skipped: 0, corrupt: preReadCorrupt + qr.corrupt, queueDepth: qr.entries.length, note: "skipped-flush-lock-held", id: entry.id, label: entry.label }, useJson);
      return 0;
    }
    try { flushResult = flushQueue({ gPath, qPath, lfPath }); }
    catch (e) {
      releasePidLock(pPath);
      emit({ ok: false, enqueued, error: `flush_failed: ${e.message}` }, useJson);
      return 2;
    }
    releasePidLock(pPath);
  } else {
    const qr = readQueue(qPath);
    flushResult.queueDepth = qr.entries.length;
    flushResult.corrupt = qr.corrupt;
  }

  emit({
    ok: true,
    enqueued,
    duplicate: dup,
    flushed: flushResult.flushed,
    skipped: flushResult.skipped,
    corrupt: (preReadCorrupt + (flushResult.corrupt ?? 0)),
    queueDepth: flushResult.queueDepth,
    flushedThisRun: shouldFlush,
    elapsedMsSinceLastFlush: elapsed === Infinity ? null : elapsed,
    error: flushResult.error,
    id: entry.id,
    label: entry.label,
  }, useJson);
  return 0;
}

if (isMainModule()) {
  // Top-level fire-and-forget entrypoint — explicit `void` to mark intent;
  // the .catch already handles every failure path via process.exit(2).
  void main().then(code => process.exit(code)).catch(e => {
    console.error(JSON.stringify({ ok: false, error: e.message }));
    process.exit(2);
  });
}
