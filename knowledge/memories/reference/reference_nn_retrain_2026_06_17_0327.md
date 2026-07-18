---
name: nn-retrain-2026-06-17-0327
description: GNN tier-5 retrain 2026-06-17T03:27:57.981Z — AUROC 0.5313 · macroF1 0.0250 · Brier 0.1258 · not-promoted
metadata:
  type: reference
  run_log: true
---

# NN-GRAPH retrain round — 2026-06-17T03:27:57.981Z

A self-retrain lifecycle pass of the GraphSAGE tier-5 wiring classifier
(NN-GRAPH-MS2 / U2). Captured automatically by the U-NEURAL-FEEDBACK-LOOP (H4)
from `state/shared/nn-graph/retrain-lifecycle.jsonl` — one verifiable signal
per real retrain.

- **Graph fingerprint:** 346683 nodes · 798952 edges · 216 ghosts
- **Drift trigger:** forced (--force)
- **Eval metrics:** AUROC 0.5313 · macroF1 0.0250 · Brier 0.1258
- **Outcome:** NOT PROMOTED — action "not-promoted". Candidate retained, live checkpoint untouched.

**Verifiable signal:** the three metrics above are the candidate model's graded
performance on the held-out wiring-classification eval. A future session can
re-check them against the live checkpoint's `auroc` and the NN-GRAPH-MS0
gates (AUROC ≥ 0.78 · macroF1 ≥ 0.55 · Brier ≤ 0.15).

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms0_2026_05_16]]
