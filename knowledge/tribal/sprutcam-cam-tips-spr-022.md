---
id: "spr-022"
title: "Stock Modeling and IPW Tracking"
source: "web:sprutcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["ipw", "stock-model", "rest-machining", "tracking"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.863Z
---

# Stock Modeling and IPW Tracking

SprutCAM's In-Process Workpiece (IPW) tracks actual stock shape through each operation. Enable 'Use Previous IPW' for sequential operations to avoid re-cutting air. For rest machining, the IPW difference between current stock and target geometry defines the remaining material. Export IPW as STL for verification in external tools. The IPW accuracy depends on simulation resolution — set to 0.05mm for finishing.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** roughing, finishing

## Related
- [[gibbscam-cam-tips-gc-018|Rest machining with IPW tracks remaining stock for targeted cleanup]]
- [[hypermill-cam-tips-ext-hm-144|Progressive Rest Machining]]
- [[sprutcam-cam-tips-spr-124|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
