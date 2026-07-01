#!/usr/bin/env node
// scripts/rtk-archive-dashboard.mjs — consumer for state/shared/rtk-archive.jsonl
//
// Sister to scripts/ollama-offload-dashboard.mjs. The rtk-archive-and-index
// PostToolUse:Bash hook appends every `rtk <cmd>` invocation to
// state/shared/rtk-archive.jsonl (cmd, output, savings estimate, session_id).
// Without a consumer, that data is a write-only audit log — this dashboard
// turns it into actionable signal: most-repeated commands (where rtk pays the
// most across the 13-chat fleet), cumulative savings estimate, per-session
// fanout.
//
// Activated 2026-05-18 (slot kilo) when the writer hook was wired into
// PostToolUse:Bash. Until the first rtk command runs after that wiring,
// the archive jsonl won't exist and the dashboard reports "no archive yet"
// rather than crashing (R12 fail-loud).
//
// Usage:
//   node H:/prism/scripts/rtk-archive-dashboard.mjs           # human-readable
//   node H:/prism/scripts/rtk-archive-dashboard.mjs --json    # machine-readable
//   node H:/prism/scripts/rtk-archive-dashboard.mjs --window=24h  # time window
//   node H:/prism/scripts/rtk-archive-dashboard.mjs --top=10      # top-N most-repeated commands
//
// Exit codes:
//   0 = OK (or archive empty, advisory)
//   1 = invalid arg / unreadable archive

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ARCHIVE_FILE = process.env.PRISM_RTK_ARCHIVE_FILE
  || "H:/prism/state/shared/rtk-archive.jsonl";

// Window parsing: "24h" → 24*3600*1000 ms, "7d" → 7*86400*1000, "168h" max
const MAX_WINDOW_MS = 168 * 3600 * 1000;
const DEFAULT_WINDOW_MS = 24 * 3600 * 1000;
const DEFAULT_TOP_N = 10;
const SAVINGS_LINES_THRESHOLD = 20; // matches rtk-archive-and-index.estimateSavings

export function parseWindow(spec) {
  if (typeof spec !== "string" || spec.length === 0) return DEFAULT_WINDOW_MS;
  const m = spec.match(/^(\d+)([hd])$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = unit === "d" ? n * 86400_000 : n * 3600_000;
  return Math.min(ms, MAX_WINDOW_MS);
}

export function parseArgs(argv) {
  const out = { json: false, window: DEFAULT_WINDOW_MS, top: DEFAULT_TOP_N, archive: ARCHIVE_FILE };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a.startsWith("--window=")) {
      const w = parseWindow(a.slice("--window=".length));
      if (w === null) { out.error = `invalid --window: ${a}`; return out; }
      out.window = w;
    } else if (a.startsWith("--top=")) {
      const n = Number.parseInt(a.slice("--top=".length), 10);
      if (!Number.isFinite(n) || n <= 0 || n > 100) { out.error = `invalid --top: ${a}`; return out; }
      out.top = n;
    } else if (a.startsWith("--archive=")) out.archive = a.slice("--archive=".length);
    else if (a === "--help" || a === "-h") out.help = true;
    else { out.error = `unknown arg: ${a}`; return out; }
  }
  return out;
}

export function readArchive(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, entries: [] };
  const raw = fs.readFileSync(filePath, "utf8");
  const entries = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { /* skip malformed line, fail-soft */ }
  }
  return { exists: true, entries };
}

export function aggregate(entries, { window, top, now }) {
  const cutoff = now - window;
  const inWindow = entries.filter((e) => {
    const ts = Date.parse(e.captured_at);
    return Number.isFinite(ts) && ts >= cutoff;
  });

  const byCmd = new Map();
  const sessions = new Set();
  let highSavingsCount = 0;
  let totalLines = 0;
  for (const e of inWindow) {
    const key = e.cmd_hash || "unknown";
    const cur = byCmd.get(key) || { count: 0, command: e.command || "", totalLines: 0 };
    cur.count += 1;
    cur.totalLines += e.savings?.lines ?? 0;
    byCmd.set(key, cur);
    if (e.session_id) sessions.add(e.session_id);
    if (e.savings?.likelyHigh) highSavingsCount += 1;
    totalLines += e.savings?.lines ?? 0;
  }

  const topCmds = [...byCmd.entries()]
    .map(([hash, v]) => ({ cmd_hash: hash, count: v.count, command: v.command, totalLines: v.totalLines }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);

  return {
    lifetime_entries: entries.length,
    window_entries: inWindow.length,
    window_ms: window,
    unique_commands: byCmd.size,
    unique_sessions: sessions.size,
    high_savings_count: highSavingsCount,
    total_lines: totalLines,
    top_commands: topCmds,
  };
}

function formatHuman(stats, archiveExists) {
  if (!archiveExists) {
    return [
      "RTK Archive Dashboard",
      "═══════════════════════",
      "",
      "No archive yet. The writer hook .claude/hooks/rtk-archive-and-index.mjs is wired",
      "PostToolUse:Bash — the archive file will be created on the first `rtk <cmd>`",
      "invocation in any chat session on this host.",
      "",
      `Expected location: ${ARCHIVE_FILE}`,
      "",
      "Disable writer:    PRISM_RTK_ARCHIVE_DISABLE=1",
      "Override location: PRISM_RTK_ARCHIVE_FILE=<path>",
    ].join("\n");
  }
  const lines = [
    "RTK Archive Dashboard",
    "═══════════════════════",
    "",
    `Lifetime archived entries: ${stats.lifetime_entries}`,
    `Window (${(stats.window_ms / 3600_000).toFixed(0)}h) entries:    ${stats.window_entries}`,
    `Unique commands in window: ${stats.unique_commands}`,
    `Unique sessions in window: ${stats.unique_sessions}`,
    `High-savings invocations:  ${stats.high_savings_count}/${stats.window_entries} (output <${SAVINGS_LINES_THRESHOLD} lines)`,
    `Total lines emitted:       ${stats.total_lines}`,
    "",
    `Top ${stats.top_commands.length} commands by repeat count:`,
  ];
  if (stats.top_commands.length === 0) {
    lines.push("  (no commands in window)");
  } else {
    for (const c of stats.top_commands) {
      const cmd = (c.command || c.cmd_hash).slice(0, 78);
      lines.push(`  ${String(c.count).padStart(4)}× — ${cmd}`);
    }
  }
  lines.push("");
  lines.push("Wiring: .claude/hooks/rtk-archive-and-index.mjs PostToolUse:Bash");
  lines.push("Source: " + ARCHIVE_FILE);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) { process.stderr.write(`rtk-archive-dashboard: ${args.error}\n`); process.exit(1); }
  if (args.help) {
    process.stdout.write([
      "rtk-archive-dashboard — fleet rtk-savings consumer",
      "",
      "Usage:",
      "  node scripts/rtk-archive-dashboard.mjs [--json] [--window=24h|7d] [--top=10]",
      "",
      "Reads state/shared/rtk-archive.jsonl written by .claude/hooks/rtk-archive-and-index.mjs.",
    ].join("\n") + "\n");
    return;
  }
  const { exists, entries } = readArchive(args.archive);
  if (!exists) {
    if (args.json) process.stdout.write(JSON.stringify({ archive_exists: false, message: "no archive yet" }, null, 2) + "\n");
    else process.stdout.write(formatHuman(null, false) + "\n");
    return;
  }
  const stats = aggregate(entries, { window: args.window, top: args.top, now: Date.now() });
  if (args.json) process.stdout.write(JSON.stringify({ archive_exists: true, ...stats }, null, 2) + "\n");
  else process.stdout.write(formatHuman(stats, true) + "\n");
}

// Idiomatic ESM entrypoint detection — pathToFileURL handles Windows
// triple-slash drive form (file:///H:/…) byte-equivalence with import.meta.url.
// Falls back to a basename suffix check when invoked under unusual harnesses
// (e.g., test runners that may not set argv[1] to a real path).
const isEntry = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;
if (isEntry || process.argv[1]?.endsWith("rtk-archive-dashboard.mjs")) {
  main();
}
