---
name: nn-retrain-2026-06-27-0605
description: GNN tier-5 retrain 2026-06-27T06:05:53.183Z — AUROC n/a · macroF1 0.0000 · Brier 0.4372 · not-promoted
metadata:
  type: reference
  run_log: true
---

# NN-GRAPH retrain round — 2026-06-27T06:05:53.183Z

A self-retrain lifecycle pass of the GraphSAGE tier-5 wiring classifier
(NN-GRAPH-MS2 / U2). Captured automatically by the U-NEURAL-FEEDBACK-LOOP (H4)
from `state/shared/nn-graph/retrain-lifecycle.jsonl` — one verifiable signal
per real retrain.

- **Graph fingerprint:** 376613 nodes · 881927 edges · 5491 ghosts
- **Drift trigger:** reference-pool drift — nodes 4.2%, edges 4.0%, ghosts 52.5% (ghost band 25%)
- **Eval metrics:** AUROC n/a · macroF1 0.0000 · Brier 0.4372
- **Outcome:** NOT PROMOTED — action "not-promoted". Candidate retained, live checkpoint untouched.
- **Errors:** node-embedding bridge: index read failed: loadShardedIndex: shard tribal-embed-index.shard-003.json has 29972 entries, manifest says 29932 -- torn/corrupt shard; refusing to return a partial brain (training continues without --embedding-source)

**Verifiable signal:** the three metrics above are the candidate model's graded
performance on the held-out wiring-classification eval. A future session can
re-check them against the live checkpoint's `auroc` and the NN-GRAPH-MS0
gates (AUROC ≥ 0.78 · macroF1 ≥ 0.55 · Brier ≤ 0.15).

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms0_2026_05_16]]
