---
id: "sc2-018"
title: "Step Milling for Multi-Level Flat Features"
source: "web:surfcam-step-milling"
confidence: 86
category: "cam_strategy"
tags: ["step-milling", "multi-level", "flat-features", "depth-ordering"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.046Z
---

# Step Milling for Multi-Level Flat Features

SURFCAM step milling handles multi-level flat features (steps, ledges, shelves) with automatic depth ordering. Program from the shallowest to deepest level to maintain maximum stock support. Use a flat-bottom end mill sized to the narrowest step width. Set 0.05mm stock allowance per wall for a finish profile pass. Enable 'Machine flats at each level' to combine facing and profiling into a single operation per Z-level.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:surfcam-step-milling
**Operations:** 2.5d_milling, profiling

## Related
- [[catia-cam-tips-cat-010|Multi-Level Pocket Depth Ordering for Chip Evacuation]]
- [[bobcad-cam-tips-bc-004|Multi-Level Adaptive Roughing with Automatic Step-Down]]
- [[bobcad-cam-tips-bc-018|Step Milling for Multi-Level Features with Step Reduction]]
- [[bobcad-cam-tips-bc-020|Island Machining with Automatic Detection and Multi-Level]]
- [[camworks-cam-tips-cw-007|Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection]]
