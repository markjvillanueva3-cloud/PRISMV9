---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-015
title: SINUMERIK TRAORI enables 5-axis transformation — required before CUT3D
category: setup
subcategory: thermal_compensation
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:sinumerik-5axis@traori
created_at: 2026-03-03
usage_count: 0
tags: ["sinumerik", "traori", "5-axis", "cut3d", "transformation", "kinematic", "operation:milling", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["milling", "5_axis"]
content_hash: bf37cfa52b4eb05b9c591d0185deb707db82669ae5b462418b829e88c49ae47f
mirror_ts: 2026-05-05T13:36:03.204Z
mirror_engine: TribalVaultPopulatorEngine
---

# SINUMERIK TRAORI enables 5-axis transformation — required before CUT3D

**Category:** `setup` · **Subcategory:** `thermal_compensation` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:sinumerik-5axis@traori`

## Tip

SINUMERIK 5-axis programming requires TRAORI (TRAnsformation ORIentation) to activate kinematic transformation before any 5-axis moves. CUT3D enables peripheral milling with tool radius compensation in 5-axis mode. Without TRAORI active, 5-axis interpolation commands are rejected. TRAFOOF disables transformation.

## Applies to

- Operation types: `milling`, `5_axis`

## Related tips

- [[tk-dl-hm-105|Clearance plane essential for 5-axis tool orientation changes]] _(category+op:2+tag:3)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:2+tag:3)_
- [[esp-152|Mill-Turn Workplane Management for Complex Angles]] _(category+op:1+tag:3)_
- [[tk-dl-hm-070|Workplane On Face for 5-axis setups]] _(category+op:1+tag:2)_
- [[tk-dl-siemens-3d-comp-001|Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis]] _(op:2+tag:4)_

## Tags

#sinumerik #traori #5-axis #cut3d #transformation #kinematic #operation-milling #operation-5_axis #controller-siemens
