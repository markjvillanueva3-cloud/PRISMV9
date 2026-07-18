---
type: "chat-session"
source: "claude-code-cli"
session_id: "7f79dd78-1f75-4c9a-b7a7-765e1d5d3625"
title: "Review this newly-created PRISM engine file for correctness, conventions, and in"
date: "2026-05-13"
first_ts: "2026-05-13T03:31:16.600Z"
last_ts: "2026-05-13T03:32:11.145Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/7f79dd78-1f75-4c9a-b7a7-765e1d5d3625/subagents/agent-a517fd730d7578100.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review this newly-created PRISM engine file for correctness, conventions, and in

> **claude-code-cli** | 2026-05-13 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7f79dd78-1f75-4c9a-b7a7-765e1d5d3625/subagents/agent-a517fd730d7578100.jsonl`

## Transcript

### User | 2026-05-13T03:31:16.600Z

Review this newly-created PRISM engine file for correctness, conventions, and integration risk. Read the file end-to-end before reporting.

**File:** H:/prism/mcp-server/src/engines/MasterIndexEngine.ts

**Purpose:** Thin orchestrator that fuses 4 pre-built data sources (system-graph.json + PRISMSelfAwarenessEngine + BUILD_STATE.json + Obsidian vault entries pre-joined to graph nodes) into a single unified search call. Intent is to let one MCP action (`prism_session:master_index_query`) replace many Grep/Glob/Agent calls. Returns ranked hits with provenance + utilization score + buildClass annotation.

**Reads from:** state/shared/system-viz/system-graph.json (110K nodes), state/shared/BUILD_STATE.json. Caches by mtime. Wraps PRISMSelfAwarenessEngine.findCapabilities (already exists at H:/prism/mcp-server/src/engines/PRISMSelfAwarenessEngine.ts — exports `prismSelfAwarenessEngine` singleton with `findCapabilities(query: string): Promise<CapabilityMatch[]>`). The Logger import is at H:/prism/mcp-server/src/utils/Logger.js (`.js` because compiled output — TS source is `.ts` but ESM-style imports use `.js` in this codebase).

**PRISM conventions to verify against:** snake_case action names; no inline magic numbers (constants section required); engines never throw on I/O — return structured absent results; mtime-based cache invalidation; single-flight latch for concurrent first-call requests; canonical AtomicValue pattern only required for physics outputs (not search results); JSDoc on public methods.

**Specifically check:**
1. Tokenization correctness — does `tokenize()` properly handle Unicode, oversize input, stopwords, deduplication?
2. Cache invalidation — is the mtime check race-free? Does the single-flight latch (`graphLoadPromise`) actually prevent duplicate work under concurrent first calls?
3. Utilization normalization — `normalizeUtilization()` uses log1p — does it correctly clamp to [0,1] for edge cases (0 in-degree, max=0, NaN, Infinity)?
4. Inverted index
... [+1183 chars truncated]

### Assistant | 2026-05-13T03:31:23.739Z

I'll read the file and its key dependencies to perform the review.

### Assistant | 2026-05-13T03:31:24.114Z

[tool_use: Read]

### User | 2026-05-13T03:31:25.474Z

[tool_result] 1	/**
2	 * MasterIndexEngine — Unified Master Search Across Obsidian Vault + System-Viz + Awareness
3	 *
4	 * Goal: ONE query call replaces N Grep/Glob/Agent calls. Future Claude/Codex
5	 * sessions hit `prism_session:master_index_query` first; only fall back to
6	 * filesystem search when this returns no high-confidence hits.
7	 *
8	 * Fuses 4 pre-built indexes (no parallel infra — all sources al
... [+28543 chars truncated]

### Assistant | 2026-05-13T03:31:25.683Z

[tool_use: Bash]

### User | 2026-05-13T03:31:32.507Z

[tool_result] H:/prism/mcp-server/src/engines/PRISMSelfAwarenessEngine.ts
H:/prism/mcp-server/src/utils/Logger.ts
H:/prism/state/shared/BUILD_STATE.json
H:/prism/state/shared/system-viz/system-graph.json

### Assistant | 2026-05-13T03:32:11.145Z

# Code Quality Analysis Report — MasterIndexEngine.ts

**Grade: PASS with P1 fixes required before next file write**

## Summary
- Overall Quality: 8/10
- Lines: 721
- Critical (P0): 0
- High (P1): 4
- Medium (P2): 5

This is a thin orchestrator (search/aggregation), not a physics engine — `AtomicValue` and `static method` conventions correctly do not apply per the spec note. Engine wraps `prismSelfAwarenessEngine` cleanly with no circular import risk (one-way dependency).

---

## P1 Findings (fix before next file)

**P1-1 — Single-flight latch race.** `getGraph()` (lines 312–331) checks `mtimeMs` then sets `graphLoadPromise = buildGraphCache(...)`, but if the file mtime advances mid-build, the second caller awaiting the in-flight promise will accept stale data. **Fix:** capture `stat.mtimeMs` inside the promise and discard the in-flight promise if mtime now differs. Also `cacheHit` (line 606) is logically inverted — after a cold load the new cache equals `graph`, so it always reports `true`. Track a pre-load `wasCached` flag instead.

**P1-2 — Inverted index misses wiki/memory tokens.** Spec calls out this exact concern (check #4). At line 361 the indexed blob is `${n.id} ${n.label} ${n.info}` — wiki and memory entry names are NOT tokenized into `invertedIndex`. Consequence: a query like `"obsidian"` will only retrieve nodes whose id/label/info contain "obsidian"; a node that ONLY has `knowledge.wikiEntries=[{name:"obsidian-sync"}]` is unreachable because no token bucket points to it. The per-token `wikiBlob.includes(tok)` at line 496 is dead code for non-id-matching nodes. **Fix:** include `entryName(...)` joins in the blob at line 361.

**P1-3 — `unwiredEngines` is a 5-engine sample, not the full set.** Line 403 reads `NEEDS_WIRING.sample_engines`, which by name is a *sample*. `classifyBuildClass` will mislabel 870+ unwired engines as `unknown`. **Fix:** read the full unwired list (or merge with a registry-backed source); document the limitation in JSDoc if the 
... [+1889 chars truncated]
