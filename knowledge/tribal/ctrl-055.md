---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-055
title: Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "work-offsets", "G54", "G54.1", "fixtures", "coordinates", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 3d73519200dca8174fe21b31ad0e7f9588472876e16cde3fc6c02316624e4675
mirror_ts: 2026-05-05T13:36:03.933Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Standard work offsets: G54-G59 (6 offsets, always available). Extended offsets: G54.1 P1 through G54.1 P48 (48 additional offsets, optional on some models). Total: up to 54 work coordinate systems. Setting offsets programmatically: G10 L2 P1 X__ Y__ Z__ (set G54, P2=G55...P6=G59). G10 L20 P1 X__ Y__ Z__ (set G54.1 P1 through P48). In G90 mode, G10 replaces values; in G91 mode, G10 adds to existing values. G54.1 is NOT the same as G54 — G54.1 is the header for extended offsets, G54.1 P1 is the first extended offset. Use extended offsets for tombstone fixtures, pallet systems, and multi-part setups. G53 (machine coordinate) overrides all work offsets for that block only — use for safe tool change positions.

## Related tips

- [[ctrl-003|Fanuc extended work offsets G54.1 P1-P300]] _(category+tag:3)_
- [[ctrl-051|Fanuc look-ahead buffer sizes by controller model]] _(category+tag:3)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:3)_
- [[ctrl-053|Fanuc probing with G31 skip signal]] _(category+tag:3)_
- [[ctrl-054|Fanuc G37 automatic tool length measurement]] _(category+tag:3)_

## Tags

#controller #fanuc #work-offsets #g54 #g54-1 #fixtures #coordinates #controller-fanuc
