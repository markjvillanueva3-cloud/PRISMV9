---
name: reference_gnn_classify_headtohead_2026_06_21
description: "GNN tier-5 edges-lever arc COMPLETE (slot:india, 2026-06-21, U-GNN-CLASSIFY-HEADTOHEAD commit cd3f64fe26). Head-to-head LOO of three dispatcher classifiers over the 3207 single-class codebase-wired engines (real labels, NO 542MB graph -- uses the .cwref-newemb.jsonl cache): direct-embed cosine k-NN (the DEPLOYED mechanism) 0.7222 acc @ 100pct coverage; neighbor-vote over the homophilous leak-free edges 0.7674 @ 61.4pct (MORE accurate than direct-embed on its covered subset, +4.5pt); hybrid (neighbor-vote where edges exist, direct-embed fallback) 0.7321 @ 100pct = +0.0100 over direct-embed. They agree only 71.4pct where both fire (genuinely complementary). VERDICT EDGES-ADD-VALUE: YES (directional, deterministic full-LOO so NO seed variance) -- but the margin is MODEST + k-sensitive and accuracy is NOT the deploy gate. The deployed direct-embed leaves a real, $0, zero-ML, leak-free signal (the homophilous edges) on the table. scripts/measure-classify-headtohead.mjs (20/20 tests, 2-arm scrutiny PASS, P1 margin-honesty + P2s fixed inline). NEXT: (a) a confidence-aware hybrid (override direct only when neighbor purity is high -- both arms emit confidence; the naive neighbor-first blend is unoptimized); (b) the same head-to-head on the deployed UNWIRED-ghost holdout with the real gate (nn-graph-eval buildHoldout + AUROC/macroF1/Brier) -- the wired-set LOO is a CEILING/proxy for the edge-sparser ghost task (62.5pct edge-cov)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.589Z
aliases: reference_gnn_classify_headtohead_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21. The capstone of the 3-unit edges-lever arc this window: edges homophilous ([[reference_gnn_edge_class_homophily_2026_06_21]]) -> neighbor-vote classifies ([[reference_gnn_neighbor_vote_loo_2026_06_21]]) -> THIS head-to-head proves the edges add value OVER the deployed direct-embed.

**METHOD:** `scripts/measure-classify-headtohead.mjs` -- leave-one-out over the 3207 single-class codebase-wired engines (real labels). Three classifiers on the SAME population, NO 542MB graph (reuses the `.cwref-newemb.jsonl` embedding cache + the shipped helpers loadLabeledVectors / buildStemToClass / buildNeighborIndex+neighborVote). All three keyspaces reconcile on the lowercased engine class name.

**RESULT (real numbers, live, deterministic full-LOO):**
| classifier | coverage | accuracy |
|---|---|---|
| direct-embed cosine k-NN (DEPLOYED mechanism) | 100% | 0.7222 |
| neighbor-vote (homophilous edges) | 61.4% | **0.7674** |
| hybrid (neighbor where edges, direct fallback) | 100% | **0.7321** |

- base-rate prior 0.2669 (predict prism_cam).
- agreement where BOTH fire: 71.4% (1406/1969) -> 29% disagree = genuinely complementary.
- **EDGES-ADD-VALUE: YES** -- hybrid +0.0100 over direct-embed at the same full coverage; neighbor-vote is +4.5pt over direct-embed on its covered subset.

**WHAT THIS MEANS:** the deployed direct-embed cosine k-NN (which uses NO edges) leaves a real, $0, zero-ML, leak-free classification signal on the table. A hybrid that consults the homophilous edges beats it. The signal is COMPLEMENTARY (only 71% agreement), not redundant.

**R12 HONESTY (the margin is modest):** +0.0100 full-coverage lift is sub-1pt and k-sensitive (k=10 default; larger at k=1). It is DETERMINISTIC (every engine left out once -> no sampling, no seed variance), so the number is exact for this population+k, but it is NOT a statistical-significance claim and NOT a deploy-gate pass (the gate is AUROC>=0.78/macroF1>=0.55/Brier<=0.15 on the ghost holdout). The wired-set LOO is a CEILING/proxy; the deployed UNWIRED-ghost task is edge-sparser (62.5% edge-coverage, avg 2.02 nbrs vs 5.04). The classifier ORDERING transfers; absolute numbers will be lower.

**NEXT (two levers, both follow-ons of this unit):**
1. **Confidence-aware hybrid** -- the naive "neighbor-first" blend is unoptimized; both arms emit `confidence`. Override direct-embed only when neighbor purity clears a threshold (or pick the higher-confidence arm). Likely beats +0.0100 since neighbor-vote is +4.5pt on its subset but the naive blend dilutes that across full coverage.
2. **Ghost-holdout head-to-head with the real gate** -- run the same 3 classifiers on the deployed unwired-ghost holdout via `nn-graph-eval.mjs` buildHoldout + computeAUROC/computeMacroF1/computeBrier + selectiveDeployPoint @ GNN_DEFAULTS.minConf. Needs the 542MB graph (`--max-old-space-size=8192`). This is the actual deploy-decision gate; multi-seed before any promote.

**Artifacts:** `scripts/measure-classify-headtohead.mjs` + `.test.mjs` (20/20), commit `cd3f64fe26` on cad-fusion-live-ms0. Re-run: `node scripts/measure-classify-headtohead.mjs [--k N] [--json]`.

**SIBLINGS / ARC:** [[reference_gnn_edge_class_homophily_2026_06_21]] -> [[reference_gnn_neighbor_vote_loo_2026_06_21]] -> THIS. Also [[reference_gnn_selective_deploy_2026_06_06]] · [[reference_gnn_import_fingerprint_probe_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
