---
name: reference_india_gnn_feature_gap_2026_06_25
description: ROOT-CAUSE DIAGNOSIS (slot:india 2026-06-25) of the GNN tier-5 leg #10 "concentrated 1/13 classes" coverage limit. The GNN node features are PURELY 768-d nomic-embed-text semantic embeddings (node-embeddings-768d.jsonl: model nomic-embed-text, dim 768, source graph-node-bridge, count 64546) with a ZERO-VECTOR fallback for unembedded nodes -- NO structural features. Generic text-similarity clusters by TOPIC not by the WIRING TARGET (dispatcher), and zero-fallback nodes get no signal. The soul's "sharper features" next unit = concatenate STRUCTURAL features (in/out degree, per-dispatcher-class adjacency histogram, node-type one-hot, typed cross-substrate edges) to the 768-d embeddings + fix the zero-fallback. This is WHY ref-pool growth alone was disproven ([[reference_india_refpool_apply_disproven_2026_06_25]]).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
aliases: reference_india_gnn_feature_gap_2026_06_25
---


# GNN feature gap -- the leg #10 root cause is FEATURES, diagnosed (india 2026-06-25)

## The diagnosis (evidence)
After the ref-pool --apply was DISPROVEN ([[reference_india_refpool_apply_disproven_2026_06_25]]:
adding 3,219 refs DROPS AUROC 0.9975->0.9746), the soul pointed at "growth + SHARPER FEATURES".
This fire diagnosed the feature stack concretely:
- `state/shared/nn-graph/node-embeddings-768d.jsonl` META: `{model: nomic-embed-text:latest, dim: 768,
  count: 64546, source: graph-node-bridge}`. The node features ARE these 768-d semantic embeddings.
- `scripts/lib/graphsage-train-pipeline.mjs`: the feature matrix is built `features.set(id, v)` (~L282)
  with `v || new Array(emb.dim).fill(0)` (~L616) -- i.e. each node's feature = its 768-d embedding,
  and a node WITHOUT an embedding gets an ALL-ZERO vector (no discriminative signal).
- NO structural features (degree / centrality / per-dispatcher-class adjacency / node-type one-hot /
  the typed cross-substrate edges owned-by-slot/documented-by/embeds) are concatenated. The GNN relies
  100% on generic nomic-embed text-similarity (+ GraphSAGE neighbor aggregation over those same weak
  base features).

## Why this caps coverage at 1/13 classes
nomic-embed-text embeds node TEXT -> clusters by TOPIC (all CAM-ish nodes embed alike), NOT by the
classification TARGET (which dispatcher the engine wires to). The wiring signal is STRUCTURAL (an engine
imported by dispatcher X is wired to X; a node's edge-neighborhood encodes its class). Pure topical
embeddings + zero-fallback for unembedded nodes => weak per-class separation => the selective tier only
clears the gate for one well-embedded class.

## NEXT UNIT (precise, buildable -- next fire, metrics-gated)
Build a structural-feature augmentation: a PURE function `nodeStructuralFeatures(node, adjacency, dispMap)`
-> [inDegree, outDegree, perDispatcherClassAdjacencyHistogram(13), nodeTypeOneHot, ...] concatenated to
the 768-d embedding (new inputDim = 768 + K). Fix the zero-fallback (unembedded node -> structural-only
vector, not all-zeros). WIRE into graphsage-train-pipeline feature construction (~L282/L616). TEST the
pure fn (known mini-graph -> known structural vector, R9). VALIDATE via measure-codebase-wired-refpool-
auroc.mjs / a retrain+eval -> report the held-out AUROC/macroF1/Brier lift (soul: gate on REAL numbers,
never "looks sharper"). Heavy (542MB retrain) -> fresh budget. Do NOT --apply refs (disproven) or extend
seedEntries (dormant). Siblings: [[reference_india_refpool_apply_disproven_2026_06_25]] ·
[[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]].
