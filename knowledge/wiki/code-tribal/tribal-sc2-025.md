---
name: tribal-sc2-025
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-trace", "fillet", "corner-cleanup", "ball-nose"]
confidence: 90
source: "web:surfcam-3axis-pencil"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-025.md
promoted_at: 2026-05-26T16:07:20.508Z
---

# Pencil Tracing for Fillet and Corner Cleanup

SURFCAM pencil tracing automatically detects concave fillets and internal corners where larger tools leave uncut material, then generates a single-pass toolpath along the fillet centerline. Use a ball-nose tool sized to the fillet radius (or smaller for partial cleanup). Set the pencil trace tolerance to match the surface tolerance (typically 0.01mm). Enable 'Extend beyond fillet' by 0.5-1mm to blend smoothly into adjacent surfaces and avoid abrupt start/stop marks.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-3axis-pencil
**Operations:** finishing, rest_machining

## Related
- [[bobcad-cam-tips-bc-023|Pencil Tracing for Fillet and Corner Cleanup]]
- [[bobcad-cam-tips-bc-194|BobCAD Pencil Trace Finishing for Hardened Die Steel]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[mastercam-cam-tips-mc-258|Accelerated Finishing pencil trace cleans fillet radii and inside corners with minimal additional cycle time]]
