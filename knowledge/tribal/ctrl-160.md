---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-160
title: Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:siemens_840d_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "trafoof", "traori", "cancel", "5-axis", "alarm-21610", "tcp", "retract", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 840df340aa9fbf03a321497afb5363c784b101c29e7002d0046ecc0f13cb9a22
mirror_ts: 2026-05-05T13:36:00.915Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:siemens_840d_cps_rev44207`

## Tip

TRAFOOF is the mandatory cancel command for TRAORI. Fail to call it and subsequent machine movements still apply the TCP transformation, causing position errors or alarms when trying to move in machine coordinates (G53/SUPA). Required cancellation points: (1) before any CYCLE800 tilted-workplane call, (2) before tool change M6, (3) before retract in machine coordinates, (4) at program end. The Fusion 840D post calls TRAFOOF inside onMoveToSafeRetractPosition() after writing the Z retract. A common 840D alarm after adding 5-axis features is '21610 Transformation not possible' — this almost always means TRAORI is still active when the program executes a machine-coordinate move. Debugging tip: check that TRAFOOF appears after the last simultaneous 5-axis section and before the next G53/SUPA line.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:8)_
- [[ctrl-012|Siemens TRAORI for 5-axis transformation]] _(category+op:1+tag:5)_
- [[ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]] _(category+op:1+tag:4)_
- [[ctrl-067|TRAORI 5-Axis Simultaneous Transformation]] _(category+op:1+tag:4)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:1+tag:4)_

## Tags

#siemens #840d #trafoof #traori #cancel #5-axis #alarm-21610 #tcp #retract #operation-5_axis #controller-siemens
