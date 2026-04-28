---
id: "ec-033"
title: "5-Axis Collision Avoidance with Holder Checking"
source: "web:edgecam-5axis"
confidence: 90
category: "cam_strategy"
tags: ["5-axis", "collision-avoidance", "holder", "retraction"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.278Z
---

# 5-Axis Collision Avoidance with Holder Checking

Edgecam checks tool, holder, and spindle nose against the workpiece, fixtures, and machine at every toolpath point. When collision is detected, the system retracts or re-orients automatically. Set collision clearance to 2-5mm and load actual holder 3D models — generic cylinders miss complex holder shapes. For impellers, enable progressive retraction which lifts smoothly rather than snapping to a safe position.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:edgecam-5axis
**Operations:** 5axis_simultaneous

## Related
- [[esprit-cam-tips-esp-040|5-Axis Collision Avoidance with Automatic Retraction]]
- [[gibbscam-cam-tips-gc-179|GibbsCAM 5-axis collision avoidance auto-tilts tool away from obstacles]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[sprutcam-cam-tips-spr-072|5-Axis Collision Avoidance with Automatic Tilt]]
- [[surfcam-cam-tips-sc2-042|Collision Avoidance with Holder and Spindle Clearance]]
