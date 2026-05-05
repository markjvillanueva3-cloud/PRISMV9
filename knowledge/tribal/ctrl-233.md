---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-233
title: JM Die Okuma Multus B250II initialization — dual spindle mill-turn setup
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 97
source: shop:jm_die_cnc_okuma_multus_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "multus", "b250ii", "mill-turn", "dual-spindle", "initialization", "g126", "g136", "g140", "operation:turning", "operation:milling", "machine:Okuma"]
material_groups: []
operation_types: ["turning", "milling"]
content_hash: 9e0185feed228a9f27071b94ec6dbe1efe3d4bfcf9d1129466d8ca353187ea5f
mirror_ts: 2026-05-05T13:36:00.810Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma Multus B250II initialization — dual spindle mill-turn setup

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `97` · **Source:** `shop:jm_die_cnc_okuma_multus_programs`

## Tip

JM Die's Okuma Multus B250IIW programs have a distinct initialization block: CLEAR (clear variables), DRAW (graphics mode for simulation), V1=25.0 (part count target), G90 (absolute), G180 (polar coordinates off), M960 (custom shop macro), G126 (main spindle select). Tool turret definitions: TD=050050 M323 specifies turret position and spindle mode. The dual spindle control uses G136 (main spindle coordinate system), G140/G141 (sub spindle systems). Work offsets use G15 H01 combined with G20 HP=1 (workpiece plane 1) or HP=4 for sub spindle side. Part counter logic: IF [VWKCC[1] GE VWKCS[24]] N0118 branches when count reaches target.

## Applies to

- Operation types: `turning`, `milling`

## Related tips

- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:5)_
- [[ctrl-098|Okuma Machining Navi for automatic chatter suppression]] _(category+op:2+tag:4)_
- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+op:2+tag:3)_
- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:2+tag:3)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:2+tag:3)_

## Tags

#jm-die #okuma #multus #b250ii #mill-turn #dual-spindle #initialization #g126 #g136 #g140 #operation-turning #operation-milling #machine-okuma
