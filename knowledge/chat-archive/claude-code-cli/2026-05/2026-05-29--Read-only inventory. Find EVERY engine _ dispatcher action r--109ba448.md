---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Read-only inventory. Find EVERY engine + dispatcher action related to system-viz"
date: "2026-05-29"
first_ts: "2026-05-29T13:22:22.820Z"
last_ts: "2026-05-29T13:35:49.581Z"
cwd: "H:\\prism-slot-sierra"
messages: 107
user_msgs: 45
assistant_msgs: 62
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_87652bd2-4ab/agent-a88205262ee5def5d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Read-only inventory. Find EVERY engine + dispatcher action related to system-viz

> **claude-code-cli** | 2026-05-29 | 107 msgs (45 user / 62 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_87652bd2-4ab/agent-a88205262ee5def5d.jsonl`

## Transcript

### User | 2026-05-29T13:22:22.820Z

Read-only inventory. Find EVERY engine + dispatcher action related to system-viz / graph / regen-viz / ghost-roost / master-index in H:/prism. Prefer: grep mcp-server/src/engines for SystemViz/Viz/Graph engine classes; grep mcp-server/src/tools/dispatchers for system-viz/viz/graph actions; read H:/prism/mcp-server/src/engines/system-viz/CLAUDE.md for the curated list. Return engine source paths + dispatcher.action pairs, 1-line role each. Be concise — do NOT parse system-graph.json (370MB, will OOM).

### Assistant | 2026-05-29T13:22:37.449Z

I'll search for system-viz, graph, regen-viz, and ghost-roost related engines and dispatcher actions in the H:/prism directory.

### Assistant | 2026-05-29T13:22:37.765Z

[tool_use: Bash]

### User | 2026-05-29T13:23:15.071Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect
Not a git repo

### Assistant | 2026-05-29T13:23:16.679Z

Let me correct that for PowerShell:

### Assistant | 2026-05-29T13:23:16.883Z

[tool_use: Bash]

### User | 2026-05-29T13:24:23.822Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: cd: /mnt/h/prism: No such file or directory

### Assistant | 2026-05-29T13:24:27.339Z

Let me try Windows path format:

### Assistant | 2026-05-29T13:24:29.649Z

[tool_use: Bash]

### User | 2026-05-29T13:26:26.120Z

[tool_result] %SystemDrive%/
.claude/
.claude-flow/
.claude-octopus/
.claude-profiles/
.claude-user-state/
.codex/
.codex-temp/
.codex_vendor/
.cron-locks/
.github/
.husky/
.lsmcp/
.playwright-cli/
.playwright-mcp/
.scratch/
.sessions/
.swarm/
.taskmaster/
.tmp/

### Assistant | 2026-05-29T13:26:31.690Z

Good. Now let me search for system-viz engine definitions and dispatcher actions:

### Assistant | 2026-05-29T13:26:31.827Z

[tool_use: Glob]

### User | 2026-05-29T13:26:43.247Z

[tool_result] H:/prism/mcp-server/src/engines\BatchProcessor.ts
H:/prism/mcp-server/src/engines\DfMRulesEngine.ts
H:/prism/mcp-server/src/engines\DiffEngine.ts
H:/prism/mcp-server/src/engines\FinancialAnalysisEngine.ts
H:/prism/mcp-server/src/engines\GCodeTemplateEngine.ts
H:/prism/mcp-server/src/engines\IntentDecompositionEngine.ts
H:/prism/mcp-server/src/engines\PurchasingDirectoryEngine.ts
H:/prism/mcp-serve
... [+5207 chars truncated]

### Assistant | 2026-05-29T13:26:48.876Z

Let me search more specifically for system-viz and related engines:

### Assistant | 2026-05-29T13:26:49.717Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:26:50.340Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:26:50.400Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:26:50.403Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:26:50.725Z

[tool_use: Glob]

### User | 2026-05-29T13:26:59.505Z

[tool_result] No files found

### User | 2026-05-29T13:26:59.702Z

[tool_result] No files found

### User | 2026-05-29T13:26:59.716Z

[tool_result] No files found

### User | 2026-05-29T13:26:59.954Z

[tool_result] No files found

### User | 2026-05-29T13:27:00.517Z

[tool_result] Found 6 files
H:\prism\mcp-server\src\engines\GraphImportanceEngine.ts
H:\prism\mcp-server\src\engines\GraphQLSchemaEngine.ts
H:\prism\mcp-server\src\engines\MasterIndexEngine.ts
H:\prism\mcp-server\src\engines\VizAutoAugmentationEngine.ts
H:\prism\mcp-server\src\engines\GraphTheoryEngine.ts
H:\prism\mcp-server\src\engines\GraphAlgorithmsEngine.ts

### Assistant | 2026-05-29T13:27:02.645Z

Good hints. Let me check the pre-indexed documents first:

### Assistant | 2026-05-29T13:27:03.350Z

[tool_use: Read]

### Assistant | 2026-05-29T13:27:03.354Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:27:03.357Z

[tool_use: Glob]

### User | 2026-05-29T13:27:10.510Z

[tool_result] No files found

### User | 2026-05-29T13:27:10.553Z

[tool_result] No files found

### User | 2026-05-29T13:27:11.466Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-596 of 3228 total (114910 tokens, cap 25000). Call Read with offset=597 limit=596 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries f
... [+43844 chars truncated]

### Assistant | 2026-05-29T13:27:14.374Z

Let me search for system-viz references in the digest and dispatcher tools:

### Assistant | 2026-05-29T13:27:14.898Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:27:15.398Z

[tool_use: Bash]

### Assistant | 2026-05-29T13:27:15.505Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:27:16.279Z

[tool_use: Read]

### User | 2026-05-29T13:27:29.086Z

[tool_result] No matches found

### User | 2026-05-29T13:27:29.992Z

[tool_result] No files found

### User | 2026-05-29T13:27:33.104Z

[tool_result] 1	/**
2	 * MasterIndexEngine — Unified Master Search Across Obsidian Vault + System-Viz + Awareness
3	 *
4	 * Goal: ONE query call replaces N Grep/Glob/Agent calls. Future Claude/Codex
5	 * sessions hit `prism_session:master_index_query` first; only fall back to
6	 * filesystem search when this returns no high-confidence hits.
7	 *
8	 * Fuses 4 pre-built indexes (no parallel infra — all sources al
... [+2208 chars truncated]

### User | 2026-05-29T13:28:47.365Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/agentDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.t
... [+910 chars truncated]

### system

... [27 middle messages omitted -- see raw_file] ...

### User | 2026-05-29T13:31:56.912Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-29T13:31:59.609Z

Let me search more efficiently using grep on the dispatcher files directly:

### Assistant | 2026-05-29T13:32:00.670Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:32:01.348Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:32:01.480Z

[tool_use: Read]

### User | 2026-05-29T13:32:17.866Z

[tool_result] 163:  // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX: unified master search across system-viz + obsidian + capability index + BUILD_STATE
164:  "master_index_query",
165:  "master_index_node_status",
169:  "master_index_utilization_dashboard",
1767:          // search across system-viz graph + Obsidian vault + capability index
1768:          // + BUILD_STATE. Future hot path under master-index-precheck-i
... [+159 chars truncated]

### User | 2026-05-29T13:32:18.505Z

[tool_result] 1639:            // regen-viz pipeline (FAST mode) — it rebuilds all augmentations,
1648:            const args = ["--max-old-space-size=16384", "--stack-size=8192", "H:/prism/scripts/regen-viz.mjs"];
1658:              pipeline: "regen-viz.mjs",
1660:                "H:/prism/state/shared/system-viz/system-graph.json",
1662:                "H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.md",
... [+168 chars truncated]

### User | 2026-05-29T13:32:21.093Z

[tool_result] 1	/**
2	 * Session Dispatcher — session lifecycle, state management, and context control.
3	 * (Action count auto-tracked in PRISM-INVENTORY-LATEST.md; the static "48 actions"
4	 * header from the original module has been corrected — refer to ACTIONS.length and
5	 * the inventory file for live counts.)
6	 *
7	 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
8
... [+4043 chars truncated]

### Assistant | 2026-05-29T13:32:23.613Z

Excellent. Let me now read those dispatcher files more completely and search for the graph/viz engines:

### Assistant | 2026-05-29T13:32:24.046Z

[tool_use: Read]

### Assistant | 2026-05-29T13:32:24.471Z

[tool_use: Read]

### Assistant | 2026-05-29T13:32:25.073Z

[tool_use: Grep]

### User | 2026-05-29T13:32:39.147Z

[tool_result] Found 92 files
H:\prism\mcp-server\src\engines\MemoryGraphEngine.ts
H:\prism\mcp-server\src\engines\GraphImportanceEngine.ts
H:\prism\mcp-server\src\engines\GraphQLSchemaEngine.ts
H:\prism\mcp-server\src\engines\HybridIndexEngine.ts
H:\prism\mcp-server\src\engines\MasterIndexEngine.ts
H:\prism\mcp-server\src\engines\CADKnowledgeGraphEngine.ts
H:\prism\mcp-server\src\engines\LatheKnowledgeGraphEngi
... [+5397 chars truncated]

### User | 2026-05-29T13:32:40.302Z

[tool_result] 160	  "doc_render",
161	  // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): compact event → top-N hook ids map (mirrors dispatcher_map_compact for hooks)
162	  "hook_map_compact",
163	  // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX: unified master search across system-viz + obsidian + capability index + BUILD_STATE
164	  "master_index_query",
165	  "master_index_node_status",
166	  // PSN-ENHANCE-MS0/U-PSN-HYBR
... [+1436 chars truncated]

### User | 2026-05-29T13:32:41.287Z

[tool_result] 1	/**
2	 * Knowledge Dispatcher - Consolidates 5 knowledge tools → 1
3	 * Actions: search, cross_query, formula, relations, stats
4	 * Uses KnowledgeQueryEngine for cross-registry search
5	 */
6	import { z } from "zod";
7	import { log } from "../../utils/Logger.js";
8	import { slimResponse } from "../../utils/responseSlimmer.js";
9	import { validateActionParams, dispatcherError } from "../../utils
... [+3184 chars truncated]

### Assistant | 2026-05-29T13:32:44.623Z

Perfect! Now let me read the key engine headers and collect the dispatcher actions:

### Assistant | 2026-05-29T13:32:45.054Z

[tool_use: Read]

### Assistant | 2026-05-29T13:32:45.307Z

[tool_use: Read]

### Assistant | 2026-05-29T13:32:45.609Z

[tool_use: Read]

### Assistant | 2026-05-29T13:32:45.744Z

[tool_use: Read]

### User | 2026-05-29T13:33:02.004Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Graph Theory Engine
3	 *
4	 * Graph theory algorithms applied to manufacturing optimization:
5	 * - dag_schedule: DAG precedence scheduling (topological sort + critical path)
6	 * - mst: Minimum spanning tree for toolpath linking (Prim's algorithm)
7	 * - tsp: Traveling salesman for hole pattern optimization (nearest-neighbor + 2-opt)
8	 * - max_flow: Chip evacuation 
... [+579 chars truncated]

### User | 2026-05-29T13:33:02.095Z

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
... [+473 chars truncated]

### User | 2026-05-29T13:33:02.945Z

[tool_result] 1	/**
2	 * SpectralGraphEngine — Reverse-engineered from PRISM v8.89 monolith
3	 *
4	 * Spectral graph theory for CAD mesh analysis:
5	 * - Face adjacency graph construction
6	 * - Graph Laplacian computation
7	 * - Power iteration for eigenvectors
8	 * - Fiedler vector spectral partitioning
9	 * - Mesh complexity analysis
10	 *
11	 * Manufacturing applications: feature recognition, mesh segmentat
... [+614 chars truncated]

### User | 2026-05-29T13:33:03.013Z

[tool_result] 1	/**
2	 * HybridIndexEngine — HMEMV10 RRF fusion of BM25 + semantic results.
3	 *
4	 * Pure-core hybrid retrieval fuser: caller supplies two ranked candidate
5	 * lists (BM25 sparse + semantic dense) keyed by entry_id; engine fuses via
6	 * Reciprocal Rank Fusion (RRF) and returns one unified ranking.
7	 *
8	 * Formula:
9	 *   RRF(d) = Σ_listᵢ 1 / (k + rank_listᵢ(d))
10	 *
11	 * The unranked-in-a
... [+594 chars truncated]

### Assistant | 2026-05-29T13:33:11.046Z

Let me compile findings now. I have found the key engines and dispatcher actions. Let me gather the remaining information about dispatcher wiring:

### Assistant | 2026-05-29T13:33:12.016Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:33:12.556Z

[tool_use: Grep]

### User | 2026-05-29T13:33:21.430Z

[tool_result] 161-  \ HOOK-SYNERGY-MS0\U-HOOK-REGISTRY (H2): compact event → top-N hook ids map (mirrors dispatcher_map_compact for hooks)
162-  "hook_map_compact",
163:  // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX: unified master search across system-viz + obsidian + capability index + BUILD_STATE
164:  "master_index_query",
165:  "master_index_node_status",
166-  \ PSN-ENHANCE-MS0\U-PSN-HYBRID-MCP-WIRE (sierra it
... [+1660 chars truncated]

### User | 2026-05-29T13:33:21.648Z

[tool_result] 1639:            // regen-viz pipeline (FAST mode) — it rebuilds all augmentations,
1648:            const args = ["--max-old-space-size=16384", "--stack-size=8192", "H:/prism/scripts/regen-viz.mjs"];
1658:              pipeline: "regen-viz.mjs",

### Assistant | 2026-05-29T13:33:24.346Z

Let me get the final dispatcher action details and compile the full inventory:

### Assistant | 2026-05-29T13:33:27.325Z

[tool_use: Read]

### Assistant | 2026-05-29T13:33:27.441Z

[tool_use: Read]

### Assistant | 2026-05-29T13:33:27.542Z

[tool_use: Bash]

### User | 2026-05-29T13:33:44.110Z

[tool_result] 1630	          }
1631	          case "obsidian_plugin_status": {
1632	            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
1633	            result = obsidianPluginBridgeEngine.status(params.api_key);
1634	            break;
1635	          }
1636	          // -- OBSIDIAN-VIZ-MS0/U-VIZ-DISPATCHER: live system map ──────
1637	          case "
... [+4377 chars truncated]

### User | 2026-05-29T13:33:44.121Z

[tool_result] 1786	          case "master_index_query": {
1787	            const { masterIndexEngine } = await import("../../engines/MasterIndexEngine.js");
1788	            const query = String(params.query ?? params.q ?? "");
1789	            const opts: Record<string, unknown> = {};
1790	            if (params.limit != null) opts.limit = Number(params.limit);
1791	            if (Array.isArray(params.layers)
... [+2808 chars truncated]

### User | 2026-05-29T13:35:15.563Z

[tool_result] H:/prism/mcp-server/src/engines/index.ts
H:/prism/mcp-server/src/engines/index.ts-1
H:/prism/mcp-server/src/engines/index.ts-2
H:/prism/mcp-server/src/engines/system-viz

### Assistant | 2026-05-29T13:35:25.849Z

Perfect! Now I have enough information. Let me compile the complete inventory and return the structured output:

### Assistant | 2026-05-29T13:35:37.933Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:35:43.270Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T13:35:49.581Z

Perfect! I've completed the read-only inventory search. Here's the summary:

## Found Inventory: System-Viz / Graph / Master-Index Engines & Dispatcher Actions

**7 Engine Classes:**
1. **MasterIndexEngine** — Unified search across 110K-node system-viz graph + Obsidian vault + capability index + BUILD_STATE
2. **GraphImportanceEngine** — Personalized PageRank for node importance; powers semantic-zoom, blast-radius, ghost-roost confidence
3. **VizAutoAugmentationEngine** — Auto-learns synergy findings → augmentation documents for regen-viz pipeline
4. **GraphTheoryEngine** — DAG scheduling, MST, TSP, max-flow, graph coloring for manufacturing
5. **GraphAlgorithmsEngine** — Kruskal/Prim MST, shortest paths, topological sort, SCC, CPM ported from monolith
6. **SpectralGraphEngine** — Spectral analysis for CAD mesh (Laplacian, Fiedler partitioning, segmentation)
7. **HybridIndexEngine** — RRF fusion of BM25 + semantic results (k=60)

**Dispatcher Actions (prism_session + prism_knowledge):**
- `prism_session.master_index_query` — Search master index with layer/source/stopword filtering
- `prism_session.master_index_node_status` — Get node lifecycle & utilization metadata
- `prism_session.master_index_utilization_dashboard` — Graph-wide topology classifier (hub/sink/source/orphan/ghost)
- `prism_knowledge.obsidian_viz_regenerate` — Spawn regen-viz.mjs (FAST 60s or FULL 15-20m)
- `prism_knowledge.obsidian_viz_status` — System-graph snapshot (nodes/edges/layers + recall counter)
- `prism_knowledge.obsidian_viz_recall_top` — Top-N recalled wiki/memory entries for feedback loops

**Key Artifact:** `H:/prism/scripts/regen-viz.mjs` orchestrates the full augmentation→merge→repair→dedup→git-tree pipeline.
