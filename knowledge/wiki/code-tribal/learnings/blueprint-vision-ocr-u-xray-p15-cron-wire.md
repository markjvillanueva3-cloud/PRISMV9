# BLUEPRINT-VISION-OCR/U-XRAY-P15-CRON-WIRE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-CRON-WIRE (slot:xray): wire opt-in --region-route into the live OCR training cron -- the last P1.5 consumer (R15 wire-to-all)

**Commit:** `f93c14d6b15d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:21:36-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-cron-wire, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-CRON-WIRE (slot:xray): wire opt-in --region-route into the live OCR training cron -- the last P1.5 consumer (R15 wire-to-all)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-CRON-WIRE (slot:xray): wire opt-in --region-route into the live OCR training cron -- the last P1.5 consumer (R15 wire-to-all)

blueprint-ocr-training-loop.mjs per-page loop now resolves the page fused from
EITHER the full-page ensemble (default, byte-identical when --region-route is
off) OR the P1.5 region-routing union (extractWithRegionRouting). The hybrid
fused (region-recovered dims + full-page non-dim labels + synthesized summary
from U-XRAY-P15-DENSE-RESCUE-TRAINABLE) flows uniformly into buildTrainsetRow +
classifyActiveLearning + the AL-queue summary. Region mode forces units onto the
title-block-stripped crops (floor stays unforced unless --force-units, parity
with the non-region pageForceUnit path); no per-page printUnit anchor in region
mode. Page ok = floor OCR'd OR a region rescued it. Non-region path preserved
EXACTLY (the models_ok===0 continue still fires before printUnit detection).

VALIDATED live: node ... --region-route --real-png extrude_punch.png
--out-dir <fresh> --calibrate-count 0 ran the region branch end-to-end (no
crash, all 3 phases), produced 12 labels via the hybrid fused + 1 AL-queue row
+ a valid report. (0 trainable = the --calibrate-count 0 uncalibrated-tier
artifact, not a routing failure.) node --check passes. Completes R15
wire-to-all-consumers for the P1.5 arc: validate-perfect-parts + the cron both
now consume region routing; opt-in default-off leaves the running cron
unchanged.
```

## Files touched (2)
- scripts/blueprint-ocr-training-loop.mjs | 55 ++++++++++++++++++++++++---------
- 1 file changed, 40 insertions(+), 15 deletions(-)

## Lessons surfaced in commit body
- till fires before printUnit detection).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f93c14d6b15d`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._