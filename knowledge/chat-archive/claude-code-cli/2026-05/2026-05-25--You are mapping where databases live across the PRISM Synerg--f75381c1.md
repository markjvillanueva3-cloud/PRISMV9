---
type: "chat-session"
source: "claude-code-cli"
session_id: "f75381c1-8dd5-4f49-8c43-738601f43b17"
title: "You are mapping where databases live across the PRISM Synergy Network (PSN) and "
date: "2026-05-25"
first_ts: "2026-05-25T20:04:32.934Z"
last_ts: "2026-05-25T20:11:02.927Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 26
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/f75381c1-8dd5-4f49-8c43-738601f43b17/subagents/agent-a40922def1beaab8c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are mapping where databases live across the PRISM Synergy Network (PSN) and 

> **claude-code-cli** | 2026-05-25 | 58 msgs (26 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f75381c1-8dd5-4f49-8c43-738601f43b17/subagents/agent-a40922def1beaab8c.jsonl`

## Transcript

### User | 2026-05-25T20:04:32.934Z

You are mapping where databases live across the PRISM Synergy Network (PSN) and inside /system-viz at H:/prism.

CONTEXT
- PSN has 11 legs (canonical definition in H:/prism/knowledge/memories/feedback/feedback_psn_definition.md):
  1. Obsidian brain (C:/Users/wompu/.claude/projects/H--prism/memory/*.md)
  2. PRISM OS (prism_operating_system dispatcher)
  3. Wiki (H:/prism/knowledge/wiki/*.md)
  4. Memories (H:/prism/knowledge/memories/{feedback,project,reference,user}/)
  5. Tribal (H:/prism/knowledge/tribal-*.json + tribal-embed-index.json)
  6. System Viz (H:/prism/state/shared/system-viz/system-graph.json + viz at :8765)
  7. Engines (H:/prism/mcp-server/src/engines/*.ts)
  8. Algorithms (H:/prism/mcp-server/src/algorithms/*.ts)
  9. Formulas (H:/prism/mcp-server/src/physics/constants.ts + formula registries)
  10. NN/GNN (state/shared/nn-graph/*)
  11. PRISM AI (prism_ai + prism_intelligence dispatchers, PRISMCreativeReasoningEngine, etc.)

- /system-viz at H:/prism/state/shared/system-viz/ — system-graph.json + augmentations + ghost roosts. Generators: H:/prism/scripts/generate-*-features.mjs (each emits a roost). See merge-augmentations.mjs + regen-viz.mjs for the splice list.

YOUR DELIVERABLE — return under 700 words:

1) **Per-PSN-leg DB inventory** — for each of the 11 legs, list the DB/storage surfaces that leg owns or queries (filename/path + backend type). Some legs are themselves the DB (e.g. Memories *is* a markdown vault); others query DBs (e.g. PRISM AI queries Qdrant).

2) **Cross-leg DB bridges that EXIST** — name the bridge engines/scripts that already connect DBs across legs. Examples to look for:
   - obsidian-memory-feed (Stop hook → connects auto-memory C: → H: vault)
   - knowledge-injection / knowledge-conversion (corpus → multiple legs)
   - master-index-search-lib (graph search across system-viz + memory + wiki)
   - tribal-by-domain-inject (tribal → prompt context)
   - any *Bridge*.ts engine in mcp-server/src/engines/

3) **Cross-leg DB
... [+1181 chars truncated]

### Assistant | 2026-05-25T20:04:44.275Z

I'll map the PSN database landscape for you. Let me start by exploring the key directories and files.

### Assistant | 2026-05-25T20:04:44.287Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:44.482Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:44.702Z

[tool_use: Read]

### Assistant | 2026-05-25T20:04:44.903Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:04:45.010Z

[tool_use: Glob]

### User | 2026-05-25T20:05:00.348Z

[tool_result] knowledge\memories\uncategorized\devops_improvements.md
knowledge\memories\uncategorized\distributed_locking.md
knowledge\memories\uncategorized\handoff_pp_road_map.md
knowledge\memories\uncategorized\h_drive_master.md
knowledge\memories\uncategorized\jm-die-shop.md
knowledge\memories\uncategorized\plugin_architecture.md
knowledge\memories\uncategorized\prism_commands.md
knowledge\memories\uncateg
... [+5638 chars truncated]

### User | 2026-05-25T20:05:00.809Z

[tool_result] mcp-server\src\engines\BlueprintToQuoteBridgeEngine.ts
mcp-server\src\engines\ManusATCSBridge.ts
mcp-server\src\engines\NovelPostProcessorBridgeEngine.ts
mcp-server\src\engines\SimulationVisualizationBridgeEngine.ts
mcp-server\src\engines\CAMKernelDispatcherBridge.ts
mcp-server\src\engines\GrafanaBridgeEngine.ts
mcp-server\src\engines\MqttBridgeEngine.ts
mcp-server\src\engines\ProtocolBridgeEngine
... [+4830 chars truncated]

### User | 2026-05-25T20:05:01.511Z

[tool_result] knowledge\wiki\consensus\f01d0ccc.md
knowledge\wiki\lessons\cad-blueprint-revolve-2475-037.md
knowledge\wiki\lessons\cad-fusion-live-ms0-integration-discovery.md
knowledge\wiki\lessons\cad-fusion-live-ms0-h-drive-archaeology.md
knowledge\wiki\architecture\system-viz.md
knowledge\wiki\entities\jm-die-program-catalog.md
knowledge\wiki\code-tribal\canonical\hypermill-contour-milling-milling-open-and-
... [+8596 chars truncated]

### User | 2026-05-25T20:05:01.546Z

[tool_result] state\shared\system-viz\business-value-map.json
state\shared\system-viz\awareness-augmentation.json
state\shared\system-viz\novelty-catalog.json
state\shared\system-viz\engine-spotlight.json
state\shared\system-viz\h-drive-census.json
state\shared\system-viz\agent-slices\1.json
state\shared\system-viz\agent-slices\2.json
state\shared\system-viz\agent-slices\3.json
state\shared\system-viz\agent-sli
... [+4715 chars truncated]

### User | 2026-05-25T20:05:02.096Z

[tool_result] 1	---
2	name: psn-definition
3	description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
4	aliases: feedback_psn_definition
5	type: feedback
6	source: prism-memory
7	synced: 2026-05-25T19:53:39.990Z
8	---
9	
10	
11	# PSN — PRISM Synergy Network (canoni
... [+4779 chars truncated]

### Assistant | 2026-05-25T20:05:04.231Z

Let me continue the investigation with more targeted searches.

### Assistant | 2026-05-25T20:05:04.659Z

[tool_use: Read]

### Assistant | 2026-05-25T20:05:04.902Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:05:05.773Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:05:05.919Z

[tool_use: Glob]

### User | 2026-05-25T20:06:04.881Z

[tool_result] scripts\generate-misc-tasks-features.mjs
scripts\generate-priority-queue-features.mjs
scripts\generate-feature-gap-features.mjs
scripts\generate-domain-pipeline-features.mjs
scripts\generate-sfc-variability-features.mjs
scripts\generate-slot-synergy-features.mjs
scripts\generate-bridge-synergy-features.mjs
scripts\generate-docker-mcp-features.mjs
scripts\generate-echo-viz-layers-features.mjs
scrip
... [+1166 chars truncated]

### User | 2026-05-25T20:06:05.549Z

[tool_result] mcp-server\src\engines\KnowledgeCurriculumBridgeEngine.ts
mcp-server\src\engines\KnowledgeGraphNeuralBridgeEngine.ts
mcp-server\src\engines\TribalKnowledgeOutcomeBridgeEngine.ts

### User | 2026-05-25T20:06:15.464Z

[tool_result] Found 20 files limit: 20
state\shared\system-viz\file-coverage-augmentation.json
state\shared\system-viz\molecules-augmentation.json
state\shared\system-viz\architecture-graph.json
state\shared\system-viz\find-cache.json.tmp-61684-1779738115626
state\shared\system-viz\node-capability-index.json
state\shared\system-viz\extracted-pdf-tips-augmentation.json
state\shared\system-viz\EXECUTIVE-BRIEFING.
... [+725 chars truncated]

### User | 2026-05-25T20:08:24.900Z

[tool_result] File content (280770834 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-05-25T20:08:27.457Z

Let me search more strategically for database-related infrastructure.

### Assistant | 2026-05-25T20:08:28.564Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:08:28.779Z

[tool_use: Read]

### Assistant | 2026-05-25T20:08:29.221Z

[tool_use: Read]

### Assistant | 2026-05-25T20:08:29.740Z

[tool_use: Grep]

### User | 2026-05-25T20:08:38.666Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
4	 *
5	 * Reads:
6	 *   state/shared/system-viz/system-graph.json
7	 *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8	 *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
9	 *   state/shared/system-viz/n
... [+13248 chars truncated]

### User | 2026-05-25T20:08:38.989Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+8261 chars truncated]

### User | 2026-05-25T20:08:40.060Z

[tool_result] Found 30 files limit: 30
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\engines\ChainOfVerificationEngine.ts
mcp-server\src\tools\dispatchers\millDispatcher.ts
mcp-server\src\engines\MillLoRAEnsembleCombinerEngine.ts
mcp-server\src\__tests__\MillLoRAEmbeddingCacheEngine.test.ts
mcp-server\src\engines\MillLoRAEmbeddingCacheEngine.ts
mcp-server\src\tools\dispatchers\turningDispatch
... [+1219 chars truncated]

### User | 2026-05-25T20:09:04.150Z

[tool_result] Found 15 files limit: 15
knowledge\memories\reference\reference_zpsn02_souls_filled_2026_05_23.md
knowledge\memories\reference\reference_zpsn01_psn_synergy_2026_05_22.md
knowledge\memories\reference\reference_zebra_awareness_ms0_2026_05_20.md
knowledge\memories\reference\reference_u_tribal_to_wiki_promote_2026_05_20.md
knowledge\memories\reference\reference_u_memory_index_sidecar_2026_05_20.md
kno
... [+754 chars truncated]

### Assistant | 2026-05-25T20:09:10.894Z

Let me read key bridge engine files and check the tribal index infrastructure.

### Assistant | 2026-05-25T20:09:11.656Z

[tool_use: Read]

### Assistant | 2026-05-25T20:09:12.071Z

[tool_use: Read]

### Assistant | 2026-05-25T20:09:12.206Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:09:12.497Z

[tool_use: Bash]

### User | 2026-05-25T20:09:20.297Z

[tool_result] knowledge\memories\uncategorized\tribal_auto_categorization.md
knowledge\memories\_legacy-root\tribal_auto_categorization.md
knowledge\wiki\architecture\engines\knowledge\tribalevolutionengine.md
knowledge\wiki\architecture\engines\knowledge\tribalexplanationengine.md
knowledge\wiki\architecture\engines\knowledge\tribalknowledgemaximizerengine.md
knowledge\wiki\architecture\tribal\tribal-auto-inge
... [+6149 chars truncated]

### User | 2026-05-25T20:09:22.910Z

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
... [+4363 chars truncated]

### User | 2026-05-25T20:09:22.958Z

[tool_result] 1	/**
2	 * TribalKnowledgeOutcomeBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN04
3	 *
4	 * Subscribes to FeedbackBus 'outcome.recorded' events and turns shop-floor
5	 * outcomes into candidate tribal-knowledge tips. Closes the fourth edge from
6	 * the system-viz analysis: TribalKnowledge currently has no inbound
7	 * outcome-driven discipline — every tip is curated or extracted from
8	 * documen
... [+5991 chars truncated]

### User | 2026-05-25T20:09:28.655Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-25T20:09:33.814Z

Let me search for system-viz database node definitions and the tribal index structure more directly.

### Assistant | 2026-05-25T20:09:34.321Z

[tool_use: Grep]

### Assistant | 2026-05-25T20:09:34.896Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:09:35.151Z

[tool_use: Read]

### Assistant | 2026-05-25T20:09:36.147Z

[tool_use: Grep]

### User | 2026-05-25T20:09:52.116Z

[tool_result] No files found

### User | 2026-05-25T20:09:52.123Z

[tool_result] 1	/**
2	 * CatalogRegistryBridgeEngine — Bridge extracted catalog data into PRISM registries
3	 *
4	 * RX-P5-U02: Registry enrichment — merge extracted data into existing registries
5	 *
6	 * Handles 47+ catalog files → ToolRegistry, MachineRegistry, MaterialRegistry
7	 *
8	 * @module engines/CatalogRegistryBridgeEngine
9	 */
10	
11	import { toolRegistry, CuttingTool, ToolGeometry, ToolPerformance
... [+3086 chars truncated]

### User | 2026-05-25T20:09:59.656Z

[tool_result] (Bash completed with no output)

### User | 2026-05-25T20:10:08.906Z

[tool_result] Found 10 files limit: 10
state\shared\system-viz\find-cache.json.tmp-61684-1779738115626
state\shared\system-viz\node-capability-index.json
state\shared\system-viz\system-graph-index.json
state\shared\system-viz\obsidian-vault-augmentation.json
state\shared\system-viz\git-tree-augmentation.json
state\shared\system-viz\extracted-data-atomic-augmentation.json
state\shared\system-viz\wiki-cross-refs-
... [+204 chars truncated]

### Assistant | 2026-05-25T20:10:12.659Z

Let me search for the tribal knowledge files and hook definitions more effectively.

### Assistant | 2026-05-25T20:10:12.661Z

[tool_use: Bash]

### Assistant | 2026-05-25T20:10:13.124Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:10:13.397Z

[tool_use: Glob]

### Assistant | 2026-05-25T20:10:13.656Z

[tool_use: Read]

### User | 2026-05-25T20:10:21.236Z

[tool_result] No files found

### User | 2026-05-25T20:10:21.245Z

[tool_result] No files found

### User | 2026-05-25T20:10:22.923Z

[tool_result] 1	# PRISM — Executive Briefing
2	
3	> **For the reviewing Claude account (project-owner audit).** This is the authoritative entry point. Read it top-to-bottom *before* drawing any conclusion about PRISM. It is auto-generated from on-disk artifacts — every number below traces to a file named in the source line. If you are tempted to call this "a science project with no direction", the §Audit Protoc
... [+19755 chars truncated]

### User | 2026-05-25T20:10:26.250Z

[tool_result] tribal/

### Assistant | 2026-05-25T20:11:02.927Z

I have enough context now. Let me compile the database-bridging report based on what I've discovered.

## PSN Database Landscape Report

### 1. **Per-PSN-Leg DB Inventory**

| Leg | Primary DB/Storage Surface | Backend Type | Canonical Path |
|-----|---------------------------|--------------|-----------------|
| **1. Obsidian brain** | Markdown vault + auto-sync | File-based (MD) | `C:/Users/wompu/.claude/projects/H--prism/memory/*.md` mirrored to `H:/prism/knowledge/memories/` |
| **2. PRISM OS** | In-memory action registry | Dispatcher state | 45 MCP actions, no persistent DB |
| **3. Wiki** | Markdown pages (Karpathy-style) | File-based (MD) | `H:/prism/knowledge/wiki/` (~776+ entries) |
| **4. Memories** | Indexed MD markdown vault | File-based (MD) + MEMORY.md sidecar | `feedback_*`, `reference_*`, `project_*`, `user_*` under leg #1 |
| **5. Tribal Knowledge** | JSON tip corpus + embedding index | File-based (JSON) | `H:/prism/knowledge/tribal/` + `tribal-embed-index.json` (vectors) |
| **6. System Viz** | Property graph (JSON) | File-based (JSON) + visualization overlay | `H:/prism/state/shared/system-viz/system-graph.json` (280MB+) + 21 augmentation JSONs |
| **7. Engines** | Registry of 3,567 TS classes | Source code (TS) | `H:/prism/mcp-server/src/engines/*.ts` |
| **8. Algorithms** | 82 algorithm implementations | Source code (TS) | `H:/prism/mcp-server/src/algorithms/*.ts` |
| **9. Formulas** | Physics constants registry | Source code (TS) | `H:/prism/mcp-server/src/physics/constants.ts` (canonical numeric source) |
| **10. NN/GNN** | HNSW index + embedding output | HNSW (binary) + JSON | `state/shared/nn-graph/NN-EVAL.json` + embeddings (768-d) |
| **11. PRISM AI** | AI router decision tree + outcomes | In-memory + event bus | `prism_ai` / `prism_intelligence` dispatchers + `CrossProcessOutcomeStore` |

### 2. **Existing Cross-Leg DB Bridges**

1. **obsidian-memory-feed** (Leg 1↔4) — Stop hook syncs C: vault → H: memories automatically
2. **tribal-by-dom
... [+6050 chars truncated]
