---
id: "sc2-042"
title: "Collision Avoidance with Holder and Spindle Clearance"
source: "web:surfcam-5axis-collision"
confidence: 92
category: "cam_strategy"
tags: ["collision-avoidance", "holder", "spindle", "5-axis", "safety"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.065Z
---

# Collision Avoidance with Holder and Spindle Clearance

SURFCAM 5-axis collision avoidance checks the tool, holder, and spindle assembly against all part geometry, fixtures, and the machine table. When a collision is detected, the system automatically tilts the tool axis to achieve the specified clearance distance. Set holder clearance to 3mm and spindle clearance to 5mm. Always model the actual tool holder assembly accurately — an oversimplified holder model can produce false clearance that results in real collisions on the machine.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:surfcam-5axis-collision
**Operations:** 5_axis

## Related
- [[bobcad-cam-tips-bc-040|Collision Avoidance with Full Assembly Checking]]
- [[edgecam-cam-tips-ec-033|5-Axis Collision Avoidance with Holder Checking]]
- [[gibbscam-cam-tips-gc-179|GibbsCAM 5-axis collision avoidance auto-tilts tool away from obstacles]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[sprutcam-cam-tips-spr-072|5-Axis Collision Avoidance with Automatic Tilt]]
