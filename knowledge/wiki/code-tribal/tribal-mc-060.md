---
name: tribal-mc-060
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "waterline", "constant-z", "steep-walls", "z-step", "mold-finish"]
confidence: 88
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-060.md
promoted_at: 2026-06-09T22:31:16.410Z
---

# Waterline finishing is mandatory for steep walls above 60 degrees

Waterline (constant-Z) finishing produces horizontal contour cuts at fixed Z-increments. On walls steeper than 60 degrees from horizontal, Waterline gives far superior surface finish compared to raster-based strategies (Parallel, Scallop) because the tool moves tangent to the wall rather than across it. Set Z-step to 0.05-0.15 mm for mold-quality finishes on steep walls. Below 45 degrees, switch to Scallop or Parallel — Waterline leaves poor finish on shallow areas due to wide step spacing.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:community
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
- [[mastercam-cam-tips-mc-063|Steep/Shallow boundary angle must match between roughing and finishing]]
- [[mastercam-cam-tips-mc-281|Constant-Z finishing with adaptive stepdown produces best surface finish on steep mold cavity walls]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
