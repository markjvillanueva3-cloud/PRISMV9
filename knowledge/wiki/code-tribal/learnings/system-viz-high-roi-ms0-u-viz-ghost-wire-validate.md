# SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-GHOST-WIRE-VALIDATE — [MAIN] [SYSTEM-VIZ-HIGH-ROI-MS0]/U-VIZ-GHOST-WIRE-VALIDATE (slot:sierra): ghost-wire validation feedback loop

**Commit:** `a9181cade4fa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T11:43:25-05:00
**Tags:** system-viz-high-roi-ms0, u-viz-ghost-wire-validate, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-HIGH-ROI-MS0]/U-VIZ-GHOST-WIRE-VALIDATE (slot:sierra): ghost-wire validation feedback loop

## Body
```
[MAIN] [SYSTEM-VIZ-HIGH-ROI-MS0]/U-VIZ-GHOST-WIRE-VALIDATE (slot:sierra): ghost-wire validation feedback loop

Scans every ghost.unwired-engine node in system-graph.json and classifies
each against its proposed dispatcher file:

  confirmed: engine name appears as a word-boundary token in the dispatcher
  refuted:   not found AND proposed_at > 30 days ago
  pending:   not found AND proposed_at <= 30 days ago

Outputs labeled JSONL (state/shared/ghost-wire-outcomes.jsonl) for NN-GRAPH
MS0 AUROC=0.096 retrain, plus a system-viz overlay
(state/shared/system-viz/ghost-wire-validation-augmentation.json) painting
ghost nodes confirmed=green / refuted=red / pending=amber.

Pure injectable validate({graph, dispatcherIndex, dispatcherReader, now,
refutedAfterDays}) with 11/11 node:test PASS — covers 3 failure modes
(non-object graph throws, malformed engine name, unresolvable dispatcher)
and 3 adversarial cases (word-boundary MillEngine != WindMillEngine,
clock-skew future proposed_at clamped daysOpen=0, REFUTED_AFTER_DAYS
boundary 29d->pending vs 31d->refuted).

Wired through merge-augmentations.mjs (3 sites: loadOptional + version-stamp
+ overlay merge block matching wiringOverlay convention) and regen-viz.mjs
FAST[]. First live run: 636 ghosts scanned, 3 confirmed, 633 pending,
130 dispatcher-unresolvable.

Spec: state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT*.md G3
```

## Files touched (2)
- scripts/merge-augmentations.mjs | 6 ++----
- 1 file changed, 2 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a9181cade4fa`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HIGH-ROI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._