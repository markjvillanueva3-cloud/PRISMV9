---
id: "sc2-065"
title: "Stock Model Tracking Across Multiple Operations"
source: "web:surfcam-stock-model"
confidence: 89
category: "setup"
tags: ["stock-model", "in-process", "operation-sequence", "rest-machining"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.081Z
---

# Stock Model Tracking Across Multiple Operations

SURFCAM maintains an in-process stock model that updates after each operation, carrying the stock shape forward to the next operation. This is essential for rest machining accuracy and collision detection with partially-machined parts. Always sequence operations in the correct order in the operation list. If you reorder or delete an operation, regenerate the stock model from that point forward to ensure accuracy.

**Category:** setup
**Confidence:** 89
**Source:** web:surfcam-stock-model
**Operations:** verification, setup

## Related
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[surfcam-cam-tips-sc2-132|SURFCAM 2023 Stock Model Carries Accurate In-Process Geometry]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
