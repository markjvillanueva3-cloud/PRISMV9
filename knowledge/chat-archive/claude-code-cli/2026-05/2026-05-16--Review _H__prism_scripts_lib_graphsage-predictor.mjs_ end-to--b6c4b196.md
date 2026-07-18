---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/graphsage-predictor.mjs` end-to-end. This is unit U"
date: "2026-05-16"
first_ts: "2026-05-16T13:53:51.206Z"
last_ts: "2026-05-16T13:55:25.648Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 20
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aab5a340236852357.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/graphsage-predictor.mjs` end-to-end. This is unit U

> **claude-code-cli** | 2026-05-16 | 47 msgs (20 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aab5a340236852357.jsonl`

## Transcript

### User | 2026-05-16T13:53:51.206Z

Review `H:/prism/scripts/lib/graphsage-predictor.mjs` end-to-end. This is unit U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0 — the GraphSAGE link-prediction INFERENCE module. Plain `scripts/lib/*.mjs` ES module, `node:test` convention.

WHAT IT DOES: loads a checkpoint trained by U4 (`graphsage-train-pipeline`), embeds a graph with the frozen weights, and scores candidate MISSING edges ("wiring links the graph should have but doesn't"). It composes: `loadCheckpoint` (graphsage-checkpoint), `normalizeGraph` (edge-typology-normalizer), `buildAdjacency` (graph-random-walk), `projectGraphFeatures` (systemviz-node-feature-projector), `forward`+`linkScore` (graphsage-model), `predictCalibrated` (isotonic-calibrator), `loadGraph` (system-viz-graph), and reuses `canonicalEdgeKey`+`collectUndirectedEdges` from `graphsage-train-pipeline`. Read those siblings as needed.

Exports: `PREDICT_DEFAULTS`, `loadPredictor`, `embedGraph`, `scoreLink`, `collectCandidateLinks`, `rankPredictions`, `predictMissingLinks`, `parseArgs`, `main`.

VERIFY HARD:
- **Correctness of `collectCandidateLinks` (2-hop candidate generation).** It must yield only true NON-edges (not already in the graph), only genuine 2-hop pairs, no self-loops, no duplicates, and must be BOUNDED (per-node cap AND global cap) so it never explodes on the 372k-node real graph. Trace the loops — is the global cap checked correctly so it cannot overrun? Is the per-node counter reset per node?
- **`scoreLink` calibration honesty.** With no calibrator, `calibratedScore` must equal `rawScore` (never a fabricated probability). With a calibrator, it must use `predictCalibrated(breakpoints, raw)`. Confirm `calibratorBreakpoints` correctly handles a null / empty / unfitted calibrator.
- **`embedGraph` feature-layout guard.** A checkpoint trained on a different `inputDim` than the feature projector produces (8) must throw a clear error, NOT silently produce garbage embeddings. Confirm the check is correct and positioned before `forwar
... [+845 chars truncated]

### Assistant | 2026-05-16T13:53:56.199Z

I'll review the GraphSAGE predictor module and its siblings.

### Assistant | 2026-05-16T13:53:56.621Z

[tool_use: Read]

### Assistant | 2026-05-16T13:53:57.061Z

[tool_use: Read]

### User | 2026-05-16T13:53:57.423Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-predictor.mjs — GraphSAGE link-prediction inference. Unit
4	 * U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0.
5	 *
6	 * Loads a checkpoint trained by U4 (graphsage-train-pipeline), embeds a graph
7	 * with the frozen weights, and scores candidate MISSING edges — the "wiring
8	 * links the graph does not have yet but probably should". Each prediction
9	 * c
... [+13336 chars truncated]

### Assistant | 2026-05-16T13:53:57.473Z

[tool_use: Read]

### User | 2026-05-16T13:53:57.556Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-train-pipeline.mjs' was already read 9m ago in this session and is unchanged (mtime 1778939030437). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:53:57.902Z

[tool_use: Read]

### User | 2026-05-16T13:53:58.287Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-model.mjs — GraphSAGE forward pass + model construction.
4	 * The model half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * training half (backprop + loss + negative sampling) lives in the sibling
6	 * graphsage-trainer.mjs, and U5's link predictor consumes this forward pass
7	 * directly with frozen weights.
8	 *
9	 * Architecture — 2-layer
... [+12113 chars truncated]

### Assistant | 2026-05-16T13:53:58.295Z

[tool_use: Read]

### User | 2026-05-16T13:53:58.394Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\isotonic-calibrator.mjs' was already read 13m ago in this session and is unchanged (mtime 1778907838595). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T13:53:59.048Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-checkpoint.mjs — JSON serialization of a trained GraphSAGE model.
4	 * Component (c) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * The U4 training script saves a trained model here; U5's link predictor
7	 * loads it and runs inference with frozen weights. A checkpoint is a plain
8	 * JSON-safe object — `saveCheckpoint` returns it (the call
... [+11601 chars truncated]

### Assistant | 2026-05-16T13:54:02.227Z

I have the predictor and three siblings. Let me read the remaining siblings: the train-pipeline (for `canonicalEdgeKey`/`collectUndirectedEdges`), the calibrator, and the feature projector.

### Assistant | 2026-05-16T13:54:03.081Z

[tool_use: Read]

### Assistant | 2026-05-16T13:54:03.499Z

[tool_use: Read]

### User | 2026-05-16T13:54:03.524Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-train-pipeline.mjs' was already read 9m ago in this session and is unchanged (mtime 1778939030437). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:54:03.918Z

[tool_use: Read]

### User | 2026-05-16T13:54:03.942Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\isotonic-calibrator.mjs' was already read 14m ago in this session and is unchanged (mtime 1778907838595). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:54:04.192Z

[tool_use: Read]

### User | 2026-05-16T13:54:04.366Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\systemviz-node-feature-projector.mjs' was already read 14m ago in this session and is unchanged (mtime 1778906968313). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-16T13:54:04.681Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-random-walk.mjs' was already read 14m ago in this session and is unchanged (mtime 1778904770518). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:54:08.052Z

The read-once guard says I read these siblings in-session but they're not in my visible context. I need their exact contracts to verify hard. Let me grep the specific signatures I need to confirm.

### Assistant | 2026-05-16T13:54:09.299Z

[tool_use: Grep]

### User | 2026-05-16T13:54:09.865Z

[tool_result] binary file matches (found "\0" byte around offset 5342)

### Assistant | 2026-05-16T13:54:10.179Z

[tool_use: Grep]

### User | 2026-05-16T13:54:10.778Z

[tool_result] 153:export function predictCalibrated(breakpoints, x) {
154-  const xv = Number(x);
155-  if (!Array.isArray(breakpoints) || breakpoints.length === 0) {
156-    return Number.isFinite(xv) ? clamp01(xv) : 0;
157-  }
158-  const first = breakpoints[0];
159-  const last = breakpoints[breakpoints.length - 1];
160-  if (!Number.isFinite(xv)) return first.y; // degenerate input → low-end clip
161-  if (
... [+837 chars truncated]

### Assistant | 2026-05-16T13:54:11.451Z

[tool_use: Grep]

### User | 2026-05-16T13:54:12.069Z

[tool_result] 48:export const FEATURE_DIM = 8;
166:  return {
183:  const f = new Float32Array(FEATURE_DIM);
209:export function projectGraphFeatures(graph, opts = {}) {
211:    return { features: new Map(), stats: DEFAULT_STATS, dim: FEATURE_DIM, nodeCount: 0 };
222:  return { features, stats, dim: FEATURE_DIM, nodeCount: features.size };
225:export { FEATURE_DIM as DIM, DEFAULT_PERCENTILE };

### Assistant | 2026-05-16T13:54:12.291Z

[tool_use: Grep]

### User | 2026-05-16T13:54:13.342Z

[tool_result] 53:export function buildAdjacency(graph, opts = {}) {
54-  const undirected = opts.undirected ?? DEFAULTS.undirected;
55-  const maxNodes = Number.isInteger(opts.maxNodes) && opts.maxNodes > 0
56-    ? opts.maxNodes
57-    : DEFAULTS.maxNodes;
58-
59-  if (!graph || typeof graph !== "object") {
60-    return { adj: new Map(), nbrSet: new Map(), nodeIds: [], truncated: false, edgeCount: 0 };
61-  }
... [+1332 chars truncated]

### Assistant | 2026-05-16T13:54:16.585Z

I have enough to verify hard. Let me confirm the `collectUndirectedEdges` contract and check the predictor's test file exists.

### Assistant | 2026-05-16T13:54:17.872Z

[tool_use: Grep]

### Assistant | 2026-05-16T13:54:18.265Z

[tool_use: Glob]

### User | 2026-05-16T13:54:18.513Z

[tool_result] binary file matches (found "\0" byte around offset 5342)

### User | 2026-05-16T13:54:24.970Z

[tool_result] scripts\lib\graphsage-predictor.test.mjs

### Assistant | 2026-05-16T13:54:27.617Z

The train-pipeline file has a NUL byte (the grep flagged it binary). Let me read those two functions directly via offset, and check the test file.

### Assistant | 2026-05-16T13:54:29.271Z

[tool_use: Bash]

### Assistant | 2026-05-16T13:54:29.594Z

[tool_use: Read]

### User | 2026-05-16T13:54:33.472Z

[tool_result] canonicalEdgeKey: function canonicalEdgeKey(a, b) {
  return a <= b ? JSON.stringify([a, b]) : JSON.stringify([b, a]);
}
---
collectUndirectedEdges: function collectUndirectedEdges(adjacency) {
  const edges = [];
  const edgeKeySet = new Set();
  if (!(adjacency instanceof Map)) return { edges, edgeKeySet };
  for (const [v, nbrs] of adjacency) {
    if (!Array.isArray(nbrs)) continue;
    for (c
... [+226 chars truncated]

### User | 2026-05-16T13:54:33.954Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1778939601480). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T13:54:36.572Z

I have every contract I need. Let me run the test suite and a quick functional probe to confirm runtime behavior.

### Assistant | 2026-05-16T13:54:37.275Z

[tool_use: Bash]

### User | 2026-05-16T13:54:41.818Z

[tool_result]     # Subtest: is frozen and carries the documented knobs
    ok 1 - is frozen and carries the documented knobs
      ---
      duration_ms: 0.0978
      ...
    1..1
ok 10 - PREDICT_DEFAULTS
  ---
  duration_ms: 0.1606
  type: 'suite'
  ...
1..10
# tests 37
# suites 10
# pass 37
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 438.5066

### Assistant | 2026-05-16T13:54:51.592Z

37/37 pass. Now let me trace the one correctness concern that tests rarely catch — the `embedGraph` feature-layout guard ordering vs `forward`'s own per-feature length check, and the `inputDim` vs `projected.dim` comparison.

The key trace: `embedGraph` checks `model.config.inputDim !== projected.dim`. `projected.dim` is always `FEATURE_DIM` (8) per the projector — confirmed at projector lines 211/222. So a checkpoint with `inputDim !== 8` throws `RangeError` *before* `forward`. Good. But `forward` itself also re-checks each feature vector's length against `model.config.inputDim` (model.mjs line 221) — so even if the guard were bypassed, `forward` fails loud, not garbage. The guard is correct and well-positioned.

One real issue: `linkScore` on a degenerate all-zero embedding. `forward` produces an all-zero embedding for a node whose layer-2 activation is all-zero (`normInv=0`). `linkScore` → `sigmoid(dot)` → `sigmoid(0)` = 0.5. A node with *no embedding entry* returns `null` from `scoreLink` (handled). But a node *with* a zero embedding scores 0.5 — that's honest (model says "no signal"), not a bug. Fine.

Let me do a fast functional probe of the two highest-risk paths — the `collectCandidateLinks` global-cap overrun and per-node reset.

### Assistant | 2026-05-16T13:54:59.657Z

[tool_use: Bash]

### User | 2026-05-16T13:55:03.216Z

[tool_result] chain candidates: [["0","2"],["1","3"],["2","4"]]
capped count (cap=10): 10 <=10? true
per-node n0 count (perNode=3): 3 <=3? true
dupes? false self-loops? false

### Assistant | 2026-05-16T13:55:25.648Z

All probes confirm correct behavior. Functional verification complete.

---

## Code Quality Analysis Report — `graphsage-predictor.mjs` (U-NNG-GRAPHSAGE-PREDICT / U5)

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 1 (+ 6 siblings traced for contracts)
- Issues Found: 4 (0 P0, 1 P1, 3 P2/P3)
- Tests: 37/37 pass; functional probes confirm bounds + correctness

### Verification of HARD-CHECK items
- **`collectCandidateLinks`** — CORRECT. Global cap checked at all 3 loop levels (`out.length >= globalCap` at lines 138/143/147); cannot overrun since `out.push` is the only growth and the check precedes every push. `perNodeCount` is declared *inside* the outer `for...of` (line 141), so it resets per source node — confirmed via probe (n0 → exactly 3 with cap=3). Yields only true non-edges (`edges.has(key)` skip), genuine 2-hop (iterates `adjacency.get(w)`), no self-loops (`x === u` skip), no duplicates (`seen` set + canonical key). Probe on a 5-node chain returned exactly the 3 true 2-hop non-edges.
- **`scoreLink` calibration honesty** — CORRECT. No calibrator → `breakpoints` null → `calibratedScore = rawScore` (line 114, no fabricated probability). `calibratorBreakpoints` (lines 62–67) correctly returns `null` for null / non-array / empty `breakpoints` — covers unfitted calibrator.
- **`embedGraph` feature-layout guard** — CORRECT and well-positioned. `model.config.inputDim !== projected.dim` (line 87) throws `RangeError` *before* `forward` (line 98). `projected.dim` is always `FEATURE_DIM` (8). Defence-in-depth: `forward` re-checks each feature length (model.mjs line 221).
- **Memory** — CORRECT. `features` Map is built only from `nodeIds` (the `maxNodes`-capped set from `buildAdjacency`), so `forward` processes the capped node set, not the full graph.
- **Determinism** — CORRECT. `rankPredictions` tie-break is 3-level: `calibratedScore`, `rawScore`, then `canonicalEdgeKey` string compare — fully deterministic.
- **CLI `main`** — CORRECT. Exit 2 (bad args /
... [+1818 chars truncated]
