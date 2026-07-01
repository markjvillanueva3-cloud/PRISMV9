---
name: reference_gnn_stronger_embedding_lever_2026_06_23
description: "MEASURED (slot:india 2026-06-23, A2 operator-chosen strong-GPU push): a stronger embedding model lifts GNN tier-5 ranking monotonically but does NOT clear the full-coverage gate. 5-seed model-swap A/B on the deployed 355-ghost pool: nomic768 AUROC 0.783/macroF1 0.308 -> mxbai@768 0.817/0.362 -> mxbai@1024 0.835/0.381; selective 3/5->4/5; Brier flat ~0.187; full-gate 0/5 all three; still unstable. Embedding is necessary-but-NOT-sufficient for full-coverage (needs architecture/H2GCN/trained-checkpoint, NOT another embedding swap, NOT calibration). Per A2 'adopt only if gate clears', deployed selective posture STAYS. Shipped reusable infra (executes deferred U-RAG-6)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_stronger_embedding_lever_2026_06_23
---


# GNN tier-5: stronger embedding model is a confirmed-positive lever, not a full-coverage fix

## What / why
The operator picked path A2 ("strong GPU model, real push") to test the [[ref-pool-growth-can-regress-deploy-gate]]
documented resolution ("the binding constraint is the EMBEDDING MODEL"). I measured it directly with a clean
model-swap A/B on the deployed ghost pool. Hardware: RTX PRO 6000 Blackwell + python-gpu sentence-transformers
5.5.1 / torch 2.11+cu128. Only `nomic-embed-text` (768d) was installed; `mxbai-embed-large-v1` (1024d native,
MRL-truncatable) downloaded fresh (~670MB, A2-authorized).

## Result (5-seed multi-seed variance, identical graph+holdout+ghost-set, pure model swap)
| model | AUROC | macroF1 | Brier | full | selective |
|---|---|---|---|---|---|
| nomic 768d (deployed) | 0.783 | 0.308 | 0.187 | 0/5 | 3/5 |
| mxbai@768 (MRL) | 0.817 | 0.362 | 0.189 | 0/5 | 4/5 |
| mxbai@1024 (native) | 0.835 | 0.381 | 0.186 | 0/5 | 4/5 |

Monotonic: AUROC +0.052, macroF1 +0.073, selective 3/5->4/5, Brier flat (calibration NOT hurt). The 768d MRL
truncation costs ~0.018 AUROC vs native 1024d. **BUT 0/5 full-gate all three** (macroF1 0.38 << 0.55, Brier 0.19 > 0.15);
still `unstable`. So a stronger embedding HELPS but does not clear full-coverage -- the remaining lever is
architecture/features (H2GCN, trained checkpoint on mxbai@1024 node-features), NOT another embedding, NOT calibration.

## Decision (R12 / slot soul)
Per A2 "adopt only if the gate clears": full-coverage gate NOT cleared -> deployed selective-deploy posture STAYS.
Adopting mxbai ghosts to improve ONLY the selective tier (3/5->4/5) is a separate smaller decision; needs the
canonical STRATIFIED NN-EVAL grade confirmed first (variance tool uses random holdouts) + a backup of the
git-ignored deployed `ghost-node-embeddings.jsonl`. Did NOT mutate production this session.

## Infra shipped (reusable; executes deferred U-RAG-6 GPU embedder migration)
- `scripts/embed-nodes-gpu.py` -- batched GPU embedder (model+dim configurable, resumable). Blackwell ~1347/s ->
  full 346k corpus re-embed is ~5-13 min, NOT multi-hour (the cost fear that deferred this was wrong).
- `scripts/build-node-embeddings.mjs --emit-texts` -- additive byte-identical text tap (53/53 regression).
- `scripts/quantize-vecs-to-ghost-embeddings.mjs` -- parity join via the deployed `quantize()`, ref-set-restricted
  (pure `buildCandidate` exported, 5/5 tests).
- A/B harness pre-existing: `nn-graph-holdout-variance.mjs --embed-path <candidate>` (cosine k-NN = dim-agnostic,
  so 1024d measures with NO migration).

## Next levers (for the next india window / operator)
1. Trained GraphSAGE checkpoint on mxbai@1024 full-corpus node-features (the architecture lever, the real
   remaining full-coverage attempt) -- needs the full 346k re-embed (now cheap) + the 768->1024 dim migration
   across embedder/trainer/predictor/eval (the `768` blast radius, ~40 files).
2. OR adopt mxbai ghosts for the selective tier only (smaller; stratified-grade-gated + backup).

Related: [[ref-pool-growth-can-regress-deploy-gate]] [[gnn-selective-deploy]] [[reference_gnn_codebase_wired_refpool_2026_06_18]]. Wiki: [[gnn-stronger-embedding-model-lever-measured]].
