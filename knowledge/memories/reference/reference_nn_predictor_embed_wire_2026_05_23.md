---
name: nn-predictor-embed-wire-2026-05-23
description: Next-layer integration bug surfaced by B8 retrain — graphsage-predictor loads projected 8-d features while the trained checkpoint expects the 768-d wiki embeddings. Dim mismatch defers every evaluation.
aliases: reference_nn_predictor_embed_wire_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
---


# NN-GRAPH predictor embed-wire — follow-up to U-GNN-NODE-EMBED-BRIDGE + U-NN-TRAINER-EXPORT-RESTORE (2026-05-23, slot golf)

## What happened (B8 result)

Forced retrain after restoring the missing trainer exports (commit `29529f05b2`) and wiring the bridge JSONL (commit `e853edcf93`). Trainer ran cleanly — `trained:true, trainExitCode:0`. Eval deferred:

```
embed-failed: graphsage-predictor: checkpoint inputDim 768 does not match
the feature projector dim 8 (8) — checkpoint/feature-layout mismatch
```

## Root cause

The retrain lifecycle flow is split:
1. **Train side** (`graphsage-train-pipeline.mjs`) accepts `--embedding-source` → 768-d features for training
2. **Eval side** (`nn-graph-eval.mjs` → `graphsage-predictor.mjs`) loads the checkpoint + runs `embedGraph(model, graph)` which calls `projectGraphFeatures()` for the eval forward pass — produces 8-d projected features
3. **Predictor guard** (`graphsage-predictor.mjs:87`) throws when `model.config.inputDim !== projected.dim`

So the trainer trains on 768-d but the predictor evaluates on 8-d. The mismatch is a R12 fail-loud (correct behavior — a checkpoint trained on one feature layout cannot be applied to a different one).

## Fix surface (candidate follow-up unit: `U-NN-PREDICTOR-EMBED-WIRE`)

The predictor needs to ALSO load the embedding source when the checkpoint's `inputDim != FEATURE_DIM`. Two options:

1. **Embed in checkpoint metadata** — store the `embeddingSource` path in the saved checkpoint, predictor auto-loads it on `loadPredictor()`. Cleanest.
2. **DI hook on embedGraph** — accept an `opts.embeddingSource` argument; eval pipeline reads from the same source the trainer used (lifecycle already knows the path).

Option 1 preferred — checkpoints become self-describing, no DI plumbing needed.

Implementation site:
- `graphsage-checkpoint.mjs:saveCheckpoint()` — write `embeddingSource` into `metadata`
- `graphsage-predictor.mjs:loadPredictor()` — read `metadata.embeddingSource`, store in predictor handle
- `graphsage-predictor.mjs:embedGraph()` — when handle has embeddingSource, call `loadEmbeddingFeatures(source, nodeIds)` instead of `projectGraphFeatures()`
- Tests: round-trip with 768-d checkpoint produces non-throw eval

## Where this unblocks

After this fix:
- B8 retrain assessment will produce a graded AUROC (not deferred) — promotion gate decision becomes meaningful
- The full chain Bridge → Trainer → Predictor → Eval → Promotion finally produces a real number against the 0.78 deploy gate
- NN-GRAPH tier-5 moves from "research-only" status to "operational with real AUROC"

## Status

**CLOSED 2026-05-23 (slot golf, post-/compact) — U-NN-PREDICTOR-EMBED-WIRE shipped.** Option 1 ("Embed in checkpoint metadata") implemented across 3 surgical edits:

- `graphsage-train-pipeline.mjs`: `metrics.embeddingSource = cfg.embeddingSource || null` → bundled into `checkpoint.metadata` via existing `saveCheckpoint({metadata: metrics})`.
- `graphsage-predictor.mjs`: `embedGraph()` now branches on `opts.embeddingSource` (mirrors trainer U-NNG-768D-FEATURES — 768-d when source loads with hit>0, falls through to 8-d projected otherwise); `predictMissingLinks()` auto-forwards `predictor.metadata.embeddingSource` so checkpoints are self-describing end-to-end; CLI gains `--embedding-source` (operator override).
- `graphsage-predictor.test.mjs`: +12 tests (loadPredictor metadata round-trip + embedGraph happy/fall-through/boundary/fail-loud + predictMissingLinks auto-forward + explicit-override).

Tests: 45/45 predictor + 103/103 train-pipeline pass (no regression).

**Absorbed into peer commit `2d931e3551` (bravo [[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24|HERMES-MCP-PLUGIN-INVENTORY-MS0]] MS-ENVELOPE)** — classic shared-tree `git add .` collision per [[feedback_commit_prefix_main_on_shared_tree]]. Content durable in main; attribution noisy. The actual unit `[NN-GRAPH-MS3]/U-NN-PREDICTOR-EMBED-WIRE` is closed.

**Unblocks:** B8 retrain assessment will now produce a graded AUROC end-to-end (Bridge → Trainer → Predictor → Eval → Promotion) — the 0.78 deploy-gate decision becomes a real number against real evaluation, not a deferred typed error. NN-GRAPH tier-5 moves from "research-only" to "operational with real AUROC" once a 768-d checkpoint clears the gate.

## Linked

- [[reference_gnn_node_embedding_bridge_2026_05_23]] (bridge — train-side wired)
- [[reference_trainer_export_regression_2026_05_23]] (predecessor regression — fixed)
- [[reference_high_roi_ai_psn_scope_2026_05_23]] — B8 in the top-10 ROI list; this gap is the actual blocker
