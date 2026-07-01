---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Independent review of the RAG-HYBRID v2 dense arm for PRISM (slot/india). Don't "
date: "2026-05-31"
first_ts: "2026-05-31T05:23:59.728Z"
last_ts: "2026-05-31T05:26:55.847Z"
cwd: "H:\\prism-slot-india"
messages: 37
user_msgs: 15
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-abee11bdced311081.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Independent review of the RAG-HYBRID v2 dense arm for PRISM (slot/india). Don't 

> **claude-code-cli** | 2026-05-31 | 37 msgs (15 user / 22 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-abee11bdced311081.jsonl`

## Transcript

### User | 2026-05-31T05:23:59.728Z

Independent review of the RAG-HYBRID v2 dense arm for PRISM (slot/india). Don't assume another reviewer caught anything. Read:
- H:/prism-slot-india/mcp-server/src/engines/TribalDenseRecallEngine.ts + its test
- H:/prism-slot-india/mcp-server/scripts/build-tribal-dense-index.mjs
- the `case "rag_search_rerank"` dense-arm block in H:/prism-slot-india/mcp-server/src/tools/dispatchers/mlDispatcher.ts + the schema addition in src/schemas/mlActionSchemas.ts + round-trip test src/__tests__/mlDispatcher.ragSearchRerank.integration.test.ts

Weight (first line 'VERDICT: PASS'|'VERDICT: FAIL'; terse; BLOCKER + ≤4 notes):
1. WIRING/ORPHAN: TribalDenseRecallEngine is consumed by the mlDispatcher case (lazy import) → not an orphan. Confirm the import path + that it's reachable. use_dense/dense_index_path in the schema match the case's param reads.
2. CONTRACT INTEGRITY: the builder (build-tribal-dense-index.mjs) must produce vectors in the SAME space LocalEmbeddingEngine produces at query time — both Xenova/all-MiniLM-L6-v2, mean-pool, normalize → minilm-384. If they ever diverge, the recall contract guard THROWS (caught → dense silently off). Is the KEEP-IN-SYNC risk documented? Is the builder honestly main-only (can't run in this corpus-less worktree)?
3. SCOPE/HONESTY: is the v2 honest that dense RERANKS the BM25 pool (doesn't surface NEW candidates — that needs content in the index, a v3)? No overclaiming. Purely additive to the action (existing bm25+rerank behavior unchanged when use_dense off / no index)?
4. TEST INTEGRITY: TribalDenseRecallEngine tests assert exact cosine ranking + the failure split with real values (fake embedder, axis vectors), not stubs. The dispatcher round-trip asserts dense=0 graceful-skip (no index in worktree). Real coverage?
5. Any merge risk to main (besides the known lint-staged reformat of mlDispatcher.ts)?

If unsure, FAIL.

### Assistant | 2026-05-31T05:24:19.406Z

I'll review the RAG-HYBRID v2 dense arm. Let me read all the relevant files first.

### Assistant | 2026-05-31T05:24:20.344Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:20.568Z

[tool_use: Read]

### User | 2026-05-31T05:24:39.593Z

[tool_result] 1	/**
2	 * TribalDenseRecallEngine — the dense (semantic) recall arm for hybrid RAG (RAG-HYBRID v2,
3	 * slot:india 2026-05-30). Completes the deferred dense arm of `prism_ml:rag_search_rerank`:
4	 * BM25 + reranker were the lexical arms (RAG-HYBRID v1); this is the embedding-cosine arm
5	 * that RRF fuses alongside them.
6	 *
7	 * Embedder-agnostic by injection: `buildIndex`/`recall` take an `Emb
... [+5626 chars truncated]

### User | 2026-05-31T05:24:40.492Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-tribal-dense-index.mjs — generate the dense (semantic) embedding index for the tribal
4	 * corpus, consumed by `prism_ml:rag_search_rerank`'s dense RRF arm (TribalDenseRecallEngine).
5	 *
6	 * Self-contained (PRISM script convention — a .mjs cannot import the TS engines). It embeds each
7	 * tribal tip with `Xenova/all-MiniLM-L6-v2` (mean-pool + L2-normalize)
... [+3895 chars truncated]

### Assistant | 2026-05-31T05:24:44.123Z

Let me read the embedding contract config, the LocalEmbeddingEngine, the engine test, and the dispatcher/schema/integration test files.

### Assistant | 2026-05-31T05:24:44.590Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:45.706Z

[tool_use: Glob]

### Assistant | 2026-05-31T05:24:45.713Z

[tool_use: Glob]

### User | 2026-05-31T05:25:06.811Z

[tool_result] mcp-server\src\__tests__\TribalDenseRecallEngine.test.ts

### User | 2026-05-31T05:25:06.828Z

[tool_result] mcp-server\src\engines\LocalEmbeddingEngine.ts

### User | 2026-05-31T05:25:07.853Z

[tool_result] 1	/**
2	 * EmbeddingContract — single source of truth for the embedding {model, dim,
3	 * quantization} across PRISM's embedding backends (GOAL: close the cross-cutting
4	 * embedding-fragmentation gap, AI-Systems-Improvement-Roadmap #1, slot:india 2026-05-30).
5	 *
6	 * Problem this solves: three backends declared three different models/dims with NO
7	 * shared contract —
8	 *   - OllamaEmbedderE
... [+12926 chars truncated]

### Assistant | 2026-05-31T05:25:10.824Z

Now let me read the engine test, the LocalEmbeddingEngine (to verify the embedding contract match), and the dispatcher/schema/integration test files.

### Assistant | 2026-05-31T05:25:11.782Z

[tool_use: Read]

### Assistant | 2026-05-31T05:25:12.253Z

[tool_use: Read]

### Assistant | 2026-05-31T05:25:12.880Z

[tool_use: Read]

### User | 2026-05-31T05:25:13.259Z

[tool_result] read-once-guard: 'H:\prism-slot-india\mcp-server\src\__tests__\TribalDenseRecallEngine.test.ts' was already read 66s ago in this session and is unchanged (mtime 1780203378141). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### User | 2026-05-31T05:25:16.005Z

[tool_result] read-once-guard: 'H:\prism-slot-india\mcp-server\src\engines\LocalEmbeddingEngine.ts' was already read 2s ago in this session and is unchanged (mtime 1780192889200). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### User | 2026-05-31T05:25:29.524Z

[tool_result] 1	/**
2	 * Dispatcher round-trip integration test for prism_ml:rag_search_rerank (RAG-HYBRID v1).
3	 * Invokes THROUGH the real registered handler (registerMLDispatcher → server.tool handler),
4	 * not the engines directly — proving the action is wired (enum + schema + case), the schema
5	 * gates missing/empty queries, and the case composes BM25 retrieve + rerank + RRF without
6	 * throwing and r
... [+3648 chars truncated]

### Assistant | 2026-05-31T05:25:34.228Z

The engine test and LocalEmbeddingEngine were already read into context. Let me retrieve the engine test content (it was read 66s ago, so it's in context) and read the LocalEmbeddingEngine and the dispatcher case. The guard says they're in context but I haven't actually seen the engine test or LocalEmbeddingEngine output yet — let me read them with the cache disabled, plus the dispatcher and schema.

### Assistant | 2026-05-31T05:25:35.040Z

[tool_use: Read]

### User | 2026-05-31T05:25:43.505Z

[tool_result] 1	/**
2	 * Tests for TribalDenseRecallEngine (RAG-HYBRID v2 dense arm). Uses a deterministic FAKE
3	 * embedder (384-dim axis vectors) so cosine ranking is exact and no real ONNX/corpus is
4	 * needed. Covers: build (skip malformed/failed/wrong-dim), recall ranking + top-K + stable
5	 * tie-break, and the failure split — contract-mismatch THROWS, query-embed-fail degrades to [].
6	 */
7	import { d
... [+5993 chars truncated]

### Assistant | 2026-05-31T05:25:45.771Z

Now let me read the LocalEmbeddingEngine and the dispatcher case + schema.

### Assistant | 2026-05-31T05:25:46.737Z

[tool_use: Read]

### Assistant | 2026-05-31T05:25:47.865Z

[tool_use: Grep]

### User | 2026-05-31T05:25:51.419Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+6281 chars truncated]

### User | 2026-05-31T05:25:51.656Z

[tool_result] 486:          case "rag_search_rerank": {
559:                log.warn(`[prism_ml] rag_search_rerank dense arm skipped: ${e instanceof Error ? e.message : String(e)}`);

### Assistant | 2026-05-31T05:25:55.283Z

Now let me read the dispatcher case block and the schema addition.

### Assistant | 2026-05-31T05:25:56.968Z

[tool_use: Read]

### Assistant | 2026-05-31T05:25:57.886Z

[tool_use: Grep]

### User | 2026-05-31T05:26:00.870Z

[tool_result] 480	                  top_k: (params.top_k as number) ?? 3,
481	                });
482	            result = { success: true, ...rerankResult };
483	            break;
484	          }
485	
486	          case "rag_search_rerank": {
487	            // Hybrid retrieve→rerank in one call: BM25/TF-IDF lexical retrieve (deep) +
488	            // reranker + an optional DENSE (semantic) arm, all fused by
... [+7444 chars truncated]

### User | 2026-05-31T05:26:05.088Z

[tool_result] 53-  "rag_tribal_build",
54-  "rag_tribal_search",
55-  "rag_rerank",
56:  "rag_search_rerank",
57-  "provenance_create",
58-  "provenance_validate",
59-  // U-LEARN-05 LoRA composition actions
--
309-    diversity_weight: z.number().min(0).max(1).optional().describe("MMR diversity weight (0=relevance only)"),
310-  }).describe("Rerank retrieval candidates"),
311-
312:  rag_search_rerank: z.object
... [+1007 chars truncated]

### Assistant | 2026-05-31T05:26:09.011Z

I now have everything I need. Let me verify one detail: that the engine's `recall` ordering vs. the dispatcher's RRF usage is consistent, and confirm there are no compile concerns with the dispatcher's typed cast of `denseIndex`. Let me also confirm the `reciprocalRankFusion` signature to ensure the `arms` shape matches.

### Assistant | 2026-05-31T05:26:10.316Z

[tool_use: Grep]

### User | 2026-05-31T05:26:24.086Z

[tool_result] 63:export function reciprocalRankFusion(rankings: readonly NamedRanking[], options: RRFOptions = {}): RRFResult[] {
64-  const k = options.k ?? DEFAULT_K;
65-  if (!Number.isFinite(k) || k <= 0) {
66-    throw new Error(`reciprocalRankFusion: k must be a finite number > 0 (got ${k})`);
67-  }
68-  if (!Array.isArray(rankings) || rankings.length === 0) return [];
69-
70-  const acc = new Map<string
... [+925 chars truncated]

### Assistant | 2026-05-31T05:26:55.847Z

I have full coverage of all five review axes. Let me synthesize the verdict.

VERDICT: PASS

Independent review of the RAG-HYBRID v2 dense arm (slot/india). I read all six files end-to-end plus `reciprocalRankFusion`, `embeddingContract.ts`, and `LocalEmbeddingEngine.ts`. No BLOCKER.

BLOCKER: none.

1. WIRING/ORPHAN — clean. `TribalDenseRecallEngine` is reached via lazy import at `mlDispatcher.ts:544` (`await import("../../engines/TribalDenseRecallEngine.js")`), so it is NOT an orphan. The import path resolves (sibling of `LocalEmbeddingEngine.js`, imported the same way at :545). Schema↔case param contract matches exactly: schema declares `use_dense: z.boolean().optional()` (:324) and `dense_index_path: z.string().optional()` (:325); the case reads `params.use_dense !== false` (:537, correct "default-true when undefined" semantics — `optional()` with no `.default()`, so `undefined` ⇒ enabled, which the `!== false` guard handles) and `params.dense_index_path as string ?? path.join(...)` (:541-542). `rag_search_rerank` is in the `ML_ACTIONS` enum (:56). The `arms` shape `{source, ids}` matches `NamedRanking` consumed by `reciprocalRankFusion` (:63).

2. CONTRACT INTEGRITY — sound and honestly documented. Builder embeds with `Xenova/all-MiniLM-L6-v2`, `{pooling:"mean", normalize:true}` (script :24,:65), DIM=384, CONTRACT_ID="minilm-384" (:26) — byte-identical to `LocalEmbeddingEngine.embed` (`{pooling:"mean", normalize:true}`, line 122) whose `CONTRACT = getContract("minilm-384")` (line 42). Both resolve to the same registry row (`embeddingContract.ts:61`). The KEEP-IN-SYNC risk is explicitly called out in the builder header (:8-11) and the comment correctly states the failure mode: a model/pooling drift makes the recall-time `assertSameContract` THROW, caught by the dispatcher try/catch (:557-560) ⇒ dense arm silently off, lexical pipeline intact. One residual gap (NOTE, not blocking): the sync is documented but not test-enforced — there's no assertion that the build
... [+3454 chars truncated]
