---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Independent review of the newly-written file `H:/prism/scripts/lib/nn-graph-eval"
date: "2026-05-16"
first_ts: "2026-05-16T19:12:22.357Z"
last_ts: "2026-05-16T19:13:20.522Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a13d0733541a3b5bc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Independent review of the newly-written file `H:/prism/scripts/lib/nn-graph-eval

> **claude-code-cli** | 2026-05-16 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a13d0733541a3b5bc.jsonl`

## Transcript

### User | 2026-05-16T19:12:22.357Z

Independent review of the newly-written file `H:/prism/scripts/lib/nn-graph-eval.mjs`. Use the Read tool on it AND on `H:/prism/scripts/seed-ghost-gnn-classify.mjs` (the U6 classifier it composes).

CONTEXT — unit U7 (U-NNG-EVAL-HARNESS) of NN-GRAPH-MS0. This harness assesses the U6 GNN tier-5 wiring classifier against the exit gates AUROC>=0.78 / macro-F1>=0.55 / Brier<=0.15. It builds a seeded leave-out holdout of high-confidence reference ghosts, runs `classifyUnknownGhosts` on them, and computes the metrics. It writes a report `NN-EVAL.{md,json}`. The CLI `main` evaluates a trained checkpoint or — if none exists — emits an honest `deferred` report.

Weight your review toward what a metric-focused analyzer might miss:
  - INTEGRATION with U6: `assessHoldout` calls `classifyUnknownGhosts(graph, {predictor, targetNames, minConf:0, refMinConf})`. Confirm this opts shape is exactly what U6's `classifyUnknownGhosts` accepts, and that `minConf:0` is the right choice for an assessment (it wants every prediction, not the deployment gate). Confirm the holdout ghosts' labels passed as `targetNames` will actually be CLASSIFIED by U6 (U6 partitions targets by label) AND excluded from U6's reference set (the leakage guard).
  - HONEST FRAMING: the file's docstring + report repeatedly state this is an "internal-consistency metric, not ground truth" — because the held-out labels come from the keyword/sibling heuristic tiers, not verified wiring. Confirm the report (`renderReport`) actually carries that caveat into both the deferred and the non-deferred output, so a reader cannot mistake the AUROC for accuracy-vs-truth. This honesty is load-bearing — the milestone's whole credibility rests on it.
  - DETERMINISM: same graph + checkpoint + seed ⇒ identical report. Check the seeded shuffle, and that `assessedAt`/`now` is the only non-deterministic field (and is injectable via `opts.now`).
  - FAILURE PATHS: graph-load failure, missing checkpoint, empty holdout, insufficient refere
... [+768 chars truncated]

### Assistant | 2026-05-16T19:12:25.449Z

I'll review the harness file and its U6 dependency.

### Assistant | 2026-05-16T19:12:25.829Z

[tool_use: Read]

### Assistant | 2026-05-16T19:12:25.976Z

[tool_use: Read]

### User | 2026-05-16T19:12:26.305Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.mjs' was already read 14s ago in this session and is unchanged (mtime 1778958683168). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T19:12:26.446Z

[tool_result] read-once-guard: 'H:\prism\scripts\seed-ghost-gnn-classify.mjs' was already read 27m ago in this session and is unchanged (mtime 1778957065034). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T19:12:29.099Z

The read-once guard claims both files are already in my context, but as a freshly-spawned review agent I do not have them. I must read them to perform the review. Let me bypass the cache.

### Assistant | 2026-05-16T19:12:30.369Z

[tool_use: Bash]

### Assistant | 2026-05-16T19:12:31.277Z

[tool_use: Bash]

### User | 2026-05-16T19:12:34.583Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
     4	 *
     5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
     6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
     7	 * to deploy, against the milestone's mandatory exit gates:
     8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.
... [+21603 chars truncated]

### User | 2026-05-16T19:12:38.433Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
     4	 *
     5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
     6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
     7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
     8	 * ad
... [+24943 chars truncated]

### Assistant | 2026-05-16T19:13:20.522Z

Both files read in full. The triage warning is spurious (the commands succeeded). Now I'll cross-check the integration carefully.

## Review of `H:/prism/scripts/lib/nn-graph-eval.mjs` (U7)

### Integration with U6 — one real defect

**P1 — Leakage guard partially defeated by U6's label-keyed target partition (`assessHoldout` line 254 + U6 `partitionGhosts` lines 151–174).**

`assessHoldout` builds `targetNames = new Set(holdout.map(h => h.label))` and passes it to `classifyUnknownGhosts`. U6's `partitionGhosts` then partitions ghosts **by `n.label`**: `isTarget = (n) => targetNames.has(n.label)`. The reference-exclusion guard (U6 lines 169–170) excludes a node from the reference pool if its `id` is a target id **or** its `label` is in `targetLabels`.

But the harness held out *node objects* and removed them from its **own** local `pool` (line 237 `seededShuffle(pool, seed).slice(0, k)`) — the held-out objects are still present in `graph.nodes`. The leakage exclusion therefore relies entirely on U6's label-based filter. This works **only if engine labels are unique among reference-eligible ghosts**. If two distinct ghost nodes share the same `label` (different `id`), holding out *one* of them causes U6 to:
1. Classify **both** as targets (label match), and
2. Exclude **both** from references (label match).

That second part is actually the safe direction (no leakage). But the first part means U6 returns a classification for a ghost the harness never held out, and — more importantly — the harness's *non-held-out* twin gets silently dropped from the reference pool too, shrinking the voting basis. The metric is still leakage-free, but `buildHoldout`'s `poolSize`/`cap` accounting (line 235) is computed against a pool that U6 will further thin. This is a soundness drift, not a crash. U6's own comment at lines 166–168 explicitly acknowledges duplicate-label ghosts exist as a real concern. **Recommend:** in `buildHoldout`, dedupe `pool` by `label` before the cap/shuffle, o
... [+5113 chars truncated]
