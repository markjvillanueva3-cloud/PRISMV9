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
import { pathToFileURL } from "node:url";

const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const SCHEMA_VERSION = "2.0.0";
const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 168;
const HOUR_MS = 60 * 60 * 1000;

// OLLAMA-EXPAND-MS0 / U-OE-DASH-KEEP-BREAKDOWN (2026-05-18, slot charlie):
// Categories the offloader correctly keeps on Claude by design — multi-tool
// control-flow, deep reasoning, git/operator work. Surfaced in the dashboard
// so a 10.9% offload rate doesn't read as "90% missed" when most of those
// keeps are correctly-categorized Claude-only work. Synced with the
// KEEP_ON_CLAUDE list in .claude/hooks/ollama-task-offloader.mjs — drift
// is caught by scripts/__tests__/ollama-offload-dashboard.test.mjs
// "drift-guard: every keep-emitting category in the hook is in dashboard's set"
// which regex-scans the hook source on every test run.
const CORRECT_KEEP_CATEGORIES = new Set([
  "orchestration",
  "multi_file",
  "git_ops",
  "deep_reasoning",
  "operator_directive",
  // coordination_directive: the hook (ollama-task-offloader.mjs) emits this keep for
  // "check in to <slot>" / "coordinate with X" / "first do A then B" -- cross-slot
  // coordination + sequencing = R5 judgment/orchestration that MUST stay on Claude.
  // Was missing here (drift the test caught 2026-06-10), so coordination keeps were
  // wrongly counted as offloadable -> deflated the adjusted rate. Excluding them is
  // correct + makes the adjusted (health) rate accurate.
  "coordination_directive",
  "safety_physics",
]);

// U-REAPER-COORD-NOISE (2026-05-18, slot delta):
// Suggest categories that record INFRASTRUCTURE MUTATIONS (Ollama model
// prewarms, routing-hint writes) — NOT routing recommendations. These are
// emitted by scripts/fleet-reaper-sweep.mjs's `fleet-reaper-coordinator`
// hook on every sweep (5-min cron) and were previously classified as
// "silent suggests" — inflating the suggest count by ~70% (859 fires /
// 24h, 100% suggest-only). With this set, the dashboard separates
// infra-noise from real Ollama-offload suggestions so the signal/noise
// ratio reflects routing decisions, not infra telemetry.
//
// KEEP-IN-SYNC with the `recordEvent` calls in fleet-reaper-sweep.mjs
// that emit `decision: "suggest"`. The drift-guard test scans the
// fleet-reaper source on every test run.
const INFRA_SUGGEST_CATEGORIES = new Set([
  "fleet-reaper-prewarm",
  "fleet-reaper-hint",
]);

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

export function summarize(stats, windowMs, nowMs = Date.now()) {
  const cutoff = nowMs - windowMs;
  const events = Array.isArray(stats.events) ? stats.events : [];
  const recent = events.filter((e) => {
    const t = Date.parse(e?.ts);
    return Number.isFinite(t) && t >= cutoff;
  });

  const decisionCounts = { offload: 0, keep: 0, suggest: 0, other: 0 };
  const keepByCategory = Object.create(null);
  const offloadByCategory = Object.create(null);
  const suggestByCategory = Object.create(null);
  let recentTokensSaved = 0;
  let correctKeepCount = 0;
  let unclassifiedKeepCount = 0;
  // U-REAPER-COORD-NOISE: separate infra-mutation suggests from real
  // Ollama-routing suggests so dashboard signal/noise reflects routing.
  let infraSuggestCount = 0;
  let routingSuggestCount = 0;
  // U-OFFLOAD-ACTION (2026-06-12, scrutiny P1): EXECUTED offloads (ask-ollama
  // actually ran -- event.mode === "executed") are the ADOPTION metric. They
  // must NOT feed the directive-time decision counts / token sums / rates, or
  // one adopted action counts twice and the rate inflates exactly as adoption
  // succeeds. Segmented here, surfaced as recent.executed* + adoptionRate.
  let executedOffloads = 0;
  let executedTokensSaved = 0;
  for (const e of recent) {
    if (e.decision === "offload" && e.mode === "executed") {
      executedOffloads++;
      if (typeof e.tokensSaved === "number" && Number.isFinite(e.tokensSaved)) {
        executedTokensSaved += e.tokensSaved;
      }
      continue;
    }
    const k = decisionCounts[e.decision] !== undefined ? e.decision : "other";
    decisionCounts[k]++;
    // U-OE-DASH-KEEP-BREAKDOWN P1 (arm-B): tokensSaved is only emitted on
    // `decision === "offload"` events by the producer (see lib/ollama-stats.mjs
    // bumpHookCounter — it adds to h.tokensSaved on every decision but the
    // PRODUCER hooks only ever set tokensSaved on offload). Gate accumulation
    // here so a malformed suggest/keep with a stray tokensSaved field cannot
    // inflate the headline metric. Fail-loud (R12): the metric must mean what
    // it says — "tokens saved by offloading" — not "any tokensSaved field we
    // happened to see."
    if (e.decision === "offload" && typeof e.tokensSaved === "number" && Number.isFinite(e.tokensSaved)) {
      recentTokensSaved += e.tokensSaved;
    }
    if (e.decision === "keep") {
      const cat = typeof e.category === "string" && e.category ? e.category : "unknown";
      keepByCategory[cat] = (keepByCategory[cat] || 0) + 1;
      if (CORRECT_KEEP_CATEGORIES.has(cat)) correctKeepCount++;
      else unclassifiedKeepCount++;
    } else if (e.decision === "offload") {
      const cat = typeof e.category === "string" && e.category ? e.category : "unknown";
      offloadByCategory[cat] = (offloadByCategory[cat] || 0) + 1;
    } else if (e.decision === "suggest") {
      const cat = typeof e.category === "string" && e.category ? e.category : "unknown";
      suggestByCategory[cat] = (suggestByCategory[cat] || 0) + 1;
      if (INFRA_SUGGEST_CATEGORIES.has(cat)) infraSuggestCount++;
      else routingSuggestCount++;
    }
  }
  const totalKeeps = decisionCounts.keep;
  const totalOffloads = decisionCounts.offload;
  // Adjusted rate: of the work where Ollama COULD have been a candidate
  // (offloads + non-correctly-categorized keeps), how much actually offloaded?
  // Falls back to NaN when denominator is 0 (no signal).
  const adjustedDenom = totalOffloads + unclassifiedKeepCount;
  const adjustedRate = adjustedDenom > 0 ? totalOffloads / adjustedDenom : NaN;
  const rawDenom = totalOffloads + totalKeeps;
  const rawRate = rawDenom > 0 ? totalOffloads / rawDenom : NaN;

  return {
    totals: {
      offloaded: stats.offloaded ?? 0,
      keptOnClaude: stats.keptOnClaude ?? 0,
      estimatedTokensSaved: stats.estimatedTokensSaved ?? 0,
      silentSuggestions: stats.silentSuggestions ?? 0,
      injectedSuggestions: stats.injectedSuggestions ?? 0,
      // U-OFFLOAD-ACTION: lifetime ADOPTION totals (segmented in bumpTotals).
      executedOffloads: stats.executedOffloads ?? 0,
      measuredTokensSaved: stats.measuredTokensSaved ?? 0,
    },
    byHook: stats.byHook ?? {},
    byCategory: stats.byCategory ?? {},
    recent: {
      windowHours: windowMs / HOUR_MS,
      eventCount: recent.length,
      decisions: decisionCounts,
      tokensSaved: recentTokensSaved,
      keepBreakdown: keepByCategory,
      offloadBreakdown: offloadByCategory,
      suggestBreakdown: suggestByCategory,
      correctKeepCount,
      unclassifiedKeepCount,
      infraSuggestCount,
      routingSuggestCount,
      rawOffloadRate: rawRate,
      adjustedOffloadRate: adjustedRate,
      // U-OFFLOAD-ACTION adoption sub-metric: of the directives issued in the
      // window, how many offloads actually EXECUTED locally (ask-ollama runs).
      // >1.0 is possible (standalone CLI runs without a same-window directive).
      executedOffloads,
      executedTokensSaved,
      adoptionRate: totalOffloads > 0 ? executedOffloads / totalOffloads : NaN,
    },
    lastUpdated: stats.lastUpdated ?? null,
    lastReset: stats.lastReset ?? null,
    schemaVersion: stats.schemaVersion ?? null,
  };
}

// Drift-guard against `.claude/hooks/ollama-task-offloader.mjs` KEEP_ON_CLAUDE
// list. Exported so the test can fail loud if a category is added there but
// not here. Returns {ok, missing[]} — missing list = categories in hook but
// not in CORRECT_KEEP_CATEGORIES.
export function correctKeepCategorySet() {
  return new Set(CORRECT_KEEP_CATEGORIES);
}

// Drift-guard against scripts/fleet-reaper-sweep.mjs's `recordEvent` calls
// that emit `decision: "suggest"`. Exported so the test can fail loud if
// the fleet-reaper-coordinator emits a new infra-suggest category that's
// not in this set (which would re-introduce noise).
export function infraSuggestCategorySet() {
  return new Set(INFRA_SUGGEST_CATEGORIES);
}

export function advisory(summary) {
  const t = summary.totals;
  const tried = t.offloaded + t.keptOnClaude;
  const r = summary.recent;
  const lines = [];
  if (tried === 0) {
    lines.push("No tasks have been classified yet — hook may not be wired.");
  } else if (t.offloaded === 0) {
    lines.push(`${t.keptOnClaude} tasks classified, 0 offloaded — check Ollama daemon and rate limits.`);
  } else {
    const rate = ((t.offloaded / tried) * 100).toFixed(1);
    lines.push(`Offload rate (lifetime, raw): ${rate}% (${t.offloaded}/${tried} tasks routed to Ollama).`);
    // U-OFFLOAD-RATE-HEADLINE-HONESTY (2026-06-10): the RAW lifetime rate is NOT the
    // health metric -- it counts correctly-kept Claude-only work (orchestration /
    // judgment / safety, per R5) in the denominator, so it reads artificially low.
    // Surfaced inline because the bare raw number recurrently gets mis-read as
    // "below the >=30% target" and triggers a wasted hunt for a non-problem (happened
    // to two sessions + a /goal Stop-hook on 2026-06-10). The >=30% target applies to
    // the ADJUSTED rate (offloads / offloadABLE work), shown in the window line below.
    lines.push(`  ^ raw is NOT the health metric: it includes correctly-kept Claude-only work (R5). The >=30% target is the ADJUSTED rate (offloads / offloadABLE), in the window line below. Do NOT chase the raw number as an inefficiency.`);
  }
  if (r.eventCount === 0) {
    lines.push(`No events in last ${r.windowHours}h.`);
  } else if (Number.isFinite(r.adjustedOffloadRate) && Number.isFinite(r.rawOffloadRate)) {
    // Show the adjusted rate when the unclassified-keep pool is the real
    // candidate set. The raw rate counts correctly-kept orchestration as
    // "missed", which is misleading — a 10% raw rate with 80% correct keeps
    // is healthier than a 10% raw rate with 0% correct keeps.
    const adj = (r.adjustedOffloadRate * 100).toFixed(1);
    const raw = (r.rawOffloadRate * 100).toFixed(1);
    lines.push(
      `Last ${r.windowHours}h: raw ${raw}% (${r.decisions.offload}/${r.decisions.offload + r.decisions.keep}), ` +
      `adjusted ${adj}% (${r.decisions.offload}/${r.decisions.offload + r.unclassifiedKeepCount}) — ` +
      `excludes ${r.correctKeepCount} correctly-kept Claude-only events.`,
    );
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
  console.log(`  keeps:         ${r.decisions.keep}  (${r.correctKeepCount} correctly Claude-only, ${r.unclassifiedKeepCount} unclassified)`);
  console.log(`  suggests:      ${r.decisions.suggest}  (${r.infraSuggestCount} infra mutations, ${r.routingSuggestCount} routing recommendations)`);
  console.log(`  tokens saved:  ${r.tokensSaved}`);
  console.log("");
  const keepCats = Object.entries(r.keepBreakdown).sort((a, b) => b[1] - a[1]);
  if (keepCats.length > 0) {
    console.log("Keep breakdown by category (last window):");
    for (const [cat, n] of keepCats) {
      const correct = CORRECT_KEEP_CATEGORIES.has(cat) ? " ✓ correct-keep" : "";
      console.log(`  ${pad(cat, 28)} ${String(n).padStart(4)}${correct}`);
    }
    console.log("");
  }
  const offloadCats = Object.entries(r.offloadBreakdown).sort((a, b) => b[1] - a[1]);
  if (offloadCats.length > 0) {
    console.log("Offload breakdown by category (last window):");
    for (const [cat, n] of offloadCats) {
      console.log(`  ${pad(cat, 28)} ${String(n).padStart(4)}`);
    }
    console.log("");
  }
  const suggestCats = Object.entries(r.suggestBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  if (suggestCats.length > 0) {
    console.log("Suggest breakdown by category (last window):");
    for (const [cat, n] of suggestCats) {
      const tag = INFRA_SUGGEST_CATEGORIES.has(cat) ? " ⚙ infra-mutation (not routing)" : "";
      console.log(`  ${pad(cat, 28)} ${String(n).padStart(4)}${tag}`);
    }
    console.log("");
  }
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

export function main() {
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

// Run main only when invoked as a script. Importing for tests no-ops.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
