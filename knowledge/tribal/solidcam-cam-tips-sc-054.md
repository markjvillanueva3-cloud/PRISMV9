---
id: "sc-054"
title: "iMachining 3D Multiple Depth Passes — Layer Roughing for Very Deep Cavities"
source: "web:solidcam-docs"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "imachining-3d", "multiple-depth", "deep-cavities", "chip-evacuation"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.705Z
---

# iMachining 3D Multiple Depth Passes — Layer Roughing for Very Deep Cavities

For cavities deeper than 4x tool diameter, use the Multiple Depth Passes option in iMachining 3D to split the roughing into overlapping Z-bands. Each band uses independent Wizard calculations optimized for that depth range. Set band overlap to 10-15% of step-down to prevent witness lines between bands. This approach is more reliable than a single deep operation because chip evacuation is better managed in each band.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** 3d_roughing

## Related
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-051|iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry]]
- [[solidcam-cam-tips-sc-052|iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths]]
- [[solidcam-cam-tips-sc-053|iMachining 3D Stock Awareness — Enable for Castings and Forgings]]
