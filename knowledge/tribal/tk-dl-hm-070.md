---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-070
title: Workplane On Face for 5-axis setups
category: setup
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:hypercad-s-v33@p200
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "workplane", "5-axis", "operation:5_axis"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 7a9177a42e637b774a5b7a42a72b10c7131638303e797bcf370436d71acfba93
mirror_ts: 2026-05-05T13:36:01.049Z
mirror_engine: TribalVaultPopulatorEngine
---

# Workplane On Face for 5-axis setups

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hypercad-s-v33@p200`

## Tip

Use Workplane → On face to create a workplane where the Z axis aligns with the face normal at a selected point. The origin defaults to the untrimmed face midpoint — reposition via U/V parameters (0-1 range) or by snapping a point. Always enable Associative + enter a name so the WP persists and can be linked to a hyperMILL Frame.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[tk-dl-hm-101|5-Axis Frame with rotation angles A/B/C + rotation angle]] _(category+op:1+tag:3)_
- [[tk-dl-hm-105|Clearance plane essential for 5-axis tool orientation changes]] _(category+op:1+tag:3)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:1+tag:3)_
- [[tk-dl-hm-112|Automatic surface extension eliminates Z-level wraparound]] _(category+op:1+tag:2)_
- [[tk-dl-cnc-015|SINUMERIK TRAORI enables 5-axis transformation — required before CUT3D]] _(category+op:1+tag:2)_

## Tags

#hypermill #hypercad-s #workplane #5-axis #operation-5_axis
