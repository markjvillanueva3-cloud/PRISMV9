---
id: "nx-080"
title: "C-Axis Milling on Lathe with Polar Interpolation"
source: "web:siemens-nx-docs"
confidence: 83
category: "cam_strategy"
tags: ["siemens-nx", "c-axis", "polar-interpolation", "mill-turn", "face-milling"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.384Z
---

# C-Axis Milling on Lathe with Polar Interpolation

When programming C-axis milling operations on a lathe in NX, enable Polar Interpolation (G12.1/G112) output in the post processor for face milling operations. NX generates XC-plane toolpaths that the controller converts to C-axis rotation plus X-axis linear motion. Set the interpolation tolerance to 0.005 mm to balance program length against surface accuracy. Always verify that your controller supports polar interpolation before posting — older controllers require XY-to-C conversion in the post instead.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:siemens-nx-docs
**Operations:** milling, mill-turn

## Related
- [[fusion360-cam-tips-f360-028|XZC Polar Mode for Off-Center Mill-Turn Features]]
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[nx-cam-tips-ext-nx-081|Multi-Spindle Multi-Turret Channel Assignment]]
- [[nx-cam-tips-ext-nx-082|Mill-Turn Synchronization with Wait Codes]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
