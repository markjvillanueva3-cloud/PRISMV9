---
id: "sc-052"
title: "iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "imachining-3d", "auto-step-down", "feed-compensation", "technology-wizard"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.703Z
---

# iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths

The iMachining 3D Technology Wizard automatically adjusts feed rate and cutting angle as the step-down depth decreases near the bottom of contoured surfaces. At shallower depths the tool engagement naturally reduces, so the Wizard compensates by increasing feed rate to maintain constant chip load. Monitor the first article — if you hear chatter at shallow depths, the Wizard may be over-compensating; reduce the Tool Level slider by one position.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** 3d_roughing

## Related
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-045|iMachining 2D Material Profiles — Custom Database for Exotic Alloys]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-051|iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry]]
- [[solidcam-cam-tips-sc-053|iMachining 3D Stock Awareness — Enable for Castings and Forgings]]
