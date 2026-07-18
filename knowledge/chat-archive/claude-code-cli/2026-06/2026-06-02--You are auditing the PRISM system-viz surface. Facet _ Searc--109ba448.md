---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are auditing the PRISM system-viz surface. Facet = Search/awareness integrat"
date: "2026-06-02"
first_ts: "2026-06-02T01:29:56.629Z"
last_ts: "2026-06-02T01:38:01.818Z"
cwd: "H:\\prism-slot-sierra"
messages: 39
user_msgs: 16
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a1fc0f76e4a8aa649.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are auditing the PRISM system-viz surface. Facet = Search/awareness integrat

> **claude-code-cli** | 2026-06-02 | 39 msgs (16 user / 23 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a1fc0f76e4a8aa649.jsonl`

## Transcript

### User | 2026-06-02T01:29:56.629Z

You are auditing the PRISM system-viz surface. Facet = Search/awareness integration and brain direction.
Read these files end-to-end: first Grep for the master-index search library that owns loadGraph + the sourceMtimeMs staleness gate (likely H:/prism/scripts/lib/master-index-search-lib.mjs), then read it; also read H:/prism/state/shared/AWARENESS-SNAPSHOT.md and H:/prism/knowledge/wiki/architecture/system-viz.md.
Focus: How the graph feeds master-index / awareness / viz-first hooks, and the degradation modes when the graph or its index sidecar goes stale (fleet-wide search silently falls back to architecture-graph). ALSO: the sierra loop stated next direction is "resolved-wikilink edges / brain-content nodes" (obsidian-brain x viz) — propose the concrete, lowest-risk graph-augmentation or edge-resolution that would light up the brain overlay (e.g. resolving [[wikilink]] mentions in memory/wiki into real graph edges to engine nodes). Tag it [HEAVY] if it needs a regen/merge-augmentations splice.

HARD CONSTRAINT: NEVER read or parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing either OOMs the host (V8 ~512MB string cap). Analyze ONLY the named source/doc files. Cite any graph stats from state/shared/AWARENESS-SNAPSHOT.md (small precomputed markdown), never by parsing the graph. For EACH improvement give: a short title, the file:line anchor, a tag of either [LEAN+SAFE] (pure client-side or light-sidecar edit, NO 695MB graph load to build or verify) or [HEAVY] (needs a graph load / regen-viz run to build or verify), a value rating (high/med/low), a one-line rationale, and a 1-2 line fix sketch. Be exhaustive — prefer concrete, non-obvious gaps over generic advice. Do NOT write or edit any file; this is read-only analysis.

Return a ranked markdown list (best first) of improvement opportunities for THIS facet only.

### Assistant | 2026-06-02T01:30:19.071Z

I'll start by locating and reading the master-index search library, then the awareness snapshot and the system-viz wiki doc.

### Assistant | 2026-06-02T01:30:19.288Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:30:19.737Z

[tool_use: Read]

### Assistant | 2026-06-02T01:30:20.156Z

[tool_use: Read]

### User | 2026-06-02T01:31:21.589Z

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

### User | 2026-06-02T01:31:21.800Z

[tool_result] 1	---
2	type: architecture
3	created: 2026-05-08
4	tags: [visualization, dev-tools, system-map, neural-network, three-js, observability]
5	related: [build-state, dispatcher-digest, engine-digest]
6	---
7	
8	# System Viz — PRISM Live System Map
9	
10	## Summary
11	
12	Interactive 3D visualization of the entire PRISM platform as a 10-layer neural network. Every layer from user personas down to files
... [+7189 chars truncated]

### User | 2026-06-02T01:31:23.659Z

[tool_result] Found 9 files
H:\prism\scripts\lib\memory-index-search-lib.mjs
H:\prism\scripts\lib\graphsage-train-pipeline.mjs
H:\prism\scripts\lib\graphsage-train-pipeline.test.mjs
H:\prism\scripts\lib\graphsage-predictor.mjs
H:\prism\scripts\lib\system-viz-graph.mjs
H:\prism\scripts\lib\master-index-search-lib.mjs
H:\prism\scripts\lib\master-index-search-lib.test.mjs
H:\prism\scripts\lib\__tests__\system-viz-
... [+66 chars truncated]

### Assistant | 2026-06-02T01:31:26.313Z

Now let me read the master-index search library end-to-end, and the system-viz-graph lib that owns shared graph helpers.

### Assistant | 2026-06-02T01:31:26.645Z

[tool_use: Read]

### User | 2026-06-02T01:31:57.709Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+27618 chars truncated]

### Assistant | 2026-06-02T01:32:00.733Z

Now let me look at the build-graph-index.mjs sidecar builder (to understand what node fields it captures and whether wikilink edges could be resolved there) and the system-viz-graph.mjs shared lib, plus how brain/wikilink resolution currently works.

### Assistant | 2026-06-02T01:32:02.631Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:32:04.012Z

[tool_use: Grep]

### User | 2026-06-02T01:33:03.150Z

[tool_result] 24: * — `{ id, label?, layer?, status?, info?, knowledge?:{wikiEntries?,
25: * memoryEntries?} }` — so File 3's loader rebuilds `{nodes,inverted}` with
26: * NO node reshaping (the `knowledge.*` nesting is deliberate, not `wiki`/
27: * `mem` flat keys — searchGraphHits reads `node.knowledge?.wikiEntries`).
120:      const wikiArr = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries 
... [+421 chars truncated]

### User | 2026-06-02T01:33:05.138Z

[tool_result] 178:const wikiEntries    = loadOptional("wiki-entries-augmentation.json");
275:if (wikiEntries)     versions.wikiEntries     = wikiEntries.generatedAt     ?? "present";
1903:// from [[reference_india_post_gaps_2026_05_22]] (slot:india 2026-05-22).
1960:// broken-link child per top-N broken `[[name]]` sample. Source:
2431:// atomic L8 nodes plus kind rollups, with [[cross-ref]] edges.
2433:if (wiki
... [+274 chars truncated]

### Assistant | 2026-06-02T01:33:08.220Z

The graph hints reveal there's already a `wikilink-parser` and `create-broken-wikilink-stubs` in the codebase. Let me examine these to understand the current state of wikilink resolution — this is directly relevant to the sierra "resolved-wikilink edges / brain-content nodes" direction.

### Assistant | 2026-06-02T01:33:08.631Z

[tool_use: Glob]

### Assistant | 2026-06-02T01:33:09.089Z

[tool_use: Glob]

### Assistant | 2026-06-02T01:33:10.202Z

[tool_use: Read]

### User | 2026-06-02T01:33:32.585Z

[tool_result] No files found

### User | 2026-06-02T01:33:32.676Z

[tool_result] No files found

### User | 2026-06-02T01:33:33.911Z

[tool_result] 1880	    if (existingIds.has(node.id)) continue;
1881	    G.nodes.push(node);
1882	    existingIds.add(node.id);
1883	    gnnEmbedBridgeNodes++;
1884	  }
1885	  G.edges ??= [];
1886	  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
1887	  const existingEdges = new Set(G.edges.map(edgeKey));
1888	  for (const edge of (gnnEmbedBridge.newEdges || [])) {
1889	    cons
... [+4657 chars truncated]

### Assistant | 2026-06-02T01:33:37.480Z

The wikilink-parser nodes are graph features (from the link-audit layer), not actual scripts. Let me confirm the existing wikilink/link-audit producer infrastructure to understand what's already built, which sharpens the brain-overlay proposal. Let me look at the link-audit and wiki-tribal feature generators and how brain coverage is computed.

### Assistant | 2026-06-02T01:33:37.906Z

[tool_use: Glob]

### Assistant | 2026-06-02T01:33:38.376Z

[tool_use: Glob]

### Assistant | 2026-06-02T01:33:39.852Z

[tool_use: Grep]

### User | 2026-06-02T01:34:49.386Z

[tool_result] No files found

### User | 2026-06-02T01:34:49.895Z

[tool_result] 70:  <input id="search" placeholder="search label/id/layer · brain · gap (Obsidian coverage)…" autocomplete="off">
97:  drag to orbit · scroll to zoom · right-drag to pan · click a node for details + Obsidian notes · <kbd>/</kbd> to search · type <kbd>brain</kbd>/<kbd>gap</kbd> for coverage
193:// brain/gap coverage filters); /3d?node=<id> opens that node's side-panel (or, if the
216:      // in t
... [+760 chars truncated]

### User | 2026-06-02T01:34:50.561Z

[tool_result] No files found

### Assistant | 2026-06-02T01:34:53.919Z

Let me read the brain-coverage rendering section of viz3d.html and how `noteCount` is sourced onto nodes, plus check the link-audit feature generator location.

### Assistant | 2026-06-02T01:34:54.691Z

[tool_use: Read]

### Assistant | 2026-06-02T01:34:54.943Z

[tool_use: Glob]

### User | 2026-06-02T01:36:08.748Z

[tool_result] scripts\generate-bridge-synergy-features.mjs
scripts\generate-docker-mcp-features.mjs
scripts\generate-domain-pipeline-features.mjs
scripts\generate-feature-gap-features.mjs
scripts\generate-misc-tasks-features.mjs
scripts\generate-priority-queue-features.mjs
scripts\generate-slot-synergy-features.mjs
scripts\generate-stagnant-features.mjs

### User | 2026-06-02T01:36:12.800Z

[tool_result] 270	  for (let i = 0; i < s.length; i++) {
271	    h ^= s.charCodeAt(i);
272	    h = Math.imul(h, 16777619) >>> 0;
273	  }
274	  return h;
275	}
276	
277	function updateStats(snap) {
278	  const s = document.getElementById("stats");
279	  const covered = (snap.nodes || []).filter((n) => (n.noteCount || 0) > 0).length;
280	  const brainPct = (snap.nodes && snap.nodes.length) ? Math.round((covered /
... [+5844 chars truncated]

### Assistant | 2026-06-02T01:36:16.408Z

I have enough to understand the full picture. Let me do two final targeted checks: how `noteCount`/`notes` get onto nodes in the server (so I can anchor the brain-overlay proposal precisely), and whether there's a `_server.cjs` snapshot builder that derives noteCount from `knowledge`.

### Assistant | 2026-06-02T01:36:18.108Z

[tool_use: Grep]

### User | 2026-06-02T01:37:02.609Z

[tool_result] 379:  // Parse only the nodes array — wikiEntries/memoryEntries fields balloon to
405:      // (top-3 wiki + top-2 mem) — we still drop the full wikiEntries/memoryEntries
407:      const k = n.knowledge || {};
409:      const wiki = (Array.isArray(k.wikiEntries) ? k.wikiEntries : []).map(topPath).filter(Boolean);
410:      const mem = (Array.isArray(k.memoryEntries) ? k.memoryEntries : []).map(top
... [+245 chars truncated]

### Assistant | 2026-06-02T01:38:01.818Z

I now have a complete picture of the data flow. The key chain is:

`knowledge.{wikiEntries,memoryEntries}` arrays on graph nodes → `_server.cjs` derives `noteCount` + `notes.{wiki,mem}` → viz3d brain/gap overlay + side-panel deep-links → and the same `knowledge.*` arrays feed `master-index-search-lib` BM25 (W_VAULT) + the sidecar. The wikilinks inside those memory/wiki files are currently stored as **flat name strings** (no real graph edges); the link-audit layer only renders *broken* links as ghost children. That's the exact gap the sierra direction targets.

Here is the facet audit.

---

# System-Viz Audit — Facet: Search/Awareness Integration & Brain Direction

## How the graph feeds search/awareness/viz-first (verified data flow)
- **Node knowledge fields** `knowledge.{wikiEntries,memoryEntries}` are the single shared substrate. They feed (a) BM25 `W_VAULT` scoring in `master-index-search-lib.mjs:385`, (b) the offline sidecar `system-graph-index.json` (`build-graph-index.mjs:144-146`), and (c) the viz brain overlay via `_server.cjs:407-419` → `noteCount`/`notes` → `viz3d.html:279,458-462`.
- **Staleness/degradation chain**: `loadGraph` (line 235) tries sidecar fast-path → on stale/missing/oversize falls back to architecture-graph (line 278-291) → on disable returns null. The 695 MB graph is *always* past the 200 MB cap, so production master-index recall runs entirely on either the sidecar or the architecture fallback — confirmed by AWARENESS-SNAPSHOT.md:88 ("system-graph.json unreadable... DEGRADED... NOT the full merged graph").

---

## Ranked improvement opportunities (best first)

### 1. Resolved-wikilink edges: turn `[[name]]` strings into real graph edges to engine/dispatcher nodes
**Anchor:** `merge-augmentations.mjs:1959-1988` (link-audit layer only emits *broken*-link ghost children; no resolved edges) + `build-graph-index.mjs:144-146` (knowledge stays flat names).
**Tag:** [HEAVY] — needs a regen/merge-augmentations splice + adjacency-sidecar rebuild.
... [+8203 chars truncated]
