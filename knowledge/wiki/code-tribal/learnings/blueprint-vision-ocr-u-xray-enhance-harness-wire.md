# BLUEPRINT-VISION-OCR/U-XRAY-ENHANCE-HARNESS-WIRE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENHANCE-HARNESS-WIRE (slot:xray): wire --enhance (preprocess+deskew) into validate-perfect-parts + GT-validation finding -- 05850 recall is GT-ceiling-bound at 3/7 across 6 runs/4 levers (num_predict 4096/8192, reading-guidance off/on, region-route, enhance ALL leave recall immovable). KEEP num_predict=4096 + reading-guidance opt-in (neither lifts; guidance slightly hurt precision). --enhance is behavior-changing (dims 39->37) but the 4 missing GT dims are program dims with no legible drawing callout on the 2020 scan -- 05850 is a poor recall-lever fixture; real gate is fixture-quality + GT triangulation (P2.7). Default off = byte-identical raster. node --check clean; live A/B validated (flag threads to subprocess, output changes, no crash).

**Commit:** `28b0e4aca186` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:51:20-05:00
**Tags:** blueprint-vision-ocr, u-xray-enhance-harness-wire, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENHANCE-HARNESS-WIRE (slot:xray): wire --enhance (preprocess+deskew) into validate-perfect-parts + GT-validation finding -- 05850 recall is GT-ceiling-bound at 3/7 across 6 runs/4 levers (num_predict 4096/8192, reading-guidance off/on, region-route, enhance ALL leave recall immovable). KEEP num_predict=4096 + reading-guidance opt-in (neither lifts; guidance slightly hurt precision). --enhance is behavior-changing (dims 39->37) but the 4 missing GT dims are program dims with no legible drawing callout on the 2020 scan -- 05850 is a poor recall-lever fixture; real gate is fixture-quality + GT triangulation (P2.7). Default off = byte-identical raster. node --check clean; live A/B validated (flag threads to subprocess, output changes, no crash).

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENHANCE-HARNESS-WIRE (slot:xray): wire --enhance (preprocess+deskew) into validate-perfect-parts + GT-validation finding -- 05850 recall is GT-ceiling-bound at 3/7 across 6 runs/4 levers (num_predict 4096/8192, reading-guidance off/on, region-route, enhance ALL leave recall immovable). KEEP num_predict=4096 + reading-guidance opt-in (neither lifts; guidance slightly hurt precision). --enhance is behavior-changing (dims 39->37) but the 4 missing GT dims are program dims with no legible drawing callout on the 2020 scan -- 05850 is a poor recall-lever fixture; real gate is fixture-quality + GT triangulation (P2.7). Default off = byte-identical raster. node --check clean; live A/B validated (flag threads to subprocess, output changes, no crash).
```

## Files touched (4)
- mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts | 41 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ProductEngine.ts                        | 28 ++++++++++++++++------------
- mcp-server/src/physics/constants.ts                            | 17 +++++++++++++++++
- 3 files changed, 74 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 28b0e4aca186`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._