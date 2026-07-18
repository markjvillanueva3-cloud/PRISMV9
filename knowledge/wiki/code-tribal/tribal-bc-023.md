---
name: tribal-bc-023
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-trace", "fillet", "corner-cleanup", "single-pass"]
confidence: 90
source: "web:bobcad-pencil"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-023.md
promoted_at: 2026-05-26T16:07:19.760Z
---

# Pencil Tracing for Fillet and Corner Cleanup

BobCAD pencil tracing detects concave fillets and internal corners where larger tools leave uncut material, generating single-pass centerline toolpaths. Use a ball-nose tool sized to the fillet radius or smaller. Set tolerance to match surface tolerance (0.01mm typical). Enable 'Extend beyond fillet' by 0.5-1mm for smooth blending with adjacent surfaces. Pencil tracing is most effective as the final operation in a multi-tool finishing chain after Z-level and scallop passes.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:bobcad-pencil
**Operations:** finishing, rest_machining

## Related
- [[surfcam-cam-tips-sc2-025|Pencil Tracing for Fillet and Corner Cleanup]]
- [[bobcad-cam-tips-bc-194|BobCAD Pencil Trace Finishing for Hardened Die Steel]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[mastercam-cam-tips-mc-258|Accelerated Finishing pencil trace cleans fillet radii and inside corners with minimal additional cycle time]]
