---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are auditing the PRISM system-viz surface. Facet = Graph pipeline and sideca"
date: "2026-06-02"
first_ts: "2026-06-02T01:29:56.629Z"
last_ts: "2026-06-02T01:35:50.019Z"
cwd: "H:\\prism-slot-sierra"
messages: 29
user_msgs: 13
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-aabb305d1ed7023e5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are auditing the PRISM system-viz surface. Facet = Graph pipeline and sideca

> **claude-code-cli** | 2026-06-02 | 29 msgs (13 user / 16 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-aabb305d1ed7023e5.jsonl`

## Transcript

### User | 2026-06-02T01:29:56.629Z

You are auditing the PRISM system-viz surface. Facet = Graph pipeline and sidecars.
Read these files end-to-end: H:/prism/scripts/regen-viz.mjs, H:/prism/scripts/merge-augmentations.mjs, H:/prism/scripts/build-graph-index.mjs, H:/prism/scripts/build-viz-adjacency.mjs, H:/prism/scripts/lib/system-viz-graph.mjs, H:/prism/scripts/lib/graph-io.mjs.
Focus: Generation correctness and resilience: one-writer-per-path discipline for system-graph.json, OOM-safety (readGraphStreaming vs JSON.parse of the 695MB file), the KNOWN deferred find-cache cold-parse problem (find-cache.json is built lazily on a cache-miss = a 25s 695MB parse inside a 2-5s hook budget; the fix is to consolidate the 3 post-merge sidecar parses — build-graph-index + build-viz-adjacency + find-cache — into ONE pass, needs a clean projectForFind/FIND_FIELDS export), breadcrumb/failure surfacing (.last-index-build.json), schemaVersion gating, atomic tmp+rename writes, stage ordering inside regen-viz.

HARD CONSTRAINT: NEVER read or parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing either OOMs the host (V8 ~512MB string cap). Analyze ONLY the named source/doc files. Cite any graph stats from state/shared/AWARENESS-SNAPSHOT.md (small precomputed markdown), never by parsing the graph. For EACH improvement give: a short title, the file:line anchor, a tag of either [LEAN+SAFE] (pure client-side or light-sidecar edit, NO 695MB graph load to build or verify) or [HEAVY] (needs a graph load / regen-viz run to build or verify), a value rating (high/med/low), a one-line rationale, and a 1-2 line fix sketch. Be exhaustive — prefer concrete, non-obvious gaps over generic advice. Do NOT write or edit any file; this is read-only analysis.

Return a ranked markdown list (best first) of improvement opportunities for THIS facet only.

### Assistant | 2026-06-02T01:30:17.655Z

I'll audit the Graph pipeline and sidecars facet. Let me read all six named files end-to-end, plus the awareness snapshot for any safe graph stats.

### Assistant | 2026-06-02T01:30:19.061Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:19.067Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:19.108Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:20.014Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:20.535Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:20.696Z

[tool_use: Read]

### User | 2026-06-02T01:31:21.574Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-graph-index.mjs — offline inverted-index sidecar generator for
4	 * PRISM master-index search.
5	 *
6	 * UNIT: U-MASTER-INDEX-SIDECAR (DEV-TOOL-CONFLICT-AUDIT-2026-05-17)
7	 *
8	 * WHY: `master-index-search-lib.mjs` `loadGraph()` caps graph loads at 200 MB.
9	 * The merged `system-graph.json` is 372 MB / 243,687 nodes, so every
10	 * master-index search silen
... [+15598 chars truncated]

### User | 2026-06-02T01:31:21.650Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+26796 chars truncated]

### User | 2026-06-02T01:31:21.674Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1030 of 2788 total (57491 tokens, cap 25000). Call Read with offset=1031 limit=1030 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+53977 chars truncated]

### User | 2026-06-02T01:31:21.785Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-viz-adjacency.mjs — capped node-adjacency sidecar for the 3D viewer's
4	 * blast-radius side-panel (U-VIZ-NODE-NEIGHBORS, slot:sierra 2026-06-01).
5	 *
6	 * WHY: the merged system-graph.json is ~695 MB / ~302K nodes / ~1M edges. The 3D
7	 * viewer samples per-engine `eng.<domain>.<name>` nodes whose edges live ONLY in
8	 * this merged graph (the 203 MB index 
... [+3999 chars truncated]

### User | 2026-06-02T01:31:21.906Z

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

### User | 2026-06-02T01:31:21.909Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+17516 chars truncated]

### Assistant | 2026-06-02T01:31:25.476Z

I have the core files. Let me read the rest of merge-augmentations.mjs (the splice blocks and the final write) and the small supporting libs, plus the awareness snapshot for safe graph stats.

### Assistant | 2026-06-02T01:31:26.427Z

[tool_use: Read]

### Assistant | 2026-06-02T01:31:26.858Z

[tool_use: Read]

### Assistant | 2026-06-02T01:31:27.364Z

[tool_use: Read]

### User | 2026-06-02T01:31:57.657Z

[tool_result] 1031	  };
1032	}
1033	
1034	// Misc-tasks roost: the "Misc Tasks" ghost parent + one misc-task child per
1035	// orphaned-incomplete-work item — work found across all PRISM chats that was
1036	// never finished and never formalized into a roadmap unit / milestone envelope.
1037	// Source: state/shared/specs/MISC-TASKS-INVENTORY.json via
1038	// scripts/generate-misc-tasks-features.mjs.
1039	let mi
... [+44895 chars truncated]

### User | 2026-06-02T01:31:58.210Z

[tool_result] 1	/**
2	 * regen-viz-merge-guard.mjs — pure decision logic for regen-viz.mjs merge step.
3	 *
4	 * Why this exists (U-REGEN-VIZ-MERGE-FAILLOUD):
5	 *   Previously the orchestrator logged `[regen-viz] ✗ merge failed`, set
6	 *   failed++, and KEPT GOING through repair → dedup → reparent → parent-edges
7	 *   → obsidian-bridge → executive-briefing → wiki-debt → drift-gate. Those
8	 *   stages all re
... [+4274 chars truncated]

### User | 2026-06-02T01:32:00.597Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.mjs — shared cross-process write lock for
5	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * ── Why this exists ──────────────────────────────────────────────────────
8	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
9	 * (`architectu
... [+17082 chars truncated]

### Assistant | 2026-06-02T01:32:04.070Z

I have the critical decision logic. Let me read the tail of merge-augmentations.mjs (the final write block and the canonicalize step) and the awareness snapshot for safe graph stats.

### Assistant | 2026-06-02T01:32:05.020Z

[tool_use: Read]

### Assistant | 2026-06-02T01:32:06.931Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:32:06.932Z

[tool_use: Read]

### User | 2026-06-02T01:33:05.481Z

[tool_result] No matches found

[Showing results with pagination = offset: 2059]

### User | 2026-06-02T01:33:08.483Z

[tool_result] 2480	    stats: formulasAtomic.stats,
2481	  };
2482	}
2483	
2484	// Personas expand: 8 additional L0 personas (maintenance, customer, vendor,
2485	// owner, oncall, csr, foreman, estimator) with `uses`/`demands` edges.
2486	let personaNodes = 0, personaEdges = 0;
2487	if (personasAug?.newNodes) {
2488	  const existingIds = new Set(G.nodes.map(n => n.id));
2489	  for (const node of personasAug.new
... [+16300 chars truncated]

### User | 2026-06-02T01:33:08.490Z

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

### Assistant | 2026-06-02T01:35:50.019Z

I now have the full pipeline picture. The Grep returned no matches because my offset exceeded the file; the relevant tail (the final write block) is in the Read of lines 2756-2788. I have everything needed for an exhaustive facet audit. The AWARENESS-SNAPSHOT confirms the live state including the critical warning at line 88 (graph 663MB, unreadable by string-parse, awareness degraded to architecture-graph subset).

Here is the ranked audit for the Graph pipeline and sidecars facet.

---

# Graph Pipeline & Sidecars — Audit Findings (ranked, best first)

The single highest-signal observation up front: **the AWARENESS-SNAPSHOT itself (line 88) reports `system-graph.json unreadable (663MB > V8 string limit) — utilization computed from architecture-graph.json (DEGRADED)`.** This is the smoking gun that the OOM-safe-read discipline is *not* uniformly applied across consumers — some still `JSON.parse(readFileSync(...))` and silently degrade. The findings below are anchored to that reality.

---

### 1. `readGraphNodeCount` in the merge guard does a non-streaming `JSON.parse` of the 695MB graph — the merge no-op guard is itself OOM/crash-prone
**Anchor:** `scripts/lib/regen-viz-merge-guard.mjs:87-94` (called from `regen-viz.mjs:236` and `:272`)
**Tag:** [LEAN+SAFE] · **Value: HIGH**
**Rationale:** `readGraphNodeCount` does `JSON.parse(fs.readFileSync(graphPath, "utf8"))` on the *very file the whole pipeline streams everywhere else*. At 663–695MB this exceeds V8's ~512MB string cap → throws `ERR_STRING_TOO_LONG`, caught, returns `0`. So `preMergeNodeCount` AND `postMergeNodeCount` are **both 0** in production right now → the silent-no-op guard (`preMergeNodeCount > 0 && postMergeNodeCount <= preMergeNodeCount`) can *never fire* (the `pre > 0` clause is false), and the merge-failed branch is the only live protection. The headline fail-loud feature (`U-REGEN-VIZ-MERGE-FAILLOUD`) is silently dead on the production graph size.
**Fix sketch:** Replace the body with a node-count 
... [+24554 chars truncated]
