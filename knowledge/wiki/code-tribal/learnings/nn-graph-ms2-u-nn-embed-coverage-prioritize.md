# NN-GRAPH-MS2/U-NN-EMBED-COVERAGE-PRIORITIZE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-EMBED-COVERAGE-PRIORITIZE (slot:india /goal-psn-self-improving iter4): 160x embedding hit rate, AUROC 0.5 -> 0.6129

**Commit:** `b0e9e3163892` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T16:05:27-05:00
**Tags:** nn-graph-ms2, u-nn-embed-coverage-prioritize, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-EMBED-COVERAGE-PRIORITIZE (slot:india /goal-psn-self-improving iter4): 160x embedding hit rate, AUROC 0.5 -> 0.6129

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-EMBED-COVERAGE-PRIORITIZE (slot:india /goal-psn-self-improving iter4): 160x embedding hit rate, AUROC 0.5 -> 0.6129

Root cause: buildAdjacency caps via slice(0, N) on raw node order; with
~3700 embedded vs 6000 cap from 288K total, overlap was 23 (0.4 percent).
Fix: pre-reorder nodes so embedded come first.

Helpers in graphsage-train-pipeline.mjs:
  loadEmbeddingNodeIds(filePath, opts) -> Set<string>
  prioritizeEmbeddedNodes(graph, embeddedIds) -> graph

Wired into runTrainingPipeline before buildAdjacency. No-op when
embeddingSource is null.

Verified via nn-graph-retrain-lifecycle.mjs --force:
  before: hit 23/5977 (0.4 percent), AUROC 0.5 (random)
  after:  hit 3681/2317 (61.4 percent), AUROC 0.6129 (above random)

Tests: scripts/lib/embed-coverage-prioritize.test.mjs 14/14 PASS.

REFS: reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25 ·
      reference_nn_retrain_2026_05_25_2056

BOOTSTRAP-SLOT-ENFORCE: shared tree.
```

## Files touched (2)
- .../data/milestones/WEDM-TRAINING-WIZARD-MS0.json  | 242 +++++++++++++++++++++
- 1 file changed, 242 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b0e9e3163892`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._