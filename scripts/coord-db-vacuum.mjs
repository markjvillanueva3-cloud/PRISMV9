#!/usr/bin/env node
/**
 * coord-db-vacuum.mjs — CLEANUP-MS0 / U-CLEANUP-G17
 *
 * Weekly maintenance for state/shared/coordination.db (the SQLite WAL-mode
 * coordination store from HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE). Without
 * periodic compaction, the WAL grows unbounded (every claim/release/heartbeat
 * appends a frame) and the main DB file fragments after many overwrite cycles.
 *
 * Operations (in order):
 *   1. record size of main DB + sidecar WAL + SHM files
 *   2. PRAGMA wal_checkpoint(TRUNCATE) — flush all WAL frames into the main
 *      DB and shrink the WAL file to zero bytes
 *   3. VACUUM — rewrite the main DB into a fresh fully-packed file
 *   4. record post-op sizes
 *   5. append a row to coord-db-health.json (JSONL, append-only) with
 *      { ts, ok, before:{db,wal,shm}, after:{db,wal,shm}, delta, durationMs,
 *        checkpoint:{busy,log,checkpointed}, dbPath }
 *
 * Failure mode: never throws to the caller. Disk errors / SQLite errors are
 * captured as a row with ok=false; the scheduled task exits 0 so Windows
 * Task Scheduler doesn't keep retrying — the operator reviews the log file.
 *
 * CLI:
 *   node scripts/coord-db-vacuum.mjs
 *     [--db <path>]            default: H:/prism/state/shared/coordination.db
 *     [--health-log <path>]    default: H:/prism/state/shared/coord-db-health.json
 *     [--dry-run]              compute size before, skip vacuum, return plan
 *     [--json]                 emit JSON to stdout instead of a single line
 *
 * Exit codes:
 *   0 — always (telemetry is best-effort; do NOT retry on failure)
 *
 * @see CoordinationStoreEngine (H:/prism/mcp-server/src/engines/CoordinationStoreEngine.ts)
 * @see U-CLEANUP-G17 (envelope was not_started)
 */

import { existsSync, statSync, appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";

const DEFAULT_DB = "H:/prism/state/shared/coordination.db";
const DEFAULT_HEALTH_LOG = "H:/prism/state/shared/coord-db-health.json";
const SCHEMA_VERSION = 1;
const DEFAULT_HEALTH_TAIL = 50;
const MAX_HEALTH_TAIL = 10_000;

export function parseArgs(argv) {
  const out = {
    db: DEFAULT_DB,
    healthLog: DEFAULT_HEALTH_LOG,
    dryRun: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--db" && argv[i + 1]) out.db = argv[++i];
    else if (a === "--health-log" && argv[i + 1]) out.healthLog = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

/**
 * Returns the byte-size of a file, or null if it doesn't exist. Never throws.
 * @param {string} p
 * @returns {number|null}
 */
export function safeSize(p) {
  if (!existsSync(p)) return null;
  try { return statSync(p).size; }
  catch { return null; }
}

/**
 * Capture sizes of the main DB and its WAL/SHM sidecars.
 *
 * @param {string} dbPath
 * @returns {{db: number|null, wal: number|null, shm: number|null}}
 */
export function captureSizes(dbPath) {
  return {
    db: safeSize(dbPath),
    wal: safeSize(`${dbPath}-wal`),
    shm: safeSize(`${dbPath}-shm`),
  };
}

/**
 * Compute the byte-delta between before/after size snapshots. A negative
 * delta means we reclaimed space (the expected outcome of a successful
 * checkpoint+vacuum).
 *
 * @param {{db:number|null,wal:number|null,shm:number|null}} before
 * @param {{db:number|null,wal:number|null,shm:number|null}} after
 * @returns {{db: number, wal: number, shm: number, total: number}}
 */
export function sizeDelta(before, after) {
  const d = (b, a) => (a ?? 0) - (b ?? 0);
  const db = d(before.db, after.db);
  const wal = d(before.wal, after.wal);
  const shm = d(before.shm, after.shm);
  return { db, wal, shm, total: db + wal + shm };
}

/**
 * Open the SQLite DB and run checkpoint+vacuum. Returns a structured result
 * that the caller can persist; never throws on SQLite errors.
 *
 * `dbFactory` is the injection seam — defaults to better-sqlite3 loaded via
 * createRequire (so tests can pass a fake without monkey-patching the
 * module cache).
 *
 * @param {string} dbPath
 * @param {object} [opts]
 * @param {function} [opts.dbFactory]  (path) => Database instance
 * @returns {{ok: boolean, checkpoint: {busy:number, log:number, checkpointed:number}|null, vacuum: boolean, error: string|null}}
 */
export function runMaintenance(dbPath, opts = {}) {
  const dbFactory = opts.dbFactory || (() => {
    const require = createRequire(import.meta.url);
    const Database = require("better-sqlite3");
    return new Database(dbPath);
  });

  let db;
  try { db = dbFactory(dbPath); }
  catch (e) {
    return { ok: false, checkpoint: null, vacuum: false, error: `open-failed: ${e.message}` };
  }

  let checkpoint = null;
  try {
    // pragma() in better-sqlite3 returns an array of row objects.
    const rows = db.pragma("wal_checkpoint(TRUNCATE)");
    if (Array.isArray(rows) && rows[0]) {
      checkpoint = {
        busy: Number(rows[0].busy ?? 0),
        log: Number(rows[0].log ?? 0),
        checkpointed: Number(rows[0].checkpointed ?? 0),
      };
    } else {
      checkpoint = { busy: 0, log: 0, checkpointed: 0 };
    }
  } catch (e) {
    safeClose(db);
    return { ok: false, checkpoint: null, vacuum: false, error: `checkpoint-failed: ${e.message}` };
  }

  try {
    // VACUUM rewrites the DB; cannot run inside a transaction.
    db.exec("VACUUM");
  } catch (e) {
    safeClose(db);
    return { ok: false, checkpoint, vacuum: false, error: `vacuum-failed: ${e.message}` };
  }

  safeClose(db);
  return { ok: true, checkpoint, vacuum: true, error: null };
}

function safeClose(db) {
  try { db.close(); } catch { /* tolerate */ }
}

/**
 * Append a structured health-log row to the JSONL file. Tolerant of a
 * missing parent dir. Never throws.
 *
 * @param {string} logPath
 * @param {object} row
 */
export function appendHealthRow(logPath, row) {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify(row) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Orchestrate: capture before → maintain → capture after → log row.
 *
 * @param {ReturnType<typeof parseArgs>} opts
 * @param {object} [hooks]
 * @param {function} [hooks.dbFactory]    test seam for runMaintenance
 * @param {function} [hooks.now]          test seam for timestamp
 * @param {function} [hooks.appendFn]     test seam for log append
 * @returns {object} JSON-shaped result row
 */
export function performVacuum(opts, hooks = {}) {
  const now = hooks.now || (() => new Date().toISOString());
  const appendFn = hooks.appendFn || appendHealthRow;
  const startWall = Date.now();
  const ts = now();
  const before = captureSizes(opts.db);

  // Missing DB → log row, exit clean.
  if (before.db === null) {
    const row = {
      schemaVersion: SCHEMA_VERSION, ts, ok: false, dbPath: opts.db,
      before, after: before, delta: { db: 0, wal: 0, shm: 0, total: 0 },
      durationMs: Date.now() - startWall,
      checkpoint: null, vacuum: false, dryRun: !!opts.dryRun,
      error: "db-missing",
    };
    appendFn(opts.healthLog, row);
    return row;
  }

  if (opts.dryRun) {
    const row = {
      schemaVersion: SCHEMA_VERSION, ts, ok: true, dbPath: opts.db,
      before, after: before, delta: { db: 0, wal: 0, shm: 0, total: 0 },
      durationMs: Date.now() - startWall,
      checkpoint: null, vacuum: false, dryRun: true, error: null,
    };
    appendFn(opts.healthLog, row);
    return row;
  }

  const main = runMaintenance(opts.db, { dbFactory: hooks.dbFactory });
  const after = captureSizes(opts.db);
  const row = {
    schemaVersion: SCHEMA_VERSION, ts, ok: main.ok, dbPath: opts.db,
    before, after, delta: sizeDelta(before, after),
    durationMs: Date.now() - startWall,
    checkpoint: main.checkpoint, vacuum: main.vacuum,
    dryRun: false, error: main.error,
  };
  appendFn(opts.healthLog, row);
  return row;
}

/**
 * Read the last N rows of the JSONL log. Used by `--summary` (future) or by
 * downstream dashboards.
 *
 * @param {string} logPath
 * @param {number} [limit]   Default 50; cap at 10_000.
 * @returns {Array<object>}
 */
export function readRecentHealthRows(logPath, limit = DEFAULT_HEALTH_TAIL) {
  if (!existsSync(logPath)) return [];
  const cap = Math.min(Math.max(limit, 0), MAX_HEALTH_TAIL);
  let raw;
  try { raw = readFileSync(logPath, "utf-8"); }
  catch { return []; }
  const lines = raw.split("\n").filter(Boolean);
  const slice = lines.slice(-cap);
  const out = [];
  for (const ln of slice) {
    try { out.push(JSON.parse(ln)); }
    catch { /* tolerate */ }
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const row = performVacuum(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(row, null, 2) + "\n");
  } else {
    const d = row.delta || { total: 0 };
    const ok = row.ok ? "OK" : "FAIL";
    const note = row.error ? ` (${row.error})` : "";
    process.stdout.write(
      `coord-db-vacuum ${ok}  before=${row.before.db ?? "-"}B  after=${row.after.db ?? "-"}B  ` +
      `delta=${d.total}B  ${row.durationMs}ms${note}\n`,
    );
  }
  process.exit(0); // never retry — operator triages from health log
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("coord-db-vacuum.mjs")) main();
