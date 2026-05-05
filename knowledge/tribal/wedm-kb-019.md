---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-019
title: Taper accuracy: skim passes are critical
category: quality
domain: quality_inspection
knowledge_type: rule
confidence: 86
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "taper", "accuracy", "skim-pass", "offset", "compensation", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: fdaa56327740b3343308f3e1644a93a91a1f3eac87535a6bd83e351f5c118db8
mirror_ts: 2026-05-05T13:36:03.178Z
mirror_engine: TribalVaultPopulatorEngine
---

# Taper accuracy: skim passes are critical

**Category:** `quality` · **Domain:** `quality_inspection`

**Confidence:** `86` · **Source:** `handbook:klocke_2013_ch8`

## Tip

Taper dimensional accuracy is WORSE than straight cuts by a factor of 1.5-2×. The wire deflects differently at angles, and the offset compensation must account for the angled kerf geometry. Always run at least 2 skim passes on taper cuts (vs 1 that might suffice for straight cuts). On the skim passes, disable taper offset compensation (H=0.0000) as shown in the NOZE TEST program — the skim passes follow the same UV path as the rough cut.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]] _(category+op:1+tag:3)_
- [[wedm-kb-011|Recast layer thickness determines part integrity]] _(category+op:1+tag:2)_
- [[jm-die-016|JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety]] _(category+op:1+tag:2)_
- [[esp-201|Tool Wear Compensation with Automatic Offset Updating]] _(category+tag:2)_
- [[f360-198|Tool Wear Compensation Strategy Using Offset Adjustments]] _(category+tag:2)_

## Tags

#wire-edm #taper #accuracy #skim-pass #offset #compensation #operation-roughing
