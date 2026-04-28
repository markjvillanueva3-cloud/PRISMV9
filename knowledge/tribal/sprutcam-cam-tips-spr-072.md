---
id: "spr-072"
title: "5-Axis Collision Avoidance with Automatic Tilt"
source: "web:sprutcam-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["collision-avoidance", "automatic-tilt", "5-axis", "holder"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.934Z
---

# 5-Axis Collision Avoidance with Automatic Tilt

SprutCAM's automatic collision avoidance tilts the tool axis to avoid holder and spindle collisions. Set 'Maximum Tilt Angle' and 'Tilt Direction' preferences. The system checks the tool assembly (cutter + holder + spindle) against the workpiece and fixture at every point. When a collision is detected, the tool tilts to the minimum angle that clears the obstruction while maintaining surface contact.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-docs
**Operations:** multi_axis

## Related
- [[edgecam-cam-tips-ec-033|5-Axis Collision Avoidance with Holder Checking]]
- [[gibbscam-cam-tips-gc-179|GibbsCAM 5-axis collision avoidance auto-tilts tool away from obstacles]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[surfcam-cam-tips-sc2-042|Collision Avoidance with Holder and Spindle Clearance]]
- [[bobcad-cam-tips-bc-033|Simultaneous 5-Axis with Collision Avoidance]]
