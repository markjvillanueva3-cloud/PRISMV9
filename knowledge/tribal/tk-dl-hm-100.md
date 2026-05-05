---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-100
title: Contour Milling depth: Top_Abs/Bottom_Abs define Z limits
category: setup
domain: video_learned
knowledge_type: setup_lesson
confidence: 80
source: video:HyperMILL-5axis-Lesson1@80s
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "video-learned", "contour-milling", "depth-limits", "material:N", "material:Abs", "operation:profiling", "operation:milling"]
material_groups: ["N"]
operation_types: ["profiling", "milling"]
content_hash: 2ef0784a4f63f7bd0925cb886a930e763d450425e667c7bdfbff3c004b5778c4
mirror_ts: 2026-05-05T13:36:03.914Z
mirror_engine: TribalVaultPopulatorEngine
---

# Contour Milling depth: Top_Abs/Bottom_Abs define Z limits

**Category:** `setup` · **Domain:** `video_learned`

**Confidence:** `80` · **Source:** `video:HyperMILL-5axis-Lesson1@80s`

## Tip

In T7 Contour Milling on 3D Model dialog, contour depth is controlled via Top Abs and Bottom Abs columns. Example: Top_Abs=0 and Bottom_Abs=-33 defines a 33mm deep contour cut. Additional allowance can be set independently for XY and Z. Enable 'Sort contours' and 'Optimize start points' for efficient multi-contour operations.

## Applies to

- Material groups: `N`
- Operation types: `profiling`, `milling`

## Related tips

- [[tk-dl-hm-098|hyperMILL Contour Milling dialog: allowance and optimize start points]] _(category+op:2+tag:5)_
- [[tk-dl-hm-108|Multi-contour selection: per-contour Plus, Rev, Over columns]] _(category+op:2+tag:5)_
- [[tk-dl-hm-105|Clearance plane essential for 5-axis tool orientation changes]] _(category+op:2+tag:4)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:2+tag:4)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:2+tag:4)_

## Tags

#hypermill #video-learned #contour-milling #depth-limits #material-n #material-abs #operation-profiling #operation-milling
