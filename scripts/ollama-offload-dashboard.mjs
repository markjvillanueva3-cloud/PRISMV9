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
import { crossBucketTakeRate, CONVERSION_BUCKET_MAP } from "./lib/advisory-decay.mjs";

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

// U-OLLAMA-BRIDGE-EXEC-VISIBILITY (2026-06-20, slot:alpha): the EXECUTION bridges --
// hooks whose byHook.offloaded is an ACTUAL off-Claude model run, not a routing
// DECISION/suggestion. ask-hermes writes a CUSTOM byHook bucket (bySource/byMode/
// lastUsed via tallyUsage) and NEVER pushes to events[], so its 855+ real
// executions were invisible to totals.offloaded / executedOffloads / every rate --
// the headline read ~9-18% while true off-Claude throughput was ~874. Summing
// these gives the honest utilization signal (real model runs that did NOT cost
// this Claude session), surfaced as bridgeExecutions distinct from the
// prompt-classifier's offload DECISIONS. KEEP-IN-SYNC with the bridge writers:
// scripts/ask-ollama.mjs (mode:"executed"), scripts/ask-hermes.mjs (tallyUsage),
// scripts/ask-openrouter.mjs (lane:"cloud").
const EXECUTION_BRIDGE_HOOKS = new Set([
  "ask-ollama",     // local Ollama run (also flows through executedOffloads via mode:"executed")
  "ask-hermes",     // managed-OAuth proxy (xai/nous) OR ollama-fallback -- off-Claude either way
  "ask-openrouter", // free Nemotron-3 cloud rung ($0)
]);

// U-OLLAMA-OFFLOAD-DRIFT-GUARD (2026-06-20, slot:alpha): self-detect a NEW
// execution bridge that is INVISIBLE to the off-Claude total because it was added
// without updating EXECUTION_BRIDGE_HOOKS above. This is the exact bug class that
// caused the ~46x utilization under-count (ask-hermes wrote a byHook bucket that
// no metric read). Rather than rely on a human keeping the static Set in sync
// (R5: let code answer it), scan the live byHook for any bucket that follows the
// bridge naming convention ("ask-<x>") and shows real activity but is NOT tracked.
// A hit means a 1-line Set edit is needed -- surfaced LOUD in the advisory so the
// next ~46x silent miss can't recur. Convention-gated (ask-*) so the dozens of
// non-bridge hooks that write byHook (suggest-only advisories etc.) never false-
// alarm. Limitation (documented): a future bridge that breaks the ask-* naming
// convention would not be caught here -- keep the convention.
export function findUntrackedBridges(byHook, trackedSet) {
  const out = [];
  for (const [hook, v] of Object.entries(byHook || {})) {
    if (!hook || trackedSet.has(hook) || !/^ask-/.test(hook)) continue;
    const off = Number.isFinite(v?.offloaded) ? v.offloaded : 0;
    const fired = Number.isFinite(v?.fired) ? v.fired : 0;
    const executed = Number.isFinite(v?.byMode?.executed) ? v.byMode.executed : 0;
    const hasBySource = !!v?.bySource && typeof v.bySource === "object" && !Array.isArray(v.bySource) && Object.keys(v.bySource).length > 0;
    if (off > 0 || fired > 0 || executed > 0 || hasBySource) {
      out.push({ hook, executions: off, fired, executed });
    }
  }
  return out;
}

// U-OLLAMA-OFFLOAD-SUCCESS-RATE (2026-06-20, slot:alpha): a bridge below this
// success rate (offloaded/attempts) is flagged DEGRADED in the advisory -- a
// real signal that offloads are failing back to Claude (Ollama down / cold model
// / timeouts). MIN_ATTEMPTS gates the flag so one failure on a low-volume bridge
// (e.g. ask-openrouter with 1 call) does not false-alarm.
const DEGRADED_SUCCESS_RATE = 0.90;
const MIN_ATTEMPTS_FOR_RATE = 5;

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
  // CLOUD-OVERFLOW-MS0/U-OPENROUTER-TELEMETRY: cloud-lane (OpenRouter) executed offloads,
  // tagged extras.lane:"cloud" by ask-openrouter -- a $0 / 0-Claude-context win, surfaced
  // DISTINCTLY from local Ollama executed offloads. Both are already excluded from the headline
  // Ollama rate (the `continue` below); this only sub-segments the executed adoption metric.
  let executedCloud = 0;
  let executedCloudTokensSaved = 0;
  for (const e of recent) {
    if (e.decision === "offload" && e.mode === "executed") {
      executedOffloads++;
      const savedTok = (typeof e.tokensSaved === "number" && Number.isFinite(e.tokensSaved)) ? e.tokensSaved : 0;
      executedTokensSaved += savedTok;
      if (e.lane === "cloud") {
        executedCloud++;
        executedCloudTokensSaved += savedTok;
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

  // U-OLLAMA-BRIDGE-EXEC-VISIBILITY: aggregate ACTUAL off-Claude executions from
  // byHook (LIFETIME -- the bridges never write events[], so a windowed count is
  // not available; this is the honest cumulative throughput). bridgeExecutions is
  // the count of real local/managed-model runs that did NOT cost a Claude session,
  // distinct from totals.offloaded (prompt-classifier DECISIONS) and executedOffloads
  // (the ask-ollama subset that DOES flow through events as mode:"executed"). Pure --
  // read-only over stats.byHook.
  const byBridge = {};
  let bridgeExecutions = 0;
  let bridgeTokensSaved = 0;
  let bridgeAttempts = 0;
  for (const [hook, v] of Object.entries(stats.byHook || {})) {
    if (!EXECUTION_BRIDGE_HOOKS.has(hook)) continue;
    const off = Number.isFinite(v?.offloaded) ? v.offloaded : 0;
    const tok = Number.isFinite(v?.tokensSaved) ? v.tokensSaved : 0;
    // U-OLLAMA-OFFLOAD-SUCCESS-RATE: attempts = fired (every invocation); failures
    // = kept (the offload fell back to Claude). successRate = offloaded/attempts.
    // ask-ollama now records failures (recordFailure); ask-hermes already tracks
    // kept + bySource.fail; ask-openrouter via recordOllamaEvent. A bridge whose
    // writer predates fired-tracking (fired absent) falls back to off+failures so
    // the rate never divides by a phantom 0.
    const failures = Number.isFinite(v?.kept) ? v.kept : 0;
    const fired = Number.isFinite(v?.fired) ? v.fired : off + failures;
    const attempts = fired > 0 ? fired : off + failures;
    bridgeExecutions += off;
    bridgeTokensSaved += tok;
    bridgeAttempts += attempts;
    byBridge[hook] = {
      executions: off,
      attempts,
      failures,
      successRate: attempts > 0 ? off / attempts : NaN,
      tokensSaved: tok,
      ...(v?.bySource ? { bySource: v.bySource } : {}),
      ...(v?.byMode ? { byMode: v.byMode } : {}),
    };
  }
  const bridgeSuccessRate = bridgeAttempts > 0 ? bridgeExecutions / bridgeAttempts : NaN;
  // U-OLLAMA-OFFLOAD-DRIFT-GUARD: ask-* byHook buckets with activity not in the
  // tracked Set -> a new bridge whose executions are invisible to the off-Claude
  // total. Empty in a healthy install; non-empty = add it to EXECUTION_BRIDGE_HOOKS.
  const untrackedBridges = findUntrackedBridges(stats.byHook, EXECUTION_BRIDGE_HOOKS);

  // U-OFFLOAD-DASH-XCONV (2026-06-24, slot:alpha): a PURE-ADVISORY hook only ever
  // SUGGESTS, so its own byHook.offloaded is structurally 0 -- the per-hook line
  // (offload=0) MIS-READS it as 0% useful. Its TRUE conversion lands in the
  // EXECUTION bucket it drives (CONVERSION_BUCKET_MAP, e.g. large-read-digest-
  // advisory -> ollama-file-digest). Reuse the tested PURE crossBucketTakeRate
  // primitive (scripts/lib/advisory-decay.mjs) to overlay the honest cross-bucket
  // take-rate, keyed only by the mapped advisory hooks ACTUALLY present in byHook
  // (so the per-hook render can annotate them). Observability-ONLY: decayDecision
  // / muting are untouched (a separate gated unit) -- this never changes whether a
  // hook fires, only how its value reads.
  const xconvByHook = {};
  for (const advisoryKey of Object.keys(CONVERSION_BUCKET_MAP)) {
    if (!stats.byHook || typeof stats.byHook !== "object" || !(advisoryKey in stats.byHook)) continue;
    xconvByHook[advisoryKey] = crossBucketTakeRate(stats, advisoryKey);
  }

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
      // U-OLLAMA-BRIDGE-EXEC-VISIBILITY: lifetime TRUE off-Claude executions across
      // all bridges (ask-ollama + ask-hermes + ask-openrouter). The honest
      // utilization headline -- real model runs, not prompt-classifier decisions.
      bridgeExecutions,
      bridgeTokensSaved,
      // U-OLLAMA-OFFLOAD-SUCCESS-RATE: attempts (every bridge invocation) + the
      // fleet success rate (executions / attempts). NaN until a bridge records
      // attempts. A rate < 1.0 means some offloads failed back to Claude.
      bridgeAttempts,
      bridgeSuccessRate,
    },
    untrackedBridges,
    byBridge,
    byHook: stats.byHook ?? {},
    // U-OFFLOAD-DASH-XCONV: per-(mapped pure-advisory)-hook TRUE cross-bucket
    // conversion overlay { [advisoryHook]: {injected,taken,takeRate,conversionKey,
    // status} }. SEPARATE from byHook (never mutates the passthrough).
    xconvByHook,
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
      executedCloud,
      executedCloudTokensSaved,
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

/**
 * Render an offload hook's SOURCE provenance (which backend actually served each
 * fire) as "src=n src=n", highest first. PURE -- no IO. This is the signal that
 * answers "is the remote lane actually USED, or always degrading to the fallback?"
 * -- e.g. ask-hermes bySource {hermes, ollama-fallback, fail} shows real-Hermes vs
 * degrade-to-Ollama. Returns "" when there is nothing to disambiguate (0 or 1
 * distinct positive source -> the fired/offload columns already tell the story).
 * (HERMES-UTIL / U-OFFLOAD-SOURCE-SPLIT, 2026-06-18 slot:zulu.)
 * @returns {string}
 */
export function formatSourceSplit(bySource) {
  if (!bySource || typeof bySource !== "object") return "";
  const entries = Object.entries(bySource).filter(([, n]) => Number.isFinite(n) && n > 0);
  if (entries.length < 2) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([k, n]) => `${k}=${n}`).join(" ");
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
      `adjusted ${adj}% (${r.decisions.offload}/${r.decisions.offload + r.unclassifiedKeepCount}) -- ` +
      `excludes ${r.correctKeepCount} correctly-kept Claude-only events.`,
    );
  }
  // U-OLLAMA-BRIDGE-EXEC-VISIBILITY: the honest utilization line. The rates above
  // measure the prompt-classifier; the bridges are where MOST real off-Claude work
  // happens (ask-hermes alone is the bulk) and was previously invisible.
  if (summary.totals.bridgeExecutions > 0) {
    lines.push(
      `TRUE off-Claude throughput (lifetime, all bridges): ${summary.totals.bridgeExecutions} executions ` +
      `(~${summary.totals.bridgeTokensSaved} tok off-Claude, measured+estimated) -- the honest utilization. ` +
      `The headline 'offloaded' counts prompt-classifier DECISIONS, not executions; do NOT read it as the utilization rate.`,
    );
    // U-OLLAMA-OFFLOAD-SUCCESS-RATE: fleet offload success rate + degraded-bridge flag.
    if (Number.isFinite(summary.totals.bridgeSuccessRate)) {
      const degraded = Object.entries(summary.byBridge || {})
        .filter(([, v]) => Number.isFinite(v.successRate) && v.attempts >= MIN_ATTEMPTS_FOR_RATE && v.successRate < DEGRADED_SUCCESS_RATE)
        .map(([h, v]) => `${h} ${(v.successRate * 100).toFixed(0)}% (${v.failures} failed)`);
      lines.push(
        `Offload SUCCESS RATE (bridges, lifetime): ${(summary.totals.bridgeSuccessRate * 100).toFixed(1)}% ` +
        `(${summary.totals.bridgeExecutions}/${summary.totals.bridgeAttempts} attempts)` +
        (degraded.length
          ? ` -- DEGRADED: ${degraded.join(", ")} (check Ollama daemon / model warmth / timeouts).`
          : " -- healthy."),
      );
    }
  }
  // U-OLLAMA-OFFLOAD-DRIFT-GUARD: LOUD flag if a new ask-* bridge is running but
  // untracked -- its executions are invisible to the off-Claude total (the ~46x
  // under-count bug class). Fix = add it to EXECUTION_BRIDGE_HOOKS.
  const untracked = summary.untrackedBridges || [];
  if (untracked.length) {
    lines.push(
      `[!] UNTRACKED BRIDGE(S) -- off-Claude executions are INVISIBLE to the utilization total: ` +
      untracked.map((u) => `${u.hook} (fired=${u.fired}, exec=${u.executions})`).join(", ") +
      `. Add to EXECUTION_BRIDGE_HOOKS in scripts/ollama-offload-dashboard.mjs.`,
    );
  }
  return lines;
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// ── Hermes work-loop utilization (HERMES-FLEET-MAXOUT/U-DASH) ─────────────────
// Surfaces the FREE NVIDIA-lane Hermes agents the fleet now fires (work-loop driver + the
// idle fleet-sweep cron) so "drastically increased utilization" is PROVEN with numbers, not
// asserted (R15 validate). Reads the two append-only ledgers + the sweep budget state.
const HERMES_WORKLOOP_LEDGER = "H:/prism/state/shared/hermes-work-loop-ledger.jsonl";
const HERMES_SWEEP_LEDGER = "H:/prism/state/shared/hermes-fleet-sweep-ledger.jsonl";
const HERMES_SWEEP_STATE = "H:/prism/state/shared/hermes-fleet-sweep-state.json";
const HERMES_PROMPT_TOKEN_EST = 600; // conservative per-agent prompt that would otherwise run on Claude

/** Read a JSONL ledger fail-soft -> array of parsed rows (bad lines skipped). */
function readJsonlRows(p) {
  try {
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf8").trim().split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Summarize Hermes work-loop utilization from the two ledgers + the sweep state. PURE (arrays in).
 * @param {Array} workLoopRows  hermes-work-loop-ledger rows ({ok, source, domain, lane, agentOutput})
 * @param {Array} sweepRows     hermes-fleet-sweep-ledger rows ({fired, wouldFire, agentsFired, armed, stampedAt})
 * @param {object} sweepState   hermes-fleet-sweep-state.json ({budgetDay, dailyCallsUsed, lastSweepMs})
 */
export function summarizeHermesWorkLoop(workLoopRows = [], sweepRows = [], sweepState = {}, nowMs = Date.now()) {
  const wl = Array.isArray(workLoopRows) ? workLoopRows.filter((r) => r && typeof r === "object") : [];
  const sw = Array.isArray(sweepRows) ? sweepRows.filter((r) => r && typeof r === "object") : [];
  const agents = wl.length;
  const okAgents = wl.filter((r) => r.ok === true).length;
  const okRate = agents > 0 ? okAgents / agents : null;
  const byDomain = {};
  let outChars = 0;
  for (const r of wl) {
    if (r.domain) byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
    if (typeof r.agentOutput === "string") outChars += r.agentOutput.length;
  }
  // Estimated off-Claude tokens: ~outChars/4 produced output + a per-ok-agent prompt that would
  // otherwise have run on Claude. An ESTIMATE (R12 -- labelled "est"), never claimed as measured.
  const estOutputTokens = Math.round(outChars / 4);
  const estClaudeTokensSaved = estOutputTokens + okAgents * HERMES_PROMPT_TOKEN_EST;
  const sweeps = sw.length;
  const firedSweeps = sw.filter((r) => r.fired === true).length;
  const wouldFireSweeps = sw.filter((r) => r.wouldFire === true).length;
  const agentsViaSweep = sw.reduce((a, r) => a + (Number.isFinite(r.agentsFired) ? r.agentsFired : 0), 0);
  const lastSweepRow = sw.length ? sw[sw.length - 1] : null;
  const st = sweepState && typeof sweepState === "object" ? sweepState : {};
  const todayKey = new Date(Number.isFinite(nowMs) ? nowMs : 0).toISOString().slice(0, 10);
  const todaySpent = (st.budgetDay === todayKey && Number.isFinite(st.dailyCallsUsed)) ? st.dailyCallsUsed : 0;
  return {
    agents, okAgents, okRate, byDomain,
    estOutputTokens, estClaudeTokensSaved,
    sweeps, firedSweeps, wouldFireSweeps, agentsViaSweep,
    lastSweepAt: lastSweepRow?.stampedAt ?? (Number.isFinite(st.lastSweepMs) ? new Date(st.lastSweepMs).toISOString() : null),
    armed: lastSweepRow ? lastSweepRow.armed === true : false,
    todaySpent,
  };
}

/** Load + summarize Hermes work-loop utilization from disk (fail-soft). */
export function loadHermesWorkLoop(nowMs = Date.now()) {
  let state = {};
  try { if (existsSync(HERMES_SWEEP_STATE)) state = JSON.parse(readFileSync(HERMES_SWEEP_STATE, "utf8")); } catch { state = {}; }
  return summarizeHermesWorkLoop(readJsonlRows(HERMES_WORKLOOP_LEDGER), readJsonlRows(HERMES_SWEEP_LEDGER), state, nowMs);
}

/** Render the Hermes utilization section as printable lines. */
export function renderHermesWorkLoop(h) {
  const L = ["Hermes work-loop (FREE NVIDIA-lane agents, off-Claude):"];
  if (!h || (h.agents === 0 && h.sweeps === 0)) {
    L.push("  (no Hermes work-loop activity recorded yet)");
    return L;
  }
  const okPct = Number.isFinite(h.okRate) ? `${(h.okRate * 100).toFixed(0)}% ok` : "ok-rate n/a";
  L.push(`  agents fired:            ${h.agents}  (${h.okAgents} ${okPct})`);
  L.push(`  est off-Claude tokens:   ~${h.estClaudeTokensSaved}  (${h.estOutputTokens} output + prompt est)`);
  const dom = Object.entries(h.byDomain).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(" ");
  if (dom) L.push(`  units covered by domain: ${dom}`);
  L.push(`  sweeps:                  ${h.sweeps} (${h.firedSweeps} fired, ${h.wouldFireSweeps} would-fire); agents via sweep: ${h.agentsViaSweep}`);
  L.push(`  today's budget spent:    ${h.todaySpent}`);
  L.push(`  last sweep:              ${h.lastSweepAt ?? "(never)"}  [${h.armed ? "ARMED" : "plan-only"}]`);
  return L;
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
  if (t.bridgeExecutions > 0) {
    console.log("");
    const fleetSr = Number.isFinite(t.bridgeSuccessRate) ? ` · success ${(t.bridgeSuccessRate * 100).toFixed(1)}% (${t.bridgeExecutions}/${t.bridgeAttempts})` : "";
    console.log(`TRUE off-Claude executions (bridges, lifetime): ${t.bridgeExecutions}  (~${t.bridgeTokensSaved} tok off-Claude; ask-ollama measured + ask-hermes estimated)${fleetSr}`);
    const bridges = Object.entries(summary.byBridge || {}).sort((a, b) => (b[1].executions || 0) - (a[1].executions || 0));
    for (const [hook, v] of bridges) {
      const split = formatSourceSplit(v.bySource);
      const rate = Number.isFinite(v.successRate) ? `  ${(v.successRate * 100).toFixed(1)}% ok${v.failures ? ` (${v.failures} failed)` : ""}` : "";
      console.log(`  ${pad(hook, 18)} ${String(v.executions).padStart(5)} exec${rate}${v.tokensSaved ? `  ~${v.tokensSaved} tok` : "  (savings unmeasured)"}${split ? `  [${split}]` : ""}`);
    }
    console.log(`  ^ ran on a free local/managed model, NOT this Claude session = the real utilization. ('offloaded' above counts prompt-classifier DECISIONS; bridgeExecutions already includes the ask-ollama runs in the windowed 'executed' line below -- do NOT sum the two.)`);
  }
  console.log("");
  console.log(`Last ${r.windowHours}h activity:`);
  console.log(`  events:        ${r.eventCount}`);
  console.log(`  offloads:      ${r.decisions.offload}`);
  console.log(`  keeps:         ${r.decisions.keep}  (${r.correctKeepCount} correctly Claude-only, ${r.unclassifiedKeepCount} unclassified)`);
  console.log(`  suggests:      ${r.decisions.suggest}  (${r.infraSuggestCount} infra mutations, ${r.routingSuggestCount} routing recommendations)`);
  console.log(`  tokens saved:  ${r.tokensSaved}`);
  if (r.executedOffloads > 0) {
    console.log(`  off-Claude executed: ${r.executedOffloads} (${r.executedCloud} cloud/OpenRouter) -- ~${r.executedTokensSaved} tok off-Claude (~${r.executedCloudTokensSaved} cloud @ $0)`);
  }
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
      const split = formatSourceSplit(v.bySource);
      // U-OFFLOAD-DASH-XCONV: annotate a pure-advisory hook with its TRUE cross-
      // bucket conversion so its structural offload=0 is not mis-read as "0% useful".
      const xc = summary.xconvByHook?.[h];
      const xconv = xc && xc.conversionKey
        ? (xc.status === "measured"
            ? `  xconv=${(xc.takeRate * 100).toFixed(1)}% (${xc.taken}/${xc.injected} via ${xc.conversionKey})`
            : `  xconv=unmeasured (via ${xc.conversionKey})`)
        : "";
      console.log(`  ${pad(h, 30)} fired=${v.fired ?? 0} offload=${v.offloaded ?? 0} keep=${v.kept ?? 0} suggest=${v.suggested ?? 0}${split ? `  [${split}]` : ""}${xconv}`);
    }
  }
  console.log("");
  const categories = Object.keys(summary.byCategory).sort();
  if (categories.length > 0) {
    console.log("By category:");
    for (const k of categories) console.log(`  ${pad(k, 30)} ${summary.byCategory[k]}`);
    console.log("");
  }
  console.log("");
  for (const line of renderHermesWorkLoop(loadHermesWorkLoop())) console.log(line);
  console.log("");
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
    console.log(JSON.stringify({ ...summary, hermesWorkLoop: loadHermesWorkLoop(), advisory: advisory(summary) }, null, 2));
  } else {
    printHuman(summary);
  }
}

// Run main only when invoked as a script. Importing for tests no-ops.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
