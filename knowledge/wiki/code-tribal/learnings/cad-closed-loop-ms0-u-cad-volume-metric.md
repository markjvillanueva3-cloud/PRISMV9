# CAD-CLOSED-LOOP-MS0/U-CAD-VOLUME-METRIC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-VOLUME-METRIC (slot:delta): close compare() defect #1 -- STEP/IGES 'volume' is a bbox PROXY, not solid volume (the blisk 451.5M reading = its bounding box, correctly computed but mislabeled). Add volumeMethod tag (bbox-proxy/mesh/none) + proxy parseWarning; compare() Volume metric is method-aware + ADVISORY on method-mismatch (never false-fails bbox-proxy-vs-mesh). 5 new tests + 33 regression green, 0 tsc errors

**Commit:** `2b27b7acb66d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:27:32-05:00
**Tags:** cad-closed-loop-ms0, u-cad-volume-metric, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-VOLUME-METRIC (slot:delta): close compare() defect #1 -- STEP/IGES 'volume' is a bbox PROXY, not solid volume (the blisk 451.5M reading = its bounding box, correctly computed but mislabeled). Add volumeMethod tag (bbox-proxy/mesh/none) + proxy parseWarning; compare() Volume metric is method-aware + ADVISORY on method-mismatch (never false-fails bbox-proxy-vs-mesh). 5 new tests + 33 regression green, 0 tsc errors

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-VOLUME-METRIC (slot:delta): close compare() defect #1 -- STEP/IGES 'volume' is a bbox PROXY, not solid volume (the blisk 451.5M reading = its bounding box, correctly computed but mislabeled). Add volumeMethod tag (bbox-proxy/mesh/none) + proxy parseWarning; compare() Volume metric is method-aware + ADVISORY on method-mismatch (never false-fails bbox-proxy-vs-mesh). 5 new tests + 33 regression green, 0 tsc errors
```

## Files touched (4)
- mcp-server/src/__tests__/engines/CADGeometryComparisonEngine.volume-method.test.ts | 86 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CADGeometryComparisonEngine.ts                              | 29 +++++++++++++---
- state/shared/specs/CLOSED-LOOP-REPLICATION-METHODOLOGY-2026-06-10.md               |  2 +-
- 3 files changed, 112 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2b27b7acb66d`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._