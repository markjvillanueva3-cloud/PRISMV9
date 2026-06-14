#!/usr/bin/env node
/**
 * scripts/pdf-corpus-watcher-sweep.mjs — U-VICTOR-C3
 *
 * Periodic sweep of `resources/` + `JM DIE/` for new/modified PDFs. Closes
 * the operator's prior gap ([[feedback_enumerate_before_read]]) — when a
 * new PDF lands, the closed-loop pipeline should auto-ingest without the
 * operator manually compiling files into a sub-folder.
 *
 * Design choice: periodic SCAN (not a long-running daemon). Reasons:
 *   1. `fs.watch` is flaky on Windows for create events
 *   2. Scheduled-task pattern is the same as A3/C1/C2 — operationally uniform
 *   3. A 5-min cadence is more than fast enough for human-scale PDF drops
 *
 * Flow:
 *   1. Walk WATCH_DIRS for `*.pdf` files (size + mtime)
 *   2. Diff against `state/shared/.pdf-watcher-seen.json` (per-path mtime+size)
 *   3. For each NEW or MODIFIED PDF, log a candidate to
 *      `state/shared/dashboards/pdf-watcher-log.jsonl`
 *   4. Update the seen-state
 *   5. By default, log-only (operator triggers `pdf-parse-extract` via
 *      `--extract` flag, or via a downstream skill that consumes the log).
 *
 * Modes:
 *   --dry-run (default)  — scan + log diff; do not extract
 *   --extract            — invoke pdf-parse-extract.mjs on each new PDF
 *
 * Knobs:
 *   PRISM_PDF_WATCHER_DISABLE=1     — short-circuit (cron fires, scan exits)
 *   PRISM_PDF_WATCHER_MAX_FIRE=N    — cap extract invocations per sweep (default 5)
 *
 * Exit: 0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const WATCH_DIRS = [
  path.join(ROOT, "resources"),
  path.join(ROOT, "JM DIE"),
];
const SEEN_PATH = path.join(ROOT, "state/shared/.pdf-watcher-seen.json");
const LOG_PATH = path.join(ROOT, "state/shared/dashboards/pdf-watcher-log.jsonl");
const EXTRACT_SCRIPT = path.join(ROOT, "scripts/pdf-parse-extract.mjs");

const DEFAULT_MAX_FIRE = 5;

// ───────────────────────── pure core ─────────────────────────

/**
 * Pure: diff a fresh scan against the seen-state. Returns:
 *   {new: [...], modified: [...], unchanged: [...], removed: [...]}
 * where each list contains `{path, size, mtimeMs}` records.
 */
export function diffScan(currentScan, seenMap) {
  const cur = Array.isArray(currentScan) ? currentScan : [];
  const seen = (seenMap && typeof seenMap === "object") ? seenMap : {};

  const result = { new: [], modified: [], unchanged: [], removed: [] };
  const curPaths = new Set();

  for (const entry of cur) {
    if (!entry || typeof entry !== "object" || !entry.path) continue;
    curPaths.add(entry.path);
    const prev = seen[entry.path];
    if (!prev) {
      result.new.push(entry);
    } else if (
      prev.size !== entry.size ||
      prev.mtimeMs !== entry.mtimeMs
    ) {
      result.modified.push(entry);
    } else {
      result.unchanged.push(entry);
    }
  }

  for (const seenPath of Object.keys(seen)) {
    if (!curPaths.has(seenPath)) {
      result.removed.push({ path: seenPath, ...seen[seenPath] });
    }
  }

  return result;
}

/**
 * Pure: cap the to-extract list at maxFire entries (prevents a directory
 * with 100 new PDFs from spawning 100 child processes in one cron tick).
 */
export function capExtractList(diff, maxFire = DEFAULT_MAX_FIRE) {
  const candidates = [...(diff?.new || []), ...(diff?.modified || [])];
  const n = Math.max(0, Math.min(maxFire, candidates.length));
  return candidates.slice(0, n);
}

// ───────────────────────── I/O shell ─────────────────────────

function walkPdfs(dir, acc = []) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip noisy dirs that aren't real PDF corpora
      if (e.name === "node_modules" || e.name === ".git" || e.name === "extracted") continue;
      walkPdfs(full, acc);
    } else if (e.isFile() && /\.pdf$/i.test(e.name)) {
      try {
        const st = fs.statSync(full);
        acc.push({
          path: path.relative(ROOT, full).replace(/\\/g, "/"),
          size: st.size,
          mtimeMs: Math.floor(st.mtimeMs),
        });
      } catch {}
    }
  }
  return acc;
}

function loadSeen() {
  try {
    if (!fs.existsSync(SEEN_PATH)) return {};
    return JSON.parse(fs.readFileSync(SEEN_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveSeen(scan) {
  const map = Object.create(null);
  for (const e of scan) map[e.path] = { size: e.size, mtimeMs: e.mtimeMs };
  fs.mkdirSync(path.dirname(SEEN_PATH), { recursive: true });
  fs.writeFileSync(SEEN_PATH, JSON.stringify(map, null, 2));
}

function appendLog(diff, mode) {
  const ts = new Date().toISOString();
  const lines = [];
  for (const e of diff.new)      lines.push(JSON.stringify({ ts, kind: "new",      path: e.path, size: e.size, mode }));
  for (const e of diff.modified) lines.push(JSON.stringify({ ts, kind: "modified", path: e.path, size: e.size, mode }));
  for (const e of diff.removed)  lines.push(JSON.stringify({ ts, kind: "removed",  path: e.path, mode }));
  if (lines.length === 0) return;
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, lines.join("\n") + "\n");
}

export function main(argv = []) {
  if (process.env.PRISM_PDF_WATCHER_DISABLE === "1") {
    console.log("pdf-corpus-watcher-sweep: disabled via PRISM_PDF_WATCHER_DISABLE=1");
    return 0;
  }

  const dryRun = !argv.includes("--extract");
  const maxFire = Number(process.env.PRISM_PDF_WATCHER_MAX_FIRE) || DEFAULT_MAX_FIRE;

  let scan = [];
  for (const d of WATCH_DIRS) {
    if (!fs.existsSync(d)) continue;
    scan = scan.concat(walkPdfs(d));
  }

  const seen = loadSeen();
  const diff = diffScan(scan, seen);

  console.log(`pdf-corpus-watcher-sweep:`);
  console.log(`  scanned:    ${scan.length} pdf(s) across ${WATCH_DIRS.length} dirs`);
  console.log(`  new:        ${diff.new.length}`);
  console.log(`  modified:   ${diff.modified.length}`);
  console.log(`  removed:    ${diff.removed.length}`);
  console.log(`  unchanged:  ${diff.unchanged.length}`);
  console.log(`  mode:       ${dryRun ? "DRY-RUN (log-only)" : "EXTRACT"}`);

  appendLog(diff, dryRun ? "log-only" : "extract");
  saveSeen(scan);

  if (dryRun || (diff.new.length + diff.modified.length) === 0) {
    return 0;
  }

  // EXTRACT mode — invoke pdf-parse-extract.mjs for the first maxFire candidates
  const toExtract = capExtractList(diff, maxFire);
  console.log(`  extracting (cap ${maxFire}): ${toExtract.length}`);

  if (!fs.existsSync(EXTRACT_SCRIPT)) {
    console.log(`  WARN: pdf-parse-extract.mjs not present at ${EXTRACT_SCRIPT} — skipping extraction (log entries still recorded for downstream skill)`);
    return 0;
  }

  for (const cand of toExtract) {
    try {
      const r = spawnSync(process.execPath, [EXTRACT_SCRIPT, "--file", path.join(ROOT, cand.path), "--pages", "40"], { stdio: "inherit" });
      console.log(`    ${cand.path} -> exit ${r.status}`);
    } catch (e) {
      console.log(`    ${cand.path} -> ERROR ${e.message}`);
    }
  }

  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
