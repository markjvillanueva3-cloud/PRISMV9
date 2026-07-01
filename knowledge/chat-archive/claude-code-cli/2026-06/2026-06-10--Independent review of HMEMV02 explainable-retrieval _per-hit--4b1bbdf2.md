---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Independent review of HMEMV02 explainable-retrieval (per-hit \"why retrieved\" tra"
date: "2026-06-10"
first_ts: "2026-06-10T19:44:35.890Z"
last_ts: "2026-06-10T19:51:34.039Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 18
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a9ee4c5e706e86d4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent review of HMEMV02 explainable-retrieval (per-hit "why retrieved" tra

> **claude-code-cli** | 2026-06-10 | 44 msgs (18 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a9ee4c5e706e86d4e.jsonl`

## Transcript

### User | 2026-06-10T19:44:35.890Z

Independent review of HMEMV02 explainable-retrieval (per-hit "why retrieved" trace) added to the live memory-recall path. Read:
- H:/prism/scripts/lib/memory-index-search-lib.mjs
- H:/prism/scripts/lib/memory-index-search-lib.test.mjs
- H:/prism/.claude/hooks/memory-index-precheck-inject.mjs

The change adds an `explanation` object per recall hit ({matchedTokens, corpus, denseArm, denseSim, bm25Score, rrf}) threaded through tryHybridFuse + runMemoryIndexSearch's toHit, and a default-OFF hook render (PRISM_MEMORY_INDEX_EXPLAIN=1).

Weight toward what a code-analyzer misses:
1. REGRESSION SAFETY on a 26-slot hot path: the prior commits (4c6d8ed40c Qdrant rewire, 78f64fda97 keepwarm) are live. Does adding `explanation` risk breaking any EXISTING consumer of the hit shape (the renderBlock, any other importer of runMemoryIndexSearch)? Adding a field is usually safe -- confirm no consumer does a strict shape check / deepEqual that would now fail. Did the existing 69 tests stay green (now 73)?
2. R6 / token budget: the explanation is computed ALWAYS (even when the hook render is off). Is matchedTokens cheap (it is pure string indexOf over a few fields)? Does always-returning explanation add meaningful per-prompt cost vs the value? Is default-OFF render the right call given 26 slots x every prompt?
3. SCOPE HONESTY (R7): the unit spec said extend master-index-precheck-inject.mjs (system-graph surface); this was built on the memory-recall surface instead. Is that deviation surfaced honestly (envelope note, code comments)? Is the envelope correctly marked in_progress (not completed) with the master-index surface flagged as remaining?
4. TEST INTEGRITY (R9): do the 4 new tests fail if their fix is reverted? Specifically the "_explain (arm, denseSim, bm25Score)" test -- does it prove denseArm=qdrant + the bm25-only key has bm25Score=null?
5. CONVENTION: ASCII-only in code; the explanation field naming/placement matches the file's idiom; the hook knob follows the existing PRISM_
... [+111 chars truncated]

### Assistant | 2026-06-10T19:44:43.019Z

I'll review this change. Let me read the three files in parallel.

### Assistant | 2026-06-10T19:44:44.113Z

[tool_use: Read]

### Assistant | 2026-06-10T19:44:44.601Z

[tool_use: Read]

### Assistant | 2026-06-10T19:44:44.608Z

[tool_use: Read]

### User | 2026-06-10T19:44:46.289Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\memory-index-search-lib.mjs' was already read 12s ago in this session and is unchanged (mtime 1781120335329). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T19:44:46.812Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\memory-index-search-lib.test.mjs' was already read 0s ago in this session and is unchanged (mtime 1781120462937). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-10T19:44:46.849Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\memory-index-precheck-inject.mjs' was already read 12s ago in this session and is unchanged (mtime 1781120404906). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-10T19:44:51.747Z

The files are already in my context. Let me examine the specific implementation details I need to verify the review claims. Let me grep for key elements to confirm exact line numbers and behavior.

### Assistant | 2026-06-10T19:44:52.526Z

[tool_use: Grep]

### Assistant | 2026-06-10T19:44:53.854Z

[tool_use: Grep]

### Assistant | 2026-06-10T19:44:55.095Z

[tool_use: Grep]

### User | 2026-06-10T19:44:57.656Z

[tool_result] 845:      explanation: {
909:  // explanation (BM25-only: denseArm null, bm25Score = the score) like the sidecar path.

### User | 2026-06-10T19:44:58.751Z

[tool_result] 702:import { matchedTokens } from "./memory-index-search-lib.mjs";
704:test("matchedTokens: returns the query tokens present in the record's fields", () => {
707:  assert.deepEqual(matchedTokens(rec, ["obsidian", "recall", "missing"]), ["obsidian", "recall"]);
710:test("matchedTokens: matches alias + namespace; empty on no-match / bad input (fail-soft)", () => {
712:  assert.deepEqual(matchedToken
... [+1160 chars truncated]

### User | 2026-06-10T19:44:59.027Z

[tool_result] 79:// budget cost). PRISM_MEMORY_INDEX_EXPLAIN=1 surfaces which arm produced each hit
83:const EXPLAIN_ON = process.env.PRISM_MEMORY_INDEX_EXPLAIN === "1";
85:  if (!EXPLAIN_ON) return "";
86:  const e = h && h.explanation;
88:  const arm = e.denseArm
89:    ? `${e.denseArm}${typeof e.denseSim === "number" ? " " + e.denseSim.toFixed(2) : ""}`
91:  const bm = typeof e.bm25Score === "number" ? ` bm2
... [+155 chars truncated]

### Assistant | 2026-06-10T19:45:03.955Z

Now let me read the exact implementation regions: the `matchedTokens` function, the `tryHybridFuse` `_explain` threading, the `toHit` explanation assembly, and confirm the test for `tryHybridFuse`.

### Assistant | 2026-06-10T19:45:04.879Z

[tool_use: Read]

### Assistant | 2026-06-10T19:45:05.924Z

[tool_use: Read]

### User | 2026-06-10T19:45:08.203Z

[tool_result] 780	  // covers ALL records, so a dense-only/BM25-miss hit still hydrates).
781	  const out = [];
782	  for (const { key, rrf } of fusedRanked) {
783	    const rec = byKey.get(key);
784	    if (!rec) continue;
785	    const d = denseByKey.get(key);
786	    const b = bm25ByKey.get(key);
787	    out.push({
788	      ...rec,
789	      score: rrf,
790	      _explain: {
791	        rrf,
792	        den
... [+6515 chars truncated]

### User | 2026-06-10T19:45:08.587Z

[tool_result] 700	
701	// ----- HMEMV02 explainable retrieval ----------------------------------------
702	import { matchedTokens } from "./memory-index-search-lib.mjs";
703	
704	test("matchedTokens: returns the query tokens present in the record's fields", () => {
705	  const rec = { name: "obsidian-hermes-accel", fileName: "obsidian-hermes-accel.md",
706	    description: "recall acceleration", opening: "vault
... [+3328 chars truncated]

### Assistant | 2026-06-10T19:45:16.525Z

Now let me read the `matchedTokens` function definition and the hook render block + injection site to verify the remaining claims.

### Assistant | 2026-06-10T19:45:17.860Z

[tool_use: Grep]

### Assistant | 2026-06-10T19:45:18.653Z

[tool_use: Read]

### User | 2026-06-10T19:45:20.221Z

[tool_result] 75	}
76	
77	// HMEMV02 explainable retrieval: compact "why retrieved" tag. Default OFF (the recall
78	// block fires every prompt across 26 slots; adding tokens fleet-wide by default is a
79	// budget cost). PRISM_MEMORY_INDEX_EXPLAIN=1 surfaces which arm produced each hit
80	// (qdrant/scan dense + cosine, or bm25-only) + BM25 component + matched tokens, so an
81	// operator can audit WHY a memo 
... [+2761 chars truncated]

### User | 2026-06-10T19:45:20.460Z

[tool_result] 282:export function matchedTokens(rec, queryTokens) {
283-  if (!rec || !Array.isArray(queryTokens) || queryTokens.length === 0) return [];
284-  const blob = [
285-    rec.name, rec.fileName, rec.description, rec.opening, rec.namespace,
286-    Array.isArray(rec.aliases) ? rec.aliases.join(" ") : "",
287-  ].filter((s) => typeof s === "string").join(" ").toLowerCase();
288-  const out = [];
289- 
... [+461 chars truncated]

### Assistant | 2026-06-10T19:45:24.384Z

I have everything I need. Let me verify the test suite is actually green (73 tests claimed) and confirm no other consumer of the hit shape would break.

### Assistant | 2026-06-10T19:45:25.360Z

[tool_use: Bash]

### Assistant | 2026-06-10T19:45:26.783Z

[tool_use: Grep]

### User | 2026-06-10T19:45:29.778Z

[tool_result]   ...
# Subtest: denseRankViaQdrant: duplicate node_id points are deduped (first/highest-score wins)
ok 72 - denseRankViaQdrant: duplicate node_id points are deduped (first/highest-score wins)
  ---
  duration_ms: 0.1649
  ...
# Subtest: runMemoryIndexSearch: a throwing dense arm degrades to BM25-only, never propagates (P1)
ok 73 - runMemoryIndexSearch: a throwing dense arm degrades to BM25-only, 
... [+160 chars truncated]

### User | 2026-06-10T19:45:32.193Z

[tool_result] Found 38 files
.claude\hooks\memory-index-precheck-inject.mjs
.claude\hooks\wiki-precheck-inject.mjs
.claude\hooks\tribal-by-domain-inject.mjs
.claude\hooks\tribal-by-domain-inject.test.mjs
.claude\hooks\claudemd-ollama-enforcer.mjs
.claude\hooks\optimal-context-inject.mjs
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\memory-relevance-inject.mjs
.claude\hooks\psn-leg-state-inject.mjs

... [+1281 chars truncated]

### Assistant | 2026-06-10T19:45:38.908Z

73/73 pass. Now let me confirm whether any OTHER hook imports `runMemoryIndexSearch` (the only other potential consumer of the hit shape) and whether any does a strict-shape check.

### Assistant | 2026-06-10T19:45:39.913Z

[tool_use: Grep]

### User | 2026-06-10T19:45:45.204Z

[tool_result] scripts\agents\spawned-agent-context-lib.mjs:33:import { runMemoryIndexSearch } from "../lib/memory-index-search-lib.mjs";
scripts\agents\spawned-agent-context-lib.mjs:82:// recall (runTribalSearch/runMemoryIndexSearch) is separate + already bounded;
scripts\agents\spawned-agent-context-lib.mjs:475:  // memos (the A6 corpus the prompt turn gets). runMemoryIndexSearch is a SEPARATE
scripts\agents\s
... [+4466 chars truncated]

### Assistant | 2026-06-10T19:45:53.596Z

There are two runtime consumers of `runMemoryIndexSearch` besides the hook: `spawned-agent-context-lib.mjs:480` and `galaxy-reflection-synthesis.mjs`. Let me verify they only read `hits[].name/score/etc` and don't do a strict-shape check that the new `explanation` field would break. Let me check the two adjacent build-state commits referenced in the prompt didn't touch the hit shape, and check the envelope for scope honesty.

### Assistant | 2026-06-10T19:45:53.597Z

[tool_use: Read]

### Assistant | 2026-06-10T19:45:53.604Z

[tool_use: Read]

### Assistant | 2026-06-10T19:45:54.555Z

[tool_use: Bash]

### User | 2026-06-10T19:45:57.562Z

[tool_result] 77	export function gatherGalaxyMemories({ galaxy, brainBody, topK = DEFAULT_TOPK, searchImpl = runMemoryIndexSearch }) {
78	  const query = buildGalaxyQuery(galaxy, brainBody);
79	  const res = searchImpl(query, { topK: topK * 2 }) || {};
80	  const RAW = new Set(["reference", "feedback", "project", "mistakes"]);
81	  const out = [];
82	  for (const h of res.hits || []) {
83	    if (!RAW.has(h.nam
... [+946 chars truncated]

### User | 2026-06-10T19:45:57.592Z

[tool_result] 478	  // PRISM_MASTER_INDEX_INJECT=0 (the fleet default). Fail-safe (missing sidecar →
479	  // empty hits → section skipped).
480	  try { memo = runMemoryIndexSearch(taskNote, { topK }); } catch { /* fail-safe */ }
481	  return { mi, tribal, memo };
482	}
483	
484	// -- main bundle builder ---------------------------------------------
485	export async function buildSpawnedAgentAdditionalContext(o
... [+879 chars truncated]

### User | 2026-06-10T19:46:03.239Z

[tool_result] 78f64fda97 [MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-EMBED-KEEPWARM (slot:zulu): keep nomic-embed-text resident so dense recall never goes dark on cold eviction
4c6d8ed40c [MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-CONSUMER (slot:zulu): live memory recall reads Qdrant ANN (prism_memories), int8 scan fallback
31b5946bdc [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXC
... [+1089 chars truncated]

### Assistant | 2026-06-10T19:46:23.162Z

Both other consumers do additive field-picking (`{name, namespace, description, opening}`) and tolerant iteration over `res.hits || []` — neither does a strict shape check / deepEqual. The new `explanation` field is purely additive. Now let me verify the envelope scope-honesty claim (point 3).

### Assistant | 2026-06-10T19:46:23.885Z

[tool_use: Bash]

### User | 2026-06-10T19:51:27.460Z

[tool_result] Command running in background with ID: bwkatx3le. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4b1bbdf2-c878-441d-93bc-88ca59603734\tasks\bwkatx3le.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-10T19:51:34.039Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
