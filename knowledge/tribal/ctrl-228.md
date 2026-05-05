---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-228
title: JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 97
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "g96", "g97", "css", "constant-surface-speed", "rpm-clamp", "g50", "tool-steel", "material:P", "material:Steel", "material:D2 Tool Steel", "material:S7 Tool Steel", "material:H", "material:Hardened (45 HRC)", "operation:face_milling", "operation:roughing", "operation:drilling", "operation:boring", "operation:turning", "machine:Okuma"]
material_groups: ["P", "H"]
operation_types: ["face_milling", "roughing", "drilling", "boring", "turning"]
content_hash: 4aab7c1c2deccb55a5e3044de22c89f242c05e95c5b8534a16dcc6e75570b8fa
mirror_ts: 2026-05-05T13:36:00.808Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `97` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

JM Die lathe programs use G96 (CSS) and G97 (constant RPM) strategically: G96 S200-250 M3 for OD roughing (CSS prevents overloading at small diameters), G97 S300-600 M3 for drilling and boring (constant RPM for predictable chip load), G50 S600-800 as max RPM clamp (prevents spindle runaway at small diameters with CSS). Pattern: start with G50 S600 (set max), G97 S600 M3 (constant RPM for facing), then switch to G96 S200 for turning passes. For boring bars (NAT07, NAT09): always use G97 to prevent chatter from speed variations. Tool steel work (M2, D2, S7): reduce to G96 S150-180 for hardened materials above 45 HRC.

## Applies to

- Material groups: `P`, `H`
- Operation types: `face_milling`, `roughing`, `drilling`, `boring`, `turning`

## Related tips

- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:4+tag:8)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+material:1+op:2+tag:9)_
- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:4+tag:5)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:7)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:4)_

## Tags

#jm-die #okuma #osp #g96 #g97 #css #constant-surface-speed #rpm-clamp #g50 #tool-steel #material-p #material-steel #material-d2-tool-steel #material-s7-tool-steel #material-h #material-hardened--45-hrc #operation-face_milling #operation-roughing #operation-drilling #operation-boring #operation-turning #machine-okuma
