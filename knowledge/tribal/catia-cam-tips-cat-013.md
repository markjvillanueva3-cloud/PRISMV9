---
id: "cat-013"
title: "Sweeping Operation Stepover Linked to Scallop Height"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "sweeping", "scallop", "stepover", "surface-machining"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.811Z
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
