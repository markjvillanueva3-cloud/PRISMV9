#!/usr/bin/env node
/**
 * scripts/ollama-offload-dashboard.mjs
 *
 * Prints rolling-window Ollama offload telemetry from
 * `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0).
 *
 * Usage:
 *   node scripts/ollama-offload-dashboard.mjs              # human-readable, 24h window
 *   node scripts/ollama-offload-dashboard.mjs --json       # machine-readable
 *   node scripts/ollama-offload-dashboard.mjs --window=48h # custom window (max 168h)
 *   node scripts/ollama-offload-dashboard.mjs --reset      # zero counters + clear events
 *
 * Sections (per envelope INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03):
 *   - Totals (since reset) — offloaded / kept-on-claude / tokens saved
 *   - Last <window> activity — rolling event log filtered by --window
 *   - Per-hook fire counts — which hook fired, decision, tokensSaved
 *   - Advisory — actionable warnings (zero offloads, zero events, etc)
 *
 * Exit code 0 always (dashboard is read-only — never blocks anything).
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATS_PATH = resolve(HERE, "..", "mcp-server", "data", "state", "ollama-offload-stats.json");

const MAX_WINDOW_HOURS = 168; // 7 days
const DEFAULT_WINDOW_HOURS = 24;
const MAX_RECENT_EVENTS = 1000;

function parseArgs(argv) {
  const out = { json: false, reset: false, windowHours: DEFAULT_WINDOW_HOURS, statsPath: STATS_PATH };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a === "--reset") out.reset = true;
    else if (a.startsWith("--window=")) {
      const raw = a.slice("--window=".length);
      const m = /^(\d+)\s*h?$/i.exec(raw);
      if (!m) throw new Error(`bad --window: ${raw} (expected NhM hours, e.g. 48h)`);
      const hours = Math.min(MAX_WINDOW_HOURS, Math.max(1, parseInt(m[1], 10)));
      out.windowHours = hours;
    } else if (a.startsWith("--path=")) {
      out.statsPath = resolve(process.cwd(), a.slice("--path=".length));
    }
  }
  return out;
}

function emptyStats() {
  return {
    schemaVersion: "2.0.0",
    resetAt: new Date().toISOString(),
    totals: { offloaded: 0, keptOnClaude: 0, tokensSaved: 0, tokensSpent: 0 },
    perHook: {},
    recentEvents: [],
    config: { maxRecentEvents: MAX_RECENT_EVENTS, rollingWindowHours: DEFAULT_WINDOW_HOURS, milestone: "INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03" },
  };
}

function loadStats(path) {
  if (!existsSync(path)) return emptyStats();
  const raw = readFileSync(path, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`stats file ${path} is not valid JSON: ${e?.message ?? e}`);
  }
  if (parsed?.schemaVersion !== "2.0.0") {
    throw new Error(`stats schemaVersion ${parsed?.schemaVersion ?? "<missing>"} != "2.0.0"; run with --reset to upgrade`);
  }
  parsed.totals ??= { offloaded: 0, keptOnClaude: 0, tokensSaved: 0, tokensSpent: 0 };
  parsed.perHook ??= {};
  parsed.recentEvents ??= [];
  return parsed;
}

function filterByWindow(events, windowHours) {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  return events.filter((e) => {
    const t = Date.parse(e?.ts ?? "");
    return Number.isFinite(t) && t >= cutoff;
  });
}

function summarizeWindow(events) {
  const summary = { totalEvents: events.length, byDecision: { offload: 0, keep: 0, suggest: 0 }, tokensSaved: 0, tokensSpent: 0 };
  for (const e of events) {
    const d = (e?.decision ?? "").toLowerCase();
    if (d === "offload" || d === "keep" || d === "suggest") {
      summary.byDecision[d] += 1;
    }
    if (typeof e?.tokensSaved === "number" && Number.isFinite(e.tokensSaved)) summary.tokensSaved += e.tokensSaved;
    if (typeof e?.tokensSpent === "number" && Number.isFinite(e.tokensSpent)) summary.tokensSpent += e.tokensSpent;
  }
  return summary;
}

function summarizePerHook(perHook) {
  const rows = Object.entries(perHook).map(([hook, h]) => ({
    hook,
    fired: h?.fired ?? 0,
    offloaded: h?.offloaded ?? 0,
    kept: h?.kept ?? 0,
    suggested: h?.suggested ?? 0,
  }));
  rows.sort((a, b) => b.fired - a.fired);
  return rows;
}

function buildAdvisory(stats, windowSummary) {
  const advisory = [];
  if (stats.totals.offloaded === 0 && stats.totals.keptOnClaude === 0) {
    advisory.push("[empty] no offload events recorded since reset — verify ollama-auto-router is wired in UserPromptSubmit");
  }
  if (windowSummary.totalEvents === 0) {
    advisory.push("[empty-window] no events inside the rolling window — Ollama may be unreachable or hooks unwired");
  }
  if (
    stats.totals.offloaded === 0 &&
    stats.totals.keptOnClaude > 0
  ) {
    advisory.push("[no-offload] router is classifying tasks but Ollama path is failing — check http://127.0.0.1:11434/api/tags and .claude/cache/ollama-rate-limit.json");
  }
  const ratio = (stats.totals.offloaded + stats.totals.keptOnClaude) > 0
    ? stats.totals.offloaded / (stats.totals.offloaded + stats.totals.keptOnClaude)
    : 0;
  if (ratio > 0 && ratio < 0.30) {
    advisory.push(`[low-rate] offload rate ${(ratio * 100).toFixed(1)}% is below 30% target — review router heuristics`);
  }
  return advisory;
}

function renderHuman(stats, windowSummary, perHookRows, advisory, windowHours) {
  const lines = [];
  const t = stats.totals;
  lines.push("=".repeat(60));
  lines.push(`Ollama Offload Dashboard — schema ${stats.schemaVersion}`);
  lines.push(`Reset at: ${stats.resetAt}`);
  lines.push("=".repeat(60));
  lines.push("");
  lines.push("TOTALS (since reset)");
  lines.push(`  Offloaded to Ollama : ${t.offloaded}`);
  lines.push(`  Kept on Claude      : ${t.keptOnClaude}`);
  lines.push(`  Tokens saved        : ${t.tokensSaved}`);
  lines.push(`  Tokens spent        : ${t.tokensSpent}`);
  lines.push("");
  lines.push(`LAST ${windowHours}h ACTIVITY`);
  lines.push(`  Events in window    : ${windowSummary.totalEvents}`);
  lines.push(`  Offloads            : ${windowSummary.byDecision.offload}`);
  lines.push(`  Keeps               : ${windowSummary.byDecision.keep}`);
  lines.push(`  Suggests            : ${windowSummary.byDecision.suggest}`);
  lines.push(`  Tokens saved        : ${windowSummary.tokensSaved}`);
  lines.push(`  Tokens spent        : ${windowSummary.tokensSpent}`);
  lines.push("");
  lines.push("PER-HOOK FIRE COUNTS");
  if (perHookRows.length === 0) {
    lines.push("  (no hooks have logged events yet)");
  } else {
    for (const r of perHookRows) {
      lines.push(`  ${r.hook.padEnd(40)} fired=${String(r.fired).padStart(5)}  offloaded=${String(r.offloaded).padStart(5)}  kept=${String(r.kept).padStart(5)}`);
    }
  }
  lines.push("");
  lines.push("ADVISORY");
  if (advisory.length === 0) {
    lines.push("  (no warnings — telemetry healthy)");
  } else {
    for (const a of advisory) lines.push(`  ${a}`);
  }
  lines.push("");
  lines.push("=".repeat(60));
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.reset) {
    const reset = emptyStats();
    writeFileSync(args.statsPath, JSON.stringify(reset, null, 2) + "\n", "utf8");
    if (args.json) {
      process.stdout.write(JSON.stringify({ ok: true, action: "reset", path: args.statsPath, schemaVersion: reset.schemaVersion }) + "\n");
    } else {
      process.stdout.write(`reset: ${args.statsPath}\nschemaVersion: ${reset.schemaVersion}\n`);
    }
    return;
  }

  const stats = loadStats(args.statsPath);
  const windowEvents = filterByWindow(stats.recentEvents, args.windowHours);
  const windowSummary = summarizeWindow(windowEvents);
  const perHookRows = summarizePerHook(stats.perHook);
  const advisory = buildAdvisory(stats, windowSummary);

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          schemaVersion: stats.schemaVersion,
          resetAt: stats.resetAt,
          totals: stats.totals,
          window: { hours: args.windowHours, ...windowSummary },
          perHook: perHookRows,
          advisory,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(renderHuman(stats, windowSummary, perHookRows, advisory, args.windowHours) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[ollama-offload-dashboard] ${err?.message ?? err}\n`);
  process.exit(0);
});
