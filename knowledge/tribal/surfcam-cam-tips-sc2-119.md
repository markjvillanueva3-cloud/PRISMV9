---
id: "sc2-119"
title: "Stock Model Rest Machining for Maximum Accuracy"
source: "web:surfcam-stock-model-rest"
confidence: 90
category: "cam_strategy"
tags: ["stock-model-rest", "accuracy", "in-process-stock", "regeneration"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.136Z
---

# Stock Model Rest Machining for Maximum Accuracy

SURFCAM stock model rest machining uses the actual computed stock shape from previous operations rather than a theoretical reference-tool boundary. This accounts for lead-in/out moves, linking paths, and any irregularities in the previous toolpath. The resulting rest toolpath is more accurate and avoids the false positive material detection that plagues reference-tool methods. Always regenerate the stock model after modifying any upstream operation.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-stock-model-rest
**Operations:** rest_machining

## Related
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[camworks-cam-tips-cw-078|Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners]]
- [[camworks-cam-tips-cw-097|Spot Drilling — Establish Accurate Hole Location Before Full Drill]]
- [[camworks-cam-tips-cw-110|Tolerance Control — Set Chord Error for Target Surface Quality]]
- [[camworks-cam-tips-cw-189|Cycle Time Estimation Accuracy — Simulation vs Reality Gap]]
