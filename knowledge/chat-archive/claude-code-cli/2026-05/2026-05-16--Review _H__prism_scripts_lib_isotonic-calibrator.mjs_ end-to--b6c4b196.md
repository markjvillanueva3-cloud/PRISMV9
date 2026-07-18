---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/isotonic-calibrator.mjs` end-to-end for correctness"
date: "2026-05-16"
first_ts: "2026-05-16T05:01:57.840Z"
last_ts: "2026-05-16T05:02:29.751Z"
cwd: "H:\\prism\\scripts\\lib"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ac4fa1a1a6e7130f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/isotonic-calibrator.mjs` end-to-end for correctness

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\scripts\lib
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ac4fa1a1a6e7130f6.jsonl`

## Transcript

### User | 2026-05-16T05:01:57.840Z

Review `H:/prism/scripts/lib/isotonic-calibrator.mjs` end-to-end for correctness. This is component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of the NN-GRAPH-MS0 GNN milestone — a pure ES-module library (`scripts/lib/*.mjs` + `node:test` convention, NOT a TypeScript engine).

WHAT IT MUST DO: isotonic-regression probability calibration via the Pool Adjacent Violators (PAV) algorithm. It fits a monotone non-decreasing step function mapping a classifier's raw scores to calibrated probabilities, given (score, label) training pairs. `fitIsotonicCalibrator` produces a JSON-serializable `breakpoints` array; `predictCalibrated` interpolates over it (clipped linear, sklearn `IsotonicRegression(out_of_bounds='clip')` semantics). Pure and deterministic.

FOCUS YOUR REVIEW ON:
1. **PAV correctness** — `poolAdjacentViolators`. Is the merge condition right for a NON-DECREASING fit? Is it genuinely linear-time (each block pushed/popped at most once)? Does the weighted-mean pooling preserve `sumW`/`sumWY` correctly? Is the output provably monotone non-decreasing in `y`? Do the `count` values sum to the number of valid input points?
2. **fitIsotonicCalibrator** — the sort, the exact-score-tie pooling (a score must map to ONE calibrated value — verify ties cannot straddle two blocks), the block→breakpoint expansion. Is the `idx` walk over `points[idx .. idx+count-1]` correct and in-bounds? Are the breakpoints monotone in BOTH x and y?
3. **predictCalibrated** — the binary search for the bracketing interval, the clip-to-endpoints behavior, the linear interpolation. Off-by-one in the binary search? Is monotonicity of the output in x guaranteed? The empty-breakpoints identity fallback.
4. **Edge cases** — empty training data, a single pair, all-identical scores, all-identical labels, all-positive or all-negative labels, NaN/Infinity in scores or labels, duplicate scores with conflicting labels, a score exactly on a breakpoint.
5. **brierScore** — the mean-squared-error math; empty → NaN; 
... [+431 chars truncated]

### Assistant | 2026-05-16T05:02:03.043Z

I'll review the isotonic calibrator library end-to-end.

### Assistant | 2026-05-16T05:02:03.408Z

[tool_use: Read]

### User | 2026-05-16T05:02:04.426Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
4	 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * Why this exists: a trained classifier's raw output score is rarely a
7	 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
8	 * cases that are positive only 60% of the time. The NN-GRAPH-MS0
... [+8228 chars truncated]

### Assistant | 2026-05-16T05:02:29.751Z

## Code Quality Analysis Report — isotonic-calibrator.mjs

I reviewed all 192 lines end-to-end against the PAV algorithm and sklearn `IsotonicRegression` semantics.

### 1. PAV correctness (`poolAdjacentViolators`, L41-64)
The merge condition `prev.sumWY/prev.sumW <= cur.sumWY/cur.sumW → break` is correct for a non-decreasing fit (merge only on strict violation). Linear-time holds: each new point creates one block; each merge pops exactly one block permanently, so total pops ≤ total pushes — amortized O(n). Weighted pooling sums `sumW`/`sumWY` correctly; output mean `sumWY/sumW` is a convex combination of two means, so it lands strictly between them — monotonicity is provably preserved. `count` accumulates `prev.count + cur.count` and unmerged blocks keep `count:1`, so block counts sum to the number of finite-y points. **Correct.**

### 2. `fitIsotonicCalibrator` (L82-133)
Sort `(a.x-b.x)||(a.y-b.y)` is stable enough (deterministic). Exact-score-tie pooling (L107-116) collapses identical `x` into one point *before* PAV, so a score maps to exactly one block — ties cannot straddle. `pavInput` weight is the tie count, preserving the correct weighted contribution. The `idx` walk: `points[idx]` and `points[idx + b.count - 1]` — since `Σ b.count == points.length` and `idx` advances by `b.count`, the last access is `points[points.length-1]`, in-bounds. Breakpoints: x is non-decreasing (blocks cover disjoint ascending point ranges), y is non-decreasing (PAV guarantee). **Correct.**

### 3. `predictCalibrated` (L142-166)
Binary search invariant: `breakpoints[lo].x <= xv < breakpoints[hi].x` maintained, loop exits at `hi-lo==1`, no off-by-one. Clip branches (L150-151) handle `xv<=first.x` / `xv>=last.x`. Interpolation `t∈[0,1)` over a non-decreasing `(a.y,b.y)` → output monotone in x. Empty-breakpoints identity fallback (L144-145) is correct. **Correct.**

### P1 — duplicate-x breakpoint shadowing (L128-129, L161-163)
When a flat PAV block is followed by another block whose `
... [+2130 chars truncated]
