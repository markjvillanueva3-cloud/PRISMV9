---
id: "ec-020"
title: "Rest Machining with Previous Tool Reference"
source: "web:edgecam-milling"
confidence: 89
category: "cam_strategy"
tags: ["rest-machining", "previous-tool", "mold", "multi-stage"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.268Z
---

# Rest Machining with Previous Tool Reference

Edgecam's rest machining calculates remaining material from the previous tool's swept volume and generates targeted passes only where stock remains. Chain multiple rest operations with decreasing tool sizes (e.g., 20mm, 10mm, 6mm, 3mm) for complex mold geometries. Enable minimum area filtering to skip insignificant pockets. For each rest level, Edgecam automatically adjusts feed rates based on the smaller tool's capacity.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-milling
**Operations:** rest_machining

## Related
- [[esprit-cam-tips-esp-017|Rest Machining with Automatic Tool Tracking]]
- [[mastercam-cam-tips-mc-181|Minimum cutter diameter for rest machining determines the smallest accessible feature]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[surfcam-cam-tips-sc2-006|TrueMill Rest Machining Uses In-Process Stock Model]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
