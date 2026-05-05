---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-240
title: JM Die tool numbering convention — operation-based assignment
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 95
source: shop:jm_die_shop_practices
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "tool-numbering", "convention", "setup-sheet", "nat-subroutine", "operation-based", "shop-standard", "operation:roughing", "operation:finishing", "operation:drilling", "operation:boring", "operation:turning", "operation:chamfering", "tool:indexable_insert", "tool:drill", "tool:boring_bar", "tool:spot_drill"]
material_groups: []
operation_types: ["roughing", "finishing", "drilling", "boring", "turning", "chamfering"]
content_hash: f1801cdd48b6822c9f76f812ed9eac200e416be60d4d27b6deadded5d37a7d7c
mirror_ts: 2026-05-05T13:36:00.883Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die tool numbering convention — operation-based assignment

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `shop:jm_die_shop_practices`

## Tip

JM Die uses consistent tool numbering across machines: NAT01/T01 = OD finish turning (usually .015R insert), NAT03/T03 = center drill, NAT05/T05 = primary drill, NAT06/T06 = secondary drill, NAT07/T07 = boring bar (rough), NAT09/T09 = boring bar (finish), NAT11/T11 = cutoff tool, NAT12/T12 = OD rough turning (.032R insert). On mills: T1-T3 = larger inserted endmills, T4-T8 = solid endmills sized down, T9-T10 = spotdrills/drills, T11-T12 = chamfer mills. This convention allows operators to anticipate tool requirements across jobs. ALWAYS preserve numbering in program edits — changing tool numbers requires updating setup sheets shop-wide.

## Applies to

- Operation types: `roughing`, `finishing`, `drilling`, `boring`, `turning`, `chamfering`

## Related tips

- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:4+tag:8)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:4+tag:5)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:4+tag:5)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:4+tag:4)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:4)_

## Tags

#jm-die #tool-numbering #convention #setup-sheet #nat-subroutine #operation-based #shop-standard #operation-roughing #operation-finishing #operation-drilling #operation-boring #operation-turning #operation-chamfering #tool-indexable_insert #tool-drill #tool-boring_bar #tool-spot_drill
