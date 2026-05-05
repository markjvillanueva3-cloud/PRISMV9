---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-159
title: Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:siemens_840d_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "sinumerik", "traori", "trafoof", "5-axis", "tcp", "rtcp", "a3", "b3", "c3", "fgroup", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["5_axis"]
content_hash: f117ff3b4d225f42fb44496c7e25f29a5fb25010cc884aba954cbf01ae7d74e1
mirror_ts: 2026-05-05T13:36:00.872Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:siemens_840d_cps_rev44207`

## Tip

On Siemens 840D/840D sl, TRAORI activates the real-time tool-center-point (RTCP) transformation for simultaneous 5-axis machining. Once active, G1 moves automatically compensate rotary axis motion to hold the programmed tool-tip position. Tool orientation is written as A3= B3= C3= (IJK unit vector) on every G1 block — the post outputs these on every line of a 5-axis section. Critical: always call FGROUP(X,Y,Z,A,B) before TRAORI to define which axes are in the interpolation feed group; omitting FGROUP can cause unintended axis grouping. Cancel TCP with TRAFOOF before repositioning in machine coordinates, before tool change, and before running CYCLE800. The post logic: setTCP(true) outputs TRAORI; setTCP(false) outputs TRAFOOF. On SINUMERIK ONE, TRAORI also supports tool-tip following in the ACC (Advanced Surface Control) mode for sub-micron path accuracy on complex 5-axis surfaces.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+op:1+tag:8)_
- [[ctrl-012|Siemens TRAORI for 5-axis transformation]] _(category+op:1+tag:6)_
- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:4)_
- [[ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]] _(category+op:1+tag:4)_
- [[ctrl-067|TRAORI 5-Axis Simultaneous Transformation]] _(category+op:1+tag:4)_

## Tags

#siemens #840d #sinumerik #traori #trafoof #5-axis #tcp #rtcp #a3 #b3 #c3 #fgroup #operation-5_axis #controller-siemens
