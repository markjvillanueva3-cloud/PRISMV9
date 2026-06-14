---
name: reference-u-nng-pipeline-stratified-wire-2026-05-17
description: "NN-GRAPH-MS1 / U-NNG-PIPELINE-STRATIFIED-WIRE — wired trainer's stratified neg-sampling through runTrainingPipeline so eval matches train distribution. Shipped 2026-05-17 slot alpha 97c9286311."
aliases: reference_u_nng_pipeline_stratified_wire_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.005Z
---


# NN-GRAPH-MS1 / U-NNG-PIPELINE-STRATIFIED-WIRE (2026-05-17, slot alpha)

Commit `97c9286311`. Closes the AUROC=0.096 deferred-deploy-gate **cause** (not
the gate itself — see below).

## The gap
`scripts/lib/graphsage-trainer.mjs` already shipped stratified negative sampling
(`positiveTypeMarginal`, `sampleStratifiedNegativeEdges`, `train()` accepting
`opt.nodeType`+`opt.negPHard`, default `DEFAULT_NEG_PHARD=0.7`). But
`scripts/lib/graphsage-train-pipeline.mjs` **never passed `nodeType`** — so the
GNN trained + evaluated with uniform negatives on a heterophilous graph, where
"different type ⇒ not linked" is anti-correlated with truth → AUROC 0.096 (worse
than random). The bug was at the trainer↔pipeline integration boundary, not the
algorithm.

## The fix (backward-compatible, opt-in)
- `PIPELINE_DEFAULTS`: `nodeTypeField:null`, `negPHard:0.7` (off unless requested).
- New exported `extractNodeTypes(rawGraph, fieldName)` (null on missing/!string/no-field).
- New exported `sampleStratifiedEvalNegatives(nodeIds, edgeKeySet, count, rng, opts)`
  — re-implements the trainer's stratified pick against the pipeline's
  **canonicalEdgeKey** (`JSON.stringify` of sorted pair; the trainer's internal
  `edgeKey` is unexported), falling back to uniform `sampleEvalNegatives()` when
  nodeType/marginal absent.
- `runTrainingPipeline`: filters `nodeType` to `features.keys()` (pruned/capped
  graph would otherwise inflate bucket weights with unsamplable ids);
  `typeMarginal` computed from **trainEdges only** (leakage-safe — held-out
  never touches training-time negative sampling); `stratifiedActive` gates both
  the `train()` call AND eval negatives so eval measures the trained distribution.
- CLI: `--node-type-field <field> --neg-p-hard <0..1>`; metrics expose
  `stratifiedNegatives/nodeTypeField/typeMarginalSize/negPHard`.
- `PRISM_NNG_DISABLE` discipline preserved: when `nodeTypeField` unset the RNG
  consumption + weights are **byte-identical** to the legacy path (regression
  test asserts `deepEqual` across two runs + `stratifiedNegatives===false`).

74/74 pipeline tests + 183/183 NN-GRAPH stack green via `node --test`
(+23 new cases: `extractNodeTypes` ×7, `sampleStratifiedEvalNegatives` ×6,
stratified-wiring ×4, parseArgs ×4 + boundary fixtures sized to defeat
seen-set saturation, e.g. 30 nodes/type for the pHard=0 marginal-mass test).

## Status after this unit
Deploy gate moved **code-side → data-side**. `state/shared/nn-graph/NN-EVAL.json`
still reads `deferred:true, poolSize:0` — the live system-viz graph currently
has 0 reference ghosts, so the GNN tier is dormant *by data*, not by a bug.
Actual gate lift needs an **operator out-of-session run**:
`node scripts/lib/graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard 0.7`
against the real 372k-node graph, then `nn-graph-eval.mjs` re-reads NN-EVAL.

## Lessons
- A "pure core + injected readers"/trainer-vs-pipeline split MUST verify the
  *integration boundary* — the algorithm being correct in isolation said nothing
  about whether the pipeline fed it the inputs it needed.
- Eval distribution must mirror train distribution: porting the trainer's
  stratified sampler eval-side (keyed by the canonical edge key) was required so
  AUROC measures what was trained, not a different negative distribution.

Related: [[reference_nn_graph_ms0_2026_05_16]] (the 8-unit MS0 base + the
triply-confirmed heterophily root-cause analysis this unit acts on).
