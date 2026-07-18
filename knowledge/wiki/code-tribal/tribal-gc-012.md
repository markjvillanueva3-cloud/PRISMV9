---
name: tribal-gc-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "flowline", "3d", "finishing", "surface-aligned", "uv"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-012.md
promoted_at: 2026-06-09T22:31:16.314Z
---

# Flowline finishing follows UV direction for natural surface-aligned passes

GibbsCAM's flowline strategy generates toolpaths that follow the natural UV parameterization of surfaces, producing superior finish on organic shapes like mold cavities. Select two opposing boundary curves to define the flow direction. For best results, choose boundaries that are roughly parallel and span the full surface width. Avoid surfaces with singularities (collapsed UV edges) as they cause toolpath bunching. Set constant stepover in terms of scallop height rather than absolute distance for uniform finish across varying curvature.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[gibbscam-cam-tips-gc-020|Steep/shallow boundary angle splits finishing into optimal zone strategies]]
