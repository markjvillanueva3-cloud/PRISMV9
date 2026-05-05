---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-225
title: JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: anti_pattern
confidence: 98
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "lathe", "nat-subroutine", "bar-feeder", "program-structure", "lb15ii", "captain-l370", "operation:drilling", "operation:turning", "machine:Okuma", "tool:drill", "tool:spot_drill"]
material_groups: []
operation_types: ["drilling", "turning"]
content_hash: 6c292d7b0a957c21d42fa99567d60875a6d0a0757b821ef96bced8a9394c1f50
mirror_ts: 2026-05-05T13:36:00.796Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `98` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

JM Die's Okuma lathe programs (LB15II, LB15II-M, Captain L370) follow a consistent structure: (1) Header: $<name>.MIN% with M1 optional stop, (2) Bar feeder loop: NBAR, CLEAR, DEF WORK, PS LC statements, DRAW, /CALL OBAR for bar feed macro, (3) Named tool subroutines: NAT01, NAT03, NAT05, NAT07, etc. with descriptive comments like (OD RGH. TURN .032R) or (CENTER DRILL), (4) Tool call: T010101, T030303 (6-digit Okuma format TTHHDD), (5) Safe position between tools: G0 X20 Z20, (6) Program end: last NAT subroutine returns to tool T121212 or similar, followed by M2. The /CALL OBAR line calls the shop's bar feeder macro for automated part loading. CRITICAL: never modify the NBAR/OBAR structure without understanding the bar feeder integration.

## Applies to

- Operation types: `drilling`, `turning`

## Related tips

- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+op:2+tag:9)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:2+tag:9)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:8)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:2+tag:6)_
- [[ctrl-240|JM Die tool numbering convention — operation-based assignment]] _(category+op:2+tag:6)_

## Tags

#jm-die #okuma #osp #lathe #nat-subroutine #bar-feeder #program-structure #lb15ii #captain-l370 #operation-drilling #operation-turning #machine-okuma #tool-drill #tool-spot_drill
