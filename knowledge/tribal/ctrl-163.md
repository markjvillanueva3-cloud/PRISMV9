---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-163
title: Siemens 840D COMPCAD — collision and component protection in simultaneous 5-axis
category: safety
subcategory: coolant_safety
domain: safety
knowledge_type: anti_pattern
confidence: 88
source: controller:siemens_840d_sinumerik_manual
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "compcad", "collision-avoidance", "5-axis", "safety", "traori", "kinematic-model", "stl", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 83b93da057eea84c8d2fb70c9e4c5fc1160850754d9866ce7000242049e06721
mirror_ts: 2026-05-05T13:36:02.231Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D COMPCAD — collision and component protection in simultaneous 5-axis

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `safety`

**Confidence:** `88` · **Source:** `controller:siemens_840d_sinumerik_manual`

## Tip

COMPCAD (COMPonent CAD protection) is the Siemens 840D collision avoidance system for simultaneous 5-axis machining. Activated via machine data and optional PLC logic, COMPCAD monitors the tool envelope, spindle nose, and fixture geometry in real-time during TRAORI-active movements. Setup requirements: (1) COMPCAD license must be enabled on the NCK, (2) 3D STL models of machine components must be loaded in machine data, (3) Tool geometry (length, diameter, shank) must be set in the tool table. If a collision is predicted, the control decelerates and stops axes before impact. Programming note: COMPCAD protection radius can be queried with system variable $AN_COMPRESS_BUFFER. Operators sometimes disable COMPCAD for speed — never do this on unfamiliar 5-axis programs. Re-enable via MD $MC_COLLISION_MASK after any service reset.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[tk-dl-sim5x-002|5-axis gouge avoidance: 4 check sets, tilt/retract/trim strategies, pole singularity handling]] _(category+op:1+tag:3)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(op:1+tag:6)_
- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(op:1+tag:6)_
- [[tk-dl-post-002|Use G01 at high feed instead of G00 for multi-axis rapids — prevents axis stall]] _(category+op:1+tag:2)_
- [[mc-012|Define toolholder precisely for 5-axis collision checking]] _(category+op:1+tag:2)_

## Tags

#siemens #840d #compcad #collision-avoidance #5-axis #safety #traori #kinematic-model #stl #operation-5_axis #controller-siemens
