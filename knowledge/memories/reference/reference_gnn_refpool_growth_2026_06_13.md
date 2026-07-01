---
name: gnn-refpool-growth-2026-06-13
description: Grew GNN reference pool +8 confirmed vault wirings @0.85 (0 conflicts); india re-eval pending to convert into full-coverage AUROC
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_refpool_growth_2026_06_13
---


2026-06-13 (slot:bravo, session 17b9f42e) — during the recurring AI-systems-synergy /goal, pushed the gate's ONE named residual (GNN full-coverage = ref-pool growth) by the safe data lever, NOT the GPU retrain.

**What:** `node scripts/vault-to-gnn-refpool.mjs --apply` (big-heap, streaming, single graph-writer) merged **8 CONFIRMED vault "wired into" labels @ confidence 0.85** (≥0.8 ref gate), **0 conflicts**, into `state/shared/system-viz/system-graph.json` (nodes updated=8 — engines: SinkerEDMElectrodeInspectionEngine→prism_edm, JMDiePartLibraryEngine→prism_data, GWizardToolCribExportEngine→prism_calc, PDFHighlightExtractorEngine→prism_dev, CustomerManagementEngine + 2 others→prism_business, +1 prism_ai). Graph now 340,882 nodes / 702,598 edges. Reversible: `--revert` (vault-sourced ghosts are tagged).

**Why it matters:** the ref-pool seed was stale (2026-05-23, 9 entries); +8 high-trust labels ≈ doubles the confirmed reference set. This is the precondition for raising GNN full-coverage beyond the selective-deploy bar.

**india NEXT (GPU, owner):** re-run `nn-graph-eval` to grade with the grown pool (NN-EVAL.json is 7d stale; LEG-C still PASS on the selective bar AUROC 0.808). Per [[feedback_multiseed_before_auroc_claim]], report multi-seed, not single-seed — link-pred AUROC on capped subgraphs is high-variance. Do NOT claim a full-coverage lift without the GPU re-eval.

**Gate state after:** `ai-systems-synergy-goal-gate.mjs` 4/4 PASS, exit 0 (A 34/34 gaps=0; B 1366 LoRA rows/34 galaxies; C AUROC 0.808 selective; D CAG 100%). The goal is MET at the floor; this grows the frontier. → [[reference_nn_graph_ms2_u1_2026_05_17]] · [[reference_gnn_selective_deploy_2026_06_06]]
