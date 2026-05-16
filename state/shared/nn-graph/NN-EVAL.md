# NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL

**Status: DEFERRED** — insufficient-reference-pool

A trained GraphSAGE checkpoint **is present and loaded cleanly** — the
U4 training-pipeline blocker is resolved.

The deploy gate cannot be graded yet for a **data-side** reason, not
a code-side one:

- Reference pool in the current system-viz graph: **0** high-
  confidence ghost classifications (a leave-out holdout needs >= 2). The
  tier-5 gate is dormant by data — the `ghost.unwired-engine` count
  fluctuates 0..811 with each system-viz regeneration and is currently
  at the low end.

Trained-checkpoint link-prediction diagnostic (the pretext task —
expected weak on this heterophilous, type-imbalanced graph; this is
NOT the deploy gate):

- AUROC 0.0961 · Brier(raw) 0.3253 · Brier(cal) 0.2495
- epochs 30 · finalLoss 0.7373 · calibrator reliable (n=2624)

**Unblock:** re-run after a system-viz regeneration that yields >= 2
high-confidence reference ghosts (no retraining needed — only the graph
data must change):

```
node scripts/lib/nn-graph-eval.mjs --checkpoint state/shared/nn-graph/graphsage-checkpoint.json
```
