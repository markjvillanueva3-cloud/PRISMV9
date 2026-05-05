---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-007
title: Subprogram threshold: 5+ cycle points saves 60-80% program size
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:autodesk-post-processor-guide@ch4-subprograms
created_at: 2026-03-06
usage_count: 0
tags: ["subprogram", "m98", "m99", "program-size", "drill-pattern", "optimization", "operation:drilling", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: ["drilling"]
content_hash: 03fe813b3daf1d5377d9a24c048c2f1d009fd43306e6825d0d98a1dcb8b36e51
mirror_ts: 2026-05-05T13:36:02.155Z
mirror_engine: TribalVaultPopulatorEngine
---

# Subprogram threshold: 5+ cycle points saves 60-80% program size

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:autodesk-post-processor-guide@ch4-subprograms`

## Tip

When drilling patterns have 5 or more hole locations, converting the cycle to a subprogram (M98/M99 on Fanuc, L call on Siemens, CYCL CALL on Heidenhain) reduces program size by 60-80%. The subprogram contains the cycle definition, and each call just positions XY. This is critical for fixture plates with hundreds of holes. Subprograms can be embedded in the main file or saved as external files. Use external files when programs exceed controller memory limits. Pattern operations and repeated operations are also strong subprogram candidates.

## Applies to

- Operation types: `drilling`

## Related tips

- [[ctrl-165|Siemens 840D PROC / ENDPROC — structured subroutine programming with typed parameters]] _(category+op:1+tag:3)_
- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:1+tag:2)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:1+tag:2)_
- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+op:1+tag:2)_
- [[ctrl-168|Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code]] _(category+op:1+tag:2)_

## Tags

#subprogram #m98 #m99 #program-size #drill-pattern #optimization #operation-drilling #controller-fanuc #controller-siemens #controller-heidenhain
