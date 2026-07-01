---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "You are scouting the CURRENT state of PRISM's RAG and CAG systems. Work in H:/pr"
date: "2026-06-13"
first_ts: "2026-06-13T05:56:56.230Z"
last_ts: "2026-06-13T06:06:44.222Z"
cwd: "H:\\prism-slot-india"
messages: 95
user_msgs: 43
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-afadc8bffb97b4298.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# You are scouting the CURRENT state of PRISM's RAG and CAG systems. Work in H:/pr

> **claude-code-cli** | 2026-06-13 | 95 msgs (43 user / 52 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-afadc8bffb97b4298.jsonl`

## Transcript

### User | 2026-06-13T05:56:56.230Z

You are scouting the CURRENT state of PRISM's RAG and CAG systems. Work in H:/prism (the git repo at H:\prism). Be concrete and CITE file:line / script paths / live counts for every claim.

Answer exactly these questions exhaustively. Use Glob, Grep, Read, and rtk-prefixed bash for counts. Run multiple searches in parallel where possible.

**RAG (retrieval-augmented generation):**
1. What is the RAG-HYBRID pipeline? Where is it implemented (engine/script)? What are its arms (dense embeddings + BM25)? Cite.
2. What vector store(s) back it — Qdrant collections? ONNX 384-d + HNSW? List the collections and their CURRENT document counts if discoverable (check mcp-server/data, state/shared, any manifest).
3. How does a NEW document get ADDED to the RAG corpus / embedded? What script or dispatcher action ingests + embeds a document? (e.g. embeddings_search build, embed-* scripts). Cite the exact entry point.
4. What is the current corpus size / embedding count? Find real numbers.

**CAG (cache-augmented generation):**
5. Where is the CAG router? (scripts/lib/cag-router.mjs was referenced). What is COLD_SOURCES — the list of cold-tier anchored sources? Read it and list them.
6. How does knowledge ENTER the CAG cold/hot tiers? Is it a static source list or can new learned artifacts be added as cold-anchor candidates? Cite the mechanism.
7. Any CAG state/sidecar files, hit-rate metrics, or dashboards? Find them.

**Feeders (critical):**
8. Find the scripts that feed learned/vault knowledge INTO RAG and CAG (e.g. anything like vault-to-*, embed-knowledge-store, wiki->tribal embed). For each: what does it read, what does it write, is it wired/scheduled? Cite.

Return raw cited findings only — no padding. The parent agent needs concrete file paths, line numbers, and real counts.

### Assistant | 2026-06-13T05:57:06.566Z

I'll run parallel searches across all these areas simultaneously.

### Assistant | 2026-06-13T05:57:07.061Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:07.556Z

[tool_use: Glob]

### User | 2026-06-13T05:57:08.260Z

[tool_result] No files found

### Assistant | 2026-06-13T05:57:08.532Z

[tool_use: Grep]

### Assistant | 2026-06-13T05:57:08.897Z

[tool_use: Glob]

### User | 2026-06-13T05:57:15.483Z

[tool_result] Found 1 file
H:\prism\mcp-server\src\engines\ai-training\MEMORY.md

### User | 2026-06-13T05:57:17.030Z

[tool_result] No files found

### User | 2026-06-13T05:57:18.778Z

[tool_result] H:\prism\knowledge\wiki\architecture\cag-router.md
H:\prism\knowledge\wiki\code-tribal\learnings\psn-synergize-u-cag-router-pure-fn.md
H:\prism\scripts\generate-cag-router-features.mjs
H:\prism\scripts\generate-cag-router-features.test.mjs
H:\prism\scripts\lib\cag-router.mjs
H:\prism\state\shared\system-viz\cag-router-augmentation.json
H:\prism\.claude\hooks\cag-router-inject.test.mjs
H:\prism\.cl
... [+318 chars truncated]

### Assistant | 2026-06-13T05:57:21.263Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:21.663Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:22.136Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:22.647Z

[tool_use: Glob]

### User | 2026-06-13T05:57:29.780Z

[tool_result] H:\prism\mcp-server\src\engines\DiaphragmPumpEngine.ts
H:\prism\mcp-server\src\engines\FileStorageEngine.ts
H:\prism\mcp-server\src\engines\TestCoverageIndexEngine.ts
H:\prism\mcp-server\src\engines\HookCoverageMaximizerEngine.ts
H:\prism\mcp-server\src\engines\WEDMOverageApprovalEngine.ts
H:\prism\mcp-server\src\engines\CADArtifactStorageEngine.ts
H:\prism\mcp-server\src\engines\PrintToProgramCov
... [+269 chars truncated]

### User | 2026-06-13T05:57:29.786Z

[tool_result] H:\prism\scripts\_completed_utilities\coverage_audit.js
H:\prism\scripts\mcat-exact-coverage-generators.mjs
H:\prism\scripts\build-lathe-knowledge-coverage.mjs
H:\prism\scripts\merge-file-coverage.mjs
H:\prism\scripts\merge-file-coverage-v2.mjs
H:\prism\scripts\audit-wiki-coverage.mjs
H:\prism\scripts\rgs-plan-coverage.mjs
H:\prism\scripts\rgs-plan-coverage.test.mjs
H:\prism\scripts\dev-tool-lever
... [+2492 chars truncated]

### User | 2026-06-13T05:57:29.843Z

[tool_result] H:\prism\mcp-server\src\__tests__\qdrant-vector-store-engine.test.ts
H:\prism\mcp-server\src\__tests__\qdrant-capacity-planner-engine.test.ts
H:\prism\mcp-server\src\__tests__\memoryDispatcher.qdrant-surface-wire.test.ts
H:\prism\mcp-server\src\__tests__\qdrantMemoryVectorBridge.test.ts

### User | 2026-06-13T05:57:30.135Z

[tool_result] H:\prism\scripts\embed-all-skills.mjs
H:\prism\scripts\embed-all-engines.mjs
H:\prism\scripts\embed-all-actions.mjs
H:\prism\scripts\setup-embedding-model.mjs
H:\prism\scripts\tribal-graph-course-embed.mjs
H:\prism\scripts\lib\node2vec-embedder.mjs
H:\prism\scripts\lib\node2vec-embedder.test.mjs
H:\prism\scripts\generate-gnn-embed-bridge-features.mjs
H:\prism\scripts\generate-gnn-embed-bridge-feat
... [+1745 chars truncated]

### Assistant | 2026-06-13T05:57:32.453Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:33.415Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:57:34.295Z

[tool_use: Read]

### User | 2026-06-13T05:57:42.972Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+24660 chars truncated]

### User | 2026-06-13T05:57:43.171Z

[tool_result] H:\prism\mcp-server\src\engines\QdrantCapacityPlannerEngine.ts
H:\prism\mcp-server\src\engines\QdrantVectorStoreEngine.ts
H:\prism\mcp-server\src\engines\QdrantMemoryEngineSingleton.ts
H:\prism\mcp-server\src\engines\QdrantSurfaceEngine.ts
H:\prism\mcp-server\src\engines\QdrantMemoryVectorBridgeEngine.ts
H:\prism\mcp-server\src\engines\QdrantMemoryEngine.ts

### User | 2026-06-13T05:57:59.535Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T05:58:01.954Z

Good. Now let me get the RAG hybrid pipeline and related feeder scripts.

### Assistant | 2026-06-13T05:58:04.045Z

[tool_use: Grep]

### Assistant | 2026-06-13T05:58:04.857Z

[tool_use: Grep]

### Assistant | 2026-06-13T05:58:05.476Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:58:05.871Z

[tool_use: Read]

### User | 2026-06-13T05:58:09.908Z

[tool_result] H:\prism\mcp-server\src\__tests__\physics-ml-hybrid.test.ts
H:\prism\mcp-server\src\__tests__\camDispatcher.hybrid-program-compose-wire.test.ts
H:\prism\mcp-server\src\__tests__\sessionDispatcher.ranked-hybrid-wire.test.ts

### User | 2026-06-13T05:58:10.207Z

[tool_result] Found 2 files
H:\prism\scripts\lib\galaxy-reasoning-bridge.test.mjs
H:\prism\scripts\lib\galaxy-reasoning-bridge.mjs

### User | 2026-06-13T05:58:10.435Z

[tool_result] Found 5 files
H:\prism\mcp-server\src\engines\quoting\OPEN-THREADS.md
H:\prism\mcp-server\src\engines\ai-training\MEMORY.md
H:\prism\mcp-server\src\engines\token-optimization\MEMORY.md
H:\prism\mcp-server\src\__tests__\engines\ppgProvenanceWireEngine.test.ts
H:\prism\mcp-server\src\engines\MultiCamStrategyEngine.ts

### User | 2026-06-13T05:58:10.450Z

[tool_result] 1	/**
2	 * QdrantVectorStoreEngine — Thin client around @qdrant/js-client-rest
3	 *
4	 * Phase external-infra. Provides a PRISM-styled surface over the Qdrant REST
5	 * client so higher-level engines (SemanticSimilarityGuard, Tool DB vector
6	 * search, MIT course index) don't have to deal with the raw client's many
7	 * options. Methods are minimal + named after the action, not the endpoint.
8	 *
... [+2204 chars truncated]

### Assistant | 2026-06-13T05:58:14.535Z

The RAG hybrid pipeline isn't in `mcp-server/src` as a named file. Let me search for it more broadly and look at the ranked-hybrid wire test and the generate-rag-upgrade-features script.

### Assistant | 2026-06-13T05:58:15.564Z

[tool_use: Read]

### Assistant | 2026-06-13T05:58:16.054Z

[tool_use: Read]

### Assistant | 2026-06-13T05:58:17.456Z

[tool_use: Grep]

### Assistant | 2026-06-13T05:58:18.504Z

[tool_use: Grep]

### User | 2026-06-13T05:58:30.610Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-rag-upgrade-features.mjs — system-viz augmentation: RAG-UPGRADE-MS0.
4	 *
5	 * Spec: RAG-UPGRADE-MS0 (state/shared/specs/RAG-UPGRADE-MS0.md). The "wired"
6	 * half of the operator /goal — surfaces the retrieval-upgrade milestone + its
7	 * 6 units (U-RAG-1..6) in /system-viz as a ghost roost so milestone progress
8	 * is legible alongside every other track
... [+3405 chars truncated]

### User | 2026-06-13T05:58:30.623Z

[tool_result] 1	/**
2	 * sessionDispatcher — ranked-hybrid wiring round-trip (SIERRA-LEVERAGE/U-N1-RANKED-HYBRID).
3	 *
4	 * Verifies `master_index_ranked_hybrid` is wired into prism_session: it is a member of
5	 * the z.enum(ACTIONS) gate AND round-trips through the dispatcher to a well-formed
6	 * RankedHybridResult envelope.
7	 *
8	 * Closes the documented MockMCPServer false-green: a mock that ignores the s
... [+2757 chars truncated]

### system

... [15 middle messages omitted -- see raw_file] ...

### User | 2026-06-13T05:58:56.994Z

[tool_result] H:/prism/scripts/lib/hybrid-retrieval.mjs*
385 H:/prism/scripts/lib/hybrid-retrieval.mjs

### Assistant | 2026-06-13T05:59:00.732Z

Good. Now read the core hybrid-retrieval.mjs pipeline and the vault-to-* feeder scripts in parallel.

### Assistant | 2026-06-13T05:59:01.356Z

[tool_use: Read]

### Assistant | 2026-06-13T05:59:01.755Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:59:02.346Z

[tool_use: Read]

### Assistant | 2026-06-13T05:59:03.218Z

[tool_use: Read]

### User | 2026-06-13T05:59:10.722Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE — compose all 4 retrieval
3	// substrates (memory-index BM25 + master-index graph BM25 + episode-store
4	// predicate + Qdrant dense vector) into ONE query API. Fan out the same
5	// query string to every substrate the caller injects; merge ranked hit
6	// lists by Reciprocal Rank Fusion (Cormack et al. 2009, k=60) — robust to

... [+18810 chars truncated]

### User | 2026-06-13T05:59:11.002Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-wiki-into-tribal-index.mjs
4	 *
5	 * BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP (2026-05-19, slot foxtrot).
6	 *
7	 * Idempotent appender that embeds wiki markdown files into
8	 * `state/shared/tribal-embed-index.json` so they become reachable by the
9	 * automatic tribal-knowledge injection pipeline
10	 * (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs` → cosin
... [+2733 chars truncated]

### User | 2026-06-13T05:59:11.005Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * rag-hyde.mjs — HIGH-ROI-AI-PSN-SCOPE/U-RAG-HYDE (A8, 2026-05-23, slot golf).
4	 *
5	 * Hypothetical Document Embeddings (HyDE — Gao et al., 2022 — "Precise
6	 * Zero-Shot Dense Retrieval without Relevance Labels"). For a terse query Q,
7	 * generate a HYPOTHETICAL answer A* via a small LLM, embed A* instead of Q,
8	 * then retrieve as normal. The hypothetical lives
... [+2425 chars truncated]

### User | 2026-06-13T05:59:16.756Z

[tool_result] No files found

### Assistant | 2026-06-13T05:59:20.192Z

Now get Qdrant collection counts, RAG-UPGRADE-MS0 spec status, the vault feeder scripts, and the populate-qdrant entry point.

### Assistant | 2026-06-13T05:59:20.705Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:59:21.234Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:59:22.220Z

[tool_use: Glob]

### Assistant | 2026-06-13T05:59:22.422Z

[tool_use: Glob]

### User | 2026-06-13T05:59:43.015Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T05:59:43.104Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T05:59:43.538Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T05:59:43.920Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T05:59:46.866Z

Globs are timing out — switching to Bash for targeted file lookups.

### Assistant | 2026-06-13T05:59:48.482Z

[tool_use: Bash]

### Assistant | 2026-06-13T05:59:49.811Z

[tool_use: Bash]

### Assistant | 2026-06-13T05:59:51.188Z

[tool_use: Bash]

### User | 2026-06-13T06:00:14.616Z

[tool_result] Exit code 2

### User | 2026-06-13T06:00:14.625Z

[tool_result] Exit code 2

### User | 2026-06-13T06:00:14.669Z

[tool_result] H:/prism/scripts/populate-qdrant-memories.mjs*
H:/prism/scripts/populate-qdrant-memories.test.mjs
H:/prism/scripts/populate-qdrant-wiki.mjs*
H:/prism/scripts/populate-qdrant-wiki.test.mjs
H:/prism/scripts/populate-qdrant.mjs*
H:/prism/scripts/vault-to-gnn-refpool.heap.test.mjs
H:/prism/scripts/vault-to-gnn-refpool.mjs*
H:/prism/scripts/vault-to-gnn-refpool.test.mjs
H:/prism/scripts/vault-to-lora-d
... [+151 chars truncated]

### Assistant | 2026-06-13T06:00:17.344Z

Good, now read the key files in parallel.

### Assistant | 2026-06-13T06:00:17.776Z

[tool_use: Read]

### Assistant | 2026-06-13T06:00:18.369Z

[tool_use: Read]

### Assistant | 2026-06-13T06:00:19.026Z

[tool_use: Read]

### Assistant | 2026-06-13T06:00:19.175Z

[tool_use: Read]

### User | 2026-06-13T06:00:23.527Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-QDRANT-POPULATE — ingest the 768d node embeddings
3	// from H:/prism/state/shared/nn-graph/node-embeddings-768d.jsonl into a
4	// named Qdrant collection. Closes iter-13 follow-up: collections exist but
5	// are empty, blocking the hybrid (BM25 + vector + graph + episode) retrieval.
6	//
7	// Data shape: each JSONL line is `{n: "node-id", q: int8[]}
... [+3788 chars truncated]

### User | 2026-06-13T06:00:23.763Z

[tool_result] 1	# RAG-UPGRADE-MS0 — PRISM retrieval upgrade milestone
2	
3	**Operator goal** (2026-05-22, slot golf, `/goal … /loop`): complete U-RAG-1..5 and
4	synergize the result with system-viz, obsidian brain, wiki injection, and the
5	GNN / neural network. **Completion condition:** "completed and wired."
6	
7	## Why (gap analysis — audit-backed)
8	
9	PRISM's RAG *technique* is already advanced (hybrid ret
... [+9909 chars truncated]

### User | 2026-06-13T06:00:25.215Z

[tool_result] 1	#!/usr/bin/env node
2	// local-vector-store.mjs
3	// ----------------------------------------------------------------------------
4	// GRAPH-UTILIZATION rec #1 / U-LOCAL-VECTOR-LEG-WIRE (2026-06-12, slot:alpha):
5	// the memory-SAFE cached reader that makes the `localvector` leg of
6	// scripts/lib/hybrid-retrieval.mjs LIVE. It loads the on-disk nomic-768d int8
7	// vectors (knowledge/wiki/archi
... [+4359 chars truncated]

### User | 2026-06-13T06:00:25.597Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * vault-to-lora-dataset.mjs -- turn the Obsidian feedback vault into LoRA
4	 * instruction-tuning pairs (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
5	 *
6	 * THE GAP: the existing LoRA dataset builders (LatheLoRADatasetBuilderEngine et
7	 * al.) emit machining-PARAMETER pairs from raw NC programs / DB registries. They
8	 * do NOT touch the Obsidian vault. But the va
... [+3324 chars truncated]

### User | 2026-06-13T06:03:12.047Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Scout the CURRENT state of PRISM's RAG and CAG systems in H:/prism. Provide exhaustive, cited findings (file:line / script paths / live counts) answering 8 specific questions:
   - Q1: RAG-HYBRID pipeline implementation + arms (dense + BM25)
   - Q2: Vector store(s) backing it — Qdrant collections + current document counts
   - Q3: How a new document gets added to the RAG corpus / embedded (entry point)
   - Q4: Current corpus size / embedding count (real numbers)
   - Q5: CAG router location + COLD_SOURCES list (full enumeration)
   - Q6: How knowledge enters CAG cold/hot tiers (static vs dynamic)
   - Q7: CAG state/sidecar files, hit-rate metrics, dashboards
   - Q8: Scripts that feed learned/vault knowledge into RAG and CAG (vault-to-*, embed-knowledge-store, wiki→tribal embed)

2. Key Technical Concepts:
   - RAG-HYBRID: 5-arm fan-out + Reciprocal Rank Fusion (RRF, k=60, Cormack et al. 2009)
   - Arms: memory-index BM25, master-index graph BM25, episode-store predicate, Qdrant dense (nomic-embed-text 768-d), local-vector offline dense (int8 cosine, no Qdrant)
   - EMBED-ONCE optimization: Qdrant + local vector legs share one Ollama embedding call
   - CAG (Cache-Augmented Generation): COLD/HOT/HYBRID query classifier, pure function, no I/O
   - COLD tier: static curated list of 9 stable doctrine files anchored in prompt cache
   - HOT tier: live-state surfaces (build_state, chat-slots, Qdrant semantic search)
   - HyDE (Hypothetical Document Embeddings, Gao et al. 2022): short-query recall lift via LLM-generated hypothetical answer
   - Stage-3 LLM reranker: qwen2.5-coder:32b post-RRF reranking (+15-30% precision target)
   - Tribal embed index: `state/shared/tribal-embed-index.json` (sharded after crossing 537MB V8 string cap)
   - nomic-embed-text via Ollama at 127.0.
... [+13214 chars truncated]

### Assistant | 2026-06-13T06:04:36.731Z

Now I have enough data to compile the complete scouting report. Let me also quickly grab the vault-to-gnn-refpool.mjs header to complete Q8.

### Assistant | 2026-06-13T06:04:37.277Z

[tool_use: Read]

### User | 2026-06-13T06:04:49.678Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * vault-to-gnn-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
4	 * vault wiring decisions (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
5	 *
6	 * THE GAP THIS CLOSES: nn-graph-eval.mjs buildHoldout() builds its leave-out
7	 * holdout from graph nodes where kind==="ghost.unwired-engine" AND
8	 * isValidDispatcher(proposed_wiring) AND confidence>=refMinCon
... [+2537 chars truncated]

### Assistant | 2026-06-13T06:06:44.222Z

Here is the complete cited scouting report.

---

## Q1: RAG-HYBRID Pipeline Implementation + Arms

**Core pipeline:** `H:/prism/scripts/lib/hybrid-retrieval.mjs` (385 lines)

Entry point: exported `hybridSearch(query, opts)` function.

**5 arms:**
1. **memory BM25** — `runMemoryIndexSearch(query)` via `scripts/lib/memory-index-search-lib.mjs`
2. **master-index BM25** — `runMasterIndexSearch(query)` via `scripts/lib/master-index-search-lib.mjs`
3. **episode predicate** — keyword scan via `scripts/lib/episode-store.mjs`
4. **Qdrant dense** — `defaultQdrantSearch()` using nomic-embed-text 768-d via Ollama at `http://127.0.0.1:11434/api/embeddings` (NOT localhost — Windows IPv6 fix, line 29). Default collection: `prism_engines` (line 28).
5. **local-vector offline dense** — `defaultLocalVectorSearch()` using int8 cosine, no Qdrant dependency; added 2026-06-12 (U-LOCAL-VECTOR-LEG-WIRE)

**EMBED-ONCE optimization:** `denseQueryVector()` memoizes the single Ollama embedding call; both dense legs (arms 4 and 5) share it.

**Fusion:** `rrfMerge(lists, {k:60})` — Reciprocal Rank Fusion (Cormack et al. 2009), returns sorted by RRF score descending.

**Two-stage rerank (U-RAG-2, shipped):**
- Stage 1: lexical reranker `scripts/lib/lexical-rerank.mjs` applied in all 4 inject hooks after BM25 top-N
- Stage 2: LLM reranker `scripts/lib/rag-llm-rerank.mjs` (qwen2.5-coder:32b, env `PRISM_RAG_LLM_RERANK_MODEL`; kill switch `PRISM_RAG_LLM_RERANK_DISABLE=1`; max K default 20)

**HyDE (U-RAG-5 / shipped):** `scripts/lib/rag-hyde.mjs` — gate: skip if query ≥8 tokens; wired into tribal-by-domain-inject, master-index-precheck-inject, memory-relevance-inject. Kill switch: `PRISM_RAG_HYDE_DISABLE=1`.

**MCP surface:** `prism_session:hybrid_search` action via `mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts`; also wires `prism_session:master_index_ranked_hybrid` (RankedHybridGraphSearchEngine).

**RAG-UPGRADE-MS0 status (`state/shared/specs/RAG-UPGRADE-MS0.md` lines 94-104):**

... [+14041 chars truncated]
