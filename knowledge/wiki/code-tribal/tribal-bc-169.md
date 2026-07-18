---
name: tribal-bc-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "cross-drilling", "cross-milling", "live-tool", "c-axis"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-169.md
promoted_at: 2026-06-09T22:31:15.973Z
---

# BobCAD Swiss-Type Cross-Drilling and Cross-Milling

BobCAD programs Swiss-type cross-drilling by defining a secondary coordinate system on the part OD perpendicular to the spindle axis. The C-axis indexes to the hole angular position, the Y-axis controls depth, and X provides the centerline offset. For cross-holes in small diameter parts (<8mm), use peck drilling with 0.5-1mm peck depth to ensure chip evacuation through the small hole. Set live tool RPM based on drill diameter: 0.5mm drill at 15,000 RPM, 2mm drill at 5,000 RPM. Cross-milling flats uses the same coordinate system with the live tool following a 2D contour.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** turning, drilling, milling

## Related
- [[sprutcam-cam-tips-spr-046|Cross-Drilling on Swiss-Type Lathes]]
- [[surfcam-cam-tips-sc2-157|SURFCAM Swiss-Type Live Tooling Cross-Drilling]]
- [[esprit-cam-tips-esp-133|Swiss-Type C-Axis Milling on Main and Sub Spindle]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[catia-cam-tips-cat-155|CATIA Lathe Live Tooling for Cross-Drilling and Milling]]
