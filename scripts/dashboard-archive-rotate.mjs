#!/usr/bin/env node
/**
 * dashboard-archive-rotate.mjs — CLEANUP-MS0 / U-CLEANUP-G13
 *
 * Annual gzip-bundle of `state/shared/dashboards/.archive/<YYYY>/` snapshots
 * to `H:/prism-backups/dashboard-archives/<YYYY>.tar.gz`, with 2-year retention.
 *
 * Source layout (managed by other CLEANUP-MS0 units that rotate dashboards):
 *   <repo>/state/shared/dashboards/.archive/2025/...    ← prior year's snapshots
 *   <repo>/state/shared/dashboards/.archive/2024/...    ← already-archived year
 *
 * Output:
 *   H:/prism-backups/dashboard-archives/2025.tar.gz
 *   H:/prism-backups/dashboard-archives/2024.tar.gz
 *
 * Policy:
 *   - Only bundles YYYY directories strictly older than the current year
 *     (the current year is "still being written to" so it's excluded).
 *   - After a successful tar.gz creation, the source <YYYY>/ directory is
 *     removed to reclaim space. If the destination already exists, the source
 *     is left alone (logged as `already-bundled`) — re-running is idempotent.
 *   - Retention: tar.gz files whose YYYY < (currentYear - retainYears) are
 *     deleted from the backup root. Default retainYears=2 means we keep the
 *     last 2 complete years; everything older is purged.
 *
 * Behaviour when sources don't exist:
 *   - dashboards/.archive missing → success no-op.
 *   - backup root missing → created lazily.
 *
 * Tar dependency: shells out to the system `tar` (verified GNU tar 1.35 on
 * Windows 10+; same binary on Linux/macOS). No npm tar package required.
 *
 * CLI:
 *   node scripts/dashboard-archive-rotate.mjs
 *     [--source <dir>]   default: H:/prism/state/shared/dashboards/.archive
 *     [--backup <dir>]   default: H:/prism-backups/dashboard-archives
 *     [--retain-years N] default: 2
 *     [--current-year YYYY] override "now" year — for tests / bisecting
 *     [--dry-run]        compute the plan without touching disk
 *     [--no-json]        one-line text summary instead of JSON
 *
 * Exit: 0 success, 1 on any captured error.
 *
 * @see U-CLEANUP-G13 (envelope was not_started)
 * @see scripts/settings-baseline-rotate.mjs (companion G4 unit, same conventions)
 */

import {
  existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_SOURCE = "H:/prism/state/shared/dashboards/.archive";
const DEFAULT_BACKUP = "H:/prism-backups/dashboard-archives";
const DEFAULT_RETAIN_YEARS = 2;
const YEAR_DIR_RE = /^(\d{4})$/;
const TAR_GZ_RE = /^(\d{4})\.tar\.gz$/;
const SCHEMA_VERSION = 1;

export function parseArgs(argv) {
  const out = {
    source: DEFAULT_SOURCE,
    backup: DEFAULT_BACKUP,
    retainYears: DEFAULT_RETAIN_YEARS,
    currentYear: null, // null = use real clock
    dryRun: false,
    json: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source" && argv[i + 1]) out.source = argv[++i];
    else if (a === "--backup" && argv[i + 1]) out.backup = argv[++i];
    else if (a === "--retain-years" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.retainYears = Number.isFinite(n) && n >= 0 ? n : DEFAULT_RETAIN_YEARS;
    } else if (a === "--current-year" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (Number.isFinite(n) && n >= 1970 && n <= 9999) out.currentYear = n;
    } else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-json") out.json = false;
  }
  return out;
}

/** Optional tar runner injection for tests. */
function defaultRunTar(args, cwd) {
  // GNU tar: -c create, -z gzip, -f file, -C change dir, "." current dir contents
  const r = spawnSync("tar", args, { cwd, encoding: "utf-8", windowsHide: true });
  return { status: r.status, stderr: r.stderr || "", stdout: r.stdout || "" };
}

/**
 * Pure rotation entry point. Never throws on disk I/O; errors accrue into
 * `result.errors` so callers can decide whether to retry / alert.
 *
 * @param {object} opts                  Parsed args (see parseArgs).
 * @param {object} [hooks]               Test seams.
 * @param {function} [hooks.runTar]      Override `tar` runner.
 * @param {function} [hooks.removeDir]   Override post-bundle dir removal.
 * @param {number}   [hooks.nowYear]     Override "current year" (otherwise from clock or opts.currentYear).
 */
export function rotate(opts, hooks = {}) {
  const runTar = hooks.runTar || defaultRunTar;
  const removeDir = hooks.removeDir || ((p) => rmSync(p, { recursive: true, force: true }));
  const nowYear = hooks.nowYear ?? opts.currentYear ?? new Date().getUTCFullYear();

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    source: opts.source,
    backup: opts.backup,
    retainYears: opts.retainYears,
    currentYear: nowYear,
    dryRun: !!opts.dryRun,
    scannedYears: [],
    bundled: [],         // {year, dest, sizeBytes}
    skipped: [],         // {year, reason}
    purged: [],          // {year, file}
    errors: [],
  };

  // 1) Scan source for YYYY/ directories.
  let yearDirs = [];
  if (!existsSync(opts.source)) {
    // Nothing to do (other CLEANUP units haven't created the archive root yet).
    result.skipped.push({ year: null, reason: "source-missing" });
  } else {
    let entries;
    try { entries = readdirSync(opts.source, { withFileTypes: true }); }
    catch (e) {
      result.errors.push(`readdir ${opts.source}: ${e.message}`);
      result.ok = false;
      return result;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const m = YEAR_DIR_RE.exec(ent.name);
      if (!m) continue;
      const yyyy = parseInt(m[1], 10);
      result.scannedYears.push(yyyy);
    }
    result.scannedYears.sort((a, b) => a - b);
  }

  // 2) Ensure backup dir exists (unless dry-run AND there's nothing to bundle).
  const haveWorkToDo = result.scannedYears.some((y) => y < nowYear);
  if (haveWorkToDo && !opts.dryRun) {
    try { mkdirSync(opts.backup, { recursive: true }); }
    catch (e) {
      result.errors.push(`mkdir backup ${opts.backup}: ${e.message}`);
      result.ok = false;
      return result;
    }
  }

  // 3) Bundle each YYYY < nowYear (older years only).
  for (const yyyy of result.scannedYears) {
    if (yyyy >= nowYear) {
      result.skipped.push({ year: yyyy, reason: "current-or-future-year" });
      continue;
    }
    const srcDir = join(opts.source, String(yyyy));
    const dest = join(opts.backup, `${yyyy}.tar.gz`);

    if (existsSync(dest)) {
      // Already bundled. We do NOT remove the source — operator can decide
      // whether to delete (e.g. if the source has new files since the bundle).
      result.skipped.push({ year: yyyy, reason: "already-bundled", dest });
      continue;
    }

    if (opts.dryRun) {
      result.bundled.push({ year: yyyy, dest, sizeBytes: -1, dryRun: true });
      continue;
    }

    // tar -czf <dest> -C <srcDir> .   → archive everything inside srcDir
    const tarRes = runTar(["-czf", dest, "-C", srcDir, "."], opts.source);
    if (tarRes.status !== 0) {
      result.errors.push(
        `tar ${yyyy} failed (exit ${tarRes.status}): ${(tarRes.stderr || "").trim().slice(0, 200)}`
      );
      // Best-effort: remove a partially-written dest so re-runs retry cleanly.
      if (existsSync(dest)) {
        try { unlinkSync(dest); } catch { /* tolerate */ }
      }
      continue;
    }

    let sizeBytes = -1;
    try { sizeBytes = statSync(dest).size; } catch { /* cosmetic */ }
    result.bundled.push({ year: yyyy, dest, sizeBytes });

    // Remove the source after a verified tar.gz exists.
    try { removeDir(srcDir); }
    catch (e) {
      result.errors.push(`remove source ${srcDir}: ${e.message}`);
    }
  }

  // 4) Retention sweep: prune .tar.gz files older than retainYears.
  if (existsSync(opts.backup)) {
    let backupEntries = [];
    try { backupEntries = readdirSync(opts.backup); }
    catch (e) { result.errors.push(`readdir backup ${opts.backup}: ${e.message}`); }

    const retainCutoff = nowYear - opts.retainYears;
    for (const name of backupEntries) {
      const m = TAR_GZ_RE.exec(name);
      if (!m) continue;
      const yyyy = parseInt(m[1], 10);
      if (yyyy >= retainCutoff) continue;
      const full = join(opts.backup, name);
      if (!opts.dryRun) {
        try { unlinkSync(full); }
        catch (e) { result.errors.push(`unlink ${name}: ${e.message}`); continue; }
      }
      result.purged.push({ year: yyyy, file: name });
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;
  try { result = rotate(args); }
  catch (e) {
    if (args.json) process.stdout.write(JSON.stringify({ ok: false, error: e.message }) + "\n");
    else process.stderr.write(`dashboard-archive-rotate: ${e.message}\n`);
    process.exit(1);
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(
      `bundled=${result.bundled.length} purged=${result.purged.length} ` +
      `skipped=${result.skipped.length} errors=${result.errors.length}\n`
    );
  }
  process.exit(result.ok ? 0 : 1);
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("dashboard-archive-rotate.mjs")) main();
