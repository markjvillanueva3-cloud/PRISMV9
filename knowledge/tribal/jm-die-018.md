---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-018
title: JM Die NOZE TEST pattern — 4-axis UV taper benchmark program
category: machining
domain: general
knowledge_type: tip
confidence: 88
source: jm_die_production_analysis:NOZE_TEST
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "noze-test", "taper", "uv-axis", "4-axis", "5-pass", "e28xx", "benchmark", "operation:adaptive_milling"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 3363b6098205e586fdb54778c72025f6f34e627be6f3ea9bd139939bb835f2a5
mirror_ts: 2026-05-05T13:36:02.549Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die NOZE TEST pattern — 4-axis UV taper benchmark program

**Category:** `machining` · **Domain:** `general`

**Confidence:** `88` · **Source:** `jm_die_production_analysis:NOZE_TEST`

## Tip

The NOZE TEST.NC program is JM Die's benchmark for 4-axis taper cutting on the FA-20S. Pattern: 5-pass E2821-E2825 taper sequence, UV axis engaged, M90 adaptive through pass 4, M91 for final skim. This program demonstrates proper UV move synchronization where upper and lower contours follow different paths (e.g., smaller opening at top, larger at bottom for draft angle). Quality score: 88% (penalized only for missing some optional codes). Use NOZE TEST as the reference when programming new taper work — verify your UV coordinates produce the expected angle before running on customer parts.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]] _(category+op:1+tag:8)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:4)_
- [[jm-die-020|JM Die program optimization target — maximize productivity while maintaining Ra and tolerance]] _(category+op:1+tag:3)_
- [[wedm-kb-020|UV taper only on G1 lines — G2/G3 arcs are straight]] _(category+op:1+tag:3)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+op:1+tag:3)_

## Tags

#wire-edm #jm-die #noze-test #taper #uv-axis #4-axis #5-pass #e28xx #benchmark #operation-adaptive_milling
