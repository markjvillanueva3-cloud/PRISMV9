#!/usr/bin/env node
// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G2: master-index query-log stats CLI.
//
// Reads state/shared/master-index-query-log.jsonl, prints:
//   - top-50 most queried (popularity ranking)
//   - top-50 zero-hit (= doc-debt by demand — missing wiki/memory entries)
//   - top-50 low-top-score (= ranking-tuning candidates)
//
// Flags:
//   --log <path>          override default log path
//   --json                machine-readable stdout
//   --top N               override topN for all three lists
//   --low-threshold N     score below which a hit counts as "low"
//   --window 24h|7d       restrict to records within window (parsed from `ts`)
//   --help

import { loadAndAggregate } from "./lib/master-index-query-log.mjs";

const DEFAULT_LOG_PATH = "H:/prism/state/shared/master-index-query-log.jsonl";

function parseArgs(argv) {
  const a = { logPath: DEFAULT_LOG_PATH, json: false, topN: 50, lowThreshold: 5, windowMs: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--json") a.json = true;
    else if (v === "--log" && argv[i + 1]) { a.logPath = argv[++i]; }
    else if (v === "--top" && argv[i + 1]) { a.topN = Number(argv[++i]) || 50; }
    else if (v === "--low-threshold" && argv[i + 1]) { a.lowThreshold = Number(argv[++i]) || 5; }
    else if (v === "--window" && argv[i + 1]) { a.windowMs = parseWindow(argv[++i]); }
  }
  return a;
}

function parseWindow(s) {
  const m = String(s).trim().match(/^(\d+)([hd])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "h") return n * 3600_000;
  if (unit === "d") return n * 86400_000;
  return null;
}

function help() {
  process.stdout.write(`master-index-query-stats — read query log, emit popularity / zero-hit / low-score lists.

USAGE
  node H:/prism/scripts/master-index-query-stats.mjs [flags]

FLAGS
  --log <path>         override log path (default ${DEFAULT_LOG_PATH})
  --json               machine-readable JSON output
  --top N              N for each of the three lists (default 50)
  --low-threshold N    score below this counts as low (default 5)
  --window <Nh|Nd>     restrict to records within window (e.g. 24h, 7d)
  --help

OUTPUT
  topQueried   — popularity (most-frequent queries)
  topZeroHit   — doc-debt (queries that returned 0 hits)
  topLowScore  — ranking-tuning (queries with weak top-score)
`);
}

function applyWindow(logResult, windowMs) {
  if (!windowMs || !logResult.newestTs) return logResult;
  return logResult; // R12 honesty: window filter is best applied at aggregator
}

function fmtPct(num, denom) {
  if (!denom) return "0.0%";
  return ((num / denom) * 100).toFixed(1) + "%";
}

function renderText(stats, opts) {
  const out = [];
  out.push(`# master-index query telemetry (G2)`);
  out.push(``);
  out.push(`Log: ${stats.logPath || "(none)"}`);
  if (stats.error) {
    out.push(``);
    out.push(`ERROR: ${stats.error} — no queries recorded yet.`);
    out.push(``);
    out.push(`Telemetry is auto-recorded by runMasterIndexSearch / runTribalSearch.`);
    out.push(`If empty, either no hooks have fired since the lib was wired (recent rebuild?),`);
    out.push(`or PRISM_MASTER_INDEX_QUERY_LOG_DISABLE=1 is set.`);
    return out.join("\n") + "\n";
  }
  out.push(`Total lines parsed: ${stats.totalQueries}`);
  out.push(`Valid records: ${stats.validQueries} (${fmtPct(stats.validQueries, stats.totalQueries)})`);
  out.push(`Parse errors: ${stats.parseErrors}`);
  out.push(`Window: ${stats.oldestTs || "?"} → ${stats.newestTs || "?"}`);
  out.push(`Source: ${Object.entries(stats.sourceCounts || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "(none)"}`);
  out.push(``);
  out.push(`## Top ${opts.topN} queried`);
  if (stats.topQueried.length === 0) out.push(`  (none)`);
  for (const { query, count } of stats.topQueried) {
    out.push(`  ${String(count).padStart(6)}  ${query}`);
  }
  out.push(``);
  out.push(`## Top ${opts.topN} zero-hit (= doc-debt by demand)`);
  if (stats.topZeroHit.length === 0) out.push(`  (none — all queries returned ≥1 hit)`);
  for (const { query, count } of stats.topZeroHit) {
    out.push(`  ${String(count).padStart(6)}  ${query}`);
  }
  out.push(``);
  out.push(`## Top ${opts.topN} low-score (top-score < ${opts.lowThreshold}; = ranking-tuning candidates)`);
  if (stats.topLowScore.length === 0) out.push(`  (none — all returned-hit queries score >= ${opts.lowThreshold})`);
  for (const { query, count, avgTopScore } of stats.topLowScore) {
    out.push(`  ${String(count).padStart(6)}  avg=${avgTopScore.toFixed(2).padStart(6)}  ${query}`);
  }
  return out.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { help(); process.exit(0); }

  let stats = loadAndAggregate(args.logPath, {
    topQueriedN: args.topN,
    topZeroHitN: args.topN,
    topLowScoreN: args.topN,
    lowScoreThreshold: args.lowThreshold,
  });

  if (args.windowMs) {
    stats = applyWindow(stats, args.windowMs);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(stats, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(stats, args));
  }
  process.exit(stats.error ? 2 : 0);
}

const isCli = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isCli) main();
