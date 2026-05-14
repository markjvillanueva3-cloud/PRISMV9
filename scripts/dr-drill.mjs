#!/usr/bin/env node
/**
 * dr-drill.mjs — CLEANUP-MS0 / U-CLEANUP-G14
 *
 * MONTHLY disaster-recovery drill: restore the latest G12 golf-state snapshot
 * to `H:/prism-dr-test/restore/`, verify the restored `coordination.db` is
 * intact, and check row-count parity against the manifest's recorded
 * `bug_attribution` row count. Every drill — pass or fail — appends one
 * JSONL line to `state/shared/DR_DRILL_LEDGER.jsonl` so the operator can see
 * the trailing-12-months history at a glance.
 *
 * Fail-loud doctrine: a missing snapshot, a corrupted db, a row-count
 * mismatch, or any I/O error → exit 1, ledger row records the specific
 * failure category. A drill that "completed" but couldn't open the db is a
 * FAIL, not a PASS-with-warnings.
 *
 * What it does NOT do: it does not call back into the live MCP runtime.
 * `coord_sqlite health` is approximated locally with `PRAGMA integrity_check`
 * + `PRAGMA quick_check` + a direct row count — DR drills should not depend
 * on the very subsystem they're validating being up. This mirrors G12's
 * choice to lazy-import `better-sqlite3` rather than route through dispatchers.
 *
 * Idempotency / safety:
 *   - `--dry-run` plans every step (which snapshot would be picked, target
 *     restore dir, ledger row that would be written) without any writes.
 *   - The restore dir is wiped and recreated on every apply run (the drill is
 *     destructive against `H:/prism-dr-test/restore/` by design).
 *   - `--now <ISO>` overrides the clock for hermetic tests + repeatable ledgers.
 *
 * Cadence: monthly, via scripts/system-health/32-dr-drill.ps1.
 *
 * Usage:
 *   node scripts/dr-drill.mjs                              # apply
 *   node scripts/dr-drill.mjs --dry-run                    # plan only
 *   node scripts/dr-drill.mjs --json                       # machine-readable
 *   node scripts/dr-drill.mjs --backup D --restore-dir D2  # path overrides
 *   node scripts/dr-drill.mjs --snapshot <dir>             # pick a specific snapshot
 *   node scripts/dr-drill.mjs --now 2026-05-14T00:00:00.000Z
 *
 * Exit codes: 0 = drill PASS (or dry-run), 1 = drill FAIL (any failure mode).
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem G.G14)
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G14)
 * Sister: scripts/golf-state-snapshot.mjs (G12, produces the snapshots G14 restores).
 */

import {
  existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync,
  readFileSync, appendFileSync,
} from "node:fs";
import { join, dirname, resolve, isAbsolute, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ─── Configuration ───────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_BACKUP = "H:/prism-backups/golf-state";
const DEFAULT_RESTORE_DIR = "H:/prism-dr-test/restore";
const DEFAULT_LEDGER_REL = "state/shared/DR_DRILL_LEDGER.jsonl";
const SCHEMA_VERSION = 1;

// Read-only sqlite busy timeout: 5 s. Drills should never contend (the live
// db is at state/shared/coordination.db, we open the *restored* copy in a
// scratch dir), but the pragma is cheap insurance against a tester or peer
// briefly touching the restored file mid-validation.
const BUSY_TIMEOUT_MS = 5000;

// Snapshot files G12 produces. The drill checks `REQUIRED_RESTORE_FILES`
// are present after the copy step — a missing required file is a FAIL
// (failureCategory: "restore"). Files in `OPTIONAL_RESTORE_FILES` may be
// absent from a snapshot without failing the drill (G12 records source-missing
// or dump-degraded as `skipped`, not a hard failure). HOWEVER: a *copy error*
// on any file (required or optional) — including ENOSPC, EACCES — still fails
// the drill via `restoreSnapshot()`'s `result.errors[]` accrual. "Optional"
// is about the file being absent at the source, not about copy failures.
const REQUIRED_RESTORE_FILES = ["coordination.db", "manifest.json"];
const OPTIONAL_RESTORE_FILES = [
  "golf-owned-paths.json",
  "golf-cron-registry.json",
  "golf-token-budget.json",
  "bug_attribution.jsonl",
];

const DUMP_TABLE = "bug_attribution";

// Failure-category enum. Every drill that FAILs sets exactly one of these.
// Mutually exclusive; the orchestrator picks the most specific match. The
// ledger row's `failureCategory` field uses these strings verbatim — operators
// `jq 'select(.failureCategory == "row-parity")'` for triage.
const FAILURE_CATEGORIES = Object.freeze({
  NOW_INVALID:         "now-invalid",         // bad --now arg
  NO_SNAPSHOT:         "no-snapshot",         // no snapshot dir found / --snapshot path missing
  MANIFEST:            "manifest",            // manifest.json missing / unreadable / malformed
  RESTORE:             "restore",             // copy failed OR required file missing post-copy
  DB_INTEGRITY:        "db-integrity",        // PRAGMA integrity_check returned not-"ok"
  DB_QUICK_CHECK:      "db-quick-check",      // PRAGMA quick_check returned not-"ok" (integrity was "ok")
  PARITY_TABLE_MISSING: "parity-table-missing", // manifest claimed N rows; bug_attribution table absent/uncountable
  ROW_PARITY:          "row-parity",          // table present but row count != manifest
});

// Max errors[] entries to record in a single ledger row. A pathological
// failure (e.g. ENOSPC during restore of a snapshot with 1000 files) would
// otherwise produce a >100KB JSONL line; the trailing-12-months `jq` filter
// needs the ledger to stay scannable.
const LEDGER_ERROR_CAP = 20;

// Reserved-path roots: --restore-dir pointing into any of these is refused.
// rmSync(restoreDir, {recursive:true, force:true}) is the first thing
// restoreSnapshot does on an apply run; an operator typo like
// `--restore-dir C:/Windows/System32` would otherwise be catastrophic.
// The list is conservative — add to it, never remove. Comparison is
// case-insensitive prefix on the normalized absolute path.
const RESERVED_RESTORE_ROOTS = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\Users",
  "/usr",
  "/etc",
  "/var",
  "/bin",
  "/sbin",
  "/lib",
  "/boot",
  "/root",
  "/home",
];

// better-sqlite3 entrypoint — same path as G12 uses. Lazy-imported so tests
// inject a synthetic Database constructor via hooks.databaseFactory.
const DEFAULT_SQLITE_MODULE = resolve(
  __dirname, "..", "mcp-server", "node_modules", "better-sqlite3", "lib", "index.js",
);

// ─── Pure helpers (exported for tests) ───────────────────────────────────

/**
 * Reverse of G12's fsSafeIso → a Date, or null if the name is not a snapshot
 * dir. Duplicates the parser in golf-state-snapshot.mjs intentionally — a DR
 * drill that depends on importing its production sibling adds a coupling that
 * defeats the point of the drill (if G12's module is broken, the drill should
 * still be able to read what it produced).
 */
export function parseSnapshotDirName(name) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{1,3})Z$/.exec(name);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5].padEnd(3, "0")}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function parseArgs(argv) {
  const out = {
    repo: DEFAULT_REPO,
    backup: DEFAULT_BACKUP,
    restoreDir: DEFAULT_RESTORE_DIR,
    ledger: null, // resolved against repo in drDrill() if null
    snapshot: null, // null = pick latest
    now: null, // null = real clock
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo" && argv[i + 1]) out.repo = argv[++i];
    else if (a === "--backup" && argv[i + 1]) out.backup = argv[++i];
    else if (a === "--restore-dir" && argv[i + 1]) out.restoreDir = argv[++i];
    else if (a === "--ledger" && argv[i + 1]) out.ledger = argv[++i];
    else if (a === "--snapshot" && argv[i + 1]) out.snapshot = argv[++i];
    else if (a === "--now" && argv[i + 1]) out.now = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

/**
 * Scan `backupRoot` for snapshot dirs (names parseable by
 * parseSnapshotDirName), return them sorted newest-first with their parsed
 * Date. Non-snapshot entries are silently ignored (they're left for the
 * G12 prune logic to handle).
 */
export function listSnapshots(backupRoot) {
  if (!existsSync(backupRoot)) return [];
  let entries;
  try { entries = readdirSync(backupRoot, { withFileTypes: true }); }
  catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const d = parseSnapshotDirName(e.name);
    if (!d) continue;
    out.push({ name: e.name, path: join(backupRoot, e.name), date: d });
  }
  out.sort((a, b) => b.date.getTime() - a.date.getTime());
  return out;
}

export function findLatestSnapshot(backupRoot) {
  const list = listSnapshots(backupRoot);
  return list.length ? list[0] : null;
}

/**
 * Refuse a `--restore-dir` value that resolves under any reserved system
 * root. Returns { ok: true } or { ok: false, reason }. Path comparison is
 * case-insensitive (Windows) prefix on the resolved absolute path.
 * Exported for direct testing.
 */
export function isRestorePathSafe(restoreDir) {
  if (typeof restoreDir !== "string" || restoreDir.length === 0) {
    return { ok: false, reason: "restore-dir must be a non-empty string" };
  }
  let abs;
  try { abs = resolve(restoreDir); }
  catch (err) { return { ok: false, reason: `resolve failed: ${String(err && err.message || err)}` }; }
  const absLower = abs.toLowerCase();
  for (const root of RESERVED_RESTORE_ROOTS) {
    const rootResolved = resolve(root).toLowerCase();
    // Match either an exact equality or a true subpath (followed by separator).
    if (absLower === rootResolved) {
      return { ok: false, reason: `path equals reserved root: ${root}` };
    }
    if (absLower.startsWith(rootResolved + "\\") || absLower.startsWith(rootResolved + "/")) {
      return { ok: false, reason: `path under reserved root ${root}: ${abs}` };
    }
  }
  return { ok: true };
}

/**
 * Read + parse the manifest.json from a snapshot dir. Returns
 *   { ok: true,  manifest }
 *   { ok: false, reason }  — missing | unreadable | bad-json | missing-fields
 *
 * Manifest shape G12 emits (golf-state-snapshot.mjs writes this verbatim):
 *   {
 *     schemaVersion: 1,
 *     generatedAt:   "2026-05-14T13:53:47.123Z",
 *     copied:        ["state/shared/coordination.db", ...],   // full rel paths from G12
 *     dump:          { table: "bug_attribution", rows: 42 } | null,
 *   }
 * Note: `dump` is `null` (not `{ok:false,...}`) when G12 couldn't query the
 * source table — the raw coordination.db copy is still the full backup, so
 * G14 treats absent dump rows as parity-skipped rather than a failure.
 */
export function readManifest(snapshotDir) {
  const p = join(snapshotDir, "manifest.json");
  if (!existsSync(p)) return { ok: false, reason: "manifest.json missing" };
  let raw;
  try { raw = readFileSync(p, "utf8"); }
  catch (err) { return { ok: false, reason: `manifest.json read failed: ${String(err && err.message || err)}` }; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { return { ok: false, reason: `manifest.json bad JSON: ${String(err && err.message || err)}` }; }
  // Required fields per G12 contract.
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "manifest.json not an object" };
  }
  if (typeof parsed.schemaVersion !== "number") {
    return { ok: false, reason: "manifest.json missing schemaVersion" };
  }
  if (typeof parsed.generatedAt !== "string") {
    return { ok: false, reason: "manifest.json missing generatedAt" };
  }
  if (!Array.isArray(parsed.copied)) {
    return { ok: false, reason: "manifest.json missing copied[]" };
  }
  return { ok: true, manifest: parsed };
}

/**
 * Wipe + recreate `restoreDir`, then copy every file from `snapshotDir`
 * into it (flat — G12 writes flat, restore stays flat). Returns
 *   { copied: [{name, bytes}], skipped: [{name, reason}], errors: [] }
 *
 * NOT-RECURSIVE: the snapshot is intentionally flat. Subdirectories under
 * the snapshot dir (none today, but a future schemaVersion might) would be
 * skipped with `reason: "directory-skip"` rather than silently descended.
 */
export function restoreSnapshot(snapshotDir, restoreDir, opts = {}) {
  const result = { copied: [], skipped: [], errors: [] };
  if (!existsSync(snapshotDir)) {
    result.errors.push(`snapshotDir does not exist: ${snapshotDir}`);
    return result;
  }
  if (!opts.dryRun) {
    try {
      rmSync(restoreDir, { recursive: true, force: true });
      mkdirSync(restoreDir, { recursive: true });
    } catch (err) {
      result.errors.push(`prepare restoreDir ${restoreDir}: ${String(err && err.message || err)}`);
      return result;
    }
  }
  let entries;
  try { entries = readdirSync(snapshotDir, { withFileTypes: true }); }
  catch (err) {
    result.errors.push(`readdir ${snapshotDir}: ${String(err && err.message || err)}`);
    return result;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      result.skipped.push({ name: e.name, reason: "directory-skip" });
      continue;
    }
    if (!e.isFile()) {
      result.skipped.push({ name: e.name, reason: "non-file" });
      continue;
    }
    const src = join(snapshotDir, e.name);
    const dst = join(restoreDir, e.name);
    let bytes = 0;
    try { bytes = statSync(src).size; } catch { /* best-effort */ }
    if (opts.dryRun) {
      result.copied.push({ name: e.name, bytes, dryRun: true });
      continue;
    }
    try {
      copyFileSync(src, dst);
      result.copied.push({ name: e.name, bytes });
    } catch (err) {
      result.errors.push(`copy ${e.name}: ${String(err && err.message || err)}`);
    }
  }
  return result;
}

// ─── DB validation (better-sqlite3, lazy + injectable) ───────────────────

/**
 * Open the restored coordination.db read-only and run the DR drill's
 * "coord_sqlite health" equivalent locally:
 *   - PRAGMA integrity_check     (full-corruption scan)
 *   - PRAGMA quick_check         (cheaper sanity scan; both should return "ok")
 *   - SELECT COUNT(*) FROM bug_attribution (parity vs manifest)
 *
 * Returns:
 *   { ok, integrity, quickCheck, rowCount, expectedRows, parity, errors[] }
 *
 * `expectedRows = null` when the manifest didn't include a dump (G12 marks
 * dump:null when the source table wasn't queryable) — in that case
 * `parity = "skipped"` rather than a FAIL. Mirrors G12's "tolerate missing
 * dump" stance: the raw db copy is still the backup.
 */
export async function validateRestoredDb(dbPath, expectedRows, hooks = {}) {
  const result = {
    ok: false,
    integrity: null,
    quickCheck: null,
    rowCount: null,
    expectedRows: expectedRows == null ? null : Number(expectedRows),
    parity: expectedRows == null ? "skipped" : null,
    errors: [],
  };

  if (!existsSync(dbPath)) {
    result.errors.push(`db missing: ${dbPath}`);
    return result;
  }
  let st;
  try { st = statSync(dbPath); }
  catch (err) {
    result.errors.push(`stat failed: ${String(err && err.message || err)}`);
    return result;
  }
  if (st.size === 0) {
    result.errors.push("db is zero-bytes");
    return result;
  }

  let Database;
  try {
    if (hooks.databaseFactory) {
      Database = hooks.databaseFactory;
    } else {
      const mod = hooks.sqliteModule || DEFAULT_SQLITE_MODULE;
      const target = isAbsolute(mod) ? pathToFileURL(mod).href : mod;
      const imported = await import(target);
      Database = imported.default || imported;
    }
  } catch (err) {
    result.errors.push(`sqlite module load failed: ${String(err && err.message || err)}`);
    return result;
  }

  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try { db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`); } catch { /* best-effort */ }

    // integrity_check / quick_check — on a healthy DB both return exactly
    // one row `[{integrity_check:"ok"}]` / `[{quick_check:"ok"}]`. On a
    // corrupt DB SQLite returns ONE ROW PER DEFECT — extractPragmaResult
    // surfaces all of them as additional errors[] entries so a forensic
    // operator scanning the ledger sees the full picture, not just the
    // first problem.
    try {
      const rows = db.pragma("integrity_check");
      const ext = extractPragmaResult(rows, "integrity_check");
      result.integrity = ext.scalar;
      if (ext.extraProblems.length > 0) {
        result.errors.push(
          `integrity_check returned ${rows.length} rows; additional: ${ext.extraProblems.slice(0, 5).join(" | ")}`,
        );
      }
    } catch (err) {
      result.errors.push(`integrity_check failed: ${String(err && err.message || err)}`);
    }
    try {
      const rows = db.pragma("quick_check");
      const ext = extractPragmaResult(rows, "quick_check");
      result.quickCheck = ext.scalar;
      if (ext.extraProblems.length > 0) {
        result.errors.push(
          `quick_check returned ${rows.length} rows; additional: ${ext.extraProblems.slice(0, 5).join(" | ")}`,
        );
      }
    } catch (err) {
      result.errors.push(`quick_check failed: ${String(err && err.message || err)}`);
    }

    // Row count — always run for observability. If `expectedRows` is null
    // (manifest had no dump), we still record `rowCount` so an operator
    // tailing the ledger sees how big the table was at restore time —
    // useful trending data even when there's nothing to parity-check.
    // If the table is genuinely missing AND the manifest expected rows,
    // that's a `parity-table-missing` FAIL.
    let countFailed = false;
    try {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${DUMP_TABLE}`).get();
      const n = row && typeof row.n === "number" ? row.n : Number(row && row.n);
      result.rowCount = Number.isFinite(n) ? n : null;
      if (result.rowCount == null) countFailed = true;
    } catch (err) {
      // Table missing / uncountable. Only logged as an error when the
      // manifest claimed it had rows; otherwise it's a benign skip.
      countFailed = true;
      if (expectedRows != null) {
        result.errors.push(`count ${DUMP_TABLE} failed: ${String(err && err.message || err)}`);
      }
    }
    if (expectedRows != null) {
      if (countFailed) {
        result.parity = "fail";
      } else if (result.rowCount === Number(expectedRows)) {
        result.parity = "ok";
      } else {
        result.parity = "mismatch";
        result.errors.push(
          `row-count mismatch: manifest=${expectedRows} restored=${result.rowCount}`,
        );
      }
    }
  } catch (err) {
    result.errors.push(`sqlite open failed: ${String(err && err.message || err)}`);
  } finally {
    try { if (db) db.close(); } catch { /* best-effort */ }
  }

  // PASS criterion: both pragmas returned "ok", and parity is ok|skipped, and
  // no errors accrued. Anything else is FAIL.
  result.ok = (
    result.integrity === "ok" &&
    result.quickCheck === "ok" &&
    (result.parity === "ok" || result.parity === "skipped") &&
    result.errors.length === 0
  );
  return result;
}

/**
 * Extract the verdict scalar from a `db.pragma()` result, plus surface every
 * additional problem row a corrupt-DB scan would return. The first row's
 * value under the expected key is the verdict; rows 2..N are extra problems
 * the caller can append to errors[] for forensic value.
 *
 * For a healthy DB: returns { scalar: "ok", extraProblems: [] }.
 * For a 3-defect corrupt DB: returns
 *   { scalar: "row 5 missing from index", extraProblems: ["row 7...", "row 9..."] }
 * so `scalar !== "ok"` correctly FAILs the gate AND the operator gets all
 * three defects in the ledger row.
 *
 * `expectedKey` is the named column the pragma returns under (e.g.
 * "integrity_check"). Falls back to the first key of the row if the column
 * isn't named as expected — defensive against better-sqlite3 future changes.
 */
export function extractPragmaResult(rows, expectedKey) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { scalar: null, extraProblems: [] };
  }
  const readScalar = (r) => {
    if (r == null) return null;
    if (typeof r === "string" || typeof r === "number") return r;
    if (typeof r === "object") {
      if (expectedKey != null && Object.prototype.hasOwnProperty.call(r, expectedKey)) {
        return r[expectedKey];
      }
      const keys = Object.keys(r);
      return keys.length > 0 ? r[keys[0]] : null;
    }
    return null;
  };
  const scalar = readScalar(rows[0]);
  const extraProblems = [];
  for (let i = 1; i < rows.length; i++) {
    const v = readScalar(rows[i]);
    if (v != null) extraProblems.push(String(v));
  }
  return { scalar, extraProblems };
}

// ─── Ledger append ───────────────────────────────────────────────────────

/**
 * Append one JSONL line to `ledgerPath`. Creates parent dirs / the file
 * itself on first call.
 *
 * SINGLE-WRITER ASSUMPTION: the contract for this ledger is one writer
 * per host (monthly cron + occasional manual invocation, never concurrent).
 * On POSIX, `appendFileSync` is atomic for writes ≤ PIPE_BUF (4 KB). On
 * Windows, no such guarantee exists — a concurrent writer could produce a
 * torn line. The cron schedule (one monthly tick at a fixed wall-clock
 * minute) means contention is structurally impossible in normal operation;
 * a manually-triggered drill that races the cron is the only theoretical
 * conflict, and the operator is the human doing both, so the conflict is
 * self-evident. Do NOT extend this writer to a multi-host or multi-cron
 * configuration without adding a lockfile.
 */
export function appendLedger(ledgerPath, entry, hooks = {}) {
  const parent = dirname(ledgerPath);
  try { mkdirSync(parent, { recursive: true }); } catch { /* best-effort */ }
  const line = JSON.stringify(entry) + "\n";
  if (hooks.appendFn) {
    hooks.appendFn(ledgerPath, line);
    return;
  }
  appendFileSync(ledgerPath, line);
}

// ─── Core orchestrator ───────────────────────────────────────────────────

/**
 * Single drill run. Never throws — every failure accrues into
 * `result.errors` and the ledger row records the failure category.
 * Test seams via `hooks`:
 *   hooks.now             — Date|ISO override
 *   hooks.databaseFactory — synthetic better-sqlite3 Database constructor
 *   hooks.sqliteModule    — override the better-sqlite3 module path
 *   hooks.appendFn        — replace JSONL append for tests
 */
export async function drDrill(opts, hooks = {}) {
  const nowDate = hooks.now != null ? new Date(hooks.now)
    : opts.now != null ? new Date(opts.now)
      : new Date();
  const nowMs = nowDate.getTime();

  const ledgerPath = opts.ledger || join(opts.repo, DEFAULT_LEDGER_REL);

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: false,
    drilledAt: Number.isFinite(nowMs) ? nowDate.toISOString() : null,
    backupRoot: opts.backup,
    snapshotDir: null,
    snapshotName: null,
    snapshotGeneratedAt: null,
    restoreDir: opts.restoreDir,
    dryRun: !!opts.dryRun,
    manifest: null,
    restore: null,
    validation: null,
    failureCategory: null, // null on PASS, else one of FAILURE_CATEGORIES.* — see enum near top of file
    errors: [],
  };

  if (!Number.isFinite(nowMs)) {
    result.failureCategory = FAILURE_CATEGORIES.NOW_INVALID;
    result.errors.push(`invalid --now value: ${opts.now ?? hooks.now}`);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }

  // 0. Path-safety check on --restore-dir. The first thing restoreSnapshot
  // does on an apply run is `rmSync(restoreDir, {recursive:true,force:true})`
  // — refuse a path under any RESERVED_RESTORE_ROOTS so a typo can't wipe a
  // system directory.
  const restoreSafety = isRestorePathSafe(opts.restoreDir);
  if (!restoreSafety.ok) {
    result.failureCategory = FAILURE_CATEGORIES.RESTORE;
    result.errors.push(`--restore-dir refused: ${restoreSafety.reason}`);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }

  // 1. Pick the snapshot — either explicit --snapshot, or latest in backup root.
  let snapshot;
  if (opts.snapshot) {
    if (!existsSync(opts.snapshot)) {
      result.failureCategory = FAILURE_CATEGORIES.NO_SNAPSHOT;
      result.errors.push(`--snapshot does not exist: ${opts.snapshot}`);
      writeLedgerRow(ledgerPath, result, hooks);
      return result;
    }
    snapshot = {
      name: basename(opts.snapshot),
      path: opts.snapshot,
      date: parseSnapshotDirName(basename(opts.snapshot)) || null,
    };
  } else {
    snapshot = findLatestSnapshot(opts.backup);
    if (!snapshot) {
      result.failureCategory = FAILURE_CATEGORIES.NO_SNAPSHOT;
      result.errors.push(`no snapshots found in ${opts.backup}`);
      writeLedgerRow(ledgerPath, result, hooks);
      return result;
    }
  }
  result.snapshotDir = snapshot.path;
  result.snapshotName = snapshot.name;

  // 2. Read manifest.
  const manifestResult = readManifest(snapshot.path);
  if (!manifestResult.ok) {
    result.failureCategory = FAILURE_CATEGORIES.MANIFEST;
    result.errors.push(manifestResult.reason);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }
  result.manifest = manifestResult.manifest;
  result.snapshotGeneratedAt = manifestResult.manifest.generatedAt || null;
  // G12 emits dump as `{table, rows}` on success or `null` on degraded.
  // `Number.isFinite` guards against `NaN` / `Infinity` / non-numeric `rows`
  // (which would produce confusing "manifest=NaN" parity errors downstream).
  const dump = manifestResult.manifest.dump;
  const expectedRows = (dump && typeof dump === "object"
    && Number.isFinite(dump.rows) && dump.rows >= 0)
    ? dump.rows
    : null;
  if (dump && typeof dump === "object" && !Number.isFinite(dump.rows)) {
    // Manifest has a dump field but rows isn't a finite count — manifest is
    // malformed. Surface as MANIFEST failure rather than letting it slip
    // through as a row-parity false-negative.
    result.failureCategory = FAILURE_CATEGORIES.MANIFEST;
    result.errors.push(`manifest dump.rows is not a finite count: ${JSON.stringify(dump.rows)}`);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }

  // 3. Restore.
  const restore = restoreSnapshot(snapshot.path, opts.restoreDir, { dryRun: opts.dryRun });
  result.restore = restore;
  if (restore.errors.length > 0) {
    result.failureCategory = FAILURE_CATEGORIES.RESTORE;
    for (const e of restore.errors) result.errors.push(e);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }
  // Required files must be present in the restored set (or have been
  // dry-run-planned). `restoreSnapshot` populates `copied[]` from
  // `readdirSync(snapshotDir)` — flat basenames. Since the copy is
  // flat-same-name (snapshot/X → restoreDir/X), a basename present in
  // `restore.copied` is also present in `restoreDir` (or would be on apply).
  const restoredNames = new Set(restore.copied.map((c) => c.name));
  const missingRequired = [];
  for (const req of REQUIRED_RESTORE_FILES) {
    if (!restoredNames.has(req)) missingRequired.push(req);
  }
  if (missingRequired.length > 0) {
    result.failureCategory = FAILURE_CATEGORIES.RESTORE;
    for (const m of missingRequired) {
      result.errors.push(`required file not in restore: ${m}`);
    }
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }
  // Observability cross-check: the manifest's `copied[]` is the producer's
  // claim of what's in the snapshot. Surface any drift (files the manifest
  // promised but are now absent post-restore) as warnings — they don't FAIL
  // the drill on their own (REQUIRED check above is the gate), but they
  // belong in the ledger so external tampering / partial deletion is visible.
  if (Array.isArray(result.manifest.copied)) {
    for (const relPath of result.manifest.copied) {
      const bn = basename(String(relPath || ""));
      if (bn && !restoredNames.has(bn)) {
        result.errors.push(`manifest claimed copied[${relPath}] but file absent post-restore`);
      }
    }
  }

  // 4. Validate the restored db. In dry-run we skip the heavy validation —
  // the restore plan is what we're previewing.
  if (opts.dryRun) {
    result.validation = { ok: true, dryRun: true };
    result.ok = true;
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }
  const dbPath = join(opts.restoreDir, "coordination.db");
  const validation = await validateRestoredDb(dbPath, expectedRows, hooks);
  result.validation = validation;
  if (!validation.ok) {
    // Mutually-exclusive failure-category mapping. Order matters: integrity
    // is the headline check, then quick-check, then parity. A DB with both
    // corruption AND row-parity drift fails on the corruption (db-integrity)
    // — the parity check on a corrupt DB isn't trustworthy anyway.
    if (validation.integrity !== "ok") {
      result.failureCategory = FAILURE_CATEGORIES.DB_INTEGRITY;
    } else if (validation.quickCheck !== "ok") {
      result.failureCategory = FAILURE_CATEGORIES.DB_QUICK_CHECK;
    } else if (validation.parity === "fail") {
      result.failureCategory = FAILURE_CATEGORIES.PARITY_TABLE_MISSING;
    } else if (validation.parity === "mismatch") {
      result.failureCategory = FAILURE_CATEGORIES.ROW_PARITY;
    } else {
      // Defensive: validation.ok===false but no specific category matched.
      // Should be unreachable but guard against a future check returning
      // !ok without setting one of the above flags.
      result.failureCategory = FAILURE_CATEGORIES.DB_INTEGRITY;
    }
    for (const e of validation.errors) result.errors.push(e);
    writeLedgerRow(ledgerPath, result, hooks);
    return result;
  }

  // 5. PASS.
  result.ok = true;
  writeLedgerRow(ledgerPath, result, hooks);
  return result;
}

function writeLedgerRow(ledgerPath, result, hooks) {
  // Dry-run by default does NOT write to the ledger: operators run --dry-run
  // to preview the plan, not to record the drill. Test code injects
  // `hooks.appendFn` to capture rows without touching disk; that path
  // bypasses this skip. The `--json` output of the dry-run still contains
  // the full result shape, so an operator who wants the would-be entry can
  // diff that.
  if (result.dryRun && hooks.appendFn == null) {
    return;
  }
  const entry = {
    schemaVersion: result.schemaVersion,
    drilledAt: result.drilledAt,
    ok: result.ok,
    dryRun: result.dryRun,
    snapshotName: result.snapshotName,
    snapshotGeneratedAt: result.snapshotGeneratedAt,
    backupRoot: result.backupRoot,
    restoreDir: result.restoreDir,
    failureCategory: result.failureCategory,
    integrity: result.validation && result.validation.integrity != null
      ? result.validation.integrity : null,
    quickCheck: result.validation && result.validation.quickCheck != null
      ? result.validation.quickCheck : null,
    rowCount: result.validation && result.validation.rowCount != null
      ? result.validation.rowCount : null,
    expectedRows: result.validation && result.validation.expectedRows != null
      ? result.validation.expectedRows : null,
    parity: result.validation && result.validation.parity != null
      ? result.validation.parity : null,
    copiedFiles: result.restore && result.restore.copied
      ? result.restore.copied.length : 0,
    // Cap errors[] to keep the trailing-12-months ledger scannable. A
    // pathological failure (e.g. ENOSPC on a 1000-file snapshot) would
    // otherwise produce a >100 KB single JSONL line. A truncation marker
    // tells the operator more detail lived in the original result.
    errors: result.errors.slice(0, LEDGER_ERROR_CAP).concat(
      result.errors.length > LEDGER_ERROR_CAP
        ? [`...and ${result.errors.length - LEDGER_ERROR_CAP} more (truncated)`]
        : [],
    ),
  };
  try {
    appendLedger(ledgerPath, entry, hooks);
  } catch (err) {
    // Ledger write failure is the worst kind of failure — we have nowhere to
    // log "we couldn't log". Print to stderr so the cron's stderr capture
    // picks it up; do not throw (the caller already has the result).
    const reason = err && err.message ? err.message : String(err);
    process.stderr.write(
      `dr-drill: WARNING — ledger write to ${ledgerPath} failed: ${reason}\n`,
    );
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write(
    [
      "dr-drill.mjs — monthly DR restore-drill against latest G12 snapshot (U-CLEANUP-G14)",
      "",
      "Usage:",
      "  node scripts/dr-drill.mjs                          apply",
      "  node scripts/dr-drill.mjs --dry-run                plan only, no writes",
      "  node scripts/dr-drill.mjs --json                   machine-readable summary",
      "  node scripts/dr-drill.mjs --backup D --restore-dir D2 --ledger F --now ISO",
      "  node scripts/dr-drill.mjs --snapshot <dir>         pick a specific snapshot",
      "",
      "Output: ",
      `  restored to:   ${DEFAULT_RESTORE_DIR}`,
      `  ledger:        <repo>/${DEFAULT_LEDGER_REL}`,
      "",
    ].join("\n"),
  );
}

export async function run(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    printHelp();
    return 0;
  }
  const result = await drDrill(opts, {});
  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(`dr-drill: ${result.dryRun ? "dry-run" : "apply"}\n`);
    process.stdout.write(`  snapshot: ${result.snapshotName || "(none)"}\n`);
    process.stdout.write(`  restore:  ${result.restoreDir}\n`);
    if (result.validation) {
      const v = result.validation;
      if (v.dryRun) {
        process.stdout.write("  validation: skipped (dry-run)\n");
      } else {
        process.stdout.write(
          `  integrity=${v.integrity} quick=${v.quickCheck} rows=${v.rowCount}/${v.expectedRows ?? "n/a"} parity=${v.parity}\n`,
        );
      }
    }
    if (result.failureCategory) {
      process.stdout.write(`  ✗ FAIL (${result.failureCategory})\n`);
    }
    for (const e of result.errors) process.stdout.write(`  ✗ ${e}\n`);
    process.stdout.write(result.ok ? "  ✓ PASS\n" : "  ✗ DRILL FAIL\n");
  }
  return result.ok ? 0 : 1;
}

// Entry guard — exact path equality so a vitest import never execs the CLI.
const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  run().then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`dr-drill: fatal: ${err && err.message || err}\n`);
    process.exit(1);
  });
}

export {
  SCHEMA_VERSION,
  BUSY_TIMEOUT_MS,
  DEFAULT_BACKUP,
  DEFAULT_RESTORE_DIR,
  DEFAULT_LEDGER_REL,
  REQUIRED_RESTORE_FILES,
  OPTIONAL_RESTORE_FILES,
  RESERVED_RESTORE_ROOTS,
  DUMP_TABLE,
  FAILURE_CATEGORIES,
  LEDGER_ERROR_CAP,
};
