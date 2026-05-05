---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-136
title: Hurco WinMax chip conveyor control M59/M60/M61
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: anti_pattern
confidence: 85
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "m59", "m60", "m61", "chip-conveyor", "chips", "automation", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: a02d31698ff9c32f270cea299766a785b13296a7c0efaa318e257857b6dcaee7
mirror_ts: 2026-05-05T13:36:03.301Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax chip conveyor control M59/M60/M61

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `85` · **Source:** `controller:winmax_intro_workbook`

## Tip

M59 runs chip conveyor forward (toward chip bin), M60 runs in reverse (for clearing jams), M61 stops the conveyor. On automatic cycles, program M59 before cutting starts and M61 at program end or during tool changes where chip clearing isn't needed. Some shops run conveyor continuously (never M61), others cycle it to reduce wear. Reverse (M60) for 2-3 seconds occasionally helps clear buildup. Watch conveyor during first article — adjust timing to prevent chip overflow.

## Related tips

- [[ctrl-131|Hurco WinMax auxiliary output M-codes for custom automation]] _(category+tag:4)_
- [[ctrl-132|Hurco WinMax pallet changer M56/M57/M58]] _(category+tag:4)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:3)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+tag:3)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+tag:3)_

## Tags

#hurco #winmax #m59 #m60 #m61 #chip-conveyor #chips #automation #machine-hurco
