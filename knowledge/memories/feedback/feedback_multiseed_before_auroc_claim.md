---
name: feedback_multiseed_before_auroc_claim
description: Never claim an AUROC/metric LIFT from a single seed — link-pred AUROC on small subgraphs is high-variance; require multiple seeds (and a realistic config) before reporting an A/B delta as real.
type: feedback
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.435Z
aliases: feedback_multiseed_before_auroc_claim
---


# Multi-seed before claiming an AUROC lift (R9/R12)

When A/B-testing a model lever (e.g. H2GCN feature enrichment vs baseline) by comparing held-out **AUROC**, a single-seed delta is NOT evidence — link-prediction AUROC on a capped subgraph is high-variance.

**Why (live proof, 2026-06-09, U-GNN-HETEROPHILY-VALIDATE):** the H2GCN lever's A/B at a SIMPLE config (8-d projected features, 1500 nodes) showed seed5 **+0.118** (looked like a clear win) — but seed7 **-0.049** (hurt) and seed11 **+0.021** (marginal). Both arms sat in the ~0.49 random floor; the "lift" was seed noise. A single-seed report would have been a false claim. Only at a REALISTIC config (768-d embeddings + stratified + 4000 nodes, more edges -> stabler AUROC) was the lift robust: 3/3 seeds +0.059..+0.078.

**How to apply:**
- Run the A/B across >=3 seeds; report the per-seed deltas + mean, and call it real only if the sign is consistent.
- Prefer the config closest to the deploy target (feature source, sampling, node cap) — small/cheap configs sit in the noise floor and mislead.
- State the baseline absolute value, not just the delta: a "+0.07 lift" from 0.33->0.40 (still sub-random) is a different claim than 0.74->0.81 (clears a gate). Surface whether the gate is cleared.
- Harness: `scripts/validate-heterophily-auroc.mjs` (per-run; aggregate across seeds manually). Pairs with [[reference_gnn_edge_predict_foundation_2026_06_08]] and the deploy-gate doctrine [[feedback_india_deploy_gate_hard]].
