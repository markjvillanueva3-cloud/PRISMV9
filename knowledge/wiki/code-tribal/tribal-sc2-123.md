---
name: tribal-sc2-123
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-rest", "fillet-cleanup", "single-pass", "groove", "centerline"]
confidence: 88
source: "web:surfcam-pencil-rest"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-123.md
promoted_at: 2026-06-09T22:31:16.686Z
---

# Pencil Rest for Fillet and Groove Cleanup

SURFCAM pencil rest machining is a specialized rest strategy that generates single-pass toolpaths along fillets, grooves, and concavities where material remains. Unlike area rest machining (which generates multi-pass paths), pencil rest follows the fillet centerline for a clean single-pass cleanup. Set the ball-nose tool diameter to match the fillet radius. Use slow feed rates (50-70% of normal finishing feed) for the best surface finish in these geometrically constrained areas.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-pencil-rest
**Operations:** rest_machining, finishing

## Related
- [[worknc-cam-tips-wnc-116|Pencil Rest Machining for Intersection Line Cleanup]]
- [[bobcad-cam-tips-bc-023|Pencil Tracing for Fillet and Corner Cleanup]]
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[mastercam-cam-tips-mc-137|Tangent barrel cutters finish ruled surfaces and flat walls in a single pass per strip]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
