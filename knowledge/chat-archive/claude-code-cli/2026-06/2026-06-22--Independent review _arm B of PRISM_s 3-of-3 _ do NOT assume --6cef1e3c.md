---
type: "chat-session"
source: "claude-code-cli"
session_id: "6cef1e3c-59a5-4cd8-8447-449991f1ed8d"
title: "Independent review (arm B of PRISM's 3-of-3 — do NOT assume arm A caught everyth"
date: "2026-06-22"
first_ts: "2026-06-22T02:34:27.743Z"
last_ts: "2026-06-22T02:38:36.438Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 25
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a9bd85558cc1cc252.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review (arm B of PRISM's 3-of-3 — do NOT assume arm A caught everyth

> **claude-code-cli** | 2026-06-22 | 64 msgs (25 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a9bd85558cc1cc252.jsonl`

## Transcript

### User | 2026-06-22T02:34:27.743Z

Independent review (arm B of PRISM's 3-of-3 — do NOT assume arm A caught everything; weight toward TEST INTEGRITY + the test-hermeticity fix). Repo H:/prism, commit 4d2003214e: `git -C H:/prism show 4d2003214e` (`[SIERRA-VIZ]/U-VIZ-AUG-FRESHNESS-GUARD`).

Focus:
1. scripts/lib/augmentation-freshness.test.mjs (11 tests) — are they REAL reference-value/invariant tests or weak presence stubs? Does the boundary test actually pin freshHr=24/staleHr=168 semantics (>= vs <)? Does the LIVE test (parse real merge-augmentations.mjs, assert the 4 known orphans -> stale-orphan) genuinely fail if the classifier or the merge contract changes? Any test that would pass even if classifyAugmentationFreshness returned a constant?
2. The HERMETICITY FIX in sierra-graph-health-inject.test.mjs: the claim is the E2E was PRE-EXISTING red because fixtures hardcoded NOW=2026-06-15 while the spawned hook uses real Date.now(), so fixtures rotted to STALE past NOW+24h. The fix adds realRecent() (real-time-relative) for E2E fixtures only. VERIFY this is a legitimate hermeticity fix, NOT a masking of a real regression: (a) is the pure-helper NOW unchanged (still injects fixed NOW)? (b) does realRecent only affect the 3 E2E timestamps? (c) could realRecent itself rot or flake? (d) do the E2E assertions still meaningfully test the block content?
3. formatAugmentationStaleness tests — happy + >=3 failure + >=2 adversarial present and real? The 24h half-open window tested at the boundary?
4. Run the suites yourself if useful: `node --test scripts/lib/augmentation-freshness.test.mjs` and `node --test .claude/hooks/sierra-graph-health-inject.test.mjs`.
Grade PASS/FAIL with P0/P1/P2 + file:line. A test that can't fail when the logic breaks is a P1.

### Assistant | 2026-06-22T02:34:34.522Z

I'll review commit 4d2003214e with focus on test integrity and the hermeticity fix. Let me start by reading the commit and the relevant files end to end.

### Assistant | 2026-06-22T02:34:35.474Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:34:35.941Z

[tool_use: Read]

### Assistant | 2026-06-22T02:34:36.186Z

[tool_use: Read]

### User | 2026-06-22T02:34:36.715Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\augmentation-freshness.mjs' was already read 0s ago in this session and is unchanged (mtime 1782095007879). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T02:34:36.928Z

[tool_result] 1	// Tests for augmentation-freshness.mjs -- the system-viz merged-augmentation
2	// staleness classifier (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21).
3	// Real reference values + algebraic invariants + a live-data assertion against the
4	// actual merge-augmentations.mjs source. Injected now + stat -> deterministic.
5	//
6	// Run: node --test scripts/lib/augmentation-fr
... [+8592 chars truncated]

### User | 2026-06-22T02:34:39.502Z

[tool_result] commit 4d2003214e23e9af45d0afbd8a9c1e696701361b
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:33:22 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-FRESHNESS-GUARD (slot:sierra): surface merged-but-stale augmentations the GREEN badge masks
    
    ROOT CAUSE (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
    the system-viz graph-hea
... [+3291 chars truncated]

### Assistant | 2026-06-22T02:34:43.116Z

The freshness source was flagged as already read. Let me read it now via a fresh read, plus the hook source and its test file.

### Assistant | 2026-06-22T02:34:43.587Z

[tool_use: Read]

### Assistant | 2026-06-22T02:34:43.889Z

[tool_use: Read]

### User | 2026-06-22T02:34:44.035Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\augmentation-freshness.mjs' was already read 8s ago in this session and is unchanged (mtime 1782095007879). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T02:34:47.097Z

[tool_result] 1	/**
2	 * sierra-graph-health-inject.test.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-XSUB-SURFACE
3	 *
4	 * Real tests for the cross-substrate embeds-degradation surfacing added to the sierra
5	 * graph-health inject (closes the A3 loop -- the cross-substrate-warnings.json sidecar
6	 * was write-only/silent before this). Two layers:
7	 *   1. pure formatEmbedsWarning(): happy (single + multi) + 3 failure 
... [+11550 chars truncated]

### Assistant | 2026-06-22T02:34:52.184Z

The read-once guard is blocking re-reads of the freshness lib. Let me read it via Bash (git show) since I need the implementation to verify the tests, plus the hook source.

### Assistant | 2026-06-22T02:34:53.255Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:34:54.158Z

[tool_use: Read]

### User | 2026-06-22T02:34:56.140Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\sierra-graph-health-inject.mjs' was already read 8s ago in this session and is unchanged (mtime 1782095226270). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-22T02:34:58.087Z

[tool_result] // augmentation-freshness.mjs -- classify the freshness of every system-viz
// augmentation file the MERGE actually folds into the live graph.
//
// WHY (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
// regen-viz re-merges system-graph.json and reports GREEN from whatever augmentation
// files exist on disk. Two silent-staleness paths leave a GREEN graph on rotting inputs:
... [+5328 chars truncated]

### Assistant | 2026-06-22T02:35:01.813Z

The hook source was already read into context but the read-once guard is hiding it from me. Let me read it via Bash to get the formatAugmentationStaleness implementation and the slot-gate logic, then run both suites.

### Assistant | 2026-06-22T02:35:02.562Z

[tool_use: Bash]

### User | 2026-06-22T02:35:08.019Z

[tool_result] #!/usr/bin/env node
// tier: T2 — slot:sierra custom system-viz graph-health inject (U-PSGB-SIERRA 2026-05-29).
// UserPromptSubmit hook. SLOT-GATED no-op for every slot except sierra (zero blast radius
// for 25/26 slots). Surfaces LIVE system-viz graph-regen health (last-success vs last-failure,
// graph size, pendingCount, the exit-134 merge-OOM class) so slot:sierra knows whether the
// canoni
... [+9118 chars truncated]

### Assistant | 2026-06-22T02:35:11.214Z

I now have all source. Let me run both suites to confirm green, and verify the merge-augmentations contract that the LIVE test depends on.

### Assistant | 2026-06-22T02:35:12.223Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:35:13.572Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:35:15.025Z

[tool_use: Bash]

### User | 2026-06-22T02:35:24.432Z

[tool_result]   ...
# Subtest: LIVE: real merge-augmentations.mjs folds the known stale orphans -> classified stale-orphan
ok 10 - LIVE: real merge-augmentations.mjs folds the known stale orphans -> classified stale-orphan
  ---
  duration_ms: 1.0606
  ...
# Subtest: SLOW_CADENCE + FRESHNESS_DEFAULTS are the documented contract
ok 11 - SLOW_CADENCE + FRESHNESS_DEFAULTS are the documented contract
  ---
  durati
... [+123 chars truncated]

### User | 2026-06-22T02:35:30.183Z

[tool_result]     # Subtest: sierra slot but NO warnings sidecar -> health block present, no degradation line
    ok 4 - sierra slot but NO warnings sidecar -> health block present, no degradation line
      ---
      duration_ms: 52.6514
      ...
    # Subtest: PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1 -> no block even for the sierra slot with warnings present
    ok 5 - PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1 -> no bl
... [+324 chars truncated]

### User | 2026-06-22T02:35:35.585Z

[tool_result] 121:const awareness  = loadOptional("awareness-augmentation.json");
128:const fileCoverageV2 = loadOptional("file-coverage-v2-augmentation.json");
132:const coreInventory  = loadOptional("core-inventory-augmentation.json");
133:const fsInventory    = loadOptional("fs-inventory-augmentation.json");

### Assistant | 2026-06-22T02:35:40.698Z

Both suites pass (11/11 and 21/21) and the 4 known orphans are genuinely `loadOptional`'d in the real merge source. Now let me probe the test-integrity questions adversarially. First, the key arm-B question: could each test pass even if `classifyAugmentationFreshness` returned a constant? And does the parser regex match what the LIVE test claims? Let me check the parser's `loadJson` claim and the future-detection edge.

### Assistant | 2026-06-22T02:35:42.123Z

[tool_use: Bash]

### User | 2026-06-22T02:35:46.460Z

[tool_result] ---loadOptional count---
112

### Assistant | 2026-06-22T02:35:48.085Z

[tool_use: Bash]

### User | 2026-06-22T02:35:55.633Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\augmentation-freshness.mjs' imported from C:\Users\wompu\AppData\Local\Temp\mutant_test.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/augmentation-freshness.mjs"?
    at finalizeResolution (nod
... [+695 chars truncated]

### Assistant | 2026-06-22T02:35:59.206Z

The temp file resolved relative to its own dir. Note: `loadJson` has 0 occurrences in the real merge source (only `loadOptional`), so the parser's `loadJson` branch is only exercised by the synthetic unit test, not LIVE — that's fine and honest. Let me re-run the mutation probe with an absolute import path.

### Assistant | 2026-06-22T02:36:06.690Z

[tool_use: Bash]

### User | 2026-06-22T02:36:12.395Z

[tool_result] boundary: [["b24.json","stale-warn"],["b168.json","stale-orphan"],["u24.json","fresh"]]
future: future
slow@300: stale-expected
slow@800: stale-orphan
parse: ["a.json","b.json"]

### Assistant | 2026-06-22T02:36:18.557Z

All semantics confirmed real: the boundary test pins exact `>=` semantics (23.9→fresh, 24→stale-warn, 168→stale-orphan), future detection works, slow-cadence ceiling distinguishes 300h (stale-expected) from 800h (stale-orphan), and the parser dedups + handles both quote styles + skips non-json. A constant-returning classifier would fail every one of these because the same call with different ages produces different classes.

Now the critical hermeticity-fix verification. Let me confirm: (a) the pure-helper NOW is still fixed, (b) `realRecent` only touches the 3 E2E fixture timestamps, (c) whether `realRecent` could itself rot, (d) whether the E2E assertions still test block content meaningfully. Let me look at the exact diff of the test file and check the boundary case `realRecent(120)` for the regen sidecar.

### Assistant | 2026-06-22T02:36:19.900Z

[tool_use: Bash]

### User | 2026-06-22T02:36:23.853Z

[tool_result] 46:--- a/.claude/hooks/sierra-graph-health-inject.test.mjs
47:+++ b/.claude/hooks/sierra-graph-health-inject.test.mjs
52:-import { formatEmbedsWarning } from "./sierra-graph-health-inject.mjs";
53:+import { formatEmbedsWarning, formatAugmentationStaleness } from "./sierra-graph-health-inject.mjs";
58:+// E2E fixtures must be REAL-time-relative: the spawned hook computes age/window from
59:+// the 
... [+5014 chars truncated]

### Assistant | 2026-06-22T02:36:28.654Z

Now let me verify the hermeticity-fix claim rigorously. The diff shows `realRecent` replaces `recent(120)` at the regen sidecar (line 132), `recent(30)` at the embeds E2E (line 148), and is used in the new freshness E2E (line 158). I need to verify two things: (1) the non-sierra and DISABLE E2E tests still use `recent()` (fixed NOW) — and whether that is a latent rot risk; (2) whether the pure-helper tests stay on fixed NOW. Let me check the remaining `recent(` usages inside the E2E block and confirm the claim that the fixed-NOW E2E fixtures don't rot.

### Assistant | 2026-06-22T02:36:30.221Z

[tool_use: Bash]

### User | 2026-06-22T02:36:35.046Z

[tool_result] 33:      { at: recent(60), warnings: ["embeds: node-card offset oracle ABSENT -> 0 embeds edges emitted"], embedsEdges: 0, oracleLoaded: false },
47:      { at: recent(30), warnings: ["a absent", "b absent", "collapsed"], embedsEdges: 0, oracleLoaded: true },
64:    assert.equal(formatEmbedsWarning({ at: recent(5), warnings: [], embedsEdges: 562 }, NOW), null);
77:    assert.equal(formatEmbedsWarn
... [+1187 chars truncated]

### Assistant | 2026-06-22T02:36:44.948Z

(That re-anchor refers to a different chat's working set — not relevant to my read-only review task.)

Now I have everything I need to assess the hermeticity fix. Let me verify the key correctness question: the E2E tests at lines 192 and 208 still use the fixed-NOW `recent(5)` for their warnings fixtures. These are the non-sierra (slot-gated no-op) and DISABLE tests. The question is whether they can rot like the original bug.

Analysis:
- **Line 192** (non-sierra test): asserts `hookSpecificOutput === undefined` because the slot is `alpha`, not `sierra`. The hook short-circuits at the slot gate before ever reading/aging the warnings fixture. So the stale `recent(5)` timestamp is never evaluated — cannot rot.
- **Line 208** (DISABLE test): asserts no block because `PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1` short-circuits before `renderBlock()`. The `recent(5)` warnings fixture is never aged — cannot rot.

So the fix correctly converted *only the E2E fixtures whose freshness is actually evaluated by the spawned hook* (lines 148, 170, 181) to `realRecent`, and left the two short-circuit tests on fixed-NOW because their timestamps are inert. This is precise, not a blanket conversion. Let me confirm the regen sidecar at line 148 must be real-time-relative (it feeds the GREEN-vs-STALE verdict via real `Date.now()`), which validates why it had to change.

### Assistant | 2026-06-22T02:36:48.138Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:36:48.530Z

[tool_use: Bash]

### User | 2026-06-22T02:36:54.561Z

[tool_result] stash@{0}: On slot/bravo: pre-sync-main dirty state (CRLF noise + stale mirror debris, 2026-06-12)
stash@{1}: WIP on cad-fusion-live-ms0: 1f7d492ea0 [MAIN] [SLOT-WORKTREE-MS0]/U-LANE-CD-AWARE-HELPER (slot:india): cd-aware effective-cwd resolver -- the core fix for fleet commit-contention. ROOT CAUSE: the slot-lane hooks (git-add-lane-guard/worktree-commit-route/main-tree-write-block) read cwd from
... [+1205 chars truncated]

### User | 2026-06-22T02:36:59.230Z

[tool_result] === Does the regen sidecar ts feed a real-Date.now() verdict? renderBlock uses Date.now() not injected now ===
38: * verdict rendered above. Exported for unit testing.
40: * @param {number} now - Date.now() (injected for deterministic tests)
48:  if (now - warnT >= SURFACE_WINDOW_MS) return null; // stale -> staleness verdict already covers it
62: * GREEN-badge-masks-rotting-inputs gap: GREEN mean
... [+1274 chars truncated]

### Assistant | 2026-06-22T02:37:12.001Z

This confirms the hermeticity diagnosis precisely:

- **Pure-helper `NOW` is unchanged** (line 22: `Date.parse("2026-06-15T12:00:00.000Z")`) and `recent` (line 23) still derives from it. All pure-helper tests inject `NOW` explicitly, so they stay deterministic.
- **The regen sidecar `ts` at line 148 genuinely feeds a real-`Date.now()` verdict**: `renderBlock` computes `ageH = (Date.now() - okT)/3.6e6` (line 90) and `verdict = ... Number(ageH) > 24 ? STALE : GREEN` (line 91). With the old fixed `recent(120)` = 2026-06-15T10:00Z, by 2026-06-21 that's ~150h old → `ageH > 24` → verdict renders STALE, but the block STILL renders (STALE is healthy). The actual rot is the **embeds/freshness fixtures** at lines 170/181: those pass through `formatEmbedsWarning`/`formatAugmentationStaleness` with `now = Date.now()`, and `now - warnT >= SURFACE_WINDOW_MS (24h)` returns null once wall-clock passes fixture+24h — so the E2E assertions `match(/embeds DEGRADED/)` and `/STALE-ORPHAN/` would fail. The fix (`realRecent`) is the correct, minimal repair.
- **`realRecent` cannot itself rot or flake**: it is `Date.now() - mins*60000`, always producing a timestamp 120/30/20 minutes in the past relative to the moment the suite runs — always inside the 24h window. No wall-clock dependency on a future date. The only theoretical flake is a multi-hour clock change mid-suite, which is not a realistic concern.
- **The E2E assertions still meaningfully test block content**: line 175 asserts `/embeds DEGRADED/`, line 185-187 assert `/STALE-ORPHAN/` + `/awareness-augmentation/` + `/system-viz graph health/`. These match the actual rendered strings from the helpers and would fail if the freshness surfacing broke. Not weakened.

Now let me verify the `>3 orphans` test and the `(+N more)` arithmetic one more time, plus confirm there are no `.skip`/`.only` slipped in anywhere, and confirm the audit CLI / regen-viz wiring isn't a stub.

### Assistant | 2026-06-22T02:37:15.300Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:37:15.767Z

[tool_use: Read]

### Assistant | 2026-06-22T02:37:16.742Z

[tool_use: Bash]

### User | 2026-06-22T02:37:17.559Z

[tool_result] read-once-guard: 'H:\prism\scripts\audit-augmentation-freshness.mjs' was already read 2m ago in this session and is unchanged (mtime 1782095115743). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T02:37:24.170Z

[tool_result] === skip/only audit (both files) ===
NONE FOUND (clean)
=== toBeDefined/weak stubs ===
NONE (clean)

### User | 2026-06-22T02:37:30.853Z

[tool_result] 47:+++ b/scripts/regen-viz.mjs
52:+// augmentation-freshness audit (U-VIZ-AUG-FRESHNESS-GUARD, sierra): refresh the
53:+// .augmentation-freshness.json sidecar so sierra-graph-health-inject surfaces any
54:+// merged-but-stale augmentation (a retired/failed producer whose stale data keeps
55:+// folding into the graph behind a GREEN badge). Advisory (no --strict) -- the audit's
56:+// own report i
... [+200 chars truncated]

### Assistant | 2026-06-22T02:37:34.594Z

Clean: no skip/only/todo, no weak stubs. The audit CLI was already read into context. Let me read it via Bash to verify it's not a stub (the LIVE validation arm of the commit), and run the audit against the real repo to confirm the "10 orphans, 0 false alarms" claim is reproducible.

### Assistant | 2026-06-22T02:37:35.555Z

[tool_use: Bash]

### User | 2026-06-22T02:37:39.517Z

[tool_result] #!/usr/bin/env node
// audit-augmentation-freshness.mjs -- surface system-viz augmentations that the MERGE
// folds into the live graph but that have gone STALE (a failed/retired producer).
//
// The GREEN graph-health badge means "system-graph.json was re-merged recently" -- NOT
// "its augmentation inputs are fresh". This audit closes that gap: it parses the
// authoritative set of merged augmen
... [+3814 chars truncated]

### Assistant | 2026-06-22T02:37:42.962Z

The audit CLI is real (not a stub): reads real merge source, ages by real mtime, atomic sidecar write, `--strict` exit-2, env knobs. Let me run it against the live repo to confirm the commit's "10 orphans, 0 false alarms on the 2 HEAVY" validation claim is reproducible.

### Assistant | 2026-06-22T02:37:45.866Z

[tool_use: Bash]

### User | 2026-06-22T02:37:50.001Z

[tool_result] summary: {"total":111,"fresh":98,"staleWarn":0,"staleExpected":2,"staleOrphan":10,"absent":1,"future":0,"orphanList":"10 orphans","alarm":true}
staleOrphan count: 10
staleExpected (HEAVY, should be ~2): 2
orphanList sample: [
  'awareness-augmentation.json (1058.1h)',
  'business-value-map.json (1058.1h)',
  'core-inventory-augmentation.json (1038.2h)',
  'engine-spotlight.json (1057.6h)'
]

### Assistant | 2026-06-22T02:37:58.718Z

The LIVE validation is fully reproducible: 111 merged augmentations, 10 STALE-ORPHAN (matching the commit's named-10 list), 2 stale-expected (the HEAVY/--full generators correctly not alarmed — 0 false alarms), 98 fresh. The audit's real-world output matches the commit message claim exactly.

One last verification: I noted the parser's `loadJson` branch has 0 real uses in merge-augmentations (only `loadOptional`). The parser test exercises `loadJson` synthetically, which is forward-defensive and honest — the docstring says "loadOptional/loadJson", and a constant classifier would still fail the boundary tests. Let me also confirm the `>3 orphans` test arithmetic and the `summarizeFreshness` partition invariant are genuine (not trivially-true).

### Assistant | 2026-06-22T02:38:04.372Z

[tool_use: Bash]

### User | 2026-06-22T02:38:11.793Z

[tool_result] partition holds: true total=7
alarm: true orphanList: ["d.json (200h)","e.json (1000h)"]
no-orphan alarm false: true

### Assistant | 2026-06-22T02:38:36.438Z

All verified. The `summarizeFreshness` test pins concrete per-class counts (`s.staleOrphan === 2`, `s.alarm === true`, exact sorted `orphanList`) plus the partition invariant — a constant or always-fresh classifier would fail it.

My review is complete. Summary of what I verified end-to-end:

**augmentation-freshness.test.mjs (11/11 pass, all real):**
- Boundary test (line 82-92) pins exact `>=` semantics: 23.9h→fresh, 24h→stale-warn, 168h→stale-orphan. Verified directly — a constant classifier fails.
- Slow-cadence test (line 70-80) distinguishes 300h (stale-expected) from 800h (stale-orphan) for the same file — real ceiling logic.
- LIVE test (line 156-183) reads the real `merge-augmentations.mjs`, asserts the 4 known orphans are genuinely `loadOptional`'d (confirmed at merge source lines 121/128/132/133), and at 1032h age classifies all 4 as stale-orphan. Fails if either the parser or the merge contract changes.
- `summarizeFreshness` test pins concrete counts + partition invariant + sorted orphanList.
- Adversarial coverage real: empty/null/non-array/NaN-mtime/future all exercised.

**Hermeticity fix (legitimate, not masking a regression):**
- (a) Pure-helper `NOW` unchanged (line 22, fixed `2026-06-15T12:00Z`); all pure tests inject it.
- (b) `realRecent` touches exactly the 3 E2E fixtures whose freshness the spawned hook actually ages via real `Date.now()` (regen sidecar line 148, embeds line 170, freshness line 181). The two short-circuit E2E tests (non-sierra line 192, DISABLE line 208) correctly stay on fixed-NOW because their timestamps are inert (hook returns before aging them).
- (c) `realRecent` cannot rot/flake — always `Date.now() - mins`, inside the 24h window whenever run.
- (d) E2E assertions still meaningfully test block content (`/embeds DEGRADED/`, `/STALE-ORPHAN/`, `/awareness-augmentation/`, `/system-viz graph health/`) — not weakened.
- Root cause is real: helpers null out at `now - t >= 24h`, so fixed-NOW fixtures rotted past wall-clock + 24
... [+2596 chars truncated]
