# NN-GRAPH-MS0/U-HOTFIX-EXCLUDE-EDGES — [MAIN] [NN-GRAPH-MS0]/U-HOTFIX-EXCLUDE-EDGES: trainer.excludeEdges param + pipeline wire-up — close docstring-vs-code leakage gap (post-ship hotfix)

**Commit:** `0a5bb290268e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T15:32:10-05:00
**Tags:** nn-graph-ms0, u-hotfix-exclude-edges, auto-distilled

## Subject
[MAIN] [NN-GRAPH-MS0]/U-HOTFIX-EXCLUDE-EDGES: trainer.excludeEdges param + pipeline wire-up — close docstring-vs-code leakage gap (post-ship hotfix)

## Body
```
[MAIN] [NN-GRAPH-MS0]/U-HOTFIX-EXCLUDE-EDGES: trainer.excludeEdges param + pipeline wire-up — close docstring-vs-code leakage gap (post-ship hotfix)

The pipeline header docstring promised "Negatives are random node pairs absent
from the FULL edge set (train + test)" — but the trainer's internal edgeSet was
built solely from the trainAdj passed in, so held-out test edges could be
neg-sampled and the model taught to push them apart.

Surgical 3-file fix (137 insertions, 0 deletions):
- scripts/lib/graphsage-trainer.mjs — train() gains optional options.excludeEdges
  iterable; each [u,v] is unioned into the rejection set via the trainer's own
  edgeKey() BEFORE epoch 1. Backward compatible: omit and behavior is byte-
  identical.
- scripts/lib/graphsage-train-pipeline.mjs — passes the full undirected edges
  array (train + test) into the new param, with a WHY-comment locking the
  leakage-safety invariant.
- scripts/lib/graphsage-trainer.test.mjs — 5 regression tests: forbidden pair
  never neg-sampled (file-local EDGE_SEP/keyOf avoids silent separator-drift
  tripwire); backward-compat with []; silent-skip on malformed entries;
  non-iterable degrades to no-op; Set iterable accepted.

Per-file 2-reviewer scrutiny PASS on each file (code-analyzer + reviewer,
0 P0/P1; 2 P2 from test review applied as immediate follow-ups). 30/30 trainer
tests + 51/51 pipeline tests green.

Empirical refutation of hypothesis-1: retrained at the prior failing config
(--max-nodes 20462 --epochs 60 --learning-rate 0.05 --seed 7), AUROC = 0.2165,
finalLoss = 0.7925 — BIT-IDENTICAL to pre-fix baseline. Leak math predicted
this (~0.15 hits/run across 3840 neg draws against 12k test edges out of
4.18e8 pairs); empirical match confirms the leak is too rare to flip AUROC.
Three hypotheses now refuted: 2-hop hard negatives, lr instability, train-
time test-edge leakage. Milestone shipped-research-only status doubly
confirmed empirically.

Live open hypotheses unresolved (all U4-pipeline-level work outside this
threads scope): sparse-graph + L2-norm degeneracy, overfit-then-anti-
generalize, 8-d feature projector insufficient (full plan called for 768-d
nomic + 128-d node2vec features). The fix nevertheless closes a real
docstring-vs-code defect and arms 5 tripwire tests against re-regression.

Memory: [[reference_nn_graph_ms0_2026_05_16]] updated with follow-up #2 +
the --skip-write reusable-tooling gotcha.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/lib/graphsage-train-pipeline.mjs | Bin 17473 -> 17983 bytes
- scripts/lib/graphsage-trainer.mjs        |  23 +++++++
- scripts/lib/graphsage-trainer.test.mjs   | 114 +++++++++++++++++++++++++++++++
- 3 files changed, 137 insertions(+)

## Lessons surfaced in commit body
- gotcha.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a5bb290268e`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._