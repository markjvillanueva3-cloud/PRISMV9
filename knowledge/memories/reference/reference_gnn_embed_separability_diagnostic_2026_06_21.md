---
name: reference_gnn_embed_separability_diagnostic_2026_06_21
description: "ROOT-CAUSE DIAGNOSTIC for GNN leg #10 concentrated coverage (slot:india 2026-06-21). Class-separability of the deployed 355-ref ghost embeddings (178 labeled, scripts/analyze-ghost-embed-separability.mjs): only 1 of 7 dispatcher classes is separable -- prism_turning margin +0.1016; prism_calc +0.035, prism_cam +0.016, prism_session +0.0145, prism_ai +0.012, prism_safety +0.006 (all ~noise), prism_dev -0.0016 (NEGATIVE = confused). meanMargin 0.0263. The 768-d nomic TEXT embeddings are near-non-discriminative for dispatcher class except turning -- this mechanistically EXPLAINS the deployed 'spans 2/13 classes' concentration and proves the H2GCN/sharper-features build must add STRUCTURAL/graph features (import-adjacency, dispatcher-cooccurrence), NOT more text embedding. Empirically grounds the 2026-06-18 'needs sharper features' conclusion with the WHICH (structural) and the WHERE (every class but turning)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_embed_separability_diagnostic_2026_06_21
---


**NOT A NOVEL DISCOVERY -- a FRESH RE-CONFIRMATION (R12).** The root-cause ("embeddings PARTIALLY separate dispatchers") + the `analyze-ghost-embed-separability.mjs` tool were already SHIPPED by **[AI-SYSTEMS-GNN]/U-GNN-EMBED-SEPARABILITY (slot:india, commit f20372231644, 2026-06-17)** ([[reference_post_ship_ai-systems-gnn-u-gnn-embed-separability]] · wiki [[ai-systems-gnn-u-gnn-embed-separability]]). This memory RE-RUNS that tool on the CURRENT 178-labeled deployed pool (verify-live discipline) + adds the explicit feature-design conclusion. The finding HOLDS on fresh data.

**CONTEXT:** slot:india autonomous /loop 2026-06-21. After GNN ref-pool label growth was measured-exhausted ([[reference_gnn_refpool_cap20_reverify_2026_06_21]]: safe feeders saturated; cap=20 = ranking-not-coverage), the real coverage lever is the H2GCN/sharper-features retrain. This re-confirms the SAFE, non-GPU diagnostic that scopes that build: quantify WHY the current features under-separate, so feature design is data-driven not guessed.

**RUN (non-destructive, lightweight -- 355 ghost embeddings, NOT the 542MB graph):**
`node scripts/analyze-ghost-embed-separability.mjs --emb state/shared/nn-graph/ghost-node-embeddings.jsonl --json`
- 178 labeled / 161 unlabeled refs; 7 classes scored (minClass>=5); separableClasses **1/7**; meanMargin **0.0263**; minMargin -0.0016; maxMargin 0.1016.

| class | n | intra-cos | inter-cos | margin | read |
|---|---|---|---|---|---|
| prism_turning | 50 | 0.8488 | 0.7472 | **+0.1016** | ONLY separable class |
| prism_calc | 17 | 0.7829 | 0.7477 | +0.0352 | weak |
| prism_cam | 35 | 0.7574 | 0.7413 | +0.0160 | ~noise |
| prism_session | 7 | 0.7276 | 0.7131 | +0.0145 | ~noise |
| prism_ai | 18 | 0.7436 | 0.7316 | +0.0121 | ~noise |
| prism_safety | 8 | 0.7259 | 0.7196 | +0.0063 | ~noise |
| prism_dev | 26 | 0.7224 | 0.7241 | **-0.0016** | NEGATIVE -- confused (more like other classes than itself) |

**INTERPRETATION (R12, real numbers):** margin = mean intra-class cosine - mean inter-class cosine; >0 = the class forms a tighter cluster than background (separable). Only **prism_turning** clears that bar (+0.10, n=50 -- the biggest + most domain-distinct class). Every other dispatcher sits in an undifferentiated blob (intra ~0.72-0.78 barely above inter ~0.72-0.75); **prism_dev is NEGATIVE** (its engines are marginally MORE similar to non-dev engines than to each other). This is the MECHANISM behind the deployed tier-5's "spans 2/13 classes (concentrated)" selective-deploy: only turning (+ calc as a distant 2nd) has enough class signal to clear the tau=0.7 confidence gate; the rest abstain.

**WHAT THIS PROVES FOR THE FEATURES BUILD (the actionable output):**
1. The 768-d **nomic TEXT embeddings** of engine descriptions are near-non-discriminative for dispatcher class (a calc-engine description and a cam-engine description embed nearly identically). More text refs cannot fix this (consistent with the cap=20 rejection: density without separability just manufactures spurious-confident wrong votes).
2. The features build must add **STRUCTURAL/graph features** that carry DIRECT class signal: engine->dispatcher import adjacency, neighborhood dispatcher-cooccurrence, node degree, domain one-hot. These encode "which dispatcher's import-neighborhood this engine sits in" -- exactly the label being predicted -- where text does not.
3. Target the SIX low-margin classes (calc/cam/session/ai/safety/dev); turning is already fine. dev's negative margin is the most urgent (actively confused).

**NEXT UNIT (scoped, for fresh context):** design + extract the structural feature set, concatenate with (or replace) the 768-d text vector, re-embed, and MEASURE non-destructively (measure-codebase-wired-refpool-auroc.mjs pattern: baseline vs enriched on the SAME holdout) BEFORE any GPU retrain / shared-graph mutation. Multi-seed gate ([[feedback_multiseed_before_auroc_claim]]). Promote IFF AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15 on real held-out (india soul -- never soften).

**SIBLINGS:** [[reference_gnn_refpool_cap20_reverify_2026_06_21]] · [[reference_codebase_wired_refpool_rejected_2026_06_18]] · [[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]].
