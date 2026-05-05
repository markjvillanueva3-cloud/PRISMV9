---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-15
title: FreeCAD/CadQuery: export STEP then use TechDraw for 2D
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 78
source: document:cad_drawing_standards@section5
created_at: 2026-03-01
usage_count: 0
tags: ["freecad", "cadquery", "techdraw", "step", "dxf", "cad", "drawing", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: 2676da6d1d9e780ed32400bb37a9617acd4de7140d3ec318b03c5b9d37ac9096
mirror_ts: 2026-05-05T13:36:04.066Z
mirror_engine: TribalVaultPopulatorEngine
---

# FreeCAD/CadQuery: export STEP then use TechDraw for 2D

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `78` · **Source:** `document:cad_drawing_standards@section5`

## Tip

CadQuery generates 3D models programmatically but has no built-in 2D drawing capability. For technical drawings: export to STEP, then use FreeCAD's TechDraw workbench. TechDraw supports projection groups, section views, detail views, dimensions, and surface finish symbols. For quick 2D cross-sections from CadQuery, use cq.exporters.export(result.section(), 'cross_section.dxf').

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-dl-hm-112|Automatic surface extension eliminates Z-level wraparound]] _(category+op:1+tag:1)_
- [[tk-dl-hm-114|Global Fitting normalizes ISO directions across patchwork surfaces]] _(category+op:1+tag:1)_
- [[teb-092|Collision Checking with Complete Tool Assembly]] _(category+op:1+tag:1)_
- [[teb-179|Collision Avoidance with Safety Margin]] _(category+op:1+tag:1)_
- [[tk-dl-hm-098|hyperMILL Contour Milling dialog: allowance and optimize start points]] _(category+op:1+tag:1)_

## Tags

#freecad #cadquery #techdraw #step #dxf #cad #drawing #operation-finishing
