---
name: tribal-nx-067
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "tool-axis", "interpolation", "5-axis", "smooth-cubic"]
confidence: 85
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-067.md
promoted_at: 2026-06-09T22:31:16.478Z
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
