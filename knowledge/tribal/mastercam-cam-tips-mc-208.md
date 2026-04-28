---
id: "mc-208"
title: "Custom clearance surfaces replace flat clearance planes for optimized retract on complex parts"
source: "web:mastercam-docs"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "clearance-surface", "custom-retract", "collision-avoidance", "5-axis", "linking"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.285Z
---

# Custom clearance surfaces replace flat clearance planes for optimized retract on complex parts

For parts with complex fixtures, multiple setups, or tall features adjacent to deep pockets, a flat clearance plane either sits too high (wasting time) or too low (causing collisions). Mastercam allows defining a custom clearance surface — a 3D surface or solid that the tool retracts to during linking moves. The retract path follows the surface contour, staying close to the work without collision. In Mastercam Multiaxis, select a clearance surface in the Linking parameters: choose a sphere, cylinder, plane, or custom mesh. The toolpath engine calculates retract moves that touch the clearance surface at the closest safe point. This technique is essential for 5-axis work where the fixture and part geometry create complex collision zones that a flat plane cannot safely navigate. Always verify clearance surface moves in Machine Simulation with the full fixture and tool holder modeled.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** finishing, 5_axis

## Related
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[mastercam-cam-tips-mc-065|Multi-Surface 5-axis uses multiple drive surfaces for complex compound shapes]]
- [[mastercam-cam-tips-mc-067|Port machining toolpath automates intake and exhaust port programming]]
- [[mastercam-cam-tips-mc-069|Multiaxis Drill enables angled hole drilling at compound angles]]
