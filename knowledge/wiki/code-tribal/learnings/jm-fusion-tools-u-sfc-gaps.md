# JM-FUSION-TOOLS/U-SFC-GAPS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS]/U-SFC-GAPS (slot:romeo): fill 20 SFC cutting-data gaps + restore H-drilling at SAFE speed

**Commit:** `35f4d9f97109` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T22:00:54-05:00
**Tags:** jm-fusion-tools, u-sfc-gaps, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS]/U-SFC-GAPS (slot:romeo): fill 20 SFC cutting-data gaps + restore H-drilling at SAFE speed

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS]/U-SFC-GAPS (slot:romeo): fill 20 SFC cutting-data gaps + restore H-drilling at SAFE speed

SFC (UltimateSpeedFeedEngine, oscar domain -- additive, physics-reviewed, fills nulls only):
adds 20 CUTTING_PARAMS combos that previously SILENTLY FELL BACK to a wrong ISO group --
drilling K/H, milling_semi K, tapping M/K/N/S/H, reaming all 6, thread_milling all 6.
The headline fix: H_drilling 8/11/15 m/min replaces the P-group fallback (105 m/min = 344
SFM, ~10x too fast, tool-breaking for HRC55+). Values from research workflow wr0fg62h4
(Machinerys Handbook 31 / Sandvik / Kennametal), adversarially physics-verified, then
independently re-reviewed (physics-review-agent PASS, code-reviewer PASS).

Generator: removed the Phase-2 interim H-drilling/reaming guard (no longer needed -- the
SFC now has safe H data). H-compatible drills get their H preset back at 36 SFM (not 344).

Verified: 13/13 new keys resolve via lookupCuttingData to the verified balanced Vc;
H_drilling=11 m/min; K_milling_semi correctly between K rough/finish; additive-only (0
existing entries changed); 218 tools -> 2436 rows; consolidated contiguous 1..218.

Foundation for the all-conditions generator expansion (tool x grade x op x cut_type x
strategy) -- spec FUSION-ALL-CONDITIONS-MATRIX-PLAN-2026-06-11.md. Tool-type condition
matrix designed by the same workflow. cc oscar: SFC gained tapping/reaming/thread_milling
coverage.
```

## Files touched (19)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts                                                               |   5 -
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts                                                                     |  34 +++
- .../material-group-libraries/130 DEG. INSERT DRILLS - PURPLE COATING (CHANGE SFM TO 75 FOR GOLD)-6groups.csv          | 255 ++++++++++++---------
- state/shared/jm-fusion-tools/material-group-libraries/180 DEG. INSERT DRILLS (FLAT)-6groups.csv                       | 255 ++++++++++++---------
- state/shared/jm-fusion-tools/material-group-libraries/JM-CRIB-ALL-families.csv                                        | 736 +++++++++++++++++++++++++++++++++++--------------------------
- state/shared/jm-fusion-tools/material-group-libraries/README.md                                                       |   6 +-
- state/shared/jm-fusion-tools/material-group-libraries/TWIST DRILLS-6groups.csv                                        | 226 ++++++++++---------
- state/shared/jm-fusion-tools/material-group-libraries/by-group/JM-CRIB-H.csv                                          | 116 ++++++++++
- state/shared/jm-fusion-tools/material-group-libraries/by-group/JM-CRIB-K.csv                                          | 620 +++++++++++++++++++++++++--------------------------
- state/shared/jm-fusion-tools/material-group-libraries/by-type-brand/H/center-drill/unspecified.csv                    |   2 +-
_(+9 more)_

## Lessons surfaced in commit body
- wrong ISO group --

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35f4d9f97109`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._