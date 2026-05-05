---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-124
title: Hurco WinMax M126/M127 — shortest rotary angle path
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 92
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m126", "m127", "rotary", "5-axis", "shortest-path", "positioning", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: edc8a96165f64f67bb8562feecbf0058042e6e095801738dee06b53541cb2601
mirror_ts: 2026-05-05T13:36:01.090Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax M126/M127 — shortest rotary angle path

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:winmax_intro_workbook`

## Tip

M126 enables shortest rotary angle path for 4th/5th axis moves. Without M126, the control moves to the exact programmed angle (e.g., A0 to A350 moves 350 degrees). With M126 active, it calculates the shortest path (10 degrees in the example). Critical for 5-axis repositioning moves where taking the long way can cause tool interference. M127 cancels M126. Always program M126 before rapid rotary repositions in 5-axis work. Pair with G28 A0 B0 for return to home position.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:6)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:5)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:5)_
- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+op:1+tag:5)_
- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #m126 #m127 #rotary #5-axis #shortest-path #positioning #operation-5_axis #machine-hurco
