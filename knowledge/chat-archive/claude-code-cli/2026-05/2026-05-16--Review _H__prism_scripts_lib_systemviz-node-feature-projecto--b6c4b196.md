---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/systemviz-node-feature-projector.mjs` end-to-end fo"
date: "2026-05-16"
first_ts: "2026-05-16T04:46:55.951Z"
last_ts: "2026-05-16T04:47:29.449Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aca4ae69a8e69e6cd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/systemviz-node-feature-projector.mjs` end-to-end fo

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aca4ae69a8e69e6cd.jsonl`

## Transcript

### User | 2026-05-16T04:46:55.951Z

Review `H:/prism/scripts/lib/systemviz-node-feature-projector.mjs` end-to-end for correctness. This is unit U3c of NN-GRAPH-MS0 (a GNN roadmap) — a pure ES-module library (`scripts/lib/*.mjs` + `node:test` convention, NOT a TypeScript engine).

WHAT IT MUST DO: project a PRISM system-viz graph node into a fixed 8-dimensional numeric feature vector (a `Float32Array`), every component squashed to [0,1]. These features feed a GraphSAGE GNN (unit U4) as per-node input features. It must be pure and deterministic. It uses a sklearn-style fit/transform: `computeFeatureStats(graph)` does one pass to find P99 of heavy-tailed fields (complexity, actionCount), then `projectNodeFeatures(node, stats)` is pure per node.

The node schema it consumes (verified by sampling the real file `state/shared/system-viz/system-graph-normalized.json`, schemaVersion 2.29.0) is:
`{ id, layer (e.g. "L0".."L13","L4a","Lgit"), subgroup, label, info, status ("built"|"unwired"|...), size, tier (0..5), awareness:{svi 0-1, testCount, complexity (unbounded int), coverage 0-1, actionCount (unbounded int), registryEntries}, businessValue:{tags:[], roi:"low"|"medium"|"high", rationale} }`. Every field is optional.

FOCUS YOUR REVIEW ON:
1. Correctness of each of the 8 feature extractors — layer ordinal, tier/5, svi, coverage, log1p-percentile-scaled complexity & actionCount, statusScore, roiScore. Is every output genuinely in [0,1]?
2. The percentile math — `percentileValue` (nearest-rank) and `log1pPercentileScale`. Off-by-one in the rank index? Correct behavior for n=1, n=0, all-equal values?
3. Numerical safety — NaN/Infinity/negative inputs, divide-by-zero in the scale (a graph where every complexity is 0), `clamp01` handling NaN (the code relies on `NaN > 0` being false — verify that reasoning).
4. Edge cases — null node, node missing `awareness` or `businessValue`, missing `id`, duplicate ids, empty graph, a layer string the LAYER_ORDER list doesn't contain, `tier` as a string, negative complexity.

... [+570 chars truncated]

### Assistant | 2026-05-16T04:47:02.091Z

I'll review the file end-to-end.

### Assistant | 2026-05-16T04:47:02.415Z

[tool_use: Read]

### User | 2026-05-16T04:47:03.433Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * systemviz-node-feature-projector.mjs — projects a PRISM system-viz graph
4	 * node into a fixed 8-dimensional numeric feature vector. Unit U3c of
5	 * NN-GRAPH-MS0 (U-NNG-NODE2VEC-TOPOLOGY).
6	 *
7	 * Where this fits: U3a generates biased random walks, U3b learns a *topology*
8	 * embedding from those walks (structural identity). U3c is the complement —
9	 * a node
... [+8850 chars truncated]

### Assistant | 2026-05-16T04:47:29.449Z

I have the file content. Let me analyze each focus area rigorously.

## Code Quality Analysis Report

### Summary
- Files Analyzed: 1 (`H:/prism/scripts/lib/systemviz-node-feature-projector.mjs`, 203 lines)
- Overall Quality: high — clean, well-documented, defensively coded
- Critical Issues: 0 P0
- P1 Issues: 1

### 1. Feature extractors — all genuinely in [0,1]

- **f[0] layer** (`parseLayerOrdinal`, L79): exact-match `idx/15` ∈ [0,1]; `L<digits>` fallback clamps `n` to [0,15] before `/15`; else 0. Sound.
- **f[1] tier** (L169): `clamp01(safeNum(tier)/5)`. `tier` as string → `safeNum` coerces (`"3"`→3); non-numeric → 0. Negative tier → clamp01→0. Bounded.
- **f[2] svi / f[3] coverage** (L170-171): `clamp01(safeNum(...))`. Bounded.
- **f[4]/f[5] complexity/actionCount** (L172-173): `clamp01(log1p(max(0,x))/scale)`. `clamp01` caps a node above P99 at 1. `cScale/aScale` re-guarded `>0` (L165-166). Bounded.
- **f[6] status / f[7] roi**: return literal {0, 0.5, 1}. Bounded.

All 8 are provably in [0,1].

### 2. Percentile math — correct

`percentileValue` (L111): nearest-rank `rank = ceil(p·n)`, `idx = clamp(rank-1, 0, n-1)`. For n=1: `ceil(0.99·1)=1`→idx 0 ✓. For p=1.0, n=10: `ceil(10)=10`→idx 9 (last) ✓. n=0 → 0 ✓. All-equal → returns that value ✓. No off-by-one. `log1pPercentileScale` (L120): all-zero field → `log1p(0)=0` → returns 1, so f[4]=`log1p(0)/1`=0 — correct, no divide-by-zero.

### 3. Numerical safety — correct

`clamp01(x)=x>0?(x<1?x:1):0`: `NaN>0`→false → 0 ✓ (the documented reasoning holds — IEEE-754 NaN comparisons are all false). `Infinity>0`→true, `Infinity<1`→false → 1 ✓. Negative → 0 ✓. `safeNum` rejects NaN/Infinity via `Number.isFinite` ✓. Divide-by-zero impossible (scale re-guarded twice).

### 4. Edge cases — all handled

Null node → all-zero vector (L161) ✓. Missing `awareness`/`businessValue` → `{}` defaults ✓. Missing/null `id` → skipped (`n.id == null` catches both, L196) ✓. Duplicate id → last wins (Map, documented) ✓. Empty graph → `DEFAU
... [+2342 chars truncated]
