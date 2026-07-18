---
name: tribal-mc-196
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "boundary-chain", "3d-toolpath", "projection", "containment", "silhouette"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-196.md
promoted_at: 2026-06-09T22:31:16.444Z
---

# Boundary chains for 3D toolpaths must be projected correctly onto the machining surfaces

In Mastercam, containment boundaries for 3D surface toolpaths (Parallel, Scallop, Pencil, etc.) control where the tool is allowed to cut. The boundary chain must be properly associated with the machining surfaces — either lying directly on the surfaces or projected onto them. If the boundary is a 2D chain floating above or below the surface, enable 'Project Boundary' so Mastercam projects it along the tool axis onto the surface. Without projection, the boundary is applied at its literal Z-height, which may not intersect the surface at all, causing the toolpath to ignore the boundary. For complex 3D boundaries, create the boundary by extracting surface edges (Wireframe from Surfaces) or using the Silhouette Boundary tool that generates a chain around the visible outline of selected surfaces from the current view direction. Always verify boundary effectiveness in Backplot.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** finishing, roughing

## Related
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-117|Common edge detection in Mastercam prevents double-cutting shared pocket walls]]
- [[mastercam-cam-tips-mc-182|Material boundary auto-detection in rest machining eliminates manual containment definition]]
- [[mastercam-cam-tips-mc-195|Surface selection strategies for 3D toolpaths balance coverage against computation time]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
