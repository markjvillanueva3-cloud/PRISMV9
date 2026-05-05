---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-242
title: JM Die Okuma 6-digit tool format — turret position and geometry offsets
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 96
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "tool-format", "6-digit", "geometry-offset", "wear-offset", "turret", "lathe", "operation:roughing", "operation:drilling", "operation:boring", "operation:turning", "machine:Okuma", "tool:indexable_insert", "tool:drill", "tool:spot_drill"]
material_groups: []
operation_types: ["roughing", "drilling", "boring", "turning"]
content_hash: ca978832ae68259cbea8e75c06b6a97c13304c2c61c70fe6cfadbb5eefeb5911
mirror_ts: 2026-05-05T13:36:00.828Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma 6-digit tool format — turret position and geometry offsets

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

Okuma lathe tools use 6-digit format TTHHDD: T = turret position (01-12), HH = tool length offset (geometry), DD = tool nose radius offset (wear). Examples from JM Die: T010101 (turret 1, offset 01, wear 01), T030303 (turret 3, center drill), T121212 (turret 12, rough turn). The geometry offset (HH) sets tool nose position relative to program zero. The wear offset (DD) allows fine adjustment without modifying geometry. For boring bars: HH sets tool tip in X and Z, DD compensates for insert wear. CRITICAL: always match HH and DD numbers unless deliberately separating geometry from wear tracking.

## Applies to

- Operation types: `roughing`, `drilling`, `boring`, `turning`

## Related tips

- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:4+tag:8)_
- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:4+tag:8)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:2+tag:9)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+op:2+tag:9)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:8)_

## Tags

#jm-die #okuma #osp #tool-format #6-digit #geometry-offset #wear-offset #turret #lathe #operation-roughing #operation-drilling #operation-boring #operation-turning #machine-okuma #tool-indexable_insert #tool-drill #tool-spot_drill
