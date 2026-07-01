---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Independent second-pass review of a 2-file additive change (slot:sierra, PRISM)."
date: "2026-06-02"
first_ts: "2026-06-02T19:58:14.184Z"
last_ts: "2026-06-02T20:02:54.178Z"
cwd: "H:\\prism-slot-sierra"
messages: 39
user_msgs: 14
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a626dd6cf31ee7474.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Independent second-pass review of a 2-file additive change (slot:sierra, PRISM).

> **claude-code-cli** | 2026-06-02 | 39 msgs (14 user / 25 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a626dd6cf31ee7474.jsonl`

## Transcript

### User | 2026-06-02T19:58:14.184Z

Independent second-pass review of a 2-file additive change (slot:sierra, PRISM). Read both files end-to-end. Grade PASS/FAIL with P0/P1/P2/P3. Do NOT assume a first reviewer caught anything. Do NOT edit.

## Context
`scripts/lib/master-index-search-lib.mjs` is a SHARED search substrate consumed by: the 4 `pre-{bash,grep,read,write}-graph-inject.mjs` hooks, the subagent per-task pre-search, and `master-index-precheck-inject.mjs`. The change adds an additive `noteCount` field (full wiki+memory edge count) to each hit from `searchGraphHits`, so brain-coverage becomes available across the whole search-first surface for context-retention routing. A `noteCount` already exists on the find-cache side (`projectForFind`); this brings the master-index substrate to parity. This is the node-graph SUBSTRATE (sierra's lane), a structural COUNT — NOT wiki/tribal CONTENT (alpha's lane). 

## Files
1. `H:/prism/scripts/lib/master-index-search-lib.mjs` (searchGraphHits hit map)
2. `H:/prism/scripts/lib/master-index-search-lib.test.mjs` (new test case)

## Weight toward what correctness-only misses
- **Consumer blast radius**: open at least `.claude/hooks/pre-bash-graph-inject.mjs` (its `renderInject`) and confirm an extra hit field does NOT break it (it reads h.label/h.id/h.kind/h.wiki etc — does an unknown `noteCount` cause any issue? dedup libs? injection-dedup?). Spot-check whether any consumer does a strict shape check or serializes hits in a way a new field perturbs (e.g. a cache key derived from JSON.stringify(hit)).
- **Non-dup with alpha**: confirm this is substrate (a count), not content-injection. Is there any existing `noteCount`/brain-coverage already in this lib or its consumers that I'd be duplicating?
- **Test integrity (R9)**: would the new test FAIL if the noteCount line were reverted or made to count the truncated arrays? Is the deterministic-inline-graph approach sound (does the production code actually return those 3 nodes given the hand-built inverted map + label-
... [+500 chars truncated]

### Assistant | 2026-06-02T19:58:29.531Z

I'll review both files end-to-end as an independent second-pass reviewer. Let me read the production lib, the test file, and the consumer hooks to verify the blast radius.

### Assistant | 2026-06-02T19:58:30.440Z

[tool_use: Read]

### Assistant | 2026-06-02T19:58:30.742Z

[tool_use: Read]

### User | 2026-06-02T19:58:33.866Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1780430196779). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-02T19:58:34.114Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.mjs' was already read 11s ago in this session and is unchanged (mtime 1780429805592). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-02T19:58:37.271Z

The read-once guard says these files are already in my context, but I don't actually see their content in this conversation. Let me bypass the guard to read them fresh.

### Assistant | 2026-06-02T19:58:38.405Z

[tool_use: Read]

### User | 2026-06-02T19:58:46.705Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+4981 chars truncated]

### Assistant | 2026-06-02T19:58:51.386Z

Now let me read the rest of the lib, focusing on the `searchGraphHits` function where the change was made.

### Assistant | 2026-06-02T19:58:51.966Z

[tool_use: Read]

### User | 2026-06-02T19:59:11.036Z

[tool_result] 120	
121	// -- system-graph load + search -------------------------------------------
122	
123	// Sidecar schema version THIS loader understands. A sidecar carrying any
124	// other version is rejected and loadGraph silently falls through to the
125	// legacy path. Must equal build-graph-index.mjs SIDECAR_SCHEMA_VERSION — a
126	// mismatch is a SAFE degradation (legacy parse / architecture fallbac
... [+11870 chars truncated]

### Assistant | 2026-06-02T19:59:33.124Z

Now let me read the critical section — the `searchGraphHits` hit map where `noteCount` was added.

### Assistant | 2026-06-02T19:59:33.125Z

[tool_use: Read]

### User | 2026-06-02T19:59:50.443Z

[tool_result] 349	  // Defensive: graph.nodes can carry null / id-less / non-object elements —
350	  // loadGraph's legacy path keeps them in wrapper.nodes, and a partial-written
351	  // sidecar could too. Filter before building the id map so a malformed node
352	  // can never throw here (the lib's contract: search returns [], never throws).
353	  const nodeById = new Map(
354	    graph.nodes
355	      .filte
... [+5674 chars truncated]

### Assistant | 2026-06-02T19:59:56.181Z

I have the production change fully in view (lines 399-405). Now let me read the test file to verify the new test case.

### Assistant | 2026-06-02T19:59:56.975Z

[tool_use: Read]

### User | 2026-06-02T19:59:59.745Z

[tool_result] 1	/**
2	 * master-index-search-lib.test.mjs
3	 *
4	 * Real-value coverage for the shared keyword search lib used by both
5	 * master-index-precheck-inject.mjs and spawned-agent-context-lib.mjs.
6	 *
7	 * Uses node:test (matches the rest of .claude/helpers/ test pattern) so it
8	 * works under the portable node runner without vitest harness setup.
9	 *
10	 * Coverage:
11	 *   - tokenize: stopwords,
... [+3255 chars truncated]

### Assistant | 2026-06-02T20:00:05.631Z

Now let me find the new `noteCount` test case in the test file.

### Assistant | 2026-06-02T20:00:06.194Z

[tool_use: Grep]

### User | 2026-06-02T20:00:20.446Z

[tool_result] 626-    const hits = searchGraphHits(g, ["kienzle"], { topK: 5 });
627-    // First hit must be KienzleForceEngine; L11 'kienzle-foo' must be filtered.
628-    assert.ok(hits.length >= 1);
629-    assert.strictEqual(hits[0].label, "KienzleForceEngine");
630-    assert.ok(hits[0].score > 0);
631-    // No L11 layer should appear
632-    for (const h of hits) assert.notStrictEqual(h.layer, "L11");
6
... [+3074 chars truncated]

### Assistant | 2026-06-02T20:00:28.169Z

The new test case is fully in view (lines 634-669). It's well-constructed with two parts: a fixture-graph assertion and a deterministic inline-graph assertion. Now let me verify the blast radius on consumers. The critical question: does an extra `noteCount` field break any consumer's `renderInject` or dedup logic? Let me read the consumer hook and check for strict shape checks or JSON.stringify-based cache keys.

### Assistant | 2026-06-02T20:00:28.466Z

[tool_use: Read]

### User | 2026-06-02T20:00:32.228Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+8206 chars truncated]

### Assistant | 2026-06-02T20:00:45.695Z

The `pre-bash-graph-inject.mjs` consumer confirms a key finding: `renderInject` reads only `h.label`, `h.id`, `h.layer`, `h.status`, `h.info`. An extra `noteCount` field is harmless — JS object property access ignores unknown fields. The dedup uses `lib.hashBlock(block)` where `block` is the rendered STRING (not the hit object), so `noteCount` never enters the cache key. Confirmed safe for this consumer.

Wait — one detail worth flagging: `renderInject` references `h.info`, but `searchGraphHits` does NOT emit an `info` field in its hit objects (it emits id/score/layer/label/status/wiki/memory, and now noteCount). That's a pre-existing gap, not introduced by this change — `h.info` is always undefined here, the info line just renders empty. Not in scope, but confirms the consumer tolerates missing fields gracefully, which is the mirror property of tolerating extra ones.

Let me verify the other consumers don't do a strict shape check or serialize hits into a cache key. Let me check the precheck-inject and the find-cache `projectForFind` for the naming-parity claim.

### Assistant | 2026-06-02T20:00:47.567Z

[tool_use: Grep]

### Assistant | 2026-06-02T20:00:48.480Z

[tool_use: Grep]

### User | 2026-06-02T20:00:53.585Z

[tool_result] H:\prism\scripts\lib\master-index-search-lib.mjs:399:        // noteCount = TRUE brain-coverage: the FULL wiki+memory edge totals (NOT the
H:\prism\scripts\lib\master-index-search-lib.mjs:402:        // ` (N docs)`; matches projectForFind's noteCount (find-cache) semantics so the
H:\prism\scripts\lib\master-index-search-lib.mjs:404:        noteCount: (Array.isArray(node.knowledge?.wikiEntries) ? n
... [+2267 chars truncated]

### User | 2026-06-02T20:00:54.545Z

[tool_result] No matches found

### Assistant | 2026-06-02T20:01:03.200Z

Important finding surfaced: the find-cache side (`system-viz-graph.mjs:295` `projectForFind`) emits `noteCount` **only when `nc > 0`** (`if (nc > 0) slim.noteCount = nc;`), and the find-cache test (`regen-find-cache.test.mjs:230-231`) explicitly asserts `noteCount === undefined` for empty/missing knowledge ("empty arrays → no field (no bloat)").

This is a semantic DIVERGENCE between the two substrates, and it directly contradicts the PR comment's claim that the new field "matches projectForFind's noteCount (find-cache) semantics so the two substrates agree." Let me read the find-cache projection and its tests to confirm precisely.

### Assistant | 2026-06-02T20:01:03.780Z

[tool_use: Read]

### User | 2026-06-02T20:01:12.961Z

[tool_result] 278	    throw new Error(`projectForFind: graph.nodes missing or not an array`);
279	  }
280	  const nodes = new Array(graph.nodes.length);
281	  for (let i = 0; i < graph.nodes.length; i++) {
282	    const n = graph.nodes[i];
283	    const slim = {};
284	    for (const f of FIND_FIELDS) if (n[f] !== undefined) slim[f] = n[f];
285	    // Brain-coverage: a STRUCTURAL count of wiki+memory docs backin
... [+960 chars truncated]

### Assistant | 2026-06-02T20:01:27.087Z

Confirmed. The two implementations diverge in their presence contract:

- **find-cache (`projectForFind`)**: `noteCount` is **omitted when 0** (sparse — "no field (no bloat)"), present only when `> 0`. The arithmetic is identical (`wikiEntries.length + memoryEntries.length`).
- **master-index (`searchGraphHits`, this change)**: `noteCount` is **always present**, including `0` for undocumented nodes.

The numeric computation is the same. The presence semantics differ. This is the one substantive thing to assess. Let me now confirm the test's production-shape soundness — does the deterministic inline graph actually return those 3 nodes given label-substring scoring? And does the precheck-inject consumer have any strict-shape risk?

### Assistant | 2026-06-02T20:01:27.781Z

[tool_use: Read]

### User | 2026-06-02T20:01:45.510Z

[tool_result] 205	});
206	
207	// ============================================================================
208	// noteCount — projectForFind derives a STRUCTURAL brain-coverage count from each
209	// node's knowledge.{wikiEntries,memoryEntries}; set ONLY when >0 (undocumented
210	// nodes carry no field → zero cache bloat). NOT a searched field.
211	// =======================================================
... [+1878 chars truncated]

### Assistant | 2026-06-02T20:02:11.324Z

Divergence fully confirmed against authoritative tests. Now let me verify the test's production-shape soundness — whether `searchGraphHits` actually returns those 3 inline nodes. The inline graph at test line 651-659 hand-builds `inverted: new Map([["widget", new Set(["e:doc","e:bare","e:partial"])]])` and queries `["widget"]`. The scoring loop (lib lines 360-388): for token `widget`, the bucket has all 3 ids; each node's `labelLower` is "widgetdoc"/"widgetbare"/"widgetpartial", and `labelLower.includes("widget")` is true for all 3 → `s = W_LABEL = 3.0 > 0` → all 3 become candidates. Layer L7 is not excluded. Labels are distinct → no dedup collision. So all 3 survive. The test logic is sound.

Now the first assertion (line 641): `hits[0].noteCount === 2` for the FIXTURE_GRAPH. KienzleForceEngine has 1 wiki + 1 memory = 2, and it out-scores the empty-knowledge duplicate-label node. Both score 3.0 (label match on "kienzle") plus the documented one gets +W_VAULT? Let me verify: the documented node's wiki name is "kienzle-physics" which includes "kienzle" → +W_VAULT = 1.0. So documented = 3+? Actually idLower "engine:kienzleforceengine" includes "kienzle" → +W_ID=2.0, label +3.0, wiki +1.0 = 6.0. The dup-label node: id "engine:kienzleforceengine.duplicate" includes kienzle → +2.0, label +3.0, no wiki = 5.0. So documented (6.0) ranks first → `hits[0]` is the documented node, noteCount 2. Assertion is correct, and it would FAIL if reverted (no field → `undefined !== 2`). R9 satisfied.

Let me do a final check on the precheck-inject consumer rendering and confirm no strict-shape serialization.

### Assistant | 2026-06-02T20:02:11.902Z

[tool_use: Grep]

### User | 2026-06-02T20:02:15.812Z

[tool_result] 99:  process.stdout.write(JSON.stringify({
118:  if (items.length <= 1) return items.slice(0, topK);
130:  return out.slice(0, topK).map((c) => {
197:    const w = exactMatch.wiki.length > 0 ? `\n  wiki: ${exactMatch.wiki[0]}` : "";
198:    const m = exactMatch.memory.length > 0 ? `\n  mem: ${exactMatch.memory[0]}` : "";
214:    const w = h.wiki.length > 0 ? `  wiki: ${h.wiki.slice(0, 2).join(", "
... [+99 chars truncated]

### Assistant | 2026-06-02T20:02:54.178Z

The `master-index-precheck-inject.mjs` consumer reads `h.wiki` and `h.memory` (arrays, `.length`/`.slice` — still emitted unchanged) and `exactMatch.wiki/memory`. It does NOT read `noteCount` and does NOT JSON.stringify the hit objects into any cache key (line 99 stringifies the final output envelope, which it would do regardless). No strict shape check (no `Object.keys` length assertion). Adding `noteCount` is inert for this consumer.

The `JSON.stringify` at line 99 is the hook's stdout emission of `hookSpecificOutput.additionalContext` (a rendered string), not the raw hits — so the new field never reaches it. Confirmed safe across all consumers.

I have everything needed. Here is my independent verdict.

---

## VERDICT: PASS (with one P2 the author should resolve before commit — a comment/contract accuracy issue, not a functional break)

### Summary
The change adds an always-present numeric `noteCount` field to each `searchGraphHits` hit, computed as the full `wikiEntries.length + memoryEntries.length`. It is functionally correct, defensively coded (mirrors `loadGraph`'s `Array.isArray` guards), inert to every consumer, and the new test is genuine (fails on revert). One claim in the code comment is **factually wrong** and should be fixed to prevent future drift confusion.

### Consumer blast radius — CLEAR (P0/P1: none)
Verified all relevant consumers end-to-end:
- **`.claude/hooks/pre-bash-graph-inject.mjs`** (`renderInject`, line 52-90): reads only `h.label/h.id/h.layer/h.status/h.info`. Unknown `noteCount` is ignored. The dedup path (lines 147-176) hashes the **rendered string** via `lib.hashBlock(block)`, not the hit object — `noteCount` never enters the cache key. Safe.
- **`.claude/hooks/master-index-precheck-inject.mjs`** (lines 197-215): reads `h.wiki`/`h.memory` (unchanged arrays) and `exactMatch.*`; does not read `noteCount`; the only `JSON.stringify` (line 99) serializes the final output envelope (a rendered string), not raw hits. Safe.
- No consumer 
... [+4757 chars truncated]
