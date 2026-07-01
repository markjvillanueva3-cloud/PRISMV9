# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-HETERO-PREDICT-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-PREDICT-FIX (slot:alpha): complete the GNN build -- heterophily eval no longer defers on a dim mismatch

**Commit:** `b1f72793f85c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T10:01:26-05:00
**Tags:** ai-synergy-audit-ms0, u-aisyn-gnn-hetero-predict-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-PREDICT-FIX (slot:alpha): complete the GNN build -- heterophily eval no longer defers on a dim mismatch

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-PREDICT-FIX (slot:alpha): complete the GNN build -- heterophily eval no longer defers on a dim mismatch

Operator: 'run gnn loop for india' + 'other chats are waiting on you to complete gnn build.' Running the GNN retrain with heterophily (PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3, india's strongest documented lever, +0.138 AUROC) surfaced a real pipeline bug: graphsage-train-pipeline widens features egoDim->egoDim*(1+hops) (768->3072) and trains a 3072-dim checkpoint, but saveCheckpoint persists ONLY inputDim (no hops), and the predictor fed RAW 768-dim features -> 'inputDim 3072 does not match feature dim 768' -> nn-graph-eval DEFERRED every heterophily run -> the strongest config could NEVER be graded or promoted (the heterophily build path was silently dead).

FIX (one file, inference-correct): pure heterophilyHopsForCheckpoint(inputDim, baseDim, featureSource) INFERS hops = inputDim/baseDim - 1 when inputDim is a clean integer multiple (>1) of the embedding dim ON THE EMBEDDING PATH (heterophily is only trained on embeddings, never the 8-d projected fallback). The predictor then mirrors the SAME heterophilyAggregateMap over the eval-graph edges (normalize 'mean' == lifecycle default) before the dim-check + forward. Equal/non-multiple/projected dims keep the legacy path byte-identical (no checkpoint-format change).

VALIDATE LIVE: heterophily retrain BEFORE = 'eval: DEFERRED -- inputDim 3072 does not match 768'; AFTER = 'eval: AUROC 0.5 macroF1 0.1053 Brier 0.2547' (grades end-to-end). The model is still below the 0.78 promotion gate (correctly not-promoted -- that is the honest research reality, separate from this pipeline fix; on the capped 6000-node subgraph heterophily is chance-level, consistent with the known high-variance note). TEST 7/7 new (happy 1/2/3-hop, legacy equal-dim, projected-never-expands, non-multiple-returns-0, adversarial NaN/Inf/zero/negative/shrink) + 45/45 legacy predictor suite (no regression). Unblocks india's heterophily eval through the full lifecycle.
```

## Files touched (3)
- scripts/lib/graphsage-predictor.heterophily.test.mjs | 44 ++++++++++++++++++++++++++++++++++++
- scripts/lib/graphsage-predictor.mjs                  | 95 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------------
- 2 files changed, 123 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- till below the 0.78 promotion gate (correctly not-promoted -- that is the honest research reality, separate from this pipeline fix; on the capped 6000-node subgraph heterophily is chance-level, consistent with the known high-variance note). TEST 7/7 new (happy 1/2/3-hop, legacy equal-dim, projected-never-expands, non-multiple-returns-0, adversarial NaN/Inf/zero/negative/shrink) + 45/45 legacy predict

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b1f72793f85c`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._