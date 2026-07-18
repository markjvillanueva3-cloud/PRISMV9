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

/**
 * Pure: parse the stdout of one `pdf-parse-extract.mjs --file <pdf>` run into a
 * compact lane summary. The extractor prints `JSON.stringify(summary, null, 2)`
 * carrying per-result `lane`/`routed_to_ocr`/`skip_reason` (U-XRAY-GDT-CORPUS-SCAN-ROUTE)
 * plus run-level `emitted_count`/`routed_to_ocr_count`. This lets the watcher record
 * which scanned PDFs went to the TEXT corpus vs were routed to the OCR lane (an
 * image-based drawing), instead of losing that to transient stdout.
 *
 * Returns { emitted, routedToOcr, results: [{path, lane, routed_to_ocr, skip_reason}] }
 * or null on any failure (empty / non-JSON / no results array) -- caller falls back
 * to exit-code-only logging (the pre-U-XRAY-GDT-WATCHER-LANE-CAPTURE behaviour).
 */
export function parseExtractLanes(stdout) {
  if (typeof stdout !== "string" || !stdout.trim()) return null;
  let summary;
  try {
    summary = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!summary || typeof summary !== "object" || Array.isArray(summary) || !Array.isArray(summary.results)) {
    return null;
  }
  const results = summary.results.map((r) => ({
    path: r && typeof r.path === "string" ? r.path : null,
    lane: r && (r.lane === "text" || r.lane === "ocr") ? r.lane : null,
    routed_to_ocr: !!(r && r.routed_to_ocr),
    skip_reason: r && typeof r.skip_reason === "string" ? r.skip_reason : null,
  }));
  const emitted = Number.isFinite(summary.emitted_count)
    ? summary.emitted_count
    : results.filter((x) => x.lane === "text").length;
  const routedToOcr = Number.isFinite(summary.routed_to_ocr_count)
    ? summary.routed_to_ocr_count
    : results.filter((x) => x.routed_to_ocr).length;
  return { emitted, routedToOcr, results };
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

/**
 * Append one `kind:"extracted"` record per extracted PDF, capturing which lane the
 * text extractor chose (text-emitted vs ocr-routed). `lanes` is the parseExtractLanes
 * result (or null on a fail-soft); a null lanes still logs the exit status so the
 * record is never silently dropped (R12).
 */
export function appendExtractLog(relPath, lanes, status, stderrExcerpt = null, logPath = LOG_PATH) {
  const ts = new Date().toISOString();
  const res = lanes && Array.isArray(lanes.results) && lanes.results[0] ? lanes.results[0] : null;
  const record = {
    ts,
    kind: "extracted",
    path: relPath,
    exit: typeof status === "number" ? status : null,
    lane: res ? res.lane : null,
    routed_to_ocr: res ? res.routed_to_ocr : false,
    skip_reason: res ? res.skip_reason : null,
  };
  // Only fold stderr in on a failure (R12 fail-loud: a FATAL extract stays debuggable
  // from the durable log even though stdout is now captured, not streamed).
  if (stderrExcerpt) record.stderr_excerpt = stderrExcerpt;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(record) + "\n");
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
      // Capture stdout (was stdio:"inherit") so we can record which lane the extractor
      // chose -- text-emitted vs ocr-routed (image-based drawing). windowsHide avoids a
      // console-window flash when the cron runs detached. Fail-soft: a parse miss falls
      // back to exit-code-only logging (the pre-lane-capture behaviour).
      const r = spawnSync(process.execPath, [EXTRACT_SCRIPT, "--file", path.join(ROOT, cand.path), "--pages", "40"], { encoding: "utf-8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      const lanes = parseExtractLanes(r.stdout);
      const stderrExcerpt = (r.status !== 0 && r.stderr) ? String(r.stderr).trim().slice(-500) : null;
      appendExtractLog(cand.path, lanes, r.status, stderrExcerpt);
      const res = lanes && lanes.results && lanes.results[0] ? lanes.results[0] : null;
      const laneTag = res
        ? ` | lane=${res.lane || "?"}${res.routed_to_ocr ? ` (ocr-routed: ${res.skip_reason || "scan"})` : ""}`
        : " (no lane summary)";
      console.log(`    ${cand.path} -> exit ${r.status}${laneTag}`);
      if (stderrExcerpt) console.log(`      stderr: ${stderrExcerpt}`);
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
