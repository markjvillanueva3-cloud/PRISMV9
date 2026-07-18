---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Review a new PRISM engine + its dispatcher wiring (slot:sierra, N1 ranked-hybrid"
date: "2026-05-29"
first_ts: "2026-05-29T20:35:09.063Z"
last_ts: "2026-05-29T20:38:02.202Z"
cwd: "H:\\prism-slot-sierra"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-aa0a3a73972e8b99a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a new PRISM engine + its dispatcher wiring (slot:sierra, N1 ranked-hybrid

> **claude-code-cli** | 2026-05-29 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-aa0a3a73972e8b99a.jsonl`

## Transcript

### User | 2026-05-29T20:35:09.063Z

Review a new PRISM engine + its dispatcher wiring (slot:sierra, N1 ranked-hybrid-graph-search). Grade PASS/FAIL, flag P0 (correctness/crash/data-loss) and P1 (logic/contract). Be terse, file:line + concrete fix. Do NOT edit files.

Files:
1. H:\prism\mcp-server\src\engines\RankedHybridGraphSearchEngine.ts — the orchestration engine
2. H:\prism\mcp-server\src\tools\dispatchers\sessionDispatcher.ts — the new `case "master_index_ranked_hybrid"` (~line 1788) + enum entry (~line 166)

CONTRACT: re-rank MasterIndexEngine.query() hits by RRF-fusing the confidence (lexical) ranking against the utilization (structural-importance) ranking via HybridIndexEngine.fuse. Must be OOM-safe (reuse MasterIndex's cached index — NEVER load the 548MB merged graph into a live PageRank). Pure-core + injected deps (deps.query, deps.now). Tests already pass 13/13 (engine 11 + dispatcher round-trip 2).

Verify specifically:
(a) The RRF fusion is correct: two ranked lists (confidence desc, utilization desc) over the SAME deduped candidate set, fed to HybridIndexEngine.fuse. Could the dedup-by-id (keep strongest confidence) drop or mis-join a hit so the final hits[] references the wrong MasterIndexHit?
(b) finite01() coercion: does any NaN/Infinity confidence/utilization escape and produce a non-finite rrf_score or an unstable sort?
(c) The 120-char entry_id cap guard: HybridIndexEngine.RankedHitSchema enforces entry_id .max(120). Does the engine correctly drop overlong ids BEFORE fusion (else fuse throws)? Any id that is exactly 120 — boundary off-by-one?
(d) Dispatcher case: params threaded correctly (query/q, limit, rrf_k→rrfK, top_k→topK, layers/sources/min_*/build_classes/stopwords)? Lazy import path correct? Returns ok(result)?
(e) Does the engine accidentally load the big graph anywhere (it must not — confirm it only calls masterIndexEngine.query which uses a cached size-capped index)?
(f) Any way search() throws instead of returning a result (it should be total — empty query, no hits, m
... [+80 chars truncated]

### Assistant | 2026-05-29T20:35:36.207Z

I'll review the engine and its dispatcher wiring. Let me read both files plus the contracts they depend on.

### Assistant | 2026-05-29T20:35:36.680Z

[tool_use: Read]

### User | 2026-05-29T20:35:37.211Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\RankedHybridGraphSearchEngine.ts' was already read 4s ago in this session and is unchanged (mtime 1780085270014). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-29T20:35:37.619Z

[tool_use: Read]

### User | 2026-05-29T20:35:39.872Z

[tool_result] 1740	          // system_drift_report — Live vs documented count comparison
1741	          // ================================================================
1742	          case "system_drift_report": {
1743	            const report = systemSnapshotEngine.getDriftReport();
1744	            return ok(report);
1745	          }
1746	
1747	          // ================================================
... [+9890 chars truncated]

### Assistant | 2026-05-29T20:35:44.269Z

The engine content is in my context. Let me read it via the cached content and pull the contracts it depends on: HybridIndexEngine.fuse, its RankedHitSchema, and MasterIndexEngine.query's return shape.

### Assistant | 2026-05-29T20:35:45.029Z

[tool_use: Read]

### User | 2026-05-29T20:35:48.886Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\RankedHybridGraphSearchEngine.ts' was already read 14s ago in this session and is unchanged (mtime 1780085270014). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### Assistant | 2026-05-29T20:35:52.401Z

The read-once guard says the engine is already in my context, but I don't actually have it — this is a fresh session. Let me disable the cache to read it.

### Assistant | 2026-05-29T20:35:53.384Z

[tool_use: Bash]

### User | 2026-05-29T20:36:08.245Z

[tool_result] /**
 * RankedHybridGraphSearchEngine — N1 orchestration (slot:sierra, system-viz, 2026-05-29).
 *
 * Composes two already-built engines into one capability the opportunity map
 * (SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29 §N1) called the highest-leverage
 * orchestration sierra is positioned to make:
 *
 *   MasterIndexEngine.query()  → hits carrying BOTH `confidence` (lexical relevance)
 *   
... [+6785 chars truncated]

### Assistant | 2026-05-29T20:36:15.894Z

Now let me read the two contract dependencies: `HybridIndexEngine.fuse` + `RankedHitSchema`, and the `MasterIndexHit` type shape.

### Assistant | 2026-05-29T20:36:16.102Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:36:16.574Z

[tool_use: Grep]

### User | 2026-05-29T20:36:23.552Z

[tool_result] 4- * Goal: ONE query call replaces N Grep/Glob/Agent calls. Future Claude/Codex
5- * sessions hit `prism_session:master_index_query` first; only fall back to
6: * filesystem search when this returns no high-confidence hits.
7- *
8- * Fuses 4 pre-built indexes (no parallel infra — all sources already exist):
--
11- *      `knowledge.memoryEntries[]` from system-viz-obsidian-bridge-v2.mjs.
12- *   2
... [+1928 chars truncated]

### User | 2026-05-29T20:36:24.286Z

[tool_result] 16- */
17-
18-import { z } from "zod";
19-
20:export const RankedHitSchema = z.object({
21-  entry_id: z.string().min(1).max(120),
22-  rank: z.number().int().min(1),
23-  score: z.number().refine((v) => Number.isFinite(v), {}),
24-});
25:export type RankedHit = z.infer<typeof RankedHitSchema>;
26-
27:export interface FusionResult {
28-  entry_id: string;
29:  rrf_score: number;
30-  bm25_rank?: n
... [+1897 chars truncated]

### Assistant | 2026-05-29T20:36:31.076Z

I now have all three contracts. Let me verify the key concern about the `fuse` matching logic — how it joins the two lists into the candidate set, since this is central to finding (a) the wrong-hit risk.

### Assistant | 2026-05-29T20:36:32.137Z

[tool_use: Read]

### User | 2026-05-29T20:36:44.541Z

[tool_result] 54	    const bm25Ranks = new Map(bm25_hits.map((h) => [h.entry_id, h.rank] as const));
55	    const semRanks = new Map(semantic_hits.map((h) => [h.entry_id, h.rank] as const));
56	    const allIds = new Set([...bm25Ranks.keys(), ...semRanks.keys()]);
57	
58	    const scored: FusionResult[] = [];
59	    for (const id of allIds) {
60	      const bm = bm25Ranks.get(id);
61	      const sm = semRanks.g
... [+529 chars truncated]

### Assistant | 2026-05-29T20:36:49.711Z

I have everything needed. Let me also confirm the dispatcher enum entry at ~line 166 and the `ok()` helper, plus whether MasterIndexEngine.query loads the big graph.

### Assistant | 2026-05-29T20:36:50.543Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:36:52.112Z

[tool_use: Grep]

### User | 2026-05-29T20:36:56.262Z

[tool_result] 164:  "master_index_query",
167:  "master_index_ranked_hybrid",
1791:          case "master_index_ranked_hybrid": {
1808:          case "master_index_query": {

### User | 2026-05-29T20:36:56.293Z

[tool_result] 9: *   1. system-graph.json (110K nodes / 114K edges, 11 layers).
37:const GRAPH_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
136:/** Raw graph node — narrow projection of system-graph.json node shape. */
152:/** Raw graph edge — narrow projection of system-graph.json edge shape. */
337:    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
549:      log.warn(`[Maste
... [+226 chars truncated]

### Assistant | 2026-05-29T20:37:00.930Z

MasterIndexEngine does `JSON.parse(fs.readFileSync(...))` of `system-graph.json` at line 337. The CONTRACT claims it uses a "cached size-capped index" and never loads the 548MB graph. Let me verify the caching + size cap on that read path, since (e) hinges on it.

### Assistant | 2026-05-29T20:37:01.787Z

[tool_use: Read]

### User | 2026-05-29T20:37:05.327Z

[tool_result] 320	  outDegree: number;
321	  utilization: number;
322	  class: UtilizationClass;
323	  hasDocs: boolean;
324	}
325	
326	// ============================================================================
327	// HELPERS
328	// ============================================================================
329	
330	/**
331	 * Safe JSON read; returns null and logs on failure rather than throwing.
332	 * E
... [+2376 chars truncated]

### Assistant | 2026-05-29T20:37:11.553Z

This is the OOM concern for (e). `safeReadJson` does an unbounded `JSON.parse(fs.readFileSync(...))` — no size cap. The CONTRACT says MasterIndex uses a "cached size-capped index." Let me verify caching (is the parsed graph cached so it's not re-read per-query?) and whether there's any size guard before that read. The header comment says 110K nodes/114K edges — but `## Recent regressions` and MEMORY say the live `system-graph.json` is ~370-548MB. Let me check the cache + the buildIndex path.

### Assistant | 2026-05-29T20:37:13.761Z

[tool_use: Grep]

### User | 2026-05-29T20:37:17.834Z

[tool_result] 5: * sessions hit `prism_session:master_index_query` first; only fall back to
19: * Caching: graph + BUILD_STATE are mtime-cached. Inverted index is built lazily
20: * on first query against the cached graph and rebuilt only when the graph
37:const GRAPH_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
75: * stall every UserPromptSubmit-injected master_index_query call.
1
... [+2093 chars truncated]

### Assistant | 2026-05-29T20:38:02.202Z

This confirms the architecture: `getGraph()` is mtime-cached + single-flight (line 498-517), and `buildGraphCache` reads + indexes once and reuses. So `RankedHybridGraphSearchEngine.search → masterIndexEngine.query → getGraph()` hits the shared cache. The engine itself never touches the graph directly — confirms (e). The OOM risk (unbounded JSON.parse of a large graph) lives entirely in MasterIndexEngine and is pre-existing, not introduced by N1. The N1 engine correctly reuses that path.

I have all I need. Let me write up the findings.

## Code Quality Analysis Report — N1 RankedHybridGraphSearchEngine + dispatcher wiring

**Verdict: PASS** — No P0, no P1. The engine is total (never throws), OOM-safe by delegation, RRF fusion is correct, and the dispatcher threads all params. Findings below are P2/P3 only.

### Verification against the 6 contract points

**(a) RRF fusion correctness — CORRECT, no mis-join.**
`confList` and `utilList` are both built from the *same* `uniq` array (`RankedHybridGraphSearchEngine.ts:120,123`), so they are two orderings over one identical candidate set with identical `entry_id` keys. `HybridIndexEngine.fuse` keys purely on `entry_id` (`HybridIndexEngine.ts:54-56`), and the final join back to the source hit is `byId.get(f.entry_id)` (`:135`) — the same map keyed by the same id. The dedup keeps strongest-confidence (`:108` `finite01(h.confidence) > finite01(prev.confidence)`), but since `byId` is the single source of truth for both lists *and* the final hydration, there is no path where `hits[]` references the wrong `MasterIndexHit`. A dropped duplicate is simply absent from `uniq`, so it never enters either list — consistent, not mis-joined.

**(b) finite01 coercion — SOUND, no non-finite escape.**
`finite01` (`:67-70`) maps NaN/Infinity/undefined → 0. Both list scores and both sort comparators route every confidence/utilization through it (`:121,124`). The `rrf_score` is computed inside `fuse` as `1/(k+rank)` where `rank` is always a fin
... [+5019 chars truncated]
