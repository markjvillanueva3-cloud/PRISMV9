# CATALOG-APP-WIRING-MS0/U-HMT-CUTTING-DATA — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HMT-CUTTING-DATA (slot:romeo): wire per-tool SFC cutting-data ceiling into hyperMILL .hmt NCTools + fix live coatingMult tin-shadow

**Commit:** `592133f902d1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:34:44-05:00
**Tags:** catalog-app-wiring-ms0, u-hmt-cutting-data, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HMT-CUTTING-DATA (slot:romeo): wire per-tool SFC cutting-data ceiling into hyperMILL .hmt NCTools + fix live coatingMult tin-shadow

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HMT-CUTTING-DATA (slot:romeo): wire per-tool SFC cutting-data ceiling into hyperMILL .hmt NCTools + fix live coatingMult tin-shadow

GAP B4: NCTools.max_spindle_speed/max_feedrate defaulted to 0.0 -- per-tool cutting data
was unpopulated, so the Materials per-category Vc/fz factors scaled 0->0 (the whole
per-material preset system was inert). computeToolCuttingCeiling() now derives the
per-assembled-tool ceiling from ultimateSpeedFeedEngine.lookupCuttingData (Vc/fz at ISO-N,
the tool's fastest legit application) derated by materialMult(substrate)+coatingMult(coating)
-- the two helpers that were defined-but-dead before this unit. rpm=Vc*1000/(pi*D);
feed=rpm*fz*flutes (drilling: fz is feed-per-rev). Fail-soft: non-rotating/probe/turning,
non-finite/<=0 diameter, null lookup, non-finite Vc all -> 0 (never NaN/Infinity in the .hmt).

Bug fixed (now-live coatingMult): "altin".includes("tin")===true mis-scored AlTiN as TiN
(1.10 vs 1.30) due to Object.keys order -> longest-key-first disambiguation. TiAlN (1.25) unchanged.

Round-trip via prism_cam:hypermill_tool_export. 15/15 (6 new cutting-data invariants: rpm>0,
rpm~1/D, HSS 0.40 derate, AlTiN 1.30 not shadowed, non-rotating=0, zero-D fail-soft); sibling
jm-hypermill-export 15/15 unaffected. Per-file 2-arm scrutiny PASS (revert-proven).
```

## Files touched (3)
- mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts |  93 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/engines/HyperMillToolExportEngine.ts       | 123 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------
- 2 files changed, 208 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 592133f902d1`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._