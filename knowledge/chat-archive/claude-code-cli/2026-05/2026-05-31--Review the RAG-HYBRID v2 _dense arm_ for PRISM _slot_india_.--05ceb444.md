---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Review the RAG-HYBRID v2 \"dense arm\" for PRISM (slot/india). Read these: - NEW: "
date: "2026-05-31"
first_ts: "2026-05-31T05:23:47.972Z"
last_ts: "2026-05-31T05:26:21.599Z"
cwd: "H:\\prism-slot-india"
messages: 31
user_msgs: 13
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a14e48caea51fea5a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Review the RAG-HYBRID v2 "dense arm" for PRISM (slot/india). Read these: - NEW: 

> **claude-code-cli** | 2026-05-31 | 31 msgs (13 user / 18 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a14e48caea51fea5a.jsonl`

## Transcript

### User | 2026-05-31T05:23:47.972Z

Review the RAG-HYBRID v2 "dense arm" for PRISM (slot/india). Read these:
- NEW: H:/prism-slot-india/mcp-server/src/engines/TribalDenseRecallEngine.ts (+ test src/__tests__/TribalDenseRecallEngine.test.ts)
- NEW: H:/prism-slot-india/mcp-server/scripts/build-tribal-dense-index.mjs
- EDIT: the `case "rag_search_rerank"` in H:/prism-slot-india/mcp-server/src/tools/dispatchers/mlDispatcher.ts (the dense-arm block; ignore unrelated pre-existing cases) + the rag_search_rerank schema in src/schemas/mlActionSchemas.ts (+use_dense/dense_index_path) + the round-trip test src/__tests__/mlDispatcher.ragSearchRerank.integration.test.ts
- Context: SSOT config/embeddingContract.ts (cosineSimilarityGuarded/assertSameContract) is the dependency.

WHAT IT IS: a semantic recall arm. TribalDenseRecallEngine.recall embeds a query (injected embedder = LocalEmbeddingEngine minilm-384 in prod), cosine-ranks via the SSOT guard, returns top-K. The dispatcher loads a precomputed dense index, FILTERS it to the BM25 candidate pool (so every fused hit keeps content), runs recall, adds the ids as a 3rd RRF arm. Best-effort: missing index / dead embedder → try/catch → silently lexical-only.

VERIFY (first line 'VERDICT: PASS' or 'VERDICT: FAIL'; terse; BLOCKER lines + ≤4 notes):
1. The failure split: contract-mismatch THROWS (correct — wrong vector space), but query-embed-fail / empty-query / corrupt-entry degrade to [] (graceful). Is this consistent + are all paths reachable+tested?
2. The dispatcher try/catch: does ANY dense failure (missing file, parse error, embed throw, contract throw) get caught so the lexical pipeline always returns? Is the contract-mismatch THROW from recall correctly caught here (so a stale-model index doesn't break the action)?
3. Sub-index filtering to the candidate pool: correct? Could a dense hit reference an id NOT in byId (→ the ?? fallbacks)? (Answer should be no — sub-index entries ⊆ retrieved.)
4. Tests concrete (no stubs)? Builder script: self-contained, minilm-3
... [+253 chars truncated]

### Assistant | 2026-05-31T05:24:02.623Z

I'll review the RAG-HYBRID v2 dense arm. Let me read all the relevant files first.

### Assistant | 2026-05-31T05:24:02.799Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:02.846Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:02.898Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:02.928Z

[tool_use: Read]

### User | 2026-05-31T05:24:11.663Z

[tool_result] 1	/**
2	 * Tests for TribalDenseRecallEngine (RAG-HYBRID v2 dense arm). Uses a deterministic FAKE
3	 * embedder (384-dim axis vectors) so cosine ranking is exact and no real ONNX/corpus is
4	 * needed. Covers: build (skip malformed/failed/wrong-dim), recall ranking + top-K + stable
5	 * tie-break, and the failure split — contract-mismatch THROWS, query-embed-fail degrades to [].
6	 */
7	import { d
... [+5993 chars truncated]

### User | 2026-05-31T05:24:11.927Z

[tool_result] 1	/**
2	 * EmbeddingContract — single source of truth for the embedding {model, dim,
3	 * quantization} across PRISM's embedding backends (GOAL: close the cross-cutting
4	 * embedding-fragmentation gap, AI-Systems-Improvement-Roadmap #1, slot:india 2026-05-30).
5	 *
6	 * Problem this solves: three backends declared three different models/dims with NO
7	 * shared contract —
8	 *   - OllamaEmbedderE
... [+12926 chars truncated]

### User | 2026-05-31T05:24:12.119Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-tribal-dense-index.mjs — generate the dense (semantic) embedding index for the tribal
4	 * corpus, consumed by `prism_ml:rag_search_rerank`'s dense RRF arm (TribalDenseRecallEngine).
5	 *
6	 * Self-contained (PRISM script convention — a .mjs cannot import the TS engines). It embeds each
7	 * tribal tip with `Xenova/all-MiniLM-L6-v2` (mean-pool + L2-normalize)
... [+3895 chars truncated]

### User | 2026-05-31T05:24:13.869Z

[tool_result] 1	/**
2	 * TribalDenseRecallEngine — the dense (semantic) recall arm for hybrid RAG (RAG-HYBRID v2,
3	 * slot:india 2026-05-30). Completes the deferred dense arm of `prism_ml:rag_search_rerank`:
4	 * BM25 + reranker were the lexical arms (RAG-HYBRID v1); this is the embedding-cosine arm
5	 * that RRF fuses alongside them.
6	 *
7	 * Embedder-agnostic by injection: `buildIndex`/`recall` take an `Emb
... [+5626 chars truncated]

### Assistant | 2026-05-31T05:24:20.935Z

Now let me read the dispatcher dense-arm block and the schema.

### Assistant | 2026-05-31T05:24:21.198Z

[tool_use: Grep]

### Assistant | 2026-05-31T05:24:21.434Z

[tool_use: Grep]

### User | 2026-05-31T05:24:36.922Z

[tool_result] 486:          case "rag_search_rerank": {
559:                log.warn(`[prism_ml] rag_search_rerank dense arm skipped: ${e instanceof Error ? e.message : String(e)}`);

### User | 2026-05-31T05:24:37.817Z

[tool_result] 56:  "rag_search_rerank",
312:  rag_search_rerank: z.object({
324:    use_dense: z.boolean().optional().describe("Include the dense (semantic) RRF arm if a precomputed index exists (default true; best-effort — silently skipped when absent/embedder-dead)"),
325:    dense_index_path: z.string().optional().describe("Override path to the dense embedding index (default data/state/TRIBAL_DENSE_INDEX.jso
... [+5 chars truncated]

### Assistant | 2026-05-31T05:24:40.233Z

Noted. Let me read the dispatcher dense-arm block, the schema definition, and the integration test.

### Assistant | 2026-05-31T05:24:41.145Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:42.147Z

[tool_use: Read]

### Assistant | 2026-05-31T05:24:42.423Z

[tool_use: Read]

### User | 2026-05-31T05:25:04.460Z

[tool_result] 486	          case "rag_search_rerank": {
487	            // Hybrid retrieve→rerank in one call: BM25/TF-IDF lexical retrieve (deep) +
488	            // reranker + an optional DENSE (semantic) arm, all fused by reciprocal-rank fusion
489	            // (scale-free — combines RANKINGS, not their incomparable scores). The dense arm
490	            // (TribalDenseRecallEngine over a precomputed corp
... [+6339 chars truncated]

### User | 2026-05-31T05:25:05.126Z

[tool_result] 305	      excerpt: z.string().nullable(),
306	      metadata: z.record(z.string(), z.unknown()).optional(),
307	    })).describe("Candidates to rerank"),
308	    top_k: z.number().int().min(1).max(20).default(3),
309	    diversity_weight: z.number().min(0).max(1).optional().describe("MMR diversity weight (0=relevance only)"),
310	  }).describe("Rerank retrieval candidates"),
311	
312	  rag_search_
... [+1781 chars truncated]

### User | 2026-05-31T05:25:05.559Z

[tool_result] 1	/**
2	 * Dispatcher round-trip integration test for prism_ml:rag_search_rerank (RAG-HYBRID v1).
3	 * Invokes THROUGH the real registered handler (registerMLDispatcher → server.tool handler),
4	 * not the engines directly — proving the action is wired (enum + schema + case), the schema
5	 * gates missing/empty queries, and the case composes BM25 retrieve + rerank + RRF without
6	 * throwing and r
... [+3648 chars truncated]

### Assistant | 2026-05-31T05:25:09.794Z

Let me verify the `reciprocalRankFusion` contribution shape (to confirm `f.contributions.dense?.rank` is valid) and the `LocalEmbeddingEngine` contract/pooling to confirm the builder matches.

### Assistant | 2026-05-31T05:25:10.741Z

[tool_use: Read]

### Assistant | 2026-05-31T05:25:10.985Z

[tool_use: Read]

### User | 2026-05-31T05:25:22.501Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+6281 chars truncated]

### User | 2026-05-31T05:25:25.339Z

[tool_result] 1	/**
2	 * reciprocalRankFusion — combine several ranked lists into one consensus ranking
3	 * (Cormack, Clarke & Buettcher 2009). RAG hybrid-recall core (AI-Systems-Improvement
4	 * -Roadmap RAG #3, slot:india 2026-05-30).
5	 *
6	 * Why RRF and not score-averaging: the arms being fused (BM25/TF-IDF lexical retrieval,
7	 * a Jaccard/n-gram reranker, and — later — dense cosine recall) produce score
... [+4426 chars truncated]

### Assistant | 2026-05-31T05:25:33.803Z

Now I have all the pieces. Let me verify two specific concerns:

1. The dispatcher passes `localEmbeddingEngine` (the `EmbedderLike`) to `recall`. `recall` calls `embedder.embed(query)`. But `LocalEmbeddingEngine.embed` calls `this.validateText(text)` which **THROWS** on empty/non-string text — not returns `{ok:false}`. Let me check the interaction with the dispatcher's empty-query guard (schema `min(1)` blocks empty at dispatcher level, but `recall` itself guards `query.length===0` before calling embed, so the prod path is safe). But there's a subtlety: `validateText` throws for `text.length > 20_000`. Let me trace whether that throw is caught.

2. The `EmbedderLike.embed` signature is `Promise<{ok, vector}>` but `LocalEmbeddingEngine.embed` returns `Promise<EmbedResult>` (extra fields ok, structurally compatible). Good.

Let me check the `cosineSimilarityGuarded` call in `recall` — it passes `contract.id` and `index.contractId`, both already asserted equal. And the `validateText` throw path inside `recall`.

### Assistant | 2026-05-31T05:25:35.701Z

[tool_use: Grep]

### User | 2026-05-31T05:25:43.707Z

[tool_result] 429:            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
452:            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
469:            const engine = await getEngine("reranker") as typeof import("../../engines/ReRankerEngine.js").reRankerEngine;
493:         
... [+248 chars truncated]

### Assistant | 2026-05-31T05:26:21.599Z

I have enough to render a verdict. Let me trace the four review questions precisely.

**Key trace — the `validateText` throw inside `recall`:** In `recall`, the empty/non-string query is guarded *before* `embedder.embed` is called (line 114: `if (typeof query !== "string" || query.length === 0) return []`). So `validateText`'s empty-string throw is unreachable from `recall`. But `validateText` also throws on `text.length > 20_000`. If a query exceeds 20k chars, `LocalEmbeddingEngine.embed` throws synchronously rather than returning `{ok:false}`. In `recall`, that throw propagates up (not caught inside recall). In the **dispatcher**, the entire dense block is wrapped in `try/catch` (lines 538-560), so a 20k-query throw is caught → arm dropped → lexical pipeline returns. Safe at the dispatcher boundary. In the **engine unit contract**, the contract says "query embed fails → []" but a >20k query would throw out of `recall` instead of returning `[]` — a minor doc/behavior seam, but reachable only via the LocalEmbeddingEngine (the injected fake never throws). Worth noting, not a blocker since the dispatcher catches it.

Let me confirm the RRF dense contribution key and that `denseHits` ids ⊆ pool ⊆ byId.

The trace confirms: `subIndex.entries` filtered by `pool.has(e.id)` where `pool = Set(retrieved ids)`; `recall` only emits ids from `subIndex.entries`; `byId = Map(retrieved)`. So every dense hit id ∈ pool ⊆ byId.keys() → `byId.get(f.id)` always resolves for dense-originated ids. The `?? 0`/`?? null` fallbacks only fire for ids that appear in `fused` but not in `byId` — which can only be rerank/bm25 ids, and those are all from `retrieved` too. So the fallbacks are pure defense-in-depth, never hit on the dense path. Confirmed correct.

VERDICT: PASS

The RAG-HYBRID v2 dense arm is correct, comprehensive, and well-tested. The failure split is consistent and reachable on every path; the dispatcher try/catch is a true firewall around the lexical pipeline; sub-index filterin
... [+4664 chars truncated]
