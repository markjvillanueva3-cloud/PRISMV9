---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-118
title: AC stock definition: box offset with face milling contour auto-generation
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 88
source: video:hypermill-AC-basic-tutorial@7-9min
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "stock", "box-offset", "face-milling", "operation:profiling", "operation:milling"]
material_groups: []
operation_types: ["profiling", "milling"]
content_hash: 29f1c894a3dd13d8219ce4b00ef5576900fcf79965dba30603f908074cbd2016
mirror_ts: 2026-05-05T13:36:02.130Z
mirror_engine: TribalVaultPopulatorEngine
---

# AC stock definition: box offset with face milling contour auto-generation

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `88` · **Source:** `video:hypermill-AC-basic-tutorial@7-9min`

## Tip

AUTOMATION Center stock definition using 'Box offset' method: set per-axis offsets (e.g., X=2mm, Y=1mm, Z+=0.5mm, Z-=30mm). The function auto-generates two layers: 'Bounding box layer' (red lines showing stock dimensions) and 'Face milling contour' (rectangle at the highest point of the part for face milling operations). Stock name is configurable and referenced by downstream fixture and machining functions.

## Applies to

- Operation types: `profiling`, `milling`

## Related tips

- [[tk-dl-hm-098|hyperMILL Contour Milling dialog: allowance and optimize start points]] _(category+op:2+tag:3)_
- [[tk-dl-hm-105|Clearance plane essential for 5-axis tool orientation changes]] _(category+op:2+tag:3)_
- [[tk-dl-hm-100|Contour Milling depth: Top_Abs/Bottom_Abs define Z limits]] _(category+op:2+tag:3)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:2+tag:3)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:2+tag:3)_

## Tags

#hypermill #automation-center #stock #box-offset #face-milling #operation-profiling #operation-milling
