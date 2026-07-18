---
name: tribal-cat-110
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "spot-drill", "centering", "depth", "drilling"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-110.md
promoted_at: 2026-06-09T22:31:16.055Z
---

# Spot Drilling Depth Controls Subsequent Drill Centering

In CATIA Prismatic Machining drilling, set the spot drill depth so the resulting cone diameter is 1-2mm larger than the subsequent twist drill diameter. This ensures the twist drill fully engages the pilot cone before the chisel edge contacts material. Use a 90-degree spot drill for most applications, 120-degree for hard materials (the shallower cone reduces axial force). In CATIA, define the spot drill depth as a parameter linked to the through-drill diameter: spot_depth = (drill_diameter + 2) / (2 * tan(spot_angle/2)).

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[topsolid-cam-tips-ts-085|Spot Drilling with Automatic Depth Calculation]]
- [[worknc-cam-tips-wnc-081|Spot Drilling with Automatic Chamfer Depth]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-112|Peck Drilling Cycle Configuration for Deep Holes]]
