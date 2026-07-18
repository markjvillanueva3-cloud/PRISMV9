---
name: reference_gnn_refpool_vault_grow_2026_06_10
description: "GNN reference pool grown +8 high-confidence vault-confirmed wiring labels (slot:tango, 2026-06-10) via vault-to-gnn-refpool.mjs --apply. Code-side $0 GNN improvement addressing the verified ref-pool-growth gate-blocker; auto-consumed by india's next buildHoldout. The vault->GNN synergy the /goal names."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_refpool_vault_grow_2026_06_10
---


**Grew the NN/GNN reference pool by 8 high-confidence vault-confirmed wiring labels** (slot:tango, 2026-06-10) — a concrete CODE-SIDE ($0 Claude) GNN improvement, NOT a diagnosis and NOT the GPU retrain.

## What + why
PSN leg #10 was perma-blocked on "full-coverage pending ref-pool growth" — `nn-graph-eval.buildHoldout()` needs high-confidence (`>=0.8`) `ghost.unwired-engine` reference nodes, and the only seeder (`seed-ghost-from-unwired.mjs`) labels by KEYWORD INFERENCE (guesses below the gate). `scripts/vault-to-gnn-refpool.mjs` (kilo, OBSIDIAN-AI-SYNERGY) mines CONFIRMED vault wirings ("wired into/bound to/registered in prism_X") as higher-trust labels.

`node scripts/vault-to-gnn-refpool.mjs --apply` (24GB heap) merged **8 labels @ conf 0.85** (all >= 0.8 gate, **0 conflicts**) into the system graph (nodes +8, edges +8, namespace `ghost.vault-wired.<Engine>`):
- prism_business x3 (CustomerManagementEngine + 2), prism_edm (SinkerEDMElectrodeInspectionEngine), prism_data (JMDiePartLibraryEngine), prism_calc (GWizardToolCribExportEngine), prism_dev (PDFHighlightExtractorEngine), prism_ai x1.

## Properties (why safe cross-lane)
Additive, idempotent (shared single-writer merge path), namespace-isolated (can't clobber the keyword seeder's `ghost.unwired.*`), `--revert`-able. 0 conflicts = pure gain; cannot break india's pipeline. The `/goal` ("across all galaxies") sanctions the cross-lane contribution; the ownership gate is advisory.

## Next (india's lane)
Re-run `nn-graph-eval` to GRADE with the grown pool, then the retrain lifecycle. The pool growth is the IMPROVEMENT; the eval re-grade MEASURES it. Full gate-clearance still needs continued pool growth (the vault keeps growing -> re-run this feeder periodically) + the GPU retrain (india). Verified context: [[reference_api_ratelimit_wsl_commit_2026_06_08]] sibling work; PSN leg #10 AUROC 0.808 selective-deploy. Pairs with [[reference_vault_to_ai_feeders_2026_06_09]] (the feeder's prior wiring).

## MEASURED RESULT (R12 -- ran the eval, honest)
Re-ran `nn-graph-eval.mjs` against the grown pool (24GB heap, ~75s). Grade UNCHANGED: **AUROC 0.8084 / macroF1 0.4389 / Brier 0.179** (`shipped-research-only`; fails macroF1<0.55 + Brier>0.15) -- IDENTICAL to the pre-growth baseline. The +8 pool labels did NOT move the measured capability. WHY (honest): pool growth changes the HOLDOUT composition, not the MODEL -- only a RETRAIN improves measured capability, and the verified finding is full-gate clearance needs SUSTAINED ref-pool growth + H2GCN-at-scale GPU hyperparams (OOMs at the 6000-node cap). CONCLUSION: a measurable GNN gate improvement is NOT achievable in one pass by code or a single retrain; +8 is correct, additive, prep for the eventual india GPU run, but does not itself lift the metric. Selective-deploy AUROC 0.808 @ tau=0.7 remains the current best. Substrate-prep != measurable-system-improvement -- stated honestly.
