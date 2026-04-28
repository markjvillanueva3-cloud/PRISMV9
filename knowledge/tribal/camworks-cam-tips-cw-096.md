---
id: "cw-096"
title: "Smooth Flow — Arc Fitting and Linear-to-Arc Conversion"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "optimization", "smooth-flow", "arc-fitting", "g-code"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.718Z
---

# Smooth Flow — Arc Fitting and Linear-to-Arc Conversion

Enable smooth flow (arc fitting) to convert dense linear toolpath segments into G02/G03 arcs where the deviation is within tolerance. This reduces G-code file size by 60-80% and produces smoother machine motion because the controller processes one arc block instead of hundreds of linear blocks. Set the arc fitting tolerance to 50% of the surface tolerance. Verify that your controller supports G02/G03 in all planes (not just XY) for 3D arc fitting.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, 3d_finishing

## Related
- [[camworks-cam-tips-cw-028|VoluMill Corner Strategies — Manage Engagement Spikes in Tight Radii]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-091|Feed Optimization — Post-Process Feed Rate Adjustment by Engagement]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
