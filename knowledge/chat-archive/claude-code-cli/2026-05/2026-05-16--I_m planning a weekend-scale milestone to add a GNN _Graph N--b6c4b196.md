---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "I'm planning a weekend-scale milestone to add a GNN (Graph Neural Network) link-"
date: "2026-05-16"
first_ts: "2026-05-16T01:56:56.128Z"
last_ts: "2026-05-16T02:02:04.346Z"
cwd: "H:\\prism"
messages: 170
user_msgs: 76
assistant_msgs: 94
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a57cc79da1c39b081.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# I'm planning a weekend-scale milestone to add a GNN (Graph Neural Network) link-

> **claude-code-cli** | 2026-05-16 | 170 msgs (76 user / 94 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a57cc79da1c39b081.jsonl`

## Transcript

### User | 2026-05-16T01:56:56.128Z

I'm planning a weekend-scale milestone to add a GNN (Graph Neural Network) link-prediction layer to PRISM's system-viz graph (currently 373k nodes / 592k edges at `H:/prism/state/shared/system-viz/system-graph.json`). The goal is to predict missing engine→dispatcher wirings via learned graph topology + node embeddings, complementing the existing 4-tier heuristic+LLM inference pipeline at `H:/prism/scripts/seed-ghost-llm-classify.mjs`.

Before I plan, I need a precise inventory of what already exists so I compose over (not duplicate) the substantial scaffolding. Please investigate these specific items and report (medium depth):

**Engines — verify existence, summarize signatures, identify the dispatcher each is wired through:**

1. `mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts` (1140 LOC, I've read the first 200 lines) — confirm: does it use placeholder/simulated embeddings (I saw `EMBEDDING_DIM=384` and "Simulated embedding dimension") or real Ollama? What's the public API surface (just the exported class methods)?

2. `mcp-server/src/engines/KnowledgeGraphFeatureProjectorEngine.ts` (268 LOC, I've read the top) — confirm the 8-dim output shape and that the downstream consumer is `CrossProcessNeuralLearningEngine`. What does it expose as static methods?

3. `mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts` — does this exist? If yes, what kind of NN is it (MLP/RNN/transformer)? What's its training/inference API?

4. `mcp-server/src/engines/OllamaEmbedderEngine.ts` — what model does it use (nomic-embed-text? what dim?), what's the API for embedding text → vector?

5. `mcp-server/src/engines/GraphAlgorithmsEngine.ts` (581 LOC) and `mcp-server/src/engines/GraphTheoryEngine.ts` — do either implement node2vec, PageRank, or other graph-traversal embeddings I can reuse?

6. `mcp-server/src/engines/CrossProcessCausalGraphLearnerEngine.ts` (444 LOC) — does this do supervised learning on graph edges? Any overlap with link prediction?

7. `mcp-server/src
... [+1543 chars truncated]

### Assistant | 2026-05-16T01:57:01.892Z

I'll conduct a systematic inventory of the GNN-related infrastructure. Let me start by examining the engine files, then dispatcher wiring, and finally the system-viz graph schema and embeddings.

### Assistant | 2026-05-16T01:57:02.090Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:02.293Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:02.505Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:02.954Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:03.166Z

[tool_use: Glob]

### User | 2026-05-16T01:57:03.263Z

[tool_result] 1	/**
2	 * KnowledgeGraphFeatureProjectorEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN05
3	 *
4	 * Bridges KnowledgeGraphNeuralBridgeEngine's semantic search output into a
5	 * fixed-length feature vector consumable by neural learners. Closes the
6	 * fifth edge from the system-viz analysis: KGNeuralBridge currently has 0
7	 * downstream callers (orphaned). This projector turns its semantic-search
8	 *
... [+10612 chars truncated]

### Assistant | 2026-05-16T01:57:03.371Z

[tool_use: Glob]

### User | 2026-05-16T01:57:03.421Z

[tool_result] 1	/**
2	 * KnowledgeGraphNeuralBridgeEngine — AI-INTEG-MS3
3	 * ================================================
4	 * Bridges the KnowledgeGraph engine with neural reasoning capabilities.
5	 * Enables semantic search, entity embeddings, and graph-augmented reasoning
6	 * across the knowledge base.
7	 *
8	 * Key Features:
9	 *   - HNSW-style approximate nearest neighbor search
10	 *   - Entity embe
... [+40316 chars truncated]

### Assistant | 2026-05-16T01:57:03.591Z

[tool_use: Glob]

### Assistant | 2026-05-16T01:57:03.595Z

[tool_use: Glob]

### Assistant | 2026-05-16T01:57:03.740Z

[tool_use: Glob]

### User | 2026-05-16T01:57:03.838Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Graph Algorithms Engine
3	 *
4	 * Classical graph algorithms for manufacturing planning:
5	 * - Minimum Spanning Tree (Kruskal, Prim)
6	 * - Shortest paths (Bellman-Ford, Floyd-Warshall)
7	 * - Topological sort (Kahn's algorithm)
8	 * - Strongly Connected Components (Kosaraju's)
9	 * - Critical Path Method (CPM)
10	 *
11	 * Ported from PRISM_GRAPH_ALGORITHMS_ENGINE.js
... [+2580 chars truncated]

### User | 2026-05-16T01:57:04.331Z

[tool_result] 1	/**
2	 * CrossProcessCausalGraphLearnerEngine — XPROC-NEURAL Tier 9 (T9-01)
3	 *
4	 * Learns a directed acyclic graph (DAG) over PRISM cross-process variables
5	 * from a stream of `CrossProcessOutcomeEvent` records. Implementation follows
6	 * the PC-stable algorithm (Spirtes & Glymour 1991, Colombo & Maathuis 2014):
7	 *
8	 *   1. Skeleton phase: start with the complete undirected graph over t
... [+3916 chars truncated]

### User | 2026-05-16T01:57:23.711Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-16T01:57:23.871Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-16T01:57:24.131Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-16T01:57:24.149Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-16T01:57:24.181Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-16T01:57:25.830Z

The glob patterns timed out due to broad scope. Let me use more targeted search patterns to find the remaining engines and dispatcher wiring.

### Assistant | 2026-05-16T01:57:26.264Z

[tool_use: Bash]

### Assistant | 2026-05-16T01:57:26.914Z

[tool_use: Grep]

### Assistant | 2026-05-16T01:57:27.550Z

[tool_use: Read]

### User | 2026-05-16T01:57:27.654Z

[tool_result] Found 27 files
mcp-server\src\engines\SpeedFeedOrchestratorEngine.ts
mcp-server\src\engines\NoveltyDetectionEngine.ts
mcp-server\src\engines\CAMLoRAAdapterTrainerEngine.ts
mcp-server\src\engines\CrossProcessOutcomeStore.ts
mcp-server\src\engines\CrossProcessNeuralLearningEngine.ts
mcp-server\src\engines\XProcNeuralAutoFireEngine.ts
mcp-server\src\engines\KnowledgeGraphFeatureProjectorEngine.ts
mcp
... [+1046 chars truncated]

### Assistant | 2026-05-16T01:57:27.718Z

[tool_use: Bash]

### User | 2026-05-16T01:57:29.288Z

[tool_result] 1	{
2	  "schemaVersion": "2.29.0",
3	  "generatedAt": "2026-05-15T14:13:43.917Z",
4	  "meta": {
5	    "counts": {
6	      "engines": 3236,
7	      "dispatchers": 97,
8	      "actions": 7512,
9	      "algorithms": 53,
10	      "registries": 27,
11	      "tests": 3608,
12	      "srcHooks": 54,
13	      "claudeHooks": 550,
14	      "scripts": 701,
15	      "slashLocal": 167,
16	      "slashUser": 392
... [+328 chars truncated]

### User | 2026-05-16T01:57:30.616Z

[tool_result] H:/prism/mcp-server/src/engines/AbrasiveJetMachiningEngine.ts
H:/prism/mcp-server/src/engines/AbsorptionChillerEngine.ts
H:/prism/mcp-server/src/engines/AbstractionHierarchyEngine.ts
H:/prism/mcp-server/src/engines/AccessControlListEngine.ts
H:/prism/mcp-server/src/engines/AccessibilityAnalysisEngine.ts
H:/prism/mcp-server/src/engines/AccountingHardeningEngine.ts
H:/prism/mcp-server/src/engines/Ac
... [+1435 chars truncated]

### User | 2026-05-16T01:57:32.330Z

[tool_result] -rw-r--r-- 1 wompu 197611 37519311 May 14 22:24 _embeddings.jsonl

### Assistant | 2026-05-16T01:57:33.835Z

Good finds. Now let me examine the neural and embedding engines, dispatcher wiring, and embeddings file schema.

### Assistant | 2026-05-16T01:57:34.232Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:34.481Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:34.683Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:34.889Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:35.317Z

[tool_use: Read]

### Assistant | 2026-05-16T01:57:35.499Z

[tool_use: Bash]

### User | 2026-05-16T01:57:37.114Z

[tool_result] 1	/**
2	 * CrossProcessNeuralLearningEngine — pure-JS multi-layer perceptron that
3	 * predicts {success, failure, operator_override} from a CrossProcess
4	 * OutcomeRecord. Trained online from CrossProcessOutcomeStore events.
5	 *
6	 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-02.
7	 *
8	 * Why this exists
9	 * ---------------
10	 * T1-01 (CrossProcessOutcomeStore) gives the system a
... [+6494 chars truncated]

### User | 2026-05-16T01:57:37.274Z

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
... [+5274 chars truncated]

### User | 2026-05-16T01:57:37.402Z

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
... [+4957 chars truncated]

### User | 2026-05-16T01:57:37.484Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+4778 chars truncated]

### system

... [90 middle messages omitted -- see raw_file] ...

### User | 2026-05-16T02:00:51.963Z

[tool_result] Found 3 files
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\tools\dispatchers\intelligenceDispatcher.ts
mcp-server\src\tools\dispatchers\memoryDispatcher.ts

### Assistant | 2026-05-16T02:00:52.310Z

[tool_use: Bash]

### User | 2026-05-16T02:00:52.358Z

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
... [+2254 chars truncated]

### User | 2026-05-16T02:00:52.678Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+5435 chars truncated]

### User | 2026-05-16T02:00:56.735Z

[tool_result] {"__meta":true,"model":"nomic-embed-text","dim":768,"count":14738,"generatedAt":"2026-05-15T03:24:23.096Z"}
{"n":"alg-adaptivecontrollermodel","t":"algorithm","h":"b80e6e75176c1b39","s":0.0013103,"q":

### Assistant | 2026-05-16T02:00:58.283Z

Excellent! Now let me check the specific dispatcher wiring for these engines and look for any TODO/phase-2 markers:

### Assistant | 2026-05-16T02:01:01.611Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:01:01.661Z

[tool_use: Read]

### Assistant | 2026-05-16T02:01:01.695Z

[tool_use: Read]

### Assistant | 2026-05-16T02:01:01.785Z

[tool_use: Grep]

### User | 2026-05-16T02:01:02.587Z

[tool_result] mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:127:  xproc_kg_project_features: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:128:  xproc_kg_feature_layout: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphF
... [+3076 chars truncated]

### User | 2026-05-16T02:01:02.988Z

[tool_result] No matches found

### User | 2026-05-16T02:01:03.166Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
3	 *
4	 * Core intelligence: ~50 actions for compound manufacturing intelligence.
5	 * 200+ actions deprecated — forwarded to focused sub-dispatchers (SYS-MS1):
6	 *   prism_product (40), prism_machine_live (40), prism_integration (42),
7	 *   prism_knowledge_ext (40), prism_diagnosis (38)
8	 *
9	 * @milestone SYS-MS1-U05
10	 *
... [+10558 chars truncated]

### User | 2026-05-16T02:01:03.224Z

[tool_result] 1	/**
2	 * PRISM Memory Graph Dispatcher (#27)
3	 * =====================================
4	 * 
5	 * prism_memory — 6 actions for the F2 cross-session memory graph.
6	 * 
7	 * Actions:
8	 *   get_health       — Graph stats, memory, integrity
9	 *   trace_decision   — Follow decision chain (forward/backward/both)
10	 *   find_similar     — Find similar nodes by dispatcher/action/error
11	 *   get_s
... [+3758 chars truncated]

### Assistant | 2026-05-16T02:01:04.714Z

Let me search more strategically for TODOs and check the KnowledgeGraphNeuralBridgeEngine directly:

### Assistant | 2026-05-16T02:01:05.784Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:01:06.243Z

[tool_use: Read]

### Assistant | 2026-05-16T02:01:06.877Z

[tool_use: Bash]

### User | 2026-05-16T02:01:07.108Z

[tool_result] 1	/**
2	 * KnowledgeGraphNeuralBridgeEngine — AI-INTEG-MS3
3	 * ================================================
4	 * Bridges the KnowledgeGraph engine with neural reasoning capabilities.
5	 * Enables semantic search, entity embeddings, and graph-augmented reasoning
6	 * across the knowledge base.
7	 *
8	 * Key Features:
9	 *   - HNSW-style approximate nearest neighbor search
10	 *   - Entity embe
... [+3416 chars truncated]

### Assistant | 2026-05-16T02:01:07.371Z

[tool_use: Bash]

### User | 2026-05-16T02:01:09.655Z

[tool_result] H:/prism/mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts:      min_similarity: 0.0, // Low threshold for simulated embeddings
H:/prism/mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts:    // Initial semantic search (low threshold for simulated embeddings)
H:/prism/mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts:   * Generate embedding for text (simulated).
H:/prism/
... [+280 chars truncated]

### User | 2026-05-16T02:01:11.336Z

[tool_result] H:/prism/mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts:2
H:/prism/mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts:12
H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts:1
H:/prism/mcp-server/src/engines/CrossProcessCausalGraphLearnerEngine.ts:4

### User | 2026-05-16T02:01:12.091Z

[tool_result]   1140 H:/prism/mcp-server/src/engines/KnowledgeGraphNeuralBridgeEngine.ts
  1627 H:/prism/mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts
   581 H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts
   444 H:/prism/mcp-server/src/engines/CrossProcessCausalGraphLearnerEngine.ts
  3792 total

### Assistant | 2026-05-16T02:01:13.472Z

Perfect! Now let me get the public API exports and check for any edge-cases in the feature projector:

### Assistant | 2026-05-16T02:01:13.908Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:01:14.115Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:01:14.572Z

[tool_use: Read]

### Assistant | 2026-05-16T02:01:14.747Z

[tool_use: Bash]

### User | 2026-05-16T02:01:15.051Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\KnowledgeGraphFeatureProjectorEngine.ts' was already read 4m ago in this session and is unchanged (mtime 1778397993508). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### User | 2026-05-16T02:01:17.740Z

[tool_result] export type IndexableEntityType =
export interface IndexedEntity {
export interface SemanticQuery {
export interface SemanticResult {
export interface GraphContext {
export interface KnowledgeGap {
export interface InferredRelation {
export interface GraphAugmentedStep {
export interface NeuralBridgeStats {
export class KnowledgeGraphNeuralBridgeEngine {
export const knowledgeGraphNeuralBridgeEngi
... [+44 chars truncated]

### User | 2026-05-16T02:01:18.164Z

[tool_result] export const SCHEMA_VERSION = "2.3.0";
export const INPUT_DIM =
export const HIDDEN_DIM = 16;
export const OUTPUT_DIM = 3;
export const FLAT_PARAM_DIM =
export const CLASS_SUCCESS = 0;
export const CLASS_FAILURE = 1;
export const CLASS_OVERRIDE = 2;
export interface NeuralConfig {
export interface TrainOpts {
export interface TrainResult {
export interface ClassProbs {
export interface PredictionR
... [+364 chars truncated]

### User | 2026-05-16T02:01:18.962Z

[tool_result] H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts:export interface WeightedEdge {
H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts:export interface MSTResult {
H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts:export interface ShortestPathResult {
H:/prism/mcp-server/src/engines/GraphAlgorithmsEngine.ts:export interface FloydWarshallResult {
H:/prism/mcp-server/src/engines/Gr
... [+1839 chars truncated]

### Assistant | 2026-05-16T02:01:20.537Z

Now let me get the KnowledgeGraphFeatureProjectorEngine content from my earlier read and check the aiReasoningDispatcher actions more thoroughly:

### Assistant | 2026-05-16T02:01:20.976Z

[tool_use: Read]

### Assistant | 2026-05-16T02:01:21.391Z

[tool_use: Bash]

### Assistant | 2026-05-16T02:01:21.718Z

[tool_use: Bash]

### User | 2026-05-16T02:01:22.192Z

[tool_result] 120	  xproc_ewc_constants: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
121	  // Tier 4 — Reinforcement learning
122	  xproc_reward_shape: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
123	  xproc_reward_audit: () => import("../../engines/CrossProcessRewardShaperEngi
... [+25871 chars truncated]

### User | 2026-05-16T02:01:26.226Z

[tool_result] 36:// ALL_AI_ACTIONS is the wire-level tuple used by z.enum(...); ALL_AI_SCHEMAS
127:  xproc_kg_project_features: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
128:  xproc_kg_feature_layout: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
178:  xpr
... [+1760 chars truncated]

### User | 2026-05-16T02:01:27.013Z

[tool_result] 42:    "Cross-session memory graph + semantic vector recall + agent memory fabric. Actions: get_health, trace_decision, find_similar, get_session, get_node, run_integrity, consolidate, consolidation_stats, consolidation_patterns, record_session_end, semantic_search, remember, agent_memory_remember, agent_memory_query, agent_memory_reinforce, agent_memory_forget, agent_memory_stats, emerging_thesis
... [+1074 chars truncated]

### Assistant | 2026-05-16T02:02:04.346Z

Perfect! Now I have enough data. Let me compile a comprehensive summary. I'll generate the final report as structured text.

---

## GNN Link-Prediction Infrastructure Inventory

**Status: SUBSTANTIAL SCAFFOLDING EXISTS — mostly production-ready, one engine uses simulated embeddings.**

### ENGINES — DETAILED AUDIT

#### 1. **KnowledgeGraphNeuralBridgeEngine.ts** (1140 LOC)
- **Embedding approach:** SIMULATED (placeholder), not real Ollama
  - Line 37: `EMBEDDING_DIM = 384` — hardcoded dimension
  - Lines 142, 199: Comments explicitly state "simulated embedding dimension" and "Generate embedding for text (simulated)"
- **Public API surface:**
  - Class: `KnowledgeGraphNeuralBridgeEngine` (exported)
  - Singleton export: `knowledgeGraphNeuralBridgeEngine`
  - Key exported interfaces: `IndexedEntity`, `SemanticQuery`, `SemanticResult`, `GraphContext`, `KnowledgeGap`, `InferredRelation`, `GraphAugmentedStep`, `NeuralBridgeStats`
  - HNSW index support: M=16, ef_construction=200, ef_search=50, max_size=50K
- **Dispatcher wiring:** NOT exposed via dispatcher actions (no direct action mapping found)
- **Reusability:** HNSW indexing could be reused; semantic search pipeline is foundational

#### 2. **KnowledgeGraphFeatureProjectorEngine.ts** (268 LOC)
- **Output shape:** 8-dimensional features (confirmed in grep earlier read)
- **Downstream consumer:** `CrossProcessNeuralLearningEngine` (wired via `xproc_kg_project_features`, `xproc_kg_feature_layout`)
- **Static methods:** Engine exports `knowledgeGraphFeatureProjectorDispatch` as dispatcher entry point
- **Dispatcher actions:** `xproc_kg_project_features`, `xproc_kg_feature_layout` (aiReasoningDispatcher, lines 127-128)
- **Current status:** Fully wired and operational

#### 3. **CrossProcessNeuralLearningEngine.ts** (1627 LOC)
- **Architecture:** Pure-JS multi-layer perceptron (MLP), NOT RNN/transformer
  - Input: 144 dims (7 numeric + 5 bridge + 3 process + 64 material buckets + 16 tool + 16 machine + 16 operation + 4 
... [+8532 chars truncated]
