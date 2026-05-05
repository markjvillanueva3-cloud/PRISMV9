---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-125
title: Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m128", "m129", "tcpm", "tcp", "5-axis", "tool-center-point", "operation:profiling", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["profiling", "5_axis"]
content_hash: 8bef4214f5a340203647d69b8878642ca0ef43acdeb86ffb55a65c4e8fc24545
mirror_ts: 2026-05-05T13:36:00.860Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:winmax_intro_workbook`

## Tip

M128 activates Tool Center Point Management (TCPM) — essential for true 5-axis simultaneous machining. With TCPM active, the control compensates XYZ position as rotary axes move to keep the tool tip at the programmed location. Without TCPM (M129), rotary moves cause the tool tip to arc through space. Always activate M128 before 5-axis contouring and M129 before 3+2 positioning. TCPM requires accurate machine kinematics and tool length measurement.

## Applies to

- Operation types: `profiling`, `5_axis`

## Related tips

- [[ctrl-144|Hurco M128 TCPM + G43.4 toolpath linearization]] _(category+op:1+tag:6)_
- [[ctrl-217|Hurco WinMax G43.4 — toolpath linearization eliminates gouging on 5-axis moves]] _(category+op:1+tag:6)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:5)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:5)_
- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #m128 #m129 #tcpm #tcp #5-axis #tool-center-point #operation-profiling #operation-5_axis #machine-hurco
