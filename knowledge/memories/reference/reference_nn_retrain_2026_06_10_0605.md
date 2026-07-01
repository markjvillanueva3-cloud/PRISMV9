---
name: nn-retrain-2026-06-10-0605
description: GNN tier-5 retrain 2026-06-10T06:05:53.262Z — AUROC 0.5000 · macroF1 0.1412 · Brier 0.2480 · not-promoted
metadata:
  type: reference
  run_log: true
---

# NN-GRAPH retrain round — 2026-06-10T06:05:53.262Z

A self-retrain lifecycle pass of the GraphSAGE tier-5 wiring classifier
(NN-GRAPH-MS2 / U2). Captured automatically by the U-NEURAL-FEEDBACK-LOOP (H4)
from `state/shared/nn-graph/retrain-lifecycle.jsonl` — one verifiable signal
per real retrain.

- **Graph fingerprint:** 333538 nodes · 675161 edges · 200 ghosts
- **Drift trigger:** graph drift — nodes 10.3%, edges 35.2%, ghosts 68.6% (node band 10%)
- **Eval metrics:** AUROC 0.5000 · macroF1 0.1412 · Brier 0.2480
- **Outcome:** NOT PROMOTED — action "not-promoted". Candidate retained, live checkpoint untouched.

**Verifiable signal:** the three metrics above are the candidate model's graded
performance on the held-out wiring-classification eval. A future session can
re-check them against the live checkpoint's `auroc` and the NN-GRAPH-MS0
gates (AUROC ≥ 0.78 · macroF1 ≥ 0.55 · Brier ≤ 0.15).

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms0_2026_05_16]]
