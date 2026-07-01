---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Deep dive on improving PRISM's \"Deep Learning (training discipline + architectur"
date: "2026-05-29"
first_ts: "2026-05-29T19:17:18.321Z"
last_ts: "2026-05-29T19:22:27.135Z"
cwd: "H:\\prism-slot-india"
messages: 43
user_msgs: 18
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a9fd5e9aada371a11.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Deep dive on improving PRISM's "Deep Learning (training discipline + architectur

> **claude-code-cli** | 2026-05-29 | 43 msgs (18 user / 25 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-a9fd5e9aada371a11.jsonl`

## Transcript

### User | 2026-05-29T19:17:18.321Z

Deep dive on improving PRISM's "Deep Learning (training discipline + architectures)". Focus: training-set construction, neg-sampling, feature engineering (768d embeds), overfit/regularization, eval methodology

PRISM grounding (READ real files in worktree H:/prism-slot-india; it is divergent from main H:/prism — NN-GRAPH state + many engines live ONLY on main):
- Galaxy brain: mcp-server/src/engines/ai-training/{KNOWLEDGE.md,RULES.md,MEMORY.md,PATHS.md}
- VERIFIED FACTS from the first deep-dive (do not re-litigate): closed-loop IS ignited at boot (index.ts:434 XProcNeuralAutoFireEngine.activate) but CrossProcessOutcomeStore is ephemeral (configureStorePath has 0 prod callers); CAG cold-anchor is a no-op (PromptCachingEngine output reaches no live call site; LLMEngine.ts:327 _callClaude sends plain string); NN-GRAPH AUROC 0.096 is the link-prediction PRETEXT diagnostic NOT the deploy gate (gate correctly DEFERRED on poolSize=0, data-side); stratified neg-sampling ALREADY coded (graphsage-trainer.mjs:167, main).
- Constraints: duplicationGuard THROWS on new dup engines; NEVER inline physics constants; NEVER bypass the NN deploy gate. Ollama /api/chat is DEAD this session (no live embed).

TASK: Read the relevant PRISM files (Read/Grep/Glob) to establish what EXISTS — cite real paths, do not guess. Then list concrete improvements with leverage(1-10), effort, venue, the PRISM target file/engine, the named technique, and duplicationRisk (search first — duplicationGuard THROWS). Prioritize genuinely high-impact wiring/coupling fixes over cosmetic ones; be honest about what's already built.
CRITICAL: You MUST finish by calling the StructuredOutput tool with your findings. Do your file reads FIRST, keep them focused, then call StructuredOutput. Do not end your turn with prose — the StructuredOutput call IS the deliverable.

### Assistant | 2026-05-29T19:17:32.231Z

I'll establish what exists in the ai-training galaxy by reading the grounding files, then dig into the actual training code for the deep-learning aspects (training-set construction, neg-sampling, feature engineering, regularization, eval methodology).

### Assistant | 2026-05-29T19:17:33.051Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:33.520Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:33.983Z

[tool_use: Read]

### Assistant | 2026-05-29T19:17:34.480Z

[tool_use: Read]

### User | 2026-05-29T19:18:04.935Z

[tool_result] 1	# AI-Training Domain Knowledge Index (slot:india)
2	
3	> Compiled one-stop index of ALL relevant wiki + tribal + action knowledge for the ai-training domain (NN/GNN/LoRA/RAG/deep-learning/retrain). Enumerated from `H:/prism/knowledge/wiki/` 2026-05-29 (U-PSGB-INDIA-AUDIT). **Auto-invoked** for india sessions via `india-awareness-inject.mjs` (surfaces the pointer + live state) + `tribal-by-domain
... [+3965 chars truncated]

### User | 2026-05-29T19:18:06.555Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### User | 2026-05-29T19:18:07.251Z

[tool_result] 1	# AI-Training Domain Rules + GSD Protocol (slot:india)
2	
3	> Domain-specific complement to global CLAUDE.md R1–R12 and the galaxy `CLAUDE.md`. These rules + the Get-Stuff-Done lifecycle govern ALL ai-training work (NN / GNN / LoRA / RAG / deep-learning / deep-reasoning / retrain / self-improvement loop). Distilled from india's session history + domain docs (U-PSGB-INDIA-AUDIT, 2026-05-28/29). L
... [+4391 chars truncated]

### User | 2026-05-29T19:18:07.252Z

[tool_result] 1	# AI Training Galaxy MEMORY.md — per-domain working brain (slot:india)
2	
3	Append-only cross-session memory for the india slot (full-system training: AI/NN/GNN/LoRA/RAG/DL/ML).
4	
5	## Master-brain link
6	> Cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical pattern — fine-tuned for ai-training, brain wiring NOT re-derived).
7	- **UP (pull from master):** `C:/Users/
... [+8356 chars truncated]

### Assistant | 2026-05-29T19:18:12.083Z

The grounding files are clear. Now let me read the actual NN training code on the main tree (`H:/prism`) since the worktree is stale, focusing on the deep-learning specifics: neg-sampling, feature engineering, regularization, eval methodology.

### Assistant | 2026-05-29T19:18:12.548Z

[tool_use: Read]

### Assistant | 2026-05-29T19:18:13.012Z

[tool_use: Read]

### Assistant | 2026-05-29T19:18:13.823Z

[tool_use: Read]

### User | 2026-05-29T19:18:46.396Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-trainer.mjs — link-prediction training for the GraphSAGE model.
4	 * The training half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * forward half is graphsage-model.mjs.
6	 *
7	 * Objective — supervised link prediction. A positive sample is a real edge,
8	 * a negative sample a sampled non-edge. The score for a pair (u,v) is
9	 * sigmoid(z_
... [+22338 chars truncated]

### User | 2026-05-29T19:18:47.896Z

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

### User | 2026-05-29T19:18:48.719Z

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
... [+25450 chars truncated]

### Assistant | 2026-05-29T19:18:53.185Z

Now let me look at the train-pipeline (where stratified sampling, feature engineering, and the leakage-safe split actually wire together), the checkpoint/calibration code, and the node-embeddings feature builder.

### Assistant | 2026-05-29T19:18:53.685Z

[tool_use: Read]

### Assistant | 2026-05-29T19:18:53.875Z

[tool_use: Read]

### User | 2026-05-29T19:19:07.119Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+12786 chars truncated]

### User | 2026-05-29T19:19:07.412Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-train-pipeline.mjs — end-to-end GraphSAGE link-prediction training
4	 * pipeline. Component (d), the training-script CLI orchestrator, of unit
5	 * U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
6	 *
7	 * Composes the U1-U4 libs into one runnable pipeline:
8	 *   loadGraph (system-viz-graph)          load the system-viz graph from disk
9	 *   normalizeGraph 
... [+42787 chars truncated]

### Assistant | 2026-05-29T19:19:14.911Z

Now let me look at the feature projector (the 8d hand-features), the checkpoint code (to check L2 reg / weight decay), and the retrain lifecycle. Then I'll check the regularization story and look at whether there's dropout/early-stopping anywhere.

### Assistant | 2026-05-29T19:19:15.402Z

[tool_use: Read]

### Assistant | 2026-05-29T19:19:16.326Z

[tool_use: Read]

### Assistant | 2026-05-29T19:19:16.685Z

[tool_use: Read]

### User | 2026-05-29T19:19:47.375Z

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

### User | 2026-05-29T19:19:48.688Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-checkpoint.mjs — JSON serialization of a trained GraphSAGE model.
4	 * Component (c) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * The U4 training script saves a trained model here; U5's link predictor
7	 * loads it and runs inference with frozen weights. A checkpoint is a plain
8	 * JSON-safe object — `saveCheckpoint` returns it (the call
... [+11601 chars truncated]

### User | 2026-05-29T19:19:49.476Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
4	 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * Why this exists: a trained classifier's raw output score is rarely a
7	 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
8	 * cases that are positive only 60% of the time. The NN-GRAPH-MS0
... [+8914 chars truncated]

### Assistant | 2026-05-29T19:19:56.903Z

Now I have a thorough picture of the training discipline. Let me check the retrain lifecycle orchestrator and the seed-ghost classifier (the deploy-side inference) to understand the eval-methodology coupling and whether there's any held-out-AUROC-as-gate path, plus check for existing weight-decay/dropout/early-stopping to avoid duplication claims.

### Assistant | 2026-05-29T19:19:57.506Z

[tool_use: Read]

### Assistant | 2026-05-29T19:19:58.853Z

[tool_use: Grep]

### User | 2026-05-29T19:20:15.877Z

[tool_result] Found 215 files
H:\prism\scripts\regenerate-launch-fleet.mjs
H:\prism\scripts\generate-per-slot-skill-wrappers.mjs
H:\prism\scripts\merge-augmentations.mjs
H:\prism\scripts\lib\hsm-entry-geometry-emit.mjs
H:\prism\scripts\lib\orchestrator-machine-run-dispatcher.test.mjs
H:\prism\scripts\lib\orchestrator-method-router.test.mjs
H:\prism\scripts\lib\orchestrator-outcome-bus-controller.test.mjs
H:\pri
... [+10137 chars truncated]

### User | 2026-05-29T19:20:15.910Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+36711 chars truncated]

### Assistant | 2026-05-29T19:20:23.741Z

The grep for regularization terms returned 215 files but they're almost all unrelated (the pattern matched "validation" broadly). The key finding: the GraphSAGE trainer has NO weight decay, NO dropout, NO early stopping, NO validation-loss monitoring. The training loop in `train()` runs a fixed `epochs` with only linear LR decay. Let me do one targeted grep to confirm no L2/weight-decay specifically in the graphsage libs, and check the eval-honesty: the deploy gate scores the GNN's *classification confidence* (internal-consistency), while AUROC-on-held-out-link-prediction (the real generalization metric) is only stamped as checkpoint metadata, never gated.

### Assistant | 2026-05-29T19:20:25.922Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:20:26.582Z

[tool_use: Grep]

### User | 2026-05-29T19:20:41.769Z

[tool_result] 15: *   dL/dact     = normInv . (dz - z.(dz.z))               [L2-norm jacobian]
60: * L2-normalized embeddings — its score is always in ~(0.27,0.73) and never
306: * L2-normalization backward: given upstream gradient `dz` and the layer's
309:function l2NormBackward(dz, z, normInv, dim) {
352:    // Embeddings are L2-normalized so dot in [-1,1] and s in (0.27,0.73) —
369:  const L2 = cache.layers[
... [+368 chars truncated]

### User | 2026-05-29T19:20:42.020Z

[tool_result] 31: * `buildEmbeddingSource()` is fail-loud (R12) — every error returns a result
123: * Mismatched dims throw RangeError — a node cannot be represented by vectors
232: * `writeJsonlRow` consumes; this keeps `buildEmbeddingSource` a flat loop.
404: *     matched: N,               // nodes with ≥1 hit (rows emitted)
405: *     unmatched: N,             // nodes with 0 hits OR 0 wikiEntries
412:expor
... [+550 chars truncated]

### Assistant | 2026-05-29T19:20:58.724Z

Confirmed: the only "L2" in the trainer is L2-*normalization* of embeddings (a forward-pass op), not L2 weight regularization. There is no weight decay, no dropout, no early stopping, no validation-loss-based stopping. I now have a complete, grounded picture of the deep-learning training discipline. Let me synthesize the findings.

Key established facts (all cited from real files on `H:/prism`):

1. **Training set construction** (`graphsage-train-pipeline.mjs`): leakage-safe edge split is correct (test edges excluded from message-passing + neg-sampling). But `maxNodes: 6000` cap means training on ~6K of ~288K-372K nodes; node selection is by `prioritizeEmbeddedNodes` (embedding coverage) then raw order — not a representative/stratified node sample.

2. **Neg-sampling** (`graphsage-trainer.mjs:204` `sampleStratifiedNegativeEdges`): stratified-by-type IS built and wired, with `pHard=0.7` intra-type hard negatives. Solid. But `negRatio:1` (one neg per pos) is low for link prediction; and hard-negative fraction is a fixed constant, not annealed.

3. **Feature engineering** (`systemviz-node-feature-projector.mjs` 8d + `loadEmbeddingFeatures` 768d): 768d nomic vectors wired via `--embedding-source`. The two feature regimes are mutually exclusive (either 8d projected OR 768d embed) — they are NOT concatenated, so structural/symbolic signal (layer/tier/svi/coverage/status/roi) is *discarded* when 768d is active. Also int8 dequant uses `/127` in the pipeline loader but the writer uses a per-vector `scale` (`s`) — the loader ignores `s`, a quantization-scale mismatch.

4. **Overfit/regularization**: NONE. No weight decay, no dropout, no early stopping, fixed 30 epochs with only linear LR decay. Isotonic calibration is present (good) with a `MIN_RELIABLE_SAMPLES=50` guard.

5. **Eval methodology** (`nn-graph-eval.mjs`): the DEPLOY GATE scores the GNN classifier's *internal-consistency* (agreement-with-keyword-tiers holdout) — explicitly NOT ground truth. The actual link-predic
... [+375 chars truncated]

### Assistant | 2026-05-29T19:21:56.807Z

[tool_use: StructuredOutput]

### User | 2026-05-29T19:22:16.254Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T19:22:27.135Z

I've completed the deep dive and returned my findings via StructuredOutput.

Summary of what I grounded against real files on `H:/prism` (the worktree `H:/prism-slot-india` is ~874 commits behind and lacks the NN-GRAPH scripts, so I read the canonical main tree per AI-T8):

- `scripts/lib/graphsage-model.mjs` — 2-layer SAGE, MEAN aggregator, ReLU→linear, L2-normalized embeds
- `scripts/lib/graphsage-trainer.mjs` — BCE link-pred, hand-backprop, **stratified neg-sampling already built** (`sampleStratifiedNegativeEdges:204`)
- `scripts/lib/graphsage-train-pipeline.mjs` — leakage-safe split, 8d-OR-768d features, isotonic calibration
- `scripts/lib/nn-graph-eval.mjs` — the deploy gate scores **internal-consistency**, not ground truth
- `scripts/lib/isotonic-calibrator.mjs`, `scripts/lib/graphsage-checkpoint.mjs`, `scripts/build-node-embeddings.mjs`, `scripts/nn-graph-retrain-lifecycle.mjs`

The honest headline: the grounding facts hold up — stratified neg-sampling and 768d features are genuinely built and wired. The highest-leverage gaps are not the ones the galaxy docs emphasize. The two P0s are (1) **zero regularization** in the trainer (no weight decay/dropout/early-stop/val-loss), and (2) the **deploy gate measures the wrong thing** — the leakage-safe held-out link-prediction AUROC is computed every train and then discarded from the promotion decision, while the gate runs on a self-admitted non-ground-truth internal-consistency holdout. Wiring that already-computed AUROC into `promoteDecision` is the single highest-leverage fix and carries low duplication risk because the metric already exists.
