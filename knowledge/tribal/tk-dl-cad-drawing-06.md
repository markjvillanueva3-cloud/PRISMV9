---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-06
title: Position tolerance calculation for hole patterns
category: quality
subcategory: gdt
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:cad_drawing_standards@section4
created_at: 2026-03-01
usage_count: 0
tags: ["position-tolerance", "hole-pattern", "mmc", "fastener", "gdt", "formula"]
material_groups: []
operation_types: []
content_hash: 93938bbba32f967ac36dd24c2bbd5a01e7bad87d18a6e1ef027012d0f70366c1
mirror_ts: 2026-05-05T13:36:03.180Z
mirror_engine: TribalVaultPopulatorEngine
---

# Position tolerance calculation for hole patterns

**Category:** `quality` · **Subcategory:** `gdt` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cad_drawing_standards@section4`

## Tip

For fastener hole patterns: Floating fastener formula: T_hole = H_MMC - F_MMC (where H=hole diameter at MMC, F=fastener diameter at MMC). Fixed fastener formula: T_hole = (H_MMC - F_MMC) / 2. Always specify position tolerance at MMC (Ⓜ) for holes — this allows bonus tolerance as the hole gets larger, maximizing manufacturing yield.

## Related tips

- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:2)_
- [[sc-114|Solid Probe Dimensional Verification — In-Machine GD&T Checking]] _(category+tag:1)_
- [[tk-dl-cad-drawing-13|Form tolerances (flatness, cylindricity) need no datum]] _(category+tag:1)_
- [[mc-111|Surface inspection probing generates point cloud for GD&T verification on machine]] _(category+tag:1)_
- [[jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]] _(category)_

## Tags

#position-tolerance #hole-pattern #mmc #fastener #gdt #formula
