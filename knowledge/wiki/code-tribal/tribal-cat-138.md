---
name: tribal-cat-138
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "surface", "pencil-tracing", "fillet", "cleanup"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-138.md
promoted_at: 2026-06-09T22:31:16.062Z
---

# Surface Machining Pencil Tracing for Fillet Cleanup

CATIA's Pencil Tracing operation in Surface Machining automatically detects and machines concave fillet regions left unfinished by ball-nose finishing passes. The algorithm detects surface regions where the ball-nose tool cannot fully conform and generates centerline tool paths along the fillet valleys. Set the 'Scallop Height' to match the finishing operation (typically 0.005-0.01mm) for seamless blending. Use a ball-nose tool equal to or smaller than the fillet radius — a tool radius larger than the fillet radius causes gouging. Enable 'Multi-Pass' for wide fillets requiring multiple parallel passes.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-018|Pencil Tracing Targets Fillet and Corner Residual Stock]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[catia-cam-tips-cat-137|Isoparametric vs Isocrest Surface Machining Path Strategy]]
- [[catia-cam-tips-cat-139|Spiral Surface Machining for Circular Part Geometries]]
- [[catia-cam-tips-cat-140|Surface Machining Guide Curve Strategy for Flow-Shaped Parts]]
