# AI-SYSTEMS-GNN/U-GNN-NNEVAL-DEFERRED-FENCE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-DEFERRED-FENCE (slot:india): fence deferred bare-CLI writes too + make the retrain lifecycle the authoritative force:true writer

**Commit:** `e80f585eb8c3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T13:18:44-05:00
**Tags:** ai-systems-gnn, u-gnn-nneval-deferred-fence, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-DEFERRED-FENCE (slot:india): fence deferred bare-CLI writes too + make the retrain lifecycle the authoritative force:true writer

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-DEFERRED-FENCE (slot:india): fence deferred bare-CLI writes too + make the retrain lifecycle the authoritative force:true writer

Closes the residual clobber gap from U-GNN-NNEVAL-MODE-GUARD. A bare
'node nn-graph-eval.mjs' with NO loadable checkpoint produces a {deferred}
result (no embeddingMode), which the model-only guard (=== model) let slip
through to clobber the deployed direct-embed NN-EVAL.json the PSN-leg hook reads.

(1) writeAssessment guard tightened to fence ANY non-direct write
    (embeddingMode !== direct) over an existing direct-mode report unless force.
(2) retrain lifecycle stage 4b now persists with {force:true} -- it is the
    AUTHORITATIVE deployed-state writer, so its direct-embed (or honest
    {deferred} when ghost embeddings will not load) assessment always lands
    over a prior report (R12: never keep a stale deploy-ready claim after the
    deployed path defers). This also makes the writeAssessment doc's 'persists
    WITH force' claim true (closes the prior unit's arm-B P1 doc-drift at the
    design level, not by weakening the doc).

Live-validated: a deferred bare-run is now SUPPRESSED against the real deployed
NN-EVAL.json (embeddingMode=direct preserved). Tests: eval 77/77 (mode-matrix
now 8 transitions incl deferred-over-direct + force-override; R9 mutation-
verified -- reverting to ===model fails transition-7), lifecycle 89/89 (asserts
stage 4b passes {force:true}). 2-arm scrutiny PASS, 0 P0/P1 (2 informational P2
deferred: corrupt-existing fall-through, md/json co-write -- both pre-existing).
```

## Files touched (5)
- scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs |  5 ++++-
- scripts/lib/nn-graph-eval.mjs                         | 16 ++++++++--------
- scripts/lib/nn-graph-eval.test.mjs                    | 23 ++++++++++++++++++++---
- scripts/nn-graph-retrain-lifecycle.mjs                |  6 +++++-
- 4 files changed, 37 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e80f585eb8c3`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._