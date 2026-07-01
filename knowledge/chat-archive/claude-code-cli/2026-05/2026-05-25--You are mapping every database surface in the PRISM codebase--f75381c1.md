---
type: "chat-session"
source: "claude-code-cli"
session_id: "f75381c1-8dd5-4f49-8c43-738601f43b17"
title: "You are mapping every database surface in the PRISM codebase at H:/prism. The us"
date: "2026-05-25"
first_ts: "2026-05-25T20:04:35.015Z"
last_ts: "2026-05-25T20:13:31.682Z"
cwd: "H:\\prism"
messages: 74
user_msgs: 32
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/f75381c1-8dd5-4f49-8c43-738601f43b17/subagents/agent-a8e7430b25bbe67f3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are mapping every database surface in the PRISM codebase at H:/prism. The us

> **claude-code-cli** | 2026-05-25 | 74 msgs (32 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f75381c1-8dd5-4f49-8c43-738601f43b17/subagents/agent-a8e7430b25bbe67f3.jsonl`

## Transcript

### User | 2026-05-25T20:04:35.015Z

You are mapping every database surface in the PRISM codebase at H:/prism. The user wants to bridge/wire similar databases to compatible nodes across PSN (PRISM Synergy Network) + /system-viz + the entire PRISM app.

CONTEXT
- PRISM is a manufacturing-intelligence platform (mill/lathe/wedm/cad/cam)
- It has many storage backends — vector DBs, SQLite, JSON, AgentDB, etc.
- The 11-leg PSN (PRISM Synergy Network) is: Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI
- /system-viz is the visual system map with ghost/built/wired node classifications
- Knowledge file: H:/prism/knowledge/memories/feedback/feedback_psn_definition.md
- Inventory live counts: H:/prism/PRISM-INVENTORY-LATEST.md
- Build state: H:/prism/state/shared/BUILD_STATE.md
- System graph: H:/prism/state/shared/system-viz/system-graph.json (large — read selectively)
- Knowledge vault schema: H:/prism/knowledge/wiki/architecture/knowledge-vault-schema.md

YOUR DELIVERABLE — return under 800 words as a structured report:

1) **Database surface inventory** — list every distinct DB-like storage backend with:
   - Backend type (vector / SQLite / JSON / Markdown-vault / etc.)
   - Owning engine(s) (e.g. QdrantMemoryEngine, AgentDBClient)
   - Owning dispatcher action(s) (e.g. prism_memory:store)
   - File/path on disk

2) **Similar-or-duplicate groups** — which DBs hold overlapping/compatible data and should be bridged?
   Examples to investigate: vector stores (Qdrant vs ONNX embeddings vs HNSW vs RaBitQ vs AgentDB vector), key-value stores (memory.db vs hive-mind memory vs reflexion memory), graph stores (system-graph vs causal-graph vs NN-graph), JSON state files that overlap.

3) **Bridge candidates** — for each similar-group, name:
   - The bridge engine that exists or should exist (e.g. `MemoryBridgeEngine`)
   - Where the bridge is wired (which dispatchers reference it) or where it should be wired
   - Which PSN leg(s) each DB belongs t
... [+814 chars truncated]

### Assistant | 2026-05-25T20:04:44.429Z

I'll systematically map the database surfaces across PRISM. Let me start with a parallel scan for storage backends, engines, and dispatcher actions.

### Assistant | 2026-05-25T20:04:44.846Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:45.013Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:45.260Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:45.350Z

[tool_use: Glob]

### User | 2026-05-25T20:05:14.211Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-25T20:05:14.217Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-25T20:05:14.217Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-25T20:05:14.307Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-25T20:05:16.490Z

Let me narrow the scope to the engines directory:

### Assistant | 2026-05-25T20:05:16.961Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:05:17.224Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:05:17.366Z

[tool_use: Bash]

### User | 2026-05-25T20:06:24.450Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-05-25T20:06:33.816Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-05-25T20:06:37.896Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-25T20:06:40.496Z

Let me use POSIX find in bash instead:

### Assistant | 2026-05-25T20:06:41.085Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:06:41.542Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:06:41.547Z

[tool_use: Bash]

### User | 2026-05-25T20:07:00.736Z

[tool_result] H:/prism/mcp-server/src/engines/A2AProtocolEngine.ts
H:/prism/mcp-server/src/engines/AbrasiveJetMachiningEngine.ts
H:/prism/mcp-server/src/engines/AbsorptionChillerEngine.ts
H:/prism/mcp-server/src/engines/AbstractionHierarchyEngine.ts
H:/prism/mcp-server/src/engines/AccessControlListEngine.ts
H:/prism/mcp-server/src/engines/AccessibilityAnalysisEngine.ts
H:/prism/mcp-server/src/engines/Accounting
... [+1424 chars truncated]

### User | 2026-05-25T20:07:04.194Z

[tool_result] H:/prism/.cache/temp/prism-hook-state/memory-relevance-seen.json
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/memory/package.json
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/worktrees/adr-120-impl/plugins/ruflo-rag-memory/.claude-plugin/plugin.json
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/worktrees/adr-120-impl
... [+1281 chars truncated]

### User | 2026-05-25T20:07:29.301Z

[tool_result] H:/prism/%SystemDrive%/ProgramData/Microsoft/Windows/Caches/cversions.2.db
H:/prism/%SystemDrive%/ProgramData/Microsoft/Windows/Caches/{65DB5256-06DB-4E52-AA6E-ADB48FDD37AE}.2.ver0x0000000000000001.db
H:/prism/%SystemDrive%/ProgramData/Microsoft/Windows/Caches/{6AF0698E-D558-4F6E-9B3C-3716689AF493}.2.ver0x0000000000000003.db
H:/prism/%SystemDrive%/ProgramData/Microsoft/Windows/Caches/{6AF0698E-D55
... [+2415 chars truncated]

### Assistant | 2026-05-25T20:07:31.946Z

Let me search for storage-related engines and dispatcher actions with grep:

### Assistant | 2026-05-25T20:07:33.100Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:07:33.449Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:07:33.453Z

[tool_use: Read]

### User | 2026-05-25T20:07:33.618Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/src/dispatchers. Note: your current working directory is H:\prism.</tool_use_error>

### User | 2026-05-25T20:07:42.081Z

[tool_result] 1	---
2	name: psn-definition
3	description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
4	aliases: feedback_psn_definition
5	type: feedback
6	source: prism-memory
7	synced: 2026-05-25T20:06:24.553Z
8	---
9	
10	
11	# PSN — PRISM Synergy Network (canoni
... [+4779 chars truncated]

### User | 2026-05-25T20:07:44.076Z

[tool_result] Found 50 files limit: 50
mcp-server\src\engines\MachineRateDatabaseEngine.ts
mcp-server\src\engines\LatheProgramRecognitionBridgeEngine.ts
mcp-server\src\engines\QuotingDeepReasoningBridgeEngine.ts
mcp-server\src\engines\QuotingNeuralReasoningBridgeEngine.ts
mcp-server\src\engines\CostEfficiencyBridgeEngine.ts
mcp-server\src\engines\InsertBoxToCatalogBridgeEngine.ts
mcp-server\src\engines\MemoryDi
... [+2298 chars truncated]

### Assistant | 2026-05-25T20:07:48.398Z

Let me check the engine digest and search for dispatcher actions:

### Assistant | 2026-05-25T20:07:48.764Z

[tool_use: Read]

### Assistant | 2026-05-25T20:07:48.924Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:07:49.517Z

[tool_use: Bash]

### User | 2026-05-25T20:07:59.717Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+14425 chars truncated]

### User | 2026-05-25T20:08:06.268Z

[tool_result] H:/prism/mcp-server/src/utils/dispatcherMiddleware.ts
H:/prism/mcp-server/src/__tests__/ai-dispatcher-ledger-wire.test.ts
H:/prism/mcp-server/src/__tests__/ai-dispatcher-p3-wire.test.ts
H:/prism/mcp-server/src/__tests__/build-dispatcher-graph-index.test.ts
H:/prism/mcp-server/src/__tests__/CADCapabilityNegotiator.dispatcher.test.ts
H:/prism/mcp-server/src/__tests__/cam-dispatcher-schema-collision.
... [+1015 chars truncated]

### User | 2026-05-25T20:08:53.366Z

[tool_result] H:/prism/.claude/worktrees/rgs6-audit-v2/state/shared/system-viz/system-graph.json
H:/prism/state/shared/system-viz/system-graph.json
H:/prism/state/shared/coordination.db

### Assistant | 2026-05-25T20:08:55.998Z

Let me search for actual dispatcher action definitions and memory-related engines:

### Assistant | 2026-05-25T20:08:56.293Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:08:56.930Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:08:57.322Z

[tool_use: Read]

### User | 2026-05-25T20:09:11.473Z

[tool_result] Found 8 files
mcp-server\src\engines\SpeedFeedOrchestratorEngine.ts
mcp-server\src\engines\XProcNeuralAutoFireEngine.ts
mcp-server\src\engines\QdrantSurfaceEngine.ts
mcp-server\src\engines\OutcomeEpisodicMemoryBridgeEngine.ts
mcp-server\src\engines\OllamaEmbedderEngine.ts
mcp-server\src\engines\QdrantMemoryEngine.ts
mcp-server\src\engines\UnifiedErrorLedgerEngine.ts
mcp-server\src\engines\QdrantMe
... [+22 chars truncated]

### User | 2026-05-25T20:09:15.661Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/agentDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/authDispatcher.ts
H:/prism/mcp-ser
... [+578 chars truncated]

### User | 2026-05-25T20:11:52.115Z

[tool_result] File content (280770834 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-05-25T20:11:54.800Z

Let me read the key memory/store engines directly and search for dispatcher actions:

### Assistant | 2026-05-25T20:11:55.215Z

[tool_use: Read]

### Assistant | 2026-05-25T20:11:55.447Z

[tool_use: Read]

### Assistant | 2026-05-25T20:11:55.899Z

[tool_use: Bash]

### User | 2026-05-25T20:12:06.789Z

[tool_result] 1	/**
2	 * TieredMemoryEngine — HMEMV01 3-tier memory store (working/episodic/semantic).
3	 *
4	 * Pure-core Mnemosyne-pattern tiered store: working memory (fast, small,
5	 * volatile), episodic memory (medium-term per-session), semantic memory
6	 * (long-term durable).  Entries promote across tiers on access frequency +
7	 * age; demote on staleness.  No I/O — caller supplies persistence.
8	 *
9	
... [+3413 chars truncated]

### User | 2026-05-25T20:12:08.049Z

[tool_result] 1	/**
2	 * QdrantMemoryEngine — Phase 0.19 U-LLM4
3	 *
4	 * Semantic memory layer on top of the thin `QdrantVectorStoreEngine`.
5	 * Gives higher-level engines a typed `remember / recall / forget` surface
6	 * keyed by **memory kind** (programs, outcomes, tribal tips, formulas,
7	 * playbook rules, freeform notes). Qdrant collections are created on
8	 * demand using a fixed naming convention (`pri
... [+2920 chars truncated]

### User | 2026-05-25T20:12:08.995Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts:  "cam_hypermill_demo_db_extract",
H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts:  "hypermill_im_tool_db_extract",
H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts:  "hypermill_im_macro_db_extract",
H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts:          case "cam_hypermill_demo_db_extract": {
H:/prism/m
... [+11869 chars truncated]

### Assistant | 2026-05-25T20:12:11.758Z

Let me search for database-like storage surfaces and unified memory systems:

### Assistant | 2026-05-25T20:12:12.392Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:12:13.465Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:12:13.522Z

[tool_use: Read]

### User | 2026-05-25T20:12:13.605Z

[tool_result] <tool_use_error>This tool cannot read binary files. The file appears to be a binary .db file. Please use appropriate tools for binary file analysis.</tool_use_error>

### User | 2026-05-25T20:12:21.583Z

[tool_result] No files found

### User | 2026-05-25T20:12:26.051Z

[tool_result] H:/prism/mcp-server/src/engines/AgentMemoryFabricEngine.ts
H:/prism/mcp-server/src/engines/CADContentAddressableStoreEngine.ts
H:/prism/mcp-server/src/engines/CADFeatureMemoryEngine.ts
H:/prism/mcp-server/src/engines/ConversationalMemoryEngine.ts
H:/prism/mcp-server/src/engines/CoordinationStoreEngine.ts
H:/prism/mcp-server/src/engines/CrossProcessEpisodicMemoryEngine.ts
H:/prism/mcp-server/src/en
... [+1274 chars truncated]

### Assistant | 2026-05-25T20:12:28.361Z

Let me check the shared index and read key dispatcher definitions:

### Assistant | 2026-05-25T20:12:28.534Z

[tool_use: Read]

### Assistant | 2026-05-25T20:12:28.927Z

[tool_use: Read]

### Assistant | 2026-05-25T20:12:29.088Z

[tool_use: Read]

### User | 2026-05-25T20:12:36.930Z

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
... [+6576 chars truncated]

### User | 2026-05-25T20:12:37.155Z

[tool_result] 1	/**
2	 * Data Access Dispatcher - Consolidates data tools → 1 dispatcher (54 actions)
3	 * Actions: material_get/search/compare, machine_get/search/capabilities,
4	 *          tool_get/search/recommend, alarm_decode/search/fix, formula_get/calculate,
5	 *          coolant_get/search/recommend, coating_get/search/recommend,
6	 *          catalog_machine_lookup/stats, catalog_tool_lookup,
7	 *    
... [+6139 chars truncated]

### User | 2026-05-25T20:12:38.204Z

[tool_result] 1	# PRISM Shared Index Surfaces
2	
3	Generated: 2026-03-27T23:52:50.392Z
4	
5	## Purpose
6	
7	These are the canonical index and digest surfaces both Claude and Codex should prefer before broad repo sweeps when they need orientation, navigation, or low-token discovery.
8	
9	## Preferred Order
10	
11	1. Shared directives, handoff, and current position
12	2. Compact/system indexes and digests
13	3. T
... [+2226 chars truncated]

### Assistant | 2026-05-25T20:12:41.337Z

Now let me update the task and compile the final report:

### Assistant | 2026-05-25T20:12:41.592Z

[tool_use: TaskUpdate]

### Assistant | 2026-05-25T20:12:42.363Z

[tool_use: Read]

### Assistant | 2026-05-25T20:12:42.826Z

[tool_use: Read]

### User | 2026-05-25T20:12:51.294Z

[tool_result] 1	/**
2	 * OutcomeEpisodicMemoryBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN08
3	 *
4	 * Bus subscriber that turns every terminal outcome into a stored
5	 * episode in CrossProcessEpisodicMemoryEngine, giving the NN
6	 * nearest-neighbor recall over past shop-floor runs. Closes the gap
7	 * where the episodic memory engine had a clean store()/recall() API
8	 * but nothing was feeding it from the
... [+3330 chars truncated]

### User | 2026-05-25T20:12:51.722Z

[tool_result] Updated task #2 status

### User | 2026-05-25T20:12:52.946Z

[tool_result] 1	/**
2	 * CoordinationStoreEngine — HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE (H8)
3	 *
4	 * SQLite WAL-mode replacement for the single-JSON-file work-claim store at
5	 * `state/shared/WORK_CLAIMS.json`. The legacy JSON store is read+written by
6	 * the PreToolUse `work-claim.mjs` hook on every Edit/Write tool call; with
7	 * 6 concurrent chats × 10 ops/min that's ~60 read-modify-writes/min on the
8
... [+3557 chars truncated]

### Assistant | 2026-05-25T20:13:31.682Z

Based on my systematic scan of PRISM's storage backends, I'll now compile the database surface inventory and bridging recommendations.

## PRISM DATABASE SURFACE INVENTORY & BRIDGING PLAN

### 1) DATABASE SURFACE INVENTORY

| Backend Type | Owning Engine(s) | Dispatcher Actions | File/Path | PSN Leg(s) |
|---|---|---|---|---|
| **Vector Store (Qdrant)** | QdrantMemoryEngine, QdrantVectorStoreEngine, QdrantSurfaceEngine | prism_memory:qdrant_vector_search, qdrant_vector_upsert | `prism_memory_*` collections (live Qdrant server) | Leg 4 (Memories) |
| **Tiered Memory (Working/Episodic/Semantic)** | TieredMemoryEngine, CrossProcessEpisodicMemoryEngine | prism_memory:semantic_search, agent_memory_query, agent_memory_remember | In-memory + optional persistence to `state/shared/` | Leg 4 (Memories) |
| **Coordination SQLite** | CoordinationStoreEngine | infra:db_health, persistence_health | `H:/prism/state/shared/coordination.db` | Leg 2 (PRISM OS) |
| **Agent Memory Fabric** | AgentMemoryFabricEngine | prism_memory:agent_memory_* (6 actions) | Singleton in-memory or backing store (backref: CrossProcessEpisodicMemoryEngine) | Leg 4 (Memories) |
| **Outcome Episodic Store** | OutcomeEpisodicMemoryBridgeEngine, OutcomeFeedbackOverrideStoreEngine | prism_memory:consolidate, consolidation_stats | FeedbackBusEngine subscription → CrossProcessEpisodicMemoryEngine | Leg 10 (NN/GNN) |
| **Material/Tool/Machine Catalogs** | ToolHolderDatabaseEngine, MachineConfigDatabaseEngine, SurfaceFinishDatabaseEngine | prism_data:material_db_*, tool_db_*, machine_config_* (18 actions) | JSON registries in `src/data/` + registryManager singleton | Leg 7 (Engines) |
| **BOX Program Database** | (implicit in dataDispatcher box_db_* actions) | prism_data:box_db_add, box_db_query, box_db_stats, box_db_speed_feed_patterns | SQLite or JSON (box_db_* 4 actions) | Leg 7 (Engines) |
| **Obsidian Vault** | ObsidianVaultSyncEngine, MemorySyncEngine | prism_memory:brain_recall, memory_sync_list_bundles, m
... [+9692 chars truncated]
