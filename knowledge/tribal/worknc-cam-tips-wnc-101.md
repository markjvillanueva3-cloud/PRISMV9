---
id: "wnc-101"
title: "Air Cut Reduction Eliminates Empty Passes"
source: "web:worknc-aircut"
confidence: 91
category: "cam_strategy"
tags: ["air-cut", "empty-passes", "stock-model", "efficiency"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.700Z
---

# Air Cut Reduction Eliminates Empty Passes

WorkNC's air cut detection identifies toolpath segments where the tool is not engaged with material and removes them or converts to rapid moves. Enable 'Skip empty passes' to eliminate passes cutting only air. For rest machining on near-net-shape stock, this can eliminate 40-60% of total toolpath length. The detection uses the dynamic stock model for accurate empty-pass identification.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-aircut
**Operations:** roughing, rest_machining

## Related
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[gibbscam-cam-tips-gc-029|VoluMill air-cut elimination uses stock model to skip empty regions]]
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
- [[topsolid-cam-tips-ts-105|Air Cut Reduction Skips Empty Passes]]
- [[cimatron-cam-tips-cim-037|IPW Transfer Between NC Setups]]
