---
name: tribal-sc2-119
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["stock-model-rest", "accuracy", "in-process-stock", "regeneration"]
confidence: 90
source: "web:surfcam-stock-model-rest"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-119.md
promoted_at: 2026-05-26T16:07:20.585Z
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
