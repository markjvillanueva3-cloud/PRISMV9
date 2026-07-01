---
name: reference_gnn_confidence_hybrid_2026_06_21
description: "GNN tier-5 edges lever SHARPENED to its best wired-set form (slot:india, 2026-06-21, U-GNN-CONFIDENCE-HYBRID commit fb496ed0ab). The naive neighbor-first hybrid only lifted +0.0100 over deployed direct-embed because it trusted EVERY neighbor vote incl low-purity ones. This unit sweeps a purity threshold tau: trust the neighbor-vote only when its confidence (vote purity) >= tau, else direct-embed fallback. LOO over the 3207 single-class codebase-wired engines (NO 542MB graph; reuses .cwref-newemb.jsonl + shipped neighborVote/directEmbedVote). RESULT: tau=0 (naive) 0.7321 -> tau=0.70 (BEST) 0.7530 -> tau=1.01 (pure direct-embed) 0.7222; monotone rise then slight decline. BEST tau=0.70 = +0.0209 over naive, +0.0309 over deployed direct-embed (~3pt, nearly 3x the naive blend's lift). tau=0.70 COINCIDES with GNN_DEFAULTS.minConf (the production confidence gate) -- observed, not claimed causal. CONFIDENCE-GATING HELPS: YES. scripts/measure-confidence-hybrid.mjs (18/18 tests, 2-arm scrutiny PASS, 0 P0/P1, 3 latent-only P2s). R12: deterministic full-LOO (no seed variance), k-sensitive; wired-set is a CEILING/proxy for the edge-sparser unwired-ghost task; accuracy is NOT the deploy gate. tau=0.70 is a CANDIDATE for the ghost-holdout head-to-head (the real deploy gate, needs the 542MB graph), NOT a deploy value. NEXT + FINAL arc step: ghost-holdout head-to-head via nn-graph-eval buildHoldout + AUROC/macroF1/Brier @ minConf, multi-seed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.589Z
aliases: reference_gnn_confidence_hybrid_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21. The 4th unit of the edges-lever arc, sharpening the head-to-head ([[reference_gnn_classify_headtohead_2026_06_21]]): the naive neighbor-first hybrid diluted the neighbor vote's +4.5pt subset accuracy by trusting low-purity votes. Hypothesis: purity-gate it.

**METHOD:** `scripts/measure-confidence-hybrid.mjs` -- sweep tau; trust neighbor-vote iff confidence >= tau, else direct-embed. LOO over the 3207 wired engines, no 542MB graph (reuses the embedding cache + the shipped LOO primitives). Votes precomputed once per engine (tau-independent), scored against each tau.

**RESULT (real numbers, live, deterministic full-LOO):**
| tau | accuracy | neighborUsed | note |
|---|---|---|---|
| 0.00 | 0.7321 | 1969 | naive neighbor-first hybrid |
| 0.50 | 0.7449 | 1817 | |
| 0.60 | 0.7521 | 1657 | |
| **0.70** | **0.7530** | 1512 | **BEST** (= GNN_DEFAULTS.minConf) |
| 0.80 | 0.7515 | 1440 | |
| 1.00 | 0.7477 | 1325 | |
| 1.01 | 0.7222 | 0 | pure direct-embed |

- BEST tau=0.70 -> **+0.0209 over naive (0.7321), +0.0309 over deployed direct-embed (0.7222)** -- ~3pt, nearly 3x the naive blend's +0.0100.
- The curve rises monotonically to 0.70 then declines: gating out low-purity neighbor votes recovers accuracy until over-gating reverts everything to direct-embed.
- **tau=0.70 == GNN_DEFAULTS.minConf** (the production confidence gate). Observed coincidence -- the script does NOT claim it causal -- but a clean alignment: the production gate is also the optimal purity threshold for trusting the edge vote.

**WHAT THIS MEANS:** properly blended (purity-gated at the production confidence threshold), the homophilous-edge signal beats the deployed direct-embed cosine k-NN by ~3pt at full coverage. The edges lever is real and now at its best wired-set form. The deployed classifier (direct-embed only, no edges) is leaving this on the table.

**R12 HONESTY:** deterministic full-LOO (every engine left out once -> no sampling, no seed variance; the numbers are exact for this population+k=10). NOT a statistical-significance claim, NOT a deploy-gate pass (gate = AUROC>=0.78/macroF1>=0.55/Brier<=0.15 on the ghost holdout). Wired-set LOO is a CEILING/proxy; the deployed UNWIRED-ghost task is edge-sparser (62.5% edge-cov). tau=0.70 is a CANDIDATE to carry into the ghost-holdout head-to-head, not a deploy value.

**NEXT (the FINAL arc step -- the deploy decision):** run the 3 classifiers (direct-embed / neighbor-vote / confidence-hybrid @ tau=0.70) on the deployed UNWIRED-ghost holdout via `nn-graph-eval.mjs` buildHoldout + computeAUROC/computeMacroF1/computeBrier + selectiveDeployPoint @ GNN_DEFAULTS.minConf. Needs the 542MB graph (`--max-old-space-size=8192`). Multi-seed before any promote. If the confidence-hybrid clears the gate where direct-embed alone defers, wire it into the deployed tier-5.

**Artifacts:** `scripts/measure-confidence-hybrid.mjs` + `.test.mjs` (18/18), commit `fb496ed0ab` on cad-fusion-live-ms0. Re-run: `node scripts/measure-confidence-hybrid.mjs [--k N] [--json]`.

**ARC:** [[reference_gnn_edge_class_homophily_2026_06_21]] -> [[reference_gnn_neighbor_vote_loo_2026_06_21]] -> [[reference_gnn_classify_headtohead_2026_06_21]] -> THIS. Also [[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]].
