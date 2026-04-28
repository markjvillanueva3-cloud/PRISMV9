---
id: "cat-021"
title: "Offset Surface Strategy for Constant Stock on Freeform Parts"
source: "web:catia-docs"
confidence: 86
category: "cam_strategy"
tags: ["catia", "offset", "constant-stock", "freeform", "surface-machining"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.817Z
---

# Offset Surface Strategy for Constant Stock on Freeform Parts

Use CATIA's Offset machining strategy when you need to maintain constant stock allowance on freeform surfaces. The strategy offsets the part surface by the specified stock value and computes tool paths on the offset surface. This ensures uniform material removal regardless of surface curvature. Set the offset equal to your finishing stock (e.g., 0.3mm) for semi-finishing, then run a zero-offset finishing pass. Check for self-intersections on tight concave regions — CATIA warns but may need manual trimming.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** sweeping

## Related
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-014|ZLevel Machining Optimal for Steep Walls Over 60 Degrees]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
