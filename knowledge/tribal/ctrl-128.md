---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-128
title: Hurco WinMax M42 — auto two-touch probing
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m42", "m41", "probing", "two-touch", "g31", "inspection", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: b2b0a3fce020868050760febec9927897727f83991e5c8d8fb90cbfb7642736c
mirror_ts: 2026-05-05T13:36:01.526Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax M42 — auto two-touch probing

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:winmax_intro_workbook`

## Tip

M42 enables automatic two-touch probing with G31 skip function. When activated, after the initial probe touch, the control automatically backs off and re-approaches at reduced feedrate for higher accuracy. This eliminates the need to program two separate G31 moves for each probe point. M41 deactivates two-touch mode. Use M42 for precision part probing (±0.0001" accuracy typical), M41 for faster tool measurement where ultimate accuracy isn't required.

## Related tips

- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:3)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+tag:3)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+tag:3)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+tag:3)_
- [[ctrl-142|Hurco G68.2 Transform Plane for 3+2 positioning]] _(category+tag:3)_

## Tags

#hurco #winmax #m42 #m41 #probing #two-touch #g31 #inspection #machine-hurco
