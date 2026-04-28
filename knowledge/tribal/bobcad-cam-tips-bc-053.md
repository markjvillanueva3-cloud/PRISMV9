---
id: "bc-053"
title: "C-Axis Milling on Turning Centers"
source: "web:bobcad-c-axis"
confidence: 89
category: "cam_strategy"
tags: ["c-axis", "mill-turn", "angular-milling", "keyway", "hex"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.498Z
---

# C-Axis Milling on Turning Centers

BobCAD Mill-Turn C-axis milling locks the spindle at programmable angular positions for milling operations on the part OD, ID, or face. Use for flats, keyways, cross-holes, and hex features. Program the C-axis angle in the work plane definition. Set the C-axis lock tolerance to 0.01° for precision features. For multiple features at different angular positions, minimize C-axis rotations by grouping features at similar angles. BobCAD's CAM Tree organizes operations by axis mode.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-c-axis
**Operations:** mill_turn, milling

## Related
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-150|BobCAD Mill-Turn Eccentric Turning with C-Axis Interpolation]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[esprit-cam-tips-esp-151|Mill-Turn Canned Cycle Optimization for Holes]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
