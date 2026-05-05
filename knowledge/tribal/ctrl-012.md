---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-012
title: Siemens TRAORI for 5-axis transformation
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:siemens_5axis_manual
created_at: 2026-03-07
usage_count: 0
tags: ["siemens", "sinumerik", "traori", "5-axis", "transformation", "operation:5_axis", "controller:fanuc", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: d7970cbbe4fc81c7efd9ab72daa9e66f7290275438c6bf765314d5d5e34fa3b6
mirror_ts: 2026-05-05T13:36:01.519Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens TRAORI for 5-axis transformation

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:siemens_5axis_manual`

## Tip

TRAORI activates 5-axis coordinate transformation on SINUMERIK 840D sl. Syntax: TRAORI(n) where n=transformation number (1-4 for multiple kinematic chains). Must be followed by tool orientation commands: A3=, B3=, C3= (direction cosines) or LEAD/TILT angles. Cancel with TRAFOOF. Unlike Fanuc G43.4, TRAORI handles both table-table and head-head kinematics through the same command — the kinematic model is in machine data.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:6)_
- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+op:1+tag:5)_
- [[ctrl-067|TRAORI 5-Axis Simultaneous Transformation]] _(category+op:1+tag:5)_
- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+op:1+tag:4)_
- [[ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]] _(category+op:1+tag:4)_

## Tags

#siemens #sinumerik #traori #5-axis #transformation #operation-5_axis #controller-fanuc #controller-siemens
