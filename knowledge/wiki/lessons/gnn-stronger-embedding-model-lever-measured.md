---
title: A stronger embedding model lifts GNN tier-5 ranking but does NOT clear the full-coverage gate (measured)
type: lesson
slot: india
date: 2026-06-23
tags: [gnn, tier-5, embedding-model, mxbai, nomic, deploy-gate, measure-before-commit, ref-pool, u-rag-6, blackwell-gpu]
links:
  - "[[ref-pool-growth-can-regress-deploy-gate]]"
  - "[[gnn-selective-deploy]]"
  - "[[nn-graph-ms0]]"
---

# A stronger embedding model is a confirmed-positive GNN tier-5 lever, but not sufficient for full-coverage

## TL;DR
The standing hypothesis ([[ref-pool-growth-can-regress-deploy-gate]] resolution) was: full-coverage
needs a **stronger embedding model**, not a linear reprojection of the nomic-embed-text vectors. This
unit MEASURED that directly via a clean model-swap A/B on the deployed ghost pool (slot:india, A2,
operator-chosen "strong GPU model" path). Result: a stronger model (`mxbai-embed-large-v1`) **monotonically
improves** the ranking + selective metrics, but **does NOT clear the full-coverage deploy gate**. The
embedding model is a *necessary-but-not-sufficient* lever -- full-coverage still needs sharper features /
architecture (H2GCN / a trained checkpoint), not just a better embedding.

## The measurement (5-seed multi-seed variance, identical graph + holdout + ghost set, pure model swap)
| model | AUROC | macroF1 | Brier | full-gate | selective | stability |
|---|---|---|---|---|---|---|
| nomic-embed-text 768d (deployed) | 0.783 | 0.308 | 0.187 | 0/5 | 3/5 | unstable |
| mxbai-embed-large-v1 @768 (MRL trunc) | 0.817 | 0.362 | 0.189 | 0/5 | 4/5 | unstable |
| **mxbai-embed-large-v1 @1024 (native)** | **0.835** | **0.381** | **0.186** | 0/5 | 4/5 | unstable |

- **Monotonic**: AUROC +0.052, macroF1 +0.073 nomic -> mxbai@1024; selective-pass 3/5 -> 4/5; Brier flat
  (0.187 -> 0.186, calibration NOT hurt -- unlike the sharp-embed lever which wrecked it).
- The 768d MRL truncation cost ~0.018 AUROC vs native 1024d (the full model strength recovers it) -- so
  native dim matters, but even native 1024d is **0/5 on the full gate** (macroF1 0.38 << 0.55, Brier 0.19 > 0.15).
- Gate verdicts still flip across seeds (`unstable`), same as the deployed pool.

## Decision (metric-gated, R12)
Per the operator's A2 criterion ("adopt ONLY if the gate clears"): the FULL-coverage gate did NOT clear,
so the deployed selective-deploy posture STAYS. This is measured progress, not a gate-clear. The result
narrows the remaining work: a better embedding alone will not get full-coverage; the next levers are
**architecture / trained-checkpoint on the stronger features** (H2GCN, GraphSAGE retrain on mxbai@1024
node-features) -- NOT another embedding swap and NOT calibration ([[ref-pool-growth-can-regress-deploy-gate]]
already proved calibration is a dead end). Adopting mxbai ghosts to better the SELECTIVE tier (3/5->4/5)
is an available, separate, smaller decision -- it needs the canonical stratified NN-EVAL grade confirmed
first (the variance tool uses random holdouts; NN-EVAL uses a stratified split) + a backup of the
git-ignored deployed file.

## Reusable infra shipped (also executes the deferred U-RAG-6 "GPU embedder migration")
- `scripts/embed-nodes-gpu.py` -- batched sentence-transformers GPU embedder (model+dim configurable,
  resumable, symmetric/no-prefix). Blackwell throughput **~1347 items/s** (short) / ~480/s (full ghost text)
  => the full 346k-node corpus re-embed is **~5-13 min, NOT multi-hour** (the cost-fear that deferred this).
- `scripts/build-node-embeddings.mjs --emit-texts PATH` -- additive tap that writes the EXACT per-node
  embed text (reusing the real text + source-signal resolution) so an external embedder gets byte-identical
  inputs => only the MODEL differs (apples-to-apples). Default behavior byte-identical (53/53 regression).
- `scripts/quantize-vecs-to-ghost-embeddings.mjs` -- joins GPU float vecs + emit-texts metadata into a
  deployed-format candidate via the SAME `quantize()`, restricted to the deployed ghost id set (strict
  A/B). Pure `buildCandidate()` exported + tested (5/5).
- A/B harness already existed: `nn-graph-holdout-variance.mjs --direct-embed --embed-path <candidate>`
  (the eval is cosine k-NN = dimension-agnostic, so a 1024d candidate measures with NO migration).

## Pipeline (reproduce)
```
node --max-old-space-size=8192 scripts/build-node-embeddings.mjs --ghosts-only \
  --graph state/shared/system-viz/system-graph.json --emit-texts <texts.jsonl>
python scripts/embed-nodes-gpu.py --in <texts.jsonl> --out <vecs.jsonl> --dim 1024 \
  --model mixedbread-ai/mxbai-embed-large-v1
node scripts/quantize-vecs-to-ghost-embeddings.mjs --vecs <vecs> --texts <texts> \
  --ref state/shared/nn-graph/ghost-node-embeddings.jsonl --out <candidate> --dim 1024
node --max-old-space-size=8192 scripts/nn-graph-holdout-variance.mjs --direct-embed \
  --embed-path <candidate> --json --out <report.json>
```

## Meta-lesson
A documented "the binding constraint is X" hypothesis is still a HYPOTHESIS until measured. Measuring it
(cheaply, multi-seed, model-swap-isolated) both CONFIRMED the direction (+0.052 AUROC) and BOUNDED it
(still 0/5 full gate) -- which is more decision-useful than either "it's the embedding" (overclaim) or
"don't bother" (underclaim). The infra to measure it is the same infra to eventually deploy it.
