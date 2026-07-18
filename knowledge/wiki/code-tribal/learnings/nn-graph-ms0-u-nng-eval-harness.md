# NN-GRAPH-MS0/U-NNG-EVAL-HARNESS — [MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HARNESS: U7 — GNN tier-5 assessment harness

**Commit:** `e7db71cbc974` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T14:20:50-05:00
**Tags:** nn-graph-ms0, u-nng-eval-harness, auto-distilled

## Subject
[MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HARNESS: U7 — GNN tier-5 assessment harness

## Body
```
[MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HARNESS: U7 — GNN tier-5 assessment harness

scripts/lib/nn-graph-eval.mjs assesses the U6 GNN classifier against the
milestone exit gates (AUROC>=0.78, macro-F1>=0.55, Brier<=0.15). Pure metric
functions (Mann-Whitney AUROC with average-rank ties, macro-F1, Brier,
per-bucket calibration) are reference-value tested; a seeded leave-out holdout
over the cascade's high-confidence labels feeds the U6 classifier and scores
predicted-vs-recorded dispatcher. Honest framing throughout: the metric is
internal-consistency vs the keyword/sibling tiers, NOT verified ground truth,
and the report states so. gradeMetrics yields shipped-research-only when a gate
misses. 46/46 node:test green; per-file 2-reviewer scrutiny PASS on both files.
First run emits NN-EVAL.{md,json} = DEFERRED (no trained checkpoint yet —
producing one is a U4-pipeline run, not harness work).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- scripts/lib/nn-graph-eval.mjs      | 449 +++++++++++++++++++++++++++++++++++++
- scripts/lib/nn-graph-eval.test.mjs | 404 +++++++++++++++++++++++++++++++++
- state/shared/nn-graph/NN-EVAL.json |   5 +
- state/shared/nn-graph/NN-EVAL.md   |   8 +
- 4 files changed, 866 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7db71cbc974`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._