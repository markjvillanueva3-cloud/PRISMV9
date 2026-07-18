---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent review of a controlled GNN experiment harness + the honesty of its c"
date: "2026-06-18"
first_ts: "2026-06-18T02:49:51.905Z"
last_ts: "2026-06-18T02:50:19.710Z"
cwd: "H:\\prism-slot-india"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a1881e7449df58f2e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent review of a controlled GNN experiment harness + the honesty of its c

> **claude-code-cli** | 2026-06-18 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a1881e7449df58f2e.jsonl`

## Transcript

### User | 2026-06-18T02:49:51.905Z

Independent review of a controlled GNN experiment harness + the honesty of its conclusion. Grade PASS/FAIL with P0/P1/P2 + file:line. Read fully.

FILE: H:/prism/scripts/measure-codebase-wired-refpool-auroc.mjs (NEW --controlled mode).

MEASURED RESULT the harness produced (validate it is sound):
  baseline (deployed 355-ref pool):      AUROC 0.7891, selective deploy-ready-selective @tau=0.7, coverage 27.4%, Brier@gate 0.0417, macroF1 1.0, classes 2/13, holdoutN=84
  enriched (+3206, VARIABLE holdout):     AUROC 0.7716, no-deployable-operating-point, coverage 42.5%, Brier@gate 0.2577, macroF1 0.3169, classes 29/29, holdoutN=200
  controlled (+3206, FIXED base holdout): AUROC 0.7925 (+0.003), no-deployable-operating-point, coverage 52.4%, Brier@gate 0.1951, macroF1 0.2259, classes 16-emit/13-truth, holdoutN=84
  CONCLUSION printed: "the refs do NOT help even on a FIXED holdout -> rejection CONFIRMED; do NOT apply."

The harness: snapshots `baseNodesSnapshot = graph.nodes.slice()` BEFORE `graph.nodes.push(...3206 ghosts)`, then runs `controlled = runAssessment({ graph, holdoutGraph: {...graph, nodes: baseNodesSnapshot}, directEmbed:true, directEmbedPath: merged })`.

VERIFY (cite file:line):
1. CONTROLLED-NESS: is baseNodesSnapshot a TRUE frozen copy of the pre-injection 355-ghost node set (Array.slice copies the array; the later push mutates the original array, not the slice)? So buildHoldout(holdoutGraph) yields the SAME 84-item holdout as baseline? Any aliasing leak?
2. FAIR ISOLATION: is the ONLY difference between baseline and controlled the reference pool (base 355 vs base+3206)? The 84 holdout items have identical embeddings in both runs (base 355 kept verbatim in the merge)?
3. R12 HONESTY: global AUROC went UP (+0.003) yet the conclusion is "rejection CONFIRMED". Is that honest or cherry-picking? Judge: for a tier whose deployed value is the high-confidence abstention band, is the SELECTIVE gate (Brier@gate + macroF1@gate + verdict flip deploy-ready->no-deplo
... [+547 chars truncated]

### Assistant | 2026-06-18T02:49:55.300Z

I'll review this GNN experiment harness for soundness and honesty of its conclusion. Let me start by reading the target file end to end.

### Assistant | 2026-06-18T02:49:55.613Z

[tool_use: Read]

### User | 2026-06-18T02:49:56.500Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-codebase-wired-refpool-auroc.mjs -- NON-DESTRUCTIVE deploy-gate measurement for the
4	 * U-GNN-CODEBASE-WIRED-APPLY lever (slot:india 2026-06-18). Answers ONE question with real
5	 * metrics, never an assumption: does adding the ~3206 codebase-wired reference ghosts (engine
6	 * imported by exactly one dispatcher -> confidence 1.0 label) to the GNN tier-5 d
... [+15475 chars truncated]

### Assistant | 2026-06-18T02:49:59.927Z

Now let me read the key dependencies that determine whether the controlled-ness claim holds. The critical question is what `runAssessment` and `buildHoldout` do with `holdoutGraph`, and how `directEmbed` k-NN resolves the reference pool.

### Assistant | 2026-06-18T02:50:00.394Z

[tool_use: Read]

### User | 2026-06-18T02:50:00.832Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.mjs' was already read 18s ago in this session and is unchanged (mtime 1781749663909). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T02:50:04.319Z

The guard says I already have it, but I don't see it in my context — let me search for the key functions I need to verify the controlled-ness claim.

### Assistant | 2026-06-18T02:50:05.889Z

[tool_use: Grep]

### User | 2026-06-18T02:50:07.087Z

[tool_result] 13: *      confidence is at or above refMinConf.
57:  refMinConf: 0.8,     // a ghost is a reference + holdout candidate at/above this
454:export function buildHoldout(graph, opts = {}) {
455:  const refMinConf = Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf;
468:    if (!Number.isFinite(n.confidence) || n.confidence < refMinConf) continue;
523:export function as
... [+1049 chars truncated]

### Assistant | 2026-06-18T02:50:09.887Z

Let me read the critical sections of `nn-graph-eval.mjs` — `buildHoldout`, `assessHoldout`, and `runAssessment` — to verify the controlled-ness and isolation claims.

### Assistant | 2026-06-18T02:50:10.719Z

[tool_use: Read]

### User | 2026-06-18T02:50:11.602Z

[tool_result] 440	  const rng = mulberry32(seed);
441	  for (let i = out.length - 1; i > 0; i--) {
442	    const j = Math.floor(rng() * (i + 1));
443	    const t = out[i]; out[i] = out[j]; out[j] = t;
444	  }
445	  return out;
446	}
447	
448	/**
449	 * Build the leave-out holdout: every high-confidence reference ghost, split
450	 * (seeded) into a held-out test set and the remaining reference pool. The
451	 * h
... [+13949 chars truncated]

### Assistant | 2026-06-18T02:50:15.763Z

This is the critical seam. Now I have the key mechanism confirmed. Let me verify two more things: (1) how `classifyUnknownGhosts`/`directEmbed` resolves the reference pool from the embeddings file vs the graph nodes — to confirm the controlled run's reference pool truly is base+3206 — and (2) how `selectiveDeployPoint` / `gradeSelectiveDeploy` produce the verdict flip. Let me also confirm `classesEmitted`/`totalClasses` semantics.

### Assistant | 2026-06-18T02:50:17.641Z

[tool_use: Grep]

### User | 2026-06-18T02:50:18.614Z

[tool_result] 253:    classesEmitted: new Set(predicted).size,
259:export function riskCoverageCurve(samples, gates = GATE_THRESHOLDS, thresholds = SELECTIVE_THRESHOLDS) {
284:export function selectiveDeployPoint(samples, gates = GATE_THRESHOLDS, opts = {}) {
292:    return { found: false, productionMinConf: round4(productionMinConf), productionPoint: null, maxCoveragePoint: null, robustAboveGate: false, totalC
... [+1641 chars truncated]

### Assistant | 2026-06-18T02:50:19.710Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
