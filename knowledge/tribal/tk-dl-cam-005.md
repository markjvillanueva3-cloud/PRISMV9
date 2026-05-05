---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-005
title: SWARF machining: line contact = fewer passes + better surface
category: strategy
domain: document_learned
knowledge_type: anti_pattern
confidence: 88
source: document:inventorcam-swarf@intro
created_at: 2026-03-03
usage_count: 0
tags: ["swarf", "5-axis", "line-contact", "surface-quality", "aerospace", "operation:finishing", "operation:5_axis"]
material_groups: []
operation_types: ["finishing", "5_axis"]
content_hash: f920d6ed530b0df8bb855e33f810fb8b02855530751fb488acbe2cffaa3f1d7b
mirror_ts: 2026-05-05T13:36:02.142Z
mirror_engine: TribalVaultPopulatorEngine
---

# SWARF machining: line contact = fewer passes + better surface

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:inventorcam-swarf@intro`

## Tip

SWARF (Side Wall And Ruled Finish) uses the tool's side for line contact with steep surfaces instead of point contact. This produces better surface quality with fewer passes compared to ball-nose finishing. SWARF requires: (1) ruled/near-ruled surfaces, (2) 5-axis simultaneous capability, (3) careful tilt angle management to avoid gouging. Best for aerospace structural ribs and blade surfaces.

## Applies to

- Operation types: `finishing`, `5_axis`

## Related tips

- [[tk-dl-swarf-001|SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing]] _(category+op:2+tag:5)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:2+tag:4)_
- [[tk-dl-solidcam-003|Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter]] _(category+op:2+tag:3)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:3)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:2+tag:2)_

## Tags

#swarf #5-axis #line-contact #surface-quality #aerospace #operation-finishing #operation-5_axis
