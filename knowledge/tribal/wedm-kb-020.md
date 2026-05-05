---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-020
title: UV taper only on G1 lines — G2/G3 arcs are straight
category: machining
domain: process_engineering
knowledge_type: correction
confidence: 92
source: program:noze_test
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "taper", "uv-axis", "g-code", "arc", "linear", "operation:5_axis"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 3554ff964d94bf81b5b7ff1dfe07f5eeba8b957d39d869f052d3b6eddf5c9cf5
mirror_ts: 2026-05-05T13:36:01.193Z
mirror_engine: TribalVaultPopulatorEngine
---

# UV taper only on G1 lines — G2/G3 arcs are straight

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `92` · **Source:** `program:noze_test`

## Tip

In standard WEDM taper programming, UV offset (taper) applies ONLY to G1 (linear) moves. G2/G3 arc moves are cut with UV=0 (straight). This is the correct behavior — a tapered arc would require 5-axis simultaneous interpolation that most WEDM machines cannot do. If the part requires tapered arcs, approximate them with short G1 segments (0.1-0.5mm chord) with linear UV interpolation. The NOZE TEST program demonstrates this: UV appears only on G1 blocks.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]] _(category+op:1+tag:3)_
- [[jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]] _(category+op:1+tag:3)_
- [[wedm-kb-018|Maximum taper angle depends on workpiece thickness]] _(category+op:1+tag:3)_
- [[wedm-jmd-007|Cannelure/thread WEDM: alternate G2/G3 arcs with G1 flanks for thread form]] _(category+op:1+tag:2)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+op:1+tag:1)_

## Tags

#wire-edm #taper #uv-axis #g-code #arc #linear #operation-5_axis
