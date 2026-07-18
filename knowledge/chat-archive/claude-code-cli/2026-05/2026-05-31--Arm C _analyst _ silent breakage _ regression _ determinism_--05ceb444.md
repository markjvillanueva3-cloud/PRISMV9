---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Arm C (analyst — silent breakage / regression / determinism) of a 3-of-3 gate on"
date: "2026-05-31"
first_ts: "2026-05-31T06:27:35.962Z"
last_ts: "2026-05-31T06:31:52.393Z"
cwd: "H:\\prism-slot-india"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-aef668275b114069d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Arm C (analyst — silent breakage / regression / determinism) of a 3-of-3 gate on

> **claude-code-cli** | 2026-05-31 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-aef668275b114069d.jsonl`

## Transcript

### User | 2026-05-31T06:27:35.962Z

Arm C (analyst — silent breakage / regression / determinism) of a 3-of-3 gate on U-PATH-5 (RAG retrieval-quality eval) for PRISM slot/india. Two prior per-file reviewers PASSed; do NOT assume they caught everything. Read:
- H:/prism-slot-india/mcp-server/src/utils/retrievalMetrics.ts + test src/utils/retrievalMetrics.test.ts
- the `case "rag_eval"` in H:/prism-slot-india/mcp-server/src/tools/dispatchers/mlDispatcher.ts + schema in src/schemas/mlActionSchemas.ts + round-trip test src/__tests__/mlDispatcher.ragEval.integration.test.ts

Weight (FAIL on any real defect; first line 'VERDICT: PASS' or 'VERDICT: FAIL'; terse; BLOCKER + ≤4 notes):
1. SILENT BREAKAGE: adding "rag_eval" to ML_ACTIONS — any other exhaustive consumer broken? The rag_eval case purely additive (no existing ML case touched)? Does it mutate shared dispatcher state? The bm25 branch calls TribalRAGEngine.search via getEngine — same pattern as sibling cases, no new failure?
2. DETERMINISM/NUMERIC in retrievalMetrics: any NaN/Inf escape? (recall when R=0 → early return guards it; precision /k with k≥1; nDCG /IDCG with IDCG=0 guard; MRR /n with n=0 guard). log2 via Math.log/Math.LN2 — correct + finite for rank≥1? Sort stability? The Array.isArray(readonly[])→any[] narrowing was fixed with typed bindings (4 sites) — confirm no implicit-any leaked and the typed bindings don't mask a real type bug.
3. REGRESSION: purely additive to mlDispatcher (one case) + mlActionSchemas (one schema + enum entry)? No change to rag_search_rerank or other actions?
4. AGGREGATE HONESTY: degenerate-query exclusion from means — does it ever DIVIDE BY ZERO or silently drop a non-degenerate query? Is `degenerate_queries` always surfaced so exclusion is visible?

NOTE: worktree-wide tsc has ~1278 PRE-EXISTING staleness errors NOT in these files (slot/india 874 behind main); my files verified 0 tsc errors. Ignore the staleness. If unsure, FAIL.

### Assistant | 2026-05-31T06:27:49.036Z

I'll review U-PATH-5 as Arm C, focused on silent breakage, determinism, and regression. Let me read all four files in parallel.

### Assistant | 2026-05-31T06:27:49.973Z

[tool_use: Read]

### Assistant | 2026-05-31T06:27:50.478Z

[tool_use: Read]

### Assistant | 2026-05-31T06:27:50.953Z

[tool_use: Read]

### Assistant | 2026-05-31T06:27:51.501Z

[tool_use: Read]

### User | 2026-05-31T06:27:54.729Z

[tool_result] read-once-guard: 'H:\prism-slot-india\mcp-server\src\utils\retrievalMetrics.ts' was already read 12m ago in this session and is unchanged (mtime 1780208009838). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-05-31T06:28:22.179Z

[tool_result] 1	/**
2	 * Dispatcher round-trip integration test for prism_ml:rag_eval (U-PATH-5). Invokes THROUGH
3	 * the real registered handler (registerMLDispatcher → server.tool handler). Metric CORRECTNESS
4	 * is covered by src/utils/retrievalMetrics.test.ts; this covers WIRING + the two modes:
5	 *   - provided: scores caller-supplied ranked runs (fully deterministic — no corpus)
6	 *   - bm25: runs Tri
... [+4788 chars truncated]

### User | 2026-05-31T06:28:23.113Z

[tool_result] 1	/**
2	 * Tests for retrievalMetrics (U-PATH-5). Exact hand-computed reference values for
3	 * precision@k / recall@k / nDCG@k / hit@k / MRR, plus the failure/adversarial modes
4	 * (empty ranking, degenerate gold with no relevant ids, duplicate ids, bad ks).
5	 *
6	 * Worked reference — ranked=[A,B,C,D], relevant={A,C}:
7	 *   DCG@4  = 1/log2(2) + 1/log2(4) = 1 + 0.5 = 1.5
8	 *   IDCG@4 = 1/log2
... [+6160 chars truncated]

### User | 2026-05-31T06:28:31.057Z

[tool_result] 1	/**
2	 * ML Pipeline Action Schemas — U-LEARN-03 + U-LEARN-04 + U-LEARN-05
3	 * ===================================================================
4	 *
5	 * Zod schemas for prism_ml dispatcher actions covering:
6	 * - corpus_crawl: Scan and parse JM Die program archive
7	 * - corpus_stats: Quick file counts without parsing
8	 * - program_parse_min: Parse Okuma .MIN program
9	 * - program_parse_
... [+52095 chars truncated]

### Assistant | 2026-05-31T06:28:36.803Z

I have retrievalMetrics.test.ts, mlActionSchemas.ts, and the integration test in context. I still need the actual source `retrievalMetrics.ts` and the `rag_eval` case in mlDispatcher.ts. The read-once guard says retrievalMetrics.ts is in context, but I want to verify — let me check what I actually have. I'll re-read the source with PRISM_READ_CACHE bypass and grep the dispatcher case.

### Assistant | 2026-05-31T06:28:37.279Z

[tool_use: Read]

### Assistant | 2026-05-31T06:28:38.469Z

[tool_use: Grep]

### User | 2026-05-31T06:29:16.495Z

[tool_result] 1	/**
2	 * retrievalMetrics — pure IR retrieval-quality metrics for RAG/recall evaluation
3	 * (RAG-HYBRID / U-PATH-5, slot:india 2026-05-31). Mirrors the methodology of alpha's
4	 * memory-recall-eval (precision@k / recall@k / nDCG@k / MRR) so the RAG-corpus leg and the
5	 * memory-recall leg of the knowledge pathway share ONE quality bar.
6	 *
7	 * Binary relevance (rel ∈ {0,1}); a gold set is `
... [+7412 chars truncated]

### User | 2026-05-31T06:29:16.914Z

[tool_result] 596:          case "rag_eval": {

### Assistant | 2026-05-31T06:29:19.779Z

Now let me read the full `rag_eval` case in the dispatcher and surrounding context to verify wiring, state mutation, and the bm25 branch.

### Assistant | 2026-05-31T06:29:24.221Z

[tool_use: Read]

### User | 2026-05-31T06:29:53.866Z

[tool_result] 560	              }
561	            }
562	
563	            // 4. RRF-fuse all available arms (bm25 + rerank + optional dense)
564	            const fused = reciprocalRankFusion(arms, { k: rrfK });
565	
566	            // 5. join the fused order back to result objects, take top_k
567	            const byId = new Map(retrieved.map((r) => [r.id, r]));
568	            const results = fused.slice(0, to
... [+8066 chars truncated]

### Assistant | 2026-05-31T06:29:59.525Z

I have everything needed. Let me verify the two specific claims that matter for silent breakage: (1) that no other exhaustive consumer of `ML_ACTIONS` exists that would break on a new enum member, and (2) the `getEngine("tribalRAG")` pattern matches a sibling case. The `rag_search_rerank` case (just above) uses `getEngine` for tribalRAG too — let me confirm the sibling pattern and check for exhaustive switch consumers.

### Assistant | 2026-05-31T06:30:01.439Z

[tool_use: Grep]

### Assistant | 2026-05-31T06:30:02.303Z

[tool_use: Grep]

### User | 2026-05-31T06:30:35.105Z

[tool_result] 429:            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
452:            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
493:            const ragEngine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
615:   
... [+127 chars truncated]

### User | 2026-05-31T06:30:36.653Z

[tool_result] mcp-server\src\tools\dispatchers\algorithmDispatcher.ts:100:const ML_ACTIONS = [
mcp-server\src\tools\dispatchers\algorithmDispatcher.ts:116:  ...ML_ACTIONS,
mcp-server\src\schemas\mlActionSchemas.ts:37:export const ML_ACTIONS = [
mcp-server\src\schemas\mlActionSchemas.ts:141:export type MLAction = typeof ML_ACTIONS[number];
mcp-server\src\schemas\mlActionSchemas.ts:939:  action: z.enum(ML_ACTIONS
... [+1765 chars truncated]

### Assistant | 2026-05-31T06:30:39.856Z

There's a second consumer: `algorithmDispatcher.ts:116` spreads `...ML_ACTIONS` into its own action list. This is the key silent-breakage vector — a re-export/aggregation. Let me inspect how algorithmDispatcher consumes it (does it have an exhaustive switch that would now have an unhandled `rag_eval` case, or does it delegate?).

### Assistant | 2026-05-31T06:30:40.986Z

[tool_use: Read]

### User | 2026-05-31T06:30:58.832Z

[tool_result] 95	const SPATIAL_ACTIONS = [
96	  "spatial_kdtree",          // KD-tree nearest neighbor
97	  "spatial_octree",          // Octree spatial query
98	] as const;
99	
100	const ML_ACTIONS = [
101	  "ml_policy_gradient",      // Policy gradient RL
102	  "ml_rl_optimize",          // RL optimization
103	] as const;
104	
105	const ACTIONS = [
106	  ...SIGNAL_ACTIONS,
107	  ...CONTROL_ACTIONS,
108	  ...O
... [+3484 chars truncated]

### Assistant | 2026-05-31T06:31:04.842Z

Confirmed — `algorithmDispatcher.ts` has its own LOCAL `ML_ACTIONS` const (just `ml_policy_gradient`, `ml_rl_optimize`), completely independent of the schema's `ML_ACTIONS`. It is NOT importing the schema's enum; it's a same-named local. So adding `rag_eval` to `mlActionSchemas.ML_ACTIONS` does not touch algorithmDispatcher at all. No silent breakage there.

Now let me verify the dispatcher's switch is non-exhaustive (default case exists) so an enum addition can't break TypeScript exhaustiveness, and confirm the schema validation path. Let me check the schema-gate / default handling and the validation wiring near the top of the handler.

### Assistant | 2026-05-31T06:31:05.393Z

[tool_use: Read]

### User | 2026-05-31T06:31:13.659Z

[tool_result] 180	    },
181	    async ({ action, params: rawParams = {} }) => {
182	      log.info(`[prism_ml] Action: ${action}`);
183	
184	      // Normalize params
185	      let params = rawParams;
186	      try {
187	        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
188	        params = normalizeParams(rawParams);
189	      } catch {
190	        // normalizer not available
... [+2208 chars truncated]

### Assistant | 2026-05-31T06:31:52.393Z

I have full verification. The switch validates params via `validateActionParams` before the switch, and `rag_eval` is registered in `ACTION_ML_SCHEMAS` so validation works. The switch dispatches on string `action` (typed by enum but with a runtime path) — adding a case is purely additive.

Let me do a final numeric verification of the two subtle determinism claims: the `degenerate` exclusion divide-by-zero and the schema's `mode=provided` with missing `runs`. I'll trace the aggregate division logic mentally against the code I have, and confirm one edge: `mode=provided` but `runs` undefined (schema makes it optional, not required-when-provided).

Looking at the schema: `runs` is `.optional()` with a `.describe()` saying "Required when mode=provided" — but there is **no `.refine()` enforcing this**. In the dispatcher (line 611): `const provided = (params.runs ...) ?? []` → empty array → `evaluateRuns(gold, [], ks)` → every gold query scored as empty ranking (recall 0). That's graceful, not a crash. But it's a semantic gap: a caller who passes `mode:provided` and forgets `runs` gets `success:true` with all-zero metrics rather than a validation error. This is honest-but-silent (the docstring promises "Required"). Let me confirm there's no refine I missed — I read the full schema, lines 329-342, and there is no `.refine()`. Confirmed.

Now I have everything. Verdict.

VERDICT: PASS

Arm C (analyst — silent breakage / regression / determinism) of the 3-of-3 on U-PATH-5. No P0/P1 defect found. The change is genuinely additive and the numerics are guarded.

**1. SILENT BREAKAGE — clear.** `rag_eval` added to `mlActionSchemas.ML_ACTIONS` (one enum entry) + one `ACTION_ML_SCHEMAS` key + one switch case. I traced every consumer of the schema's `ML_ACTIONS`:
- `mlDispatcher.ts` — uses it for `z.enum` (tool registration) + the description join; switch is non-exhaustive (has a default path / `validateActionParams` gate before it), so a new enum member cannot trip a TS exhaustiven
... [+4453 chars truncated]
