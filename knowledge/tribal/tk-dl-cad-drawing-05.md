---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-05
title: Surface finish must be specified on all mating surfaces
category: quality
subcategory: drawing
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:cad_drawing_standards@section3
created_at: 2026-03-01
usage_count: 0
tags: ["surface-finish", "Ra", "mating-surface", "iso-1302", "drawing", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: 3970bb1d2aecfde36afa077db2a9c2805f0261d33146f9dea6cfdae9cd0a2987
mirror_ts: 2026-05-05T13:36:02.109Z
mirror_engine: TribalVaultPopulatorEngine
---

# Surface finish must be specified on all mating surfaces

**Category:** `quality` · **Subcategory:** `drawing` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cad_drawing_standards@section3`

## Tip

Every surface that mates with another part MUST have a surface finish callout (Ra value per ISO 1302 or ASME Y14.36). Common values: Ra 1.6-3.2 μm for standard machining, Ra 0.4-0.8 μm for bearing seats and sealing surfaces, Ra 0.05-0.2 μm for lapped/polished surfaces. Missing finish specs on fits is a top-10 drawing error that causes assembly failures.

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-dl-dfm-001|DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm]] _(category+op:1+tag:3)_
- [[ec-173|Hard Milling Surface Finish Scallop Height Control]] _(category+op:1+tag:2)_
- [[sc2-189|SURFCAM Surface Finish Variance Analysis Using Scallop Model]] _(category+op:1+tag:2)_
- [[bc-205|BobCAD Surface Finish Variance Prediction Model]] _(category+op:1+tag:2)_
- [[tk-dl-hm-097|Shape continuities analysis for edge quality]] _(category+op:1+tag:1)_

## Tags

#surface-finish #ra #mating-surface #iso-1302 #drawing #operation-finishing
