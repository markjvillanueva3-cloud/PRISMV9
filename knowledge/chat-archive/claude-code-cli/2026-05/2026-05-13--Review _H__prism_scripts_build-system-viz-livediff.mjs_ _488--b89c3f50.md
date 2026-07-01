---
type: "chat-session"
source: "claude-code-cli"
session_id: "b89c3f50-1cd2-448c-b2d0-f04ee6b13601"
title: "Review `H:/prism/scripts/build-system-viz-livediff.mjs` (488 LOC) end-to-end for"
date: "2026-05-13"
first_ts: "2026-05-13T22:53:38.548Z"
last_ts: "2026-05-13T22:54:15.600Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a05a90b06eb158e5a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/build-system-viz-livediff.mjs` (488 LOC) end-to-end for

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a05a90b06eb158e5a.jsonl`

## Transcript

### User | 2026-05-13T22:53:38.548Z

Review `H:/prism/scripts/build-system-viz-livediff.mjs` (488 LOC) end-to-end for content correctness. This is CLEANUP-MS0/U-CLEANUP-G19 — an hourly diff tool that reads `state/shared/system-viz/system-graph.json` vs its `.previous.json` sibling and emits node/edge/headline deltas to `state/shared/SYSTEM_VIZ_LIVEDIFF.{md,json}`. Read-only / advisory / exit-0-always.

Verify each of these is correct:
1. `parseArgs` handles --json, --frozen-time <iso>, --current <path>, --previous <path>, plus PRISM_AUDIT_FROZEN_TIME env fallback when --frozen-time missing.
2. `loadGraph` rejects files >MAX_GRAPH_BYTES (250 MB), returns ok:false on missing/invalid-JSON/non-object root, returns bytes + mtime on success.
3. `diffNodes` correctly classifies via `CHANGE_FIELDS = ["status","tier","businessValue"]` only — label-only edits must NOT show as changed.
4. `diffEdges` identifies edges via (from, to, type) with `_` fallback when type missing.
5. `diffHeadline` iterates both `meta.counts` + `meta.headline`, skips non-numeric, treats missing prev as 0.
6. `buildLayerBreakdown` defaults missing layer to `L?`.
7. `composeDiffReport` is robust to undefined nodes/edges/meta on either side (no throw).
8. `buildLiveDiff` correctly resolves absolute paths (Windows colon detection on line 295/298 — `opts.current.includes(":")`) vs relative-to-repo joins.
9. `renderMarkdown` shows the headline-counters table with sign+delta, error banner on ok:false, sample sections only when non-empty.
10. `writeAtomic` creates parent dirs (mkdirSync recursive), uses pid+ts in tmp filename, atomic rename.
11. `runCli` --json mode skips file writes; non-json mode catches write failures via stderr + sets process.exitCode=0 (advisory contract).
12. Top-level `invokedDirectly` IIFE correctly distinguishes CLI invocation from import.

Flag ONLY P0 (broken / wrong / will fail) and P1 (correctness, safety, edge case, hidden assumption). Skip P2/P3 cosmetic. Reply concise (<350 words). End with one of: VERDICT: PASS
... [+18 chars truncated]

### Assistant | 2026-05-13T22:53:47.518Z

I'll perform a focused content review of the script.

### Assistant | 2026-05-13T22:53:47.839Z

[tool_use: Read]

### User | 2026-05-13T22:53:49.061Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-system-viz-livediff.mjs — System-Viz Live Diff (CLEANUP-MS0/U-CLEANUP-G19)
4	 *
5	 * Hourly comparison of `state/shared/system-viz/system-graph.json` vs its
6	 * `system-graph.previous.json` sibling (already maintained by the regen
7	 * pipeline). Surfaces the per-hour delta — nodes added/removed/changed,
8	 * edges added/removed, and headline-counter deltas 
... [+19232 chars truncated]

### Assistant | 2026-05-13T22:54:15.600Z

Concise content review of `H:/prism/scripts/build-system-viz-livediff.mjs`:

## Findings

### P1 — Windows path detection too narrow (line 295/298)
`opts.current.includes(":")` only catches absolute paths with a drive-letter colon. It will MISFIRE on:
- Relative paths containing `:` for any reason (rare but possible — e.g. branch names)
- POSIX absolute paths starting with `/` (handled by separate `startsWith("/")` — OK)
- UNC paths like `\\server\share\...` (no `:`, no leading `/`) — will be wrongly joined to `repo`
- Paths with forward-slash drive prefix `H:/...` — this DOES contain `:` so works, but the heuristic is structural-coincidence, not intent. Recommend `path.isAbsolute(opts.current)` instead — the canonical Node check.

### P1 — `nodeKey` collision risk on object/array IDs
Line 119: `JSON.stringify(n.id)` is used as fallback when `id` is not a string. If `n.id` is `undefined` (missing), `JSON.stringify(undefined)` returns `undefined` (not the string `"undefined"`), and `buildIndex` then short-circuits with `k != null` check (line 133) — so undefined-id nodes are silently DROPPED from both indexes. This means added/removed/changed counts undercount when graph nodes lack `id`. The `system-graph.json` schema should always have id, but defensive code should at least synthesize a key (e.g. `__noid:${index}`) or surface the count.

### P1 — `meta` source double-fallback inconsistency
Line 313/314 in `buildLiveDiff`: `currentMeta: cur.graph && cur.graph.meta`. Then `composeDiffReport` (line 241): `currentMeta || (current && current.meta)`. The fallback on line 241 is dead because line 313 always passes a defined-or-undefined value (`undefined` is falsy → fallback fires to `current.meta` again — same value). Not broken, just redundant. Self-cancels.

### P0/P1 — None other found
Checks 1, 2, 3, 4 (with caveat above), 5, 6, 7, 9, 10, 11, 12 verified correct against source. `parseArgs` correctly handles all flags + env fallback. `loadGraph` ceiling/missing/parse/n
... [+618 chars truncated]
