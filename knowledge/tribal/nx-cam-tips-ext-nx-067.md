---
id: "nx-067"
title: "Tool Axis Vector Interpolation Methods"
source: "web:siemens-nx-docs"
confidence: 85
category: "cam_strategy"
tags: ["siemens-nx", "tool-axis", "interpolation", "5-axis", "smooth-cubic"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.374Z
---

# Tool Axis Vector Interpolation Methods

NX provides four tool axis interpolation methods for 5-axis: Normal to Part, Normal to Drive, Relative to Drive, and Interpolated. Use Interpolated when transitioning between regions with different axis requirements — NX blends vectors between user-defined start/end orientations. Set the interpolation to Smooth Cubic rather than Linear to avoid abrupt rotary axis jumps. Maximum angular change between adjacent cut points should stay below 3 degrees to prevent rotary axis velocity limits on most 5-axis machines.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:siemens-nx-docs
**Operations:** finishing, 5-axis

## Related
- [[camworks-cam-tips-cw-052|Tool Axis Control — Interpolate Between Lead, Tilt, and Surface Normal]]
- [[gibbscam-cam-tips-gc-038|Simultaneous 5-axis tool axis control uses smooth interpolation between orientations]]
- [[nx-cam-tips-ext-nx-061|Variable Axis Surface Contour with Lead/Lag Angles]]
- [[nx-cam-tips-ext-nx-063|SWARF Driving with Ruled Surface Verification]]
- [[nx-cam-tips-ext-nx-066|Generic Motion for Custom 5-Axis Trajectories]]
