# NN-GRAPH-MS0/U-NNG-EVAL-HONESTY — [MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HONESTY: eval-harness honesty fix + reproducible U4 checkpoint

**Commit:** `51b4c66bfb92` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T17:00:41-05:00
**Tags:** nn-graph-ms0, u-nng-eval-honesty, auto-distilled

## Subject
[MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HONESTY: eval-harness honesty fix + reproducible U4 checkpoint

## Body
```
[MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HONESTY: eval-harness honesty fix + reproducible U4 checkpoint

nn-graph-eval.mjs deferred-report writer printed the no-checkpoint prose for
EVERY deferred reason -- false once a checkpoint loads but the graph has 0
reference ghosts. runAssessment now plumbs checkpointPresent/poolSize/best-
effort checkpointMeta; renderReport branches no-checkpoint vs data-blocked
insufficient-reference-pool; strong trained/U4-resolved prose gated on
embedded checkpointMeta (P1 overclaim from reviewer B, fixed). +2 fail-on-
revert tests, 48/48 node:test, 2-reviewer per-file gate PASS.

U4 checkpoint (152KB) trained + committed (was untracked) so the deferred
state is reproducible in-tree; NN-EVAL.{md,json} regenerated honest. Deploy
gate still DEFERRED -- blocker moved code-side -> data-side (poolSize 0 < 2).
AUROC=0.096 is the known heterophily anti-correlation (already triply-
confirmed). Deploy progress needs a NEW unit, not more MS0 work.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (8)
- CLAUDE.md                                       |    4 +-
- knowledge/wiki/architecture/nn-graph-ms0.md     |   31 +
- scripts/lib/nn-graph-eval.mjs                   |   69 +-
- scripts/lib/nn-graph-eval.test.mjs              |   43 +
- state/shared/nn-graph/NN-EVAL.json              |   26 +-
- state/shared/nn-graph/NN-EVAL.md                |   30 +-
- state/shared/nn-graph/graphsage-checkpoint.json | 5199 +++++++++++++++++++++++
- 7 files changed, 5390 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- till DEFERRED -- blocker moved code-side -> data-side (poolSize 0 < 2).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51b4c66bfb92`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._