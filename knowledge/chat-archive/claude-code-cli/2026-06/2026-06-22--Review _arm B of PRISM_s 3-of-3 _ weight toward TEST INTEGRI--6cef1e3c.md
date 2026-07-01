---
type: "chat-session"
source: "claude-code-cli"
session_id: "6cef1e3c-59a5-4cd8-8447-449991f1ed8d"
title: "Review (arm B of PRISM's 3-of-3 — weight toward TEST INTEGRITY + the default-off"
date: "2026-06-22"
first_ts: "2026-06-22T03:01:26.102Z"
last_ts: "2026-06-22T03:04:15.518Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a0ff8d1f0b8dc312b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review (arm B of PRISM's 3-of-3 — weight toward TEST INTEGRITY + the default-off

> **claude-code-cli** | 2026-06-22 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a0ff8d1f0b8dc312b.jsonl`

## Transcript

### User | 2026-06-22T03:01:26.102Z

Review (arm B of PRISM's 3-of-3 — weight toward TEST INTEGRITY + the default-off design honesty). Repo H:/prism, commit 157e4898b0: `git -C H:/prism show 157e4898b0` (`[SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER`). It adds an opt-in stale-skip to merge-augmentations loadOptional() backed by pure `shouldSkipStaleMerge(ageMs,{enabled,thresholdHr})` in scripts/lib/augmentation-freshness.mjs.

Verify, grade PASS/FAIL with P0/P1/P2 + file:line:
1. The 3 NEW tests in scripts/lib/augmentation-freshness.test.mjs (shouldSkipStaleMerge: default-disabled, enabled-skips-IFF-threshold w/ exact boundary + custom threshold, fail-safe adversarial). Are they REAL invariant tests? Would a broken shouldSkipStaleMerge (e.g. always-true, or wrong comparison >= vs >, or ignoring `enabled`) actually FAIL them? Run `node --test scripts/lib/augmentation-freshness.test.mjs`.
2. Is the boundary tested exactly (age == thresholdHr -> skip; age just under -> no skip)?
3. Is the default-disabled invariant pinned (a test that fails if `enabled` default flips to true)?
4. DESIGN HONESTY (R12): the lever is default-OFF. Is that a legitimate safety posture or a disguised stub/no-op? Consider: does the mechanism actually WORK when enabled (is it wired into the real loadOptional, not just a dead pure function)? Is the default-off justified (dropping canonical-graph data is consequential) or is it shipping inert work to look complete? Form your own view and state it.
5. Any test that passes even if the merge integration is broken (i.e., the pure fn is tested but the loadOptional wiring is untested)? Is that gap acceptable given the merge can't be unit-run safely?
Be skeptical about test theater. Read the test file + the lib + the merge diff.

### Assistant | 2026-06-22T03:01:29.272Z

I'll review commit 157e4898b0 with focus on test integrity and design honesty. Let me start by examining the commit and the relevant files.

### Assistant | 2026-06-22T03:01:29.982Z

[tool_use: Bash]

### User | 2026-06-22T03:01:33.419Z

[tool_result] commit 157e4898b066eee1b25c36faa2e66d397496fd15
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:56:59 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER (slot:sierra): opt-in merge stale-skip -- the operator-controlled remediation for orphan augmentations
    
    The freshness GUARD (U-VIZ-AUG-FRESHNESS-GUARD) is the SIGNAL -- it surfaces that 1
... [+15516 chars truncated]

### Assistant | 2026-06-22T03:01:36.195Z

I have the full diff. Now let me read the complete files end-to-end, not just the hunks, to verify the surrounding contract.

### Assistant | 2026-06-22T03:01:37.147Z

[tool_use: Read]

### Assistant | 2026-06-22T03:01:37.152Z

[tool_use: Read]

### User | 2026-06-22T03:01:37.653Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\augmentation-freshness.mjs' was already read 4m ago in this session and is unchanged (mtime 1782096683361). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T03:01:38.098Z

[tool_result] 1	// Tests for augmentation-freshness.mjs -- the system-viz merged-augmentation
2	// staleness classifier (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21).
3	// Real reference values + algebraic invariants + a live-data assertion against the
4	// actual merge-augmentations.mjs source. Injected now + stat -> deterministic.
5	//
6	// Run: node --test scripts/lib/augmentation-fr
... [+12772 chars truncated]

### Assistant | 2026-06-22T03:01:43.453Z

The test file is fully read. The lib file was read earlier this session. Let me retrieve its current content via Grep to confirm the `shouldSkipStaleMerge` body and surrounding context, then run the tests.

### Assistant | 2026-06-22T03:01:44.064Z

[tool_use: Read]

### Assistant | 2026-06-22T03:01:44.560Z

[tool_use: Bash]

### User | 2026-06-22T03:01:45.262Z

[tool_result] 130	    fresh: byClass("fresh").length,
131	    staleWarn: byClass("stale-warn").length,
132	    staleExpected: byClass("stale-expected").length,
133	    staleOrphan: orphans.length,
134	    absent: byClass("absent").length,
135	    future: byClass("future").length,
136	    orphanList: orphans.map((x) => `${x.name} (${x.ageHr}h)`).sort(),
137	    alarm: orphans.length > 0,
138	  };
139	}
140	
141	
... [+1130 chars truncated]

### User | 2026-06-22T03:01:49.672Z

[tool_result]   ...
# Subtest: LIVE: real merge-augmentations.mjs folds the known stale orphans -> classified stale-orphan
ok 10 - LIVE: real merge-augmentations.mjs folds the known stale orphans -> classified stale-orphan
  ---
  duration_ms: 0.8471
  ...
# Subtest: SLOW_CADENCE + FRESHNESS_DEFAULTS are the documented contract
ok 11 - SLOW_CADENCE + FRESHNESS_DEFAULTS are the documented contract
  ---
  durati
... [+1013 chars truncated]

### Assistant | 2026-06-22T03:01:54.138Z

15/15 pass, including the 3 new tests (12, 13, 14). Now let me verify the tests would actually FAIL under mutation. Let me create temporary mutated copies of the lib to test each failure mode the prompt asks about.

### Assistant | 2026-06-22T03:02:03.236Z

[tool_use: Bash]

### User | 2026-06-22T03:02:08.862Z

[tool_result] === mutants written ===
1,2d0
< 154:  if (!enabled) return false;
< 157:  return true; // MUTANT always-true
mA:
157:  return true; // MUTANT always-true
mB:
157:  return ageMs > hr * 3_600_000; // MUTANT >
mC:
154:  // MUTANT: enabled ignored

### Assistant | 2026-06-22T03:02:11.942Z

Note mutant A still keeps the `if (!enabled) return false` guard, so it won't catch the default-disabled test. Let me run each mutant against the test by swapping it into place temporarily, then restore. I'll use a copy of the test file pointing at each mutant.

### Assistant | 2026-06-22T03:02:23.965Z

[tool_use: Bash]

### User | 2026-06-22T03:02:27.362Z

[tool_result] ===== MUTANT orig =====
ALL PASS (mutant survived!)
===== MUTANT mA =====
FAIL (4):
  - T13 12d noskip: Expected values to be strictly equal:

true !== false

  - T13 just-under: Expected values to be strictly equal:

true !== false

  - T13 custom 6<8: Expected values to be strictly equal:

true !== false

  - T14 1h thr0->default noskip: Expected values to be strictly equal:

true !== false

===
... [+373 chars truncated]

### Assistant | 2026-06-22T03:02:34.922Z

All three mutants are caught:
- **mA (always-true on final return)**: caught by T13 (12d no-skip, just-under boundary, custom-below) and T14 (1h default no-skip). 4 failures.
- **mB (`>=` flipped to `>`)**: caught by T13's exact boundary assertion. 1 failure — the boundary test is the sole guard, and it works.
- **mC (ignore `enabled`)**: caught by all 3 default-disabled assertions in T12. 3 failures.

This confirms the tests are real invariant tests, not theater. Now let me verify the default-disabled invariant is truly pinned (would fail if the `enabled` default flips to `true`), and check the merge integration wiring end-to-end. Let me also do an "always-true including the disabled branch" mutant to be thorough.

### Assistant | 2026-06-22T03:02:35.955Z

[tool_use: Bash]

### User | 2026-06-22T03:02:42.040Z

[tool_result] mD:
153:  const { enabled = true, thresholdHr = MERGE_STALE_SKIP_DEFAULT_HR } = opts; // MUTANT default flip
===== MUTANT mD (enabled default = true) =====
FAIL (2):
  - T12 ancient default: Expected values to be strictly equal:

true !== false

  - T12 ancient {}: Expected values to be strictly equal:

true !== false

### Assistant | 2026-06-22T03:02:46.550Z

The default-disabled invariant is pinned: flipping `enabled = false` to `enabled = true` fails T12's `shouldSkipStaleMerge(ancient)` and `shouldSkipStaleMerge(ancient, {})` assertions (the two calls that exercise the default). Now let me examine the merge integration wiring to verify the lever actually WORKS when enabled (Q4) and assess the test-gap on `loadOptional` (Q5). Let me read the full merge-augmentations `loadOptional` region and the re-exec/env handling.

### Assistant | 2026-06-22T03:02:47.329Z

[tool_use: Read]

### User | 2026-06-22T03:02:48.347Z

[tool_result] 40	const HEAP_MB_REQUIRED = 24576;
41	if (!process.env.PRISM_MERGE_AUG_REEXEC) {
42	  const heapMaxMB = Math.floor(v8.getHeapStatistics().heap_size_limit / 1024 / 1024);
43	  if (heapMaxMB < HEAP_MB_REQUIRED * 0.9) {
44	    const r = spawnSync(process.execPath,
45	      [`--max-old-space-size=${HEAP_MB_REQUIRED}`, ...process.argv.slice(1)],
46	      { stdio: "inherit", env: { ...process.env, PRISM
... [+6075 chars truncated]

### Assistant | 2026-06-22T03:02:55.059Z

The wiring is genuine. `shouldSkipStaleMerge` is imported at line 53 and actually called at line 84 inside `loadOptional`, which is the single chokepoint every augmentation flows through (lines 141-149+ all call `loadOptional`). When `PRISM_MERGE_STALE_SKIP=1`, the lever fires: it stats the file, computes age, and returns `null` (skipping the fold) for stale files. This is NOT a dead pure function — it's wired into the real merge path.

Let me verify a couple more things: (1) the `MERGE_STALE_SKIP_HR` env parsing edge case (the `|| undefined` and how `Number(...)` of an unset env behaves), and (2) confirm `loadJson` (the non-optional loader the test references at line 42) is a separate path so I understand the full surface, and (3) check the re-exec env propagation preserves the flag.

### Assistant | 2026-06-22T03:02:56.005Z

[tool_use: Grep]

### User | 2026-06-22T03:02:57.347Z

[tool_result] No matches found

### Assistant | 2026-06-22T03:02:59.099Z

[tool_use: Bash]

### User | 2026-06-22T03:03:03.128Z

[tool_result] undefined -> Number()= NaN -> ||undefined= undefined
"" -> Number()= 0 -> ||undefined= undefined
"8" -> Number()= 8 -> ||undefined= 8
"0" -> Number()= 0 -> ||undefined= undefined
"-1" -> Number()= -1 -> ||undefined= -1
"abc" -> Number()= NaN -> ||undefined= undefined
"720" -> Number()= 720 -> ||undefined= 720
--- re-exec env propagation: PRISM_MERGE_AUG_REEXEC passes full env (...process.env) so P
... [+34 chars truncated]

### Assistant | 2026-06-22T03:03:11.152Z

Interesting finding on env parsing: `loadJson` doesn't exist in merge-augmentations.mjs (the test's parser handles `loadJson(...)` calls generically, but the actual merge only uses `loadOptional`). That's harmless — the parser is forward-compatible.

The env threshold parsing reveals one edge case worth noting: `MERGE_STALE_SKIP_HR="-1"` parses to `-1` (not undefined), which is then passed to `shouldSkipStaleMerge` as `thresholdHr: -1`. But the pure function correctly handles that — a non-positive threshold falls back to the 30d default (verified by T14: `thresholdHr: -1 -> true` for a 44d file). So even a negative env value is fail-safe. The `|| undefined` for `"0"` and `""` also routes to default. All env paths are safe.

Now let me verify the 10 orphan consumers are actually null-guarded as the commit claims (the safety argument hinges on this — if `PRISM_MERGE_STALE_SKIP=1` makes `loadOptional` return `null` for these, consumers must not crash). Let me spot-check a few of the cited line numbers.

### Assistant | 2026-06-22T03:03:13.902Z

[tool_use: Bash]

### User | 2026-06-22T03:03:18.572Z

[tool_result] cwd: /h/prism

### Assistant | 2026-06-22T03:03:21.577Z

[tool_use: Read]

### Assistant | 2026-06-22T03:03:22.512Z

[tool_use: Read]

### User | 2026-06-22T03:03:22.637Z

[tool_result] 238	const tsRegistryEnts = loadOptional("ts-registry-entries-augmentation.json");
239	const engineImpEdges = loadOptional("engine-import-edges-augmentation.json");
240	const testCovEdges   = loadOptional("test-coverage-edges-augmentation.json");
241	const physicsAtomic  = loadOptional("physics-atomic-augmentation.json");
242	const engineReclass  = loadOptional("engine-reclassify-augmentation.json"
... [+246 chars truncated]

### Assistant | 2026-06-22T03:03:23.124Z

[tool_use: Read]

### User | 2026-06-22T03:03:23.648Z

[tool_result] 473	    };
474	    coverageV2Nodes++;
475	  }
476	  G.meta.fileCoverageV2 = {
477	    generatedAt: fileCoverageV2.generatedAt,
478	    totals: fileCoverageV2.totals,
479	    topOrphans:    (fileCoverageV2.topOrphans || []).slice(0, 30),
480	    topBreakdowns: (fileCoverageV2.topBreakdowns || []).slice(0, 20),

### User | 2026-06-22T03:03:24.322Z

[tool_result] 643	    parent.childCount = p.count;
644	    parent.expansionMode = p.mode;
645	  }
646	  G.meta.coreInventory = {
647	    generatedAt: coreInventory.generatedAt,
648	    stats: coreInventory.stats,

### Assistant | 2026-06-22T03:03:28.345Z

Lines 476 and 646 access `fileCoverageV2.generatedAt` and `coreInventory.generatedAt` — these are inside conditional blocks. Let me verify the guard that wraps these accesses (the commit cites `fileCoverageV2:476` and `coreInventory:646` as null-guarded). I need to see the `if(...)` that gates these blocks.

### Assistant | 2026-06-22T03:03:29.302Z

[tool_use: Read]

### Assistant | 2026-06-22T03:03:29.801Z

[tool_use: Read]

### User | 2026-06-22T03:03:30.458Z

[tool_result] 455	// v2 supersedes v1 on overlapping L9 nodes (it has finer granularity) but keeps
456	// v1's per-subtree summaries since they're authored by an LLM agent and richer.
457	let coverageV2Nodes = 0;
458	if (fileCoverageV2?.byNodeId) {
459	  for (const n of G.nodes) {
460	    const v2 = fileCoverageV2.byNodeId[n.id];
461	    if (!v2) continue;
462	    n.fileCoverageV2 = {

### User | 2026-06-22T03:03:31.049Z

[tool_result] 620	    G.nodes.push(node);
621	    existingIds.add(node.id);
622	    coreInventoryChildren++;
623	  }
624	  G.edges ??= [];
625	  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
626	  const existingEdges = new Set(G.edges.map(edgeKey));
627	  for (const edge of coreInventory.newEdges) {
628	    if (existingEdges.has(edgeKey(edge))) continue;
629	    G.edges.push(edge);
630	  }
6
... [+74 chars truncated]

### Assistant | 2026-06-22T03:03:33.548Z

Let me find the exact guard line for the coreInventory block (the access is at 646, the block opens earlier around 600). Let me locate the opening `if`.

### Assistant | 2026-06-22T03:03:35.279Z

[tool_use: Grep]

### User | 2026-06-22T03:03:36.678Z

[tool_result] 262:if (awareness) versions.awareness = awareness.generatedAt ?? "present";
263:if (novelty)   versions.novelty   = novelty.generatedAt   ?? "present";
264:if (business)  versions.businessValue = business.generatedAt ?? "present";
265:if (spotlight) versions.spotlight = spotlight.generatedAt ?? "present";
270:if (heuristicCov)  versions.heuristicCov  = heuristicCov.generatedAt  ?? "present";
271:i
... [+722 chars truncated]

### Assistant | 2026-06-22T03:03:43.604Z

This confirms the safety claim. Every consumer of the orphan augmentations is null-guarded:
- `awareness`/`novelty`/`business`/`spotlight`/`heuristicCov`/`skippedCensus`/`exhaustiveAudit`/`coreInventory`/`fsInventory` all gate their `generatedAt` access behind `if (X)` truthiness checks (lines 262-274) and their node-building blocks behind `if (X?.field)` (lines 369, 381, 384, 487, 521, 535, 616, 661).
- `fileCoverageV2` is guarded at line 458 (`if (fileCoverageV2?.byNodeId)`).

So when `loadOptional` returns `null` (skip), no consumer crashes — and critically, this is the **exact same `null` the existing absent-file path already returns** at line 80 (`if (!fs.existsSync(p)) return null`). The stale-skip introduces no new null-handling contract; it reuses the one the codebase already enforces. The safety argument in the commit message is verified accurate.

I have everything I need. Let me clean up the temp mutants.

### Assistant | 2026-06-22T03:03:44.437Z

[tool_use: Bash]

### User | 2026-06-22T03:03:45.964Z

[tool_result] 🛑 BLOCKED: rm -rf on absolute root path
  Command: rm -rf /tmp/mut-test && echo "cleaned up mutant test dir"
  This command is too dangerous to execute.

### Assistant | 2026-06-22T03:03:48.507Z

The hook blocked the absolute-path `rm -rf`. Let me clean up the individual files instead.

### Assistant | 2026-06-22T03:03:50.002Z

[tool_use: Bash]

### User | 2026-06-22T03:03:53.760Z

[tool_result] cleaned (or already gone)
mut-test dir removed

### Assistant | 2026-06-22T03:04:15.518Z

Cleanup complete. I have fully verified the commit. Here is my arm-B verdict.

---

VERDICT: PASS

summary: The 3 new tests are real invariant tests, not theater — I mutation-tested all five failure modes the prompt names (always-true, `>=`→`>` boundary flip, ignore-`enabled`, and the default-`enabled`-flip) and every one is caught with a concrete failing assertion. The default-OFF lever is a legitimate safety posture, not a disguised stub: `shouldSkipStaleMerge` is genuinely imported and called inside the real `loadOptional` chokepoint (merge-augmentations.mjs:53, 84), so it actually drops stale augmentations when `PRISM_MERGE_STALE_SKIP=1`, and the null-it-returns is byte-identical to the absent-file path the codebase already null-guards everywhere. 15/15 tests pass.

findings:
- [PASS-EVIDENCE] `scripts/lib/augmentation-freshness.test.mjs:195-200` (T12) — default-disabled invariant is PINNED. Mutating `enabled = false` → `enabled = true` (line 153) fails `shouldSkipStaleMerge(ancient)` and `shouldSkipStaleMerge(ancient, {})` (2 failures). A flip of the default cannot ship green. Verified by mutant mD.
- [PASS-EVIDENCE] `augmentation-freshness.test.mjs:202-213` (T13) — boundary is tested EXACTLY: `age == thresholdHr → skip` (line 208) and `age == thresholdHr - 0.001 → no skip` (line 209). Mutating `>=` → `>` (lib line 157) fails the `==` boundary assertion. The `>=` vs `>` choice is the sole guard and it works. Verified by mutant mB.
- [PASS-EVIDENCE] `augmentation-freshness.test.mjs:215-224` (T14) — fail-safe adversarial is real: NaN/Infinity/negative/string age all assert `false` (fold, never wrongly drop), and a non-positive `thresholdHr` (0, -1) correctly falls back to the 30d default. The always-true mutant (lib line 157 → `return true`) fails 4 of these. Verified by mutant mA.
- [PASS-EVIDENCE] DESIGN HONESTY (Q4) — the lever WORKS when enabled, not a dead pure function. `merge-augmentations.mjs:53` imports it; `:81-90` calls it inside `loadOptional` (the si
... [+1646 chars truncated]
