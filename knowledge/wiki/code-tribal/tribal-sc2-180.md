---
name: tribal-sc2-180
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-tracing", "hardened-steel", "fillet", "ball-nose", "high-rpm"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-180.md
promoted_at: 2026-06-09T22:31:16.699Z
---

# SURFCAM Pencil Tracing for Hardened Steel Fillet Cleanup

SURFCAM's pencil tracing follows the intersection curves where two surfaces meet (fillets, blend radii), targeting the material left by larger tools. In hardened steel, pencil tracing with a small ball-nose (1-3mm) at high RPM (25,000-40,000) removes fillet material without the heavy loads of a full area-clearing pass. Set the scallop height to 0.002-0.005mm for mold-quality finish. Use a constant-Z approach for steep fillets and a geodesic approach for shallow ones. Limit axial engagement to 0.1-0.3mm per pass on material >55 HRC.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:surfcam-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-194|BobCAD Pencil Trace Finishing for Hardened Die Steel]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[esprit-cam-tips-esp-013|Pencil Tracing Cleans Fillet Intersections]]
- [[edgecam-cam-tips-ec-021|Pencil Machining Cleans Fillet Intersections]]
- [[surfcam-cam-tips-sc2-025|Pencil Tracing for Fillet and Corner Cleanup]]
