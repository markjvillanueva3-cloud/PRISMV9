---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-230
title: JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: workaround
confidence: 97
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "g99", "canned-cycles", "g81", "g83", "peck-drill", "r-plane", "hole-operations", "operation:drilling", "operation:turning", "operation:milling", "machine:Haas", "tool:drill", "tool:spot_drill"]
material_groups: []
operation_types: ["drilling", "turning", "milling"]
content_hash: c1a5024cd124ceeb39b74684e7548cb646b01194635fbdc5917bee26a780f7bb
mirror_ts: 2026-05-05T13:36:00.809Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `97` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas mill programs use G99 (retract to R-plane) mode for efficient multi-hole drilling: G99 G81 Z-.05 R.1 F3.5 (spot drill), G99 G83 Z-.4375 R.1 Q.1 F1.8 (peck drill with Q peck depth). G99 keeps the tool at R-plane between holes instead of retracting to initial Z (G98), saving cycle time. Typical R-plane: 0.1 inch above workpiece. The Q parameter in G83 sets peck depth — JM Die typically uses Q.05 to Q.15 depending on hole depth and material. After all holes: G80 to cancel canned cycle, then G91 G28 Z0. M9 to retract and turn off coolant.

## Applies to

- Operation types: `drilling`, `turning`, `milling`

## Related tips

- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:2+tag:7)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:5)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:2+tag:6)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:3+tag:4)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:2+tag:5)_

## Tags

#jm-die #haas #ngc #g99 #canned-cycles #g81 #g83 #peck-drill #r-plane #hole-operations #operation-drilling #operation-turning #operation-milling #machine-haas #tool-drill #tool-spot_drill
