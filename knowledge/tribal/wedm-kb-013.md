---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-013
title: Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)
category: speeds_feeds
subcategory: cutting_parameters
domain: process_engineering
knowledge_type: failure_mode
confidence: 90
source: handbook:kunieda_2005_cirp
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "thick-section", "flushing", "efficiency", "deep-cut"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 38ceaefaedc8a304fbb08ef2bf4004417525dc926bf9528feecb0e0d7fa1f3af
mirror_ts: 2026-05-05T13:36:01.795Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)

**Category:** `speeds_feeds` · **Subcategory:** `cutting_parameters` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `handbook:kunieda_2005_cirp`

## Tip

For sections thicker than 50mm, flushing efficiency degrades approximately as 1/sqrt(thickness/50). At 100mm thickness, flushing is ~71% efficient; at 150mm, ~58%. This means debris removal is incomplete, causing secondary discharges that worsen Ra and increase wire break risk. Compensate by: (1) increasing flush pressure to 8-10 bar, (2) reducing cutting speed by 20-40%, (3) using submerged cutting mode. Kunieda (2005) confirmed this empirically.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-023|Reduce flush pressure during skim passes]] _(category+op:1+tag:2)_
- [[wedm-kb-014|Thick sections need voltage compensation]] _(category+op:1+tag:2)_
- [[wedm-jmd-006|Skim pass feed rate does NOT monotonically decrease — peak at pass 3]] _(category+op:1+tag:1)_
- [[wedm-jmd-008|Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity]] _(category+op:1+tag:1)_
- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:1)_

## Tags

#wire-edm #thick-section #flushing #efficiency #deep-cut
