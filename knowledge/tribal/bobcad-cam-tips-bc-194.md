---
id: "bc-194"
title: "BobCAD Pencil Trace Finishing for Hardened Die Steel"
source: "web:bobcad-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["pencil-trace", "hardened-steel", "die-steel", "fillet", "ball-nose"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.609Z
---

# BobCAD Pencil Trace Finishing for Hardened Die Steel

BobCAD's pencil trace follows the intersection of two surfaces to finish fillets and corners left by larger roughing tools. In hardened die steel (50+ HRC), use small ball-nose tools (1-3mm) at 25,000-40,000 RPM with 0.1-0.3mm axial engagement. The pencil trace targets only the fillet material, avoiding the heavy loads of full-area finishing passes. Set scallop height to 0.002-0.005mm for mold-quality surfaces. Use climb milling exclusively — conventional milling in hardened material causes edge chipping. BobCAD's automatic pencil trace detection finds all fillet intersections from the part model.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:bobcad-docs
**Operations:** finishing

## Related
- [[surfcam-cam-tips-sc2-025|Pencil Tracing for Fillet and Corner Cleanup]]
- [[surfcam-cam-tips-sc2-180|SURFCAM Pencil Tracing for Hardened Steel Fillet Cleanup]]
- [[bobcad-cam-tips-bc-023|Pencil Tracing for Fillet and Corner Cleanup]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
