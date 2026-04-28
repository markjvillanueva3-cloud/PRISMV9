---
id: "cw-052"
title: "Tool Axis Control — Interpolate Between Lead, Tilt, and Surface Normal"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "5-axis", "tool-axis", "lead-tilt", "interpolation"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.671Z
---

# Tool Axis Control — Interpolate Between Lead, Tilt, and Surface Normal

CAMWorks offers multiple tool axis control modes: surface normal (tool perpendicular to surface), lead/lag (tilted in feed direction), tilt (tilted sideways), and interpolated (smooth transition between defined orientations). For complex surfaces with varying accessibility, use interpolated mode with control points to guide the tool axis through tight areas. Avoid sudden axis rotations > 15°/step — these cause surface marks and may exceed machine rotary axis acceleration limits.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** 5_axis

## Related
- [[esprit-cam-tips-esp-186|FreeForm 5-Axis Automatic Lead and Tilt for Gouge Avoidance]]
- [[gibbscam-cam-tips-gc-038|Simultaneous 5-axis tool axis control uses smooth interpolation between orientations]]
- [[nx-cam-tips-ext-nx-067|Tool Axis Vector Interpolation Methods]]
- [[camworks-cam-tips-cw-045|Simultaneous 5-Axis — Continuous Tool Orientation for Complex Surfaces]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
