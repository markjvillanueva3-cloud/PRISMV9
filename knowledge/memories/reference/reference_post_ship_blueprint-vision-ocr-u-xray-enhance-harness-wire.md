---
name: reference_post_ship_blueprint-vision-ocr-u-xray-enhance-harness-wire
description: Auto-distilled learnings from shipping BLUEPRINT-VISION-OCR/U-XRAY-ENHANCE-HARNESS-WIRE (commit 28b0e4aca). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.770Z
aliases: reference_post_ship_blueprint-vision-ocr-u-xray-enhance-harness-wire
---


# BLUEPRINT-VISION-OCR/U-XRAY-ENHANCE-HARNESS-WIRE

[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENHANCE-HARNESS-WIRE (slot:xray): wire --enhance (preprocess+deskew) into validate-perfect-parts + GT-validation finding -- 05850 recall is GT-ceiling-bound at 3/7 across 6 runs/4 levers (num_predict 4096/8192, reading-guidance off/on, region-route, enhance ALL leave recall immovable). KEEP num_predict=4096 + reading-guidance opt-in (neither lifts; guidance slightly hurt precision). --enhance is behavior-changing (dims 39->37) but the 4 missing GT dims are program dims with no legible drawing callout on the 2020 scan -- 05850 is a poor recall-lever fixture; real gate is fixture-quality + GT triangulation (P2.7). Default off = byte-identical raster. node --check clean; live A/B validated (flag threads to subprocess, output changes, no crash).

**Shipped:** 2026-06-23T14:51:20-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[blueprint-vision-ocr-u-xray-enhance-harness-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._