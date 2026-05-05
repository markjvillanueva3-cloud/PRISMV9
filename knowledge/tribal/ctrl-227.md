---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-227
title: JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 96
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "g74", "peck-drilling", "deep-hole", "lathe", "chip-breaking", "center-drill", "material:P", "material:Steel", "material:D2 Tool Steel", "operation:drilling", "operation:turning", "machine:Okuma", "tool:drill", "tool:spot_drill"]
material_groups: ["P"]
operation_types: ["drilling", "turning"]
content_hash: 48bde33c4133ed7c9bc099320fa10b7d6985f228fa6826685d8de046356de6f3
mirror_ts: 2026-05-05T13:36:00.822Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

JM Die uses Okuma G74 for peck drilling on lathes: G74 X0 Z-1.72 D.5 L.5 F.002. Parameters: X = center position (always 0 for axial holes), Z = final depth (negative into part), D = peck depth increment, L = retract amount per peck, F = feed rate. The D parameter is critical for chip breaking in deep holes. Typical values: D.5 (0.5 inch peck) for softer materials, D.15 (0.15 inch peck) for hardened steels like M2/D2 tool steel. G74 with large D values is faster than G83-style full retract pecking. Always precede with center drill (NAT03) using G97 S300 constant RPM to protect the center drill.

## Applies to

- Material groups: `P`
- Operation types: `drilling`, `turning`

## Related tips

- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+op:2+tag:9)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:2+tag:9)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:2+tag:9)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:8)_
- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+material:1+op:2+tag:4)_

## Tags

#jm-die #okuma #osp #g74 #peck-drilling #deep-hole #lathe #chip-breaking #center-drill #material-p #material-steel #material-d2-tool-steel #operation-drilling #operation-turning #machine-okuma #tool-drill #tool-spot_drill
