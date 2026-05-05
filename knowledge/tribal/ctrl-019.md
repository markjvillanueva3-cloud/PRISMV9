---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-019
title: Heidenhain TCPM (tool center point management) for 5-axis
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 90
source: controller:heidenhain_5axis_programming
created_at: 2026-03-07
usage_count: 0
tags: ["heidenhain", "tcpm", "5-axis", "tool-center-point", "tnc640", "operation:5_axis", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: ["5_axis"]
content_hash: d618c2ddd148f2537a3180cd32f4825e4deadbf92e9cc688624156908a997244
mirror_ts: 2026-05-05T13:36:01.520Z
mirror_engine: TribalVaultPopulatorEngine
---

# Heidenhain TCPM (tool center point management) for 5-axis

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:heidenhain_5axis_programming`

## Tip

Heidenhain's TCPM function (equivalent to Fanuc TCP/Siemens TRAORI) maintains the tool tip position during 5-axis tilting. Activate with: FUNCTION TCPM F TCP AXIS SPATIAL PATHCTRL AXIS. Key parameters: F TCP (tool center point mode), AXIS SPATIAL (spatial angle interpolation), PATHCTRL AXIS (path control). Unlike Fanuc, TCPM stays active until explicitly cancelled with FUNCTION RESET TCPM.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+op:1+tag:5)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:4)_
- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:4)_
- [[ctrl-008|Fanuc tool center point control for 5-axis]] _(category+op:1+tag:4)_
- [[ctrl-012|Siemens TRAORI for 5-axis transformation]] _(category+op:1+tag:4)_

## Tags

#heidenhain #tcpm #5-axis #tool-center-point #tnc640 #operation-5_axis #controller-fanuc #controller-siemens #controller-heidenhain
