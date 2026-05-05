---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-08
title: CATIA: use Generative Drafting over Interactive Drafting
category: setup
domain: document_learned
knowledge_type: rule
confidence: 80
source: document:cad_drawing_standards@section5
created_at: 2026-03-01
usage_count: 0
tags: ["catia", "drawing", "generative-drafting", "associativity", "cad"]
material_groups: []
operation_types: []
content_hash: 8ac697c69aef5493f986c750ca244c318c27ac166ed7a1999dbab6d3c6b0baa6
mirror_ts: 2026-05-05T13:36:03.911Z
mirror_engine: TribalVaultPopulatorEngine
---

# CATIA: use Generative Drafting over Interactive Drafting

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `80` · **Source:** `document:cad_drawing_standards@section5`

## Tip

In CATIA V5/V6, always use Generative Drafting (automatic from 3D model) instead of Interactive Drafting (manual). Generative Drafting maintains full associativity — model changes auto-update the drawing. Use dress-up features (centerlines, threads, axis lines) BEFORE dimensioning. CATIA has the most comprehensive GD&T symbol library of all major CAD systems.

## Related tips

- [[tk-dl-cad-drawing-07|SolidWorks: use Model Items to auto-import dimensions]] _(category+tag:2)_
- [[tk-dl-cad-drawing-15|FreeCAD/CadQuery: export STEP then use TechDraw for 2D]] _(category+tag:2)_
- [[tk-dl-cad-drawing-09|Siemens NX PMI for Model-Based Definition]] _(category+tag:1)_
- [[bc-143|BobCAM for SOLIDWORKS Design-to-Manufacturing Workflow]] _(category+tag:1)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category)_

## Tags

#catia #drawing #generative-drafting #associativity #cad
