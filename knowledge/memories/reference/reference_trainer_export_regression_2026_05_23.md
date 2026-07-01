---
name: trainer-export-regression-2026-05-23
description: "Pre-existing P0 regression — graphsage-train-pipeline.mjs imports positiveTypeMarginal + sampleStratifiedNegativeEdges from graphsage-trainer.mjs, but those exports are absent. Blocks every NN-GRAPH end-to-end retrain."
aliases: reference_trainer_export_regression_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.225Z
---


# Trainer-export regression — `graphsage-trainer.mjs` missing exports (2026-05-23, slot golf)

Surfaced during round-trip verification of [[reference_gnn_node_embedding_bridge_2026_05_23]] ([[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] / U-GNN-NODE-EMBED-BRIDGE). NOT introduced by the bridge — pre-existing.

## Symptom

```
$ node -e "import('file:///H:/prism/scripts/lib/graphsage-train-pipeline.mjs')"
IMPORT FAIL: The requested module './graphsage-trainer.mjs' does not provide an export named 'positiveTypeMarginal'
```

## Root cause

`scripts/lib/graphsage-train-pipeline.mjs` (lines ~38-44) imports:
```
import { train, rocAuc, positiveTypeMarginal, sampleStratifiedNegativeEdges }
  from "./graphsage-trainer.mjs";
```

`scripts/lib/graphsage-trainer.mjs` currently exports only:
- `TRAIN_DEFAULTS` (alias `DEFAULTS`)
- `bceLoss`
- `rocAuc`
- `sampleNegativeEdges` (the original [[reference_nn_graph_ms0_2026_05_16|NN-GRAPH-MS0]] sampler — non-stratified)
- `computeLossAndGradients`
- `train`

The wiki entry [[u-nng-pipeline-stratified-wire]] + memory [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] document `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` as exports added in NN-GRAPH-MS1 (commit `97c9286311`, 2026-05-17), but the trainer file does not contain them today. The pipeline + its test file still reference them.

## Why this didn't surface sooner

`runTrainingPipeline()` is invoked only by:
- `scripts/nn-graph-retrain-lifecycle.mjs` — but the retrain-lifecycle spawns the trainer as a CHILD PROCESS via `spawnSync`, so its `import` failure is captured as a non-zero `trainExitCode` rather than crashing the lifecycle script
- `scripts/lib/graphsage-train-pipeline.test.mjs` — node:test top-level

Looking at `retrain-lifecycle.jsonl` tail: the last forced retrain (2026-05-23T04:30:48Z) shows `trained:true, trainExitCode:0, assessment:{deferred:false, holdoutN:62, metrics:{auroc:0.5, macroF1:0.1333, brier:0.26}, grade:{pass:false}}` — so the trainer DID complete with exit-0 and produced ALL-0.5 AUROC. That means either (a) the trainer ran under a fallback path that avoided the broken import, or (b) the cached/stale trainer file produced the result. The 0.5 AUROC is a deeply broken result — it's the "random classifier" baseline, evidence the trainer is not actually training, just emitting calibrated random scores.

**The 0.297 AUROC reported in the [[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] spec** for `graphsage-checkpoint-768d-rag-upgrade.json` matches an INCOMPLETE training run that fell back to projected features. The most recent lifecycle run dropped to 0.5 — a regression already in the field, predating the bridge unit.

## Fix surface (follow-up unit candidate: `U-NN-TRAINER-EXPORT-RESTORE`)

Two viable paths:
1. **Restore from history** — `git log --all -- scripts/lib/graphsage-trainer.mjs` to find a commit where the file had `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` exports, then cherry-pick those function bodies forward. Likely lives at or before commit `97c9286311`.
2. **Re-derive from the wiki spec** — [[u-nng-pipeline-stratified-wire]] documents the function contracts. Write fresh implementations + add tests covering the stratified-negative-sampling invariants pinned in `graphsage-train-pipeline.test.mjs:457-484`.

Path 1 is preferred (R8: read before you write — and the prior implementation has presumably-passing tests).

## Blast radius

- `nn-graph-retrain-lifecycle.mjs` — every scheduled retrain produces an unusable checkpoint
- `scripts/lib/graphsage-predictor.mjs` — `embedGraph()` throws `RangeError: checkpoint inputDim X does not match feature projector dim Y` if the projected-fallback checkpoint is used against the 768-d bridge source — different failure mode but still blocks tier-5 inference
- The bridge unit ([[reference_gnn_node_embedding_bridge_2026_05_23]]) is correct + ships a valid JSONL, but a working trainer is required to convert that JSONL into a promotable checkpoint

## Status

ADVISORY — surface as a follow-up unit. NOT fixed in this session per autonomous-loop drift discipline ([[feedback_autonomous_loop_drift_discipline]], 3-tick anomaly cap reached). The bridge ships independently — the JSONL is loader-protocol-conformant and the 49/49 tests pin that.
