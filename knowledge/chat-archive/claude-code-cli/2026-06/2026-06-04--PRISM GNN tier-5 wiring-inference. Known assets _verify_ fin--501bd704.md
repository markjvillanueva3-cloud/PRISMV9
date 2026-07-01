---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "PRISM GNN tier-5 wiring-inference. Known assets (verify, find more): scripts/lib"
date: "2026-06-04"
first_ts: "2026-06-04T13:08:23.138Z"
last_ts: "2026-06-04T13:14:37.497Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 22
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/workflows/wf_f90f1dea-6a1/agent-aecda284e703d0f1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# PRISM GNN tier-5 wiring-inference. Known assets (verify, find more): scripts/lib

> **claude-code-cli** | 2026-06-04 | 63 msgs (22 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/workflows/wf_f90f1dea-6a1/agent-aecda284e703d0f1e.jsonl`

## Transcript

### User | 2026-06-04T13:08:23.138Z

PRISM GNN tier-5 wiring-inference. Known assets (verify, find more): scripts/lib/graphsage-trainer.mjs, scripts/lib/nn-graph-retrain-lifecycle.mjs, scripts/lib/nn-graph-eval*.mjs (buildHoldout/runAssessment), scripts/lib/graph-node-embedding-bridge.mjs, scripts/lib/graphsage-predictor.mjs (classifyGnn), state/shared/nn-graph/NN-EVAL.json, state/shared/nn-graph/node-embeddings-768d.jsonl, state/shared/nn-graph/reference-pool-seed-2026-05-23.json. The graph is the engine->dispatcher wiring graph (~302K nodes, ~20 dispatcher classes). Symptom: AUROC 0.500, all predictions collapse to one class (prism_turning); poolSize was 0, a recent reeval got a 62-ghost holdout. torch/GPU is NOT installed (training is JS/CPU today).

MAP the EVAL + REFERENCE POOL (nn-graph-eval buildHoldout/runAssessment + NN-EVAL.json + reference-pool-seed). How is AUROC/macroF1/Brier computed? How big is the labeled reference pool / holdout, and how many classes have zero/near-zero examples? Is the 0.78 gate arithmetically reachable at the current pool size? How are reference ghosts seeded today and can the pool be grown on CPU?

### Assistant | 2026-06-04T13:08:38.677Z

I'll map the eval and reference pool subsystem for the GNN tier-5 wiring inference. Let me start by verifying the known assets and finding the core files.

### Assistant | 2026-06-04T13:08:40.137Z

[tool_use: Bash]

### User | 2026-06-04T13:08:48.887Z

[tool_result] ls: cannot access 'scripts/lib/nn-graph-retrain-lifecycle.mjs': No such file or directory
-rwxr-xr-x 1 wompu 197611 25249 May 24 19:41 scripts/lib/graph-node-embedding-bridge.mjs*
-rwxr-xr-x 1 wompu 197611 17101 May 24 17:36 scripts/lib/graphsage-predictor.mjs*
-rwxr-xr-x 1 wompu 197611 21338 May 23 15:47 scripts/lib/graphsage-trainer.mjs*
-rwxr-xr-x 1 wompu 197611 29261 Jun  3 08:12 scripts/lib/n
... [+1015 chars truncated]

### Assistant | 2026-06-04T13:08:53.528Z

Let me read the core eval file and the NN-EVAL.json output, plus find the lifecycle file under a different name.

### Assistant | 2026-06-04T13:08:53.904Z

[tool_use: Read]

### User | 2026-06-04T13:08:57.173Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+31174 chars truncated]

### Assistant | 2026-06-04T13:09:02.686Z

Now let me read the NN-EVAL.json output, the reference pool seed, and the seed-ghost-gnn-classify file (the actual classifier).

### Assistant | 2026-06-04T13:09:03.280Z

[tool_use: Read]

### User | 2026-06-04T13:09:04.192Z

[tool_result] 1	{
2	  "deferred": false,
3	  "assessedAt": "2026-06-03T12:58:46.341Z",
4	  "holdoutN": 62,
5	  "gates": {
6	    "auroc": 0.78,
7	    "macroF1": 0.55,
8	    "brier": 0.15
9	  },
10	  "metrics": {
11	    "auroc": 0.5,
12	    "macroF1": 0.1333,
13	    "brier": 0.26,
14	    "accuracy": 0.5
15	  },
16	  "degeneracy": {
17	    "isDegenerate": true,
18	    "mode": "constant-vote",
19	    "distinctConfi
... [+13778 chars truncated]

### Assistant | 2026-06-04T13:09:09.407Z

This is the smoking gun. The holdout of 62 ghosts is dominated by lathe/CAM engines, and the classifier collapsed to `prism_turning` for ALL 62 with constant confidence 0.4. Let me examine the classifier and the reference pool seed to understand the collapse mechanism.

### Assistant | 2026-06-04T13:09:10.041Z

[tool_use: Read]

### User | 2026-06-04T13:09:14.104Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-23T20:30:00Z",
4	  "generatedBy": "alpha slot, claude-95e7030e, TOKEN-SAVINGS-PIVOT/U-PSN-NN-SEED (gap-fill 5/5)",
5	  "purpose": "Reference-pool seed for NN-GRAPH tier-5 (GraphSAGE wiring-inference). Currently dormant — AUROC 0.096 vs gate 0.78 because reference pool is 0-sized. This file provides 25+ seed examples drawn from the iter9
... [+6612 chars truncated]

### Assistant | 2026-06-04T13:09:17.528Z

Now let me read the actual classifier (seed-ghost-gnn-classify) to understand how predictions are made, and the predictor.

### Assistant | 2026-06-04T13:09:17.857Z

[tool_use: Read]

### User | 2026-06-04T13:09:21.061Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 1s ago in this session and is unchanged (mtime 1779662171737). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T13:09:37.211Z

The read-once guard is mistaken — I haven't read this file yet in this context. Let me find the classifier and predictor.

### Assistant | 2026-06-04T13:09:39.978Z

[tool_use: Bash]

### User | 2026-06-04T13:09:52.356Z

[tool_result] ls: cannot access 'scripts/lib/seed-ghost-gnn-classify.mjs': No such file or directory
---FIND CLASSIFY---
catalog-table-classifier.mjs
catalog-table-classifier.test.mjs
domain-classifier.mjs*
domain-classifier.test.mjs*
feature-gap-classifier.mjs
feature-gap-classifier.test.mjs
graphsage-predictor.mjs*
graphsage-predictor.test.mjs*
hook-broker-classifier.mjs
hook-broker-classifier.test.mjs
jm-die
... [+462 chars truncated]

### Assistant | 2026-06-04T13:09:57.629Z

seed-ghost-gnn-classify.mjs is imported by nn-graph-eval.mjs but isn't in scripts/lib. Let me locate it and read the predictor + retrain lifecycle.

### Assistant | 2026-06-04T13:09:58.553Z

[tool_use: Bash]

### User | 2026-06-04T13:10:07.368Z

[tool_result] scripts/seed-ghost-gnn-classify.mjs
---ALL seed-ghost---
scripts/seed-ghost-from-unwired.mjs
scripts/seed-ghost-from-unwired.test.mjs
scripts/seed-ghost-gnn-classify.mjs
scripts/seed-ghost-gnn-classify.test.mjs
scripts/seed-ghost-llm-classify.mjs
scripts/seed-ghost-llm-classify.test.mjs
scripts/seed-ghost-nodes.mjs

### Assistant | 2026-06-04T13:10:11.327Z

[tool_use: Read]

### User | 2026-06-04T13:10:13.958Z

[tool_result] read-once-guard: 'H:\prism\scripts\seed-ghost-gnn-classify.mjs' was already read 28s ago in this session and is unchanged (mtime 1780202061474). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T13:10:18.415Z

The read-once guard is firing incorrectly (these are fresh reads). Let me disable the cache to read these critical files.

### Assistant | 2026-06-04T13:10:19.719Z

[tool_use: Bash]

### User | 2026-06-04T13:10:24.484Z

[tool_result]   547 scripts/seed-ghost-gnn-classify.mjs
  423 scripts/lib/graphsage-predictor.mjs
  520 scripts/lib/graphsage-trainer.mjs
  811 scripts/nn-graph-retrain-lifecycle.mjs
 2301 total

### Assistant | 2026-06-04T13:10:29.000Z

[tool_use: Bash]

### User | 2026-06-04T13:10:35.987Z

[tool_result] #!/usr/bin/env node
/**
 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
 *
 * The 5th tier of the wiring-inference cascade. The first four tiers —
 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
 * adds a GraphSAGE-derived classifier and runs it *before* t
... [+23608 chars truncated]

### Assistant | 2026-06-04T13:10:41.924Z

Now I understand the classifier mechanism. The key insight: `voteDispatcher` does a confidence-weighted vote over reference dispatchers, BUT the AUROC collapse comes from the embedding/scoreLink output. Let me read the predictor (scoreLink, embedGraph) and the trainer to understand the feature layout and why all links score identically.

### Assistant | 2026-06-04T13:10:42.890Z

[tool_use: Bash]

### User | 2026-06-04T13:10:50.243Z

[tool_result] #!/usr/bin/env node
/**
 * graphsage-predictor.mjs — GraphSAGE link-prediction inference. Unit
 * U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0.
 *
 * Loads a checkpoint trained by U4 (graphsage-train-pipeline), embeds a graph
 * with the frozen weights, and scores candidate MISSING edges — the "wiring
 * links the graph does not have yet but probably should". Each prediction
 * carries a raw score
... [+16654 chars truncated]

### Assistant | 2026-06-04T13:10:55.827Z

Now I have the full picture of the inference path. The crucial detail: in `assessHoldout`, `truth` and `predicted` use DISPATCHER NAMES (multi-class), but AUROC is computed over `scores` (confidence) vs `labels` (correct=1/0 binary). The constant-vote collapse means every prediction is `prism_turning` at confidence 0.4. Let me now examine the candidate metadata in the checkpoint and confirm the reference pool composition / class distribution from the live graph. Let me check the checkpoint metadata and the retrain lifecycle.

### Assistant | 2026-06-04T13:10:58.661Z

[tool_use: Bash]

### User | 2026-06-04T13:11:03.837Z

[tool_result] === ACTIVE checkpoint metadata ===
{
  "trainedAt": "2026-05-16T21:34:13.774Z",
  "nodeCount": 20460,
  "cappedNodes": 5998,
  "truncated": true,
  "edgeCount": 6562,
  "trainEdgeCount": 5250,
  "testEdgeCount": 1312,
  "evalNegativeCount": 1312,
  "epochs": 30,
  "trained": true,
  "finalLoss": 0.7372709108514249,
  "inputDim": 8,
  "hiddenDim": 64,
  "embedDim": 32,
  "auroc": 0.0960757989106186
... [+182 chars truncated]

### Assistant | 2026-06-04T13:11:09.496Z

Critical finding: the ACTIVE checkpoint is the May-16 8-dim model (inputDim 8, AUROC 0.096 on its OWN link-prediction pretext task, capped at 5998 nodes). The candidate 768d checkpoint exists separately. Let me confirm which checkpoint the eval used and inspect the candidate, then look at the live graph's ghost pool class distribution.

### Assistant | 2026-06-04T13:11:12.454Z

[tool_use: Bash]

### User | 2026-06-04T13:11:19.491Z

[tool_result] === graphsage-checkpoint.candidate.json ===
inputDim: 768 auroc: 0.38854150713931807 embeddingSource: H:\PRISM\state\shared\nn-graph\node-embeddings-768d.jsonl trainedAt: 2026-06-01T23:16:42.065Z nodeCount: 301151 cappedNodes: 5980
=== graphsage-checkpoint-768d-rag-upgrade.json ===
inputDim: 8 auroc: 0.29713799606509894 embeddingSource: undefined trainedAt: 2026-05-22T23:12:04.676Z nodeCount: 2586
... [+20 chars truncated]

### Assistant | 2026-06-04T13:11:24.420Z

Now let me examine the live graph's ghost pool to understand the class distribution feeding the eval — this is the root of the constant-vote collapse. Let me check the system graph size and ghost composition.

### Assistant | 2026-06-04T13:11:26.053Z

[tool_use: Bash]

### User | 2026-06-04T13:11:33.709Z

[tool_result] -rw-r--r-- 1 wompu 197611 675859110 Jun  4 08:01 state/shared/system-viz/system-graph.json
---size in MB---
644.5 MB

### Assistant | 2026-06-04T13:11:37.672Z

644MB graph. I'll use the streaming reader via the eval's own buildHoldout to extract the reference pool composition without loading 644MB into a string. Let me write a small streaming probe using the existing graph-io reader.

### Assistant | 2026-06-04T13:11:39.141Z

[tool_use: Bash]

### User | 2026-06-04T13:11:46.304Z

[tool_result] (node:44228) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\graph-io.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
---check module type---
undefined

### Assistant | 2026-06-04T13:11:49.529Z

Let me write a proper ESM probe script that uses buildHoldout + the streaming reader to get the actual reference pool class distribution, then runs the full assessment to capture the live numbers.

### Assistant | 2026-06-04T13:12:10.293Z

[tool_use: Write]

### User | 2026-06-04T13:12:14.864Z

[tool_result] File created successfully at: H:\prism\state\shared\nn-graph\_probe_refpool.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:12:18.999Z

`isValidDispatcher` is exported from seed-ghost-gnn-classify.mjs (confirmed in the source I read). Let me run the probe.

### Assistant | 2026-06-04T13:12:21.400Z

[tool_use: Bash]

### User | 2026-06-04T13:12:35.674Z

[tool_result] total nodes: 302481
ghost.unwired-engine nodes: 636

=== ALL ghosts by proposed_wiring ===
UNKNOWN: 100
  prism_cam: 160
  UNKNOWN: 100
  prism_dev: 70
  prism_turning: 61
  prism_calc: 43
  prism_session: 37
  prism_intelligence: 28
  prism_ai: 28
  prism_orchestrate: 18
  prism_safety: 12
  prism_memory: 11
  prism_intake: 10
  prism_skill_script: 10
  prism_5axis: 8
  prism_cad: 7
  prism_data:
... [+1931 chars truncated]

### Assistant | 2026-06-04T13:12:40.762Z

Excellent — this is the complete picture. The probe reveals exactly why the gate fails. Now let me clean up the throwaway probe and check the retrain lifecycle for how the pool is grown / seeded today.

### Assistant | 2026-06-04T13:12:45.389Z

[tool_use: Bash]

### User | 2026-06-04T13:12:53.113Z

[tool_result] removed
---retrain-baseline---
{
  "schemaVersion": 1,
  "fingerprint": {
    "nodeCount": 302447,
    "edgeCount": 1041958,
    "ghostCount": 636
  },
  "recordedAt": "2026-06-01T23:14:49.676Z"
}---lifecycle tail (last promote/eval entries)---
entries: 89
{"ts":"2026-06-04T06:05:53.754Z","event":"skip"}
{"ts":"2026-06-04T12:08:58.394Z","event":"skip"}
{"ts":"2026-06-04T12:13:33.347Z","event":"ski
... [+3 chars truncated]

### Assistant | 2026-06-04T13:12:59.045Z

Now let me look at how the reference ghosts are seeded today — the seed-ghost-from-unwired path and whether the reference-pool-seed JSON is actually consumed. Let me also check the trainer's negative-edge sampling and how features are built (to assess CPU growability).

### Assistant | 2026-06-04T13:13:01.224Z

[tool_use: Bash]

### User | 2026-06-04T13:13:11.559Z

[tool_result] === who reads reference-pool-seed ===
mcp-server/src/engines/ai-training/PATHS.md
=== how ghosts get into the graph (seed-ghost-from-unwired) — head ===
#!/usr/bin/env node
/**
 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
 *
 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
 * engines on disk with no dispatcher reference). Each gets:
 *   
... [+3981 chars truncated]

### Assistant | 2026-06-04T13:13:15.957Z

This confirms the keyword inference table is the source of the "labels". Now I have everything needed. Let me do the final arithmetic verification on the gate reachability and confirm the trainer's negative sampling approach (CPU feasibility). Let me check the trainer's key sections quickly.

### Assistant | 2026-06-04T13:13:17.821Z

[tool_use: Bash]

### User | 2026-06-04T13:13:25.543Z

[tool_result] 8: * a negative sample a sampled non-edge. The score for a pair (u,v) is
9: * sigmoid(z_u . z_v) and the loss is binary cross-entropy. Training pulls
38:  epochs: 50,
40:  negRatio: 1,          // negative samples drawn per positive
58: * external caller yields a large-but-finite loss instead of Infinity. (The
59: * trainer's own loss is computed inline in computeLossAndGradients on
63:export func
... [+2161 chars truncated]

### Assistant | 2026-06-04T13:13:33.177Z

I now have a complete, verified picture. The trainer is pure JS/CPU (full-batch forward, analytic gradients, BCE loss — no torch). Let me synthesize the findings.

Key arithmetic on the AUROC gate reachability: the holdout uses `scores` = per-target confidence and `labels` = correct/incorrect (binary). The classifier collapsed to a constant vote (`prism_turning`, conf 0.4 for all 62) so AUROC degenerated to exactly 0.5 (every score tied → rank-sum gives 0.5). The AUROC gate is on whether *confidence ranks correct predictions above incorrect ones* — it IS arithmetically reachable at pool size 125/holdout 62 IF the model produced varied confidences AND distinguished classes, but the constant-vote collapse makes both AUROC and macro-F1 structurally impossible.

Let me write the structured output.

### Assistant | 2026-06-04T13:14:27.252Z

[tool_use: StructuredOutput]

### User | 2026-06-04T13:14:28.871Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-04T13:14:37.497Z

I've completed the mapping of the EVAL + REFERENCE POOL subsystem and returned the findings via StructuredOutput.

Summary of what I found: The eval harness (`nn-graph-eval.mjs`) is sound and honest — it correctly measures and flags the degeneracy rather than hiding it. The constant-vote collapse (all 62 holdout ghosts → `prism_turning` @ 0.4 confidence) originates upstream in `voteDispatcher` (seed-ghost-gnn-classify.mjs): the active 8-dim checkpoint produces near-uniform link scores (its own pretext AUROC is 0.096), so the k-NN vote collapses to the turning-heavy reference-pool class prior. The reference pool is now 125 ghosts (no longer 0) but spans only 6 dispatcher classes, and the AUROC=0.5 is a tie-break artifact of identical confidences. The 0.78 AUROC gate IS arithmetically reachable at the current pool/holdout size — degeneracy, not sample count, is the blocker — but macroF1>=0.55 is structurally impossible while one class dominates predictions. All fixes (pool rebalance via lower refMinConf, per-class vote normalization, stratified holdout, promoting the 768-dim candidate) are CPU-feasible today; the trainer is pure JS with no torch dependency.
