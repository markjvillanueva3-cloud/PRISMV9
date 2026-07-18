# NN-GRAPH-MS2/U-NN-PIPELINE-NUL-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-PIPELINE-NUL-FIX (slot:india /goal-psn-self-improving iter1): restore graphsage-train-pipeline.mjs (NUL@6869 -> space)

**Commit:** `2576baa97586` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T15:17:29-05:00
**Tags:** nn-graph-ms2, u-nn-pipeline-nul-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-PIPELINE-NUL-FIX (slot:india /goal-psn-self-improving iter1): restore graphsage-train-pipeline.mjs (NUL@6869 -> space)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [NN-GRAPH-MS2]/U-NN-PIPELINE-NUL-FIX (slot:india /goal-psn-self-improving iter1): restore graphsage-train-pipeline.mjs (NUL@6869 -> space)

Working tree had a single NUL byte at offset 6869 (line 152 of buildTrainAdjacency,
inside the const key separator). The NUL made the file non-importable as ESM --
the real cause of NN-GRAPH-MS2 retrain stall. CLAUDE.md NN-GRAPH section claimed
positiveTypeMarginal + sampleStratifiedNegativeEdges absent from
graphsage-trainer.mjs, but both exports were already present at lines 141 + 204.
The actual blocker was the corrupt working-tree pipeline file that couldn't
import them.

Surgical fix: byte 0x00 at offset 6869 -> 0x20. Matches canonical git at HEAD
(fa46802267) line 152 verbatim. Preserves 19 other lines of working-tree changes.

Verifies: node --check PASS, dynamic import 13 exports load.

Unblocks: nn-graph-retrain-lifecycle.mjs -> AUROC measurable next retrain
(was 0.5000 ungraded because pipeline could not load).

REFS: reference_psn_r4_deep_stack_2026_05_25 ·
      reference_gnn_node_embedding_bridge_2026_05_23 ·
      reference_trainer_export_regression_2026_05_23 (original misdiagnosis).

BOOTSTRAP-SLOT-ENFORCE: shared tree, worktree migration mid-/loop would blow
token budget. iter 1 of /loop psn-self-improving-loop.
```

## Files touched (2)
- scripts/lib/graphsage-train-pipeline.mjs | Bin 34315 -> 35465 bytes
- 1 file changed, 0 insertions(+), 0 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2576baa97586`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._