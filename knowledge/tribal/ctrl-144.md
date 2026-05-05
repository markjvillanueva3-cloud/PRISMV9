---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-144
title: Hurco M128 TCPM + G43.4 toolpath linearization
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:hurco_5axis_cope_2014
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m128", "g43.4", "tcpm", "linearization", "5-axis-simultaneous", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 3039c0c1838e84dcec30bb41e8daef011e1bbee06df81c3d87528109ad782118
mirror_ts: 2026-05-05T13:36:00.863Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco M128 TCPM + G43.4 toolpath linearization

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:hurco_5axis_cope_2014`

## Tip

M128 enables TCPM — all XYZ data references the un-rotated workpiece coordinate system. Tool vector determines actual tool orientation. Example: with part rotated A-90, commanding Z-1.0 moves along backside (machine Y) while tool stays perpendicular to rotated face. G43.4 adds toolpath linearization — prevents gouging by controlling the tool-tip continuously during rotation, not just start/end points. Without linearization, rotation is 'blind' and tool-tip arcs through space. Always use both for simultaneous 5-axis.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:6)_
- [[ctrl-217|Hurco WinMax G43.4 — toolpath linearization eliminates gouging on 5-axis moves]] _(category+op:1+tag:6)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:4)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:4)_
- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+op:1+tag:4)_

## Tags

#hurco #winmax #m128 #g43-4 #tcpm #linearization #5-axis-simultaneous #operation-5_axis #machine-hurco
