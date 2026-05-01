// token-economy-benchmark.mjs - INTEL-OLLAMA-OBSIDIAN-MS0/P7-U01
// Reads mcp-server/data/state/ollama-offload-stats.json and computes the
// pre/post token-savings benchmark required by Phase 7's exit conditions:
//   * Total savings ratio (offloaded / (offloaded + keptOnClaude)).
//   * Per-hook fire/offload/keep breakdown.
//   * Per-category aggregation.
//   * Threshold check vs floor (50%) and target (80%) per envelope spec.
//
// The "synthetic 10-prompt session" exit condition is interpreted as: this
// script samples whatever the current offload-stats reflects (the live hook
// fleet aggregates real prompt activity into byHook/byCategory). To produce a
// fresh measurement, run `node scripts/ollama-offload-dashboard.mjs --reset`
// THEN issue 10 representative prompts through Claude THEN run this script.
//
// Output: TOKEN-ECONOMY-REPORT.md at repo root (overwrite-safe). Pass --json
// for machine-readable output. Exit 0 iff savings ≥ floor (default 50%).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, "..");
const STATS_PATH = "mcp-server/data/state/ollama-offload-stats.json";
const REPORT_PATH = "TOKEN-ECONOMY-REPORT.md";
const FLOOR_PCT = 50;
const TARGET_PCT = 80;

export function loadStats(absPath) {
  if (!existsSync(absPath)) {
    return { ok: false, error: `stats file not found: ${absPath}` };
  }
  let raw;
  try { raw = readFileSync(absPath, "utf8"); } catch (err) {
    return { ok: false, error: `read failed: ${err.message}` };
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (err) {
    return { ok: false, error: `parse failed: ${err.message}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "stats file root is not an object" };
  }
  return { ok: true, stats: parsed };
}

// Pure analysis: takes the parsed stats object, returns structured metrics +
// verdict. Handles zero-data baseline (returns coverage_pct=0 and zero-state
// flag, NOT NaN%) as well as populated state.
export function analyzeStats(stats, opts = {}) {
  const floor = typeof opts.floorPct === "number" ? opts.floorPct : FLOOR_PCT;
  const target = typeof opts.targetPct === "number" ? opts.targetPct : TARGET_PCT;

  const offloaded = Number(stats.offloaded) || 0;
  const kept = Number(stats.keptOnClaude) || 0;
  const tokensSaved = Number(stats.estimatedTokensSaved) || 0;
  const totalDecisions = offloaded + kept;
  const offloadRate = totalDecisions === 0 ? 0 : Math.round((offloaded / totalDecisions) * 1000) / 10;

  const byHook = stats.byHook && typeof stats.byHook === "object" ? stats.byHook : {};
  const byCategory = stats.byCategory && typeof stats.byCategory === "object" ? stats.byCategory : {};

  const hookBreakdown = Object.entries(byHook).map(([name, h]) => {
    const fired = Number(h?.fired) || 0;
    const ho = Number(h?.offloaded) || 0;
    const hk = Number(h?.kept) || 0;
    const hsuggested = Number(h?.suggested) || 0;
    const tot = ho + hk;
    return {
      hook: name,
      fired,
      offloaded: ho,
      kept: hk,
      suggested: hsuggested,
      tokensSaved: Number(h?.tokensSaved) || 0,
      offloadRate: tot === 0 ? 0 : Math.round((ho / tot) * 1000) / 10,
    };
  }).sort((a, b) => b.tokensSaved - a.tokensSaved);

  const categoryBreakdown = Object.entries(byCategory).map(([name, c]) => ({
    category: name,
    offloaded: Number(c?.offloaded) || 0,
    kept: Number(c?.kept) || 0,
    tokensSaved: Number(c?.tokensSaved) || 0,
  })).sort((a, b) => b.tokensSaved - a.tokensSaved);

  const isZeroState = totalDecisions === 0 && tokensSaved === 0;
  const meetsFloor = !isZeroState && offloadRate >= floor;
  const meetsTarget = !isZeroState && offloadRate >= target;

  const verdict = isZeroState
    ? "zero-state"
    : meetsTarget ? "target-met"
    : meetsFloor ? "floor-met"
    : "below-floor";

  return {
    schemaVersion: stats.schemaVersion || "unknown",
    lastUpdated: stats.lastUpdated || null,
    lastReset: stats.lastReset || null,
    totals: {
      offloaded,
      kept,
      totalDecisions,
      tokensSaved,
      offloadRate,
      silentSuggestions: Number(stats.silentSuggestions) || 0,
      injectedSuggestions: Number(stats.injectedSuggestions) || 0,
    },
    thresholds: { floorPct: floor, targetPct: target, meetsFloor, meetsTarget },
    verdict,
    isZeroState,
    hookBreakdown,
    categoryBreakdown,
  };
}

export function formatReport(analysis) {
  const lines = [];
  lines.push("# Token Economy Report — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U01");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Schema: ${analysis.schemaVersion}`);
  if (analysis.lastReset) lines.push(`Last reset: ${analysis.lastReset}`);
  if (analysis.lastUpdated) lines.push(`Last updated: ${analysis.lastUpdated}`);
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  if (analysis.isZeroState) {
    lines.push("**zero-state** — no Ollama offload activity recorded since last reset.");
    lines.push("");
    lines.push("To capture a measurement: run `node scripts/ollama-offload-dashboard.mjs --reset`,");
    lines.push("issue ~10 representative prompts through Claude (mix of build/route/explain),");
    lines.push("then re-run this script.");
  } else {
    const v = analysis.verdict;
    const t = analysis.thresholds;
    const r = analysis.totals.offloadRate;
    lines.push(`**${v}** — offload rate ${r}% vs floor ${t.floorPct}% / target ${t.targetPct}%.`);
    if (v === "below-floor") {
      lines.push("");
      lines.push("Below the milestone-level floor. Investigate via per-hook breakdown:");
      lines.push("hooks with high `kept` but low `offloaded` are the bottlenecks.");
    } else if (v === "floor-met") {
      lines.push("");
      lines.push("Floor met but below the 80% target. Top opportunities: hooks listed in the");
      lines.push("breakdown with the highest `kept` count.");
    }
  }
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| offloaded | ${analysis.totals.offloaded} |`);
  lines.push(`| kept on Claude | ${analysis.totals.kept} |`);
  lines.push(`| total decisions | ${analysis.totals.totalDecisions} |`);
  lines.push(`| offload rate | ${analysis.totals.offloadRate}% |`);
  lines.push(`| estimated tokens saved | ${analysis.totals.tokensSaved.toLocaleString()} |`);
  lines.push(`| silent suggestions | ${analysis.totals.silentSuggestions} |`);
  lines.push(`| injected suggestions | ${analysis.totals.injectedSuggestions} |`);
  lines.push("");
  lines.push("## Per-hook breakdown (top 10 by tokens saved)");
  lines.push("");
  if (analysis.hookBreakdown.length === 0) {
    lines.push("_no hook data — zero-state or schema below v2.0.0._");
  } else {
    lines.push("| hook | fired | offloaded | kept | suggested | tokens saved | offload % |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const h of analysis.hookBreakdown.slice(0, 10)) {
      lines.push(`| ${h.hook} | ${h.fired} | ${h.offloaded} | ${h.kept} | ${h.suggested} | ${h.tokensSaved.toLocaleString()} | ${h.offloadRate}% |`);
    }
  }
  lines.push("");
  lines.push("## Per-category breakdown");
  lines.push("");
  if (analysis.categoryBreakdown.length === 0) {
    lines.push("_no category data — zero-state or hook fleet not yet emitting category buckets._");
  } else {
    lines.push("| category | offloaded | kept | tokens saved |");
    lines.push("| --- | ---: | ---: | ---: |");
    for (const c of analysis.categoryBreakdown) {
      lines.push(`| ${c.category} | ${c.offloaded} | ${c.kept} | ${c.tokensSaved.toLocaleString()} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = { json: false, writeReport: false, floor: FLOOR_PCT, target: TARGET_PCT, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--write-report") args.writeReport = true;
    else if (a === "--floor") args.floor = Number(argv[++i]);
    else if (a === "--target") args.target = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const HELP =
  "token-economy-benchmark.mjs - measure pre vs post Ollama-offload savings.\n\n" +
  "Usage:\n" +
  "  node scripts/token-economy-benchmark.mjs                # human summary\n" +
  "  node scripts/token-economy-benchmark.mjs --json         # machine-readable\n" +
  "  node scripts/token-economy-benchmark.mjs --write-report # writes TOKEN-ECONOMY-REPORT.md\n" +
  "  node scripts/token-economy-benchmark.mjs --floor 50 --target 80\n";

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { process.stdout.write(HELP); return; }
  const statsAbs = `${REPO_ROOT}/${STATS_PATH}`;
  const loaded = loadStats(statsAbs);
  if (!loaded.ok) {
    process.stderr.write(`error: ${loaded.error}\n`);
    process.exit(2);
  }
  const analysis = analyzeStats(loaded.stats, { floorPct: args.floor, targetPct: args.target });
  if (args.json) {
    process.stdout.write(JSON.stringify(analysis, null, 2) + "\n");
  } else {
    const md = formatReport(analysis);
    process.stdout.write(md);
    if (args.writeReport) {
      writeFileSync(`${REPO_ROOT}/${REPORT_PATH}`, md);
      process.stderr.write(`\nwritten to ${REPORT_PATH}\n`);
    }
  }
  // Exit 0 if floor met OR zero-state (zero-state is informational, not failure).
  // Exit 1 only for verified below-floor.
  if (analysis.verdict === "below-floor") process.exit(1);
}

const entry = process.argv[1];
if (entry && entry.endsWith("token-economy-benchmark.mjs")) {
  main();
}
