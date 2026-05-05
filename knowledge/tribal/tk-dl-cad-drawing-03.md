---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-03
title: Dimension once — never repeat across views
category: quality
subcategory: drawing
domain: document_learned
knowledge_type: anti_pattern
confidence: 93
source: document:cad_drawing_standards@section3
created_at: 2026-03-01
usage_count: 0
tags: ["drawing", "dimensioning", "over-dimensioning", "tolerance-stack"]
material_groups: []
operation_types: []
content_hash: c88fb337d1481573054bb31b05bc320a596cf5df6fa625a6786bd40cca380f05
mirror_ts: 2026-05-05T13:36:00.938Z
mirror_engine: TribalVaultPopulatorEngine
---

# Dimension once — never repeat across views

**Category:** `quality` · **Subcategory:** `drawing` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:cad_drawing_standards@section3`

## Tip

Every dimension should appear exactly once on the drawing. Repeating a dimension in multiple views creates conflicting tolerance interpretations and confuses the machinist. Place dimensions in the view that best shows the feature's true shape, preferably between views. Reference dimensions (parenthesized) are the only exception.

## Related tips

- [[tk-dl-cad-drawing-02|Never dimension to hidden lines — use section views]] _(category+tag:2)_
- [[tk-dl-cad-drawing-10|Always include projection symbol and general tolerance block]] _(category+tag:1)_
- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:1)_
- [[tk-dl-cad-drawing-04|Use baseline dimensioning for critical tolerance features]] _(category+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+tag:1)_

## Tags

#drawing #dimensioning #over-dimensioning #tolerance-stack
