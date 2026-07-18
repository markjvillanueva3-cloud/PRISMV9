---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Read-only inventory. Glob H:/prism/scripts/ for every system-viz script: regen-v"
date: "2026-05-29"
first_ts: "2026-05-29T13:22:22.821Z"
last_ts: "2026-05-29T13:30:48.494Z"
cwd: "H:\\prism-slot-sierra"
messages: 77
user_msgs: 32
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_87652bd2-4ab/agent-ad593bc2734084235.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Read-only inventory. Glob H:/prism/scripts/ for every system-viz script: regen-v

> **claude-code-cli** | 2026-05-29 | 77 msgs (32 user / 45 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_87652bd2-4ab/agent-ad593bc2734084235.jsonl`

## Transcript

### User | 2026-05-29T13:22:22.821Z

Read-only inventory. Glob H:/prism/scripts/ for every system-viz script: regen-viz.mjs, generate-system-viz.mjs, merge-augmentations.mjs, system-viz-add-node.mjs, system-viz-query.mjs, detect-system-viz-drift.mjs, system-viz-obsidian-bridge*.mjs, repair-graph-engine-classification.mjs, dedup-graph-nodes.mjs, reparent-viz-categories.mjs, add-parent-contains-edges.mjs, and every generate-*-features.mjs ghost-roost generator. Also scripts/lib/ system-viz helpers. Return path + 1-line role each. Note which are registered in regen-viz FAST[].

### Assistant | 2026-05-29T13:22:37.461Z

I'll search for these system-viz scripts and their helpers in the prism directory.

### Assistant | 2026-05-29T13:22:37.461Z

[tool_use: Glob]

### User | 2026-05-29T13:22:58.831Z

[tool_result] H:/prism/scripts\materials_rebuild\generate.mjs
H:/prism/scripts\convert_to_ts.mjs
H:/prism/scripts\fix_imports.mjs
H:/prism/scripts\_archive\materials-legacy\fix_and_build.mjs
H:/prism/scripts\_archive\materials-legacy\fix_buffer_zones.mjs
H:/prism/scripts\extract-machines.mjs
H:/prism/scripts\gap-analysis.mjs
H:/prism/scripts\regen-code-index.mjs
H:/prism/scripts\extract-core-machines.mjs
H:/pri
... [+4536 chars truncated]

### Assistant | 2026-05-29T13:23:03.966Z

Let me search more specifically for the system-viz scripts:

### Assistant | 2026-05-29T13:23:03.967Z

[tool_use: Bash]

### User | 2026-05-29T13:24:07.159Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-29T13:24:10.917Z

Let me search using the correct syntax for this environment:

### Assistant | 2026-05-29T13:24:11.174Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:11.413Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:11.598Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:11.827Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:12.045Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:12.048Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:12.554Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:24:12.558Z

[tool_use: Glob]

### User | 2026-05-29T13:24:19.340Z

[tool_result] H:/prism/scripts\system-viz-obsidian-bridge.mjs
H:/prism/scripts\install-system-viz-git-hook.mjs
H:/prism/scripts\system-viz-obsidian-bridge-v2.mjs
H:/prism/scripts\__tests__\build-system-viz-livediff.test.mjs
H:/prism/scripts\build-system-viz-livediff.mjs
H:/prism/scripts\expand-system-viz-l12-files.test.mjs
H:/prism/scripts\expand-system-viz-l12-files.mjs
H:/prism/scripts\detect-system-viz-drift
... [+1468 chars truncated]

### User | 2026-05-29T13:24:19.761Z

[tool_result] H:/prism/scripts\generate-misc-tasks-features.mjs
H:/prism/scripts\generate-misc-tasks-features.test.mjs
H:/prism/scripts\generate-priority-queue-features.mjs
H:/prism/scripts\generate-priority-queue-features.test.mjs
H:/prism/scripts\generate-feature-gap-features.mjs
H:/prism/scripts\generate-domain-pipeline-features.mjs
H:/prism/scripts\generate-sfc-variability-features.mjs
H:/prism/scripts\gene
... [+3982 chars truncated]

### User | 2026-05-29T13:24:20.310Z

[tool_result] H:/prism/scripts\lib\regen-viz-merge-guard.mjs
H:/prism/scripts\lib\regen-viz-merge-guard.test.mjs
H:/prism/scripts\__tests__\regen-viz-seed-ghost-stage.test.mjs
H:/prism/scripts\regen-viz.mjs

### User | 2026-05-29T13:24:20.317Z

[tool_result] H:/prism/scripts\merge-augmentations.mjs

### User | 2026-05-29T13:24:21.124Z

[tool_result] H:/prism/scripts\dedup-graph-nodes.mjs

### User | 2026-05-29T13:24:21.193Z

[tool_result] H:/prism/scripts\repair-graph-engine-classification.mjs

### User | 2026-05-29T13:24:21.305Z

[tool_result] H:/prism/scripts\reparent-viz-categories.mjs

### User | 2026-05-29T13:24:21.307Z

[tool_result] H:/prism/scripts\add-parent-contains-edges.mjs

### Assistant | 2026-05-29T13:24:23.711Z

Now let me read the regen-viz.mjs file to see which scripts are registered in its FAST[] array, and also check the lib/ directory:

### Assistant | 2026-05-29T13:24:23.979Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:24.211Z

[tool_use: Glob]

### User | 2026-05-29T13:24:32.773Z

[tool_result] H:/prism/scripts/lib\system-viz-graph.test.mjs
H:/prism/scripts/lib\__tests__\system-viz-find-cache.test.mjs
H:/prism/scripts/lib\system-viz-type-backfill.test.mjs
H:/prism/scripts/lib\system-viz-type-backfill.mjs
H:/prism/scripts/lib\system-viz-dead-pixel-detector.mjs
H:/prism/scripts/lib\system-viz-dead-pixel-detector.test.mjs
H:/prism/scripts/lib\system-viz-graph.mjs

### User | 2026-05-29T13:24:35.184Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+22238 chars truncated]

### Assistant | 2026-05-29T13:24:37.838Z

Now let me check for other system-viz helpers and the specific scripts mentioned in the request:

### Assistant | 2026-05-29T13:24:38.295Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:24:38.571Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:38.764Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:41.100Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:41.107Z

[tool_use: Read]

### User | 2026-05-29T13:24:50.156Z

[tool_result] 46:// class of footgun for hermetic tests. Recovered from .previous.json backup.
48:function graphPath() {
67:function ttlMs() {
77:function cacheDisabled() {
84:function descriptiveError(absPath, e, verb) {
95:function readAndParse(absPath) {
147:export function loadGraph({ fresh = false } = {}) {
199:export function findInGraph(G, terms, { limit = 30 } = {}) {
226: * and cache-miss paths — both 
... [+327 chars truncated]

### User | 2026-05-29T13:24:52.819Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+2214 chars truncated]

### User | 2026-05-29T13:24:52.827Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+2041 chars truncated]

### User | 2026-05-29T13:24:54.625Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * detect-system-viz-drift.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-DRIFT-DETECTOR
4	 *
5	 * Diffs system-viz graph state against current disk reality. Surfaces stale
6	 * namespaces (lastWalkedAt aging past threshold) AND coverage-delta cases
7	 * (where dir mtime is significantly past lastWalkedAt). Writes a machine-readable
8	 * report at state/shared/system-viz/DRIF
... [+2215 chars truncated]

### User | 2026-05-29T13:24:54.626Z

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
... [+1984 chars truncated]

### Assistant | 2026-05-29T13:24:57.310Z

Now let me get the roles for the key helper libraries and check which generators are marked as FAST:

### Assistant | 2026-05-29T13:24:57.821Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:57.966Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:58.395Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:58.598Z

[tool_use: Read]

### Assistant | 2026-05-29T13:24:59.963Z

[tool_use: Read]

### User | 2026-05-29T13:25:16.638Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
4	 *
5	 * Reads:
6	 *   state/shared/system-viz/system-graph.json
7	 *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8	 *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
9	 *   state/shared/system-viz/n
... [+1896 chars truncated]

### User | 2026-05-29T13:25:18.533Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * dedup-graph-nodes.mjs — merge duplicate-id nodes in system-graph.json
4	 * by keeping the most-informative copy (more fields, prefer one with
5	 * reclassifyReason) and dropping the rest.
6	 *
7	 * After: every node id is unique. Edges remain intact.
8	 */
9	import fs from "node:fs";
10	import path from "node:path";
11	import { fileURLToPath } from "node:url";
12	i
... [+1080 chars truncated]

### User | 2026-05-29T13:25:18.566Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * repair-graph-engine-classification.mjs — one-shot mutator that rewrites
4	 * eng.other.X nodes in system-graph.json to their correct domains using
5	 * action-engine edges + keyword tokens, then patches every edge that
6	 * references the old ids and synthesizes any missing parent rollups.
7	 *
8	 * This complements generate-engine-reclassify.mjs (which only fixes 
... [+1811 chars truncated]

### User | 2026-05-29T13:25:20.661Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * reparent-viz-categories.mjs — post-merge graph restructure.
4	 *
5	 * Runs after merge-augmentations.mjs + repair + dedup. Two restructures:
6	 *
7	 * 1) Catalogs by manufacturer. The Phase-3a/3b data atomizers parent every
8	 *    catalog file node directly under its *category* hub (datacat.tool_catalog,
9	 *    extract.hypermill, …). This script inserts a *manufa
... [+1657 chars truncated]

### User | 2026-05-29T13:25:21.315Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * add-parent-contains-edges.mjs — post-merge graph pass.
4	 *
5	 * The atomic generators (generate-*-atomic, generate-jm-die-customers, …) attach
6	 * leaf-record nodes (L8/L9: planned-unit, extract_record, datacat_record,
7	 * ppg_asset_record, boxextract_record, jmdie_filetype_machine, combo, novel_formula,
8	 * …) to their hub via a `parent` field — the 3D viewer 
... [+1732 chars truncated]

### Assistant | 2026-05-29T13:25:23.929Z

Now let me check the obsidian-bridge script and the lib helper for system-viz:

### Assistant | 2026-05-29T13:25:24.360Z

[tool_use: Read]

### Assistant | 2026-05-29T13:25:24.575Z

[tool_use: Read]

### Assistant | 2026-05-29T13:25:24.887Z

[tool_use: Read]

### User | 2026-05-29T13:25:41.271Z

[tool_result] 1	#!/usr/bin/env node
2	// system-viz-obsidian-bridge.mjs
3	// Augments the PRISM system-viz graph with Obsidian/wiki/memory linkage.
4	// Pure Node ESM. No external deps. Defensive against missing files.
5	
6	import { readFile, writeFile, readdir, stat } from "node:fs/promises";
7	import { existsSync } from "node:fs";
8	import path from "node:path";
9	
10	const ROOT = "H:/prism";
11	const GRAPH_P
... [+1214 chars truncated]

### User | 2026-05-29T13:25:41.404Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-obsidian-bridge-v2.mjs
4	 *
5	 * Replaces the legacy v1 bridge which OOM'd on the 126K-node graph due to a
6	 * triple-nested substring scan (nodes × keywords × backlink-keys).
7	 *
8	 * v2 strategy:
9	 *   1. Scope-limit: only process semantically meaningful node layers
10	 *      (L0..L8 + L10). Skip L9 (fs root), L4a (9,228 actions), L11 (102,666
11	 
... [+1533 chars truncated]

### User | 2026-05-29T13:25:41.429Z

[tool_result] 1	// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G4: dead-pixel detector.
2	// Pure analyzer: finds edges referencing absent node ids — referenced-but-missing assets.
3	// Pure: no filesystem touch.
4	
5	/**
6	 * Detect dead-pixel edges in a system-graph.
7	 *
8	 * Inputs:
9	 *   { nodes: Array<{id}>, edges: Array<{from|source, to|target, ...}> }
10	 *
11	 * Outputs:
12	 *   {
13	 *     nodeCount, edgeCo
... [+1124 chars truncated]

### Assistant | 2026-05-29T13:25:44.404Z

Perfect! Now I have all the information I need. Let me create the final structured output with all the system-viz scripts and helpers:

### Assistant | 2026-05-29T13:26:44.794Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:26:46.124Z

[tool_result] Output does not match required schema: root: must have required property 'summary'

### Assistant | 2026-05-29T13:26:49.318Z

Let me fix that by adding the summary:

### Assistant | 2026-05-29T13:27:43.375Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:27:53.131Z

[tool_result] Output does not match required schema: root: must have required property 'items'

### Assistant | 2026-05-29T13:27:58.262Z

I need to format the response correctly. Let me check the schema again and provide properly formatted output:

### Assistant | 2026-05-29T13:28:51.762Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:28:56.561Z

[tool_result] Output does not match required schema: root: must have required property 'items'

### Assistant | 2026-05-29T13:29:02.404Z

I see the issue - the tool needs the items parameter. Let me correct that:

### Assistant | 2026-05-29T13:29:18.517Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:29:20.187Z

[tool_result] Output does not match required schema: root: must have required property 'items'

### Assistant | 2026-05-29T13:29:24.148Z

Let me look at the schema more carefully and try a simpler version:

### Assistant | 2026-05-29T13:30:01.509Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:30:02.486Z

[tool_result] Output does not match required schema: root: must have required property 'items'

### Assistant | 2026-05-29T13:30:05.538Z

Let me check the StructuredOutput schema more carefully. It looks like the parameter names may need to match the schema exactly:

### Assistant | 2026-05-29T13:30:32.785Z

[tool_use: StructuredOutput]

### User | 2026-05-29T13:30:37.471Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T13:30:48.494Z

Perfect! I've successfully documented the complete PRISM system-viz script inventory. Here's a summary of what I found:

## PRISM System-Viz Scripts Inventory

**Core Orchestrator:**
- **regen-viz.mjs** - Master regeneration orchestrator; runs the FAST[] + HEAVY generator chain, manages merge-augmentations, post-merge repair chain (engine-classification, dedup, reparent, parent-edges), obsidian bridge, and drift-gate

**Core Viz Generators:**
- **generate-system-viz.mjs** - Architecture-only 10-layer graph (L0-L10)
- **system-viz-query.mjs** - Read-only adapter for graph queries
- **system-viz-add-node.mjs** - Incremental dashed-node staging with concurrent flush guard
- **detect-system-viz-drift.mjs** - Drift detector against disk reality

**Post-Merge Repair Chain:**
- **merge-augmentations.mjs** - Fold augmentations into graph
- **repair-graph-engine-classification.mjs** - Reclassify eng.other.X domains
- **dedup-graph-nodes.mjs** - Merge duplicate nodes by richness
- **reparent-viz-categories.mjs** - Restructure manufacturer tiers + JM-Die hierarchy
- **add-parent-contains-edges.mjs** - De-orphan ~2.7k leaf nodes

**Obsidian Bridges:**
- **system-viz-obsidian-bridge.mjs** (v1 - deprecated)
- **system-viz-obsidian-bridge-v2.mjs** (v2 - optimized for 126K-node graph)

**Lib Helpers:**
- **lib/system-viz-graph.mjs** - Core: loadGraph, findInGraph, find-cache sidecar
- **lib/system-viz-dead-pixel-detector.mjs** - Analyzer for dead-pixel edges
- **lib/system-viz-type-backfill.mjs** - Type enrichment
- **lib/regen-viz-merge-guard.mjs** - Merge safety gate

**93 FAST[] Generators** - All registered in regen-viz.mjs lines 90-182, including:
- Domain/wiring overlays (engine-domain-inventory, knowledge-inventory, staleness-overlay, wiring-overlay)
- Cross-layer bridges (layer-bridges, hook-bridges, action-engine-edges)
- Ghost-roost features (~50 domain-specific roosts: misc-tasks, college-course, post-pdf-corpus, jm-die-tribal-wiki, dream-artifacts, testing-infra, etc.)

... [+128 chars truncated]
