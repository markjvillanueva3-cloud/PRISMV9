---
name: tribal-gc-011
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "z-level", "3d", "finishing", "steep-wall", "scallop"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-011.md
promoted_at: 2026-06-09T22:31:16.314Z
---

# Z-level finishing excels on steep walls with constant scallop height

GibbsCAM's Z-level (waterline) finishing produces excellent surface quality on walls steeper than 45°. Set the Z-step based on target scallop height: step = 2×sqrt(R×scallop) where R is the ball nose radius. For a 10mm ball nose targeting 0.005mm scallop, use 0.45mm Z-step. Enable 'Smoothing' to blend stair-step transitions between levels. Combine with a shallow-area strategy (flowline or scallop) for complete surface coverage—Z-level alone leaves poor finish on flat/shallow regions.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[gibbscam-cam-tips-gc-020|Steep/shallow boundary angle splits finishing into optimal zone strategies]]
