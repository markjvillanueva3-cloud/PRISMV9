---
id: "bc-026"
title: "Raster Finishing with Angle Optimization"
source: "web:bobcad-raster"
confidence: 89
category: "cam_strategy"
tags: ["raster", "parallel", "cutting-angle", "minimized-retracts"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.464Z
---

# Raster Finishing with Angle Optimization

BobCAD raster (parallel) machining uses parallel passes at a configurable angle. Align the raster direction with the longest dimension to minimize retract moves. Test 2-3 angles and compare cycle times in the toolpath statistics. Use zigzag (bidirectional) for fastest cycle time or unidirectional climb for best finish. V37's minimized retracts feature lowers the retract height between passes to just above stock level rather than to a fixed rapid plane.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-raster
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-028|Raster (Parallel) Finishing with Angle Optimization]]
- [[esprit-cam-tips-esp-016|Raster Finishing with Optimized Cut Direction]]
- [[solidcam-cam-tips-sc-060|HSM Linear Finishing — Optimal Angle for Surface Quality]]
- [[topsolid-cam-tips-ts-029|Parallel Finishing with Optimized Cut Direction]]
- [[worknc-cam-tips-wnc-031|Parallel Finishing with Optimized Cut Angle]]
