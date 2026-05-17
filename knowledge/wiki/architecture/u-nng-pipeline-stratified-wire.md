---
title: U-NNG-PIPELINE-STRATIFIED-WIRE
kind: architecture
milestone: NN-GRAPH-MS1
shipped: 2026-05-17
slot: alpha
commit: "97c9286311"
status: shipped
related: [nn-graph-ms0]
---

# NN-GRAPH-MS1 / U-NNG-PIPELINE-STRATIFIED-WIRE

Wires the GraphSAGE trainer's already-shipped **stratified negative sampling**
through `runTrainingPipeline` so the GNN both trains AND evaluates against a
type-marginal-matched negative distribution. Closes the *cause* of the
AUROC=0.096 deferred-deploy-gate (heterophily anti-correlation under uniform
negatives) documented triply in [[nn-graph-ms0]].

## Root cause
`scripts/lib/graphsage-trainer.mjs` already exported `positiveTypeMarginal`,
`sampleStratifiedNegativeEdges`, and a `train()` accepting `opt.nodeType` +
`opt.negPHard`. `scripts/lib/graphsage-train-pipeline.mjs` never passed
`nodeType`, so on the heterophilous system-viz graph (same-type ≠ linked)
uniform negatives let the model exploit "different type ⇒ not linked", which is
anti-correlated with truth → AUROC below random. The defect was at the
trainer↔pipeline **integration boundary**, not the algorithm.

## Change (opt-in, backward-compatible)
- `PIPELINE_DEFAULTS.nodeTypeField=null`, `.negPHard=0.7` — off unless requested.
- `extractNodeTypes(rawGraph, fieldName)` — `Map<id,type>` or null on
  missing/non-string/no-field/non-object.
- `sampleStratifiedEvalNegatives(...)` — re-implements the trainer's stratified
  pick against the pipeline's `canonicalEdgeKey` (the trainer's internal
  `edgeKey` is unexported), falling back to uniform `sampleEvalNegatives()` when
  nodeType/marginal absent — so eval negatives mirror the trained distribution.
- `runTrainingPipeline`: `nodeType` filtered to `features.keys()` (a pruned/capped
  graph would inflate bucket weights with unsamplable ids); `typeMarginal`
  computed from **trainEdges only** (leakage-safe); `stratifiedActive` gates the
  `train()` call AND eval negatives together.
- CLI flags `--node-type-field <field>` / `--neg-p-hard <0..1>`; metrics expose
  `stratifiedNegatives/nodeTypeField/typeMarginalSize/negPHard`.
- Legacy path is **byte-identical** when `nodeTypeField` unset (regression test
  asserts `deepEqual` weights across two runs + `stratifiedNegatives===false`),
  preserving `PRISM_NNG_DISABLE` discipline.

## Tests
74/74 pipeline + 183/183 NN-GRAPH stack via `node --test` (+23 new cases;
boundary fixtures sized — e.g. 30 nodes/type — to defeat seen-set saturation in
the marginal-mass assertion).

## Status / operator action
Deploy gate moved **code-side → data-side**. `state/shared/nn-graph/NN-EVAL.json`
remains `deferred:true, poolSize:0` because the live 372k-node graph currently
has 0 reference ghosts (tier dormant *by data*, not by bug). Lift requires an
operator out-of-session run:

```
node scripts/lib/graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard 0.7
```

against the real graph, after which `nn-graph-eval.mjs` re-reads NN-EVAL.

Memory: [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] ·
[[reference_nn_graph_ms0_2026_05_16]].
