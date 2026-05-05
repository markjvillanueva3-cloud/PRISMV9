---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-dfm-001
title: DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm
category: quality
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:CNC-Complete-Engineering-Guide@tolerances
created_at: 2026-03-06
usage_count: 0
tags: ["DFM", "tolerance", "surface-finish", "Ra", "anodizing", "precision", "operation:finishing", "operation:grinding", "operation:edm"]
material_groups: []
operation_types: ["finishing", "grinding", "edm"]
content_hash: 54eebf8f6ba33f3e16e06f1bd4fb4e3ed9fd391d469415dd59956892aaf0d2b8
mirror_ts: 2026-05-05T13:36:01.485Z
mirror_engine: TribalVaultPopulatorEngine
---

# DFM tolerance tiers: standard ±0.125mm, tight ±0.050mm, precision ±0.025mm

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:CNC-Complete-Engineering-Guide@tolerances`

## Tip

CNC machining tolerance tiers: Standard (default if not specified): ±0.125mm (±0.005 in). Tight (specifiable at higher cost): ±0.050mm (±0.002 in). Precision/feasible (maximum, significant cost): ±0.025mm (±0.001 in). These apply to any linear dimension. Tighter than ±0.025mm requires grinding, lapping, or EDM. Surface finish: as-machined standard 3.2 µm Ra (125 µin), fine machining down to 0.4 µm Ra (16 µin). Anodizing Type III (hardcoat) adds ~50 µm coating thickness — account for this in tolerance stack.

## Applies to

- Operation types: `finishing`, `grinding`, `edm`

## Related tips

- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+op:1+tag:3)_
- [[tk-dl-cast-002|Casting tolerance comparison: sand vs investment vs die]] _(category+op:1+tag:2)_
- [[ec-173|Hard Milling Surface Finish Scallop Height Control]] _(category+op:1+tag:2)_
- [[sc2-189|SURFCAM Surface Finish Variance Analysis Using Scallop Model]] _(category+op:1+tag:2)_
- [[bc-205|BobCAD Surface Finish Variance Prediction Model]] _(category+op:1+tag:2)_

## Tags

#dfm #tolerance #surface-finish #ra #anodizing #precision #operation-finishing #operation-grinding #operation-edm
