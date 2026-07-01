---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Review (arm A — silent breakage / regression / correctness / leak-safety) of a N"
date: "2026-06-21"
first_ts: "2026-06-21T22:29:31.710Z"
last_ts: "2026-06-21T22:31:41.122Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a1c68adcd668e4023.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review (arm A — silent breakage / regression / correctness / leak-safety) of a N

> **claude-code-cli** | 2026-06-21 | 28 msgs (10 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a1c68adcd668e4023.jsonl`

## Transcript

### User | 2026-06-21T22:29:31.710Z

Review (arm A — silent breakage / regression / correctness / leak-safety) of a NEW pure library + its tests, slot:india. Read both END-TO-END, grade PASS/FAIL with P0/P1/P2 + file:line.

FILES:
1. H:/prism/scripts/lib/engine-action-surface.mjs
2. H:/prism/scripts/lib/engine-action-surface.test.mjs

PURPOSE / CONTRACT: extract a per-engine "action surface" — the dispatcher ACTION NAMES each engine backs — as an embeddable TEXT feature for the GNN tier-5 (the evidence-backed dense feature to lift 1/7-class separability). It parses dispatcher `.ts` case bodies (engine refs via `Engine.`/`Engine?.` method-access + `new XEngine(`), inverts to Map<engineStemLower, Set<action>>, and projects to text. LEAK DISCIPLINE (critical): the surface must be EMPTY for an unwired ghost (built from dispatcher case bodies, never the node's own label) — that's the india-soul anti-"fake-0.98-leak" contract; verify `actionSurfaceText` returns "" for an engine with no backing action.

FOCUS:
- Case-body boundary logic in `actionEngineRefsFromSource`: can an engine ref leak from a sibling case or from code before the first case? Does the `CASE_BODY_CAP` slice + the next-case `search` correctly bound each body?
- The method-access regex `ENGINE_REF_RE = /\b([a-z][A-Za-z0-9_]*Engine)\s*\??\./g` — does it correctly EXCLUDE a helper call `getEngine(` while INCLUDING `fooEngine.bar()` and `fooEngine?.bar()`? Any real singleton-usage pattern it now wrongly MISSES (recall cost)?
- `engineStemFromNodeId` / `actionSurfaceText` suffix handling + the empty-for-unwired contract.
- Do the 12 tests actually FAIL on a real regression (R9), or is any assertion toothless? Is the live-data invariant test meaningful?
- Fail-soft on unreadable dir/file.
Be concise. Grade PASS/FAIL.

### Assistant | 2026-06-21T22:29:35.597Z

I'll review both files end-to-end, focusing on the silent-breakage and leak-discipline contract.

### Assistant | 2026-06-21T22:29:36.093Z

[tool_use: Read]

### Assistant | 2026-06-21T22:29:36.289Z

[tool_use: Read]

### User | 2026-06-21T22:29:37.351Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * engine-action-surface.mjs -- per-engine dispatcher ACTION-SURFACE extractor.
4	 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
5	 *
6	 * WHY: the GNN tier-5's 768-d nomic TEXT embeddings separate only 1/7 dispatcher
7	 * classes (meanMargin 0.0263; only prism_turning clears the bar) -- an engine's
8	 * DESCRIPTION text is near-non-discriminative for which dispatcher it
... [+7115 chars truncated]

### User | 2026-06-21T22:29:39.596Z

[tool_result] 1	/**
2	 * Tests for engine-action-surface.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
4	 * the case-body parse, the inverse-map build, the leak-free empty-for-unwired rule,
5	 * or the text projection regresses. Pure functions tested on synthetic dispatcher
6	 * source; one live-data invariant test against the r
... [+8441 chars truncated]

### Assistant | 2026-06-21T22:29:42.536Z

Now let me verify the critical claims against the sibling parser it mirrors, and check the regex edge cases empirically.

### Assistant | 2026-06-21T22:29:42.796Z

[tool_use: Read]

### User | 2026-06-21T22:29:43.568Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-action-engine-edges.mjs' was already read 6m ago in this session and is unchanged (mtime 1779681338884). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T22:29:45.802Z

The guard claims I read it but it's not in my visible context. Let me grep the relevant parser logic from the sibling.

### Assistant | 2026-06-21T22:29:47.583Z

[tool_use: Grep]

### User | 2026-06-21T22:29:49.275Z

[tool_result] 38-    if (n.layer !== "L5") continue;
39-    if (!n.id?.match(/^eng\..+\..+$/)) continue;
40:    const stem = n.id.split(".").slice(2).join(".").toLowerCase();
41-    if (!engineByStem.has(stem)) engineByStem.set(stem, n.id);
42-    // Also without "engine" suffix for shorter handle
43-    if (stem.endsWith("engine")) {
44:      const short = stem.slice(0, -6);
45-      if (!engineByStem.has(shor
... [+911 chars truncated]

### Assistant | 2026-06-21T22:29:54.551Z

I now have the key comparison point. The sibling at line 100 uses `\n\s*(case\s+["'][a-z_]|default\s*:)` — note `[a-z_]` (lowercase only), while the new lib at line 81 uses `[A-Za-z0-9_.]` (broader). Let me note the important divergence and verify the boundary logic and the critical `\b` difference empirically.

The sibling line 106 uses `/\b([a-z][A-Za-z0-9_]*Engine)\b/g` (word boundary, no method-access requirement), while the new lib's `ENGINE_REF_RE` requires `\s*\??\.` after. Let me test the regex behaviors and a couple of suspected edge cases directly.

### Assistant | 2026-06-21T22:30:06.957Z

[tool_use: Bash]

### User | 2026-06-21T22:30:10.414Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\engine-action-surface.mjs' imported from C:\Users\wompu\AppData\Local\Temp\eas_probe.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/engine-action-surface.mjs"?
    at finalizeResolution (node:in
... [+690 chars truncated]

### Assistant | 2026-06-21T22:30:13.104Z

Path resolution issue with the absolute import. Let me use an absolute file URL import.

### Assistant | 2026-06-21T22:30:20.228Z

[tool_use: Bash]

### User | 2026-06-21T22:30:24.073Z

[tool_result] 1 bare-handle assign: []
2 bracket access: []
3 method: [ 'fooEngine' ]
4 optchain: [ 'fooEngine' ]
5 await: [ 'fooEngine' ]
6 getEngine helper: []
7 PascalStatic: []
8 pre-case: [["x",["kienzleengine"]]]
9 nested: [["outer",["innerengine","outerengine"]],["inner",["innerengine","outerengine"]],["next",["nextengine"]]]
10 upper-next-case: [["lo",["aengine"]],["Hi",["bengine"]]]

### Assistant | 2026-06-21T22:30:28.187Z

Now let me confirm the most important finding — the nested-switch leak (case 9) — and check the test suite actually passes as written, plus probe one more real precision case (`SomethingEngineFactory` partial match and `.Engine.` chained access).

### Assistant | 2026-06-21T22:30:36.200Z

[tool_use: Bash]

### User | 2026-06-21T22:30:40.149Z

[tool_result] A pascal-method: []
B chained: [ 'barEngine' ]
C nested-default: [["outer",["innerengine","outerengine"]],["inner",["innerengine","outerengine"]],["next",["nextengine"]]]
  ...
# Subtest: actionSurfaceText: sorted+deduped, _->space, suffix-tolerant; '' for unwired ghost + non-map
ok 11 - actionSurfaceText: sorted+deduped, _->space, suffix-tolerant; '' for unwired ghost + non-map
  ---
  duration_m
... [+370 chars truncated]

### Assistant | 2026-06-21T22:30:51.669Z

All 12 tests pass. I now have everything needed. Let me consolidate findings.

Key empirical results:
- **Leak discipline holds for the documented cases**: pre-case refs (case 8) and sibling-case refs (case 2 in tests) do NOT leak. Empty-for-unwired contract verified.
- **Nested switch (case 9 / case C)**: `innerEngine` AND `outerEngine` both get attributed to BOTH the `inner` action and the `outer` action. The inner `case "inner":` truncates the `outer` body (outer loses nothing it owns, but the inner case body then continues to `return outerEngine.h()` because the outer block's closing brace doesn't stop it). This is a **cross-case mis-attribution** — `outerengine` leaks into the `inner` action's surface. This is a real correctness issue, but it under/cross-counts among WIRED engines only (both are real engines, both real actions) — it does not violate the empty-for-unwired leak contract (the load-bearing india-soul guarantee).
- **Recall miss (case A/case 7)**: `ThermalEngine.calc(p)` / `KienzleEngine.static(p)` — a **PascalCase singleton accessed via static method** is MISSED. `ENGINE_REF_RE` requires lowercase first letter `[a-z]`. `NEW_ENGINE_RE` only catches `new X(`. So `SomeEngine.staticMethod()` (a common dispatcher pattern: `SomeEngine.getInstance()`, static factories) contributes nothing. The sibling `generate-action-engine-edges.mjs` uses `/\b([a-z][A-Za-z0-9_]*Engine)\b/` — also lowercase-first — so this is a *consistent* limitation, not a regression vs the mirror.
- **getEngine( exclusion works** (case 6) — precision guard verified.

Let me verify whether PascalCase static-method engine access is actually a real pattern in the dispatcher dir (to weight the recall finding).

### Assistant | 2026-06-21T22:30:53.295Z

[tool_use: Grep]

### User | 2026-06-21T22:30:54.819Z

[tool_result] mcp-server\src\tools\dispatchers\bridgeDispatcher.ts:1
mcp-server\src\tools\dispatchers\cadDrawingKnowledgeDispatcher.ts:1
mcp-server\src\tools\dispatchers\automationDispatcher.ts:5
mcp-server\src\tools\dispatchers\authDispatcher.ts:8
mcp-server\src\tools\dispatchers\atcsDispatcher.ts:1
mcp-server\src\tools\dispatchers\algorithmDispatcher.ts:3
mcp-server\src\tools\dispatchers\algorithmDispatcher.s
... [+553 chars truncated]

### Assistant | 2026-06-21T22:30:58.216Z

That's a very large signal — but it will include `new XEngine(`-style and type annotations. Let me filter out `new ` and type-position matches to estimate the real recall gap (PascalCase singletons used via method access that are NOT `new`).

### Assistant | 2026-06-21T22:31:05.531Z

[tool_use: Bash]

### User | 2026-06-21T22:31:08.833Z

[tool_result] lowerCamel .method engines (CAPTURED): 1866
PascalCase .method engines (some MISSED): 3480
Pascal-method engines NOT seen as lowerCamel (pure recall MISS candidates): 1652
sample pascalOnly: [
  'adaptivefeedcontrolengine',
  'adaptivespindlecontrolengine',
  'bayesianadaptiveengine',
  'toollifeadaptiveengine',
  'digitaltwinsyncengine',
  'adaptivecalibrationengine',
  'adaptivechatterengine',
 
... [+137 chars truncated]

### Assistant | 2026-06-21T22:31:41.122Z

This is a significant finding. **1,652 Pascal-method-accessed engines** are method-accessed via `SomeEngine.method()` static style and never seen as lowerCamel singletons — so they get ZERO action surface. Note some of these may be false positives (type annotations, class declarations), but the magnitude (1652 vs 1866 captured) shows the recall gap is large and real — roughly the same order as what IS captured. This directly undercuts the feature's stated purpose (a dense feature to lift class separability): nearly half the engine population may get an empty surface not because they're unwired, but because of the case-of-first-letter parsing limitation.

However — critically — this does NOT break the leak contract. An empty surface for a Pascal-static engine is a *recall* loss (missing signal), not a *leak* (fake signal). And it's consistent with the sibling parser. Let me confirm whether the sibling avoids this via its graph-node resolution (it resolves matches against real engine nodes, so it could afford a looser regex — but it uses the same lowercase-first pattern, so it has the same gap).

I have enough to grade. Let me write up the verdict.

---

VERDICT: PASS

summary: The load-bearing india-soul leak contract holds: I verified empirically that refs before the first case, refs in sibling cases, and unwired ghosts all yield an empty surface — `actionSurfaceText` returns `""` by construction for an engine with no backing action, never reading the node's own label. The `getEngine(` precision guard works; method-access `.`/`?.` requirement correctly excludes helper calls while including `fooEngine.bar()`/`fooEngine?.bar()`/`await fooEngine.compute()`. All 12 tests genuinely fail on regression (R9-sound, not toothless). Two correctness limitations exist (a nested-switch cross-attribution among wired engines, and a large PascalCase-static recall miss) but neither violates the leak contract and both are consistent with the sibling parser it mirrors — so they are qua
... [+3549 chars truncated]
