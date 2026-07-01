# CAD-FUSION-LIVE-MS0/U-CAD-TRAIN — train CAD-drawing models — 11762-file similarity index + full STEP geometry mine

**Commit:** `96bba5e337ee` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:57:31-05:00
**Tags:** cad-fusion-live-ms0, u-cad-train, auto-distilled

## Subject
[CAD-FUSION-LIVE-MS0]/U-CAD-TRAIN: train CAD-drawing models — 11762-file similarity index + full STEP geometry mine

## Body
```
[CAD-FUSION-LIVE-MS0]/U-CAD-TRAIN: train CAD-drawing models — 11762-file similarity index + full STEP geometry mine

- cad_training_start over H:/prism/JM DIE: 11,762 CAD files -> VP-tree
  path/filename embedding index, validation passed (avg sim 0.544).
- mine-step-geometry-evidence.ts: MAX_FILES_PER_CLASS now env-overridable
  (PRISM_STEP_MINE_CAP) so a full corpus mine is possible per the goal
  "utilize all files available". Full mine: 662/665 STEP files parsed
  (99.5%), real per-class B-rep feature prevalences.
- Geometry confirms hand-tuned CADClassFeatureLibrary templates
  (die central_oil_hole: hand-tuned 0.9 vs geometry-measured 0.947).
- Fusion cloud unreachable (needs Autodesk Forge OAuth); pivoted to the
  Inventor/SolidWorks/STEP corpus — transferable at the B-rep level.
- Honest gap: geometry report not auto-blended into live build-sequence
  inference; .ipt/.sldprt binary -> geometry mine caps at ~665 STEP files.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../wiki/architecture/cad-fusion-training-ms0.md   | 61 +++++++++++++++++
- .../state/cad-corpus-step-geometry-report.json     | 80 +++++++++++-----------
- mcp-server/scripts/mine-step-geometry-evidence.ts  |  2 +-
- 3 files changed, 101 insertions(+), 42 deletions(-)

## Lessons surfaced in commit body
- tilize all files available". Full mine: 662/665 STEP files parsed

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96bba5e337ee`
- Milestone envelope: `mcp-server/data/milestones/CAD-FUSION-LIVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._