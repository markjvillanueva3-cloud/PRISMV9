---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cad-drawing-12
title: Hole callouts must be complete: diameter + depth + type
category: quality
subcategory: drawing
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:cad_drawing_standards@section3
created_at: 2026-03-01
usage_count: 0
tags: ["hole-callout", "counterbore", "countersink", "tapped-hole", "drawing", "operation:threading"]
material_groups: []
operation_types: ["threading"]
content_hash: efdd5b41c8074a2c4c14bf0662a83008a8ffef563a557b3d4e76d008759c27c5
mirror_ts: 2026-05-05T13:36:02.110Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hole callouts must be complete: diameter + depth + type

**Category:** `quality` · **Subcategory:** `drawing` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cad_drawing_standards@section3`

## Tip

Every hole on a drawing needs a complete callout: diameter, depth (THRU or blind depth), and type (plain, counterbore ⌴, countersink ∠, tapped). Tapped holes additionally need thread spec (e.g., M10x1.5 - 6H x 20 DEEP). Incomplete hole callouts are a leading cause of manufacturing questions and RFIs that delay production.

## Applies to

- Operation types: `threading`

## Related tips

- [[tk-dl-cad-drawing-03|Dimension once — never repeat across views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-02|Never dimension to hidden lines — use section views]] _(category+tag:1)_
- [[tk-dl-cad-drawing-10|Always include projection symbol and general tolerance block]] _(category+tag:1)_
- [[tk-dl-cad-drawing-01|GD&T datum scheme is mandatory for position tolerance]] _(category+tag:1)_
- [[tk-dl-cad-drawing-05|Surface finish must be specified on all mating surfaces]] _(category+tag:1)_

## Tags

#hole-callout #counterbore #countersink #tapped-hole #drawing #operation-threading
