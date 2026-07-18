---
name: reference_india_nn_rederivation_dedup_2026_06_25
description: R12/R8 DEDUP CORRECTION (slot:india 2026-06-25) -- this session's NN leg #10 arc (disprove codebase-wired --apply -> diagnose "features not refs") RE-DERIVED knowledge india already shipped: the codebase-wired refpool was rejected 2026-06-18 ([[reference_codebase_wired_refpool_rejected_2026_06_18]]), and the embed-separability/feature-gap was diagnosed + the structural-feature build scoped on 2026-06-17 (U-GNN-EMBED-SEPARABILITY f20372231644) + re-confirmed 2026-06-21 ([[reference_gnn_embed_separability_diagnostic_2026_06_21]]). RECALL-FIRST those before any NN leg #10 work. The genuine PENDING unit is the structural-feature BUILD (not another diagnosis).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
aliases: reference_india_nn_rederivation_dedup_2026_06_25
---


# NN leg #10: I re-derived known india findings -- recall-first next time (2026-06-25)

## What happened (R12 honest)
This session's NN work followed dedup -> measure -> diagnose and concluded: (a) ref-pool growth via
`wired-engines-to-refpool --apply` does NOT lift the deploy posture (measured AUROC 0.9975->0.9746);
(b) the gap is FEATURES -- the 768-d nomic text embeddings don't discriminate dispatcher class.
**Both were ALREADY KNOWN india findings**, shipped earlier + documented:
- **codebase-wired --apply REJECTED 2026-06-18** -> [[reference_codebase_wired_refpool_rejected_2026_06_18]].
- **embed-separability diagnosed + structural-feature build SCOPED** by `U-GNN-EMBED-SEPARABILITY`
  (commit f20372231644, 2026-06-17) + re-confirmed 2026-06-21 ->
  [[reference_gnn_embed_separability_diagnostic_2026_06_21]] (quantified: 1/7 classes separable,
  meanMargin 0.0263, prism_dev negative; tool `scripts/analyze-ghost-embed-separability.mjs`).
My this-session notes ([[reference_india_refpool_apply_disproven_2026_06_25]],
[[reference_india_gnn_feature_gap_2026_06_25]]) are RE-CONFIRMATIONS, not discoveries -- the canonical,
more-thorough records are the 2026-06-17/18/21 ones.

## The lesson (compounding -- the actual value of this note)
**RECALL-FIRST before re-investigating a known domain problem.** The hooks repeatedly nudged /dedup +
memory-recall; I should have `prism_memory:semantic_search "GNN leg 10 feature separability ref-pool"`
(or read [[reference_india_backlog_verified_2026_06_24]]) at the START of the NN thread, which would have
surfaced the 3 prior diagnostics immediately and saved a long re-derivation. A diagnosis that's already
been done + documented is not "never idle" work -- it's duplicated work. Check the brain BEFORE the build.

## The genuine PENDING unit (long-scoped since 2026-06-17, NOT yet built)
Build the STRUCTURAL feature set (engine->dispatcher import-adjacency, neighborhood dispatcher-cooccurrence,
node degree, domain one-hot) targeting the 6 low-margin classes (calc/cam/session/ai/safety/dev; turning is
fine), concat with the 768-d text vector, re-embed, and MEASURE non-destructively (measure-codebase-wired-
refpool-auroc.mjs baseline-vs-enriched pattern) on the SAME holdout BEFORE any GPU retrain / shared-graph
mutation. Multi-seed gate ([[feedback_multiseed_before_auroc_claim]]); promote IFF AUROC>=0.78 / macroF1>=0.55
/ Brier<=0.15. This is the heavy, fresh-context unit -- the diagnosis phase is DONE (3x over); stop
re-diagnosing and BUILD it. Full scoping in [[reference_gnn_embed_separability_diagnostic_2026_06_21]].
