---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Find where the node-card offset index is emitted during the system-viz graph reg"
date: "2026-06-09"
first_ts: "2026-06-09T13:08:27.538Z"
last_ts: "2026-06-09T13:11:09.853Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a0966e23843fb5c3d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Find where the node-card offset index is emitted during the system-viz graph reg

> **claude-code-cli** | 2026-06-09 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a0966e23843fb5c3d.jsonl`

## Transcript

### User | 2026-06-09T13:08:27.538Z

Find where the node-card offset index is emitted during the system-viz graph regeneration. Start: grep H:/prism/scripts for build-card-offset-index and node-card-offset, and read the regen entry point (likely scripts/regen-viz.mjs and/or scripts/build-graph-index.mjs or scripts/lib/build-graph-index*.mjs). I need to wire scripts/build-vault-backlink-index.mjs (and its future offset variant) into the SAME regen tail so the reverse index auto-refreshes instead of rotting (it currently only rebuilds on manual invocation; the graph regenerated 10h ago and the index is now STALE). Produce a precise BLUEPRINT: (1) the EXACT file + line where node-card-offset-index / node-cards.jsonl is (re)built during regen — is it inside regen-viz.mjs, build-graph-index.mjs, or a post-regen tail? (2) how it is invoked (child_process spawn? direct import+call? fail-soft wrapper so a builder error doesn't abort the whole regen?); (3) the ordering dependency — vault-backlink-index MUST run AFTER node-cards.jsonl is written (it inverts it); (4) any 'one-writer-per-path' / lock / fail-soft conventions I must honor (sierra refuses second-concurrent-writer-to-system-graph-json). Quote real line numbers. Plain text, no JSON.

### Assistant | 2026-06-09T13:08:59.067Z

I'll trace the regen pipeline to find exactly where the node-card offset index is emitted. Let me start with the greps and reading the entry points in parallel.

### Assistant | 2026-06-09T13:09:00.500Z

[tool_use: Grep]

### Assistant | 2026-06-09T13:09:00.965Z

[tool_use: Glob]

### Assistant | 2026-06-09T13:09:01.435Z

[tool_use: Glob]

### Assistant | 2026-06-09T13:09:01.879Z

[tool_use: Glob]

### User | 2026-06-09T13:09:03.711Z

[tool_result] scripts\build-card-offset-index.test.mjs:2: * build-card-offset-index.test.mjs — verifies the backfill INTENT:
scripts\build-card-offset-index.test.mjs:14:import { generate } from "./build-card-offset-index.mjs";
scripts\build-card-offset-index.test.mjs:89:    assert.equal(fs.existsSync(path.join(dir, "node-cards.jsonl")), false, "no partial jsonl on failure");
scripts\build-card-offset-index.mjs:
... [+5447 chars truncated]

### User | 2026-06-09T13:09:23.726Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T13:09:24.159Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T13:09:24.508Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T13:09:28.549Z

The greps succeeded. Now let me read the three key files: the regen tail in `build-graph-index.mjs`, the offset-lib, and the vault-backlink-index builder.

### Assistant | 2026-06-09T13:09:28.899Z

[tool_use: Read]

### User | 2026-06-09T13:09:32.930Z

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
... [+17230 chars truncated]

### Assistant | 2026-06-09T13:09:40.118Z

I found the offset-index emission inside `build-graph-index.mjs:289-304`. Now I need to confirm how `build-graph-index.mjs` itself is invoked from regen-viz (the actual regen entry point), and read the vault-backlink builder + its lib to understand its contract. Let me find the regen-viz invocation of build-graph-index and read the backlink files.

### Assistant | 2026-06-09T13:09:41.667Z

[tool_use: Grep]

### Assistant | 2026-06-09T13:09:42.479Z

[tool_use: Read]

### Assistant | 2026-06-09T13:09:42.482Z

[tool_use: Read]

### User | 2026-06-09T13:09:43.627Z

[tool_result] 378:// build-graph-index.mjs builds the compact ~105 MB system-graph-index.json
386:// heap), so build-graph-index's self-re-exec is a no-op. Non-fatal — a
390:console.log(`[regen-viz] build master-index sidecar (system-graph-index.json)…`);
391:const si = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "build-graph-index.mjs")], {
395:  console.error(`[regen-viz] ✗ build-gra
... [+73 chars truncated]

### User | 2026-06-09T13:09:44.139Z

[tool_result] 1	/**
2	 * vault-backlink-schema.mjs — the REVERSE edge of CHEAP-NODE-ACCESS-MS0.
3	 *
4	 * THE PROBLEM (the missing half of the system-viz↔Obsidian synergy): a NodeCard
5	 * already carries `wikiEntries`/`memoryEntries` — the FORWARD edge "graph node →
6	 * the vault docs that document it" (51,540 cards carry wiki, 48,950 carry memory).
7	 * But the REVERSE is unmapped: an agent reading a wiki/me
... [+5216 chars truncated]

### User | 2026-06-09T13:09:44.186Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-vault-backlink-index.mjs — build the REVERSE edge of CHEAP-NODE-ACCESS-MS0.
4	 *
5	 * Streams the EXISTING `node-cards.jsonl` (160 MB, the forward graph→vault edge)
6	 * and inverts each card's `wikiEntries`/`memoryEntries` into a single map
7	 * `{ vaultKey: [nodeId, ...] }` written to `vault-backlinks.json`. So an agent
8	 * reading a wiki/memory doc can an
... [+5896 chars truncated]

### Assistant | 2026-06-09T13:09:55.784Z

Now I have the full picture of `build-graph-index.mjs` and the backlink builder. The critical thing left: read the exact regen-viz region around the `build-graph-index` spawn (lines ~376-400) to nail down the spawn pattern, NODE_ARGS, fail-soft handling, and exactly where I'd insert the backlink builder. Let me also check whether there's already a CARDS_PATH-vs-VIZ_DIR discrepancy: the backlink builder defaults to `state/shared/system-viz/node-cards.jsonl`, but I need to confirm `build-graph-index` writes the jsonl to that same dir.

The offset-lib writes to `offsetIndexPathsFor(outPath)` where `outPath` = `system-graph-index.json` in `state/shared/system-viz/`. Let me read the offset-lib path resolver and the regen-viz spawn region to confirm path agreement and the spawn idiom.

### Assistant | 2026-06-09T13:09:56.447Z

[tool_use: Read]

### Assistant | 2026-06-09T13:09:57.514Z

[tool_use: Read]

### User | 2026-06-09T13:10:02.419Z

[tool_result] 360	
361	// Obsidian 2nd-brain bridge — re-scan the merged graph + the H:/prism/knowledge vault
362	// and refresh obsidian-augmentation.json (per-node wiki/memory backlinks). MUST run
363	// after the merge (it needs the full node set), so its output lands on the NEXT
364	// regen's merge — the bridge ALSO patches system-graph.json's node.knowledge fields
365	// directly so the link isn't a regen
... [+3648 chars truncated]

### User | 2026-06-09T13:10:02.713Z

[tool_result] 140	  return { jsonlPath, offsetsPath, jsonlBytes, offsetsBytes, count: built.count };
141	}
142	
143	/**
144	 * Resolve the canonical offset-index file paths that sit beside a given main
145	 * sidecar `outPath` (so an --out override keeps the pair co-located, matching
146	 * build-graph-index's breadcrumb behaviour).
147	 *
148	 * @param {string} outPath  e.g. .../system-graph-index.json
149	 * 
... [+312 chars truncated]

### Assistant | 2026-06-09T13:10:10.247Z

I now have everything needed. The path agreement is confirmed: `build-graph-index.mjs` writes `node-cards.jsonl` to `path.dirname(DEFAULT_OUT_PATH)` = `H:/prism/state/shared/system-viz/` (via `offsetIndexPathsFor`), and `build-vault-backlink-index.mjs` defaults `CARDS_PATH` to `path.join(VIZ_DIR, "node-cards.jsonl")` = the exact same path. Let me also confirm the regen-viz NODE_ARGS definition and the graph-write lock scope so I can state the lock convention precisely.

### Assistant | 2026-06-09T13:10:11.463Z

[tool_use: Grep]

### User | 2026-06-09T13:10:13.002Z

[tool_result] 37:} from "./lib/system-graph-write-lock.mjs";
211:const NODE_ARGS = ["--max-old-space-size=24576", "--stack-size=8192"];
219:  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
271:const m = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "merge-augmentations.mjs")], {
289:  console.error(`[regen-viz] Diagnose directly: node ${NODE_
... [+1839 chars truncated]

### Assistant | 2026-06-09T13:10:19.434Z

I have the complete blueprint. Let me confirm the lock scope by reading the lock-related section and how the derived-artifact tail relates to the lock (whether the sidecar stages run inside or outside the held write lock).

### Assistant | 2026-06-09T13:10:20.141Z

[tool_use: Read]

### User | 2026-06-09T13:10:21.713Z

[tool_result] 213	console.log(`[regen-viz] running ${scripts.length} generator(s)${wantFull ? " (FULL)" : " (fast)"}…`);
214	const t0 = Date.now();
215	let failed = 0;
216	for (const s of scripts) {
217	  const abs = path.join(ROOT, "scripts", s);
218	  const start = Date.now();
219	  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
220	  const elapsed = ((Date.now() 
... [+3144 chars truncated]

### Assistant | 2026-06-09T13:11:09.853Z

I have the complete and verified picture. Here is the precise blueprint.

---

## BLUEPRINT: Wiring `build-vault-backlink-index.mjs` into the regen tail

### (1) WHERE node-cards.jsonl / node-card-offsets.json is (re)built during regen

It is NOT a standalone regen stage. It is emitted as a **fail-soft side-effect inside `build-graph-index.mjs`'s `generate()`**, which regen-viz spawns as one stage.

- The forward edge is written at **`H:/prism/scripts/build-graph-index.mjs:289-304`**, inside `generate()`, immediately after the main sidecar write (`writeSidecar(...)` at line 281). It calls `buildCardOffsetIndex(sidecar.nodes)` (line 291) and `writeCardOffsetIndex(...)` (line 293), reusing the SAME in-memory compact nodes — zero extra graph read.
- Output paths resolve via `offsetIndexPathsFor(outPath)` (`build-graph-index.mjs:292` → `scripts/lib/node-card-offset-lib.mjs:151-157`): `node-cards.jsonl` + `node-card-offsets.json`, co-located in `path.dirname(outPath)`. With the default `DEFAULT_OUT_PATH` (`build-graph-index.mjs:62` = `H:/prism/state/shared/system-viz/system-graph-index.json`), that directory is **`H:/prism/state/shared/system-viz/`**.
- That `build-graph-index.mjs` stage is itself spawned from regen-viz at **`H:/prism/scripts/regen-viz.mjs:391-396`** (the `const si = spawnSync(...)` block).

### (2) How it is invoked (the spawn idiom to copy)

regen-viz uses `spawnSync(process.execPath, [...NODE_ARGS, <script abs path>], { stdio: "inherit", cwd: ROOT })` for every stage. The `build-graph-index` stage at `regen-viz.mjs:391-396`:
```js
const si = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "build-graph-index.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (si.status !== 0) {
  console.error(`[regen-viz] ✗ build-graph-index failed (non-fatal — master-index search falls back to legacy)`);
}
```
- `NODE_ARGS` is defined at **`regen-viz.mjs:211`** = `["--max-old-space-size=24576", "--stack-size=8192"]`.
- It is a **child_process spawn
... [+6398 chars truncated]
