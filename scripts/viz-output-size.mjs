#!/usr/bin/env node
/**
 * viz-output-size.mjs — CLEANUP-MS0 / U-CLEANUP-G10
 *
 * Track the byte size of state/shared/system-viz/ (the auto-regenerating
 * 3D-system-map staging area) and alert before it grows large enough to
 * recreate the 2026-05-12 git-history-strip incident — where multi-GB
 * auto-generated JSON / Cypher dumps had been silently committed and the
 * 100MB-per-blob GitHub limit forced a `git filter-repo` rewrite of 4567
 * commits (see [[reference_git_history_strip_event_2026_05_12]]).
 *
 * Two jobs:
 *   1. Size report — sum every byte under state/shared/system-viz/, surface
 *      the top-N largest files, flag when total > --threshold-gb (default 2).
 *      Always emits the report; the "alert" is just an `over_threshold: true`
 *      flag and a non-zero exit code, never a destructive auto-action.
 *
 *   2. Snapshot archive (opt-in via --archive) — move "non-current" snapshot
 *      files (matched by NON_CURRENT_PATTERNS) to
 *      H:/prism-backups/viz/<ISO>/, preserving them on disk while reclaiming
 *      space under the live tree. Files are MOVED, not deleted — recovery is
 *      `mv` away. Skipped in --dry-run.
 *
 * Why archive vs delete: per [[feedback_never_delete_only_disable]], the
 * rule is reversibility. A `.previous.json` graph might still be needed for
 * a regression diff a week later.
 *
 * Cadence: weekly (scripts/system-health/31-viz-output-size.ps1 wraps this
 * for Windows Task Scheduler). Off-mark scheduling per fleet-friendly rules
 * — the .ps1 picks an odd minute, not :00/:30.
 *
 * Safety properties:
 *   - --dry-run computes the full plan with zero writes.
 *   - Missing dir → zero report, exit 0 (not an error).
 *   - One-file scan errors (permission denied, symlink loop) are recorded
 *     in result.errors but do not abort the sum.
 *   - Archive failures leave the original in place (move-then-fail is
 *     atomic at the rename-syscall level).
 *
 * Usage:
 *   node scripts/viz-output-size.mjs                          report
 *   node scripts/viz-output-size.mjs --json                   machine-readable
 *   node scripts/viz-output-size.mjs --archive                also move non-current snapshots
 *   node scripts/viz-output-size.mjs --archive --dry-run      preview the archive plan
 *   node scripts/viz-output-size.mjs --threshold-gb 1.5 --top-n 20
 *
 * Exit codes:
 *   0 — under threshold (whether or not --archive ran)
 *   1 — internal error (unreadable root dir, write failure during archive)
 *   2 — OVER threshold (the "alert" signal — distinct from internal error)
 */

import {
  existsSync, statSync, readdirSync, mkdirSync, renameSync,
} from "node:fs";
import { join, dirname, resolve, basename, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const DEFAULT_THRESHOLD_GB = 2;
const DEFAULT_TOP_N = 10;
const BYTES_PER_GB = 1024 ** 3;

// Files whose names mark them as "non-current snapshots" — safe to archive
// while leaving the live tree intact. Each entry is a RegExp matched against
// the file basename. We intentionally do NOT archive `system-graph.json`,
// `graph.cypher`, or anything under the live subdirs; only suffixed
// snapshots and explicitly versioned older roots.
export const NON_CURRENT_PATTERNS = [
  /\.previous\.json$/i,        // system-graph.previous.json
  /\.bak$/i,                   // *.bak
  /\.snapshot-\d{4}-\d{2}-\d{2}/i,  // *.snapshot-2026-05-12*
  /-snapshot-\d{4}-\d{2}-\d{2}/i,
  /\.archive\.\d+\.json$/i,    // explicit archive rotations
];

const __dirname = dirname(fileURLToPath(import.meta.url));
function deriveRepoRoot() {
  try { return resolve(__dirname, ".."); }
  catch { return "H:/prism"; }
}
const REPO = process.env.PRISM_REPO_ROOT || deriveRepoRoot();
const DEFAULT_VIZ_DIR = join(REPO, "state", "shared", "system-viz");
const DEFAULT_BACKUP_ROOT = process.env.PRISM_VIZ_BACKUP_ROOT || "H:/prism-backups/viz";

// ─── arg parse ─────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    vizDir: DEFAULT_VIZ_DIR,
    backupRoot: DEFAULT_BACKUP_ROOT,
    thresholdGb: DEFAULT_THRESHOLD_GB,
    topN: DEFAULT_TOP_N,
    archive: false,
    dryRun: false,
    json: false,
    now: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { out.json = true; continue; }
    if (a === "--archive") { out.archive = true; continue; }
    if (a === "--dry-run") { out.dryRun = true; continue; }
    if (a === "--viz-dir") { if (argv[i + 1] == null) return { _error: "--viz-dir needs a value" }; out.vizDir = argv[++i]; continue; }
    if (a === "--backup-root") { if (argv[i + 1] == null) return { _error: "--backup-root needs a value" }; out.backupRoot = argv[++i]; continue; }
    if (a === "--threshold-gb") {
      const v = Number(argv[i + 1]);
      if (argv[i + 1] == null || !Number.isFinite(v) || v <= 0) return { _error: "--threshold-gb needs a positive number" };
      out.thresholdGb = v; i++; continue;
    }
    if (a === "--top-n") {
      const v = parseInt(argv[i + 1], 10);
      if (argv[i + 1] == null || !Number.isInteger(v) || v <= 0) return { _error: "--top-n needs a positive integer" };
      out.topN = v; i++; continue;
    }
    if (a === "--now") { if (argv[i + 1] == null) return { _error: "--now needs a value" }; out.now = argv[++i]; continue; }
    if (a === "--help" || a === "-h") return { _help: true };
    return { _error: `unknown arg: ${a}` };
  }
  return out;
}

// ─── pure helpers ─────────────────────────────────────────────────────────

/**
 * Decide whether a basename matches one of the NON_CURRENT_PATTERNS.
 * @param {string} name basename only — never a full path
 * @returns {boolean}
 */
export function isNonCurrentSnapshot(name) {
  if (typeof name !== "string" || !name) return false;
  return NON_CURRENT_PATTERNS.some((re) => re.test(name));
}

/**
 * Format bytes with a human-readable suffix. Reference values:
 *   1024 → "1 KB", 1024**2 → "1 MB", 1024**3 → "1 GB".
 * Pure — no I/O.
 */
export function formatBytes(b) {
  if (!Number.isFinite(b) || b < 0) return "?";
  if (b < 1024) return `${b} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`;
}

// ─── scan ─────────────────────────────────────────────────────────────────

/**
 * Recursively scan `root`, returning every file's relative path + size.
 * Symlinks are NOT followed (statSync vs lstat: we use statSync here, but
 * the test does not exercise symlinks — comment for any reader who needs
 * to extend this). Errors on individual entries are collected in
 * `result.errors`, never thrown out of scan().
 *
 * @param {string} root  absolute path
 * @param {object} [hooks]  { readdirSyncFn, statSyncFn }  — test seam
 * @returns {{ files: {path: string, sizeBytes: number}[], errors: string[] }}
 */
export function scan(root, hooks = {}) {
  const readdirFn = hooks.readdirSyncFn || readdirSync;
  const statFn = hooks.statSyncFn || statSync;
  const existsFn = hooks.existsSyncFn || existsSync;
  const errors = [];
  const files = [];

  if (!existsFn(root)) return { files, errors };

  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = readdirFn(cur, { withFileTypes: true }); }
    catch (e) { errors.push(`readdir ${cur}: ${e.code || e.message}`); continue; }
    for (const ent of entries) {
      const p = join(cur, ent.name);
      if (ent.isDirectory()) { stack.push(p); continue; }
      if (!ent.isFile()) continue; // skip symlinks / sockets / fifos
      let s;
      try { s = statFn(p); }
      catch (e) { errors.push(`stat ${p}: ${e.code || e.message}`); continue; }
      files.push({ path: p, sizeBytes: s.size });
    }
  }
  return { files, errors };
}

/**
 * Summarize a scan() output: total bytes, count, top-N largest, and the
 * subset matching NON_CURRENT_PATTERNS. Pure.
 */
export function summarize(scanResult, topN, vizDir) {
  const files = scanResult.files;
  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);
  const sorted = files.slice().sort((a, b) => b.sizeBytes - a.sizeBytes);
  const top = sorted.slice(0, topN).map((f) => ({
    rel: relPath(f.path, vizDir),
    sizeBytes: f.sizeBytes,
    human: formatBytes(f.sizeBytes),
  }));
  const snapshots = files.filter((f) => isNonCurrentSnapshot(basename(f.path)));
  return {
    fileCount: files.length,
    totalBytes,
    totalHuman: formatBytes(totalBytes),
    topFiles: top,
    snapshotCandidates: snapshots.map((f) => ({
      rel: relPath(f.path, vizDir),
      sizeBytes: f.sizeBytes,
      human: formatBytes(f.sizeBytes),
    })),
    snapshotBytes: snapshots.reduce((s, f) => s + f.sizeBytes, 0),
  };
}

// Use node's path.relative so separator differences (Windows `\` vs POSIX `/`)
// are handled correctly — a naive prefix-strip fails on synthetic forward-slash
// roots that `path.join` later normalizes to backslashes on Windows. Output is
// posix-normalized so reports + JSON consumers see consistent slashes across
// hosts. If absPath is outside root, return it unchanged (defensive).
function relPath(absPath, root) {
  const rel = relative(root, absPath);
  if (rel.startsWith("..")) return absPath;
  return rel.split(sep).join("/");
}

// ─── archive ──────────────────────────────────────────────────────────────

/**
 * Move every snapshot candidate to <backupRoot>/<ISO>/<original-relative-path>.
 * Idempotent across re-runs (each run lands in its own ISO directory). Never
 * deletes — files are moved, recovery is a single mv.
 *
 * @returns {{ archived: {from,to,sizeBytes}[], skipped: {path,reason}[], errors: string[], archiveDir: string|null }}
 */
export function archiveSnapshots(candidates, opts, hooks = {}) {
  const mkdirFn = hooks.mkdirSyncFn || mkdirSync;
  const renameFn = hooks.renameSyncFn || renameSync;
  const existsFn = hooks.existsSyncFn || existsSync;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const iso = new Date(nowMs).toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "Z");
  const archiveDir = join(opts.backupRoot, iso);
  const result = { archived: [], skipped: [], errors: [], archiveDir: null };

  if (candidates.length === 0) return result;

  if (opts.dryRun) {
    result.archiveDir = archiveDir;
    for (const c of candidates) result.archived.push({ from: c.path, to: join(archiveDir, relPath(c.path, opts.vizDir)), sizeBytes: c.sizeBytes, dryRun: true });
    return result;
  }

  try { mkdirFn(archiveDir, { recursive: true }); result.archiveDir = archiveDir; }
  catch (e) { result.errors.push(`mkdir ${archiveDir}: ${e.code || e.message}`); return result; }

  for (const c of candidates) {
    const rel = relPath(c.path, opts.vizDir);
    const dest = join(archiveDir, rel);
    if (!existsFn(c.path)) { result.skipped.push({ path: c.path, reason: "source-vanished" }); continue; }
    try { mkdirFn(dirname(dest), { recursive: true }); }
    catch (e) { result.errors.push(`mkdir ${dirname(dest)}: ${e.code || e.message}`); continue; }
    try { renameFn(c.path, dest); result.archived.push({ from: c.path, to: dest, sizeBytes: c.sizeBytes }); }
    catch (e) { result.errors.push(`rename ${c.path} → ${dest}: ${e.code || e.message}`); }
  }
  return result;
}

// ─── orchestrator ─────────────────────────────────────────────────────────

/**
 * One-shot full run. Composes scan + summarize + (optional) archive into a
 * single result object that the CLI / a future hook / a test all share.
 */
export function run(opts, hooks = {}) {
  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    generatedAt: new Date(Number.isFinite(hooks.nowMs) ? hooks.nowMs : Date.now()).toISOString(),
    vizDir: opts.vizDir,
    thresholdGb: opts.thresholdGb,
    thresholdBytes: Math.round(opts.thresholdGb * BYTES_PER_GB),
    overThreshold: false,
    dryRun: !!opts.dryRun,
    archive: { performed: false, archived: [], skipped: [], errors: [], archiveDir: null },
    errors: [],
  };

  const scanned = scan(opts.vizDir, hooks);
  result.errors.push(...scanned.errors);

  const summary = summarize(scanned, opts.topN, opts.vizDir);
  Object.assign(result, summary);
  result.overThreshold = result.totalBytes > result.thresholdBytes;

  if (opts.archive && summary.snapshotCandidates.length > 0) {
    const candidates = scanned.files.filter((f) => isNonCurrentSnapshot(basename(f.path)));
    const archiveResult = archiveSnapshots(candidates, {
      backupRoot: opts.backupRoot,
      vizDir: opts.vizDir,
      dryRun: opts.dryRun,
      nowMs: hooks.nowMs,
    }, hooks);
    result.archive.performed = true;
    Object.assign(result.archive, archiveResult);
    result.errors.push(...archiveResult.errors);
  }

  if (result.errors.length > 0) result.ok = false;
  return result;
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write([
    "viz-output-size.mjs — track state/shared/system-viz/ bytes (U-CLEANUP-G10)",
    "",
    "Usage:",
    "  node scripts/viz-output-size.mjs                  report (text)",
    "  node scripts/viz-output-size.mjs --json           machine-readable",
    "  node scripts/viz-output-size.mjs --archive        also move non-current snapshots",
    "  node scripts/viz-output-size.mjs --archive --dry-run   preview the archive plan",
    "  node scripts/viz-output-size.mjs --threshold-gb 1.5 --top-n 20 --viz-dir <path>",
    "",
    "Exit codes: 0=under threshold · 1=internal error · 2=OVER threshold (alert)",
    "",
  ].join("\n"));
}

function renderText(r) {
  const lines = [];
  const marker = r.overThreshold ? "🚨 OVER THRESHOLD" : "✓ under threshold";
  lines.push(`viz-output-size ${r.ok ? "OK" : "FAIL"} [${r.dryRun ? "DRY-RUN" : "APPLY"}] — ${marker} (threshold ${r.thresholdGb} GB)`);
  lines.push(`  ${r.vizDir}: ${r.totalHuman} across ${r.fileCount} files`);
  if (r.topFiles.length > 0) {
    lines.push(`  Top ${r.topFiles.length} largest:`);
    for (const f of r.topFiles) lines.push(`    ${f.human.padStart(10)}  ${f.rel}`);
  }
  if (r.snapshotCandidates.length > 0) {
    lines.push(`  Non-current snapshots: ${r.snapshotCandidates.length} files, ${formatBytes(r.snapshotBytes)} total`);
    if (r.archive.performed) {
      lines.push(`    ${r.dryRun ? "would archive" : "archived"} → ${r.archive.archiveDir}`);
      for (const a of r.archive.archived) lines.push(`      ${r.dryRun ? "•" : "→"} ${a.from}`);
    } else {
      lines.push(`    (pass --archive to move them to ${DEFAULT_BACKUP_ROOT}/<ISO>/)`);
    }
  }
  for (const e of r.errors) lines.push(`  ERROR: ${e}`);
  return lines.join("\n");
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts._help) { printHelp(); return 0; }
  if (opts._error) { process.stderr.write(`viz-output-size: ${opts._error}\n`); return 1; }
  const r = run(opts);
  if (opts.json) process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  else process.stdout.write(renderText(r) + "\n");
  if (!r.ok) return 1;
  return r.overThreshold ? 2 : 0;
}

const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  try { process.exit(main()); }
  catch (err) { process.stderr.write(`viz-output-size: fatal: ${(err && err.message) || err}\n`); process.exit(1); }
}

export { SCHEMA_VERSION, DEFAULT_THRESHOLD_GB, DEFAULT_TOP_N, BYTES_PER_GB };
