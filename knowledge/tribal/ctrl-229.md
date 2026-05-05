---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-229
title: JM Die Haas mill program header — standard safety line and tool documentation
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 98
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "program-header", "safety-line", "tool-list", "vf-2", "vf-3", "setup-documentation", "operation:milling", "machine:Haas", "tool:endmill", "tool:indexable_insert"]
material_groups: []
operation_types: ["milling"]
content_hash: 406a93fb6479fa1f07e5005124a2b6abdd67e3daa8c5f2ba52f52fafc2c46885
mirror_ts: 2026-05-05T13:36:00.797Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas mill program header — standard safety line and tool documentation

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `98` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas VF-2/VF-3 programs follow this header structure: (1) % start, (2) O-number with part name: O32471 (1563247_YCP_000 OP1), (3) Last run date: (LAST RUN ON 1-31-19), (4) Date/time stamp: (DATE - 28-01-19 TIME - 22:20), (5) Tool list with descriptions: (T3 | 1-1/4 INSERT ENDMILL), (T1 | 7/8 INSERTED ENDMILL), etc., (6) Safety line: G20 G00 G17 G40 G49 G80 G90. The tool list comments are CRITICAL for setup — they define tool assignments that must match the physical setup sheet. Always verify tool comments match actual tooling before running. The date comments track program history for tribal knowledge.

## Applies to

- Operation types: `milling`
- Machine IDs: `haas-vf-2`

## Related tips

- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+op:1+tag:5)_
- [[ctrl-244|JM Die Haas arc programming — G2/G3 with I/J center offsets]] _(category+op:1+tag:5)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:1+tag:5)_
- [[ctrl-197|Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware]] _(category+op:1+tag:4)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:1+tag:4)_

## Tags

#jm-die #haas #ngc #program-header #safety-line #tool-list #vf-2 #vf-3 #setup-documentation #operation-milling #machine-haas #tool-endmill #tool-indexable_insert
