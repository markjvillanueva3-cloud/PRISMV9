---
id: "ts-115"
title: "Parting Surface Generation with Multiple Methods"
source: "web:topsolid-parting"
confidence: 90
category: "cam_strategy"
tags: ["parting-surface", "mold", "extension", "ruled-surface"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.474Z
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
