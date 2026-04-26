#!/usr/bin/env node
/**
 * prune-compaction-survival.mjs
 *
 * Reaps stale .compaction-survival-Agent-<HOST>-pid-<PID>.md files in
 * H:/prism/.claude/helpers/.
 *
 * These files are written by precompact-handoff hooks per Claude PID. PIDs
 * rotate every session, so files accumulate forever — currently 351+ files,
 * which slow every `ls`/`readdir` of the helpers dir and bloat backups.
 *
 * Default behavior: delete any matching file with mtime older than 24 hours.
 * The active session's per-chat handoff lives in state/shared/handoffs/, NOT
 * here — these are post-compact backups only.
 *
 * Usage:
 *   node prune-compaction-survival.mjs          # delete files > 24h old
 *   node prune-compaction-survival.mjs --hours 48
 *   node prune-compaction-survival.mjs --dry-run
 *   node prune-compaction-survival.mjs --verbose
 *
 * Exit codes:
 *   0 — success (or nothing to prune)
 *   1 — fatal I/O error
 */

import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const HELPERS_DIR = "H:/prism/.claude/helpers";
const PREFIX = ".compaction-survival-";
const SUFFIX = ".md";

function parseArgs(argv) {
  const args = { hours: 24, dryRun: false, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--verbose" || a === "-v") args.verbose = true;
    else if (a === "--hours") args.hours = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("Usage: prune-compaction-survival.mjs [--hours N] [--dry-run] [--verbose]");
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(args.hours) || args.hours < 0) {
    console.error("--hours must be a non-negative number");
    process.exit(2);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const cutoffMs = Date.now() - args.hours * 3_600_000;

  let entries;
  try {
    entries = readdirSync(HELPERS_DIR);
  } catch (err) {
    console.error(`fatal: cannot read ${HELPERS_DIR}: ${err.message}`);
    process.exit(1);
  }

  let scanned = 0;
  let pruned = 0;
  let kept = 0;
  let bytesFreed = 0;
  const errors = [];

  for (const name of entries) {
    if (!name.startsWith(PREFIX) || !name.endsWith(SUFFIX)) continue;
    scanned++;

    const full = join(HELPERS_DIR, name);
    let st;
    try {
      st = statSync(full);
    } catch (err) {
      errors.push(`stat ${name}: ${err.message}`);
      continue;
    }
    if (!st.isFile()) continue;

    if (st.mtimeMs >= cutoffMs) {
      kept++;
      if (args.verbose) {
        const ageH = ((Date.now() - st.mtimeMs) / 3_600_000).toFixed(1);
        console.log(`  KEEP ${name} (${ageH}h old, ${st.size}B)`);
      }
      continue;
    }

    if (args.dryRun) {
      const ageH = ((Date.now() - st.mtimeMs) / 3_600_000).toFixed(1);
      console.log(`  PRUNE ${name} (${ageH}h old, ${st.size}B) [dry-run]`);
      pruned++;
      bytesFreed += st.size;
      continue;
    }

    try {
      unlinkSync(full);
      pruned++;
      bytesFreed += st.size;
      if (args.verbose) console.log(`  PRUNE ${name} (${st.size}B)`);
    } catch (err) {
      errors.push(`unlink ${name}: ${err.message}`);
    }
  }

  const summary = {
    cutoff_hours: args.hours,
    scanned,
    pruned,
    kept,
    bytes_freed: bytesFreed,
    bytes_freed_human: bytesFreed > 1024 ? `${(bytesFreed / 1024).toFixed(1)} KB` : `${bytesFreed} B`,
    dry_run: args.dryRun,
    errors_count: errors.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (errors.length) {
    console.error("errors:");
    for (const e of errors) console.error(`  ${e}`);
  }
  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
