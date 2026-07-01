---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Reviewer ARM A (algorithm correctness) for \"Half C\" — extending PRISM's system-v"
date: "2026-05-31"
first_ts: "2026-05-31T06:36:33.552Z"
last_ts: "2026-05-31T06:40:18.511Z"
cwd: "H:\\prism-slot-sierra"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a10b3ab89342e8b79.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Reviewer ARM A (algorithm correctness) for "Half C" — extending PRISM's system-v

> **claude-code-cli** | 2026-05-31 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a10b3ab89342e8b79.jsonl`

## Transcript

### User | 2026-05-31T06:36:33.552Z

Reviewer ARM A (algorithm correctness) for "Half C" — extending PRISM's system-viz merge edge-canonicalization to ALSO fix dispatcher.* dead edges. Context: the merged system-graph is CUMULATIVE (merge reads the persistent graph + adds, never removes stale-target edges), so ~2,676 accumulated `dispatcher.prism_*` edges (a dead target; canonical is the file-derived `disp.<file>` e.g. `disp.calcdispatcher`) persist regardless of producer fixes. A new unified pass `canonicalizeGraphEdgeTargets` rewrites them in the assembled graph.

Read from EXACT ABSOLUTE PATHS (your CWD may be the worktree H:/prism-slot-sierra where these edits are ABSENT — read the H:/prism main-tree copies):
- H:/prism/scripts/lib/viz-engine-node-id-canon.mjs  (the new `canonicalizeGraphEdgeTargets` — engine via graph-alias + dispatcher via mcpToolToDispNodeId, node-existence-gated; plus the older `canonicalizeEngineEdgeTargets` kept for back-compat)
- H:/prism/scripts/lib/viz-engine-node-id-canon.test.mjs  (19 cases, all pass)
- H:/prism/scripts/lib/viz-dispatcher-node-id.mjs  (the mcpToolToDispNodeId SSOT — already shipped)
- H:/prism/scripts/merge-augmentations.mjs  (now calls canonicalizeGraphEdgeTargets; search "U-VIZ-G4-DEAD-EDGE" + "edgeCanon")

Verify + report P0/P1/P2 + final PASS/FAIL — focus on the NEW dispatcher branch:
1. NODE-EXISTENCE GATE: dispatcher.<X> is remapped ONLY when `mcpToolToDispNodeId(X) !== "dispatcher."+X` AND `nodeIds.has(resolved)`. Confirm: (a) this NEVER creates a fresh dead target (e.g. dispatcher.prism_shop → disp.prism_shop which doesn't exist → must stay unchanged); (b) the `canon !== v` check is meaningful — can mcpToolToDispNodeId ever return the input `dispatcher.<X>` unchanged (it returns `disp.*`, never `dispatcher.*`, so canon!==v is always true for a dispatcher.* input — is the check redundant-but-harmless or does it hide a bug?).
2. CUMULATIVE DEDUP: after remap, a stale `dispatcher.prism_calc` edge becomes `disp.calcdispatcher` and should dedup-drop o
... [+1223 chars truncated]

### Assistant | 2026-05-31T06:36:43.855Z

I'll review the new dispatcher branch in `canonicalizeGraphEdgeTargets`. Let me read the exact files from the H:/prism main-tree paths.

### Assistant | 2026-05-31T06:36:44.769Z

[tool_use: Read]

### Assistant | 2026-05-31T06:36:45.234Z

[tool_use: Read]

### Assistant | 2026-05-31T06:36:45.470Z

[tool_use: Read]

### User | 2026-05-31T06:36:55.490Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-engine-node-id-canon.mjs — canonicalize `engine.<ClassName>` edge targets
4	 * to the merged-graph engine node id `eng.<domain>.<name>` at assembly time.
5	 *
6	 * BACKGROUND (the second G4 dead-edge class, sierra):
7	 * Several producers emit graph edges to `engine.<ClassName>` (PascalCase) — the
8	 * scheme minted by `engine-node-extractor.mjs` (NN-GRAPH-MS0)
... [+10963 chars truncated]

### User | 2026-05-31T06:36:56.042Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-dispatcher-node-id.mjs — canonical MCP-tool-name → system-graph
4	 * dispatcher node-id resolver (SSOT for every ghost / bridge producer).
5	 *
6	 * BACKGROUND (the G4 dead-edge class, sierra):
7	 * The dispatcher INFERENCE rules + the per-kind bridge tables across PRISM all
8	 * speak the MCP *tool* name (`prism_calc`, `prism_safety`, …). But the merged
9	 * `
... [+3292 chars truncated]

### User | 2026-05-31T06:36:56.917Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for viz-engine-node-id-canon.mjs — engine.<ClassName> → eng.<domain>.<name>
4	 * edge-target canonicalization. Real assertions (reference values + the live
5	 * dead-edge scenario that motivated it), NOT toBeDefined stubs.
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	
10	import { buildEngineAliasIndex, canonicalizeEng
... [+11119 chars truncated]

### Assistant | 2026-05-31T06:37:02.258Z

Now let me read the merge-augmentations.mjs caller to verify the wiring, disable-knob, and zero-stats object.

### Assistant | 2026-05-31T06:37:03.772Z

[tool_use: Grep]

### User | 2026-05-31T06:37:10.305Z

[tool_result] 44-    const r = spawnSync(process.execPath,
45-      [`--max-old-space-size=${HEAP_MB_REQUIRED}`, ...process.argv.slice(1)],
46-      { stdio: "inherit", env: { ...process.env, PRISM_MERGE_AUG_REEXEC: "1" } });
47-    process.exit(r.status ?? 1);
48-  }
49-}
50-
51-import { readGraphStreaming, writeGraphStreaming } from "./lib/graph-io.mjs";
52:import { canonicalizeGraphEdgeTargets } from "./lib/
... [+3704 chars truncated]

### Assistant | 2026-05-31T06:37:14.851Z

I notice a potential issue at line 2705 of merge-augmentations.mjs — there appears to be a stray backslash. Let me read that exact region carefully.

### Assistant | 2026-05-31T06:37:15.790Z

[tool_use: Read]

### User | 2026-05-31T06:37:28.393Z

[tool_result] 2698	// U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonicalize mis-prefixed edge targets
2699	// in the assembled graph. The merged graph is CUMULATIVE (merge reads the
2700	// persistent system-graph.json + adds, never removes stale-target edges), so a
2701	// producer-side fix only affects NEW edges — the ~2.7K `dispatcher.prism_*` +
2702	// `engine.<ClassName>` edges accumulated from prior merges
... [+877 chars truncated]

### Assistant | 2026-05-31T06:37:31.239Z

Good — the actual file at line 2705 reads `// are strictly...` (a proper comment). The `\` shown in the Grep output was a rendering artifact of the Grep tool's context display, not the real file content. The Read shows clean `//` comment lines. Let me verify the file parses with node --check to be certain.

### Assistant | 2026-05-31T06:37:32.947Z

[tool_use: Bash]

### User | 2026-05-31T06:38:09.925Z

[tool_result] MERGE_OK
CANON_OK
DISP_OK

### Assistant | 2026-05-31T06:38:12.929Z

All three files parse clean. Let me run the test suite to confirm the 19 cases pass, then trace the algorithm carefully.

### Assistant | 2026-05-31T06:38:13.535Z

[tool_use: Bash]

### User | 2026-05-31T06:38:28.301Z

[tool_result]   ...
# Subtest: disable-knob parity: unified pass leaves an already-canonical graph untouched (zero-stats)
ok 18 - disable-knob parity: unified pass leaves an already-canonical graph untouched (zero-stats)
  ---
  duration_ms: 0.2107
  ...
# Subtest: unified pass is fail-soft on empty/missing graph
ok 19 - unified pass is fail-soft on empty/missing graph
  ---
  duration_ms: 0.1016
  ...
1..19
# 
... [+96 chars truncated]

### Assistant | 2026-05-31T06:39:04.698Z

19/19 pass. Now let me work through each review point with the source in front of me.

**Point 1 — NODE-EXISTENCE GATE (the core new dispatcher branch).**

Line 211-214:
```js
} else if (v.startsWith(DISPATCHER_PREFIX)) {
  const canon = mcpToolToDispNodeId(v.slice(DISPATCHER_PREFIX.length));
  if (canon !== v && nodeIds.has(canon)) { e[f] = canon; changed = true; dispRemapped++; }
  else { dispUnresolved++; dispMissing.add(v); }
}
```

(a) **Never creates a fresh dead target** — confirmed. The remap fires only when `nodeIds.has(canon)` is true, i.e. the resolved `disp.*` node provably exists in the assembled node set. For `dispatcher.prism_shop`: `mcpToolToDispNodeId("prism_shop")` → `prism_shop` is not in the frozen `MCP_TOOL_TO_DISP_NODE_ID` table → falls through to `disp.prism_shop`. If no `disp.prism_shop` node exists, `nodeIds.has("disp.prism_shop")` is false → the `else` branch runs → endpoint stays `dispatcher.prism_shop` unchanged, counted as `dispUnresolved`. Test 178 ("NODE-EXISTENCE GATE") asserts exactly this. Correct.

(b) **Is `canon !== v` redundant-but-harmless or does it hide a bug?** For any `dispatcher.*` input, `v` always starts with `"dispatcher."`. `mcpToolToDispNodeId` returns one of: a table value (`"disp.*"`), the fallback `` `disp.${lower}` ``, or `"disp.unknown"` — every return value starts with `"disp."`, never `"dispatcher."`. So `canon` (a `disp.*` string) can never equal `v` (a `dispatcher.*` string). The check `canon !== v` is therefore **always true** in the dispatcher branch → redundant.

Is the redundancy harmless? Yes — it is correctly the AND-conjunct, so a perpetually-true term doesn't relax the gate; `nodeIds.has(canon)` remains the load-bearing condition. It does NOT hide a bug. It is defensive symmetry with the engine branch's implicit "did it change" semantics and guards a hypothetical future where the SSOT table might map something to a `dispatcher.*`-prefixed id (it never does today). One subtle correctness point worth co
... [+4949 chars truncated]

### Assistant | 2026-05-31T06:39:08.490Z

[tool_use: Bash]

### User | 2026-05-31T06:39:19.748Z

[tool_result] real keys: ["dispRemapped","dispUnresolved","distinctDispMissing","distinctEngMissing","dropped","engRemapped","engUnresolved"]
zero keys: ["dispRemapped","dispUnresolved","distinctDispMissing","distinctEngMissing","dropped","engRemapped","engUnresolved"]
KEYS_MATCH: true
LOG_KEYS_ALL_PRESENT: true

### Assistant | 2026-05-31T06:39:35.778Z

Keys match exactly (7 keys, same set), and every key the merge `console.log` template (line 2729) reads is present in the real return — so a disabled run logs `0` for every field, never `undefined`. Stats accuracy:
- `engRemapped`/`dispRemapped` are endpoint-level (incremented inside the per-field loop, lines 209/213) — documented and intentional.
- `dropped` is edge-level (incremented once per dropped edge, line 219) — correct.
- `engUnresolved`/`dispUnresolved` count unmatched endpoints; `distinctEngMissing`/`distinctDispMissing` are `.size` of the dedup Sets (line 228) — correct.

One precision note worth flagging (P2): the `dispMissing` Set adds the FULL endpoint `v` (line 214, `dispMissing.add(v)`), whereas `engMissing` adds the stripped lowercased `cls` (line 210). This is a deliberate asymmetry — `dispatcher.prism_shop` is a complete dead identifier worth surfacing whole, while engine missing-keys track the bare class name. Both produce honest distinct-count semantics; the asymmetry is harmless but undocumented in the return-doc. Not a correctness defect.

**Point 6 — ONE-PASS EFFICIENCY / peak memory.**

- `nodeIds` Set (line 192-193): built once, ~301K node ids. A `Set<string>` of 301K short strings is on the order of tens of MB — acceptable, and it's the unavoidable cost of the node-existence gate (you cannot gate on existence without an existence index). It iterates `nodes` once.
- `seen` Set (line 195): `edges.map(edgeKey)` over ~1M edges. This is the one allocation concern — `edges.map(...)` materializes a ~1M-element intermediate array AND a ~1M-entry Set simultaneously at peak merge memory. This matches the pre-existing `canonicalizeEngineEdgeTargets` pattern (line 120) which was already scrutinized, so it's not a regression introduced by the dispatcher work. The `.map()` intermediate is transient (GC-eligible immediately after Set construction). Given the merge already re-execs with `--max-old-space-size=16384` (line 44-45) precisely for this regime,
... [+708 chars truncated]

### Assistant | 2026-05-31T06:39:40.963Z

[tool_use: Bash]

### User | 2026-05-31T06:39:52.149Z

[tool_result] stats: {"engRemapped":1,"dispRemapped":2,"dropped":1,"engUnresolved":0,"dispUnresolved":1,"distinctEngMissing":0,"distinctDispMissing":1}
edges: ["disp.calcdispatcher","dispatcher.prism_shop","eng.ai.airesourcelearningengine","disp.camdispatcher"]

### Assistant | 2026-05-31T06:40:18.511Z

End-to-end behavior is exactly correct:
- `dispatcher.prism_calc` remapped to `disp.calcdispatcher`, collided with the pre-existing canonical edge → **dropped** (5 edges → 4).
- `dispatcher.prism_shop` → no `disp.prism_shop` node → **stayed unchanged** (honest dead pixel), counted `dispUnresolved:1, distinctDispMissing:1`.
- `engine.AIResourceLearningEngine` → `eng.ai.airesourcelearningengine` (`engRemapped:1`).
- `dispatcher.prism_cam` → `disp.camdispatcher` (fresh, no collision, `dispRemapped` counts both the dropped-edge's remap and this one = endpoint-level `2`).
- `dropped:1` is edge-level. All stats consistent.

---

## Review Report — ARM A (algorithm correctness)

### Summary
- Files analyzed: 4 (canon lib, canon test, dispatcher SSOT, merge caller)
- 19/19 tests pass; all four files `node --check` clean; live multi-branch spot-check correct
- Issues found: 0 P0, 0 P1, 2 P2 (both non-defects)

### Critical Issues
None.

### Findings by review point

1. **NODE-EXISTENCE GATE — CORRECT.** `viz-engine-node-id-canon.mjs:213` — remap fires only on `canon !== v && nodeIds.has(canon)`. (a) Never mints a fresh dead target: `dispatcher.prism_shop` → `disp.prism_shop` (not in graph) → `nodeIds.has` false → unchanged (verified live + test:178). (b) `canon !== v` is **redundant-but-harmless, NOT bug-hiding**: `mcpToolToDispNodeId` provably returns only `disp.*` strings while `v` is always `dispatcher.*`, so the term is perpetually true — but as an AND-conjunct it cannot relax the load-bearing `nodeIds.has(canon)` gate. Defensive symmetry against a future SSOT-table change; safe.

2. **CUMULATIVE DEDUP — CORRECT.** `viz-engine-node-id-canon.mjs:195,219` — `seen` is pre-built from ALL original edge keys (including the producer's new canonical edges) before the loop, so order-independence holds: the stale `dispatcher.*` edge dedup-drops onto the canonical `disp.*` key whether it precedes or follows it (verified live + test:201). Two-stale-no-canonical case also collapses c
... [+2627 chars truncated]
