---
id: "f360-039"
title: "Bore Toolpath for Efficient Hole Enlargement"
source: "web:fusion360-docs"
confidence: 86
category: "cam_strategy"
tags: ["bore", "hole-machining", "helical", "chip-evacuation", "tolerance"]
_source: "fusion360-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.831Z
---

# Bore Toolpath for Efficient Hole Enlargement

Use the Bore toolpath instead of Pocket for circular holes larger than 0.75 inch diameter. Bore uses a helical plunge-and-spiral motion that keeps the tool constantly engaged without overloading, allowing holes up to 2x the end mill diameter. It is faster than pocketing, produces better surface finish, and improves chip evacuation because chips fall naturally out of the helical cut. Follow with a 2D Contour spring pass for H7 tolerance bores.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** bore, 2d_contour

## Related
- [[catia-cam-tips-cat-024|Helical Surface Machining for Bore and Cylinder Finishing]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
- [[esprit-cam-tips-esp-164|B-Axis Tool Clearance Planning for Deep Cavities]]
- [[fusion360-cam-tips-ext-f360-070|Bore Operation Lead-to-Center for Precision Holes]]
- [[bobcad-cam-tips-bc-015|Thread Milling with Helical Interpolation]]
