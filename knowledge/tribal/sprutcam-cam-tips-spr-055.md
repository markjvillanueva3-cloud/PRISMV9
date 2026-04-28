---
id: "spr-055"
title: "Eccentric Turning with C-Axis Interpolation"
source: "web:sprutcam-tutorials"
confidence: 0.81
category: "cam_strategy"
tags: ["eccentric", "c-axis", "cam-lobe", "polar"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.921Z
---

# Eccentric Turning with C-Axis Interpolation

Machine eccentric features (cam lobes, ellipses, polygons) using synchronized X-axis and C-axis interpolation. SprutCAM generates the polar coordinate toolpath from the 2D contour. Set the eccentricity offset and angular positions. The controller interpolates X and C simultaneously to trace the non-circular profile. Maximum eccentricity is limited by the X-axis acceleration capability of the machine.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[sprutcam-cam-tips-spr-179|Eccentric Turning with Polar Interpolation]]
- [[mastercam-cam-tips-mc-084|Y-axis operations enable off-center milling for complex turned parts]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
- [[bobcad-cam-tips-bc-146|BobCAD Mill-Turn C-Axis Milling for Off-Center Features]]
- [[bobcad-cam-tips-bc-150|BobCAD Mill-Turn Eccentric Turning with C-Axis Interpolation]]
