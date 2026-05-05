---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-006
title: Canned cycle expansion: expand to linear moves when controller lacks the cycle
category: programming
subcategory: post_processor
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:autodesk-post-processor-guide@ch5-cycleExpansion
created_at: 2026-03-06
usage_count: 0
tags: ["canned-cycle", "expansion", "g76", "fine-boring", "peck-drill", "post-processor", "operation:drilling", "operation:tapping", "operation:boring"]
material_groups: []
operation_types: ["drilling", "tapping", "boring"]
content_hash: 377aeb0f7a692d345ce7e641b2bba45b3c6de9a9f5c8ab461656da98d7d276bd
mirror_ts: 2026-05-05T13:36:02.154Z
mirror_engine: TribalVaultPopulatorEngine
---

# Canned cycle expansion: expand to linear moves when controller lacks the cycle

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:autodesk-post-processor-guide@ch5-cycleExpansion`

## Tip

When a CNC control doesn't support a specific canned cycle (e.g. G76 fine boring, G77 back boring, tapping with chip breaking), the post processor must 'expand' it to equivalent linear moves. Expansion sequence for fine boring: feed to depth → dwell → orient spindle (M19) → shift away from wall → rapid retract. For peck drilling: rapid to R-plane → feed one peck depth → rapid retract to R-plane (or partial retract for chip-breaking G73). The expandCyclePoint() function handles this. Always verify expanded cycles produce correct motion before running on the machine.

## Applies to

- Operation types: `drilling`, `tapping`, `boring`

## Related tips

- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:3+tag:4)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:3+tag:3)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:3+tag:3)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:3+tag:3)_
- [[gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]] _(op:3+tag:5)_

## Tags

#canned-cycle #expansion #g76 #fine-boring #peck-drill #post-processor #operation-drilling #operation-tapping #operation-boring
