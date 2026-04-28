---
id: "bc-146"
title: "BobCAD Mill-Turn C-Axis Milling for Off-Center Features"
source: "web:bobcad-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["mill-turn", "c-axis", "live-tooling", "keyway", "off-center"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.571Z
---

# BobCAD Mill-Turn C-Axis Milling for Off-Center Features

BobCAD programs C-axis milling operations on mill-turn machines for off-center features like flats, slots, and keyways. Lock the spindle in C-axis mode (M19 or equivalent), then program the milling operation using XYZ + C coordinates. For features at a specific angular position, set the C-axis angle before starting the milling cycle. BobCAD's post processor handles the transition from turning (spindle rotating) to milling (spindle locked, live tool rotating). Use climb milling for better finish on hardened shafts. Set the live tool RPM based on the milling tool diameter, not the part diameter.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** milling, turning

## Related
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-150|BobCAD Mill-Turn Eccentric Turning with C-Axis Interpolation]]
- [[camworks-cam-tips-cw-071|C-Axis Milling on Lathe — Off-Center Features with Live Tooling]]
- [[fusion360-cam-tips-ext-f360-078|Live Tooling Coordinate System and Speed Limits]]
- [[solidcam-cam-tips-sc-084|Mill-Turn Live Tooling — RPM vs. CSS Decision for Milling on Lathe]]
