---
name: tribal-sc-055
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining-3d", "undercut", "gouging", "collision"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-055.md
promoted_at: 2026-06-09T22:31:16.584Z
---

# iMachining 3D Undercut Detection — Avoid Gouging on Draft Angles

iMachining 3D can detect undercuts when the part model contains negative draft angles. Enable the Undercut Detection option and set a minimum clearance angle (typically 3-5 degrees) to prevent the tool from attempting to machine undercut regions. Undetected undercuts cause the tool shank to collide with the workpiece wall. For parts with intentional undercuts, plan a separate 3+2 or 5-axis operation to access those regions.

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
