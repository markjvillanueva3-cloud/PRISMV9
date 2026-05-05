---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-226
title: JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 97
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "g85", "g87", "canned-roughing", "pattern-turning", "profile", "stock-removal", "operation:profiling", "operation:roughing", "operation:finishing", "operation:turning", "operation:chamfering", "machine:Okuma"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing", "turning", "chamfering"]
content_hash: dae6113a7187cbc9a896412b0cae978c2998951e46786d102dee4c810f0e3115
mirror_ts: 2026-05-05T13:36:00.806Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `97` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

JM Die Okuma programs use G85 and G87 for pattern roughing/finishing. G85 canned rough turn: G85 NTURN D.1 U.01 W.005 F.009 where NTURN is a named profile, D = depth of cut, U = X stock, W = Z stock, F = feed. The profile is defined with G81: NTURN G81 followed by the profile geometry. G87 finish: G87 NTURN replays the NTURN profile at finish dimensions. Example pattern: G0 X1.439 Z.03, G1 Z0 F.003, G1 X1.579 A135 (45-degree chamfer), G1 Z-3.99 F.005, G1 X1.8 F.02, G80 (end profile). A-word specifies angle (A135 = 135-degree lead angle = 45-degree chamfer). Stock removal: typical U.01 W.005 leaves 0.010 radial, 0.005 axial for finish pass.

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`, `turning`, `chamfering`

## Related tips

- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:4+tag:5)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:7)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:4+tag:4)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:4)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:2+tag:6)_

## Tags

#jm-die #okuma #osp #g85 #g87 #canned-roughing #pattern-turning #profile #stock-removal #operation-profiling #operation-roughing #operation-finishing #operation-turning #operation-chamfering #machine-okuma
