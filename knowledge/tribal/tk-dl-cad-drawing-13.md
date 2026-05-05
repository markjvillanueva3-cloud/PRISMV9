---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-13
title: Form tolerances (flatness, cylindricity) need no datum
category: quality
subcategory: gdt
domain: document_learned
knowledge_type: anti_pattern
confidence: 88
source: document:cad_drawing_standards@section4
created_at: 2026-03-01
usage_count: 0
tags: ["gdt", "form-tolerance", "flatness", "cylindricity", "datum", "drawing", "operation:profiling"]
material_groups: []
operation_types: ["profiling"]
content_hash: 60729c0fcda89007de3bc8c96c2e7dccfed76c004973b5885e6b93b1fb432533
mirror_ts: 2026-05-05T13:36:02.111Z
mirror_engine: TribalVaultPopulatorEngine
---

# Form tolerances (flatness, cylindricity) need no datum

**Category:** `quality` · **Subcategory:** `gdt` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cad_drawing_standards@section4`

## Tip

The four form tolerances — straightness (⏤), flatness (⏥), circularity (○), and cylindricity (⌭) — are the ONLY GD&T controls that do NOT require a datum reference. They control individual feature shape. All other GD&T categories (orientation, location, profile, runout) require at least one datum. Incorrectly adding datums to form tolerances is a common error.

## Applies to

- Operation types: `profiling`

## Related tips

- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:3)_
- [[mc-111|Surface inspection probing generates point cloud for GD&T verification on machine]] _(category+tag:2)_
- [[tk-010|Deburring sequence matters]] _(category+tag:1)_
- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-02|Never dimension to hidden lines — use section views]] _(category+tag:1)_

## Tags

#gdt #form-tolerance #flatness #cylindricity #datum #drawing #operation-profiling
