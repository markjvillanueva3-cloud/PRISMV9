---
name: tribal-esp-012
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["flowline", "finishing", "surface-quality", "uv-direction"]
confidence: 89
source: "web:esprit-3d-machining"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-012.md
promoted_at: 2026-06-09T22:31:16.216Z
---

# Flowline Finishing for Ruled and Swept Surfaces

ESPRIT's flowline strategy follows the natural UV direction of surfaces, producing toolpaths that align with surface flow. This is ideal for fillets, blends, and aerodynamic surfaces where cross-flow tool marks are unacceptable. Set the stepover based on scallop height (0.001-0.005mm for mirror finish) and enable 'boundary extension' by 5-10% to avoid short strokes and witness lines at surface edges.

**Category:** surface_finish
**Confidence:** 89
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, flowline

## Related
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[edgecam-cam-tips-ec-022|Flowline Finishing Follows Surface Direction]]
- [[bobcad-cam-tips-bc-022|Flowline Finishing Follows Surface UV Direction]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[mastercam-cam-tips-mc-057|Flowline finishing follows UV surface direction for best finish on shaped parts]]
