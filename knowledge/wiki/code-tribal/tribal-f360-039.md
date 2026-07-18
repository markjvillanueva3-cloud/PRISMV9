---
name: tribal-f360-039
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bore", "hole-machining", "helical", "chip-evacuation", "tolerance"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-f360-039.md
promoted_at: 2026-06-09T22:31:16.311Z
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
