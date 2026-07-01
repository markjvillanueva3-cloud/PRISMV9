---
type: "chat-session"
source: "claude-code-cli"
session_id: "33e83133-c3bb-4f19-9252-e7aec62f4236"
title: "Review a sierra/system-viz code change (unit U-VIZ-HEADLINE-CHEAP-META) for SILE"
date: "2026-06-23"
first_ts: "2026-06-23T13:06:44.263Z"
last_ts: "2026-06-23T13:14:26.072Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 24
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/33e83133-c3bb-4f19-9252-e7aec62f4236/subagents/agent-af3a2f224400fd1e0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Review a sierra/system-viz code change (unit U-VIZ-HEADLINE-CHEAP-META) for SILE

> **claude-code-cli** | 2026-06-23 | 64 msgs (24 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/33e83133-c3bb-4f19-9252-e7aec62f4236/subagents/agent-af3a2f224400fd1e0.jsonl`

## Transcript

### User | 2026-06-23T13:06:44.263Z

Review a sierra/system-viz code change (unit U-VIZ-HEADLINE-CHEAP-META) for SILENT BREAKAGE, REGRESSION RISK, and EDGE-CASE correctness. Read the full changed regions end-to-end. Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Do NOT assume the other reviewer caught anything.

CONTEXT / INTENT:
`node scripts/system-viz-query.mjs headline` only needs the graph's small top-level `meta` object (counts/headline/totals/worktrees) which sits in the first ~4KB of the 870MB `system-graph.json`, BEFORE the huge nodes/edges arrays. Previously `headline` fell through to the full-graph `loadGraph()` which is OOM-prone under memory pressure (reproduced: FATAL heap OOM at 379MB). The change adds a cheap bounded head-read primitive `readGraphMeta()` and short-circuits `headline` to use it (no full graph load), mirroring the existing find/node-card/octopus short-circuits. On readGraphMeta failure it FALLS THROUGH to the old full-graph path (never worse than before).

FILES TO REVIEW (read all 3 fully):
1. H:/prism/scripts/lib/system-viz-graph.mjs — new functions `extractTopLevelObject` (string-aware brace balancer), `extractTopLevelScalar` (regex via String.match), `readGraphMeta` (exported), added to `__test`. Find them between `loadGraph` and `findInGraph`.
2. H:/prism/scripts/system-viz-query.mjs — new `headline` SHORT-CIRCUIT block (before the eager `loadGraph`), new hoisted `buildHeadline(meta, generatedAt)` shared renderer (after `out()`), and the refactored full-graph `if (cmd === "headline")` block now calling buildHeadline.
3. H:/prism/scripts/lib/system-viz-graph-meta.test.mjs — the new test suite (9 tests).

SPECIFIC THINGS TO VERIFY (be adversarial):
- The brace balancer in `extractTopLevelObject`: does it correctly skip `{`/`}` and quotes INSIDE JSON string values (escape handling: `\\`, `\"`)? Any input that makes it stop early or over-read? Off-by-one on the closing brace slice?
- `extractTopLevelScalar` regex: could it match a NESTED key (not top-le
... [+1332 chars truncated]

### Assistant | 2026-06-23T13:06:52.301Z

I'll review this system-viz code change for silent breakage, regression risk, and edge-case correctness. Let me read all three files end-to-end.

### Assistant | 2026-06-23T13:06:53.279Z

[tool_use: Read]

### Assistant | 2026-06-23T13:06:53.389Z

[tool_use: Read]

### User | 2026-06-23T13:06:55.682Z

[tool_result] 1	import { test } from "node:test";
2	import assert from "node:assert/strict";
3	import fs from "node:fs";
4	import path from "node:path";
5	import os from "node:os";
6	import { fileURLToPath } from "node:url";
7	import { __test } from "./system-viz-graph.mjs";
8	
9	const { readGraphMeta, extractTopLevelObject, extractTopLevelScalar } = __test;
10	
11	// -------------------------------------------
... [+6822 chars truncated]

### User | 2026-06-23T13:06:56.002Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+41276 chars truncated]

### Assistant | 2026-06-23T13:07:01.164Z

Now let me read the consumer file `system-viz-query.mjs` to verify the short-circuit, buildHeadline, and the refactored full-graph block.

### Assistant | 2026-06-23T13:07:01.502Z

[tool_use: Read]

### User | 2026-06-23T13:07:04.397Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+36791 chars truncated]

### Assistant | 2026-06-23T13:07:08.836Z

I've read all three files. Now let me verify a few critical claims with the live graph and git history. Let me check the byte-order assumption (does `meta` precede or follow `nodes`?) and verify the old behavior contract.

### Assistant | 2026-06-23T13:07:10.779Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:07:13.299Z

[tool_use: Bash]

### User | 2026-06-23T13:07:16.091Z

[tool_result] {"schemaVersion":"2.29.0","generatedAt":"2026-06-10T03:20:10.426Z","meta":{"counts":{"engines":3788,"dispatchers":108,"actions":10010,"algorithms":123,"registries":27,"tests":4731,"srcHooks":54,"claudeHooks":909,"scripts":2377,"slashLocal":742,"slashUser":402,"formulas":499},"headline":{"built":3697,"unwired":89,"pendingFE":2,"drift":192,"wikiEntries":56996},"coverage":{"total":3798,"wired":3709,"
... [+222 chars truncated]

### User | 2026-06-23T13:07:20.507Z

[tool_result] 6a1cf88bb4 [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DETACHED (slot:sierra): hide detached-spawn console windows fleet-wide
3eb1ac6fb6 [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-OCTOPUS-QUERY (slot:sierra): add cheap `octopus` consensus query to system-viz-query (octopus + system-viz utilization)
2a7b5c0b58 [MAIN-FORCE] [GRAPH-UTILIZATION]/U-SUBGRAPH-RETRIEVE-FIX (slot:alpha): 3-of-3 scrutiny P1 -- reexec 
... [+769 chars truncated]

### Assistant | 2026-06-23T13:07:41.026Z

The live graph confirms the byte-order: `schemaVersion`, then `generatedAt`, then `meta` (with `counts`, `headline`, `coverage`, ...) all in the first ~600 bytes. The `nodes`/`edges` arrays come later. The byte-order assumption holds for this graph shape.

Let me verify the critical behavior-change point: the old block reported actual array lengths but I see the OLD `nodes:G.nodes.length` is gone. Let me check git to confirm what the OLD headline block actually reported, and verify `meta.totals` exists/is consistent in the live graph.

### Assistant | 2026-06-23T13:07:42.234Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:07:46.029Z

[tool_use: Bash]

### User | 2026-06-23T13:07:47.283Z

[tool_result] diff --git a/scripts/system-viz-query.mjs b/scripts/system-viz-query.mjs
index a46f3416c2..7a01886a3c 100644
--- a/scripts/system-viz-query.mjs
+++ b/scripts/system-viz-query.mjs
@@ -24,7 +24,7 @@ import fs from "node:fs";
 import path from "node:path";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
-import { loadGraph, findInGraph, loadFindCache, sidec
... [+4626 chars truncated]

### User | 2026-06-23T13:07:52.735Z

[tool_result] (node:10728) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\system-viz-graph.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
---ESM probe via dynamic import + totals consistency---
schemaVersion: 2.29.0
gener
... [+298 chars truncated]

### Assistant | 2026-06-23T13:08:06.510Z

Now I have the key behavioral comparison. This is the critical finding: the OLD machine output used `nodes: G.nodes.length` (actual array length) and the human used `${G.nodes.length}n / ${G.edges.length}e / ${G.layers.length} layers`. The NEW path sources from `meta.totals.{nodes,edges,layers}`.

Let me verify whether `meta.totals` is actually consistent with the real array lengths — this is the regression risk the spec flagged. The live `meta.totals` says nodes=60588, edges=183237. But the find-cache / node-card system claims ~301K-336K nodes elsewhere in the CLAUDE.md. Let me check the actual array lengths and whether totals is consistent.

### Assistant | 2026-06-23T13:08:08.209Z

[tool_use: Bash]

### User | 2026-06-23T13:08:16.808Z

[tool_result] load ms: 4425
ACTUAL G.nodes.length: 354582
ACTUAL G.edges.length: 830965
ACTUAL G.layers.length: 11
meta.totals: {"nodes":60588,"edges":183237,"layers":11}
--- CONSISTENCY ---
nodes match: false
edges match: false
layers match: true

### Assistant | 2026-06-23T13:08:24.017Z

This is a significant finding. The behavior change is **not** output-neutral. `meta.totals.nodes` = 60588 but the actual `G.nodes.length` = 354582. `meta.totals.edges` = 183237 but actual `G.edges.length` = 830965. The new headline reports numbers that are **~5.8x smaller** for nodes and **~4.5x smaller** for edges than what the old code reported.

Let me confirm this isn't a stale-graph artifact by checking how `meta.totals` is written by the regen versus how the arrays get their final size. Let me find where `meta.totals` is set in the generator.

### Assistant | 2026-06-23T13:08:25.729Z

[tool_use: Grep]

### User | 2026-06-23T13:08:27.174Z

[tool_result] scripts\agents\spawned-agent-context-lib.mjs:123:    // nodes/edges/layers live in meta.totals (NOT meta.counts) — also flat.
scripts\agents\spawned-agent-context-lib.mjs:125:    if (totalsM) { try { meta.totals = JSON.parse(totalsM[1]); } catch { /* leave unset */ } }
scripts\agents\spawned-agent-context-lib.mjs:337:  const t = j.meta?.totals || {};
scripts\agents\spawned-agent-context-lib.mjs:33
... [+3992 chars truncated]

### Assistant | 2026-06-23T13:08:30.651Z

Let me find where the system-viz generator writes `meta.totals` to understand whether the discrepancy is by-design (e.g. totals is a pre-merge count) or a stale-meta bug.

### Assistant | 2026-06-23T13:08:32.080Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:08:33.103Z

[tool_use: Grep]

### User | 2026-06-23T13:08:34.522Z

[tool_result] 1111-  coverage: l5Coverage,
1112-  dispatcherCatCount,
1113-  pageClusters,
1114:  totals: { nodes: nodes.length, edges: edges.length + suggestionEdges.length, layers: 11 },
1115-  vault: { memories: vaultMemory.length, wiki: vaultWiki.length, wikiLinkEdges: wikiLinkEdgeCount, brokenWikiLinks: wikiLinkBrokenCount },
1116-  worktrees: worktreeSummary,
1117-  roadmap,

### User | 2026-06-23T13:08:35.318Z

[tool_result] Found 10 files
scripts\lib\system-viz-graph-meta.test.mjs
scripts\system-viz-query.mjs
scripts\lib\system-viz-graph.mjs
scripts\expand-system-viz-l12-files.mjs
scripts\system-viz-on-commit.mjs
scripts\system-viz-obsidian-bridge-v2.test.mjs
scripts\system-viz-obsidian-bridge-v2.mjs
scripts\system-viz-on-commit.test.mjs
scripts\generate-system-viz.mjs
scripts\expand-system-viz-l12-files.test.mjs

### Assistant | 2026-06-23T13:08:42.820Z

This is the key. The generator at line 1114 writes `totals: { nodes: nodes.length, edges: edges.length + suggestionEdges.length, layers: 11 }` — meaning at **regen time** `meta.totals` IS consistent with the array lengths. So the discrepancy I observed (60588 vs 354582) means **the live graph's `meta.totals` is stale relative to its own arrays** — the graph was last regenerated by `generate-system-viz.mjs` when it had 60588 nodes, but the current 354582-node arrays were written/merged by a DIFFERENT writer (the merge-augmentations / regen-viz pipeline that appends nodes ADD-only) WITHOUT updating `meta.totals`.

Let me confirm there's a separate merge pipeline that grows the arrays but doesn't rewrite `meta.totals`.

### Assistant | 2026-06-23T13:08:45.318Z

[tool_use: Bash]

### User | 2026-06-23T13:08:49.383Z

[tool_result] merge-augmentations.mjs*
regen-viz-fast-order.test.mjs
regen-viz.mjs*
---
---does merge update totals?---
scripts/merge-augmentations.mjs

### Assistant | 2026-06-23T13:08:53.365Z

`merge-augmentations.mjs` mentions `totals` but `regen-viz.mjs` does not. Let me see exactly what merge-augmentations does with totals — whether it updates `meta.totals` after splicing nodes in.

### Assistant | 2026-06-23T13:08:54.508Z

[tool_use: Grep]

### User | 2026-06-23T13:08:55.830Z

[tool_result] 11- *
12- * Output:
13- *   - Each node in graph gains: .knowledge, .awareness, .novelty, .businessValue (when applicable)
14- *   - Top-level meta gains: .augmentationVersions = { obsidian, awareness, novelty, businessValue }
15: *   - Top-level meta.novelty.totals copied from catalog totals for HUD
16- *
17- * Run AFTER scripts/generate-system-viz.mjs and any augmentation generators.
18- */
19-

... [+2780 chars truncated]

### Assistant | 2026-06-23T13:09:02.290Z

Confirmed. `merge-augmentations.mjs` adds many nodes (L6 expansion at line 628, plus heuristic/coverage nodes, plus the cross-substrate edges from CLAUDE.md) but **never updates `meta.totals.nodes` / `meta.totals.edges`**. It only writes `meta.novelty.totals`, `meta.fileCoverage.totals`, etc. — never the top-level `meta.totals`. So after `generate-system-viz.mjs` (which sets totals to its own node count) the merge pipeline grows the arrays without refreshing `meta.totals`.

This means the `graph:` line and the machine `nodes`/`edges` values are now WRONG on the live graph: the short-circuit reports 60588n/183237e while the actual graph has 354582n/830965e. Let me verify the live behavior of both paths directly to confirm the divergence is real and observable.

### Assistant | 2026-06-23T13:09:05.009Z

[tool_use: Bash]

### User | 2026-06-23T13:09:15.151Z

[tool_result] === CHEAP SHORT-CIRCUIT (new default) ===
  engines:      3,788  (built 3697 / unwired 89 = 98% wired)
  graph:        60588n / 183237e / 11 layers

=== FORCED FALLBACK (full graph load, old behavior) ===
  engines:      3,788  (built 3697 / unwired 89 = 98% wired)
  graph:        60588n / 183237e / 11 layers

### Assistant | 2026-06-23T13:09:22.315Z

Critical confirmation, and it surfaces a NEW finding. Both paths now report `60588n / 183237e` — but the OLD code (pre-change) reported `G.nodes.length` = **354582n / 830965e**. The refactored fallback ALSO switched from `G.nodes.length` to `G.meta.totals.nodes`, so the fallback is no longer the "old behavior" either.

So the change is NOT output-neutral as the intent claims ("identical output", "behavior never worse than before"). The `graph:` line and machine `nodes`/`edges` fields regressed from accurate array lengths (354582/830965) to stale meta values (60588/183237) on the live graph — a **~5.8x undercount** that is now reported by BOTH paths.

Let me verify the test suite actually runs and passes, and check whether any consumer reads the `nodes`/`edges` keys from the headline `--json` output (blast radius of the contract change).

### Assistant | 2026-06-23T13:09:23.243Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:09:25.161Z

[tool_use: Bash]

### User | 2026-06-23T13:09:27.912Z

[tool_result]   ...
# Subtest: extractTopLevelObject returns null when key absent or object never closes
ok 7 - extractTopLevelObject returns null when key absent or object never closes
  ---
  duration_ms: 0.1099
  ...
# Subtest: extractTopLevelObject handles nested objects + arrays correctly
ok 8 - extractTopLevelObject handles nested objects + arrays correctly
  ---
  duration_ms: 0.1011
  ...
# Subtest: ext
... [+272 chars truncated]

### User | 2026-06-23T13:10:29.547Z

[tool_result] Exit code 255
=== consumers of 'headline' command ===
scripts/agents/spawned-agent-context-lib.mjs
scripts/build-headline-history.mjs
scripts/high-value-additions-rank.mjs
scripts/system-viz-query.mjs
.claude/cache/file-read-cache.json.tmp-25444
.claude/cache/prompt-rewrites.jsonl
.claude/cache/_vbl_A.txt
.claude/cache/_vbl_B.txt
.claude/cache/_vbl_C.txt
.claude/commands/forge-audit-v2.md
.claude/
... [+586 chars truncated]

### Assistant | 2026-06-23T13:10:33.133Z

All 9 tests pass. Now let me check the two real consumers that look like they parse the headline output: `spawned-agent-context-lib.mjs` (which I saw reads `meta.totals` at lines 337-339) and `build-headline-history.mjs`.

### Assistant | 2026-06-23T13:10:34.554Z

[tool_use: Read]

### Assistant | 2026-06-23T13:10:34.949Z

[tool_use: Read]

### User | 2026-06-23T13:10:36.976Z

[tool_result] 110	    // Extract ONLY the flat sub-objects summarizeSystemViz reads (meta.counts +
111	    // meta.headline) via targeted regex. A brace-matcher over the whole `meta`
112	    // object is WRONG here: meta is ~933KB (exceeds the head buffer → never
113	    // closes) AND contains string values with literal/unbalanced braces (paths,
114	    // math notation) that a non-string-aware matcher mis-cou
... [+1389 chars truncated]

### User | 2026-06-23T13:10:37.562Z

[tool_result] 330	  return { milestones: ms.length, drifts, shipped, totalUnits };
331	}
332	
333	function summarizeSystemViz(j) {
334	  if (!j) return null;
335	  const c = j.meta?.counts || {};
336	  const h = j.meta?.headline || {};
337	  const t = j.meta?.totals || {};
338	  return {
339	    // nodes/edges/layers live in meta.totals; fall back to counts for back-compat
340	    nodes: t.nodes ?? c.nodes ?? "
... [+278 chars truncated]

### Assistant | 2026-06-23T13:10:52.075Z

Important context: `spawned-agent-context-lib.mjs` ALREADY reads `meta.totals` (lines 124-125, 337-342) for nodes/edges/layers — so there is a PRECEDENT that the fleet already treats `meta.totals` as the canonical source for node/edge counts. This means the discrepancy (60588 vs 354582) is a pre-existing graph-staleness issue that already affects that consumer, NOT something this change introduced. However, this change PROPAGATES that stale number into a NEW surface (the `headline` command's `graph:` line + machine output) that previously reported the accurate array length.

Let me confirm the old machine output keys one more time to nail the contract, and check `build-headline-history.mjs` for whether it reads nodes/edges.

### Assistant | 2026-06-23T13:10:52.785Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:10:52.979Z

[tool_use: Bash]

### User | 2026-06-23T13:10:56.983Z

[tool_result] 3: * build-headline-history.mjs — daily append of system-viz headline counts.
5: * U-CLEANUP-G18 (CLEANUP-MS0). Invokes `scripts/system-viz-query.mjs headline --json`,
7: *   state/shared/system-viz-headline-history.jsonl
17: *   node scripts/build-headline-history.mjs                  # daily tick
18: *   node scripts/build-headline-history.mjs --force          # force-append even if today alread
... [+994 chars truncated]

### User | 2026-06-23T13:11:01.549Z

[tool_result] if (cmd === "headline") {
  const h = G.meta.headline; const c = G.meta.counts;
  const human =
`PRISM headline (${G.generatedAt}):
  engines:      ${c.engines.toLocaleString()}  (built ${h.built} / unwired ${h.unwired} = ${Math.round(100*h.built/c.engines)}% wired)
  dispatchers:  ${c.dispatchers}
  actions:      ${c.actions.toLocaleString()}
  tests:        ${c.tests.toLocaleString()}
  formulas
... [+562 chars truncated]

### Assistant | 2026-06-23T13:11:05.868Z

Now I have the full picture of the contract change and a downstream consumer.

`build-headline-history.mjs` calls `headline --json` daily and projects whitelisted fields (line 85-91), appending to `system-viz-headline-history.jsonl`. Let me check whether `nodes`/`edges` are in that whitelist — if so, this change introduces a step-discontinuity in the historical time-series.

### Assistant | 2026-06-23T13:11:06.930Z

[tool_use: Read]

### User | 2026-06-23T13:11:08.862Z

[tool_result] 85	function projectHeadline(headline, nowIso) {
86	  // Whitelist the fields explicitly so a future headline schema change
87	  // doesn't bloat the history file by accident.
88	  const keys = ["built", "unwired", "wikiEntries", "pendingFE", "drift"];
89	  const row = { ts: nowIso, day: nowIso.slice(0, 10) };
90	  for (const k of keys) {
91	    if (k in headline) row[k] = headline[k];
92	  }
93	  
... [+1419 chars truncated]

### Assistant | 2026-06-23T13:12:00.722Z

The `build-headline-history.mjs` whitelist is `["built", "unwired", "wikiEntries", "pendingFE", "drift"]` plus `worktrees.total` — it does **NOT** project `nodes` or `edges`. So the daily history time-series is unaffected by the `nodes`/`edges` source change. Good — that's the one real machine-consumer and it's safe.

Now let me do the adversarial edge-case checks on the brace balancer and scalar extractor that the spec asked about. Let me verify a few tricky cases directly.

### Assistant | 2026-06-23T13:12:59.188Z

[tool_use: Bash]

### User | 2026-06-23T13:13:03.382Z

[tool_result] T1 (key-in-string): "{\"a\":1}"
T2 (prefix collision scalar): GOOD
T3 (nested-first meta): {"nested":true} -> grabbed NESTED
T4 (ws before colon): {"a":2}
T5 (no colon): null
T6 (nested scalar first): NESTED

### Assistant | 2026-06-23T13:13:16.584Z

These reveal three latent fragilities, all currently masked by the actual graph byte-order but worth flagging:

1. **T1 (key-in-string false-positive):** `extractTopLevelObject` finds `"meta"` inside a STRING value before the real key. `indexOf(needle)` is not string-aware on the SEARCH side (only the brace-balancing loop is string-aware). For the live graph this is safe because `meta` is the 3rd top-level key and no preceding string contains `"meta"` — but it's a latent trap.

2. **T2 (prefix collision):** Safe — the regex/needle require the closing quote `"meta"`, so `schemaVersionFoo` doesn't match `"schemaVersion"`. Good.

3. **T3/T6 (nested-first):** If a nested object/scalar with the same key name appeared in byte-order BEFORE the top-level one, the extractor would grab the WRONG (nested) value. For the live graph, `schemaVersion`/`generatedAt`/`meta` are all the first top-level keys with nothing nested before them, so first-match is correct. The doc's reasoning holds for THIS graph shape — but it's an assumption, not an invariant.

These are all P2 (latent, not currently triggered). Let me do a final check on the env-parse edge cases and confirm the resource-safety (fd close) and the `Number()` behavior for the maxBytes env.

### Assistant | 2026-06-23T13:13:32.168Z

[tool_use: Bash]

### User | 2026-06-23T13:13:44.819Z

[tool_result] unset/undefined: undefined
empty string: undefined
0: undefined
-5: undefined
NaN-ish abc: undefined
1.5e6: { maxBytes: 1500000 }
Infinity: undefined
100: { maxBytes: 100 }

### Assistant | 2026-06-23T13:14:26.072Z

The env-parse is robust: NaN/0/negative/Infinity all correctly fall to `undefined` (uses default). Note: empty-string env `""` → `Number("")` = 0 → `undefined` (default), which differs from the sibling `ttlMs()` pattern that special-cases `""`, but here both yield the safe "use default" result, so it's fine.

The fd-close in `readGraphMeta` is correct: `finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch {} } }` — closes on all throw paths (openSync throw → fd undefined → skipped; fstat/read throw → fd defined → closed). Resource-safe.

I have completed a thorough review. Let me compile the findings.

## Findings Summary

I traced the full blast radius. The implementation of the cheap head-read primitive is sound (resource-safe fd handling, robust env-parse, correct fail-through guard, real tests). But the refactor of the headline RENDERER introduced a **silent numeric regression** on two output fields, and the brace-balancer carries latent fragilities masked only by the current graph byte-order.

---

VERDICT: FAIL

summary: The `readGraphMeta` head-read primitive itself is correct and well-tested, and the short-circuit fail-through to `loadGraph()` is wired properly (never errors when meta is incomplete). BUT the refactored `buildHeadline` changed the `nodes`/`edges` source from actual array lengths (`G.nodes.length`/`G.edges.length`) to `meta.totals.{nodes,edges}` — which on the LIVE graph is stale and undercounts by ~5.8x (reports 60,588n/183,237e vs the real 354,582n/830,965e). This regressed BOTH the cheap path AND the fallback path, contradicting the unit's own "identical output / never worse than before" claim. The single machine-consumer (`build-headline-history.mjs`) does not project nodes/edges, so no downstream data corruption — the damage is the operator-facing `graph:` line reporting wrong numbers.

findings:
- [P1] `scripts/system-viz-query.mjs:429-430` (and the fallback at `:438`) -- `buildHeadline` sources `graph:` line + machine `node
... [+4655 chars truncated]
