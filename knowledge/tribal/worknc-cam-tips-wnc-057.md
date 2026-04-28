---
id: "wnc-057"
title: "Stock Model Carries Through Operation Sequence"
source: "web:worknc-stockmodel"
confidence: 91
category: "cam_strategy"
tags: ["stock-model", "dynamic", "operation-sequence", "accuracy"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.665Z
---

# Stock Model Carries Through Operation Sequence

WorkNC maintains a dynamic stock model that updates after each operation, carrying the as-machined state forward. This ensures each subsequent operation sees the actual remaining material rather than the original billet. The stock model is particularly important for rest machining operations that need accurate remaining material information to generate efficient toolpaths.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-stockmodel
**Operations:** general

## Related
- [[surfcam-cam-tips-sc2-065|Stock Model Tracking Across Multiple Operations]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
