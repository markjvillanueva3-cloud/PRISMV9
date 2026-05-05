---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-235
title: JM Die Okuma Multus part counter — automated batch production control
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: workaround
confidence: 95
source: shop:jm_die_cnc_okuma_multus_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "multus", "part-counter", "common-variables", "vwkcc", "batch-production", "automation", "loop", "machine:Okuma"]
material_groups: []
operation_types: []
content_hash: 356d256ac45328a148cbb3acde580880fbe612ecd17e2be4249be517396d09e8
mirror_ts: 2026-05-05T13:36:00.881Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma Multus part counter — automated batch production control

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `shop:jm_die_cnc_okuma_multus_programs`

## Tip

JM Die Multus programs use Okuma's common variable system for part counting: V1=25.0 sets target quantity at program start, VWKCC[1]=[VWKCC[1]+1] increments counter after each part, IF [VWKCC[1] GE VWKCS[24]] N0118 branches to end when count reached. Alternative syntax: V2=[V2+1], IF [V2 GE V1] N0118, GOTO NSTRT loops back to start. The NSTRT label at program beginning enables the loop. N0118 section contains: V2=0 (reset counter), M02 (program end). For overnight runs: set V1 to batch quantity, ensure bar stock is sufficient, verify chip conveyor and coolant levels. VWKCC array persists across power cycles — manually reset if needed via MDI.

## Related tips

- [[ctrl-233|JM Die Okuma Multus B250II initialization — dual spindle mill-turn setup]] _(category+tag:4)_
- [[ctrl-234|JM Die Okuma Multus subspindle operations — grab, pull, cutoff sequence]] _(category+tag:4)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+tag:3)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+tag:3)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+tag:3)_

## Tags

#jm-die #okuma #multus #part-counter #common-variables #vwkcc #batch-production #automation #loop #machine-okuma
