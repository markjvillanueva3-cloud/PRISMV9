---
name: nn-retrain-2026-05-22-1805
description: GNN tier-5 retrain 2026-05-22T18:05:53.986Z — AUROC 0.5000 · macroF1 0.1333 · Brier 0.2600 · not-promoted
aliases: [nn-retrain, NN Retrain, nn-retrain-2026-05-22-1805]
metadata:
  type: reference
  run_log: true
---

# NN-GRAPH retrain round — 2026-05-22T18:05:53.986Z

A self-retrain lifecycle pass of the GraphSAGE tier-5 wiring classifier
(NN-GRAPH-MS2 / U2). Captured automatically by the U-NEURAL-FEEDBACK-LOOP (H4)
from `state/shared/nn-graph/retrain-lifecycle.jsonl` — one verifiable signal
per real retrain.

- **Graph fingerprint:** 258874 nodes · 898494 edges · 636 ghosts
- **Drift trigger:** graph drift — nodes 2.1%, edges 10.4%, ghosts 0.0% (edge band 10%)
- **Eval metrics:** AUROC 0.5000 · macroF1 0.1333 · Brier 0.2600
- **Outcome:** NOT PROMOTED — action "not-promoted". Candidate retained, live checkpoint untouched.

**Verifiable signal:** the three metrics above are the candidate model's graded
performance on the held-out wiring-classification eval. A future session can
re-check them against the live checkpoint's `auroc` and the NN-GRAPH-MS0
gates (AUROC ≥ 0.78 · macroF1 ≥ 0.55 · Brier ≤ 0.15).

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms0_2026_05_16]]
