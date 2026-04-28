---
id: "sc2-009"
title: "TrueMill Air Cut Reduction via Stock Boundary Tracking"
source: "web:surfcam-truemill-aircut"
confidence: 88
category: "cam_strategy"
tags: ["truemill", "air-cut", "cycle-time", "stock-boundary"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.039Z
---

# TrueMill Air Cut Reduction via Stock Boundary Tracking

TrueMill tracks the in-process stock boundary and retracts to rapid height when the tool is not engaged with material. This eliminates the wasted time of conventional offset patterns that continue cutting air in partially cleared regions. For complex pocket shapes, this can reduce cycle time by 20-40% compared to conventional roughing with the same MRR parameters. Enable 'Skip air cuts' and set the minimum air-cut distance threshold to 2mm.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-truemill-aircut
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[gibbscam-cam-tips-gc-008|Open pocket machining requires stock boundary definition for air-cut control]]
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
