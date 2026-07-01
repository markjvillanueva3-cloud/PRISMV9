---
name: tribal-mc-055
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "pencil", "fillet", "blend", "cleanup", "mold-die"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-055.md
promoted_at: 2026-06-09T22:31:16.409Z
---

# Pencil toolpath targets fillet and concave blend regions for zero-scallop finish

Pencil finishing traces the valleys and concave blends where two surfaces meet — regions that Scallop or Parallel passes leave with residual cusps. Set the Reference Tool diameter to the previous finishing tool size so the Pencil pass only targets areas that tool could not reach. Limit to 1-3 passes with a small stepover (5-10% of ball mill diameter) for optimal cleanup. Pencil after Scallop is the standard two-step finishing sequence for mold and die work.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-059|Morph finishing interpolates between two boundary curves for blending regions]]
- [[mastercam-cam-tips-mc-140|Pencil toolpath with wall cleanup targets fillet corners that larger tools cannot reach]]
- [[mastercam-cam-tips-mc-184|Rest pencil toolpath traces fillet intersections left by the larger previous tool]]
- [[mastercam-cam-tips-mc-258|Accelerated Finishing pencil trace cleans fillet radii and inside corners with minimal additional cycle time]]
- [[cimatron-cam-tips-cim-071|Pencil Tracing for Corner Cleanup]]
