---
name: tribal-mc-193
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "c-plane-chain", "3d-chain", "construction-plane", "boundary", "gouge"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-193.md
promoted_at: 2026-06-09T22:31:16.443Z
---

# C-plane chains vs 3D chains produce fundamentally different toolpath behaviors

In Mastercam, a C-plane chain selects geometry projected onto the current construction plane (all entities treated as 2D), while a 3D chain preserves the full XYZ coordinates of each entity. C-plane chains are correct for 2D operations (contour, pocket, drill) where the tool moves in XY and steps in Z. 3D chains are required for operations that must follow the actual spatial path of the geometry (surface containment boundaries, 3D contours, multiaxis drive curves). A common error is using a C-plane chain for a 3D boundary — the toolpath ignores the Z-variation and cuts at a single plane, gouging into 3D surfaces. Conversely, using a 3D chain for a simple 2D contour can introduce unwanted Z-variations from geometry that was modeled slightly off-plane. Verify chain type in the Chaining Manager — the chain type indicator shows C or 3D.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** contouring, finishing

## Related
- [[mastercam-cam-tips-mc-063|Steep/Shallow boundary angle must match between roughing and finishing]]
- [[mastercam-cam-tips-mc-068|Trimmed 5-axis constrains tool motion to a bounded surface region]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-197|Chain vs solid containment methods offer different trade-offs for toolpath region control]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
