---
id: "cat-146"
title: "Multi-Axis Interpolation Between Drive and Check Surfaces"
source: "web:catia-docs"
confidence: 0.84
category: "cam_strategy"
tags: ["catia", "multi-axis", "interpolation", "impeller", "tool-axis"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.930Z
---

# Multi-Axis Interpolation Between Drive and Check Surfaces

In CATIA Multi-Axis Surface Machining, use 'Interpolated' tool axis mode when machining between a drive surface and a check surface (e.g., impeller channel between blade and hub). Set the tool axis to interpolate between the normals of the drive surface and the check surface. The 'Interpolation Ratio' parameter (0 to 1) controls the blend — 0 aligns with the drive surface normal, 1 aligns with the check surface normal, 0.5 splits evenly. Adjust the ratio along the tool path using a 'Variable Ratio' law to tilt progressively as the tool enters narrow channels.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:catia-docs
**Operations:** 5axis_finishing

## Related
- [[catia-cam-tips-cat-145|Geodesic Tool Axis Strategy for Deep Cavity 5-Axis Machining]]
- [[catia-cam-tips-cat-019|Between-Curves Machining for Blended Surface Regions]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
