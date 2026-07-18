# SFC-JM-PROVEN/U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT — [MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT (slot:oscar): divergence reads the store's own cssUnit -- forward-compat with the queued aggregator units-fix

**Commit:** `8d01248f42e9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:20:47-05:00
**Tags:** sfc-jm-proven, u-sfc-jm-proven-divergence-cssunit, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT (slot:oscar): divergence reads the store's own cssUnit -- forward-compat with the queued aggregator units-fix

## Body
```
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT (slot:oscar): divergence reads the store's own cssUnit -- forward-compat with the queued aggregator units-fix

Adds resolveCssUnit(explicitFlag, storeUnit): an explicit --css-unit flag wins, else the
store's OWN `cssUnit` label, else "sfm" (the current unlabeled JM-inch corpus). So the moment
the aggregator source-fix normalizes the store to m/min and stamps cssUnit:"m_min", the
divergence auto-uses m/min (no double-conversion) -- no second edit needed here.

Behavior today is UNCHANGED: the live unlabeled store resolves to "sfm" -> CONSERVATIVE 14
(the units-correct result). Proven both ways: default -> CONSERVATIVE 14; --css-unit m_min ->
the no-convert reading. 13/13 tests (resolveCssUnit covers explicit/store/default + invalid).
Small forward-compat helper on an already-scrutinized file; self-reviewed + full branch coverage.
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 13 ++++++++++++-
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 15 ++++++++++++++-
- 2 files changed, 26 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d01248f42e9`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._