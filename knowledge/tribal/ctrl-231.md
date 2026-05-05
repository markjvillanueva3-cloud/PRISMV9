---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-231
title: JM Die Haas tool change sequence — M06 with G43 height offset
category: programming
domain: controller_specific
knowledge_type: anti_pattern
confidence: 98
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "tool-change", "m06", "g43", "height-offset", "m01", "sequence", "operation:turning", "machine:Haas"]
material_groups: []
operation_types: ["turning"]
content_hash: 98c1019cbe5a995bfb2474a20421665a279a62876f0459fc476ae68313a0fecf
mirror_ts: 2026-05-05T13:36:00.798Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas tool change sequence — M06 with G43 height offset

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `98` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas tool changes follow this pattern: (1) M05 to stop spindle, (2) G91 G28 Z0. M9 to retract Z and coolant off, (3) M01 optional stop for inspection, (4) T# M06 to change tool (e.g., T3 M06), (5) G00 G90 G54 X_Y_ S_ M03 to position XY and start spindle, (6) G43 H## Z_ to apply tool length offset and approach Z, (7) M08 to turn coolant on. The H-number should match tool number (H03 for T3) unless tool library is configured differently. CRITICAL: never omit G43 — running without tool length comp crashes the tool into the workpiece. The M01 between tools allows operator to verify setup.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+op:1+tag:5)_
- [[tk-dl-haas-002|G103 limits block look-ahead for macro timing (Haas)]] _(category+op:1+tag:3)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:1+tag:2)_
- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category+tag:4)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:1+tag:2)_

## Tags

#jm-die #haas #ngc #tool-change #m06 #g43 #height-offset #m01 #sequence #operation-turning #machine-haas
