---
id: "f360-133"
title: "Sub-Spindle Transfer and Back Working"
source: "web:autodesk-forum"
confidence: 0.81
category: "cam_strategy"
tags: ["fusion360", "mill-turn", "sub-spindle", "part-transfer", "back-working"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.732Z
---

# Sub-Spindle Transfer and Back Working

In Fusion Mill-Turn, program the part transfer to the sub-spindle using the Transfer operation. Set the pickup position (Z-axis handoff point), spindle synchronization speed (50-200 RPM), and clamping sequence. After transfer, program Op2 operations on the sub-spindle while the main spindle machines the next part from bar stock. Verify the sub-spindle Z-travel limit covers the entire Op2 toolpath. For critical transfer concentricity, program a light cleanup cut (0.05mm DOC) on the OD at the sub-spindle grip zone to remove any marks from the main spindle collet.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:autodesk-forum
**Operations:** mill_turn

## Related
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
- [[esprit-cam-tips-esp-148|Mill-Turn Spindle Synchronization for Part Transfer]]
- [[sprutcam-cam-tips-spr-047|Back-Working Operations on Sub-Spindle]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
