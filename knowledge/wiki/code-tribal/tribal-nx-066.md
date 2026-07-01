---
name: tribal-nx-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "generic-motion", "custom-trajectory", "5-axis", "manual-control"]
confidence: 80
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-066.md
promoted_at: 2026-06-09T22:31:16.478Z
---

# Generic Motion for Custom 5-Axis Trajectories

NX Generic Motion allows you to define fully custom 5-axis tool trajectories by specifying discrete tool positions and orientations along a user-defined path. Use this for operations that no standard drive method handles, such as machining along a complex lofted edge or following a non-standard inspection path. Define at least 20 control points per tool-diameter of travel for smooth interpolation. NX fits a spline through the points to generate continuous G-code.

**Category:** cam_strategy
**Confidence:** 80
**Source:** web:siemens-nx-docs
**Operations:** finishing, 5-axis

## Related
- [[nx-cam-tips-ext-nx-061|Variable Axis Surface Contour with Lead/Lag Angles]]
- [[nx-cam-tips-ext-nx-063|SWARF Driving with Ruled Surface Verification]]
- [[nx-cam-tips-ext-nx-067|Tool Axis Vector Interpolation Methods]]
- [[nx-cam-tips-ext-nx-068|Smooth Transition Strategies Between 5-Axis Regions]]
- [[nx-cam-tips-ext-nx-069|Gouge Checking with Full Assembly Validation]]
