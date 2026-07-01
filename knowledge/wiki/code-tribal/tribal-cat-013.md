---
name: tribal-cat-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "sweeping", "scallop", "stepover", "surface-machining"]
confidence: 91
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-013.md
promoted_at: 2026-05-26T16:07:20.028Z
---

# Sweeping Operation Stepover Linked to Scallop Height

In CATIA 3-Axis Surface Machining Sweeping, set stepover based on target scallop height rather than a fixed percentage of tool diameter. Use the formula: stepover = 2 * sqrt(2*R*h - h²) where R is ball nose radius and h is desired scallop height. For a 10mm ball nose targeting 0.01mm scallop, stepover is approximately 0.89mm. CATIA can compute this automatically if you specify scallop height in the tool path parameters.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** sweeping

## Related
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-014|ZLevel Machining Optimal for Steep Walls Over 60 Degrees]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
