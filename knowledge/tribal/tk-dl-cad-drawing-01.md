---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-01
title: GD&T datum scheme is mandatory for position tolerance
category: quality
subcategory: gdt
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:cad_drawing_standards@section4
created_at: 2026-03-01
usage_count: 0
tags: ["gdt", "datum", "position-tolerance", "asme-y14.5", "drawing"]
material_groups: []
operation_types: []
content_hash: b293f844f1451474ca79f140a7b6a117002e7b955cf7585631f2b7d2ba2f2170
mirror_ts: 2026-05-05T13:36:01.429Z
mirror_engine: TribalVaultPopulatorEngine
---

# GD&T datum scheme is mandatory for position tolerance

**Category:** `quality` · **Subcategory:** `gdt` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cad_drawing_standards@section4`

## Tip

Position tolerance (⊕) ALWAYS requires a datum reference frame. A common drawing error is specifying position tolerance without defining datums — the tolerance is meaningless without them. Define three mutually perpendicular datum planes (A, B, C) before applying position callouts. Per ASME Y14.5-2018, this is the most common GD&T callout and the most commonly misapplied.

## Related tips

- [[tk-dl-cad-drawing-13|Form tolerances (flatness, cylindricity) need no datum]] _(category+tag:3)_
- [[tk-dl-cad-drawing-06|Position tolerance calculation for hole patterns]] _(category+tag:2)_
- [[tk-010|Deburring sequence matters]] _(category+tag:1)_
- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-02|Never dimension to hidden lines — use section views]] _(category+tag:1)_

## Tags

#gdt #datum #position-tolerance #asme-y14-5 #drawing
