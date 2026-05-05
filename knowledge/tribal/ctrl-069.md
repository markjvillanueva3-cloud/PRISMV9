---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-069
title: CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "tool-compensation", "CUT2D", "CUT3DC", "CUT3DF", "5-axis", "post-processor", "operation:milling", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["milling", "5_axis"]
content_hash: 2f47c7221526657da1d4d1b2bc54118b48d4e6025215fdd04b00f0a616783784
mirror_ts: 2026-05-05T13:36:03.948Z
mirror_engine: TribalVaultPopulatorEngine
---

# CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK uses proprietary tool compensation modes for multi-axis machining that differ from standard ISO G41/G42: CUT2D applies 2D tool radius compensation when tool axis is perpendicular to the working plane (standard Z-axis orientation at B0C0). CUT2DF extends 2D compensation to work in tilted/swiveled planes (when a FRAME rotation is active), maintaining compensation in the rotated coordinate system. CUT3DC (3D Circumference) provides continuous 3D cutter radius compensation for simultaneous 5-axis peripheral milling, accounting for changing tool orientation throughout the path. CUT3DF (3D Face) handles 3D compensation for face milling operations. CUT3DFS (3D Face Side) and CUT3DFF (3D Face Front) provide additional face milling variants. ISD (Insertion depth) parameter defines how deep the tool engages, critical for CUT3DC calculations. These modes are essential for CAM post-processor configuration: most 5-axis simultaneous programs from hyperMILL, NX, or Mastercam should output CUT3DC for side cutting or CUT3DF for face cutting operations. 828D supports CUT2D/CUT2DF/CUT3DC/CUT3DF; full 3D compensation with ISD requires 840D sl or SINUMERIK ONE.

## Applies to

- Operation types: `milling`, `5_axis`

## Related tips

- [[ctrl-073|840D sl vs SINUMERIK ONE vs 828D Feature Comparison]] _(category+op:2+tag:5)_
- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+op:2+tag:5)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:1+tag:6)_
- [[ctrl-109|Fidia Velocity Five and RTCP for 5-axis trajectory control]] _(category+op:2+tag:4)_
- [[tk-dl-siemens-3d-comp-001|Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis]] _(op:2+tag:7)_

## Tags

#controller #siemens #tool-compensation #cut2d #cut3dc #cut3df #5-axis #post-processor #operation-milling #operation-5_axis #controller-siemens
