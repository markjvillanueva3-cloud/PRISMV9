---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "RE-REVIEW (round 2) of `H:/prism/scripts/seed-ghost-gnn-classify.mjs` — a prior "
date: "2026-05-16"
first_ts: "2026-05-16T18:37:08.536Z"
last_ts: "2026-05-16T18:37:59.439Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a573892e25c0eaa9c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# RE-REVIEW (round 2) of `H:/prism/scripts/seed-ghost-gnn-classify.mjs` — a prior 

> **claude-code-cli** | 2026-05-16 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a573892e25c0eaa9c.jsonl`

## Transcript

### User | 2026-05-16T18:37:08.536Z

RE-REVIEW (round 2) of `H:/prism/scripts/seed-ghost-gnn-classify.mjs` — a prior review FAILed it and the findings were fixed. Verify the fixes and review the whole file again cold.

CONTEXT — unit U6 (U-NNG-INFERENCE-FIFTH-TIER) of NN-GRAPH-MS0. This new Node ESM script is the 5th tier of a wiring-inference cascade (keyword → expanded-keyword → sibling-prefix → LLM → THIS GNN tier). For each UNKNOWN `ghost.unwired-engine` node it predicts a dispatcher via GraphSAGE-embedding k-NN label-propagation: load a trained checkpoint (graceful skip if absent), build a reference set from high-confidence already-classified ghosts, embed an edgeless subgraph of {targets ∪ references} via the U5 predictor's `embedGraph`, then for each target score links to references via `scoreLink`, take top-K, confidence-weighted vote.

PRIOR FINDINGS — confirm each is genuinely fixed:
  - P0: target membership was selected by `label` but references were excluded only by `id`, so a duplicate-label ghost could vote on its own target. FIX: `partitionGhosts` now excludes references by BOTH id and label; `voteDispatcher` skips `ref.id===target.id || ref.label===target.label`.
  - P1: `--limit` only truncated output, not the work. FIX: `classifyUnknownGhosts` now slices `targets` by `opts.limit` before embedding; `main` passes `limit` through and no longer post-slices.

DESIGN INVARIANTS (flag any violation as P0): hybrid is the floor (missing checkpoint OR `PRISM_NNG_DISABLE=1` ⇒ pure `skipped:true` no-op); no leakage (a target never votes on itself); determinism (identical output for identical graph+checkpoint — sort tie-breaks must be total); composes the U5 predictor (`loadPredictor`, `embedGraph`, `scoreLink` from `./lib/graphsage-predictor.mjs`), never reimplements GraphSAGE.

U5 predictor API (verified): `loadPredictor(jsonStringOrObj)`→`{model,calibrator,metadata}`; `embedGraph(model,graph,{maxNodes})`→`{embeddings:Map<id,Float64Array>,adjacency,nodeIds,truncated}` (throws RangeError on feat
... [+536 chars truncated]

### Assistant | 2026-05-16T18:37:13.491Z

I'll review the file cold, end-to-end. Let me read it first.

### Assistant | 2026-05-16T18:37:13.712Z

[tool_use: Read]

### User | 2026-05-16T18:37:14.520Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+22715 chars truncated]

### Assistant | 2026-05-16T18:37:18.133Z

Now let me verify the U5 predictor API matches what's being used here.

### Assistant | 2026-05-16T18:37:18.531Z

[tool_use: Read]

### User | 2026-05-16T18:37:18.956Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 17m ago in this session and is unchanged (mtime 1778939956222). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T18:37:21.463Z

I have the predictor lib in context already. Let me verify the specific API surfaces being used — `embedGraph` truncation behavior and `scoreLink` signature.

### Assistant | 2026-05-16T18:37:22.412Z

[tool_use: Grep]

### User | 2026-05-16T18:37:23.725Z

[tool_result] 56:export function loadPredictor(input) {
57-  const { model, calibrator, metadata } = loadCheckpoint(input);
58-  return { model, calibrator: calibrator ?? null, metadata: metadata ?? null };
59-}
60-
61-/** Breakpoints of a bundled calibrator, or null when there is no usable one. */
62-function calibratorBreakpoints(calibrator) {
63-  if (calibrator && Array.isArray(calibrator.breakpoints) && ca
... [+3663 chars truncated]

### Assistant | 2026-05-16T18:37:26.765Z

The U5 predictor API matches the documented contract. Let me verify a couple of details — `embedGraph` returns embeddings only for nodes that have projected features, and check how `normalizeGraph` / `projectGraphFeatures` handle an edgeless subgraph.

### Assistant | 2026-05-16T18:37:27.567Z

[tool_use: Grep]

### User | 2026-05-16T18:37:28.168Z

[tool_result] No matches found

### Assistant | 2026-05-16T18:37:30.701Z

These are likely imported. Let me check imports.

### Assistant | 2026-05-16T18:37:31.769Z

[tool_use: Grep]

### User | 2026-05-16T18:37:32.374Z

[tool_result] 14: *   normalizeGraph (edge-typology-norm)     core edge types
16: *   projectGraphFeatures (feature-proj)     8-d symbolic node features
27:import fs from "node:fs";
28:import path from "node:path";
29:import { fileURLToPath, pathToFileURL } from "node:url";
31:import { loadCheckpoint } from "./graphsage-checkpoint.mjs";
32:import { normalizeGraph } from "./edge-typology-normalizer.mjs";
33:impo
... [+506 chars truncated]

### Assistant | 2026-05-16T18:37:59.439Z

I have what I need. Let me do a thorough cold review of the entire file.

## Verification of prior fixes

**P0 fix — self-vote leakage:** Confirmed genuinely fixed.
- `partitionGhosts` (lines 144-163): builds `targetIds` (line 145) AND `targetLabels` (line 146), and the reference loop excludes by both — `targetIds.has(n.id)` (line 158) and `targetLabels.has(n.label)` (line 159).
- `voteDispatcher` (line 201): `ref.id === target.id || ref.label === target.label` — defence-in-depth for direct-API callers. Correct.

**P1 fix — `--limit` truncates work not output:** Confirmed genuinely fixed.
- `classifyUnknownGhosts` (lines 274-277): slices `targets` by `opts.limit` *before* `buildGhostSubgraph` (line 290), `embedGraph` (line 293), and the vote loop (line 303). Work is bounded.
- `main` (line 460): passes `limit: opts.limit` through; no post-slice. Correct.

Both fixes are clean and introduced no regressions.

## New/remaining findings

I walked the whole file. The two prior fixes are sound, the design invariants hold (hybrid-floor: lines 257/262/265 all return `skipped:true`; no-leakage: double-keyed; composes U5 via the three imports, never reimplements GraphSAGE). One remaining issue:

**P1 — `voteDispatcher` self-exclusion by `target.label` can be wrong when `target.label` is `undefined`, silently dropping every reference and producing a spurious skip.**

Lines 201: `if (!ref || ref.id === target.id || ref.label === target.label) continue;`

`partitionGhosts` only requires `typeof n.id === "string"` to be a ghost (line 137); `label` is never required. A ghost node with no `label` field has `target.label === undefined`. Any reference `ref` that *also* lacks a `label` (`ref.label === undefined`) then satisfies `ref.label === target.label` (`undefined === undefined`) and is skipped — even though it is a legitimately distinct node with a different `id` and a valid `proposed_wiring`. If enough references are label-less, `scored` empties and `voteDispatcher` returns `nul
... [+2736 chars truncated]
