---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:\\prism\\scripts\\expand-system-viz-l12-files.mjs` end-to-end (read the W"
date: "2026-05-15"
first_ts: "2026-05-15T16:48:55.309Z"
last_ts: "2026-05-15T16:50:32.344Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-afa8e6bab1667bf9c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:\prism\scripts\expand-system-viz-l12-files.mjs` end-to-end (read the W

> **claude-code-cli** | 2026-05-15 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-afa8e6bab1667bf9c.jsonl`

## Transcript

### User | 2026-05-15T16:48:55.309Z

Review `H:\prism\scripts\expand-system-viz-l12-files.mjs` end-to-end (read the WHOLE file — don't skim).

Context: I'm working on SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND. This script augments PRISM's `state/shared/system-viz/system-graph.json` (currently 92,405 nodes / 191,108 edges) by adding two new layers:
- L11 "Filesystem Bundles" — one node per directory that's bundled (>=500 files OR >=80% binary content with >=20 files)
- L12 "Filesystem (canonical)" — one node per canonical file (worktree-deduplicated)

The PRISM graph already declares L0..L10 in `scripts/generate-system-viz.mjs`. L11/L12 are NEW.

Run by `node scripts/expand-system-viz-l12-files.mjs --root H:/prism --apply` (one invocation per H: top-level domain). Will be called from a /loop covering H:/prism, then each H:/prism-* worktree, then H:/.claude, H:/Tools, H:/prism-backups.

Critical invariants the script claims to uphold:
1. **Idempotent** — re-running with same --root overwrites prior L11/L12 nodes scoped to that root, never duplicates them. Other roots' nodes preserved.
2. **Atomic write** — writes `.tmp` then renames so the graph is never half-written.
3. **Existing L0-L10 nodes/edges/layers PRESERVED VERBATIM** — only adds new nodes.
4. **Worktree dedup** — H:/prism and H:/prism-cad-complete both contain mcp-server/src/X.ts. Should produce ONE canonical L12 node (`fs.file.<hash>`) with edges to BOTH source-nodes. The script implements this via `namespaceForRoot()` returning "prism" for any `prism-*` directory.
5. **Pure helpers** — `walkDir`, `classifyDir`, `canonicalRel`, `namespaceForRoot`, `makeFileNodeId`, `makeBundleNodeId`, `makeSourceNodeId`, `buildAugment`, `mergeIntoGraph` are all pure / injectable for tests. `main()` is the only side-effect entry point.

Please grade PASS/FAIL and report **specific P0+P1 issues** (file:line where possible):
- **Correctness**: any logic bug where the script will silently emit wrong nodes/edges?
- **Idempotency**: does `mergeIntoGraph` actually r
... [+1437 chars truncated]

### Assistant | 2026-05-15T16:49:03.710Z

I'll review the script end-to-end now.

### Assistant | 2026-05-15T16:49:04.280Z

[tool_use: Read]

### User | 2026-05-15T16:49:07.964Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * expand-system-viz-l12-files.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
4	 *
5	 * Augments state/shared/system-viz/system-graph.json with raw-filesystem
6	 * coverage of the H: drive. Adds two new layers:
7	 *
8	 *   L11 (file bundles)  — one node per "bundled" directory (>= bundle-threshold
9	 *                         files OR mostly-binary content). Carries 
... [+21097 chars truncated]

### Assistant | 2026-05-15T16:50:32.344Z

I have the file contents. Here's my end-to-end review.

---

## Code Review: `H:\prism\scripts\expand-system-viz-l12-files.mjs`

### VERDICT: **FAIL** (P0 idempotency bug + P0 worktree-dedup contract violation)

---

### P0 — MUST FIX BEFORE NEXT FILE

**P0-1 — `mergeIntoGraph` cross-namespace clobber (line 347-365)**
The "ours" predicate at line 351 (`if (n.walkRoot === ourSource)`) only matches **the L11 source node** because `walkRoot` is only set on the source node itself (line 245). For L11 bundle nodes (lines 264-279) and L12 file nodes (lines 288-302) — `walkRoot` is **never written**, so this branch never fires for them.

Reachability falls through to the edge-based pass at line 358-362, which is correct… **but only if the prior run's edges still exist**. Combined with P0-2 below, this is the bigger problem:

**P0-2 — Worktree-dedup defeats idempotency (the load-bearing bug)**
The script's stated invariant #4: "H:/prism and H:/prism-cad-complete both contain mcp-server/src/X.ts → ONE canonical L12 node with edges to BOTH sources."

But `makeFileNodeId` (line 127-130) returns `fs.file.<hash(ns::canonicalRel)>`. Both walkRoots produce `ns="prism"` (line 123) and same `canonicalRel="mcp-server/src/X.ts"`, so **identical fileId**. Good for dedup.

However, in `buildAugment` line 286-303, the script ALWAYS emits a fresh node + edge to `sourceId` for every file. There's no check whether the node already existed from a prior walkRoot.

Then `mergeIntoGraph`:
- Walk #1 (H:/prism): emits fileId `fs.file.abc` + edge `fs.file.abc → fs.source.prism`. Merged in.
- Walk #2 (H:/prism-cad-complete): `mergeIntoGraph` re-runs. `ourSource = "H:/prism-cad-complete"`, `sourceId = fs.source.cadcomplete`.
  - Line 360: `e.to === sourceId` — only matches edges to **cad-complete's** source. NONE of walk #1's edges point there → none of walk #1's L11/L12 nodes get added to `ourNodeIds`.
  - Line 364-365: filters out only walk #2's prior nodes. Walk #1's fileId `fs.file.abc` survives.
... [+10496 chars truncated]
