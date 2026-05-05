---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-02
title: Never dimension to hidden lines — use section views
category: quality
subcategory: drawing
domain: document_learned
knowledge_type: anti_pattern
confidence: 92
source: document:cad_drawing_standards@section6
created_at: 2026-03-01
usage_count: 0
tags: ["drawing", "section-view", "dimensioning", "hidden-lines", "best-practice"]
material_groups: []
operation_types: []
content_hash: 5585bcb90de6dde9b83f7201248ed3806a10dcf63b52a47cc16898bb129874e6
mirror_ts: 2026-05-05T13:36:01.041Z
mirror_engine: TribalVaultPopulatorEngine
---

# Never dimension to hidden lines — use section views

**Category:** `quality` · **Subcategory:** `drawing` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:cad_drawing_standards@section6`

## Tip

Dimensioning to hidden (dashed) lines is a top-10 drawing error across all CAD platforms. If a feature is internal or not visible in the current view, create a section view (full, half, offset, or broken-out) to expose it. This applies equally in SolidWorks, Fusion 360, CATIA, NX, and FreeCAD TechDraw. Section views eliminate ambiguity and reduce interpretation errors on the shop floor.

## Related tips

- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:2)_
- [[tk-dl-cad-drawing-10|Always include projection symbol and general tolerance block]] _(category+tag:1)_
- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+tag:1)_
- [[tk-dl-cad-drawing-12|Hole callouts must be complete: diameter + depth + type]] _(category+tag:1)_

## Tags

#drawing #section-view #dimensioning #hidden-lines #best-practice
