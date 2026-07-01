# JM-FUSION-TOOLS-MS0/U-JFT-MATGROUP-CRIB — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-CRIB (slot:romeo): per-material-group Fusion tool libraries from JM real crib

**Commit:** `a66bc813ba0c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T09:47:00-05:00
**Tags:** jm-fusion-tools-ms0, u-jft-matgroup-crib, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-CRIB (slot:romeo): per-material-group Fusion tool libraries from JM real crib

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-CRIB (slot:romeo): per-material-group Fusion tool libraries from JM real crib

Augments JM Die's 7 real Fusion CSV exports (218 production tools — REGO-FIX
Capto C6 / BIG DAISHOWA ER-32 / ISCAR / Techniks holders) with 6 per-ISO
material-group preset rows each (P/M/K/N/S/H; 1526 rows). Cutting columns per
group from ultimateSpeedFeedEngine.lookupCuttingData; geometry + holder
collision-segments VERBATIM (zero 25.4x scale risk). Op-class aware. 7 augmented
CSVs + 6 by-group libs + batch sheet + JM material->ISO categorization + README,
in proven CSV_TOOLS_VERSION_1. 2-reviewer PASS; P1 uniform-172-col fix.
```

## Files touched (19)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts          | 416 +++++++++++++++++++++++++++++
- ...ILLS - PURPLE COATING (CHANGE SFM TO 75 FOR GOLD)-6groups.csv | 358 +++++++++++++++++++++++++
- .../180 DEG. INSERT DRILLS (FLAT)-6groups.csv                    | 358 +++++++++++++++++++++++++
- .../BORING  BARS - FINISHING-6groups.csv                         |  99 +++++++
- .../material-group-libraries/BORING BARS - ROUGHING-6groups.csv  |  99 +++++++
- .../material-group-libraries/END MILLS FOR MACHINE 4-6groups.csv |  36 +++
- .../material-group-libraries/JM-MATERIAL-CATEGORIZATION.md       |  19 ++
- .../material-group-libraries/JM-MATERIAL-GROUP-BATCHES.md        |  87 ++++++
- state/shared/jm-fusion-tools/material-group-libraries/README.md  |  37 +++
- .../material-group-libraries/TURNING TOOLS-6groups.csv           | 211 +++++++++++++++
_(+9 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a66bc813ba0c`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._