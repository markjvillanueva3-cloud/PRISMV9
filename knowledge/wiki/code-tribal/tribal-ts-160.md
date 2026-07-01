---
name: tribal-ts-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "5-axis", "rotary", "smoothing", "jerk"]
confidence: 90
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-160.md
promoted_at: 2026-05-26T16:07:21.180Z
---

# 5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk

Rapid changes in rotary axis positions (A/B/C) cause machine jerk, which damages surface finish and may trigger servo alarms. TopSolid smooths rotary axis motion by: (1) limiting the rate of change of rotary axes to the machine's capability (typically 10-50°/s), (2) inserting intermediate points to linearize rotary motion between toolpath points, (3) applying spline interpolation to rotary axes. Enable 'Rotary Smoothing' in the 5-axis operation settings and set the angular velocity limits from your machine specification. This is especially important near singularity zones (tool perpendicular to rotary axis).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** 5_axis

## Related
- [[catia-cam-tips-cat-028|Auto Tool Axis Smoothing Prevents Abrupt Rotary Motion]]
- [[topsolid-cam-tips-ts-156|Barrel Cutter Toolpaths — 10x Larger Effective Radius for Surface Finish]]
- [[topsolid-cam-tips-ts-158|5-Axis Swarf Cutting — Wall Finishing with the Tool Flank]]
- [[topsolid-cam-tips-ts-159|5-Axis Collision Avoidance — Automatic Tool Axis Adjustment]]
- [[topsolid-cam-tips-ts-161|Multi-Axis Turbine Blade Machining — 5-Axis Flank and Point Milling]]
