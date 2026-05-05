---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-14
title: ISO 2768 tolerance classes for general dimensions
category: quality
subcategory: drawing
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:cad_drawing_standards@section3
created_at: 2026-03-01
usage_count: 0
tags: ["iso-2768", "general-tolerance", "tolerance-class", "drawing", "title-block"]
material_groups: []
operation_types: []
content_hash: ef7ff600169c202641c040646c1a86b0ac5cf2b1682d34bd46d989df41743525
mirror_ts: 2026-05-05T13:36:03.181Z
mirror_engine: TribalVaultPopulatorEngine
---

# ISO 2768 tolerance classes for general dimensions

**Category:** `quality` · **Subcategory:** `drawing` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cad_drawing_standards@section3`

## Tip

ISO 2768 defines four general tolerance classes for undimensioned features: f (fine: ±0.05 to ±0.5mm), m (medium: ±0.1 to ±1.0mm), c (coarse: ±0.2 to ±2.0mm), v (very coarse: ±0.5 to ±4.0mm). Always state the class in the title block (e.g., 'ISO 2768-mK'). The second letter (K) adds geometrical tolerance per Part 2. Medium (m) is the default for most machined parts.

## Related tips

- [[tk-dl-cad-drawing-10|Always include projection symbol and general tolerance block]] _(category+tag:3)_
- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-02|Never dimension to hidden lines — use section views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+tag:1)_

## Tags

#iso-2768 #general-tolerance #tolerance-class #drawing #title-block
