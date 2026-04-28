---
id: "sc2-157"
title: "SURFCAM Swiss-Type Live Tooling Cross-Drilling"
source: "web:surfcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["swiss-type", "live-tooling", "cross-drilling", "c-axis", "peck-drilling"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.171Z
---

# SURFCAM Swiss-Type Live Tooling Cross-Drilling

SURFCAM programs Swiss-type live tooling (cross-drilling, cross-milling) by defining a secondary coordinate system on the part OD. For cross-drilling, the C-axis indexes to position the hole, Y-axis controls depth, and X-axis provides the hole centerline offset. Program peck drilling cycles for deep cross-holes (>1.5xD) to ensure chip evacuation through the small hole diameter. Set live tool RPM based on the drill diameter, not the part diameter. Typical cross-drill feeds: 0.02-0.05 mm/rev for drills <3mm.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** turning, drilling

## Related
- [[bobcad-cam-tips-bc-169|BobCAD Swiss-Type Cross-Drilling and Cross-Milling]]
- [[esprit-cam-tips-esp-133|Swiss-Type C-Axis Milling on Main and Sub Spindle]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[sprutcam-cam-tips-spr-046|Cross-Drilling on Swiss-Type Lathes]]
- [[catia-cam-tips-cat-155|CATIA Lathe Live Tooling for Cross-Drilling and Milling]]
