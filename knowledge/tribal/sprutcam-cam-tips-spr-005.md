---
id: "spr-005"
title: "Mill-Turn Synchronization for Sub-Spindle Transfer"
source: "web:sprutcam-tutorials"
confidence: 0.86
category: "cam_strategy"
tags: ["mill-turn", "sub-spindle", "transfer", "synchronization"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.850Z
---

# Mill-Turn Synchronization for Sub-Spindle Transfer

Program sub-spindle part transfer in SprutCAM's Mill-Turn module: (1) define the transfer point with matching spindle speeds, (2) program gripper close → main spindle open → retract sequence, (3) set synchronization wait codes. The 'Synchronization Timeline' view shows both spindles/turrets simultaneously — use it to optimize overlap and minimize idle time during transfers.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
- [[topsolid-cam-tips-ts-050|Sub-Spindle Transfer with Automatic Stock Update]]
- [[bobcad-cam-tips-bc-056|Sub-Spindle Transfer for Complete Part Machining]]
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
