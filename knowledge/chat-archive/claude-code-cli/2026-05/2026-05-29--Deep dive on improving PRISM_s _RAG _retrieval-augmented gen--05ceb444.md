---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Deep dive on improving PRISM's \"RAG (retrieval-augmented generation + corpus hea"
date: "2026-05-29"
first_ts: "2026-05-29T19:17:18.323Z"
last_ts: "2026-05-29T19:25:02.562Z"
cwd: "H:\\prism-slot-india"
messages: 80
user_msgs: 34
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a3cb161240f4a113e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Deep dive on improving PRISM's "RAG (retrieval-augmented generation + corpus hea

> **claude-code-cli** | 2026-05-29 | 80 msgs (34 user / 46 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a3cb161240f4a113e.jsonl`

## Transcript

### User | 2026-05-29T19:17:18.323Z

Deep dive on improving PRISM's "RAG (retrieval-augmented generation + corpus health)". Focus: corpus freshness (BlueprintCorpusHarvest just shipped), tribal/MIT-OCW/PDF corpora, embedding model, chunking, retrieval quality, re-index triggers

PRISM grounding (READ real files in worktree H:/prism-slot-india; it is divergent from main H:/prism — NN-GRAPH state + many engines live ONLY on main):
- Galaxy brain: mcp-server/src/engines/ai-training/{KNOWLEDGE.md,RULES.md,MEMORY.md,PATHS.md}
- VERIFIED FACTS from the first deep-dive (do not re-litigate): closed-loop IS ignited at boot (index.ts:434 XProcNeuralAutoFireEngine.activate) but CrossProcessOutcomeStore is ephemeral (configureStorePath has 0 prod callers); CAG cold-anchor is a no-op (PromptCachingEngine output reaches no live call site; LLMEngine.ts:327 _callClaude sends plain string); NN-GRAPH AUROC 0.096 is the link-prediction PRETEXT diagnostic NOT the deploy gate (gate correctly DEFERRED on poolSize=0, data-side); stratified neg-sampling ALREADY coded (graphsage-trainer.mjs:167, main).
- Constraints: duplicationGuard THROWS on new dup engines; NEVER inline physics constants; NEVER bypass the NN deploy gate. Ollama /api/chat is DEAD this session (no live embed).

TASK: Read the relevant PRISM files (Read/Grep/Glob) to establish what EXISTS — cite real paths, do not guess. Then list concrete improvements with leverage(1-10), effort, venue, the PRISM target file/engine, the named technique, and duplicationRisk (search first — duplicationGuard THROWS). Prioritize genuinely high-impact wiring/coupling fixes over cosmetic ones; be honest about what's already built.
CRITICAL: You MUST finish by calling the StructuredOutput tool with your findings. Do your file reads FIRST, keep them focused, then call StructuredOutput. Do not end your turn with prose — the StructuredOutput call IS the deliverable.

### Assistant | 2026-05-29T19:17:32.515Z

I'll start by reading the galaxy brain files to establish grounding, then dig into the RAG/corpus engines.

### Assistant | 2026-05-29T19:17:32.947Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:33.946Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:33.987Z

[tool_use: Read]

### User | 2026-05-29T19:18:04.817Z

[tool_result] 1	# AI-Training Domain Knowledge Index (slot:india)
2	
3	> Compiled one-stop index of ALL relevant wiki + tribal + action knowledge for the ai-training domain (NN/GNN/LoRA/RAG/deep-learning/retrain). Enumerated from `H:/prism/knowledge/wiki/` 2026-05-29 (U-PSGB-INDIA-AUDIT). **Auto-invoked** for india sessions via `india-awareness-inject.mjs` (surfaces the pointer + live state) + `tribal-by-domain
... [+3965 chars truncated]

### User | 2026-05-29T19:18:06.782Z

[tool_result] 1	# AI Training Galaxy MEMORY.md — per-domain working brain (slot:india)
2	
3	Append-only cross-session memory for the india slot (full-system training: AI/NN/GNN/LoRA/RAG/DL/ML).
4	
5	## Master-brain link
6	> Cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical pattern — fine-tuned for ai-training, brain wiring NOT re-derived).
7	- **UP (pull from master):** `C:/Users/
... [+8356 chars truncated]

### User | 2026-05-29T19:18:07.233Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### Assistant | 2026-05-29T19:18:11.977Z

Now let me read the actual RAG engines. Since this worktree is stale, I need to check what's actually present here. Let me find the RAG and corpus engines.

### Assistant | 2026-05-29T19:18:12.423Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:18:12.879Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:18:13.640Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:18:14.012Z

[tool_use: Glob]

### User | 2026-05-29T19:18:42.966Z

[tool_result] mcp-server\src\engines\CAMTribalRAGEngine.ts
mcp-server\src\engines\InferenceLoRAGateEngine.ts
mcp-server\src\engines\JMDieProgramRAGEngine.ts
mcp-server\src\engines\PPGRAGDialectMatchEngine.ts
mcp-server\src\engines\SFCRAGWarmStartEngine.ts
mcp-server\src\engines\TribalRAGEngine.ts
mcp-server\src\engines\WikiRAGFeatureEngine.ts

### User | 2026-05-29T19:18:43.757Z

[tool_result] mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts
mcp-server\src\engines\CADCorpusIngesterEngine.ts
mcp-server\src\engines\CADCorpusIngestionEngine.ts
mcp-server\src\engines\CADCorpusPatternEngine.ts
mcp-server\src\engines\CADTrainingCorpusOrchestratorEngine.ts
mcp-server\src\engines\JMDieTrainingCorpusEngine.ts
mcp-server\src\engines\BlueprintCorpusHarvestEngine.ts

### User | 2026-05-29T19:18:45.255Z

[tool_result] mcp-server\src\engines\CADEmbeddingIndexOrchestratorEngine.ts
mcp-server\src\engines\CADFeatureEmbeddingEngine.ts
mcp-server\src\engines\EmbeddingFilterEngine.ts
mcp-server\src\engines\EmbeddingGuardEngine.ts
mcp-server\src\engines\EmbeddingPipelineEngine.ts
mcp-server\src\engines\LatheLoRAEmbeddingCacheEngine.ts
mcp-server\src\engines\LocalEmbeddingEngine.ts
mcp-server\src\engines\OllamaEmbedderE
... [+62 chars truncated]

### User | 2026-05-29T19:18:46.216Z

[tool_result] mcp-server\src\engines\BlueprintCorpusHarvestEngine.ts

### Assistant | 2026-05-29T19:18:50.128Z

BlueprintCorpusHarvestEngine exists here (just shipped). Let me read the key files: the just-shipped harvest engine, the central embedder, and the TribalRAG engine.

### Assistant | 2026-05-29T19:18:51.131Z

[tool_use: Read]

### Assistant | 2026-05-29T19:18:51.295Z

[tool_use: Read]

### User | 2026-05-29T19:19:02.997Z

[tool_result] 1	/**
2	 * OllamaEmbedderEngine
3	 * ====================
4	 *
5	 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
6	 *
7	 * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
8	 * for the daily-brief use case: embed many short documents, then compute
9	 * pairwise cosine similarities and return them keyed by canonical pairKey
10	 * (alphabetical join of two paths).
11	 *
12
... [+7205 chars truncated]

### User | 2026-05-29T19:19:03.197Z

[tool_result] 1	/**
2	 * BlueprintCorpusHarvestEngine — catalogs the blueprint / PDF / drawing corpus
3	 * and detects when it has drifted, so the downstream RAG / OCR / extraction
4	 * caches know precisely when to re-index.
5	 *
6	 * This is the "corpus health" surface of the BLUEPRINT-OCR-TRAINING-MS1
7	 * milestone (Phase 4, U-MS1-U6). It produces a deterministic *manifest* over a
8	 * set of corpus roots a
... [+16341 chars truncated]

### Assistant | 2026-05-29T19:19:06.840Z

Now let me look at the central RAG engines, the embedding pipeline, and how the harvest engine wires into anything. Let me read TribalRAGEngine, EmbeddingPipelineEngine, and check the dispatcher wiring for the harvest engine.

### Assistant | 2026-05-29T19:19:08.233Z

[tool_use: Read]

### Assistant | 2026-05-29T19:19:08.537Z

[tool_use: Read]

### User | 2026-05-29T19:19:21.325Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
2	/**
3	 * TribalRAGEngine — U-LEARN-04
4	 * ==============================
5	 *
6	 * Generalized hybrid retrieval over ALL tribal knowledge (4,493+ tips).
7	 * Extends CAMTribalRAGEngine pattern to cover all domains:
8	 * - Machining tips (mill, lathe, grinder, EDM)
9	 * - Material tips (speeds/feeds per alloy)
10	 * - Tool t
... [+15002 chars truncated]

### User | 2026-05-29T19:19:24.404Z

[tool_result] 1	/**
2	 * EmbeddingPipelineEngine — Semantic Search Infrastructure
3	 * INFRA-2-1 U-VEC2 + U-VEC3
4	 *
5	 * Provides:
6	 * - Text-to-vector embedding (pluggable model backend)
7	 * - Batch embedding for tools, tips, materials, strategies
8	 * - Hybrid search: vector similarity + trigram text matching
9	 * - In-memory fallback when pgvector/model unavailable
10	 *
11	 * Model: sentence-transformer
... [+7460 chars truncated]

### Assistant | 2026-05-29T19:19:28.326Z

Now let me check the critical wiring question: is BlueprintCorpusHarvestEngine wired into any dispatcher, and is there any script that schedules/runs it? Also check what the central embed model story is (nomic-embed-text vs all-mpnet) and how TribalRAG gets rebuilt.

### Assistant | 2026-05-29T19:19:31.434Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:19:31.444Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:19:32.058Z

[tool_use: Grep]

### User | 2026-05-29T19:19:53.798Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\mlDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts

### User | 2026-05-29T19:19:53.990Z

[tool_result] Found 16 files
mcp-server\src\__tests__\memoryDispatcher.binaryQuant.test.ts
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\schemas\memoryActionSchemas.ts
mcp-server\src\__tests__\binaryQuantize.test.ts
mcp-server\src\engines\QdrantMemoryEngineSingleton.ts
mcp-server\src\engines\QdrantMemoryEngine.ts
mcp-server\src\engines\OllamaEmbedderEngine.ts
mcp-server\src\engines\ModelRo
... [+483 chars truncated]

### User | 2026-05-29T19:20:13.701Z

[tool_result] Found 12 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
scripts\blueprint-corpus-harvest.mjs
mcp-server\src\engines\BlueprintCorpusHarvestEngine.ts
mcp-server\src\__tests__\BlueprintCorpusHarvestEngine.test.ts
state\shared\atomic-roadmap.json
state\shared\MILESTONE_PROGRESS.json
mcp-server\src\engines\CADCorpusPatternEngine.ts
mcp-server\src\engines\CADCorpusIngestionEngine.ts
mcp-server\
... [+245 chars truncated]

### Assistant | 2026-05-29T19:20:17.339Z

Good — BlueprintCorpusHarvest IS wired into devDispatcher and has a script. Let me read the dispatcher wiring, the harvest script, and check the LocalEmbeddingEngine (the actual default embed backend) plus how the freshness verdict triggers re-index downstream.

### Assistant | 2026-05-29T19:20:19.305Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:20:19.680Z

[tool_use: Read]

### Assistant | 2026-05-29T19:20:20.156Z

[tool_use: Read]

### User | 2026-05-29T19:20:32.889Z

[tool_result] 25-const SRC_DIR = path.join(MCP_ROOT, "src");
26-const DIST_DIR = path.join(MCP_ROOT, "dist");
27-const DOCS_DIR = path.join(MCP_ROOT, "data", "docs");
28-const STATE_DIR = PATHS.STATE_DIR;
29:[Omitted long matching line]
30-"adaptive_threshold_observe", "adaptive_threshold_get", "adaptive_threshold_get_all", "adaptive_threshold_should_flag", "adaptive_threshold_probability",
31-"roadmap_intel_as
... [+2628 chars truncated]

### User | 2026-05-29T19:20:37.748Z

[tool_result] 1	#!/usr/bin/env node
2	// blueprint-corpus-harvest.mjs — CLI + cron front-end for the blueprint/PDF
3	// corpus harvest + freshness check (BLUEPRINT-OCR-TRAINING-MS1 / MS1-U6).
4	//
5	// Catalogs the corpus roots into a fingerprinted manifest and, against a prior
6	// manifest, decides whether the downstream RAG/OCR cache must re-index. Runs
7	// with no build step so it can be wired as a freshne
... [+8025 chars truncated]

### User | 2026-05-29T19:20:38.394Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+5435 chars truncated]

### Assistant | 2026-05-29T19:20:43.719Z

Now I have a clear picture of the embedding model fragmentation (nomic-embed-text 768d in Ollama, all-MiniLM-L6-v2 384d in Local, all-mpnet 768d declared in EmbeddingPipeline). The critical question: does the freshness verdict actually TRIGGER any downstream re-index, or is it advisory-only? Let me check what consumes the corpus_freshness verdict and whether there's a re-index trigger anywhere. Also check the CAD corpus ingestion (does it have freshness fingerprinting?) and how the tribal RAG index gets rebuilt.

### Assistant | 2026-05-29T19:20:45.716Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:20:47.533Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:20:47.977Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:20:48.339Z

[tool_use: Glob]

### User | 2026-05-29T19:21:09.194Z

[tool_result] No matches found

### User | 2026-05-29T19:21:09.270Z

[tool_result] scripts\generate-tribal-index.mjs

### User | 2026-05-29T19:21:09.602Z

[tool_result] scripts\build-wiki-embeddings.mjs

### User | 2026-05-29T19:21:23.559Z

[tool_result] Found 36 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
scripts\blueprint-corpus-harvest.mjs
mcp-server\src\engines\BlueprintCorpusHarvestEngine.ts
mcp-server\src\engines\ai-training\MEMORY.md
state\shared\specs\REVENUE-ROADMAP-v7.6.md
state\shared\specs\REVENUE-ROADMAP-v7.5.md
state\shared\specs\REVENUE-ROADMAP-v7.4.md
state\shared\hook-definitions-inventory.json
state\shared\audit-findi
... [+1371 chars truncated]

### Assistant | 2026-05-29T19:21:28.381Z

Key finding confirmed: the freshness verdict is consumed by NOTHING downstream — `blueprint_corpus_freshness` only appears in the dispatcher, the engine, the script, and docs. No RAG re-index engine reads it. CADCorpusIngestionEngine has NO fingerprint/freshness mechanism at all. Let me verify the tribal index generator and check whether the harvest is scheduled (cron/scheduled task) and whether BlueprintExtractionRAGEngine exists in this worktree.

### Assistant | 2026-05-29T19:21:29.281Z

[tool_use: Read]

### Assistant | 2026-05-29T19:21:32.276Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:21:32.278Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:21:32.782Z

[tool_use: Grep]

### User | 2026-05-29T19:21:32.808Z

[tool_result] <tool_use_error>Path does not exist: H:/prism-slot-india/.claude/scheduled_tasks.json. Note: your current working directory is H:\prism-slot-india.</tool_use_error>

### User | 2026-05-29T19:21:57.191Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-tribal-index.mjs
4	 *
5	 * Generates a SINGLE Obsidian wiki entry at
6	 *   H:/prism/knowledge/wiki/architecture/tribal-knowledge-index.md
7	 *
8	 * The tribal corpus lives at H:/prism/knowledge/tribal/ as ~4,245 individual
9	 * markdown files (auto-ingested-tips-auto-N.md). Replicating each as a wiki
10	 * entry would 4x the architecture/ folder for low m
... [+1990 chars truncated]

### User | 2026-05-29T19:21:58.910Z

[tool_result] No files found

### User | 2026-05-29T19:21:58.998Z

[tool_result] No files found

### Assistant | 2026-05-29T19:22:05.424Z

Confirmed: BlueprintExtractionRAGEngine does NOT exist in this worktree (it's main-only, as the engine's own header notes). The harvest engine has no scheduled task and nothing consumes its freshness verdict. Let me do a few final targeted checks: the CADCorpusIngestionEngine structure (chunking/dedup), whether there's a central re-index orchestrator, and how the tribal index generation is scheduled. Let me also check the RAG schema/citation and whether there's a reranker anywhere.

### Assistant | 2026-05-29T19:22:06.774Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:22:08.671Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:22:09.592Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:22:10.878Z

[tool_use: Grep]

### User | 2026-05-29T19:22:25.204Z

[tool_result] No matches found

### User | 2026-05-29T19:22:29.114Z

[tool_result] Found 131 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\engines\BlueprintCorpusHarvestEngine.ts
mcp-server\src\util\binaryQuantize.ts
mcp-server\src\tools\dispatchers\vibrationPhysicsDispatcher.ts
mcp-server\src\tools\dispatchers\mlDispatcher.ts
mcp-server\src\tools\dispatchers\knowledgeDispatcher.ts
mcp-server\src\tools\dispatchers\edmDispatcher.ts
mcp-server\src\tools\di
... [+6640 chars truncated]

### User | 2026-05-29T19:22:30.008Z

[tool_result] mcp-server\src\engines\CADCorpusIngestionEngine.ts
mcp-server\src\engines\PDFProcessingPipelineEngine.ts
mcp-server\src\engines\PDFSourceRegistryEngine.ts

### User | 2026-05-29T19:22:32.151Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts

### Assistant | 2026-05-29T19:22:35.355Z

A ReRankerEngine exists. Let me read it and check its wiring, and verify whether TribalRAG (BM25/TF-IDF) feeds into the reranker or whether they're disconnected. This is the retrieval-quality coupling question.

### Assistant | 2026-05-29T19:22:36.318Z

[tool_use: Read]

### Assistant | 2026-05-29T19:22:37.368Z

[tool_use: Grep]

### User | 2026-05-29T19:22:56.627Z

[tool_result] Found 1 file
mcp-server\src\tools\dispatchers\mlDispatcher.ts

### User | 2026-05-29T19:22:57.208Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
2	/**
3	 * ReRankerEngine — U-LEARN-04
4	 * =============================
5	 *
6	 * Cross-encoder reranking for RAG results. Takes top-N candidates from
7	 * initial retrieval and refines to top-K using deeper semantic matching.
8	 *
9	 * Scoring Strategy
10	 * ----------------
11	 * Since we don't have a neural cross-encoder 
... [+11484 chars truncated]

### Assistant | 2026-05-29T19:23:02.085Z

I now have a comprehensive picture. Let me do one final check on how the RAG stack is wired in mlDispatcher — whether TribalRAG search → ReRanker forms an actual pipeline action, or whether they're separate disconnected actions. This determines whether retrieval+rerank is coupled.

### Assistant | 2026-05-29T19:23:04.519Z

[tool_use: Grep]

### User | 2026-05-29T19:23:15.452Z

[tool_result] 38-let _corpus: typeof import("../../engines/JMDieTrainingCorpusEngine.js").jmDieTrainingCorpusEngine | null = null;
39-// U-LEARN-04 RAG engines
40-let _programRAG: typeof import("../../engines/JMDieProgramRAGEngine.js").jmDieProgramRAGEngine | null = null;
41:let _tribalRAG: typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine | null = null;
42:let _reranker: typeof import("../../en
... [+2009 chars truncated]

### Assistant | 2026-05-29T19:23:24.184Z

I have everything I need. The picture is now clear:

- `rag_tribal_build`, `rag_tribal_search`, `rag_rerank` are SEPARATE dispatcher actions in mlDispatcher — there's no single `rag_query` action that chains retrieve→rerank. The caller must manually wire search output into rerank input. No fused pipeline.
- Embedding model fragmentation: 3 different models declared across engines (nomic-embed-text 768d, all-MiniLM-L6-v2 384d, all-mpnet 768d), but TribalRAG/ReRanker use pure lexical (BM25/TF-IDF/Jaccard) — no embeddings at all. So the "RAG" stack the dispatcher exposes is purely lexical; the embedding engines are a separate, parallel universe.
- BlueprintCorpusHarvest freshness verdict is computed but consumed by nothing — no re-index trigger, no scheduled task, no Stop hook wiring. It's a fingerprint that no cache reads.
- CADCorpusIngestionEngine has zero freshness/fingerprint mechanism.

Let me record findings via StructuredOutput.

### Assistant | 2026-05-29T19:24:16.153Z

[tool_use: StructuredOutput]

### User | 2026-05-29T19:24:50.616Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T19:25:02.562Z

I've completed the deep dive on PRISM's RAG and corpus-health stack. Findings recorded via StructuredOutput.

Key takeaways, grounded in real files in `H:/prism-slot-india`:

1. **The biggest leverage win is closing the freshness loop.** `BlueprintCorpusHarvestEngine.ts` is genuinely well-engineered (deterministic manifests, atomic writes, fail-soft loads, cheap/deep fp modes, wired to `devDispatcher.ts:1277/1303` + a CLI cron at `scripts/blueprint-corpus-harvest.mjs` that exits 3 on stale). But its `FreshnessVerdict` is consumed by **nothing** — no re-index engine, no scheduled task, no Stop hook. The exact failure mode it was built to guard against (stale RAG cache: corpus changed, cache held) is still open because the trigger half was never built, and `BlueprintExtractionRAGEngine` (its intended consumer) is main-only.

2. **The dispatcher-exposed RAG is 100% lexical.** `TribalRAGEngine` (BM25+TF-IDF) and `ReRankerEngine` (Jaccard/bigram — explicitly "we don't have a neural cross-encoder in pure JS") are the `prism_ml` RAG. The three embedding engines (`OllamaEmbedderEngine` nomic/768, `LocalEmbeddingEngine` MiniLM/384, `EmbeddingPipelineEngine` mpnet/768) are a disconnected parallel universe never consulted by the RAG actions — and they disagree on model+dim, so any cross-engine vector index is silently incomparable.

3. **`rag_tribal_search` and `rag_rerank` are separate actions** — there's no fused retrieve→rerank pipeline; the caller must hand-thread them. A `rag_query` composition action is a small, low-dup win.

All improvements flag duplicationRisk and note that `duplicationGuard` THROWS on new `*TribalRAG*` / `*CorpusFreshness*` / `*Reindex*` engines — the high-value moves are wiring/coupling (consume the verdict, schedule the harvest, compose existing engines) rather than new engines.
