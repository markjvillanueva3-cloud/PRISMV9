#!/usr/bin/env node
/**
 * fleet-launch-summary.mjs -- FLEET-LAUNCHER-IMPROVE-MS0/U-FLI03 (slot:tango, 2026-06-10)
 *
 * Aggregates the per-tab launch decisions that slot-tab-boot.ps1 appends to
 * state/shared/.fleet-launch-log.jsonl into one operator-facing summary, so a
 * launch shows "which slots resumed / went fresh / were skipped" instead of that
 * decision being buried in each individual tab.
 *
 * Two modes:
 *   --mark                 Write the launch-start marker (the thin launcher calls
 *                          this BEFORE spawning tabs so the summary scopes to THIS
 *                          launch only).
 *   (default)              Read the log, keep entries with ts >= marker, tally by
 *                          category, print, and bound the log file size.
 *
 * Flags: --log <path> --marker <path> --expected <N> (denominator for "N of M
 * reported"; the generated .bat passes the number of tabs it spawned).
 *
 * Log line schema (one JSON object per line):
 *   {"ts":<epochMs>,"slot":"<slot>","action":"<label>","sessionId":"<uuid|>","host":"<name>"}
 *
 * Fail-soft everywhere: a missing log/marker prints a graceful note, never throws.
 */
"use strict";

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = "H:/prism";
const DEFAULT_LOG = path.join(PRISM_ROOT, "state/shared/.fleet-launch-log.jsonl");
const DEFAULT_MARKER = path.join(PRISM_ROOT, "state/shared/.fleet-launch-start");

const MAX_LOG_LINES = 500;          // bound the append-only log on each summary run
const FALLBACK_WINDOW_MS = 300000;  // no marker -> show the last 5 minutes

// action label -> bucket. Keep in sync with slot-tab-boot.ps1 Write-LaunchLog calls.
const BUCKET = {
  "resume-tier1": "resumed",
  "resume-tier1.5": "resumed",
  "resume-tier2": "resumed",
  "override-resume": "resumed",
  "fresh-checkin": "fresh",
  "fresh-new-domain": "fresh",
  "override-fresh": "fresh",
  "galaxy-buildout": "fresh",
  "oversized-fresh": "oversized",
  "skip-live": "skipped",
};
const BUCKET_ORDER = ["resumed", "fresh", "oversized", "skipped"];
const BUCKET_LABEL = {
  resumed: "resumed today's session",
  fresh: "fresh /checkin",
  oversized: "oversized -> fresh",
  skipped: "skipped (already live)",
};

function parseArgs(argv) {
  const a = { mark: false, log: DEFAULT_LOG, marker: DEFAULT_MARKER, expected: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--mark") a.mark = true;
    else if (t === "--log" && argv[i + 1]) a.log = argv[++i];
    else if (t === "--marker" && argv[i + 1]) a.marker = argv[++i];
    else if (t === "--expected" && argv[i + 1]) a.expected = Math.max(0, Number(argv[++i]) || 0);
  }
  return a;
}

function readMarker(markerPath) {
  try {
    const v = Number(fs.readFileSync(markerPath, "utf-8").trim());
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

/** Read JSONL entries (skipping malformed lines), newest-wins per slot. */
function readEntries(logPath, sinceMs) {
  let lines = [];
  try { lines = fs.readFileSync(logPath, "utf-8").split(/\r?\n/); } catch { return { perSlot: new Map(), total: 0, kept: 0 }; }
  const perSlot = new Map();
  let total = 0;
  let kept = 0;
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    let o;
    try { o = JSON.parse(s); } catch { continue; }
    if (!o || typeof o.slot !== "string" || typeof o.action !== "string") continue;
    total++;
    const ts = Number(o.ts) || 0;
    if (sinceMs != null && ts < sinceMs) continue;
    kept++;
    const prev = perSlot.get(o.slot);
    if (!prev || ts >= prev.ts) perSlot.set(o.slot, { ts, action: o.action, sessionId: o.sessionId || "", host: o.host || "" });
  }
  return { perSlot, total, kept };
}

/** Keep only the most-recent MAX_LOG_LINES lines so the append-only log can't grow forever. */
function boundLog(logPath) {
  try {
    const lines = fs.readFileSync(logPath, "utf-8").split(/\r?\n/).filter((l) => l.trim());
    if (lines.length <= MAX_LOG_LINES) return;
    const tail = lines.slice(-MAX_LOG_LINES).join("\n") + "\n";
    const tmp = `${logPath}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, tail, "utf-8");
    fs.renameSync(tmp, logPath);
  } catch { /* non-fatal */ }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.mark) {
    try {
      fs.mkdirSync(path.dirname(args.marker), { recursive: true });
      fs.writeFileSync(args.marker, String(Date.now()), "utf-8");
    } catch (e) {
      process.stderr.write(`fleet-launch-summary --mark: ${e && e.message}\n`);
    }
    return;
  }

  const marker = readMarker(args.marker);
  const since = marker != null ? marker : Date.now() - FALLBACK_WINDOW_MS;
  const { perSlot, kept } = readEntries(args.log, since);

  const out = [];
  out.push("================================================================");
  out.push("  FLEET LAUNCH SUMMARY");
  if (perSlot.size === 0) {
    out.push(marker == null
      ? "  No launch marker and no recent tab decisions logged yet."
      : "  No tab decisions logged for this launch yet (tabs may still be starting).");
    out.push("================================================================");
    process.stdout.write(out.join("\n") + "\n");
    boundLog(args.log);
    return;
  }

  const buckets = new Map(BUCKET_ORDER.map((b) => [b, []]));
  const unknown = [];
  for (const [slot, info] of [...perSlot.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const b = BUCKET[info.action];
    if (b) buckets.get(b).push(slot);
    else unknown.push(`${slot}(${info.action})`);
  }

  for (const b of BUCKET_ORDER) {
    const slots = buckets.get(b);
    if (slots.length) out.push(`  ${BUCKET_LABEL[b].padEnd(24)}: ${slots.length}  ${slots.join(" ")}`);
  }
  if (unknown.length) out.push(`  ${"unrecognized action".padEnd(24)}: ${unknown.length}  ${unknown.join(" ")}`);

  const reported = perSlot.size;
  const denom = args.expected && args.expected > 0 ? `${reported} of ${args.expected}` : `${reported}`;
  out.push("  --------------------------------------------------------------");
  out.push(`  ${reported === 1 ? "1 slot" : `${reported} slots`} reported${args.expected ? ` (${denom})` : ""} this launch.`);
  if (args.expected && reported < args.expected) {
    out.push(`  ${args.expected - reported} expected slot(s) not yet reported -- a tab may be slow, skipped, or crashed.`);
  }
  out.push(`  Log: ${args.log.replace(/\\/g, "/")}  (kept ${kept} entr${kept === 1 ? "y" : "ies"} this launch)`);
  out.push("================================================================");
  process.stdout.write(out.join("\n") + "\n");

  boundLog(args.log);
}

try {
  main();
} catch (e) {
  // A summary must never break the launcher's tail.
  process.stderr.write(`fleet-launch-summary (non-fatal): ${e && e.stack ? e.stack : e}\n`);
}
