---
id: "ts-162"
title: "Multi-Axis Impeller Machining — Channel and Splitter Strategies"
source: "web:topsolid-docs"
confidence: 89
category: "cam_strategy"
tags: ["topsolid", "impeller", "5-axis", "channel", "turbocharger"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.510Z
---

# Multi-Axis Impeller Machining — Channel and Splitter Strategies

TopSolid'Cam provides dedicated impeller machining strategies for pump and turbocharger impellers. The system machines the flow channels between blades using 5-axis point milling with tool axis interpolation to avoid collisions with adjacent blades. For impellers with splitter blades, TopSolid automatically separates the channels into segments and machines each segment with appropriate tool access. Key parameters: tool stick-out (minimum clearance between holder and blade tip), lead/lag angle for surface finish, and radial vs axial machining direction based on channel width.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-docs
**Operations:** 5_axis, roughing, finishing

## Related
- [[topsolid-cam-tips-ts-156|Barrel Cutter Toolpaths — 10x Larger Effective Radius for Surface Finish]]
- [[topsolid-cam-tips-ts-158|5-Axis Swarf Cutting — Wall Finishing with the Tool Flank]]
- [[topsolid-cam-tips-ts-159|5-Axis Collision Avoidance — Automatic Tool Axis Adjustment]]
- [[topsolid-cam-tips-ts-160|5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk]]
- [[topsolid-cam-tips-ts-161|Multi-Axis Turbine Blade Machining — 5-Axis Flank and Point Milling]]
