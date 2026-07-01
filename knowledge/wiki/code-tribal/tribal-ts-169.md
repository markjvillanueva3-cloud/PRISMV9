---
name: tribal-ts-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "bevel-gear", "spiral", "5-axis", "gleason"]
confidence: 86
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-169.md
promoted_at: 2026-06-09T22:31:16.774Z
---

# TopSolid Bevel Gear Machining — Spiral and Straight Tooth

TopSolid supports bevel gear machining for both straight-tooth and spiral bevel gears. For straight bevel gears, the system uses 5-axis point milling of the tooth flanks. For spiral bevel gears (Gleason or Klingelnberg system), TopSolid calculates the tooth surface from the theoretical generating process and machines it with continuous 5-axis toolpaths. Critical: bevel gear tooth contact patterns must be verified after machining — TopSolid provides gear inspection routines that probe tooth flanks and compare to the theoretical surface. Deviation maps guide profile correction.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:topsolid-docs
**Operations:** 5_axis, finishing

## Related
- [[topsolid-cam-tips-ts-156|Barrel Cutter Toolpaths — 10x Larger Effective Radius for Surface Finish]]
- [[topsolid-cam-tips-ts-158|5-Axis Swarf Cutting — Wall Finishing with the Tool Flank]]
- [[topsolid-cam-tips-ts-159|5-Axis Collision Avoidance — Automatic Tool Axis Adjustment]]
- [[topsolid-cam-tips-ts-160|5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk]]
- [[topsolid-cam-tips-ts-161|Multi-Axis Turbine Blade Machining — 5-Axis Flank and Point Milling]]
