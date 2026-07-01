---
name: tribal-bc-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bridge-tabs", "micro-joints", "retention", "deburring"]
confidence: 88
source: "web:bobcad-bridge-tabs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-079.md
promoted_at: 2026-06-09T22:31:15.952Z
---

# Bridge Tabs for Part Retention During Cutting

BobCAD bridge tabs (micro-joints) hold parts in the sheet during and after cutting to prevent tipping, shifting, or falling through the slats. Set tab width to 0.3-0.5mm for thin sheet (<3mm) and 0.5-1.0mm for thick plate (>6mm). Place 2-4 tabs per part at the widest points. BobCAD automatically positions tabs at optimal locations. After cutting, parts are snapped free and tab remnants are deburred. Tab parameters can be set per-part for mixed-thickness nests.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-bridge-tabs
**Operations:** nesting

## Related
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
- [[topsolid-cam-tips-ts-145|TopSolid Wire EDM Tab Management — Prevent Core Drop with Smart Tabs]]
- [[mastercam-cam-tips-mc-124|Slug management in wire EDM prevents loose slugs from shorting the wire]]
- [[nx-cam-tips-ext-nx-178|Disc Cutter for Turbine Slots]]
- [[bobcad-cam-tips-bc-133|BobCAD V36 Multiaxis Deburring Toolpath Strategy]]
