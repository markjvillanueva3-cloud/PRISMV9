---
id: "sc2-029"
title: "3D Rest Machining from Stock Model Reference"
source: "web:surfcam-3axis-rest"
confidence: 90
category: "cam_strategy"
tags: ["rest-machining", "stock-model", "multi-tool", "3d-finishing"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.054Z
---

# 3D Rest Machining from Stock Model Reference

SURFCAM 3D rest machining uses the stock model left by a previous operation to generate toolpaths only where material remains. This is more accurate than the 'reference tool' method because it accounts for actual tool engagement including lead-in/out and linking moves. For multi-tool strategies, chain operations: 50mm face mill → 20mm roughing → 10mm semi-finish → 6mm rest finish. Each operation references the stock model from the previous one.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-3axis-rest
**Operations:** rest_machining, finishing

## Related
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[camworks-cam-tips-cw-026|Rest from VoluMill — Chain Multiple Tool Sizes for Complete Roughing]]
