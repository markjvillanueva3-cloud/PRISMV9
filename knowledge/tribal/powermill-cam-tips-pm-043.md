---
id: "pm-043"
title: "Rest Machining with Multiple Reference Tools"
source: "web:powermill-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["rest-machining", "reference-tools", "remaining-stock", "ribs"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.560Z
---

# Rest Machining with Multiple Reference Tools

PowerMill's rest machining detects material remaining from previous operations by referencing multiple tool shapes. Add ALL previous tools to the 'Reference Tool Set' — not just the most recent. The system computes the true remaining stock from the combined swept volume of all reference tools. Critical for mold cavities with deep ribs where progressively smaller tools are needed.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-009|Rest Machining with Multiple Reference Tools]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
