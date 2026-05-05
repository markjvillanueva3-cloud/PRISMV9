---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-241
title: JM Die Haas G154 extended work offsets — multi-operation fixture setups
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 94
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "g154", "extended-offsets", "tombstone", "fixture", "multi-operation", "pallet", "machine:Haas"]
material_groups: []
operation_types: []
content_hash: 9c837cfbcac88ab938b4f33578025ce5ab874d52593214620710b210800b4ad4
mirror_ts: 2026-05-05T13:36:00.919Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas G154 extended work offsets — multi-operation fixture setups

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas programs use G154 P# for extended work offsets beyond G54-G59. Example: G00 G90 G154 P8 X-3.319 Y-1.5296 uses offset P8 from the extended table. G154 P1 through P99 are available (depending on Haas software level). JM Die assigns P-offsets by operation or fixture position: P1-P6 mirror G54-G59, P7+ for tombstone faces or pallet positions. When setting up: probe each fixture position and store in G154 P#, then program calls the appropriate offset. Reduces setup time for repeat jobs by maintaining consistent offset assignments across fixture configurations.

## Related tips

- [[ctrl-196|Haas G154 P1-P99 extended work offsets — pallet and tombstone programming]] _(category+tag:6)_
- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category+tag:4)_
- [[ctrl-231|JM Die Haas tool change sequence — M06 with G43 height offset]] _(category+tag:4)_
- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+tag:4)_
- [[ctrl-232|JM Die Haas G42/G40 cutter compensation — 2D profiling with automatic radius adjustment]] _(category+tag:4)_

## Tags

#jm-die #haas #ngc #g154 #extended-offsets #tombstone #fixture #multi-operation #pallet #machine-haas
