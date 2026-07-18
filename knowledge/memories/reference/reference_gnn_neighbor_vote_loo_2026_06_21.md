---
name: reference_gnn_neighbor_vote_loo_2026_06_21
description: "GREEN-LIGHT for the GNN tier-5 neighbor-vote lever (slot:india, 2026-06-21, U-GNN-NEIGHBOR-VOTE-LOO commit 0a2c081f04). The measure-before-build gate following the edge-homophily finding ([[reference_gnn_edge_class_homophily_2026_06_21]]): does a dead-simple COUNT-BASED neighbor vote over the homophilous leak-free edges actually classify an engine's dispatcher? YES, decisively. scripts/measure-neighbor-vote-loo.mjs (non-destructive, 20/20 tests, 2-arm PASS) does leave-one-out over the 3208 single-class codebase-wired engines using engine_import + shared_schema + shared_test edges (physics + action-engine excluded). LIVE: 1969/3208 covered (61.4% have >=1 classifiable neighbor, avg 5.04 nbrs); LOO accuracy 0.7674 vs base-rate prior 0.2668 (predict prism_cam) = 2.88x lift; at the production confidence gate tau=0.7 -> 47.1% coverage at 86.2% accuracy. For comparison the deployed direct-embed selective is ~32% coverage spanning only 2/13 classes -- a zero-ML neighbor vote BROADENS coverage. So the homophilous edges are EXPLOITABLE for classification, not just structurally present. GREEN-LIGHT the full unit: build the neighbor-vote classifier over the deployed UNWIRED-ghost holdout and score it head-to-head vs direct-embed using buildHoldout + computeAUROC/macroF1/Brier + selectiveDeployPoint @ GNN_DEFAULTS.minConf (nn-graph-eval.mjs, already read). R12 CAVEAT (scrutiny arm-B): this LOO ran on the edge-DENSE WIRED set = a CEILING; unwired ghosts are edge-sparser so the deployed holdout will likely score LOWER coverage; and accuracy is NOT the deploy gate (AUROC/macroF1/Brier). green-light = worth building the head-to-head, NOT deploy-ready."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_neighbor_vote_loo_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21, same window as the edge-homophily measure. After [[reference_gnn_edge_class_homophily_2026_06_21]] proved the leak-free engine-engine edges are homophilous (import 4.63x), the next measure-before-build question (R13): does a simple neighbor vote over those edges actually CLASSIFY dispatcher, or is the homophily real-but-unexploitable?

**METHOD:** `scripts/measure-neighbor-vote-loo.mjs` -- leave-one-out (LOO) over the 3208 single-class codebase-wired engines. Build an undirected neighbor index from engine_import (direct) + shared_schema + shared_test (2-hop via shared intermediate); physics (class-agnostic) + action-engine (label leak) EXCLUDED. For each engine, predict its dispatcher by the count-majority class of its NEIGHBORS (own label never enters its own vote -> leak-free LOO). Score accuracy over the covered set + coverage vs the base-rate prior.

**RESULT (real numbers, live):**
- single-class engines: 3208 ; covered (>=1 classifiable nbr): **1969 (61.4%)** ; avg 5.04 classifiable neighbors
- **LOO accuracy 0.7674** vs base-rate prior **0.2668** (predict prism_cam) = **2.88x lift**
- confidence-banded (tau=0.7 = production gate): **47.1% coverage @ 86.2% accuracy** ; tau=0.8: 44.9% @ 86.3%
- GREEN-LIGHT: YES (accuracy>=0.5 AND lift>=1.5 at coverage>=0.5)

For comparison: the deployed direct-embed cosine k-NN selective is ~32% coverage spanning only 2/13 classes (concentrated, [[reference_gnn_selective_deploy_2026_06_06]]). A **zero-ML count-based neighbor vote reaches 47% coverage at 86% accuracy** -- broader. Strong evidence the neighbor vote could beat/complement direct-embed.

**NEXT UNIT (green-lit, turnkey -- recipe in handoff + [[reference_gnn_edge_class_homophily_2026_06_21]]):** build the full neighbor-vote classifier over the deployed UNWIRED-ghost holdout and score it head-to-head vs direct-embed. Reuse `buildHoldout(graph,opts)` (same label-unique stratified refs) + `computeAUROC`/`computeMacroF1`/`computeBrier` + `selectiveDeployPoint` @ `GNN_DEFAULTS.minConf` (0.7) from `scripts/lib/nn-graph-eval.mjs` (already read) -- apples-to-apples vs `runAssessment({directEmbed:true, directEmbedPath: state/shared/nn-graph/ghost-node-embeddings.jsonl})`. Reference labels for the vote = the codebase-wired 3208 (real single-dispatcher labels); held-out ghosts are UNWIRED so there is no overlap -> leak-free by construction. Consider a HYBRID (direct-embed where the ghost has no edges, neighbor-vote where it does) since the two cover different ghosts.

**R12 CAVEATS (scrutiny arm-B, baked into the script output):**
1. This LOO ran on the edge-DENSE WIRED set (avg 5.04 nbrs). Unwired ghosts are by definition less integrated -> edge-SPARSER -> the deployed holdout will likely see LOWER coverage. The 61.4%/0.767 is a CEILING/proxy, not the deployed number.
2. Accuracy is NOT the deploy gate. Green-light = worth building the head-to-head; the gate is AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15 on the ghost holdout.

**Artifacts:** `scripts/measure-neighbor-vote-loo.mjs` + `.test.mjs` (20/20), commit `0a2c081f04` on cad-fusion-live-ms0. Re-run: `node scripts/measure-neighbor-vote-loo.mjs [--json]`.

**SIBLINGS:** [[reference_gnn_edge_class_homophily_2026_06_21]] (parent finding) · [[reference_gnn_selective_deploy_2026_06_06]] · [[reference_gnn_import_fingerprint_probe_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
