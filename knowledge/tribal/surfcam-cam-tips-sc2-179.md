---
id: "sc2-179"
title: "SURFCAM Rest Machining for Hardened Material Electrode Cavities"
source: "web:surfcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["rest-machining", "hardened-steel", "electrode", "die-cavity", "tool-progression"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.189Z
---

# SURFCAM Rest Machining for Hardened Material Electrode Cavities

When machining electrode cavities in hardened die steel, SURFCAM's rest machining identifies material remaining from the roughing tool and generates toolpaths only where the smaller finishing tool can access. This prevents air cutting and re-cutting of already-machined surfaces. For hardened materials, minimize re-cutting because each pass generates heat that tempers the surface. Use 3-4 tool progressions: 16mm rough, 8mm semi-finish, 4mm finish, 2mm detail. Each rest operation references the previous tool's stock model.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** finishing, roughing

## Related
- [[mastercam-cam-tips-mc-181|Minimum cutter diameter for rest machining determines the smallest accessible feature]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
