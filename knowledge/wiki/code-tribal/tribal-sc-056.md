---
name: tribal-sc-056
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining-3d", "islands", "tall-features", "wall-offset"]
confidence: 84
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-056.md
promoted_at: 2026-06-09T22:31:16.584Z
---

# iMachining 3D Island Handling — Separate Strategy for Tall Islands

When iMachining 3D encounters tall standing islands (height > 3x tool diameter), the morphing spiral can create excessive lateral forces against the island walls at each Z-level. Set a separate Wall Offset of 0.5-1.0mm for island faces and reduce the Tool Level slider by one position for operations containing tall islands. Alternatively, split the operation into two — one for the open pocket area at full aggressiveness, and a second targeting only the island periphery at reduced parameters.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:solidcam-docs
**Operations:** 3d_roughing

## Related
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-049|iMachining 2D Profile Pass — Add Finish Allowance Correctly]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
- [[solidcam-cam-tips-sc-051|iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry]]
- [[solidcam-cam-tips-sc-052|iMachining 3D Auto Step-Down — Wizard Increases Feed at Shallower Depths]]
