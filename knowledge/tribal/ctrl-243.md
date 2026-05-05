---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-243
title: JM Die chamfer programming — A-word angles on Okuma lathe
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: workaround
confidence: 95
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "chamfer", "a-word", "angle-programming", "lead-angle", "lathe", "geometry", "operation:turning", "operation:chamfering", "machine:Okuma"]
material_groups: []
operation_types: ["turning", "chamfering"]
content_hash: 36261d995be284bd91a007df43c1daf644cf7ca501b3cdcf67175a1d089e3e23
mirror_ts: 2026-05-05T13:36:00.884Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die chamfer programming — A-word angles on Okuma lathe

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

JM Die Okuma programs use the A-word for chamfer angles: G1 X1.579 A135 creates a 45-degree chamfer (135-degree lead angle). The A-angle is measured from positive X-axis: A135 = 45 deg chamfer toward Z-, A90 = vertical face, A180 = straight Z- move, A45 = 45 deg chamfer toward X+. Alternative syntax: G1 X1.503 Z-.077 with both endpoints specified (no A-word). JM Die prefers A-word for standard chamfers because it's self-documenting and automatically calculates the endpoint. For compound angles or transitions: define both X and Z explicitly. A-word only works with G01 linear interpolation, not G02/G03 arcs.

## Applies to

- Operation types: `turning`, `chamfering`

## Related tips

- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:2+tag:6)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:1+tag:6)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+op:1+tag:6)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:1+tag:6)_
- [[ctrl-245|JM Die Okuma L-word radius — arc programming shorthand]] _(category+op:1+tag:6)_

## Tags

#jm-die #okuma #osp #chamfer #a-word #angle-programming #lead-angle #lathe #geometry #operation-turning #operation-chamfering #machine-okuma
