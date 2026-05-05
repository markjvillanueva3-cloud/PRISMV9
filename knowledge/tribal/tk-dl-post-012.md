---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-012
title: Rotary axis rewind: G92 to reset position register when axis exceeds limits
category: programming
subcategory: post_processor
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:autodesk-post-processor-guide@ch8-rewind
created_at: 2026-03-06
usage_count: 0
tags: ["rotary-axis", "rewind", "g92", "axis-limits", "multi-axis", "c-axis", "post-processor", "tool:indexable_insert"]
material_groups: []
operation_types: []
content_hash: 7af629dcae2ee8c15a3231af29ddbc712ad3a57100a030574cbcff23723a9c4c
mirror_ts: 2026-05-05T13:36:02.157Z
mirror_engine: TribalVaultPopulatorEngine
---

# Rotary axis rewind: G92 to reset position register when axis exceeds limits

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:autodesk-post-processor-guide@ch8-rewind`

## Tip

During continuous multi-axis machining, rotary axes can accumulate position beyond their mechanical limits (e.g., C-axis reaches 13200°). The post processor must detect when the axis approaches its limit and insert a rewind sequence: (1) retract tool to safe position, (2) use G92 to reset the axis register to equivalent position within 0-360° (e.g., G92 C240 sets the current 13200° to 240°), (3) rapid the axis to the next required position. Some controls use G28 for axis home return instead. The rewind must occur during a non-cutting move between cycle points.

## Related tips

- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category+tag:1)_
- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+tag:1)_
- [[ctrl-174|Mazak Integrex threading — G292/G276 vs QTU G92/G76]] _(category+tag:1)_
- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:1)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+tag:1)_

## Tags

#rotary-axis #rewind #g92 #axis-limits #multi-axis #c-axis #post-processor #tool-indexable_insert
