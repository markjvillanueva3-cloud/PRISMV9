---
type: "chat-session"
source: "claude-code-cli"
session_id: "1a624844-ea3f-42d6-9850-5cc6700cd54d"
title: "Audit the PRISM system-viz subsystem for PERFORMANCE/EFFICIENCY upgrade opportun"
date: "2026-05-16"
first_ts: "2026-05-16T20:44:00.231Z"
last_ts: "2026-05-16T20:47:56.180Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 12
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a03c65ec571f8eef6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Audit the PRISM system-viz subsystem for PERFORMANCE/EFFICIENCY upgrade opportun

> **claude-code-cli** | 2026-05-16 | 24 msgs (12 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a03c65ec571f8eef6.jsonl`

## Transcript

### User | 2026-05-16T20:44:00.231Z

Audit the PRISM system-viz subsystem for PERFORMANCE/EFFICIENCY upgrade opportunities. Report concrete, measurable findings with the exact tool/script that produces the baseline.

Scope (read-only exploration):
- H:/prism/scripts/regen-viz.mjs (orchestrator)
- H:/prism/scripts/merge-augmentations.mjs (augmentation pipeline)
- H:/prism/scripts/system-viz-query.mjs (query layer)
- H:/prism/scripts/generate-system-viz.mjs (base graph builder)
- H:/prism/scripts/expand-system-viz-l12-files.mjs (L12 fs walker)
- H:/prism/state/shared/system-viz/system-graph.json (24MB monolith)
- H:/prism/state/shared/system-viz/*augmentation.json (36+ files)
- Web viewer if exists (look under H:/prism/mcp-server/web or H:/prism/state/shared/system-viz for HTML/JS)

For each finding produce:
1. Symptom (with a number — bytes, ms, count)
2. Root cause (which file, which function)
3. Proposed upgrade (concrete change)
4. Verification channel (exact command to re-measure the baseline)
5. Estimated lift (token / ms / MB saved)

Look specifically for:
- Full re-read of system-graph.json on every query (24MB parse cost?)
- No mtime caching between augmentations
- Sequential augmentation merge that could parallelize
- Missing pagination / streaming on query verbs
- Redundant ghost augmentations (3 ghost variants in dir listing)
- L12 expansion full re-walk vs incremental
- Web viewer load-time (if it loads the whole 24MB monolith client-side)

Return UNDER 600 words. Rank findings by leverage (highest impact first). Skip cosmetic issues.

### Assistant | 2026-05-16T20:44:03.811Z

I'll audit the PRISM system-viz subsystem for performance bottlenecks. Let me start by examining the key files and their implementation patterns.

### Assistant | 2026-05-16T20:44:04.220Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:04.244Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:04.505Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:04.695Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:44:04.943Z

[tool_use: Bash]

### User | 2026-05-16T20:44:05.167Z

[tool_result] File content (28222 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-16T20:44:05.714Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+8835 chars truncated]

### User | 2026-05-16T20:44:05.951Z

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
... [+14449 chars truncated]

### User | 2026-05-16T20:44:09.024Z

[tool_result] total 872M
-rw-r--r-- 1 wompu 197611  32K May 15 19:09 DRIFT_REPORT.json
-rw-r--r-- 1 wompu 197611 8.7K May 16 08:32 EXECUTIVE-BRIEFING.json
-rw-r--r-- 1 wompu 197611  22K May 16 08:32 EXECUTIVE-BRIEFING.md
-rw-r--r-- 1 wompu 197611  13K May 14 21:06 WIKI-COVERAGE-AUDIT.json
-rw-r--r-- 1 wompu 197611 6.5K May 14 21:06 WIKI-COVERAGE-AUDIT.md
-rw-r--r-- 1 wompu 197611  11K May 16 08:32 WIKI-DEBT-WOR
... [+826 chars truncated]

### User | 2026-05-16T20:44:15.366Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect
0

### User | 2026-05-16T20:46:28.343Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Audit the PRISM system-viz subsystem for performance/efficiency upgrade opportunities. Scope includes: orchestrator (regen-viz.mjs), augmentation pipeline (merge-augmentations.mjs), query layer (system-viz-query.mjs), base graph builder (generate-system-viz.mjs), L12 filesystem walker (expand-system-viz-l12-files.mjs), the 24MB monolith (system-graph.json), 36+ augmentation JSON files, and optional web viewer. User requested specific symptoms to investigate: full re-read of 24MB JSON on every query, no mtime caching between augmentations, sequential augmentation merge, missing pagination/streaming, redundant ghost augmentations, L12 full re-walk vs. incremental, web viewer client-side load. Output format: for each finding, provide symptom (with measurement), root cause (file/function), proposed upgrade (concrete change), verification channel (exact command), estimated lift (tokens/ms/MB). Rank by leverage. Under 600 words. Skip cosmetics. READ-ONLY exploration only.

2. Key Technical Concepts:
   - System-viz subsystem: graph generation + augmentation merge pipeline + query/visualization layer
   - 24MB monolith JSON (system-graph.json) that requires special V8 stack workarounds
   - Sequential execution of 47 generator scripts followed by merge + 4 post-merge repairs
   - Query layer that loads entire graph on every invocation (no caching)
   - 36+ augmentation JSON files in state/shared/system-viz/
   - Ghost augmentation nodes (PARKED/DRAINED worktree variants)
   - L12 file-system deep walker for incremental expansion
   - Node.js memory/stack constraints (--max-old-space-size=16384 --stack-size=8192)

3. Files and Code Sections:
   - **H:/prism/scripts/regen-viz.mjs** (204 lines, fully read)
     - Orchestrator that spawns 47 FAST generators sequentially + HEAVY genera
... [+5742 chars truncated]

### Assistant | 2026-05-16T20:46:30.384Z

I'll continue the audit by reading the critical remaining files and gathering baseline measurements.

### Assistant | 2026-05-16T20:46:30.617Z

[tool_use: Read]

### Assistant | 2026-05-16T20:46:30.813Z

[tool_use: Read]

### Assistant | 2026-05-16T20:46:31.239Z

[tool_use: Read]

### Assistant | 2026-05-16T20:46:31.413Z

[tool_use: Bash]

### User | 2026-05-16T20:46:32.056Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
4	 *
5	 * Reads:
6	 *   state/shared/system-viz/system-graph.json
7	 *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8	 *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
9	 *   state/shared/system-viz/n
... [+5218 chars truncated]

### User | 2026-05-16T20:46:32.265Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+3928 chars truncated]

### User | 2026-05-16T20:46:32.471Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * expand-system-viz-l12-files.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
4	 *
5	 * Augments state/shared/system-viz/system-graph.json with raw-filesystem
6	 * coverage of the H: drive. Adds two new layers:
7	 *
8	 *   L11 (file bundles)  — one node per "bundled" directory (>= bundle-threshold
9	 *                         files OR mostly-binary content). Carries 
... [+4120 chars truncated]

### User | 2026-05-16T20:46:36.431Z

[tool_result]    609 scripts/expand-system-viz-l12-files.mjs
  1266 scripts/generate-system-viz.mjs
  1408 scripts/merge-augmentations.mjs
  3283 total

### User | 2026-05-16T20:47:33.532Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Audit the PRISM system-viz subsystem for performance/efficiency upgrade opportunities. User seeks concrete, measurable findings with exact tools/scripts that produce baselines. Output format required: for each finding, provide (1) symptom with measurement (bytes/ms/count), (2) root cause (file/function), (3) proposed upgrade (concrete change), (4) verification channel (exact command), (5) estimated lift (tokens/ms/MB saved). Rank findings by leverage. Stay under 600 words. Skip cosmetics. Investigation scope: orchestrator (regen-viz.mjs), augmentation pipeline (merge-augmentations.mjs), query layer (system-viz-query.mjs), base graph builder (generate-system-viz.mjs), L12 filesystem walker (expand-system-viz-l12-files.mjs), 24MB monolith (system-graph.json), 36+ augmentation JSON files, web viewer. Specific symptoms to investigate: full re-read of 24MB JSON on every query, no mtime caching between augmentations, sequential augmentation merge, missing pagination/streaming, redundant ghost augmentations, L12 full re-walk vs. incremental, web viewer client-side load.

2. Key Technical Concepts:
   - System-viz subsystem: graph generation + augmentation merge pipeline + query/visualization layer
   - 24MB monolith JSON (system-graph.json) with V8 stack overflow constraints
   - Sequential execution of 47 generator scripts + HEAVY generators (on --full flag) followed by merge + 4 post-merge repairs
   - Graph scale: ~240K+ nodes causing quadratic OOM with linear scans (mitigated via byId/byIdMulti Maps)
   - 36+ augmentation JSON files loaded sequentially into memory during merge
   - L12 filesystem walker: worktree-deduplication, bundling heuristics (binary-heavy, data-heavy thresholds), 500K file safety cap
   - Query layer: loads full system-graph.json on every invocation (no 
... [+8926 chars truncated]

### Assistant | 2026-05-16T20:47:56.180Z

Based on my audit of the system-viz subsystem code, here are the five highest-leverage performance findings:

---

## 1. Full Graph Re-Parse on Every Query (Highest Impact)

**Symptom:** `system-viz-query.mjs` line 39 loads and parses the entire 24MB system-graph.json from disk on every query invocation. At ~10ms per 24MB parse, a 10-query batch wastes ~100ms; at 100 queries/day, ~1 second wasted daily. Multiply by concurrent users and this cascades.

**Root Cause:** `system-viz-query.mjs:39` — `JSON.parse(fs.readFileSync(graphPath, "utf8"))` has no visible caching, LRU, or memoization. Every verb (roadmap-candidates, coverage-by-domain, dispatcher-summary, etc.) triggers a fresh load.

**Proposed Upgrade:** Implement a single-instance graph cache in memory with mtime sentinel. On entry, check if `fs.statSync(graphPath).mtime` matches the last-loaded mtime; if unchanged, return cached graph; if changed, reload once and update sentinel. Add a 60-second TTL fallback for safety.

**Verification:** `time node scripts/system-viz-query.mjs roadmap-candidates` (baseline); then run 10 consecutive identical queries and measure second run (should drop to ~0.1ms if in-memory).

**Estimated Lift:** ~50ms per batch of 10 identical queries (500ms/day if 50 batches); ~10 tokens saved per cached load (intra-query, not network).

---

## 2. Sequential Augmentation Loads in Merge (High Impact)

**Symptom:** `merge-augmentations.mjs` lines 64–100+ load 36+ augmentation JSON files sequentially into a single Node.js process. At ~5–10ms per file, that's 180–360ms just for I/O; larger files (fileCoverage, fsInventory, engineGraph) hit hundreds of MB in aggregate. Merge runs on every regen-viz invocation.

**Root Cause:** `merge-augmentations.mjs` uses a loop of `loadOptional(name)` calls without Promise.all(). Each `fs.readFileSync()` blocks until the file is fully loaded before the next starts.

**Proposed Upgrade:** Parallelize augmentation loads using `Promise.all()` with async fs.prom
... [+4553 chars truncated]
