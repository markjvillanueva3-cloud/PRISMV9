#!/usr/bin/env node
/**
 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
 *
 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
 * and prints:
 *   1. Top-line totals (since last reset)
 *   2. Per-hook fire counts (which hooks are doing the routing)
 *   3. Last 24h activity from the rolling event log
 *   4. Actionable advisory (e.g., zero offloads → check Ollama wiring)
 *
 * Flags:
 *   --json    machine-readable output
 *   --window=Nh  custom event window in hours (default 24, max 168)
 *   --reset   zero counters and clear events (writes back to file)
 *   --help    usage
 *
 * Exit:
 *   0 — printed (or reset) successfully
 *   1 — stats file missing / unreadable
 *   2 — schema mismatch (file exists but wrong shape)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const SCHEMA_VERSION = "2.0.0";
const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 168;
const HOUR_MS = 60 * 60 * 1000;

function parseArgs(argv) {
  const out = { json: false, reset: false, help: false, windowHours: DEFAULT_WINDOW_HOURS };
  for (const arg of argv.slice(2)) {
    if (arg === "--json") out.json = true;
    else if (arg === "--reset") out.reset = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("--window=")) {
      const raw = arg.slice("--window=".length).replace(/h$/i, "");
      const v = Number(raw);
      if (!Number.isFinite(v) || v <= 0) {
        process.stderr.write(`Invalid --window: ${arg}\n`);
        process.exit(2);
      }
      out.windowHours = Math.min(v, MAX_WINDOW_HOURS);
    }
  }
  return out;
}

function loadStats() {
  if (!existsSync(STATS_PATH)) {
    process.stderr.write(`Stats file not found: ${STATS_PATH}\n`);
    process.exit(1);
  }
  let raw;
  try {
    raw = readFileSync(STATS_PATH, "utf8");
  } catch (e) {
    process.stderr.write(`Cannot read stats file: ${e?.message ?? e}\n`);
    process.exit(1);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`Stats file is not valid JSON: ${e?.message ?? e}\n`);
    process.exit(2);
  }
  return json;
}

function summarize(stats, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const events = Array.isArray(stats.events) ? stats.events : [];
  const recent = events.filter((e) => {
    const t = Date.parse(e?.ts);
    return Number.isFinite(t) && t >= cutoff;
  });

  const decisionCounts = { offload: 0, keep: 0, suggest: 0, other: 0 };
  let recentTokensSaved = 0;
  for (const e of recent) {
    const k = decisionCounts[e.decision] !== undefined ? e.decision : "other";
    decisionCounts[k]++;
    if (typeof e.tokensSaved === "number" && Number.isFinite(e.tokensSaved)) {
      recentTokensSaved += e.tokensSaved;
    }
  }

  return {
    totals: {
      offloaded: stats.offloaded ?? 0,
      keptOnClaude: stats.keptOnClaude ?? 0,
      estimatedTokensSaved: stats.estimatedTokensSaved ?? 0,
      silentSuggestions: stats.silentSuggestions ?? 0,
      injectedSuggestions: stats.injectedSuggestions ?? 0,
    },
    byHook: stats.byHook ?? {},
    byCategory: stats.byCategory ?? {},
    recent: {
      windowHours: windowMs / HOUR_MS,
      eventCount: recent.length,
      decisions: decisionCounts,
      tokensSaved: recentTokensSaved,
    },
    lastUpdated: stats.lastUpdated ?? null,
    lastReset: stats.lastReset ?? null,
    schemaVersion: stats.schemaVersion ?? null,
  };
}

function advisory(summary) {
  const t = summary.totals;
  const tried = t.offloaded + t.keptOnClaude;
  const lines = [];
  if (tried === 0) {
    lines.push("No tasks have been classified yet — hook may not be wired.");
  } else if (t.offloaded === 0) {
    lines.push(`${t.keptOnClaude} tasks classified, 0 offloaded — check Ollama daemon and rate limits.`);
  } else {
    const rate = ((t.offloaded / tried) * 100).toFixed(1);
    lines.push(`Offload rate: ${rate}% (${t.offloaded}/${tried} tasks routed to Ollama).`);
  }
  if (summary.recent.eventCount === 0) {
    lines.push(`No events in last ${summary.recent.windowHours}h.`);
  }
  return lines;
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printHuman(summary) {
  const t = summary.totals;
  const r = summary.recent;
  console.log("=== Ollama Offload Dashboard ===");
  console.log(`Schema:       ${summary.schemaVersion ?? "(unknown)"}`);
  console.log(`Last update:  ${summary.lastUpdated ?? "(never)"}`);
  console.log(`Last reset:   ${summary.lastReset ?? "(never)"}`);
  console.log("");
  console.log("Totals (since reset):");
  console.log(`  offloaded:               ${t.offloaded}`);
  console.log(`  kept on Claude:          ${t.keptOnClaude}`);
  console.log(`  estimated tokens saved:  ${t.estimatedTokensSaved}`);
  console.log(`  suggestions (silent):    ${t.silentSuggestions}`);
  console.log(`  suggestions (injected):  ${t.injectedSuggestions}`);
  console.log("");
  console.log(`Last ${r.windowHours}h activity:`);
  console.log(`  events:        ${r.eventCount}`);
  console.log(`  offloads:      ${r.decisions.offload}`);
  console.log(`  keeps:         ${r.decisions.keep}`);
  console.log(`  suggests:      ${r.decisions.suggest}`);
  console.log(`  tokens saved:  ${r.tokensSaved}`);
  console.log("");
  const hooks = Object.keys(summary.byHook).sort();
  if (hooks.length === 0) {
    console.log("Per-hook fire counts: (none recorded)");
  } else {
    console.log("Per-hook fire counts:");
    for (const h of hooks) {
      const v = summary.byHook[h] || {};
      console.log(`  ${pad(h, 30)} fired=${v.fired ?? 0} offload=${v.offloaded ?? 0} keep=${v.kept ?? 0} suggest=${v.suggested ?? 0}`);
    }
  }
  console.log("");
  const categories = Object.keys(summary.byCategory).sort();
  if (categories.length > 0) {
    console.log("By category:");
    for (const k of categories) console.log(`  ${pad(k, 30)} ${summary.byCategory[k]}`);
    console.log("");
  }
  console.log("Advisory:");
  for (const line of advisory(summary)) console.log(`  - ${line}`);
}

function resetStats(stats) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: now,
    lastReset: now,
    offloaded: 0,
    keptOnClaude: 0,
    estimatedTokensSaved: 0,
    silentSuggestions: 0,
    injectedSuggestions: 0,
    byCategory: {},
    byHook: {},
    events: [],
  };
}

function printHelp() {
  console.log(`Usage: node scripts/ollama-offload-dashboard.mjs [--json] [--window=Nh] [--reset]

Flags:
  --json       Output machine-readable JSON instead of human text
  --window=Nh  Event window in hours (default ${DEFAULT_WINDOW_HOURS}, max ${MAX_WINDOW_HOURS})
  --reset      Zero counters and clear events (writes back to file)
  --help       Show this message

Exit codes: 0 success, 1 file missing, 2 invalid args/schema`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return; }

  const stats = loadStats();

  if (args.reset) {
    const fresh = resetStats(stats);
    try {
      writeFileSync(STATS_PATH, JSON.stringify(fresh, null, 2));
    } catch (e) {
      process.stderr.write(`Could not write stats file: ${e?.message ?? e}\n`);
      process.exit(1);
    }
    if (args.json) console.log(JSON.stringify({ ok: true, reset: true, lastReset: fresh.lastReset }));
    else console.log(`Stats reset at ${fresh.lastReset}.`);
    return;
  }

  const summary = summarize(stats, args.windowHours * HOUR_MS);
  if (args.json) {
    console.log(JSON.stringify({ ...summary, advisory: advisory(summary) }, null, 2));
  } else {
    printHuman(summary);
  }
}

main();
