---
id: "bc-008"
title: "Air Cut Avoidance in Adaptive Roughing"
source: "web:bobcad-air-cut"
confidence: 89
category: "cam_strategy"
tags: ["air-cut", "avoid-air-machining", "stock-aware", "cycle-time"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.449Z
---

# Air Cut Avoidance in Adaptive Roughing

BobCAD's 'Avoid Air Machining' option terminates the toolpath as soon as the stock is cleared from a region, accounting for the tool diameter. This eliminates the wasted passes that occur when conventional offset patterns continue beyond the stock boundary. For complex pocket shapes and near-net stock, this can reduce cycle time by 20-40%. Enable in all Adaptive Roughing operations. Set minimum engagement threshold to 5% of tool diameter to trigger the skip.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-air-cut
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[mastercam-cam-tips-mc-210|Air cut minimization uses stock-aware linking to skip regions with no material]]
- [[surfcam-cam-tips-sc2-009|TrueMill Air Cut Reduction via Stock Boundary Tracking]]
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
