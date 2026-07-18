---
type: "chat-session"
source: "claude-code-cli"
session_id: "02436db5-5bb2-4a62-8e0d-1eeba8600240"
title: "You are reviewer B (test-integrity weighted) re-reviewing fix commit `807e631d1`"
date: "2026-05-16"
first_ts: "2026-05-16T05:51:58.469Z"
last_ts: "2026-05-16T05:57:01.410Z"
cwd: "H:\\prism"
messages: 77
user_msgs: 33
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-ae27c1a127520af41.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are reviewer B (test-integrity weighted) re-reviewing fix commit `807e631d1`

> **claude-code-cli** | 2026-05-16 | 77 msgs (33 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-ae27c1a127520af41.jsonl`

## Transcript

### User | 2026-05-16T05:51:58.469Z

You are reviewer B (test-integrity weighted) re-reviewing fix commit `807e631d1` in PRISM (`H:/prism`, branch cad-fusion-live-ms0). Do NOT assume reviewer A caught anything. A prior scrutiny gate FAILED; this commit claims to fix the test-integrity P1s.

Run `git show 807e631d1`. The prior P1s YOU raised:
- B2: `rgs-tool-planner.test.mjs` T4 used an error containing `RGS_DETERMINISTIC_PLAN_INVALID` — couldn't distinguish "only RGS error skipped" from "all errors swallowed".
- B3: `system-viz-graph.test.mjs` not hermetic (read the real 324MB graph for every test).
- B5: `rgs-plan-outcome.test.mjs` missing the passCount 1-vs-2 boundary test.

VERIFY each fix is REAL, not cosmetic:
1. B2: is there now a test injecting a GENERIC error (no `RGS_DETERMINISTIC_PLAN_INVALID` sentinel) that proves the unit is skipped AND the batch continues AND other units still planned? Read the new test — could a wrong implementation still pass it?
2. B3: are there hermetic `findInGraph` tests using an in-memory fake graph (no disk)? Do the real-graph tests now SKIP gracefully when the graph is absent (check for `{skip: ...}` or existsSync guard)? A test that still hard-reads the 324MB graph unconditionally = not fixed.
3. B5: are there tests for exactly 1 arm passing (NOT shipped) AND exactly 2 arms (shipped)? Read `scripts/lib/rgs-plan-outcome.mjs` to confirm the real threshold, then confirm the tests assert against it.
4. The P0 test fix: `.claude/hooks/__tests__/pick-prefresh-tool-plan.test.mjs` must now use the REAL tribal object shape and assert against `[object Object]` absence.
5. No new weak assertions (toBeDefined / length>0-only / always-true) introduced anywhere in the diff.
6. Run all 3 changed test files + confirm pass: `"H:/.claude/bin/portable-node" --test scripts/lib/system-viz-graph.test.mjs scripts/rgs-tool-planner.test.mjs scripts/lib/rgs-plan-outcome.test.mjs .claude/hooks/__tests__/pick-prefresh-tool-plan.test.mjs`.

FIRST LINE MUST be `VERDICT: PASS` or `VERDICT: FAI
... [+56 chars truncated]

### Assistant | 2026-05-16T05:52:03.669Z

I'll systematically verify each fix by reading the commit and test files.

### Assistant | 2026-05-16T05:52:04.152Z

[tool_use: Bash]

### User | 2026-05-16T05:52:04.822Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-05-16T05:52:09.070Z

[tool_use: Bash]

### User | 2026-05-16T05:52:12.459Z

[tool_result] Exit code 128
fatal: unrecognized argument: --no-cache

### Assistant | 2026-05-16T05:52:14.738Z

[tool_use: Bash]

### User | 2026-05-16T05:52:18.828Z

[tool_result] 807e631d1 [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
d771c9e3e [MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-GOAL-SHIP-REPORT-FIX1: control-byte literals → String.fromCharCode
8d083a831 [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-DOCS: 5-surface doc reflection (wiki + CLAUDE.md pointer)
be15f3b81 [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-DOCS: miles
... [+112 chars truncated]

### Assistant | 2026-05-16T05:52:20.890Z

[tool_use: Bash]

### User | 2026-05-16T05:52:25.102Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+983 chars truncated]

### Assistant | 2026-05-16T05:52:28.681Z

[tool_use: Bash]

### User | 2026-05-16T05:52:32.636Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+3544 chars truncated]

### Assistant | 2026-05-16T05:52:36.745Z

[tool_use: Bash]

### User | 2026-05-16T05:52:40.822Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+4385 chars truncated]

### Assistant | 2026-05-16T05:52:44.934Z

[tool_use: Bash]

### User | 2026-05-16T05:52:48.816Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+3621 chars truncated]

### Assistant | 2026-05-16T05:52:53.395Z

[tool_use: Bash]

### User | 2026-05-16T05:52:58.766Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+2449 chars truncated]

### Assistant | 2026-05-16T05:53:01.471Z

Now let me read the actual source files to verify the real threshold and that tests could not pass on wrong implementations:

### Assistant | 2026-05-16T05:53:03.440Z

[tool_use: Bash]

### User | 2026-05-16T05:53:07.152Z

[tool_result] 14: *   1. shipped  — unit id found in a commit body OR in a ledger PASS note
43: *   outcome: "shipped"|"blocked"|"reverted",
81:function isLedgerPass(entry) {
83:  const passCount = flags.filter(Boolean).length;
86:  return passCount >= 2 || Boolean(legacyPass);
113:  // --- Build shipped-id set from commit bodies ----------------------------
114:  const shippedFromCommits = new Set();
117:     
... [+338 chars truncated]

### Assistant | 2026-05-16T05:53:10.119Z

[tool_use: Bash]

### User | 2026-05-16T05:53:13.874Z

[tool_result]  * @param {LedgerEntry} entry
 * @returns {boolean}
 */
function isLedgerPass(entry) {
  const flags = [entry.opusReviewed, entry.claudeReviewed, entry.codexReviewed];
  const passCount = flags.filter(Boolean).length;
  // Legacy 2-arm entries used selfReviewed + agentReviewed; treat them as pass too.
  const legacyPass = entry.selfReviewed && entry.agentReviewed;
  return passCount >= 2 || Boolea
... [+247 chars truncated]

### Assistant | 2026-05-16T05:53:16.636Z

[tool_use: Bash]

### User | 2026-05-16T05:53:20.481Z

[tool_result] 19:const pickedBase = {
20:  unitKey: "U-FOO-01",
26:  notes: "U-FOO-01 shipped cleanly, all tests green",
47:        commitBodies: ["[CAD-FUSION-LIVE-MS0]/U-FOO-01: ship the engine"],
48:        pickedEvents: [pickedBase],
57:    assert.equal(r.unitKey, "U-FOO-01");
59:    assert.deepEqual(r.predictedPipelines, pickedBase.predictedPipelines);
73:        pickedEvents: [pickedBase],
93:        pick
... [+573 chars truncated]

### Assistant | 2026-05-16T05:53:23.197Z

[tool_use: Bash]

### User | 2026-05-16T05:53:26.769Z

[tool_result] const pickedBase = {
  unitKey: "U-FOO-01",
  sid: "claude-test-abc",
  predictedPipelines: ["build-doctor", "test-runner"],
};

const ledgerPassEntry = {
  notes: "U-FOO-01 shipped cleanly, all tests green",
  opusReviewed: true,
  claudeReviewed: true,
  codexReviewed: true,
};

### Assistant | 2026-05-16T05:53:30.430Z

Now I need to verify the T10/T11 tests carefully: the ledger entry's `notes` field must contain the unit ID "U-FOO-01" for `isLedgerPass` to work. Let me check how the ledger match logic works:

### Assistant | 2026-05-16T05:53:30.975Z

[tool_use: Bash]

### User | 2026-05-16T05:53:34.564Z

[tool_result]   // --- Build shipped-id set from ledger PASS notes -----------------------
  const shippedFromLedger = new Set();
  for (const entry of scrutinyLedger) {
    if (!isLedgerPass(entry)) continue;
    const notes = typeof entry.notes === "string" ? entry.notes : "";
    for (const id of extractUnitIds(notes)) {
      shippedFromLedger.add(id);
    }
  }

  // --- Classify each picked event --------
... [+823 chars truncated]

### Assistant | 2026-05-16T05:53:36.967Z

[tool_use: Bash]

### User | 2026-05-16T05:53:41.133Z

[tool_result] 66:function extractUnitIds(text) {
116:    for (const id of extractUnitIds(body)) {
126:    for (const id of extractUnitIds(notes)) {
138:    const candidateIds = new Set([unitKey, ...extractUnitIds(" " + unitKey)]);

### Assistant | 2026-05-16T05:53:43.965Z

[tool_use: Bash]

### User | 2026-05-16T05:53:47.552Z

[tool_result] function extractUnitIds(text) {
  const ids = new Set();
  for (const match of text.matchAll(UNIT_ID_RE)) {
    ids.add(match[1]);
  }
  return ids;
}

/**
 * Returns true when a ledger entry is considered PASS.
 * We require at least two of the three arm flags to be true (matches the
 * 3-of-3 gate spirit while tolerating legacy 2-arm entries).
 * @param {LedgerEntry} entry
 * @returns {boolean}

... [+3 chars truncated]

### Assistant | 2026-05-16T05:53:49.844Z

[tool_use: Bash]

### User | 2026-05-16T05:53:53.472Z

[tool_result] 55:const UNIT_ID_RE = /(?:[\[/\s]|^)(U-[A-Z0-9][A-Z0-9-]*)/gm;
68:  for (const match of text.matchAll(UNIT_ID_RE)) {

### Assistant | 2026-05-16T05:54:01.270Z

Good. The T10 ledger note says "U-FOO-01 reviewed by arm A only" — that contains "U-FOO-01" so extractUnitIds will match it. The `pickedBase.unitKey` is "U-FOO-01". This is critical: the 1-arm test uses `opusReviewed: true` only, so `passCount === 1 < 2`, `isLedgerPass` returns false, "U-FOO-01" never gets added to `shippedFromLedger`, outcome will be "blocked". Test is valid.

For T11: `opusReviewed: true, claudeReviewed: true` → `passCount === 2 >= 2`, `isLedgerPass` returns true, notes contain "U-FOO-01", so it gets added to `shippedFromLedger`, outcome is "shipped". Correct.

Now let me verify the T7 rgs-tool-planner test — could a wrong implementation (e.g. swallowing ALL errors) still pass it?

### Assistant | 2026-05-16T05:54:02.595Z

[tool_use: Bash]

### User | 2026-05-16T05:54:05.977Z

[tool_result] 111:  it("returns planned=3, skipped=0", () => {
112:    assert.equal(result.planned, 3, `planned=${result.planned}`);
113:    assert.equal(result.skipped, 0, `skipped=${result.skipped}`);
138:// T2: re-run with same checkpoint (hashes unchanged) + no force → all 3 skipped
141:describe("T2: checkpoint resume — all 3 already hashed → skipped", () => {
174:  it("first run planned 3", () => {
175:   
... [+1536 chars truncated]

### Assistant | 2026-05-16T05:54:08.804Z

[tool_use: Bash]

### User | 2026-05-16T05:54:12.388Z

[tool_result] 16: *     → { planned, skipped, degraded, sidecar }
104: * Missing file → empty Map. Corrupt lines are skipped (warn stderr).
416: * @returns {Promise<{planned:number, skipped:number, degraded:boolean, sidecar:string}>}
433:  let planned = 0;
434:  let skipped = 0;
445:      skipped++;
457:        skipped++;
462:      skipped++;
467:      skipped++;
472:    planned++;
487:  return { planned, skipp
... [+201 chars truncated]

### Assistant | 2026-05-16T05:54:14.695Z

[tool_use: Bash]

### User | 2026-05-16T05:54:17.913Z

[tool_result]   // In-memory plan accumulator
  const plans = {};

  let planned = 0;
  let skipped = 0;
  let processedSinceFlush = 0;

  const { fuseSignals } = await import("./lib/rgs-signal-fusion.mjs");

  for (const unit of units) {
    const complexity = complexityFn(unit);
    const hash = sourceHash(unit, complexity);

    // Skip-check: if checkpoint has this key with matching hash and not force
    i
... [+1279 chars truncated]

### Assistant | 2026-05-16T05:54:27.565Z

This is a critical finding. Looking at lines 453-463: BOTH the sentinel error and generic errors go to `skipped++; continue`. The T7 test asserts `skipped===1` and `planned===2`. A wrong implementation that swallowed ALL errors (turning them into planned units instead of skipped) would FAIL T7's assertions. A wrong implementation that aborted the batch entirely would produce `planned < 2`. So T7 does constrain wrong implementations — it's not trivially passable by a no-op error swallower.

But wait — let me think more carefully. Could an implementation that threw the error all the way up (aborting the batch) still pass T7? No — T7 wraps `runPlanner` in a `before()` block and asserts `result` exists. If the batch threw, `result` would be undefined and the first `assert.ok(result)` would fail.

Now let me verify B3 more carefully — specifically whether the `HAVE_GRAPH` guard is evaluated at module load time (correct) or inside the test callback (wrong):

### Assistant | 2026-05-16T05:54:28.353Z

[tool_use: Bash]

### User | 2026-05-16T05:54:32.755Z

[tool_result] import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph, findInGraph } from "./system-viz-graph.mjs";

// Resolve the graph path from the lib's own ROOT logic so we stay in sync.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.res
... [+769 chars truncated]

### Assistant | 2026-05-16T05:54:36.583Z

Good. `HAVE_GRAPH = fs.existsSync(GRAPH_PATH)` is evaluated at module load time (top-level const). The `{ skip: !HAVE_GRAPH }` object is passed to `test()` as the options argument — this is correct Node.js test runner syntax. The real-disk tests will skip if the graph is absent.

Now verify the hermetic tests don't load the real graph:

### Assistant | 2026-05-16T05:54:37.246Z

[tool_use: Bash]

### User | 2026-05-16T05:54:41.062Z

[tool_result] // ---------------------------------------------------------------------------
// Hermetic tests — use a fake in-memory graph, no disk I/O
// ---------------------------------------------------------------------------

const fakeG = {
  nodes: [
    { id: "KienzleForceModel", label: "Kienzle Force Model", info: "cutting force", layer: "L5" },
    { id: "FooEngine",         label: "Foo Engine",    
... [+1089 chars truncated]

### Assistant | 2026-05-16T05:54:43.782Z

Now check the `findInGraph` signature — does it accept an in-memory graph object or does it always `loadGraph()` internally?

### Assistant | 2026-05-16T05:54:44.657Z

[tool_use: Bash]

### User | 2026-05-16T05:54:48.978Z

[tool_result] 10: *   findInGraph(G, q, opts)   — case-insensitive node search (same logic as
28:export function loadGraph() {
50:export function findInGraph(G, terms, { limit = 30 } = {}) {

### Assistant | 2026-05-16T05:54:51.528Z

[tool_use: Bash]

### User | 2026-05-16T05:54:55.075Z

[tool_result] export function findInGraph(G, terms, { limit = 30 } = {}) {
  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
  return G.nodes
    .filter(n =>
      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit);
}

### Assistant | 2026-05-16T05:55:04.553Z

`findInGraph` takes `G` as a parameter and uses `G.nodes` directly — no internal `loadGraph()` call. The hermetic tests pass `fakeG` directly, so no disk I/O happens. B3 fix is real and correct.

Now verify the `fakeG` has an edge case: the "engine" query test expects exactly 1 result with `limit: 1`. The fakeG has 2 nodes with "Engine" in the label ("Kienzle Force Model" — no, "Foo Engine" and... wait, does "KienzleForceModel" match "engine"?). Let me check: `n.label + " " + n.id + " " + n.info` for "KienzleForceModel" is "Kienzle Force Model KienzleForceModel cutting force" — no "engine". "FooEngine" is "Foo Engine FooEngine " — yes. "BarTool" is "Bar Tool BarTool tooling" — no. So only 1 match exists naturally, and the limit is 1. The test is valid even without the limit — it would still return exactly 1. This means the test doesn't actually exercise the limit enforcement (it would pass even if limit was ignored, because there's only 1 matching node). That's a mild test-quality issue but not a blocker.

Now run the test suite:

### Assistant | 2026-05-16T05:55:05.651Z

[tool_use: Bash]

### User | 2026-05-16T05:55:20.189Z

[tool_result] TAP version 13
# Subtest: loadGraph returns graph with nodes array >1000
ok 1 - loadGraph returns graph with nodes array >1000
  ---
  duration_ms: 2165.2842
  ...
# Subtest: findInGraph kienzle returns ≥1 real match
ok 2 - findInGraph kienzle returns ≥1 real match
  ---
  duration_ms: 2162.492
  ...
# Subtest: findInGraph is pure (idempotent)
ok 3 - findInGraph is pure (idempotent)
  ---
  durati
... [+858 chars truncated]

### Assistant | 2026-05-16T05:55:24.204Z

The graph IS present (7 pass, 0 skip) — the real-disk tests ran and passed. This means B3's "skip when absent" path is untested in this environment but the skip guard code is structurally correct. Let me now run the other test files:

### Assistant | 2026-05-16T05:55:24.917Z

[tool_use: Bash]

### User | 2026-05-16T05:55:29.640Z

[tool_result] TAP version 13
# [rgs-tool-planner] Skipping MS-TEST::U-2: RGS_DETERMINISTIC_PLAN_INVALID: test bomb
# [rgs-tool-planner] Unexpected error for MS-TEST::U-2: network boom
# Subtest: T1: basic 3-unit run
    # Subtest: returns planned=3, skipped=0
    ok 1 - returns planned=3, skipped=0
      ---
      duration_ms: 0.5546
      ...
    # Subtest: sidecar file exists and has schemaVersion 1.0.0
    o
... [+3790 chars truncated]

### Assistant | 2026-05-16T05:55:33.788Z

[tool_use: Bash]

### User | 2026-05-16T05:55:37.350Z

[tool_result] TAP version 13
# Subtest: T1: unit id in commit body → shipped
    # Subtest: picked unit whose id appears in a commit body is classified shipped
    ok 1 - picked unit whose id appears in a commit body is classified shipped
      ---
      duration_ms: 1.1948
      ...
    1..1
ok 1 - T1: unit id in commit body → shipped
  ---
  duration_ms: 1.7512
  type: 'suite'
  ...
# Subtest: T2: unit id in 
... [+3989 chars truncated]

### Assistant | 2026-05-16T05:55:42.653Z

[tool_use: Bash]

### User | 2026-05-16T05:55:47.871Z

[tool_result] TAP version 13
# Subtest: pick-prefresh tool-plan injection
    # Subtest: injects plan pipelines when prompt contains MS::unit key
    ok 1 - injects plan pipelines when prompt contains MS::unit key
      ---
      duration_ms: 53.9021
      ...
    # Subtest: tribal object tip text is rendered — not [object Object] (P0 regression guard)
    ok 2 - tribal object tip text is rendered — not [object
... [+2942 chars truncated]

### Assistant | 2026-05-16T05:55:51.575Z

All four test files pass. Let me do one final check — verify the pick-prefresh-inject.mjs P0 fix is real (the object-render fix), and check for any weak assertions introduced in the diff:

### Assistant | 2026-05-16T05:55:53.048Z

[tool_use: Bash]

### User | 2026-05-16T05:55:56.672Z

[tool_result] commit 807e631d1a4685fbbe941d3363e94e44ecfd0f2d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat May 16 00:50:58 2026 -0500

    [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SCRUTINY-FIX: fix object-render P0 + 4 test-integrity/portability P1s from 3-of-3 gate
    
    - pick-prefresh-inject.mjs: fix object-render P0 (toString on slot object -> string)
    - rgs-outcome-record-stop.mj
... [+1512 chars truncated]

### Assistant | 2026-05-16T05:56:03.583Z

[tool_use: Bash]

### User | 2026-05-16T05:56:07.126Z

[tool_result] +      const text = typeof t === "string" ? t : (t && t.tip ? t.tip : String(t));

### Assistant | 2026-05-16T05:56:10.144Z

[tool_use: Bash]

### User | 2026-05-16T05:56:13.416Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-16T05:56:18.333Z

[tool_use: Bash]

### User | 2026-05-16T05:56:22.492Z

[tool_result] +  assert.ok(hits.length >= 1, `expected ≥1 hit, got ${hits.length}`);
+    assert.ok(result, "result must exist");

### Assistant | 2026-05-16T05:56:28.515Z

The `assert.ok(result)` in T7 is a guard to confirm the batch didn't throw — it's the premise for the subsequent `planned`/`skipped` exact-count assertions that follow and are the real load-bearing checks. The `assert.ok(hits.length >= 1)` in the hermetic kienzle test is paired with a follow-up `every()` assertion that validates content. Neither is a standalone weak assertion.

Let me also check the T10 test's `pickedBase` coupling more carefully — specifically whether the "U-FOO-01" in the notes would be extracted by the regex:

### Assistant | 2026-05-16T05:56:30.899Z

[tool_use: Bash]

### User | 2026-05-16T05:56:34.480Z

[tool_result] [ 'U-FOO-01' ]

### Assistant | 2026-05-16T05:57:01.410Z

The `^` anchor in the regex captures "U-FOO-01" when it appears at the start of the notes string. The T10 ledger entry has `notes: "U-FOO-01 reviewed by arm A only"` — starts with the ID — so it IS extracted. Since `opusReviewed: true` but `claudeReviewed: false, codexReviewed: false`, `passCount === 1 < 2`, `isLedgerPass` returns false, so "U-FOO-01" is NOT added to `shippedFromLedger`, and the outcome is "blocked". Test is structurally sound.

---

VERDICT: PASS

B2 fix is real and discriminating. T7 injects a generic "network boom" error (no sentinel) for unit index 1 of 3. The planner's catch-block logs and increments `skipped` for ALL non-sentinel errors (lines 464-467 of `rgs-tool-planner.mjs`), so the batch continues. T7 asserts `skipped===1, planned===2, total===3` — a wrong implementation that aborted the batch would produce `result===undefined` (first assertion fails), one that swallowed errors into planned units would produce `planned===3, skipped===0` (second assertion fails). The test cannot pass on incorrect behavior.

B3 fix is real. `HAVE_GRAPH = fs.existsSync(GRAPH_PATH)` is evaluated at module load (top-level const), passed as `{ skip: !HAVE_GRAPH }` to `test()` — correct Node.js test-runner syntax. The three hermetic tests call `findInGraph(fakeG, ...)` directly (no `loadGraph()` call), and `findInGraph` uses its `G` parameter directly. All 7 tests pass (the graph is present in this environment, so real-disk tests ran rather than skipped — the skip path is code-correct but untested by the run). Minor: the limit=1 hermetic test has only 1 matching node, so it passes even without limit enforcement — this is a test-quality weakness but not a blocker.

B5 fix is real. T10 (`opusReviewed:true` only, passCount=1) asserts outcome="blocked". T11 (`opusReviewed:true, claudeReviewed:true`, passCount=2) asserts outcome="shipped". The real threshold `passCount >= 2` confirmed at `rgs-plan-outcome.mjs:86`. Tests assert against the exact boundary. Both pass.

P
... [+901 chars truncated]
