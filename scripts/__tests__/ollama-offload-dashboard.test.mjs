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
