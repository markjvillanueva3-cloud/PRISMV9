---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Reviewer ARM B (independent, integration-weighted) for \"Half C\" in PRISM's syste"
date: "2026-05-31"
first_ts: "2026-05-31T06:36:52.826Z"
last_ts: "2026-05-31T06:46:38.081Z"
cwd: "H:\\prism-slot-sierra"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a95fd1585e2ce6c6e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Reviewer ARM B (independent, integration-weighted) for "Half C" in PRISM's syste

> **claude-code-cli** | 2026-05-31 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a95fd1585e2ce6c6e.jsonl`

## Transcript

### User | 2026-05-31T06:36:52.826Z

Reviewer ARM B (independent, integration-weighted) for "Half C" in PRISM's system-viz merge keystone. A unified pass `canonicalizeGraphEdgeTargets(G)` now rewrites BOTH `engine.<ClassName>`→`eng.<domain>.<name>` AND `dispatcher.prism_*`→`disp.<file-id>` edge targets at merge time, because the merged graph is CUMULATIVE (stale-target edges from prior merges never get removed by producer fixes alone).

Read EXACT ABSOLUTE PATHS (your working dir may be a worktree H:/prism-slot-sierra where edits are ABSENT — read H:/prism main-tree):
- H:/prism/scripts/merge-augmentations.mjs  (search "edgeCanon", "canonicalizeGraphEdgeTargets", "PRISM_VIZ_ENGINE_CANON_DISABLE")
- H:/prism/scripts/lib/viz-engine-node-id-canon.mjs

Verify + P0/P1/P2 + PASS/FAIL:
1. DISABLE-KNOB SHAPE: when PRISM_VIZ_ENGINE_CANON_DISABLE=1, merge uses a zero-stats fallback object `edgeCanon = {engRemapped:0,...}`. Confirm this object's keys EXACTLY match what canonicalizeGraphEdgeTargets returns (engRemapped,dispRemapped,dropped,engUnresolved,dispUnresolved,distinctEngMissing,distinctDispMissing), so the console.log + G.meta.edgeTargetCanonicalization never emit `undefined` when disabled. Confirm disabled = byte-identical no-op (no edge mutation, no meta key... wait, meta key only written inside the if — confirm).
2. META KEY: it now writes `G.meta.edgeTargetCanonicalization` (renamed from engineEdgeCanonicalization). Confirm nothing downstream reads the old key name. Confirm schemaVersion is NOT bumped (not a shape change).
3. IMPORT: canonicalizeGraphEdgeTargets imports mcpToolToDispNodeId from ./viz-dispatcher-node-id.mjs (a sibling lib). Confirm no circular import (viz-dispatcher-node-id.mjs is a leaf with no imports). Confirm the merge import was switched from canonicalizeEngineEdgeTargets → canonicalizeGraphEdgeTargets (the old name must not still be referenced in merge).
4. CORRECTNESS OF THE DISPATCHER NODE-EXISTENCE GATE against the LIVE graph: the 16-entry MCP→disp table maps prism_calc→disp.c
... [+946 chars truncated]

### Assistant | 2026-05-31T06:37:05.593Z

I'll review Half C of the system-viz merge keystone. Let me read the exact files from the main tree.

### Assistant | 2026-05-31T06:37:06.054Z

[tool_use: Read]

### Assistant | 2026-05-31T06:37:06.575Z

[tool_use: Read]

### User | 2026-05-31T06:37:09.369Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-engine-node-id-canon.mjs' was already read 19s ago in this session and is unchanged (mtime 1780208862112). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-31T06:37:09.608Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-dispatcher-node-id.mjs' was already read 19s ago in this session and is unchanged (mtime 1780201602970). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-31T06:37:12.839Z

The read-once guard says these were already read, but I don't see their content in my context (this is a fresh review turn). Let me disable the cache and read them, plus the merge file.

### Assistant | 2026-05-31T06:37:13.084Z

[tool_use: Read]

### User | 2026-05-31T06:37:17.435Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-engine-node-id-canon.mjs' was already read 27s ago in this session and is unchanged (mtime 1780208862112). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-31T06:37:20.489Z

[tool_use: Bash]

### User | 2026-05-31T06:38:03.983Z

[tool_result] #!/usr/bin/env node
/**
 * viz-engine-node-id-canon.mjs — canonicalize `engine.<ClassName>` edge targets
 * to the merged-graph engine node id `eng.<domain>.<name>` at assembly time.
 *
 * BACKGROUND (the second G4 dead-edge class, sierra):
 * Several producers emit graph edges to `engine.<ClassName>` (PascalCase) — the
 * scheme minted by `engine-node-extractor.mjs` (NN-GRAPH-MS0), which is wired
... [+10146 chars truncated]

### Assistant | 2026-05-31T06:38:06.481Z

I have the canon lib. Now let me read the dispatcher node-id lib and the merge file.

### Assistant | 2026-05-31T06:38:07.201Z

[tool_use: Bash]

### User | 2026-05-31T06:38:24.366Z

[tool_result] #!/usr/bin/env node
/**
 * viz-dispatcher-node-id.mjs — canonical MCP-tool-name → system-graph
 * dispatcher node-id resolver (SSOT for every ghost / bridge producer).
 *
 * BACKGROUND (the G4 dead-edge class, sierra):
 * The dispatcher INFERENCE rules + the per-kind bridge tables across PRISM all
 * speak the MCP *tool* name (`prism_calc`, `prism_safety`, …). But the merged
 * `system-graph.json`
... [+3072 chars truncated]

### Assistant | 2026-05-31T06:38:27.346Z

Now let me look at the merge file — specifically the edgeCanon usage, the disable knob, meta key, and import.

### Assistant | 2026-05-31T06:38:30.412Z

[tool_use: Grep]

### User | 2026-05-31T06:38:34.947Z

[tool_result] 48-  }
49-}
50-
51-import { readGraphStreaming, writeGraphStreaming } from "./lib/graph-io.mjs";
52:import { canonicalizeGraphEdgeTargets } from "./lib/viz-engine-node-id-canon.mjs";
53-
54-const __dirname = path.dirname(fileURLToPath(import.meta.url));
55-const ROOT = path.resolve(__dirname, "..");
56-const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
--
2704-// separate rewriting 
... [+1713 chars truncated]

### Assistant | 2026-05-31T06:38:37.969Z

I see line 2705 has a stray `\` (backslash) at the start of a comment line. Let me look at that block in full context to verify it's just a comment typo and not a syntax issue, plus check `G.meta` initialization and verify no old key/name references remain.

### Assistant | 2026-05-31T06:38:38.801Z

[tool_use: Read]

### User | 2026-05-31T06:38:46.886Z

[tool_result] 2695	  G.meta.ghostSummary = { ghostNodes, ghostEdges };
2696	}
2697	
2698	// U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonicalize mis-prefixed edge targets
2699	// in the assembled graph. The merged graph is CUMULATIVE (merge reads the
2700	// persistent system-graph.json + adds, never removes stale-target edges), so a
2701	// producer-side fix only affects NEW edges — the ~2.7K `dispatcher.prism
... [+4677 chars truncated]

### Assistant | 2026-05-31T06:38:51.565Z

The line 2705 `\` I saw in the Grep output was a rendering artifact of the Grep tool escaping the comment — the actual file at line 2705 starts with `// are strictly dead→live`. Good, no syntax issue.

Now let me verify several review points in parallel: (1) the fallback object keys exactly match the function return shape, (2) no old key/name references remain, (3) `G.meta` is initialized before this line, (4) schemaVersion isn't bumped by this change (it's 2.29.0 from a separate concern), and (5) live-graph node existence for the disp.* targets.

### Assistant | 2026-05-31T06:38:52.897Z

[tool_use: Grep]

### Assistant | 2026-05-31T06:38:53.817Z

[tool_use: Grep]

### User | 2026-05-31T06:39:01.356Z

[tool_result] H:\prism\scripts\lib\viz-engine-node-id-canon.test.mjs:10:import { buildEngineAliasIndex, canonicalizeEngineEdgeTargets, canonicalizeGraphEdgeTargets } from "./viz-engine-node-id-canon.mjs";
H:\prism\scripts\lib\viz-engine-node-id-canon.test.mjs:58:// --- canonicalizeEngineEdgeTargets -----------------------------------------
H:\prism\scripts\lib\viz-engine-node-id-canon.test.mjs:74:  const stats 
... [+1502 chars truncated]

### User | 2026-05-31T06:39:04.955Z

[tool_result] H:\prism\scripts\merge-augmentations.mjs:2712:  G.meta.edgeTargetCanonicalization = { ...edgeCanon, ranAt: new Date().toISOString() };

### Assistant | 2026-05-31T06:39:10.850Z

Good findings:
- `canonicalizeEngineEdgeTargets` (the OLD name) is still exported and still referenced — but ONLY in the test file (legacy unit tests retained). The MERGE import is correctly switched to `canonicalizeGraphEdgeTargets`. So point 3 (old name not referenced in merge) is satisfied — the old function is preserved as a still-tested public export (back-compat, not dead).
- `edgeTargetCanonicalization` (new key) is written in exactly one place (the merge). No reader of the OLD key name `engineEdgeCanonicalization` anywhere. Let me confirm nothing reads either meta key downstream.

Let me verify: (a) no downstream reader of `edgeTargetCanonicalization` or the old key in any consumer; (b) `G.meta` is initialized before 2712; (c) the schemaVersion 2.29.0 line and whether it's tied to this change.

### Assistant | 2026-05-31T06:39:11.837Z

[tool_use: Grep]

### Assistant | 2026-05-31T06:39:13.173Z

[tool_use: Grep]

### User | 2026-05-31T06:39:14.835Z

[tool_result] 1804:  G.meta = G.meta || {};
1837:  G.meta = G.meta || {};

### User | 2026-05-31T06:39:35.000Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-31T06:39:39.385Z

`G.meta` is guarded twice with `G.meta = G.meta || {}` earlier (lines 1804, 1837), both well before line 2712 — so `G.meta.edgeTargetCanonicalization` write is safe. Let me re-run the cross-tree grep for the old key name on narrower paths (the broad grep timed out on the 573MB graph dir). I'll exclude the giant viz dir and check the consumers (web app, scripts, mcp-server).

### Assistant | 2026-05-31T06:39:40.348Z

[tool_use: Grep]

### Assistant | 2026-05-31T06:39:41.255Z

[tool_use: Grep]

### User | 2026-05-31T06:39:43.544Z

[tool_result] No matches found

### User | 2026-05-31T06:40:04.791Z

[tool_result] No matches found

### Assistant | 2026-05-31T06:40:08.570Z

No downstream reader of either meta key. Now point 4: verify the disp.* node-existence gate against the LIVE graph. I need to confirm the 16-table disp.* ids actually exist as nodes. Let me grep the 573MB graph OOM-safely for the common dispatcher node ids. I'll grep for each id string without parsing.

### Assistant | 2026-05-31T06:40:11.795Z

[tool_use: Bash]

### User | 2026-05-31T06:41:12.229Z

[tool_result] H:/prism/state/shared/system-viz/system-graph.json  535.7M
disp.calcdispatcher => 1
disp.camdispatcher => 1
disp.caddispatcher => 1
disp.aireasoningdispatcher => 1
disp.intelligencedispatcher => 1
disp.memorydispatcher => 1
disp.safetydispatcher => 1
disp.turningdispatcher => 1
disp.fiveaxisdispatcher => 1
disp.omegadispatcher => 1
disp.sessiondispatcher => 1
disp.devdispatcher => 1
disp.orchestra
... [+104 chars truncated]

### Assistant | 2026-05-31T06:41:17.081Z

All 16 disp.* node ids exist exactly once in the live graph. The node-existence gate will pass for every entry in the table — the ~2.7K `dispatcher.prism_*` edges genuinely remap dead→live. Let me also verify the format assumption: confirm the graph actually uses `"id":"disp.x"` with no space (it matched, so format is correct). 

Now let me check that the live graph still has stale `dispatcher.prism_*` and `engine.<Class>` edge targets (confirming there's real work for this pass to do), and verify the `from`/`source`/`to`/`target` endpoint field naming matches what the merged graph actually uses for edges.

### Assistant | 2026-05-31T06:41:20.129Z

[tool_use: Bash]

### User | 2026-05-31T06:41:48.509Z

[tool_result] === stale dispatcher.prism_ targets (sample count via grep -o) ===
=== stale engine. targets (count of occurrences) ===
0
=== edge endpoint field names present ===

### Assistant | 2026-05-31T06:41:51.877Z

The grep produced empty output — likely because the giant single-line JSON with these patterns inside causes issues, or the edges use a different shape. Let me check the edge structure directly: stream the head/structure of the graph to understand the edge field names without parsing the whole thing.

### Assistant | 2026-05-31T06:41:54.593Z

[tool_use: Bash]

### User | 2026-05-31T06:42:17.288Z

[tool_result] === first 600 chars ===
{"schemaVersion":"2.29.0","generatedAt":"2026-05-17T20:38:23.804Z","meta":{"counts":{"engines":3273,"dispatchers":97,"actions":8168,"algorithms":61,"registries":27,"tests":3836,"srcHooks":54,"claudeHooks":624,"scripts":929,"slashLocal":226,"slashUser":394,"formulas":499},"headline":{"built":2543,"unwired":729,"pendingFE":2,"drift":175,"wikiEntries":23981},"coverage":{"total
... [+400 chars truncated]

### Assistant | 2026-05-31T06:42:24.436Z

Important observation: the live graph on disk is `schemaVersion 2.29.0` and `generatedAt 2026-05-17` — this is a stale/older graph (generated before the 2026-05-30 sierra change). Note `grep -c` returns line-count not match-count; since the whole graph is one line, `1` just means "the pattern appears on the single line." So `dispatcher.prism_` and `engine.[A-Z]` DO appear in the file. Let me count actual occurrences with `grep -o` and confirm the edge endpoint field names. The earlier `grep -o` returned empty likely due to a shell/regex escaping issue. Let me use a more robust approach with Python streaming to count without loading the whole structure into a parsed object.

### Assistant | 2026-05-31T06:42:28.924Z

[tool_use: Bash]

### User | 2026-05-31T06:42:40.142Z

[tool_result] dispatcher.prism_* target occurrences: 2676
engine.<Capital> target occurrences: 3392
field 'from': 985499  'source': 12020  'to': 985509  'target': 11716
top dispatcher.prism_ names:
     897  dispatcher.prism_ai
     726  dispatcher.prism_calc
     634  dispatcher.prism_cam
     137  dispatcher.prism_intelligence
      70  dispatcher.prism_dev
      61  dispatcher.prism_turning
      3
... [+494 chars truncated]

### Assistant | 2026-05-31T06:42:49.655Z

This is highly informative. Key findings:

1. **2676 `dispatcher.prism_*` occurrences** and **3392 `engine.<Capital>` occurrences** — confirming substantial real dead-edge work (~2.7K matches the docstring claim).

2. **Edge field naming**: Both `from`/`to` (985K each) AND `source`/`target` (12K/11.7K each) are present. The pass handles all four endpoint fields (`ENDPOINT_FIELDS = ["from","source","to","target"]`), so both edge shapes are covered. Good — correct.

3. **The top dispatcher names ALL map cleanly** through the 16-entry table: `prism_ai`(897), `prism_calc`(726), `prism_cam`(634), `prism_intelligence`(137), `prism_dev`(70), `prism_turning`(61), `prism_session`(37), `prism_orchestrate`(18), `prism_safety`(12), `prism_memory`(12), `prism_skill_script`(10), `prism_intake`(9), `prism_cad`(9), `prism_5axis`(8), `prism_guard`(3) — all in the table, all gate-pass (nodes confirmed to exist). That covers ~2643 of the 2676.

4. **A residue NOT in the 16-table** correctly falls to honest-dead-pixel (R12): `prism_data`(5), `prism_machinelive`(4), `prism_multiop`(3), `prism_shop`(3), `prism_validation`(2). These resolve to `disp.prism_data` etc. via the fallback, which won't exist as nodes → node-existence gate leaves them unchanged → stay as `dispatcher.prism_data` (honest dead pixel). That is the documented, intended behavior. Let me confirm one of these (`disp.prism_data`) indeed does NOT exist as a node, validating the gate leaves it dead rather than minting a new dead target.

### Assistant | 2026-05-31T06:42:53.372Z

[tool_use: Bash]

### User | 2026-05-31T06:44:01.114Z

[tool_result] disp.prism_data node-count(line)=0
disp.prism_shop node-count(line)=0
disp.prism_validation node-count(line)=0
disp.prism_multiop node-count(line)=0
disp.prism_machinelive node-count(line)=0
--- also confirm dispatcher data/shop have real disp.* file-id nodes that the table is MISSING ---
disp.datadispatcher node-count(line)=1
disp.shopdispatcher node-count(line)=0
disp.validationdispatcher node-c
... [+100 chars truncated]

### Assistant | 2026-05-31T06:44:09.602Z

This surfaces a real finding. The fallback `disp.prism_*` targets don't exist (gate correctly leaves them dead — good, no new dead target minted). BUT there's a **missed-mapping observation**: for `prism_data`, `prism_validation`, `prism_machinelive`, `prism_multiop`, the *real file-id nodes DO exist* (`disp.datadispatcher`, `disp.validationdispatcher`, `disp.machinelivedispatcher`, `disp.multiopdispatcher` all = 1). So ~14 edges (5+2+4+3) that *could* have been remapped dead→live are left dead because those 4 MCP tools are missing from the 16-entry `MCP_TOOL_TO_DISP_NODE_ID` table.

This is a **P2 (completeness gap, not a correctness bug)** — the gate is doing exactly what it's documented to do (honest dead pixel for unmapped tools), and these are low-volume (~14 edges vs ~2643 correctly remapped). It's a coverage-improvement opportunity, not a defect. `prism_shop` genuinely has no node (correct to leave dead).

Now let me address the remaining review points: memory/fail-loud concern (point 5) and confirm live `disp.*`-targeted edges aren't repointed (point 6). Let me verify the `seen` Set construction and the `nodeIds` Set, and confirm no circular import. Let me check imports of viz-dispatcher-node-id.mjs (point 3 — leaf, no imports).

### Assistant | 2026-05-31T06:44:12.648Z

[tool_use: Bash]

### User | 2026-05-31T06:44:33.747Z

[tool_result] === imports in viz-dispatcher-node-id.mjs (should be NONE) ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for '^import\|require('
  (no imports — leaf module, no circular risk)

=== node --check both libs + merge ===
viz-dispatcher-node-id.mjs OK
viz-engine-node-id-canon.mjs OK
merge-augmentations.mjs OK

### Assistant | 2026-05-31T06:44:38.031Z

All three files pass `node --check`. `viz-dispatcher-node-id.mjs` has zero imports → it's a leaf, so no circular import risk (point 3 confirmed). The canon lib imports it; merge imports the canon lib. Clean acyclic chain.

Now let me verify the disable-knob fallback object shape (point 1) precisely matches the return shape, and run the existing test suite to confirm the new function's behavior is locked. Let me also do a quick runtime check of the fallback object key parity and confirm point 6 (live disp.* edges untouched since they don't start with `dispatcher.`).

### Assistant | 2026-05-31T06:44:47.389Z

[tool_use: Bash]

### User | 2026-05-31T06:44:57.764Z

[tool_result] fallback keys: ["dispRemapped","dispUnresolved","distinctDispMissing","distinctEngMissing","dropped","engRemapped","engUnresolved"]
return   keys: ["dispRemapped","dispUnresolved","distinctDispMissing","distinctEngMissing","dropped","engRemapped","engUnresolved"]
KEY PARITY: EXACT MATCH ✓
stats: {"engRemapped":1,"dispRemapped":1,"dropped":0,"engUnresolved":0,"dispUnresolved":1,"distinctEngMissing"
... [+374 chars truncated]

### Assistant | 2026-05-31T06:45:04.823Z

All behaviors confirmed at runtime:

1. **Fallback key parity: EXACT MATCH** — the disable-knob fallback object's 7 keys exactly match the function return shape. When disabled, the `console.log` at line 2729 and `G.meta.edgeTargetCanonicalization` will never emit `undefined`. (Point 1 ✓)

2. **Point 6 confirmed**: the live `disp.calcdispatcher` edge (edge0) is UNTOUCHED — it doesn't start with `dispatcher.` so it's skipped entirely. No live dispatcher edge is repointed. ✓

3. **Dead→live works**: dead `dispatcher.prism_calc` → `disp.calcdispatcher` (dispRemapped=1), dead `engine.KienzleForceModelEngine` → `eng.calc.kienzleforcemodelengine` (engRemapped=1). ✓

4. **Honest dead pixel**: unmapped `dispatcher.prism_shop` → stays `dispatcher.prism_shop` (dispUnresolved=1, NOT minted as a new `disp.prism_shop` dead target since gate found no node). ✓

Now let me confirm the disabled path is truly a byte-identical no-op (point 1 second half) and run the test suite.

### Assistant | 2026-05-31T06:45:05.827Z

[tool_use: Bash]

### User | 2026-05-31T06:45:20.659Z

[tool_result] === test suite for the canon lib ===
  ...
# Subtest: disable-knob parity: unified pass leaves an already-canonical graph untouched (zero-stats)
ok 18 - disable-knob parity: unified pass leaves an already-canonical graph untouched (zero-stats)
  ---
  duration_ms: 0.9452
  ...
# Subtest: unified pass is fail-soft on empty/missing graph
ok 19 - unified pass is fail-soft on empty/missing graph
  ---
... [+132 chars truncated]

### Assistant | 2026-05-31T06:45:30.389Z

19/19 tests pass, including dedicated coverage for the unified pass (test 18: zero-stats on already-canonical; test 19: fail-soft on empty/missing). 

Now point 1's "disabled = byte-identical no-op" sub-question. Reviewing the code: when `PRISM_VIZ_ENGINE_CANON_DISABLE === "1"`, the entire `if` block (lines 2710-2713) is skipped — `canonicalizeGraphEdgeTargets(G)` is never called (no edge mutation), and `G.meta.edgeTargetCanonicalization` is never written. The fallback `edgeCanon` object is just used for the closing `console.log`. So disabled = no edge mutation + no meta key written = clean revert. The reviewer's parenthetical concern is correctly resolved: the meta key write IS inside the `if`, so it's absent when disabled. ✓

Point 5 (memory): The pass adds a `nodeIds` Set (~301K entries, the docstring says ~301K nodes) on top of the `seen` Set (~1M edges). Let me assess the peak-memory reality against the SIGKILL history. The `seen` Set is `new Set(edges.map(edgeKey))` — that `.map()` allocates a ~1M-element intermediate array of strings, then the Set. The `nodeIds` Set is ~301K short strings. Let me verify the node count to bound the memory.

### Assistant | 2026-05-31T06:45:34.816Z

[tool_use: Bash]

### User | 2026-05-31T06:45:42.872Z

[tool_result] Exit code 1
Traceback (most recent call last):
  File "<stdin>", line 15, in <module>
  File "H:\Tools\python\Lib\encodings\cp1252.py", line 19, in encode
    return codecs.charmap_encode(input,self.errors,encoding_table)[0]
           ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
UnicodeEncodeError: 'charmap' codec can't encode character '\u2248' in position 26: character maps to <
... [+10 chars truncated]

### Assistant | 2026-05-31T06:45:45.410Z

Just a Windows cp1252 stdout encoding issue on the `≈` character (not a data error). The counts were computed; let me reprint without the unicode char.

### Assistant | 2026-05-31T06:45:47.839Z

[tool_use: Bash]

### User | 2026-05-31T06:45:59.097Z

[tool_result] total id occurrences (~ node count): 330196
from occurrences (~ edge count): 985492

### Assistant | 2026-05-31T06:46:10.127Z

Memory assessment (point 5):
- **~330K nodes**, **~985K edges** in the live graph.
- `nodeIds` Set: ~330K short string refs (each `disp.x`/`eng.x.y` already interned as the node's `id`) → roughly 10-25 MB of Set overhead. Modest.
- `seen` Set: `new Set(edges.map(edgeKey))` builds a ~985K intermediate array of freshly-concatenated key strings, then ~985K Set entries → the dominant cost, on the order of 100-200 MB. This already existed in the OLD `canonicalizeEngineEdgeTargets` (the engine-only pass also built the same `seen` Set), so the unified pass does NOT add the `seen` cost — it was already there. The ONLY net-new peak allocation is the `nodeIds` Set (~330K), which is small relative to `seen` and to the already-resident ~535MB graph.

This is acceptable: the merge already runs with `--max-old-space-size=16384` (16GB heap per the memory notes), the `keep` array is lazily allocated only on first drop (preserving the no-drop fast path), and the net-new `nodeIds` Set is a ~330K-entry minor addition. The SIGKILL-prone regime documented in `[[reference_u_regen_viz_merge_faillod]]` was about pretty-printed full-graph `JSON.stringify` (512MB string cap) — the write here goes through `writeGraphStreaming`, which bypasses that ceiling. So the memory profile is sound. No try/catch matches house style (the function is fail-soft via `(graph && graph.nodes) || []` guards, and merge wraps the call only behind the env check — consistent with the surrounding code).

I have verified all 6 review points. Let me record the verdict and update the task.

### Assistant | 2026-05-31T06:46:10.308Z

[tool_use: TaskGet]

### User | 2026-05-31T06:46:10.976Z

[tool_result] Task #21: Regen-verify combined dead-edge drop + doc-reflect
Status: in_progress
Description: One full regen-viz after both halves; re-run dead-pixel sweep; confirm dead-edge count drops from 15,671 by ~13K (dispatcher+engine-with-alias). Measure residual (genuinely-missing engines). Commit [MAIN] on shared tree. Update memory reference_sierra_dead_edge_id_mismatch + CLAUDE.md regression block + w
... [+4 chars truncated]

### Assistant | 2026-05-31T06:46:38.081Z

This task #21 is the regen-verify step that's downstream of my review — I'll leave it as-is (it belongs to the build chat, not the reviewer). My review is complete.

## Reviewer ARM B verdict — Half C (`canonicalizeGraphEdgeTargets` unified merge pass)

I verified all 6 points against the live `H:/prism` main-tree files and the live 535.7 MB `system-graph.json` (OOM-safe streaming/grep, never `JSON.parse`).

**1. DISABLE-KNOB SHAPE — PASS.** The fallback at `merge-augmentations.mjs:2709` has keys `{engRemapped, dispRemapped, dropped, engUnresolved, dispUnresolved, distinctEngMissing, distinctDispMissing}`. Runtime parity test: fallback keys === `canonicalizeGraphEdgeTargets` return keys, **EXACT MATCH**. So `console.log` (line 2729) and the meta key never emit `undefined` when disabled. **Disabled = byte-identical no-op confirmed**: the call + the `G.meta.edgeTargetCanonicalization` write are BOTH inside the `if (process.env.PRISM_VIZ_ENGINE_CANON_DISABLE !== "1")` block (lines 2710–2713) — when disabled, no edge mutation and no meta key written. The reviewer's parenthetical concern resolves correctly: the meta key write is inside the `if`.

**2. META KEY — PASS.** `G.meta.edgeTargetCanonicalization` written at line 2712. The old name `engineEdgeCanonicalization` has **zero references anywhere** (scripts, mcp-server, non-mjs). `edgeTargetCanonicalization` has exactly one writer and **no downstream reader** — purely a telemetry sidecar. `G.meta` is pre-initialized via `G.meta = G.meta || {}` at lines 1804 & 1837 (both before 2712), so the write is safe. `schemaVersion` is set to `"2.29.0"` at line 2716 but that is unrelated to this change (it's the standing merge schema and isn't bumped by Half C — correct, this is not a node/edge shape change).

**3. IMPORT — PASS.** Merge imports `canonicalizeGraphEdgeTargets` from `./lib/viz-engine-node-id-canon.mjs` (line 52); the old `canonicalizeEngineEdgeTargets` is **NOT referenced in merge** (only in the lib's own test file,
... [+2815 chars truncated]
