---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe461853-fb09-4525-a8b5-4e88c1ebdb81"
title: "Independent second-pass review of `H:/prism/scripts/lib/graphsage-trainer.mjs` ("
date: "2026-05-16"
first_ts: "2026-05-16T22:44:23.248Z"
last_ts: "2026-05-16T22:45:36.698Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/fe461853-fb09-4525-a8b5-4e88c1ebdb81/subagents/agent-a3c3f6fe038755ed0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review of `H:/prism/scripts/lib/graphsage-trainer.mjs` (

> **claude-code-cli** | 2026-05-16 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe461853-fb09-4525-a8b5-4e88c1ebdb81/subagents/agent-a3c3f6fe038755ed0.jsonl`

## Transcript

### User | 2026-05-16T22:44:23.248Z

Independent second-pass review of `H:/prism/scripts/lib/graphsage-trainer.mjs` (read the WHOLE file). Do NOT assume any other reviewer caught anything.

This is File 1 of unit **U-NEG-SAMPLE-STRATIFIED** (NN-GRAPH-MS0): replacing uniform negative-edge sampling in the GraphSAGE link-prediction pretext with type-stratified negatives (per-type weight = positive-edge type marginal), to kill the cross-type shortcut that drove pretext AUROC to an anti-predictive 0.096 on the heterophilous system-viz graph. New: `positiveTypeMarginal`, `sampleStratifiedNegativeEdges`, `TRAIN_DEFAULTS.negPHard`, `negPHard` validation, and `train()` switching to the stratified sampler only when `options.nodeType` (non-empty Map) is supplied (else byte-identical legacy path).

Weight your review toward what a correctness-focused reviewer is LESS likely to catch:
- **Statistical validity of the fix itself**: does weighting intra-type buckets by `positiveTypeMarginal` actually make the negative type-distribution mirror the positive one, or is there a subtle bias (e.g. endpoint double-count, big-bucket dominance, the (1-pHard) uniform tail re-introducing the very cross-type shortcut we're removing)? Is pHard=0.7 defensible or arbitrary?
- **Will the eventual test be able to FAIL if the logic regresses** (R9 — intent not behavior)? Is a meaningful invariant assertable (e.g. "stratified negatives have a materially higher same-type fraction than uniform")?
- Integration/coupling: `train()` passes `edges` (post-exclude) to `positiveTypeMarginal` — are those the right edges (train-only vs full)? Hidden coupling with `excludeEdges`.
- Hidden inlined constants, naming/convention drift, error-budget gaps, security of LLM/graph-derived `nodeType` keys (untrusted strings as Map keys — any `__proto__`/getter hazard?).
- Determinism + reproducibility of the committed-checkpoint workflow.

Report ONLY P0/P1 with file:line + concrete fix. End with exactly one line: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T22:44:26.968Z

I'll review the file thoroughly.

### Assistant | 2026-05-16T22:44:27.404Z

[tool_use: Read]

### User | 2026-05-16T22:44:28.497Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-trainer.mjs' was already read 13s ago in this session and is unchanged (mtime 1778971396113). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T22:44:31.620Z

The read-once guard says the file is already in my context, but I don't actually see the file contents in my context. Let me read it with explicit cache disable.

### Assistant | 2026-05-16T22:44:32.668Z

[tool_use: Bash]

### User | 2026-05-16T22:44:37.611Z

[tool_result] 503 H:/prism/scripts/lib/graphsage-trainer.mjs

### Assistant | 2026-05-16T22:44:39.863Z

[tool_use: Read]

### User | 2026-05-16T22:44:40.826Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-trainer.mjs — link-prediction training for the GraphSAGE model.
4	 * The training half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * forward half is graphsage-model.mjs.
6	 *
7	 * Objective — supervised link prediction. A positive sample is a real edge,
8	 * a negative sample a sampled non-edge. The score for a pair (u,v) is
9	 * sigmoid(z_
... [+22463 chars truncated]

### Assistant | 2026-05-16T22:44:44.158Z

Now I have the full file. Let me analyze the statistical validity of the stratified sampler carefully, plus integration and security.

Let me check the `mulberry32` import and `excludeEdges` semantics relative to `positiveTypeMarginal`.

### Assistant | 2026-05-16T22:44:45.284Z

[tool_use: Grep]

### User | 2026-05-16T22:44:45.997Z

[tool_result] 35:export function mulberry32(seed) {

### Assistant | 2026-05-16T22:45:36.698Z

Let me focus the statistical analysis. The core question is whether weighting buckets by `positiveTypeMarginal` makes the negative type-distribution mirror the positive one.

Let me reason through the math carefully:

**Positive edge type distribution:** For positive edges, `positiveTypeMarginal` counts each *endpoint*. If positives are dominated by intra-type edges of type T, the marginal heavily weights T (counted twice per such edge). The positive *endpoint* distribution is what `m` captures: P(endpoint type = T) ∝ marginal[T].

**Stratified negative construction:** With prob `pHard`, pick a bucket (type T) with prob ∝ `w_T = marginal[T]`, then draw *both* endpoints uniformly from bucket T. So a hard negative is an intra-type pair of type T with P(T) ∝ marginal[T]. The negative *endpoint* distribution among hard negatives: P(endpoint type = T) ∝ marginal[T] (both endpoints type T, bucket chosen ∝ marginal[T]). That matches the positive endpoint marginal. Good — the design intent holds for the hard fraction.

Now the issues:

**Issue 1 (P1) — the `(1-pHard)` uniform tail re-injects the exact cross-type shortcut the unit exists to remove, and pHard=0.7 still leaves 30% of negatives uniform.** Lines 239-242. On the heterophilous, type-imbalanced system-viz graph (the documented motivation), uniform pairs are overwhelmingly cross-type. So 30% of all negatives remain cross-type-dominated, while ~0% of positives are cross-type (the graph is heterophilous-by-wiring but type-imbalanced means random pairs are cross-type). The model can still partially exploit "cross-type ⇒ likely negative" because cross-type pairs are ~0% of positives but ~30%×(cross-type-fraction) of negatives. The marginal-weighted hard fraction is correct, but mixing in an unconditioned uniform tail measurably re-introduces the shortcut. This is the subtle statistical bias the unit is supposed to kill. Concrete fix: make the uniform tail *also* type-aware — draw the (1-pHard) fraction as cross-type pai
... [+6909 chars truncated]
