---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-11
title: Edge break/deburr note is mandatory on machined parts
category: safety
subcategory: coolant_safety
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:cad_drawing_standards@section6
created_at: 2026-03-01
usage_count: 0
tags: ["deburr", "edge-break", "drawing", "safety", "inspection", "operation:chamfering"]
material_groups: []
operation_types: ["chamfering"]
content_hash: 08247d9354d94ece9016ac22223ec0c02c7b5077d62ca9a7ca1104d1e8ab1ba0
mirror_ts: 2026-05-05T13:36:01.431Z
mirror_engine: TribalVaultPopulatorEngine
---

# Edge break/deburr note is mandatory on machined parts

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cad_drawing_standards@section6`

## Tip

Every machined part drawing must include an edge break callout (e.g., 'BREAK ALL SHARP EDGES 0.2-0.5mm' or 'DEBURR ALL EDGES'). Sharp edges are dangerous to handlers, cause stress concentrations, and interfere with coatings/plating. This is one of the most commonly omitted notes and a frequent cause of part rejection at incoming inspection.

## Applies to

- Operation types: `chamfering`

## Related tips

- [[tk-dl-hm-032|VMC collision check tolerance must be ≤ half tool diameter]] _(category+op:1+tag:1)_
- [[tk-012|Safety: never reach into running machine]] _(category+tag:1)_
- [[wedm-kb-028|Safety: never reach into the tank during cutting]] _(category+tag:1)_
- [[wedm-kb-029|Fire risk: maintain water level above workpiece]] _(category+tag:1)_
- [[tk-dl-hm-003|Clearance plane must be above ALL geometry including fixtures]] _(category+tag:1)_

## Tags

#deburr #edge-break #drawing #safety #inspection #operation-chamfering
