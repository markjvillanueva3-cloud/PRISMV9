# SYSTEM-VIZ-G4/U-VIZ-G4-DEAD-EDGE-CLASSIFY — [MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-CLASSIFY: classify dead edges advisory vs defect (6128 residue -> 3710 advisory + 2418 defect)

**Commit:** `639ce198c74f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T02:07:56-05:00
**Tags:** system-viz-g4, u-viz-g4-dead-edge-classify, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-CLASSIFY: classify dead edges advisory vs defect (6128 residue -> 3710 advisory + 2418 defect)

## Body
```
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-CLASSIFY: classify dead edges advisory vs defect (6128 residue -> 3710 advisory + 2418 defect)

After the canon fix the residual dead edges were an unactionable lump. detectDeadPixels now buckets each dead edge by edge type + classifies advisory (intentional gap-surfacing bridges: bridge-to-engine/enriches-engine/feeds-training/ghost-wire to not-yet-built nodes) vs DEFECT (structural edges that should connect real nodes). Live: 3710 advisory (mostly pdf-course-bridge engine bridges) + 2418 defect (invokes 775, wire_target 541, bridge_to_existing 245, engine_import 198...) -> the 2418 are the real triage target (a follow-up; bridge_to_existing especially suspect). ADVISORY_EDGE_TYPES frozen set + classifyDeadEdgeType pure fn; additive (existing 20 tests unchanged) + 5 new tests = 25/25. Report regenerated showing 15671->6128 (-61%).
```

## Files touched (5)
- scripts/lib/system-viz-dead-pixel-detector.mjs      |   42 ++
- scripts/lib/system-viz-dead-pixel-detector.test.mjs |   79 +++
- state/shared/system-viz-dead-pixels-2026-05-31.json | 3815 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/system-viz-dead-pixels-2026-05-31.md   |  126 +++--
- 4 files changed, 4010 insertions(+), 52 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 639ce198c74f`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-G4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._