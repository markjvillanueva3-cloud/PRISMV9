---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are auditing the PRISM system-viz surface. Facet = Query CLI. Read these fil"
date: "2026-06-02"
first_ts: "2026-06-02T01:29:56.630Z"
last_ts: "2026-06-02T01:34:47.388Z"
cwd: "H:\\prism-slot-sierra"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a5b85382b1e91725e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are auditing the PRISM system-viz surface. Facet = Query CLI. Read these fil

> **claude-code-cli** | 2026-06-02 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a5b85382b1e91725e.jsonl`

## Transcript

### User | 2026-06-02T01:29:56.630Z

You are auditing the PRISM system-viz surface. Facet = Query CLI.
Read these files end-to-end: H:/prism/scripts/system-viz-query.mjs.
Focus: Correctness and performance of the CLI that the viz-first hooks call ~1060x/day (find, blast-radius, etc.): O(E) adjacency reuse vs repeated edge scans, missing useful query types, output usefulness/format for hook consumers, exit codes, budget/timeout behavior under the 2-5s hook window, OOM-safety of any graph read.

HARD CONSTRAINT: NEVER read or parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing either OOMs the host (V8 ~512MB string cap). Analyze ONLY the named source/doc files. Cite any graph stats from state/shared/AWARENESS-SNAPSHOT.md (small precomputed markdown), never by parsing the graph. For EACH improvement give: a short title, the file:line anchor, a tag of either [LEAN+SAFE] (pure client-side or light-sidecar edit, NO 695MB graph load to build or verify) or [HEAVY] (needs a graph load / regen-viz run to build or verify), a value rating (high/med/low), a one-line rationale, and a 1-2 line fix sketch. Be exhaustive — prefer concrete, non-obvious gaps over generic advice. Do NOT write or edit any file; this is read-only analysis.

Return a ranked markdown list (best first) of improvement opportunities for THIS facet only.

### Assistant | 2026-06-02T01:30:19.735Z

I'll read the CLI source file end-to-end, plus the small precomputed awareness markdown for any graph stats I need to cite.

### Assistant | 2026-06-02T01:30:20.236Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:20.743Z

[tool_use: Read]

### User | 2026-06-02T01:31:21.853Z

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
... [+16711 chars truncated]

### User | 2026-06-02T01:31:22.012Z

[tool_result] 1	# PRISM Awareness Snapshot
2	
3	> Generated **2026-06-01T18:54:46.386Z** · graph mtime 2026-06-01T16:12:27.106Z
4	> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
5	> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.
6	
7	## Headline (from BUILD_STATE)
8	- **3646** engines built · **1101** with wiki entry
9	- **118** engines on disk with 
... [+5200 chars truncated]

### Assistant | 2026-06-02T01:31:25.142Z

Now let me read the shared graph-loading library that the CLI depends on, since the budget/timeout/OOM-safety behavior lives in `loadGraph` / `loadFindCache` / `findInGraph`.

### Assistant | 2026-06-02T01:31:25.267Z

[tool_use: Read]

### User | 2026-06-02T01:31:55.127Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+17516 chars truncated]

### Assistant | 2026-06-02T01:31:58.051Z

Let me check the streaming reader `graph-io.mjs` since it determines OOM-safety of the non-`find` commands (which call eager `loadGraph` → `readAndParse` → `readGraphStreaming` on the 663MB graph).

### Assistant | 2026-06-02T01:31:59.167Z

[tool_use: Read]

### User | 2026-06-02T01:33:02.667Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+6349 chars truncated]

### Assistant | 2026-06-02T01:34:47.388Z

I now have the complete picture: the CLI, the load/cache lib, and the streaming reader. The critical finding is the OOM/hang risk on every non-`find` command. Here is the ranked audit for the Query CLI facet.

---

# System-Viz Query CLI Audit — `scripts/system-viz-query.mjs`

Graph stats cited from `AWARENESS-SNAPSHOT.md` (not parsed): graph is **663 MB on disk** and `system-graph.json unreadable (663MB > V8 string limit)` — even the awareness pipeline gave up parsing it. The merged graph is ~**50,490 nodes / ~1M edges** (architecture subset shown; full graph larger). This makes the cost model below load-bearing.

---

## 1. Every non-`find` command eagerly loads the 663 MB graph via `readGraphStreaming` → multi-GB Buffer + ~50K–1M `JSON.parse` calls — blows the 2-5s hook window and risks host OOM
- **Anchor:** `system-viz-query.mjs:62-67` (`loadGraph()` at top level), routing to `system-viz-graph.mjs:109` → `graph-io.mjs:82-83` (`fs.readFileSync(filePath)` whole 663 MB into a Buffer).
- **Tag:** [LEAN+SAFE] (the fix is a client-side sidecar/guard; verifying it does NOT require loading the 663 MB graph)
- **Value:** high
- **Rationale:** `find` was correctly short-circuited to a ~2 MB sidecar (lines 44-60), but `blast-radius`, `headline`, `roadmap-candidates`, `coverage-by-domain`, `dispatcher-summary`, `worktrees`, `build-order` ALL fall through to eager `loadGraph()`. The header comment says the cold parse "costs ~2s post-cable-swap on the 370 MB graph" — but AWARENESS-SNAPSHOT shows the graph is now **663 MB and the awareness pipeline itself cannot read it**. `readGraphStreaming` reads the entire 663 MB file into one Buffer (line 83) then byte-walks it building a fully-materialized in-memory array of ~1M parsed edge objects — easily >2 GB resident, far past a default non-`--max-old-space-size` node process, and many seconds of wall time. Any hook calling `blast-radius` in the 2-5s window will time out or OOM.
- **Fix sketch:** Emit per-command sidecars the same 
... [+14658 chars truncated]
