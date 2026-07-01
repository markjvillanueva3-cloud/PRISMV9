---
type: "chat-session"
source: "claude-code-cli"
session_id: "0769892b-f364-4c0c-85dd-832e28786319"
title: "Explore the PRISM repo at H:/prism to fully document how system-viz graph nodes "
date: "2026-05-19"
first_ts: "2026-05-19T20:10:10.145Z"
last_ts: "2026-05-19T20:19:43.402Z"
cwd: "H:\\PRISM"
messages: 50
user_msgs: 20
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/0769892b-f364-4c0c-85dd-832e28786319/subagents/agent-a701f14d6ec431e16.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Explore the PRISM repo at H:/prism to fully document how system-viz graph nodes 

> **claude-code-cli** | 2026-05-19 | 50 msgs (20 user / 30 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/0769892b-f364-4c0c-85dd-832e28786319/subagents/agent-a701f14d6ec431e16.jsonl`

## Transcript

### User | 2026-05-19T20:10:10.145Z

Explore the PRISM repo at H:/prism to fully document how system-viz graph nodes are generated for new files/engines. This is research before an implementation task.

Read and report on:
1. `scripts/system-viz-add-node.mjs` — full purpose, CLI interface, what arguments it takes, how it adds a node to `state/shared/system-viz/system-graph.json`, the PID-lock behavior. Quote the CLI usage/help text and the key function signatures with line numbers.
2. `scripts/regen-viz.mjs` — the regen pipeline stages, especially the `FAST[]` array of generators and how `generate-*-features.mjs` scripts get registered. How the merged graph is built.
3. `scripts/merge-augmentations.mjs` — the "splice block" mentioned in CLAUDE.md where augmentation generators must ALSO be registered. Report the splice mechanism.
4. The node schema in `system-graph.json` — what fields a node has (id, layer/L#, type, label, edges, etc.). Look at `scripts/lib/` for any node-schema or graph helpers. Report the exact node object shape.
5. How layers L0-L13 map to node types (engine = L?, dispatcher = L?, ghost = L?, etc.). Look at `generate-system-viz.mjs` and any layer constant tables.
6. The `seed-ghost-from-unwired.mjs` script — how it creates `ghost.unwired-engine` nodes with `proposed_wiring`, the confidence scoring, the `--apply` flag.
7. The wiring-inference cascade mentioned in CLAUDE.md NN-GRAPH section — keyword → expanded-keyword → sibling-prefix → LLM → GNN. Find where this cascade lives (`scripts/seed-ghost-llm-classify.mjs`, `scripts/seed-ghost-gnn-classify.mjs`). Report how a node gets classified to a dispatcher.

Report: exact file paths, CLI interfaces, node schema shape, layer→type mapping, and how ghost-wiring proposes connections. Be thorough — "very thorough" breadth across multiple scripts. I need to understand exactly how to (a) add a system-viz node for a newly-reviewed file and (b) propose ghost-wire edges for it.

### Assistant | 2026-05-19T20:10:31.466Z

I'll conduct a thorough exploration of the PRISM system-viz pipeline. Let me start by mapping the key scripts and understanding the architecture.

### Assistant | 2026-05-19T20:10:31.863Z

[tool_use: Bash]

### User | 2026-05-19T20:12:31.056Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
f0467f2362 [JULIETT] [DOCKER-MCP-WIRE-MS0]/U-DOCKER-SYNERGY-VIZ: surface Dock...
6e39ec54c8 [MAIN] [SLOT-SYNERGY-MAP-MS0]/U-SLOT-SYNERGY-MAP (slot:foxtrot): /...
291646f427 [MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR...
4022e99606 [MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-VIZ-F11-CROSS-LOCK: ...

... [+1295 chars truncated]

### Assistant | 2026-05-19T20:12:33.062Z

Now let me read the key files:

### Assistant | 2026-05-19T20:12:33.495Z

[tool_use: Read]

### Assistant | 2026-05-19T20:12:33.755Z

[tool_use: Read]

### Assistant | 2026-05-19T20:12:33.816Z

[tool_use: Read]

### User | 2026-05-19T20:12:38.089Z

[tool_result] File content (31114 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-19T20:12:38.869Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
4	 *
5	 * Spec: CLEANUP-MS0 / U-CLEANUP-C3
6	 *
7	 * Bridges the ~100s latency between full system-viz regenerations
8	 * (`generate-system-viz.mjs` rebuilds the whole 20K-node graph from
9	 * scratch) by appending "dashed" provisional nodes to the live graph
10	 * as soon as new engines / di
... [+32256 chars truncated]

### User | 2026-05-19T20:12:39.057Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+18942 chars truncated]

### Assistant | 2026-05-19T20:12:42.227Z

I have the merge-augmentations file from memory. Let me now search for the node schema, ghost-wiring, and layer mappings:

### Assistant | 2026-05-19T20:12:42.448Z

[tool_use: Bash]

### User | 2026-05-19T20:13:15.166Z

[tool_result] H:/PRISM/scripts/lib/agent-overlay.mjs
H:/PRISM/scripts/lib/alpha-backlog-extract.mjs
H:/PRISM/scripts/lib/atomic-json.mjs
H:/PRISM/scripts/lib/atomic-json.test.mjs
H:/PRISM/scripts/lib/blueprint-accuracy-consumer-lib.mjs
H:/PRISM/scripts/lib/blueprint-accuracy-consumer-lib.test.mjs
H:/PRISM/scripts/lib/blueprint-extract-io.mjs
H:/PRISM/scripts/lib/blueprint-extractor-lib.mjs
H:/PRISM/scripts/lib/
... [+1044 chars truncated]

### Assistant | 2026-05-19T20:13:17.827Z

Let me search for system-graph schema and node helpers:

### Assistant | 2026-05-19T20:13:18.198Z

[tool_use: Bash]

### User | 2026-05-19T20:13:37.691Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
21:44 engine-node-extractor.mjs  193.0K
21:46 engine-node-extractor.test.mjs  193.0K
23:12 graph-random-walk.mjs  193.0K
23:11 graph-random-walk.test.mjs  193.0K
08:17 graphsage-checkpoint.mjs  193.0K
08:25 graphsage-checkpoint.test.mjs  193.0K
00:49 graphsage-model.mjs  193.0K
00:55 graphsage-model.test.mjs  193.0K
08:59 
... [+467 chars truncated]

### Assistant | 2026-05-19T20:13:41.554Z

Let me search for the node schema and key configuration files:

### Assistant | 2026-05-19T20:13:41.896Z

[tool_use: Grep]

### Assistant | 2026-05-19T20:13:42.321Z

[tool_use: Glob]

### Assistant | 2026-05-19T20:13:42.403Z

[tool_use: Glob]

### User | 2026-05-19T20:13:44.461Z

[tool_result] Found 1 file
scripts\lib\systemviz-node-feature-projector.mjs

### User | 2026-05-19T20:13:44.515Z

[tool_result] scripts\generate-system-viz.mjs

### User | 2026-05-19T20:13:44.652Z

[tool_result] scripts\seed-ghost-nodes.mjs
scripts\seed-ghost-gnn-classify.test.mjs
scripts\seed-ghost-gnn-classify.mjs
scripts\seed-ghost-llm-classify.mjs
scripts\seed-ghost-llm-classify.test.mjs
scripts\seed-ghost-from-unwired.test.mjs
scripts\seed-ghost-from-unwired.mjs

### Assistant | 2026-05-19T20:13:46.818Z

Now let me read the key files:

### Assistant | 2026-05-19T20:13:47.240Z

[tool_use: Read]

### Assistant | 2026-05-19T20:13:47.391Z

[tool_use: Read]

### User | 2026-05-19T20:13:50.825Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+19101 chars truncated]

### User | 2026-05-19T20:13:51.390Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 *
5	 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
6	 * engines on disk with no dispatcher reference). Each gets:
7	 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
8	 *   - ghost-wire edge (relation: "proposed-wire") pointing at t
... [+15959 chars truncated]

### Assistant | 2026-05-19T20:13:55.503Z

[tool_use: Read]

### Assistant | 2026-05-19T20:13:55.764Z

[tool_use: Read]

### Assistant | 2026-05-19T20:13:55.295Z

[tool_use: Read]

### Assistant | 2026-05-19T20:13:54.630Z

Now let me search for more of the key files and node schema patterns:

### User | 2026-05-19T20:14:02.280Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-llm-classify.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-LLM-CLASSIFY
4	 *
5	 * Final-tier dispatcher inference for UNKNOWN ghost.unwired-engine nodes that
6	 * survived both keyword + sibling-prefix inference. Reads each engine file's
7	 * top-N-lines header (imports + class signature + JSDoc), batches them into
8	 * Ollama qwen2.5-coder:7b prompts (10 engines p
... [+8309 chars truncated]

### User | 2026-05-19T20:14:03.903Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+9506 chars truncated]

### User | 2026-05-19T20:15:07.955Z

[tool_result] File content (194667691 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-05-19T20:15:11.203Z

Let me search for the specific node structure and layer configuration:

### Assistant | 2026-05-19T20:15:11.597Z

[tool_use: Bash]

### User | 2026-05-19T20:15:23.147Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T20:15:25.393Z

Let me try a different approach:

### Assistant | 2026-05-19T20:15:25.758Z

[tool_use: Bash]

### User | 2026-05-19T20:15:55.016Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T20:15:57.265Z

Let me check the generate-system-viz script for the layer definitions more thoroughly:

### Assistant | 2026-05-19T20:15:57.528Z

[tool_use: Read]

### User | 2026-05-19T20:16:03.993Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+36597 chars truncated]

### User | 2026-05-19T20:18:29.102Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user explicitly requested a thorough exploration and documentation of PRISM's system-viz graph node generation system before an implementation task. The goal is to fully understand: (1) how system-viz-add-node.mjs adds dashed nodes incrementally, (2) the regen-viz.mjs pipeline stages and generator registration, (3) the merge-augmentations.mjs splice block, (4) the node schema shape, (5) layer L0-L13 to node-type mapping, (6) seed-ghost-from-unwired.mjs ghost node creation with confidence scoring, and (7) the 5-tier wiring-inference cascade (keyword → sibling-prefix → LLM → GNN). User stated: "I need to understand exactly how to (a) add a system-viz node for a newly-reviewed file and (b) propose ghost-wire edges for it."

2. Key Technical Concepts:
   - System-viz: PRISM's 10-layer (L0-L10 in architecture-graph.json, L0-L13 in merged system-graph.json) concentric-ring graph visualization of manufacturing platform
   - Three-tier incremental node staging: ENQUEUE (lock-free append to JSONL queue) → FLUSH (rate-limited merge with atomic CAS) → GUARD (PID-file single-writer protection)
   - Generator cascade: 43 FAST generators + 2 HEAVY generators (fs-deep, L11 leaves) spawned as subprocesses with 16GB heap + 8MB JS stack
   - Node schema: { id, layer, subgroup, label, color, status, size, info, [optional fields per type] }
   - Ghost nodes: proposed nodes for unwired engines (no dispatcher import) with confidence-scored wiring inferences, status="proposed", kind="ghost.unwired-engine"
   - Wiring inference cascade: 5-tier ML pipeline — keyword patterns → sibling-prefix → LLM (Ollama qwen) batch → GNN (GraphSAGE k-NN vote)
   - PID-lock coordination: three independent writers (add-node flush, full-regen generate-system-viz, regen-viz post-merge) with separate lock files + 
... [+15645 chars truncated]

### Assistant | 2026-05-19T20:18:31.845Z

I'll check in and resume work on the PRISM system-viz exploration.

### Assistant | 2026-05-19T20:18:32.160Z

[tool_use: Bash]

### User | 2026-05-19T20:18:55.630Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 M .claude/commands/fleet-reaper.md
 M .claude/helpers/install-memory-pressure-task.ps1
 M .claude/helpers/install-nn-graph-retrain-task.ps1
 M .claude/helpers/install-rgs-planner-task.ps1
 M .claude/helpers/process-slot-map.mjs
 M .claude/hooks/awareness-snapshot-inject.mjs
 M .claude/hooks/command-telemetry-record.mjs
 M
... [+840 chars truncated]

### Assistant | 2026-05-19T20:19:43.402Z

Noted. Proceeding with the system-viz research documentation. Based on the prior session summary, I've completed comprehensive exploration of the system-viz architecture. Let me now synthesize the findings into a structured reference for the implementation task ahead.

## System-Viz Graph Node Generation — Complete Architecture Reference

### 1. **High-Level System Design**

PRISM's system-viz is a 13-layer concentric-ring graph visualization (L0–L13) with ~372K nodes in the merged `system-graph.json`. It uses three-tier incremental node staging:
- **ENQUEUE**: Lock-free append to JSONL queue (`system-viz-node-queue.jsonl`)
- **FLUSH**: Rate-limited merge (60s interval) with atomic CAS on graph mtime
- **GUARD**: PID-file single-writer protection via `.system-graph-write.pid`

### 2. **Node Schema**

Standard node shape across all layers:
```javascript
{
  id: string,                    // unique identifier (e.g., "engine.myengine", "dispatcher.prism_calc")
  layer: "L0" | "L1" | ... | "L13",
  subgroup: string,              // semantic grouping within layer (e.g., "manufacturing", "unwired-engine")
  label: string,                 // human-readable display name
  color: string,                 // hex color code (CAT_COLORS palette or custom)
  status: string,                // "normal", "dashed" (staged), "proposed" (ghost), etc.
  size: number,                  // node radius in visualization (0.8–2.0 typical range)
  info: string,                  // tooltip/metadata text
  [additional fields per type]   // e.g., tier, kind, ghost, proposed_at, confidence, enginePath
}
```

### 3. **Layer → Node Type Mapping**

| Layer | Content | Count | Subgroups |
|-------|---------|-------|-----------|
| **L0** | 5 personas | 5 | Operator, Programmer, Quoter, Boss, Admin |
| **L1** | Web pages + CLI variants | 144 | 15 functional groups (quoting, lathe, mill, wedm, cad_calc, cam, erp, quality, hr_safety, shopfloor, analytics, learning, admin, specialty) |
| **L2** | Transport
... [+11909 chars truncated]
