---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/graphsage-train-pipeline.mjs` end-to-end. This is c"
date: "2026-05-16"
first_ts: "2026-05-16T13:40:08.934Z"
last_ts: "2026-05-16T13:41:10.359Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 12
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a74ef6b7ff0919e3b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/graphsage-train-pipeline.mjs` end-to-end. This is c

> **claude-code-cli** | 2026-05-16 | 28 msgs (12 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a74ef6b7ff0919e3b.jsonl`

## Transcript

### User | 2026-05-16T13:40:08.934Z

Review `H:/prism/scripts/lib/graphsage-train-pipeline.mjs` end-to-end. This is component (d) of unit U-NNG-GRAPHSAGE-TRAIN (U4) in NN-GRAPH-MS0 — the training-script CLI orchestrator for a GraphSAGE link-prediction GNN over the PRISM system-viz graph. Plain `scripts/lib/*.mjs` ES module, `node:test` convention.

WHAT IT DOES: an end-to-end pipeline that loads the system-viz graph, normalizes edge types, builds an adjacency map (capped at maxNodes for memory), projects 8-d node features, trains a 2-layer GraphSAGE model by SGD link prediction, evaluates on held-out edges, fits an isotonic calibrator, and serializes a checkpoint. It composes 8 sibling libs: `edge-typology-normalizer` (normalizeGraph), `graph-random-walk` (buildAdjacency, mulberry32), `systemviz-node-feature-projector` (projectGraphFeatures), `graphsage-model` (createModel, forward, sigmoid, dot), `graphsage-trainer` (train, rocAuc), `isotonic-calibrator` (fitIsotonicCalibrator, calibrateScores, brierScore), `graphsage-checkpoint` (saveCheckpoint), `system-viz-graph` (loadGraph). Read those sibling files as needed to verify the composition is correct.

VERIFY HARD:
- **Leakage-safety.** The pipeline claims a leakage-free eval: trains on TRAIN edges only, the held-out forward pass uses the TRAIN adjacency only (test edges never in the message-passing graph), and negatives are never real edges. Trace `runTrainingPipeline` and `evaluatePipeline` and confirm there is genuinely NO path where a test edge leaks into training or into the eval message-passing graph.
- **Memory.** `forward` processes the entire feature map it is given. The model's own SCALE CAVEAT says a full 372k-node forward OOMs (~7 GB). Confirm `features` is correctly restricted to the capped adjacency node set, and that the per-epoch full-batch forward inside `train` is bounded by `maxNodes`.
- **Non-finite contamination.** `saveCheckpoint` THROWS on a non-finite number anywhere in the bundled `metadata`. Confirm every numeric metric that c
... [+1092 chars truncated]

### Assistant | 2026-05-16T13:40:13.870Z

I'll review the training-script CLI orchestrator and its sibling dependencies.

### Assistant | 2026-05-16T13:40:14.306Z

[tool_use: Read]

### Assistant | 2026-05-16T13:40:14.898Z

[tool_use: Glob]

### User | 2026-05-16T13:40:15.158Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-train-pipeline.mjs — end-to-end GraphSAGE link-prediction training
4	 * pipeline. Component (d), the training-script CLI orchestrator, of unit
5	 * U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
6	 *
7	 * Composes the U1-U4 libs into one runnable pipeline:
8	 *   loadGraph (system-viz-graph)          load the system-viz graph from disk
9	 *   normalizeGraph 
... [+17619 chars truncated]

### User | 2026-05-16T13:40:22.054Z

[tool_result] scripts\lib\edge-typology-normalizer.mjs
scripts\lib\system-viz-graph.mjs
scripts\lib\graph-random-walk.mjs
scripts\lib\systemviz-node-feature-projector.mjs
scripts\lib\isotonic-calibrator.mjs
scripts\lib\graphsage-model.mjs
scripts\lib\graphsage-trainer.mjs
scripts\lib\graphsage-checkpoint.mjs

### Assistant | 2026-05-16T13:40:24.334Z

Now let me read the sibling libs to verify the composition.

### Assistant | 2026-05-16T13:40:24.783Z

[tool_use: Read]

### Assistant | 2026-05-16T13:40:25.210Z

[tool_use: Read]

### User | 2026-05-16T13:40:25.220Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-model.mjs' was already read 27m ago in this session and is unchanged (mtime 1778910588671). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:40:25.594Z

[tool_use: Read]

### Assistant | 2026-05-16T13:40:26.010Z

[tool_use: Read]

### User | 2026-05-16T13:40:26.050Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-trainer.mjs — link-prediction training for the GraphSAGE model.
4	 * The training half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * forward half is graphsage-model.mjs.
6	 *
7	 * Objective — supervised link prediction. A positive sample is a real edge,
8	 * a negative sample a sampled non-edge. The score for a pair (u,v) is
9	 * sigmoid(z_
... [+14460 chars truncated]

### User | 2026-05-16T13:40:26.078Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-checkpoint.mjs' was already read 19m ago in this session and is unchanged (mtime 1778937451204). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T13:40:26.774Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-random-walk.mjs — node2vec 2nd-order biased random walks over the
4	 * normalized PRISM system graph. Foundation for U-NNG-NODE2VEC-TOPOLOGY:
5	 * the walk corpus feeds the skip-gram embedder (Node2Vec part 2).
6	 *
7	 * Reference: Grover & Leskovec, "node2vec: Scalable Feature Learning for
8	 * Networks" (KDD 2016). The 2nd-order transition from (prev → cur 
... [+7988 chars truncated]

### Assistant | 2026-05-16T13:40:30.418Z

I have the trainer and graph-random-walk. Let me read the remaining siblings I haven't seen.

### Assistant | 2026-05-16T13:40:31.276Z

[tool_use: Read]

### Assistant | 2026-05-16T13:40:31.697Z

[tool_use: Read]

### Assistant | 2026-05-16T13:40:32.118Z

[tool_use: Read]

### User | 2026-05-16T13:40:32.249Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * edge-typology-normalizer.mjs — NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE
4	 *
5	 * Normalize the 49 raw edge types in system-viz/system-graph.json down to a
6	 * 7-type core ontology suitable for GraphSAGE message-passing. The original
7	 * raw type is preserved on every normalized edge so no information is lost.
8	 *
9	 * Why 7? Empirically, GraphSAGE on heterogeneous kno
... [+6363 chars truncated]

### Assistant | 2026-05-16T13:40:32.496Z

[tool_use: Read]

### User | 2026-05-16T13:40:33.038Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * systemviz-node-feature-projector.mjs — projects a PRISM system-viz graph
4	 * node into a fixed 8-dimensional numeric feature vector. Unit U3c of
5	 * NN-GRAPH-MS0 (U-NNG-NODE2VEC-TOPOLOGY).
6	 *
7	 * Where this fits: U3a generates biased random walks, U3b learns a *topology*
8	 * embedding from those walks (structural identity). U3c is the complement —
9	 * a node
... [+10185 chars truncated]

### User | 2026-05-16T13:40:33.381Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
4	 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * Why this exists: a trained classifier's raw output score is rarely a
7	 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
8	 * cases that are positive only 60% of the time. The NN-GRAPH-MS0
... [+8914 chars truncated]

### User | 2026-05-16T13:40:34.048Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so callers (batch tools,
5	 * hooks) can load the 324 MB graph ONCE and query it many times without
6	 * re-parsing per call.
7	 *
8	 * Exports:
9	 *   loadGraph()               — parse graph from disk, return raw object.
10	 *   findInGraph(G, q, opts)   — case-insensitive n
... [+1876 chars truncated]

### Assistant | 2026-05-16T13:40:37.687Z

I have all the sibling libs. Let me verify the `forward` and `createModel` contract from graphsage-model.mjs which I read earlier.

### Assistant | 2026-05-16T13:40:39.476Z

[tool_use: Grep]

### User | 2026-05-16T13:40:40.078Z

[tool_result] 24- * features) — everything graphsage-trainer.mjs needs for backprop. Pure
25- * inference callers pass { buildCache:false } to skip it.
26- *
27: * SCALE CAVEAT (honest): a full-cache forward over the whole 372k-node graph
28: * materializes ~7 GB of activations and will OOM. The trainer and the U4
29- * training script mini-batch — sample a batch of edges, induce their K-hop
30- * neighbourhood
... [+2879 chars truncated]

### Assistant | 2026-05-16T13:41:10.359Z

I have full visibility into the composition. Here is my review.

---

## Review: `graphsage-train-pipeline.mjs` (U-NNG-GRAPHSAGE-TRAIN component d)

### Leakage-safety — VERIFIED CLEAN
- `splitEdges` partitions `edges` (from `collectUndirectedEdges(adj)`) into disjoint `trainEdges`/`testEdges` via Fisher-Yates slice. Disjoint by construction.
- `buildTrainAdjacency(trainEdges)` builds the message-passing graph from TRAIN edges only. `train` consumes `trainAdj`; `evaluatePipeline` is passed `trainAdj` as `evalAdjacency`. Test edges never enter message passing.
- `train` internally re-derives its positive edge set from `trainAdj` (line 296-305) — so it can only sample TRAIN edges. Confirmed: no test edge can be sampled as a training positive.
- Negatives: `sampleEvalNegatives` rejects any pair in `edgeKeySet`, which is the FULL edge set (train+test) from `collectUndirectedEdges`. A real test edge is never handed back as a negative. `train`'s own negatives use `edgeSet` derived from `trainAdj` — a held-out test edge *could* be sampled as a training negative, but that is standard practice (the test edge isn't in the training graph; treating an unobserved pair as negative is the link-prediction assumption) and is not eval leakage. **No leakage path.**

### Memory — VERIFIED BOUNDED
- `buildAdjacency(..., {maxNodes})` caps `nodeIds` to `maxNodes`. `features` is rebuilt (lines 220-224) by iterating `nodeIds` only — so `features.size ≤ maxNodes`.
- `forward` processes exactly `features.keys()`; `train`'s per-epoch full-batch forward and `evaluatePipeline`'s forward both run over the capped `features`. The 372k→7GB OOM is correctly bounded by `maxNodes` (default 6000). **No OOM path.**

### Non-finite contamination — VERIFIED CLEAN
Every NaN-capable metric is guarded: `finalLoss` (NaN when `trained:false`), `auroc` (null/NaN when a class absent), `brierRaw`/`brierCalibrated` (explicit `NaN` on empty input) — all pass through `finiteOrNull`. `nodeCount`, `cappedNodes`, edge c
... [+2886 chars truncated]
