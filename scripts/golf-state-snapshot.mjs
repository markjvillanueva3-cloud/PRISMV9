#!/usr/bin/env node
/**
 * golf-state-snapshot.mjs — CLEANUP-MS0 / U-CLEANUP-G12
 *
 * Daily backup of the golf hygiene chat's durable state to
 * `H:/prism-backups/golf-state/<ISO>/`, with 30-day retention.
 *
 * What it snapshots (each best-effort — a missing source is recorded in
 * `skipped`, never a hard failure):
 *   - state/shared/coordination.db        (H8 SQLite WAL — full claim/presence store)
 *   - state/shared/golf-owned-paths.json  (G11 — the write allowlist)
 *   - state/shared/golf-cron-registry.json (E2 — golf's registered crons)
 *   - state/shared/golf-token-budget.json (golf's daily token budget)
 *   - bug_attribution SQL-dump            (the bug_attribution table from
 *     coordination.db → bug_attribution.jsonl, one row per line. Portable +
 *     diffable + restorable without the full .db. Gracefully degrades: a
 *     missing db / missing table / unloadable sqlite module is recorded in
 *     `skipped`, and the raw coordination.db copy is still the full backup.)
 *
 * Each snapshot dir also gets a `manifest.json` carrying the true ISO
 * `generatedAt` + the copy/dump result — the restore side (G14 dr-drill) reads
 * this rather than parsing the dir name.
 *
 * Retention: snapshot dirs whose timestamp is older than `--retain-days`
 * (default 30) are pruned. Dir names use a filesystem-safe ISO (`:` → `-`)
 * because Windows forbids `:` in path components; the prune logic parses the
 * name back AND cross-checks manifest.json when present.
 *
 * Idempotency / safety:
 *   - Never throws on disk I/O — errors accrue into `result.errors`.
 *   - `--dry-run` computes the full plan (copies, dump, prune) with zero writes.
 *   - `--now <ISO>` overrides the clock for hermetic tests.
 *
 * Cadence: daily, via scripts/system-health/30-golf-state-snapshot.ps1.
 *
 * Usage:
 *   node scripts/golf-state-snapshot.mjs                       # apply
 *   node scripts/golf-state-snapshot.mjs --dry-run             # plan only
 *   node scripts/golf-state-snapshot.mjs --json                # machine-readable
 *   node scripts/golf-state-snapshot.mjs --repo D --backup D2  # path overrides
 *   node scripts/golf-state-snapshot.mjs --retain-days 14
 *   node scripts/golf-state-snapshot.mjs --now 2026-05-14T00:00:00.000Z
 *
 * Exit codes: 0 = ok (or dry-run), 1 = at least one error in result.errors.
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem G.G12)
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G12)
 */

import {
  existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync, writeFileSync,
} from "node:fs";
import { join, dirname, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ─── Configuration ───────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo root derived from script location so the snapshot works from forked
// worktrees too (per the CLAUDE.md conflict-fork rule).
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_BACKUP = "H:/prism-backups/golf-state";
const DEFAULT_RETAIN_DAYS = 30;
const SCHEMA_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

// State files copied verbatim (relative to repo root). `kind` is informational.
const SOURCE_FILES = [
  { rel: "state/shared/coordination.db", kind: "sqlite" },
  { rel: "state/shared/golf-owned-paths.json", kind: "json" },
  { rel: "state/shared/golf-cron-registry.json", kind: "json" },
  { rel: "state/shared/golf-token-budget.json", kind: "json" },
];

// The table extracted as a portable JSONL dump.
const DUMP_TABLE = "bug_attribution";
const DUMP_BASENAME = "bug_attribution.jsonl";

// better-sqlite3 entrypoint — sits under mcp-server/node_modules. Lazy-imported
// so tests can inject a synthetic Database constructor (hooks.databaseFactory).
const DEFAULT_SQLITE_MODULE = resolve(
  __dirname, "..", "mcp-server", "node_modules", "better-sqlite3", "lib", "index.js",
);

// ─── Pure helpers (exported for tests) ───────────────────────────────────

/** Filesystem-safe ISO: 2026-05-14T13:53:47.123Z → 2026-05-14T13-53-47-123Z.
 *  Windows forbids `:` in path components; `.` is legal but normalized to `-`
 *  for a single reversible transform. */
export function fsSafeIso(date) {
  const iso = (date instanceof Date ? date : new Date(date)).toISOString();
  return iso.replace(/:/g, "-").replace(/\.(\d+)Z$/, "-$1Z");
}

/** Reverse of fsSafeIso → a Date, or null if the name is not a snapshot dir. */
export function parseSnapshotDirName(name) {
  // 2026-05-14T13-53-47-123Z  →  2026-05-14T13:53:47.123Z
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
    retainDays: DEFAULT_RETAIN_DAYS,
    now: null, // null = real clock
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo" && argv[i + 1]) out.repo = argv[++i];
    else if (a === "--backup" && argv[i + 1]) out.backup = argv[++i];
    else if (a === "--retain-days" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.retainDays = Number.isFinite(n) && n >= 0 ? n : DEFAULT_RETAIN_DAYS;
    } else if (a === "--now" && argv[i + 1]) out.now = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

// ─── SQL dump (better-sqlite3, lazy + injectable) ────────────────────────

/**
 * Open coordination.db read-only and dump every row of `bug_attribution` as
 * JSONL. Returns { ok, rows, jsonl } or { ok:false, reason }. Pure — does not
 * write; the caller decides where the jsonl goes (and whether, in dry-run).
 */
export async function dumpBugAttribution(dbPath, hooks = {}) {
  if (!existsSync(dbPath)) return { ok: false, reason: `coordination.db not found: ${dbPath}` };
  let st;
  try { st = statSync(dbPath); }
  catch (err) { return { ok: false, reason: `stat failed: ${String(err && err.message || err)}` }; }
  if (st.size === 0) return { ok: false, reason: "coordination.db is zero-bytes" };

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
    return { ok: false, reason: `sqlite module load failed: ${String(err && err.message || err)}` };
  }

  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try { db.pragma("busy_timeout = 5000"); } catch { /* best-effort */ }
    let rows;
    try {
      rows = db.prepare(`SELECT * FROM ${DUMP_TABLE}`).all();
    } catch (err) {
      // Table absent (fresh db before B10 ledger DDL ran) — not an error: the
      // raw coordination.db copy is still the full backup.
      return { ok: false, reason: `table ${DUMP_TABLE} not queryable: ${String(err && err.message || err)}` };
    }
    const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
    return { ok: true, rows: rows.length, jsonl };
  } catch (err) {
    return { ok: false, reason: `sqlite open/query failed: ${String(err && err.message || err)}` };
  } finally {
    try { if (db) db.close(); } catch { /* best-effort */ }
  }
}

// ─── Core ────────────────────────────────────────────────────────────────

/**
 * Pure-ish snapshot entry. Never throws on disk I/O — errors accrue into
 * `result.errors`. Test seams via `hooks`:
 *   hooks.now             — Date|ISO override for "now" (otherwise opts.now / clock)
 *   hooks.databaseFactory — synthetic better-sqlite3 Database constructor
 *   hooks.sqliteModule    — override the better-sqlite3 module path
 */
export async function snapshot(opts, hooks = {}) {
  const nowDate = hooks.now != null ? new Date(hooks.now)
    : opts.now != null ? new Date(opts.now)
      : new Date();
  const nowMs = nowDate.getTime();
  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    generatedAt: Number.isFinite(nowMs) ? nowDate.toISOString() : null,
    repo: opts.repo,
    backupRoot: opts.backup,
    snapshotDir: null,
    dryRun: !!opts.dryRun,
    retainDays: opts.retainDays,
    copied: [],   // {rel, bytes}
    skipped: [],  // {rel|item, reason}
    dump: null,   // {ok, rows, dest} | {ok:false, reason}
    pruned: [],   // {dir, ageDays}  (or wouldPrune in dry-run)
    errors: [],
  };

  if (!Number.isFinite(nowMs)) {
    result.ok = false;
    result.errors.push(`invalid --now value: ${opts.now ?? hooks.now}`);
    return result;
  }

  const safeIso = fsSafeIso(nowDate);
  const snapshotDir = join(opts.backup, safeIso);
  result.snapshotDir = snapshotDir;

  // 1. Create the snapshot dir.
  if (!opts.dryRun) {
    try {
      mkdirSync(snapshotDir, { recursive: true });
    } catch (err) {
      result.ok = false;
      result.errors.push(`mkdir ${snapshotDir}: ${String(err && err.message || err)}`);
      return result; // can't proceed without the dir
    }
  }

  // 2. Copy the verbatim state files (best-effort each).
  for (const src of SOURCE_FILES) {
    const abs = join(opts.repo, src.rel);
    if (!existsSync(abs)) {
      result.skipped.push({ rel: src.rel, reason: "source-missing" });
      continue;
    }
    let bytes = 0;
    try { bytes = statSync(abs).size; } catch { /* size best-effort */ }
    if (opts.dryRun) {
      result.copied.push({ rel: src.rel, bytes, dryRun: true });
      continue;
    }
    try {
      copyFileSync(abs, join(snapshotDir, src.rel.split("/").pop()));
      result.copied.push({ rel: src.rel, bytes });
    } catch (err) {
      result.errors.push(`copy ${src.rel}: ${String(err && err.message || err)}`);
    }
  }

  // 3. bug_attribution SQL-dump.
  const dbAbs = join(opts.repo, "state/shared/coordination.db");
  const dump = await dumpBugAttribution(dbAbs, hooks);
  if (dump.ok) {
    const dest = join(snapshotDir, DUMP_BASENAME);
    if (opts.dryRun) {
      result.dump = { ok: true, rows: dump.rows, dest, dryRun: true };
    } else {
      try {
        writeFileSync(dest, dump.jsonl);
        result.dump = { ok: true, rows: dump.rows, dest };
      } catch (err) {
        result.dump = { ok: false, reason: `write ${DUMP_BASENAME}: ${String(err && err.message || err)}` };
        result.errors.push(result.dump.reason);
      }
    }
  } else {
    // Not a hard error — the raw coordination.db copy (if it succeeded) is the
    // full backup. Record it so the operator can see the dump degraded.
    result.dump = { ok: false, reason: dump.reason };
    result.skipped.push({ item: DUMP_BASENAME, reason: dump.reason });
  }

  // 4. Write manifest.json (the restore side reads this, not the dir name).
  if (!opts.dryRun) {
    const manifest = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: result.generatedAt,
      copied: result.copied.map((c) => c.rel),
      dump: result.dump && result.dump.ok ? { table: DUMP_TABLE, rows: result.dump.rows } : null,
    };
    try {
      writeFileSync(join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    } catch (err) {
      result.errors.push(`write manifest.json: ${String(err && err.message || err)}`);
    }
  }

  // 5. Prune snapshot dirs older than retainDays.
  if (existsSync(opts.backup)) {
    let entries = [];
    try {
      entries = readdirSync(opts.backup, { withFileTypes: true });
    } catch (err) {
      result.errors.push(`readdir ${opts.backup}: ${String(err && err.message || err)}`);
    }
    const cutoff = nowMs - opts.retainDays * DAY_MS;
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === safeIso) continue; // never prune the dir we just wrote
      const dirDate = parseSnapshotDirName(e.name);
      if (!dirDate) continue; // not a snapshot dir — leave it alone
      if (dirDate.getTime() >= cutoff) continue; // within retention
      const ageDays = Math.floor((nowMs - dirDate.getTime()) / DAY_MS);
      const dirAbs = join(opts.backup, e.name);
      if (opts.dryRun) {
        result.pruned.push({ dir: e.name, ageDays, wouldPrune: true });
      } else {
        try {
          rmSync(dirAbs, { recursive: true, force: true });
          result.pruned.push({ dir: e.name, ageDays });
        } catch (err) {
          result.errors.push(`prune ${e.name}: ${String(err && err.message || err)}`);
        }
      }
    }
  }

  if (result.errors.length > 0) result.ok = false;
  return result;
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write(
    [
      "golf-state-snapshot.mjs — daily backup of golf hygiene-chat state (U-CLEANUP-G12)",
      "",
      "Usage:",
      "  node scripts/golf-state-snapshot.mjs               apply",
      "  node scripts/golf-state-snapshot.mjs --dry-run     plan only, no writes",
      "  node scripts/golf-state-snapshot.mjs --json        machine-readable summary",
      "  node scripts/golf-state-snapshot.mjs --repo D --backup D2 --retain-days N --now ISO",
      "",
      "Output: H:/prism-backups/golf-state/<ISO>/  (+ 30-day retention prune)",
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
  const result = await snapshot(opts, {});
  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(`golf-state-snapshot: ${result.dryRun ? "dry-run" : "apply"}\n`);
    process.stdout.write(`  snapshot dir: ${result.snapshotDir}\n`);
    process.stdout.write(`  copied: ${result.copied.length} | skipped: ${result.skipped.length} | dump: ${result.dump && result.dump.ok ? result.dump.rows + " rows" : "skipped"} | pruned: ${result.pruned.length}\n`);
    for (const e of result.errors) process.stdout.write(`  ✗ ${e}\n`);
    process.stdout.write(result.ok ? `  ✓ ok${result.dryRun ? " (preview)" : ""}\n` : "  ✗ completed with errors\n");
  }
  return result.ok ? 0 : 1;
}

// Entry guard — exact path equality so a vitest import never execs the CLI.
const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  run().then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`golf-state-snapshot: fatal: ${err && err.message || err}\n`);
    process.exit(1);
  });
}

export { SCHEMA_VERSION, DEFAULT_RETAIN_DAYS, SOURCE_FILES, DUMP_TABLE, DUMP_BASENAME };
