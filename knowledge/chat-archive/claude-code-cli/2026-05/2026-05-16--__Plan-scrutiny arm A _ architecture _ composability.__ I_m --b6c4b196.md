---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "**Plan-scrutiny arm A — architecture + composability.** I'm in plan mode for a n"
date: "2026-05-16"
first_ts: "2026-05-16T02:16:46.170Z"
last_ts: "2026-05-16T02:18:42.914Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a0ef52db1700cff85.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# **Plan-scrutiny arm A — architecture + composability.** I'm in plan mode for a n

> **claude-code-cli** | 2026-05-16 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a0ef52db1700cff85.jsonl`

## Transcript

### User | 2026-05-16T02:16:46.170Z

**Plan-scrutiny arm A — architecture + composability.** I'm in plan mode for a new milestone `NN-GRAPH-MS0` (hybrid neural-symbolic GNN over PRISM's system-viz graph). Read the canonical plan file at `H:\.claude\plans\steady-kindling-tide.md` end-to-end before reviewing.

**Your scoped focus** (do NOT cover quality-gates/training-rigor, data-integrity, risk/adversarial, or dispatcher-wiring — peer agents own those, you must not duplicate):

1. **Engine boundaries.** Are the 2 proposed net-new engines (`Node2VecGraphEmbedderEngine`, `GraphSAGELinkPredictorEngine`) correctly scoped? Should the work be split differently (e.g., should random-walk be its own engine, not an extension to `GraphAlgorithmsEngine`)? Should the GraphSAGE training loop be a separate `GraphSAGETrainerEngine` from the inference engine?

2. **Composition correctness.** The plan reuses (a) `OllamaEmbedderEngine` via `memoryDispatcher.embed_text`, (b) `KnowledgeGraphFeatureProjectorEngine` for an 8-d feature block, (c) wiki's `_embeddings.jsonl` for ~14k pre-cached vectors, (d) plans to EXTEND `GraphAlgorithmsEngine` with a `randomWalk` static method rather than building a parallel engine. Verify these compositions are sane — read the relevant engine files (`H:/prism/mcp-server/src/engines/OllamaEmbedderEngine.ts`, `KnowledgeGraphFeatureProjectorEngine.ts`, `GraphAlgorithmsEngine.ts`) and report whether the proposed reuses will actually integrate cleanly. Flag any API mismatch, hidden coupling, or place where the plan would step on existing semantics.

3. **Missed existing infrastructure.** Did I miss any engine that already does part of what `NN-GRAPH-MS0` proposes? Check the engine list at `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` and grep for `graph`, `embed`, `learn`, `gnn`, `predict`, `neural`, `walk`, `sage` — flag any near-miss the plan should compose over instead of duplicate. Especially watch for *training-pipeline* engines I may have overlooked.

4. **Feature-vector composition.** T
... [+1364 chars truncated]

### Assistant | 2026-05-16T02:16:51.697Z

I'll review the plan with focus on engine boundaries, composition, and surgical-edit safety. Let me read the canonical plan and the key engines it proposes to compose over.

### Assistant | 2026-05-16T02:16:51.762Z

[tool_use: Read]

### User | 2026-05-16T02:16:52.747Z

[tool_result] 1	# Plan — `[NN-GRAPH-MS0]` Hybrid Neural-Symbolic GNN over system-viz
2	
3	## Context
4	
5	**Why this milestone exists.** PRISM's `state/shared/system-viz/system-graph.json` (373,635 nodes / 592,378 edges as of this session) is currently a *retrieval substrate* — used for keyword search, audit-viz-first redirects, and the 4-tier wiring-inference pipeline (keyword → expanded-keyword → sibling-pref
... [+34429 chars truncated]

### Assistant | 2026-05-16T02:16:57.552Z

Now let me read the canonical engines the plan claims to compose over.

### Assistant | 2026-05-16T02:16:58.074Z

[tool_use: Read]

### User | 2026-05-16T02:16:58.503Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OllamaEmbedderEngine.ts' was already read 16m ago in this session and is unchanged (mtime 1778278938542). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-16T02:17:02.791Z

[tool_use: Read]

### User | 2026-05-16T02:17:03.261Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\KnowledgeGraphFeatureProjectorEngine.ts' was already read 20m ago in this session and is unchanged (mtime 1778397993508). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-16T02:17:05.314Z

[tool_use: Read]

### User | 2026-05-16T02:17:06.168Z

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
... [+20976 chars truncated]

### Assistant | 2026-05-16T02:17:10.586Z

I have the file already. Let me check key engines and infrastructure the plan claims to compose over.

### Assistant | 2026-05-16T02:17:13.119Z

[tool_use: Grep]

### User | 2026-05-16T02:17:13.684Z

[tool_result] 119:export class KnowledgeGraphFeatureProjectorEngine {
120:  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
121:  static readonly unit = "U-CN05";
122:  static readonly featureDim = KG_FEATURE_DIM;
135:  static project(input: unknown): ProjectResult {
230:  static featureLayout(): Array<{ index: number; name: string; description: string }> {
251:export const knowledgeGraphFeatureProjecto
... [+47 chars truncated]

### Assistant | 2026-05-16T02:17:14.568Z

[tool_use: Grep]

### User | 2026-05-16T02:17:15.148Z

[tool_result] 107:export class OllamaEmbedderEngine {

### Assistant | 2026-05-16T02:17:16.523Z

[tool_use: Grep]

### User | 2026-05-16T02:17:17.131Z

[tool_result] 3:## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
5:- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
17:- **ActiveLearningStrategyEngine**: Rank learning targets by expected info gain
19:- **ActualVsPredictedCollectorEngine**: Neural Training Feedback Collector (U-MIO31A)
20:- **AdaLoRARankAllocatorEngine**: U-LEARN-05
6
... [+5856 chars truncated]

### Assistant | 2026-05-16T02:17:20.312Z

Already searched the digest. Let me check the projector's input shape, OllamaEmbedder's API, and graph node-shape to validate composition correctness.

### Assistant | 2026-05-16T02:17:22.324Z

[tool_use: Read]

### User | 2026-05-16T02:17:23.259Z

[tool_result] 1	/**
2	 * KnowledgeGraphFeatureProjectorEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN05
3	 *
4	 * Bridges KnowledgeGraphNeuralBridgeEngine's semantic search output into a
5	 * fixed-length feature vector consumable by neural learners. Closes the
6	 * fifth edge from the system-viz analysis: KGNeuralBridge currently has 0
7	 * downstream callers (orphaned). This projector turns its semantic-search
8	 *
... [+10206 chars truncated]

### Assistant | 2026-05-16T02:17:23.333Z

[tool_use: Read]

### User | 2026-05-16T02:17:24.096Z

[tool_result] 90	}
91	
92	/** Cosine similarity of two equal-length vectors. */
93	export function cosine(a: readonly number[], b: readonly number[]): number {
94	  if (a.length === 0 || a.length !== b.length) return 0;
95	  let dot = 0;
96	  let na = 0;
97	  let nb = 0;
98	  for (let i = 0; i < a.length; i++) {
99	    dot += a[i] * b[i];
100	    na += a[i] * a[i];
101	    nb += b[i] * b[i];
102	  }
103	  if (n
... [+3848 chars truncated]

### Assistant | 2026-05-16T02:17:25.458Z

[tool_use: Grep]

### User | 2026-05-16T02:17:26.052Z

[tool_result] 619:- **CrossProcessCausalGraphLearnerEngine**: XPROC-NEURAL Tier 9 (T9-01)
1056:- **GraphAlgorithmsEngine**: Graph Algorithms Engine
1057:- **GraphTheoryEngine**: Graph Theory Engine
1315:- **KnowledgeGraphNeuralBridgeEngine**: AI-INTEG-MS3

### Assistant | 2026-05-16T02:18:42.914Z

Acknowledged (read-only; no edits). I have everything I need.

Critical findings to verify: (a) `KnowledgeGraphFeatureProjectorEngine.project()` consumes `OutcomeRecord` (process + request_summary with operation/material/tool_material/machine_family/customer/feature) — NOT a system-viz graph node (kind/label/info), (b) `OllamaEmbedderEngine` exposes async instance method `embed(text)` returning `{ok, vector|error}` not a `static embed`, (c) dispatch action is `xproc_kg_project_features` confirmed via grep, (d) the engine returns `OutcomeRecord`-shape inputs only and degrades to zero-features on no-info — meaning on system-viz nodes it returns the zero-vector for every node. P0.

---

## Plan Scrutiny — Arm A (Architecture + Composability)

**Verdict: FAIL — requires major rework before ExitPlanMode.** Two P0 composition errors and one P0 engine-convention violation. The 912-d feature claim is structurally false as written, and the most-used "compose" engine (`OllamaEmbedderEngine`) is not callable the way U2 describes. Once the P0s are fixed the milestone is well-scoped; the breakdown into 7 units is otherwise sensible.

---

### Findings

**1. [P0] `KnowledgeGraphFeatureProjectorEngine` cannot project a system-viz node — input-shape mismatch.**
Read `KnowledgeGraphFeatureProjectorEngine.ts` lines 12–34, 63–74, 101–110. The Zod schema requires `record.process` + `record.request_summary` with keys `operation/material/tool_material/machine_family/customer/feature`. A system-viz node has `{id, kind, label, info, layer}` — none of those keys exist. `buildQueryString()` will return `""` and the engine returns 8 zeros + a warning ("empty query… returning zero features"). Every node gets the same zero vector — the 8-d block contributes literally no signal. The plan's claim that this is a "direct compose" is incorrect. **Fix:** either (a) build a new system-viz-node projector (still 8-d but features like in-degree-normalized / out-degree-normalized / layer-onehot-collapsed 
... [+9232 chars truncated]
