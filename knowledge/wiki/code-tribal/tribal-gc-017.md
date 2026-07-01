---
name: tribal-gc-017
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "raster", "3d", "machining", "angle", "planar"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-017.md
promoted_at: 2026-06-09T22:31:16.315Z
---

# Raster 3D machining with angular control aligns passes to part features

In GibbsCAM raster (planar) 3D machining, set the raster angle to align cutting passes with the dominant feature direction. For elongated cavities, align passes along the long axis to maximize the cutting pass length and minimize retracts. Use 45° angle for rectangular pockets to distribute wear evenly across the ball nose. Enable 'Bi-directional' for roughing (faster) but use 'Uni-directional climb' for finishing (better surface quality). The angular offset between adjacent raster finishing passes should be 3-5° to break up raster line witness marks.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-014|Waterline roughing with constant Z-step provides predictable load per level]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
