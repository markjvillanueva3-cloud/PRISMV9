---
name: tribal-gc-015
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "scallop-height", "3d", "finishing", "constant-cusp", "adaptive-stepover"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-015.md
promoted_at: 2026-06-09T22:31:16.315Z
---

# Scallop height strategy maintains constant cusp height across varying slopes

The scallop-height finishing strategy in GibbsCAM automatically adjusts stepover based on local surface curvature to maintain a target cusp height. This produces uniform finish quality without the over-machining that occurs with constant-stepover strategies on flat areas. Set the scallop height to your surface roughness target (e.g., 0.005mm for Ra 0.4). This strategy is ideal for shallow regions (< 30° from horizontal) that Z-level finishing handles poorly. For large flat areas, combine with a radial or spiral pattern.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[gibbscam-cam-tips-gc-020|Steep/shallow boundary angle splits finishing into optimal zone strategies]]
