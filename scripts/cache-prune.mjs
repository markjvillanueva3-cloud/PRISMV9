#!/usr/bin/env node
/**
 * cache-prune.mjs — retention policy for .claude/cache/ (U-MWO13, slot:bravo 2026-05-26).
 *
 * The .claude/cache/ directory had ~17,547 files in the 2026-05-26 audit
 * (CLAUDE-MD-PROJECT-FOLDER-OPTIMIZATION spec).  No retention policy = unbounded
 * growth, slow filesystem scans, eventual disk pressure.  This script enforces:
 *
 *   1. Age-based prune: delete files older than `--retention-days` (default 90).
 *   2. Size-based cap: if dir still exceeds `--max-mb` (default 200), delete
 *      oldest-first until under the cap.
 *
 * Default behavior is dry-run.  Pass `--apply` to actually delete.
 *
 * Wiring (separate): operator runs nightly via Windows Task Scheduler, OR adds
 * to a low-frequency Stop hook (gated to ≤1× per 24h via mtime sidecar).
 *
 * Knobs: --retention-days N · --max-mb N · --apply · --cache-dir <path>
 * Exit: 0 ok · 1 no cache dir · 2 runtime error
 *
 * @module scripts/cache-prune
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..", ".claude", "cache");

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_MB = 200;
const MS_PER_DAY = 86_400_000;

/** Parse argv into a flag map (pure). */
export function parseArgs(argv) {
  const opts = {
    retentionDays: DEFAULT_RETENTION_DAYS,
    maxMB: DEFAULT_MAX_MB,
    apply: false,
    cacheDir: DEFAULT_ROOT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--retention-days") opts.retentionDays = Math.max(1, Number(argv[++i] || DEFAULT_RETENTION_DAYS));
    else if (a === "--max-mb") opts.maxMB = Math.max(10, Number(argv[++i] || DEFAULT_MAX_MB));
    else if (a === "--cache-dir") opts.cacheDir = argv[++i] || DEFAULT_ROOT;
  }
  return opts;
}

/** Pure: classify each file as keep | drop-age | drop-size given a sorted candidate list. */
export function classify(files, opts, nowMs) {
  const cutoffMs = nowMs - opts.retentionDays * MS_PER_DAY;
  const maxBytes = opts.maxMB * 1024 * 1024;

  // Pass 1: age-based drops.
  const survivors = [];
  const ageDrops = [];
  for (const f of files) {
    if (f.mtimeMs < cutoffMs) ageDrops.push(f);
    else survivors.push(f);
  }

  // Pass 2: size cap (sorted oldest first within survivors).
  survivors.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let totalBytes = survivors.reduce((s, f) => s + f.size, 0);
  const sizeDrops = [];
  while (totalBytes > maxBytes && survivors.length > 0) {
    const f = survivors.shift();
    sizeDrops.push(f);
    totalBytes -= f.size;
  }
  return { keep: survivors, ageDrops, sizeDrops, totalBytesAfter: totalBytes };
}

/** Walk dir recursively, returning {path, size, mtimeMs}[].  Skips directories. */
function walk(root, fsImpl = fs) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = fsImpl.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      try {
        if (ent.isDirectory()) {
          stack.push(p);
        } else if (ent.isFile()) {
          const st = fsImpl.statSync(p);
          out.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
        }
      } catch { /* skip — file moved during walk, permission issue, etc. */ }
    }
  }
  return out;
}

export function run(opts = parseArgs(process.argv.slice(2)), fsImpl = fs) {
  if (!fsImpl.existsSync(opts.cacheDir)) {
    return { ok: false, reason: "cache-dir-missing", path: opts.cacheDir };
  }
  const files = walk(opts.cacheDir, fsImpl);
  const totalBefore = files.reduce((s, f) => s + f.size, 0);
  const result = classify(files, opts, Date.now());
  const allDrops = [...result.ageDrops, ...result.sizeDrops];

  let deleted = 0;
  let freedBytes = 0;
  if (opts.apply) {
    for (const f of allDrops) {
      try {
        fsImpl.unlinkSync(f.path);
        deleted += 1;
        freedBytes += f.size;
      } catch { /* file may have moved/locked — skip */ }
    }
  }

  return {
    ok: true,
    dryRun: !opts.apply,
    scanned: files.length,
    ageDrops: result.ageDrops.length,
    sizeDrops: result.sizeDrops.length,
    deleted,
    bytesBefore: totalBefore,
    bytesAfterPlan: result.totalBytesAfter,
    bytesFreedActual: freedBytes,
    retentionDays: opts.retentionDays,
    maxMB: opts.maxMB,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("cache-prune.mjs")) {
  try {
    const result = run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    process.stderr.write(`cache-prune: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
