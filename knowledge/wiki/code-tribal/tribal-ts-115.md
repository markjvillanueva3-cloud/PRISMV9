---
name: tribal-ts-115
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["parting-surface", "mold", "extension", "ruled-surface"]
confidence: 90
source: "web:topsolid-parting"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-115.md
promoted_at: 2026-05-26T16:07:21.087Z
---

# Parting Surface Generation with Multiple Methods

TopSolid generates parting surfaces using several methods: ruled surface extension (extends edges in the draw direction), planar extension (extends edges to a flat plane), smooth surface extension (maintains tangency with the part surface), and hybrid combinations. For parts with complex perimeters, use the 'Stitch' method that connects different surface types along the parting line. Always extend the parting surface at least 5-10 mm beyond the mold plate boundary to ensure complete separation.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-parting
**Operations:** general

## Related
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[tebis-cam-tips-teb-068|Core/Cavity Split Surface Management]]
- [[fusion360-cam-tips-f360-015|Swarf Cutting for Ruled Surfaces]]
- [[hypermill-cam-tips-ext-hm-177|Facing with Wiper Inserts]]
- [[powermill-cam-tips-pm-131|Facing with Wiper Inserts]]
