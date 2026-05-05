---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-066
title: CYCLE800 Swivel Plane for 3+2 Axis Positioning
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "5-axis", "CYCLE800", "swivel", "3+2", "indexed", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: d7ea1efd686fec542bc7d1efed364348873535a7483548dfa3d565d92adbd024
mirror_ts: 2026-05-05T13:36:03.945Z
mirror_engine: TribalVaultPopulatorEngine
---

# CYCLE800 Swivel Plane for 3+2 Axis Positioning

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

CYCLE800 is Siemens' proprietary cycle for 3+2 axis (indexed 5-axis) machining. It transforms the working plane by rotating the coordinate system to match the tilted work surface. Key parameters: retraction mode (0=none, 1=Z retract, 2=Z then XY, 3=max tool direction, 4=incremental tool direction), swivel data record name (machine-specific kinematic configuration), and rotation mode (new or additive). The axis sequence parameter controls posting order: 57(ABC), 39(CAB), 27(CBA), 45(ACB), 30(BCA), 54(BAC). Critical rule: store angles in coordinate rotation and leave numerical B/C work offset at 0. CYCLE800 handles FRAME calculations, tool tip tracking (TCPM/RTCP), and safe retraction automatically. Available on 840D sl, 828D, and SINUMERIK ONE. CAM post processors must output the correct swivel data record name matching the machine's kinematic table configured during commissioning.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-067|TRAORI 5-Axis Simultaneous Transformation]] _(category+op:1+tag:5)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:1+tag:5)_
- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(category+op:1+tag:5)_
- [[ctrl-078|SINUMERIK Post-Processor Configuration Essentials]] _(category+op:1+tag:5)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:4)_

## Tags

#controller #siemens #5-axis #cycle800 #swivel #3-2 #indexed #operation-5_axis #controller-siemens
