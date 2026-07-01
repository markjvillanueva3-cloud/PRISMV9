// OLLAMA-EXPAND-MS0 / U-OE-DASH-KEEP-BREAKDOWN — fail-on-revert regression tests
// for the keep-breakdown + adjusted-offload-rate transparency fix.
//
// Slot: charlie (claude-bca3789f), 2026-05-18.
//
// What changed in ollama-offload-dashboard.mjs:
//   1. summarize() now emits keepBreakdown, offloadBreakdown, correctKeepCount,
//      unclassifiedKeepCount, rawOffloadRate, adjustedOffloadRate.
//   2. advisory() emits both raw and adjusted rates so the gap between
//      "10.9% offload rate" and "42% real rate" is visible.
//   3. main() guarded by import.meta.url === argv[1] so tests can import
//      summarize/advisory pure without triggering process.exit on missing stats.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  summarize,
  advisory,
  correctKeepCategorySet,
  infraSuggestCategorySet,
  formatSourceSplit,
  findUntrackedBridges,
} from "../ollama-offload-dashboard.mjs";

const HOOK_PATH = "H:/prism/.claude/hooks/ollama-task-offloader.mjs";

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.parse("2026-05-18T15:00:00Z");

function makeEvent(offsetMin, decision, category, extras = {}) {
  return {
    ts: new Date(NOW - offsetMin * 60 * 1000).toISOString(),
    decision,
    category,
    ...extras,
  };
}

// -- U-OFFLOAD-ACTION (2026-06-12, scrutiny P1): executed-offload segmentation --
// ask-ollama now records EXECUTED offloads (mode:"executed"). They are the
// ADOPTION metric and must NOT feed directive-time decision counts, token sums,
// or rates -- one adopted action would otherwise count twice, inflating the
// headline exactly as adoption succeeds.
test("summarize: executed events segment OUT of directive counts/rates into the adoption sub-metric", () => {
  const stats = {
    schemaVersion: "2.0.0",
    offloaded: 5,
    keptOnClaude: 5,
    executedOffloads: 3,
    measuredTokensSaved: 2000,
    events: [
      makeEvent(5, "offload", "summary", { tokensSaved: 100 }),
      makeEvent(6, "offload", "summarize", { tokensSaved: 949, mode: "executed", hook: "ask-ollama" }),
      makeEvent(7, "keep", "orchestration"),
    ],
  };
  const s = summarize(stats, HOUR_MS, NOW);
  assert.equal(s.recent.decisions.offload, 1, "executed event must NOT count as a directive offload");
  assert.equal(s.recent.tokensSaved, 100, "measured delta must not inflate the directive token sum");
  assert.equal(s.recent.executedOffloads, 1);
  assert.equal(s.recent.executedTokensSaved, 949);
  assert.equal(s.recent.adoptionRate, 1, "1 executed / 1 directive in window");
  assert.equal(s.recent.rawOffloadRate, 0.5, "rate unchanged by the executed event (1 offload / 1 keep)");
  assert.equal(s.totals.executedOffloads, 3, "lifetime adoption totals pass through");
  assert.equal(s.totals.measuredTokensSaved, 2000);
});

// -- CLOUD-OVERFLOW-MS0/U-OPENROUTER-TELEMETRY: cloud-lane sub-segmentation --
// ask-openrouter records executed offloads tagged lane:"cloud". They sub-segment OUT of the
// local-Ollama executed total (executedCloud) so a token-economy view can credit the $0/0-ctx
// cloud lane distinctly, while STILL being excluded from the headline Ollama directive rate.
test("summarize: lane:'cloud' executed offloads segment into executedCloud (distinct from local), not the headline rate", () => {
  const stats = {
    schemaVersion: "2.0.0",
    events: [
      makeEvent(2, "offload", "research", { tokensSaved: 7500, mode: "executed", lane: "cloud", hook: "ask-openrouter" }),
      makeEvent(3, "offload", "summarize", { tokensSaved: 900, mode: "executed", hook: "ask-ollama" }), // local executed, NOT cloud
      makeEvent(4, "offload", "summary", { tokensSaved: 50 }),                                          // a directive (not executed)
    ],
  };
  const s = summarize(stats, HOUR_MS, NOW);
  assert.equal(s.recent.executedOffloads, 2, "both executed events counted");
  assert.equal(s.recent.executedCloud, 1, "only the lane:cloud event is cloud");
  assert.equal(s.recent.executedCloudTokensSaved, 7500);
  assert.equal(s.recent.executedTokensSaved, 8400, "cloud + local executed savings");
  assert.equal(s.recent.decisions.offload, 1, "executed (cloud or local) excluded from the directive offload count");
  assert.equal(s.recent.rawOffloadRate, 1, "1 directive offload / 1 (no keeps); executed events do not move it");
});

test("summarize: keepBreakdown bins by category", () => {
  const stats = {
    schemaVersion: "2.0.0",
    offloaded: 10,
    keptOnClaude: 90,
    events: [
      makeEvent(5, "keep", "orchestration"),
      makeEvent(6, "keep", "orchestration"),
      makeEvent(7, "keep", "unknown"),
      makeEvent(8, "keep", "operator_directive"),
      makeEvent(9, "offload", "summary", { tokensSaved: 200 }),
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.keepBreakdown.orchestration, 2);
  assert.equal(s.recent.keepBreakdown.unknown, 1);
  assert.equal(s.recent.keepBreakdown.operator_directive, 1);
  assert.equal(s.recent.offloadBreakdown.summary, 1);
});

test("summarize: correctKeepCount sums known Claude-only categories only", () => {
  const stats = {
    events: [
      makeEvent(1, "keep", "orchestration"),     // correct
      makeEvent(2, "keep", "multi_file"),        // correct
      makeEvent(3, "keep", "git_ops"),           // correct
      makeEvent(4, "keep", "deep_reasoning"),    // correct
      makeEvent(5, "keep", "operator_directive"),// correct
      makeEvent(6, "keep", "safety_physics"),    // correct
      makeEvent(7, "keep", "unknown"),           // unclassified
      makeEvent(8, "keep", "explanation"),       // unclassified (offloader missed)
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.correctKeepCount, 6);
  assert.equal(s.recent.unclassifiedKeepCount, 2);
});

test("summarize: adjustedOffloadRate excludes correct keeps from denominator", () => {
  const stats = {
    events: [
      // 10 offloads
      ...Array.from({ length: 10 }, (_, i) => makeEvent(i + 1, "offload", "summary")),
      // 80 orchestration keeps (correctly kept)
      ...Array.from({ length: 80 }, (_, i) => makeEvent(i + 20, "keep", "orchestration")),
      // 10 unknown keeps (real candidate misses)
      ...Array.from({ length: 10 }, (_, i) => makeEvent(i + 110, "keep", "unknown")),
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  // Raw rate: 10 / (10 + 90) = 10%
  assert.equal(Number(s.recent.rawOffloadRate.toFixed(2)), 0.1);
  // Adjusted rate: 10 / (10 + 10) = 50% — the "if all the unclassified-keeps
  // had Ollama been a viable target" rate. This is the metric that matters.
  assert.equal(Number(s.recent.adjustedOffloadRate.toFixed(2)), 0.5);
});

test("summarize: NaN rates when no signal (don't divide by zero)", () => {
  const s = summarize({ events: [] }, 24 * HOUR_MS, NOW);
  assert.equal(Number.isNaN(s.recent.rawOffloadRate), true);
  assert.equal(Number.isNaN(s.recent.adjustedOffloadRate), true);
});

test("summarize: events outside window are excluded", () => {
  const stats = {
    events: [
      makeEvent(60, "offload", "summary"),       // 1h ago — IN
      makeEvent(60 * 25, "offload", "summary"),  // 25h ago — OUT (24h window)
      makeEvent(60 * 23, "keep", "orchestration"), // 23h ago — IN
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.eventCount, 2);
  assert.equal(s.recent.decisions.offload, 1);
  assert.equal(s.recent.decisions.keep, 1);
});

test("summarize: unknown category strings bin as 'unknown'", () => {
  const stats = {
    events: [
      makeEvent(1, "keep", undefined),  // missing category
      makeEvent(2, "keep", ""),         // empty string
      makeEvent(3, "keep", null),       // null
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.keepBreakdown.unknown, 3);
});

test("advisory: surfaces both raw and adjusted rates when adjusted differs", () => {
  const stats = {
    offloaded: 10,
    keptOnClaude: 90,
    events: [
      makeEvent(1, "offload", "summary"),
      makeEvent(2, "keep", "orchestration"),
      makeEvent(3, "keep", "orchestration"),
      makeEvent(4, "keep", "unknown"),
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  const lines = advisory(s);
  const joined = lines.join("\n");
  assert.match(joined, /raw/i);
  assert.match(joined, /adjusted/i);
  assert.match(joined, /correctly-kept/i);
});

test("advisory: handles 0-event recent window gracefully", () => {
  const stats = { offloaded: 0, keptOnClaude: 0, events: [] };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  const lines = advisory(s);
  assert.equal(lines.some((l) => l.includes("No events")), true);
  // No NaN in any line — we don't emit "raw NaN%, adjusted NaN%"
  assert.equal(lines.some((l) => l.includes("NaN")), false);
});

test("correctKeepCategorySet: contains the load-bearing six categories", () => {
  const set = correctKeepCategorySet();
  for (const cat of ["orchestration", "multi_file", "git_ops", "deep_reasoning", "operator_directive", "safety_physics"]) {
    assert.equal(set.has(cat), true, `missing category: ${cat}`);
  }
});

// U-OE-DASH-KEEP-BREAKDOWN P1 (arm-B): drift-detection.
// The dashboard's CORRECT_KEEP_CATEGORIES set MUST be a superset of every
// category the offloader hook emits with decision=keep. If the hook adds a
// new keep category (e.g. SAFETY_PRE gains a new branch), the dashboard
// must learn about it OR the new category will silently bin as
// "unclassified" and inflate the adjusted-rate denominator forever.
//
// This test parses the hook source and asserts every category literal that
// appears inside either KEEP_ON_CLAUDE (line ~103) or the SAFETY_PRE early-
// return (any literal with /\bcategory:\s*"safety_physics"/) is contained
// in the dashboard's set. Regex-based — robust to AST changes that preserve
// the `category: "..."` shape, fail-loud on either side drifting.
test("drift-guard: every keep-emitting category in the hook is in dashboard's set", () => {
  const hookSrc = readFileSync(HOOK_PATH, "utf8");
  // Anchor on the KEEP_ON_CLAUDE array literal — capture from declaration to
  // closing bracket, then scan that span only (avoids matching OFFLOADABLE_PATTERNS).
  const keepArrayMatch = hookSrc.match(/const\s+KEEP_ON_CLAUDE\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(keepArrayMatch, "could not locate KEEP_ON_CLAUDE array in hook source — has it been renamed?");
  const keepArrayBody = keepArrayMatch[1];
  const hookCategories = new Set();
  for (const m of keepArrayBody.matchAll(/category:\s*"([^"]+)"/g)) {
    hookCategories.add(m[1]);
  }
  // Also scan whole-source for safety_physics — emitted from SAFETY_PRE early
  // return, not the KEEP_ON_CLAUDE array. If the hook ever adds another out-of-
  // array keep emitter we want it caught too: scan for any `category: "..."`
  // followed within ~120 chars by `decision: "keep"` OR `offloadable: false`.
  // We over-include here (false positives are fine — they just enforce the
  // dashboard list is a superset, which is the actual invariant).
  for (const m of hookSrc.matchAll(/category:\s*"([^"]+)"[^}]{0,200}(decision:\s*"keep"|offloadable:\s*false)/g)) {
    hookCategories.add(m[1]);
  }
  assert.ok(hookCategories.size > 0, "regex scan found no categories — hook source unparseable?");
  const dashSet = correctKeepCategorySet();
  const missing = [...hookCategories].filter((cat) => !dashSet.has(cat));
  assert.equal(
    missing.length, 0,
    `dashboard CORRECT_KEEP_CATEGORIES is missing categories the hook emits as keeps: ${JSON.stringify(missing)}. ` +
    `Add them to scripts/ollama-offload-dashboard.mjs CORRECT_KEEP_CATEGORIES, or remove them from hook KEEP_ON_CLAUDE.`,
  );
});

// Adversarial: malformed decision values land in "other", never crash.
test("adversarial: unknown decision string bins as 'other', does not throw", () => {
  const stats = {
    events: [
      makeEvent(1, "weird-decision", "summary"),
      makeEvent(2, "OFFLOAD", "summary"),  // wrong case
      makeEvent(3, 42, "summary"),         // non-string
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.decisions.other, 3);
  assert.equal(s.recent.decisions.offload, 0);
});

// Adversarial: malformed ts (NaN, unparseable, missing) is filtered out.
test("adversarial: events with bad ts are excluded, do not crash", () => {
  const stats = {
    events: [
      { ts: "not-a-date", decision: "offload", category: "summary" },
      { ts: null, decision: "offload", category: "summary" },
      { ts: undefined, decision: "offload", category: "summary" },
      { decision: "offload", category: "summary" },  // missing ts
      makeEvent(1, "offload", "summary"),  // valid baseline
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.eventCount, 1);  // only the valid event survives
  assert.equal(s.recent.decisions.offload, 1);
});

// P1 (arm-B): tokensSaved is now gated on decision === "offload". A stray
// tokensSaved field on a suggest or keep event must NOT inflate the metric.
test("regression-guard: tokensSaved only accumulates from offload events", () => {
  const stats = {
    events: [
      makeEvent(1, "offload", "summary", { tokensSaved: 100 }),  // counts: 100
      makeEvent(2, "keep", "orchestration", { tokensSaved: 9999 }),  // ignored
      makeEvent(3, "suggest", "summary", { tokensSaved: 9999 }),  // ignored
      makeEvent(4, "offload", "summary", { tokensSaved: 50 }),   // counts: 50
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.tokensSaved, 150, "should be 100+50, not inflated by keep/suggest events");
});

// Fail-on-revert regression: removing the keepBreakdown OR adjustedOffloadRate
// from summarize() output is the exact bug this fix prevents — these fields
// must persist or the dashboard goes back to misleading.
test("regression-guard: summarize output must include all transparency fields", () => {
  const stats = { events: [makeEvent(1, "keep", "orchestration")] };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  for (const field of [
    "keepBreakdown",
    "offloadBreakdown",
    "suggestBreakdown",
    "correctKeepCount",
    "unclassifiedKeepCount",
    "infraSuggestCount",
    "routingSuggestCount",
    "rawOffloadRate",
    "adjustedOffloadRate",
  ]) {
    assert.equal(field in s.recent, true, `missing field: recent.${field}`);
  }
});

// ── U-REAPER-COORD-NOISE (2026-05-18, slot delta) ────────────────────────

test("U-REAPER-COORD-NOISE: infraSuggestCategorySet exports the canonical infra-mutation categories", () => {
  const set = infraSuggestCategorySet();
  assert.ok(set instanceof Set, "must return a Set");
  assert.ok(set.has("fleet-reaper-prewarm"), "fleet-reaper-prewarm must be classified as infra");
  assert.ok(set.has("fleet-reaper-hint"), "fleet-reaper-hint must be classified as infra");
  // Returns a fresh Set per call — protect the canonical set from mutation.
  set.add("synthetic-test-category");
  const set2 = infraSuggestCategorySet();
  assert.equal(set2.has("synthetic-test-category"), false, "mutating returned set must not affect canonical");
});

test("U-REAPER-COORD-NOISE: summarize classifies fleet-reaper-prewarm + fleet-reaper-hint as infra suggests, not routing", () => {
  // The exact repro: 859 fleet-reaper-coordinator suggest fires / 24h would
  // dominate the suggest count and make the offloader look broken. With the
  // classification, infra suggests are surfaced separately.
  const stats = {
    events: [
      makeEvent(1, "suggest", "fleet-reaper-prewarm"),
      makeEvent(2, "suggest", "fleet-reaper-prewarm"),
      makeEvent(3, "suggest", "fleet-reaper-hint"),
      makeEvent(4, "suggest", "summary"), // a REAL routing suggest
      makeEvent(5, "suggest", "explanation"), // another real routing suggest
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.decisions.suggest, 5, "total suggest count unchanged (back-compat)");
  assert.equal(s.recent.infraSuggestCount, 3, "fleet-reaper-* categories are infra");
  assert.equal(s.recent.routingSuggestCount, 2, "summary/explanation are real routing suggests");
});

test("U-REAPER-COORD-NOISE: summarize suggestBreakdown bins suggests by category", () => {
  const stats = {
    events: [
      makeEvent(1, "suggest", "fleet-reaper-prewarm"),
      makeEvent(2, "suggest", "fleet-reaper-prewarm"),
      makeEvent(3, "suggest", "fleet-reaper-hint"),
      makeEvent(4, "suggest", "summary"),
      makeEvent(5, "suggest", "summary"),
      makeEvent(6, "suggest", "summary"),
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.suggestBreakdown["fleet-reaper-prewarm"], 2);
  assert.equal(s.recent.suggestBreakdown["fleet-reaper-hint"], 1);
  assert.equal(s.recent.suggestBreakdown["summary"], 3);
});

test("U-REAPER-COORD-NOISE: a suggest with no category bins as 'unknown' and is treated as routing", () => {
  // R12 honesty: a missing/empty category is a real routing-decision pool —
  // not infra. We don't silently bucket it as infra; we bucket it as
  // routing+unknown so it surfaces as a data-quality issue if it grows.
  const stats = {
    events: [
      { ts: new Date(NOW - 60_000).toISOString(), decision: "suggest" }, // no category
      { ts: new Date(NOW - 60_000).toISOString(), decision: "suggest", category: "" }, // empty
    ],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.suggestBreakdown.unknown, 2);
  assert.equal(s.recent.infraSuggestCount, 0, "no category must NOT count as infra");
  assert.equal(s.recent.routingSuggestCount, 2, "no category falls into the routing pool");
});

test("U-REAPER-COORD-NOISE: zero suggests — infraSuggestCount + routingSuggestCount both 0", () => {
  const stats = { events: [makeEvent(1, "keep", "orchestration"), makeEvent(2, "offload", "summary", { tokensSaved: 10 })] };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.recent.infraSuggestCount, 0);
  assert.equal(s.recent.routingSuggestCount, 0);
  // Test "no keys" — suggestBreakdown is Object.create(null) so a literal
  // {} fails deepStrictEqual on prototype. The invariant we care about is
  // "no entries", which Object.keys captures faithfully.
  assert.equal(Object.keys(s.recent.suggestBreakdown).length, 0, "no suggest categories recorded");
});

test("U-REAPER-COORD-NOISE: drift-guard — every suggest emitted by fleet-reaper-sweep.mjs is classified as infra", () => {
  // This is the structural protection: if a future fleet-reaper edit adds a
  // NEW suggest category (e.g. "fleet-reaper-gpu-reset"), this test fails
  // until the dashboard's INFRA_SUGGEST_CATEGORIES set is updated. Without
  // this guard, a new noise source could re-inflate the suggest count
  // silently.
  let source;
  try {
    source = readFileSync("H:/prism/scripts/fleet-reaper-sweep.mjs", "utf-8");
  } catch (e) {
    // Skip-loud if the sweeper source isn't on disk (different repo layout)
    return;
  }
  // Match `recordEvent({ hook: "fleet-reaper-coordinator", decision: "suggest", category: "X", ...})`
  // OR with whitespace/newlines + `category: "X"` somewhere in the same call.
  // We use a lenient regex over a 400-char window after each fleet-reaper-coordinator
  // mention so the producer's exact formatting doesn't break the guard.
  const set = infraSuggestCategorySet();
  const COORDINATOR_RE = /hook:\s*"fleet-reaper-coordinator"[\s\S]{0,400}?category:\s*"([^"]+)"/g;
  const missing = [];
  let m;
  while ((m = COORDINATOR_RE.exec(source)) !== null) {
    const cat = m[1];
    if (!set.has(cat)) missing.push(cat);
  }
  assert.deepEqual(
    missing,
    [],
    `fleet-reaper-coordinator emits these suggest categories not in INFRA_SUGGEST_CATEGORIES: ${missing.join(", ")} — add them to ollama-offload-dashboard.mjs INFRA_SUGGEST_CATEGORIES.`,
  );
});

test("U-REAPER-COORD-NOISE: REAL-DATA hook source contains both expected suggest emit sites", () => {
  // Pre-condition for the drift-guard: confirm the producer actually emits
  // at least the two known categories. If the producer is renamed or the
  // emit sites are removed, this test alerts so the dashboard set can be
  // pruned (avoiding a stale infra-classification that never matches).
  let source;
  try {
    source = readFileSync("H:/prism/scripts/fleet-reaper-sweep.mjs", "utf-8");
  } catch (e) {
    return; // skip if absent
  }
  assert.match(source, /fleet-reaper-prewarm/, "producer must still emit fleet-reaper-prewarm category");
  assert.match(source, /fleet-reaper-hint/, "producer must still emit fleet-reaper-hint category");
});

// --- formatSourceSplit (HERMES-UTIL / U-OFFLOAD-SOURCE-SPLIT 2026-06-18) ---
// Surfaces which backend actually served each fire (real-Hermes vs degrade-to-Ollama),
// so "is the remote lane utilized effectively?" is answerable from the dashboard.
test("formatSourceSplit: multi-source -> 'src=n' joined, highest first", () => {
  // the live ask-hermes shape: 853 real hermes, 2 fallback, 1 fail
  assert.equal(formatSourceSplit({ hermes: 853, "ollama-fallback": 2, fail: 1 }), "hermes=853 ollama-fallback=2 fail=1");
});

test("formatSourceSplit: single source -> '' (nothing to disambiguate)", () => {
  assert.equal(formatSourceSplit({ ollama: 154 }), "");
});

test("formatSourceSplit: zero/negative/NaN counts are dropped; <2 positive -> ''", () => {
  assert.equal(formatSourceSplit({ hermes: 5, "ollama-fallback": 0, fail: 0 }), ""); // only 1 positive
  assert.equal(formatSourceSplit({ a: 3, b: -1, c: NaN }), ""); // only 1 positive
  assert.equal(formatSourceSplit({ a: 3, b: 2 }), "a=3 b=2");
});

test("formatSourceSplit: ordering is by count desc, not insertion order (R9)", () => {
  assert.equal(formatSourceSplit({ low: 1, high: 99, mid: 50 }), "high=99 mid=50 low=1");
});

test("formatSourceSplit: missing/non-object -> '' (never throws)", () => {
  assert.equal(formatSourceSplit(undefined), "");
  assert.equal(formatSourceSplit(null), "");
  assert.equal(formatSourceSplit("nope"), "");
  assert.equal(formatSourceSplit({}), "");
});

// --- U-OLLAMA-BRIDGE-EXEC-VISIBILITY (alpha 2026-06-20): true off-Claude throughput ---
// ask-hermes (855+ real executions) writes a CUSTOM byHook bucket and never pushes
// to events[], so it was invisible to totals.offloaded/executedOffloads/every rate.
// summarize() now sums the EXECUTION bridges into bridgeExecutions so the dashboard
// reports REAL utilization, not just the prompt-classifier's DECISIONS.
test("summarize: bridgeExecutions sums execution-bridge hooks (excludes decision hooks)", () => {
  const stats = {
    schemaVersion: "2.0.0",
    byHook: {
      // DECISION hook (prompt classifier) -- MUST be excluded from bridge throughput.
      "ollama-task-offloader": { fired: 100, offloaded: 30, kept: 70, suggested: 0, tokensSaved: 5000 },
      "ask-hermes": { fired: 857, offloaded: 855, kept: 2, suggested: 0, tokensSaved: 12000, bySource: { hermes: 853 }, byMode: { ask: 854 } },
      "ask-ollama": { fired: 18, offloaded: 18, kept: 0, suggested: 0, tokensSaved: 48535 },
      "ask-openrouter": { fired: 1, offloaded: 1, kept: 0, suggested: 0, tokensSaved: 0 },
    },
    events: [],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.totals.bridgeExecutions, 855 + 18 + 1, "sums ONLY the 3 bridges");
  assert.equal(s.totals.bridgeTokensSaved, 12000 + 48535 + 0);
  assert.equal(s.byBridge["ask-hermes"].executions, 855);
  assert.deepEqual(s.byBridge["ask-hermes"].bySource, { hermes: 853 });
  assert.equal(s.byBridge["ollama-task-offloader"], undefined, "decision hook must NOT appear in byBridge");
});

test("summarize: bridgeExecutions is 0 with no bridge hooks (no crash, empty byBridge)", () => {
  const s = summarize({ byHook: { "ollama-task-offloader": { offloaded: 5 } }, events: [] }, 24 * HOUR_MS, NOW);
  assert.equal(s.totals.bridgeExecutions, 0);
  assert.equal(s.totals.bridgeTokensSaved, 0);
  assert.deepEqual(s.byBridge, {});
});

test("advisory: surfaces the TRUE off-Claude bridge throughput line", () => {
  const stats = { byHook: { "ask-hermes": { offloaded: 855, tokensSaved: 12000 } }, events: [] };
  const lines = advisory(summarize(stats, 24 * HOUR_MS, NOW));
  assert.ok(
    lines.some((l) => /TRUE off-Claude throughput.*855 executions/.test(l)),
    "advisory must surface the honest bridge throughput",
  );
});

// --- U-OLLAMA-OFFLOAD-SUCCESS-RATE (alpha 2026-06-20): real offload success rate ---
test("summarize: per-bridge successRate + fleet bridgeSuccessRate (offloaded/attempts)", () => {
  const stats = {
    byHook: {
      "ask-ollama": { fired: 20, offloaded: 18, kept: 2, suggested: 0, tokensSaved: 5000 },
      "ask-hermes": { fired: 857, offloaded: 855, kept: 2, suggested: 0, tokensSaved: 12000 },
    },
    events: [],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.byBridge["ask-ollama"].attempts, 20);
  assert.equal(s.byBridge["ask-ollama"].failures, 2);
  assert.ok(Math.abs(s.byBridge["ask-ollama"].successRate - 18 / 20) < 1e-9);
  assert.equal(s.totals.bridgeAttempts, 877);
  assert.ok(Math.abs(s.totals.bridgeSuccessRate - 873 / 877) < 1e-9, "fleet rate = total off / total attempts");
});

test("summarize: a bridge with no 'fired' field falls back to off+failures (no divide-by-phantom-0)", () => {
  const s = summarize({ byHook: { "ask-openrouter": { offloaded: 1 } }, events: [] }, 24 * HOUR_MS, NOW);
  assert.equal(s.byBridge["ask-openrouter"].attempts, 1);
  assert.equal(s.byBridge["ask-openrouter"].successRate, 1);
});

test("advisory: flags a DEGRADED bridge below the success floor (>= MIN_ATTEMPTS)", () => {
  const stats = { byHook: { "ask-ollama": { fired: 10, offloaded: 5, kept: 5, tokensSaved: 100 } }, events: [] };
  const lines = advisory(summarize(stats, 24 * HOUR_MS, NOW));
  assert.ok(
    lines.some((l) => /SUCCESS RATE/.test(l) && /DEGRADED/.test(l) && /ask-ollama/.test(l)),
    "a 50% bridge with 10 attempts must be flagged DEGRADED",
  );
});

test("advisory: does NOT false-flag a low-volume bridge below MIN_ATTEMPTS", () => {
  // 1 attempt / 0 success = 0% but only 1 attempt -> below MIN_ATTEMPTS_FOR_RATE, no alarm.
  const stats = { byHook: { "ask-openrouter": { fired: 1, offloaded: 0, kept: 1 } }, events: [] };
  const lines = advisory(summarize(stats, 24 * HOUR_MS, NOW));
  assert.ok(!lines.some((l) => /DEGRADED/.test(l)), "1-attempt bridge must not false-alarm");
});

// -- findUntrackedBridges drift guard (U-OLLAMA-OFFLOAD-DRIFT-GUARD, slot:alpha) --
// Self-detects a NEW ask-* execution bridge added without updating
// EXECUTION_BRIDGE_HOOKS -- the bug class that caused the ~46x utilization
// under-count (ask-hermes wrote a byHook bucket no metric read). These pin the
// detection so a re-introduced silent bridge fails loudly.
const TRACKED = new Set(["ask-ollama", "ask-hermes", "ask-openrouter"]);

test("findUntrackedBridges: flags a NEW ask-* bridge with activity that is not tracked", () => {
  const byHook = {
    "ask-newmodel": { fired: 40, offloaded: 38, kept: 2 }, // a 4th bridge nobody registered
    "ask-ollama": { fired: 100, offloaded: 99 },           // tracked -> ignored
  };
  const hits = findUntrackedBridges(byHook, TRACKED);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].hook, "ask-newmodel");
  assert.equal(hits[0].executions, 38);
  assert.equal(hits[0].fired, 40);
});

test("findUntrackedBridges: bySource-only or byMode.executed-only activity also counts as a bridge", () => {
  const byHook = {
    "ask-proxy": { bySource: { xai: 5, nous: 3 } },       // ask-hermes-style, no offloaded/fired
    "ask-runner": { byMode: { executed: 7 } },            // ask-ollama-style executed marker
  };
  const hits = findUntrackedBridges(byHook, TRACKED).map((h) => h.hook).sort();
  assert.deepEqual(hits, ["ask-proxy", "ask-runner"]);
});

test("findUntrackedBridges: ADVERSARIAL -- tracked bridges, non-ask hooks, and zero-activity ask-* never flag", () => {
  const byHook = {
    "ask-ollama": { fired: 50, offloaded: 50 },           // tracked
    "ask-hermes": { bySource: { ollama: 9 } },            // tracked
    "wiki-read-offload-advisory": { fired: 200, suggested: 200 }, // not ask-* -> never a bridge
    "rtk-adopt": { fired: 1000 },                          // not ask-* -> ignored
    "ask-dormant": { fired: 0, offloaded: 0 },            // ask-* but ZERO activity -> not running
  };
  assert.deepEqual(findUntrackedBridges(byHook, TRACKED), [], "no false positives");
});

test("findUntrackedBridges: empty / missing byHook -> [] (never throws)", () => {
  assert.deepEqual(findUntrackedBridges(undefined, TRACKED), []);
  assert.deepEqual(findUntrackedBridges({}, TRACKED), []);
  assert.deepEqual(findUntrackedBridges(null, TRACKED), []);
});

test("findUntrackedBridges: a CORRUPT bySource (string/array) is not mistaken for activity", () => {
  // hardening: Object.keys() of a non-empty string/array is truthy -> a corrupt
  // stats file must not emit a spurious untracked-bridge advisory.
  const byHook = {
    "ask-corruptstr": { bySource: "xai" },          // string, not an object
    "ask-corruptarr": { bySource: ["xai", "nous"] }, // array, not an object
  };
  assert.deepEqual(findUntrackedBridges(byHook, TRACKED), [], "corrupt bySource is not real activity");
});

test("advisory: surfaces a LOUD untracked-bridge warning end-to-end via summarize", () => {
  const stats = { byHook: { "ask-rogue": { fired: 30, offloaded: 29, kept: 1 } }, events: [] };
  const lines = advisory(summarize(stats, 24 * HOUR_MS, NOW));
  assert.ok(
    lines.some((l) => /UNTRACKED BRIDGE/.test(l) && /ask-rogue/.test(l) && /EXECUTION_BRIDGE_HOOKS/.test(l)),
    "an untracked running bridge must be surfaced loudly with the fix location",
  );
});

// ── U-OFFLOAD-DASH-XCONV (2026-06-24, slot:alpha) ────────────────────────────
// A pure-advisory hook only SUGGESTS, so its own byHook.offloaded is structurally
// 0 -- the per-hook line (offload=0) MIS-READS it as 0% useful. summarize() now
// overlays the TRUE cross-bucket conversion (crossBucketTakeRate, reused from
// scripts/lib/advisory-decay.mjs) keyed by the mapped advisory hooks present.
// These tests pin the REAL conversion arithmetic, not a stub.

test("U-OFFLOAD-DASH-XCONV: a mapped pure-advisory hook gets its TRUE cross-bucket conversion", () => {
  // large-read-digest-advisory -> ollama-file-digest (per CONVERSION_BUCKET_MAP).
  // It suggests 120 times with offloaded:0 (structural), and the execution bucket
  // it drives executed 5 -> the honest take-rate is 5/120, NOT 0.
  const stats = {
    schemaVersion: "2.0.0",
    byHook: {
      "large-read-digest-advisory": { fired: 120, suggested: 120, offloaded: 0, kept: 0 },
      "ollama-file-digest": { fired: 7, offloaded: 5, kept: 2 },
    },
    events: [],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  const x = s.xconvByHook["large-read-digest-advisory"];
  assert.equal(x.injected, 120, "injected = the advisory's own suggested count");
  assert.equal(x.taken, 5, "taken = offloaded read from the EXECUTION bucket it drives");
  assert.equal(x.takeRate, 5 / 120, "take-rate is taken/injected, the honest non-zero conversion");
  assert.equal(x.conversionKey, "ollama-file-digest");
  assert.equal(x.status, "measured");
});

test("U-OFFLOAD-DASH-XCONV: a mapped advisory whose execution bucket is ABSENT reads UNMEASURED, never a manufactured 0", () => {
  // nav-rerank-advisory -> ollama-nav-rerank, but that execution bucket is not
  // present -> the lib must report unmeasured (null), never coerce to a false 0
  // (the false-mute direction advisory-decay deliberately avoids).
  const stats = {
    schemaVersion: "2.0.0",
    byHook: { "nav-rerank-advisory": { fired: 40, suggested: 40, offloaded: 0 } },
    events: [],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  const x = s.xconvByHook["nav-rerank-advisory"];
  assert.equal(x.status, "unmeasured");
  assert.equal(x.takeRate, null, "absent execution bucket must NOT read as 0% (would falsely condemn the hook)");
  assert.equal(x.taken, null);
  assert.equal(x.conversionKey, "ollama-nav-rerank", "the conversion bucket it WOULD drive is still named");
});

test("U-OFFLOAD-DASH-XCONV: an UNMAPPED hook is absent from the overlay (no false xconv)", () => {
  // ollama-task-offloader is a real offloader, NOT a pure-advisory hook -> it has
  // no CONVERSION_BUCKET_MAP entry and must not appear in xconvByHook. A mapped
  // hook that never fired (not in byHook) is likewise absent.
  const stats = {
    schemaVersion: "2.0.0",
    byHook: { "ollama-task-offloader": { fired: 73, offloaded: 15, kept: 25, suggested: 33 } },
    events: [],
  };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal("ollama-task-offloader" in s.xconvByHook, false, "an unmapped offloader gets no xconv overlay");
  assert.equal("large-read-digest-advisory" in s.xconvByHook, false, "a mapped hook absent from byHook gets no overlay");
  assert.deepEqual(s.xconvByHook, {}, "no mapped advisory present -> empty overlay");
});

test("U-OFFLOAD-DASH-XCONV: overlay is ADDITIVE -- byHook passthrough + transparency fields are untouched", () => {
  const byHook = {
    "large-read-digest-advisory": { fired: 10, suggested: 10, offloaded: 0 },
    "ollama-file-digest": { fired: 3, offloaded: 1 },
  };
  const stats = { schemaVersion: "2.0.0", byHook, events: [] };
  const s = summarize(stats, 24 * HOUR_MS, NOW);
  assert.equal(s.byHook, byHook, "byHook must stay the exact passthrough object (overlay is a SEPARATE field)");
  assert.equal(s.byHook["large-read-digest-advisory"].offloaded, 0, "raw per-hook fields are not mutated");
  // existing recent transparency fields still present (no regression of prior contract)
  for (const f of ["rawOffloadRate", "adjustedOffloadRate", "adoptionRate", "suggestBreakdown"]) {
    assert.equal(f in s.recent, true, `recent.${f} must still exist`);
  }
});

test("U-OFFLOAD-DASH-XCONV adversarial: a corrupt non-numeric `suggested` -> UNMEASURED, never throws", () => {
  const stats = {
    schemaVersion: "2.0.0",
    byHook: {
      "large-read-digest-advisory": { fired: 120, suggested: "lots", offloaded: 0 }, // junk
      "ollama-file-digest": { offloaded: 5 },
    },
    events: [],
  };
  let s;
  assert.doesNotThrow(() => { s = summarize(stats, 24 * HOUR_MS, NOW); });
  const x = s.xconvByHook["large-read-digest-advisory"];
  assert.equal(x.injected, 0, "non-numeric suggested coerces to 0 (no NaN propagation)");
  assert.equal(x.status, "unmeasured", "injected<=0 -> unmeasured, no divide-by-zero take-rate");
  assert.equal(x.takeRate, null);
});

test("U-OFFLOAD-DASH-XCONV adversarial: missing/typeless byHook -> empty overlay, never throws", () => {
  for (const bad of [undefined, null, "notanobject", 42, []]) {
    let s;
    assert.doesNotThrow(() => { s = summarize({ schemaVersion: "2.0.0", byHook: bad, events: [] }, 24 * HOUR_MS, NOW); });
    assert.deepEqual(s.xconvByHook, {}, `byHook=${JSON.stringify(bad)} must yield an empty overlay, not a crash`);
  }
});
