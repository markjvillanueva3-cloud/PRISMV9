---
id: "wnc-035"
title: "Core/Cavity Strategy Uses Progressive Tool Sizes"
source: "web:worknc-molddie"
confidence: 93
category: "cam_strategy"
tags: ["core-cavity", "progressive", "mold", "tool-sequence"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.648Z
---

# Core/Cavity Strategy Uses Progressive Tool Sizes

WorkNC's mold and die workflow uses progressive tool sizes: large face mills for initial stock removal, medium endmills for semi-finish, and small ball-nose cutters for final finish. Each stage references the previous tool for automatic rest material detection. A typical progression for a medium mold: 50mm face mill rough, 20mm endmill re-rough, 10mm ball-nose semi-finish, 6mm ball-nose finish, 3mm ball-nose rest finish.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:worknc-molddie
**Operations:** roughing, finishing

## Related
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[cimatron-cam-tips-cim-007|Multi-Setup Mold Core/Cavity Coordination]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-280|Mold core/cavity workflow uses solid model split and electrode extraction for integrated EDM planning]]
- [[powermill-cam-tips-pm-008|Adaptive Area Clear for Complex Core/Cavity Roughing]]
