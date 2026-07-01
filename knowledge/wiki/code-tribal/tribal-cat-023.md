---
name: tribal-cat-023
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "scallop-driven", "adaptive-stepover", "surface-machining"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-023.md
promoted_at: 2026-05-26T16:07:20.032Z
---

# Scallop-Driven Machining Adapts Stepover to Curvature

CATIA's scallop-height-driven mode dynamically adjusts stepover to maintain a constant scallop height across varying curvature. On flat areas the stepover widens, on highly curved areas it tightens. This produces visually uniform surface finish without over-machining flat regions. Enable this by selecting 'Scallop Height' as the step mode in the Machining Strategy parameters. Typical values: 0.005-0.02mm for mold finishing, 0.02-0.05mm for general aerospace surfaces.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** sweeping, contour_driven

## Related
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-014|ZLevel Machining Optimal for Steep Walls Over 60 Degrees]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
