---
name: reference_gnn_selective_promote_disproven_2026_06_15
description: "GNN tier-5 multi-seed verdict (slot:india 2026-06-15, CORRECTED): direct-embed AUROC is seed-STABLE (5 seeds: mean 0.829, range [0.762,0.881], stdev 0.041) -- the Jun-6 0.808 was NOT a single-seed fluke. The earlier 0.4286 was a DIFFERENT classifier (the trained checkpoint, model mode), not a reseed. Real gate failure is STABLE: macroF1 ~0.10 (one-class predictor) + Brier ~0.22, AND the selective path is now NON-DEPLOYABLE because the reference pool COLLAPSED 62->13. Auto-promote stays OFF (correct). Real lever = ref-pool growth + investigating the 62->13 collapse. New tool: scripts/nn-graph-holdout-variance.mjs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_selective_promote_disproven_2026_06_15
---


# GNN selective-deploy: multi-seed verdict (slot:india 2026-06-15) -- CORRECTS the earlier "single-seed outlier" framing

## What I got wrong first (R12 self-correction)
My initial disproof note said the 0.808 was a "single-seed outlier" and that a forced retrain "scored 0.4286, a 0.38 AUROC swing ACROSS SEEDS." That root cause was **wrong**. Two facts I missed (found by reading the code + running a real multi-seed probe):
1. The GraphSAGE trainer is **seed-DETERMINISTIC** (mulberry32, default `seed:1`). Re-running on the same graph reproduces the same model. So a "seed swing" is not even possible for the trainer.
2. The 0.808 (NN-EVAL.json Jun-6) and the 0.4286 (latest-candidate.json Jun-12) are **two DIFFERENT classifiers**, not two seeds of one:
   - 0.808 = `embeddingMode:"direct"` -- the raw-768d-nomic cosine k-NN (no trained model).
   - 0.4286 = the TRAINED checkpoint (model mode), `holdoutN 13`. The trained GraphSAGE model is WORSE than raw cosine.

## The real multi-seed evidence (the load-bearing data)
Built `scripts/nn-graph-holdout-variance.mjs` (loads the 763MB graph ONCE via readGraphStreaming, re-scores a FIXED model across holdout-shuffle seeds). Ran 5 seeds [1337,7,42,99,2026], direct-embed, current Jun-15 graph:
- **AUROC: mean 0.829, range [0.762, 0.881], stdev 0.041** -> SEED-STABLE. The Jun-6 0.808 REPRODUCES. Not a fluke.
- **macroF1: mean 0.105, range [0.095, 0.114]** -> stably ~0.10, FAR below the 0.55 gate. AUROC ranks, but the classifier is a near-constant predictor (dominant `prism_turning`). This is the killer, and it is NOT seed noise.
- **Brier: mean 0.216** -> above the 0.15 gate, all seeds.
- **full gate: 0/5. selective gate: 0/5 "no-deployable-operating-point."**
- holdoutN = **13** on every seed (pool ~26).

## The actual root cause: the reference pool COLLAPSED 62 -> 13
- Jun-6 NN-EVAL.json had `holdoutN 62` (pool ~124) and DID find a selective operating point (Brier 0.0406 @ tau=0.7, 32% coverage) -> the "deploy-ready-selective" claim.
- Jun-15 the pool is `holdoutN 13` (pool ~26) -> NO deployable selective point exists. The high-confidence reference-ghost pool shrank ~5x. A 13-sample holdout cannot support a selective operating point, and AUROC at n=13 is wide (range 0.119).
- So "deploy-ready-selective @ tau=0.7" was valid FOR THE 62-NODE POOL; it is gone on the 13-node pool. The bottleneck is the **pool**, exactly as the long-standing thesis says.

## Actions taken (verified)
- **Refreshed NN-EVAL.json** (direct-embed, current graph): holdoutN 13, AUROC 0.8095, macroF1 0.1008, Brier 0.2102, selective deployPoint **found:false** ("NO-DEPLOYABLE-OPERATING-POINT at tau=0.7"). VERIFIED `classifyGnn` now returns `selectiveDeployReady:false, verdict:"shipped-research-only"` -> the PSN leg (#10) no longer injects the stale "SELECTIVE-DEPLOY 0.808 deploy-ready" banner fleet-wide; it honestly shows below-gate.
- **Auto-promote (`PRISM_NN_SELECTIVE_PROMOTE`) stays OFF** -- correct: no classifier clears any gate (full OR selective) on the current pool. Reverting it last session was right, for a sharper reason than first stated.
- **Built `scripts/nn-graph-holdout-variance.mjs` + .test.mjs (15/15)** -- reusable fixed-model holdout-variance diagnostic; operationalizes [[feedback_multiseed_before_auroc_claim]] for any future candidate.

## Corrected doctrine
- A single AUROC HIDES the real failure: AUROC 0.83 looked deployable, but macroF1 0.10 (seed-stable) shows a one-class predictor. **Always read macroF1 + Brier + selective-deployability beside AUROC**, never AUROC alone.
- Multi-seed is still mandatory before a deploy claim -- but here it proved AUROC STABLE; the instability was a misread of two classifiers + a shrinking pool. Use `nn-graph-holdout-variance.mjs` to settle it with numbers.
- **REAL LEVER (confirmed): reference-pool GROWTH.** The 62->13 collapse is now PROVEN = CONFIDENCE DEFLATION (streamed the graph: 208 ghosts stable, only 31 at >=0.8, 129 bunched in 0.6-0.8 under the gate; refMinConf==confidenceCap=0.8 ceiling-gating fragility). NOT seed-loss (the `reference-pool-seed-2026-05-23.json` is advisory-only, never merged -- my "regen-viz seed stage not merged" guess was WRONG), NOT engines-wired-out (count stable). Full root cause + fix paths -> [[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]]. Fix paths: operator-label the 31-entry worklist (gated) / refMinConf<cap (defensible, validate first) / autonomous `vault-to-gnn-refpool.mjs` vault-confirmed-label growth ([[reference_gnn_refpool_vault_grow_2026_06_10]]). NOT retrains (trainer deterministic + trained model worse than raw cosine), NOT calibration (measured dead-end), NOT auto-promote.

Supersedes [[reference_gnn_checkpoint_selective_promote_gap_2026_06_15]] ("validated @ 0.808" framing). [[reference_gnn_selective_deploy_2026_06_06]] (the 0.808 source, now confirmed reproducible-but-below-gate). [[feedback_multiseed_before_auroc_claim]] [[reference_forkstorm_consolidation_2026_06_14]] (pool/outcome-diversity bottleneck).
