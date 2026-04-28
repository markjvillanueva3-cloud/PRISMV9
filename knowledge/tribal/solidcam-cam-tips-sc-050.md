---
id: "sc-050"
title: "iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy"
source: "web:solidcam-docs"
confidence: 90
category: "cam_strategy"
tags: ["solidcam", "imachining-3d", "rest-machining", "stock-model", "irest"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.702Z
---

# iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy

In iMachining 3D rest roughing (iRest), always reference the exact previous tool used rather than specifying a generic larger tool diameter. SolidCAM computes the remaining stock model from the actual previous toolpath, accounting for tool geometry, holder interference, and corner radii. Using a generic diameter reference can leave 0.5-2mm of unexpected material on vertical walls where the previous tool's corner radius prevented full engagement.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** 3d_roughing, rest_roughing

## Related
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-174-2|Pencil Tracing for Corner Cleanup]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
