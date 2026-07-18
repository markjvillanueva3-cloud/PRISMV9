---
name: tribal-wnc-154
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-tracing", "corners", "fillets", "cleanup", "finishing"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-154.md
promoted_at: 2026-05-26T16:07:21.651Z
---

# WorkNC Pencil Tracing — Corner Cleanup on Fillets and Transitions

WorkNC's pencil tracing (also called pencil finishing) generates toolpaths that follow the intersection lines between adjacent surfaces — the fillet and blend lines where material remains after area finishing. The pencil tool traces along these intersection lines with a small ball-nose tool, removing the cusp remnants. WorkNC automatically detects intersection lines and generates the pencil passes. Run pencil tracing as the final operation after area finishing — it removes the last 0.01-0.05mm of cusp material in fillets that area finishing leaves behind.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** finishing

## Related
- [[esprit-cam-tips-esp-013|Pencil Tracing Cleans Fillet Intersections]]
- [[powermill-cam-tips-pm-075|Pencil Finishing for Internal Corner Cleanup]]
- [[topsolid-cam-tips-ts-027|Pencil Finishing Cleans Internal Corners and Fillets]]
- [[worknc-cam-tips-wnc-028|Pencil Finishing Cleans Corners and Fillet Regions]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
